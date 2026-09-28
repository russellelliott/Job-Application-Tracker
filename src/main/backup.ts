import { dialog, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import { BackupFile } from '../types';

const BACKUP_EXTENSION = '.jobbackup';
const BACKUP_FILE_FILTER = [
  { name: 'Job Application Tracker Backup', extensions: ['jobbackup'] },
  { name: 'JSON Files', extensions: ['json'] },
];

// Backup state for the restore flow
let pendingBackup: BackupFile | null = null;

// Register IPC handlers for backup operations
export function registerBackupHandlers(mainWindow: BrowserWindow): void {
  // Renderer requests to create a backup — main opens save dialog
  ipcMain.handle('backup:create', async () => {
    return await handleCreateBackup(mainWindow);
  });

  // Renderer requests to restore — main opens file picker, reads, validates, returns preview
  ipcMain.handle('backup:restore:request', async () => {
    return await handleRestoreRequest(mainWindow);
  });

  // Renderer confirms restore — main performs the actual restore
  ipcMain.handle('backup:restore:confirm', async () => {
    if (!pendingBackup) {
      return { success: false, error: 'No pending backup to restore' };
    }
    const result = await performRestore(mainWindow, pendingBackup);
    pendingBackup = null;
    return result;
  });

  // Renderer cancels restore preview
  ipcMain.handle('backup:restore:cancel', async () => {
    pendingBackup = null;
    return { success: true };
  });
}

// Handle backup creation request from renderer
async function handleCreateBackup(
  mainWindow: BrowserWindow,
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // Get backup data from renderer via executeJavaScript
    const backupData = await mainWindow.webContents.executeJavaScript(
      '(async () => { const m = await import("../renderer/backup"); return await m.exportBackup(); })()',
      true,
    );

    if (!backupData || !backupData.format) {
      return { success: false, error: 'Failed to read backup data from database' };
    }

    const backup: BackupFile = backupData;

    // Open native save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Create Backup',
      defaultPath: `job-application-backup-${new Date().toISOString().slice(0, 10)}${BACKUP_EXTENSION}`,
      filters: BACKUP_FILE_FILTER,
      buttonLabel: 'Save Backup',
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Backup cancelled' };
    }

    // Write JSON file in main process (no renderer fs access needed)
    await fs.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf-8');

    return { success: true, filePath: result.filePath };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Backup failed: ${message}` };
  }
}

// Handle restore: main opens file dialog, reads, validates, returns preview
async function handleRestoreRequest(
  mainWindow: BrowserWindow,
): Promise<{ valid: boolean; backup?: BackupFile; error?: string }> {
  try {
    // Open native open-file dialog in main process
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore Backup',
      filters: BACKUP_FILE_FILTER,
      buttonLabel: 'Open Backup',
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths.length) {
      return { valid: false, error: 'Cancelled' };
    }

    const filePath = result.filePaths[0];

    // Read and parse the backup file in main process
    const raw = await fs.readFile(filePath, 'utf-8');
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return { valid: false, error: 'The selected file is not a valid JSON backup file.' };
    }

    // Validate backup format in main process
    if (!validateBackup(parsed)) {
      return { valid: false, error: 'This file is not a valid Job Application Tracker backup.' };
    }

    const validatedBackup = parsed as BackupFile;

    // Store pending backup for confirmation step
    pendingBackup = validatedBackup;

    return { valid: true, backup: validatedBackup };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `Failed to read backup file: ${message}` };
  }
}

// Perform the actual restore after confirmation
async function performRestore(
  mainWindow: BrowserWindow,
  backup: BackupFile,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Create pre-restore backup of current data in main process
    try {
      const currentDocs = await mainWindow.webContents.executeJavaScript(
        '(async () => { const m = await import("../renderer/backup"); return await m.exportBackup(); })()',
        true,
      );

      if (currentDocs && currentDocs.format === 'job-application-tracker-backup') {
        const preRestorePath = `${process.env.HOME || process.cwd()}/pre-restore-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.jobbackup`;

        const preRestoreBackup: BackupFile = {
          format: 'job-application-tracker-backup',
          version: 1,
          createdAt: new Date().toISOString(),
          docs: currentDocs.docs,
        };

        await fs.writeFile(preRestorePath, JSON.stringify(preRestoreBackup, null, 2), 'utf-8');
        console.log('[main] Pre-restore backup created:', preRestorePath);
      }
    } catch (preRestoreError: unknown) {
      const msg = preRestoreError instanceof Error ? preRestoreError.message : 'Unknown error';
      console.warn('[main] Pre-restore backup failed (continuing anyway):', msg);
      // Continue — the backup file we're restoring from is still the safety net
    }

    // Step 2: Perform the actual document replacement in renderer
    const restoreSuccess = await mainWindow.webContents.executeJavaScript(
      `(async () => {
        try {
          const db = (await import("../renderer/db")).default;
          const docs = ${JSON.stringify(backup.docs)};

          // Get all existing documents and delete them
          const existing = await db.allDocs({ include_docs: true });
          const toDelete = existing.rows
            .filter(row => row.doc)
            .map(row => ({
              _id: row.doc._id,
              _rev: row.value.rev,
              _deleted: true
            }));

          if (toDelete.length > 0) {
            await db.bulkDocs(toDelete);
          }

          // Insert backup documents (add _id back for PouchDB)
          const toInsert = docs.map(doc => ({ ...doc, _id: doc.id }));
          const result = await db.bulkDocs(toInsert);

          // Check for failures
          const failures = result.filter(item => item && item.error);
          if (failures.length > 0) {
            throw new Error('Restore failed for ' + failures.length + ' document(s)');
          }

          return true;
        } catch (err) {
          console.error('Restore failed:', err);
          throw err;
        }
      })()`,
      true,
    );

    if (restoreSuccess) {
      // Reload the UI to reflect new data
      mainWindow.webContents.reload();
      return { success: true };
    } else {
      return { success: false, error: 'Restore completed but returned unexpected result' };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Restore failed: ${message}` };
  }
}

// Validate backup file structure
function validateBackup(data: unknown): data is BackupFile {
  if (!data || typeof data !== 'object') return false;

  const backup = data as Record<string, unknown>;

  // Check format string
  if (backup.format !== 'job-application-tracker-backup') return false;

  // Check version
  if (backup.version !== 1) return false;

  // Check createdAt is a valid ISO date string
  if (typeof backup.createdAt !== 'string') return false;
  const date = new Date(backup.createdAt);
  if (isNaN(date.getTime())) return false;

  // Check docs is a non-null array
  if (!Array.isArray(backup.docs)) return false;

  // Validate each document has required fields
  for (const doc of backup.docs) {
    if (!doc || typeof doc !== 'object') return false;
    // Documents must have an id (we keep IDs for consistency)
    if (typeof (doc as Record<string, unknown>).id !== 'string') return false;
  }

  return true;
}
