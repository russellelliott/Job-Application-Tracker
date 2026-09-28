import { dialog, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import { validateBackup } from '../backupValidation';
import type { BackupFile, JobApplication } from '../types';

const BACKUP_EXTENSION = '.jobbackup';
const BACKUP_FILE_FILTER = [
    { name: 'Job Application Tracker Backup', extensions: ['jobbackup'] },
    { name: 'JSON Files', extensions: ['json'] },
];

// Register IPC handlers for backup operations
export function registerBackupHandlers(mainWindow: BrowserWindow): void {
    // Create Backup step 1: Receive exported data from renderer
    ipcMain.handle('backup:export-data', async (_event, backup: BackupFile) => {
        return backup;
    });

    // Create Backup step 2: Save the backup file
    ipcMain.handle('backup:save-file', async (_event, backup: BackupFile) => {
        return await handleSaveBackup(backup, mainWindow);
    });

    // Pre-restore: Renderer sends its current data for pre-restore backup
    // This is called before restore-confirm. The renderer exports its own data
    // and sends it here so main can save a pre-restore snapshot.
    ipcMain.handle(
        'backup:get-current-and-backup',
        async (_event, backup: BackupFile) => {
            return await handlePreRestoreBackup(backup, mainWindow);
        }
    );

    // Restore step 1: Open file dialog, read, validate
    ipcMain.handle('backup:restore-request', async () => {
        return await handleRestoreRequestFile(mainWindow);
    });

    // Restore step 2: Apply restored documents to renderer database
    // The renderer already received the backup docs from the preview dialog.
    // This invoke carries them back to main, which then signals renderer via preload.
    ipcMain.handle(
        'backup:apply-restore',
        async (_event, docs: JobApplication[]) => {
            return { success: true, docs };
        }
    );
}

// Save backup file after receiving data from renderer
async function handleSaveBackup(
    backup: BackupFile,
    win: BrowserWindow,
): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
        // Open native save dialog
        const result = await dialog.showSaveDialog(win, {
            title: 'Create Backup',
            defaultPath: `job-application-backup-${new Date().toISOString().slice(0, 10)}${BACKUP_EXTENSION}`,
            filters: BACKUP_FILE_FILTER,
            buttonLabel: 'Save Backup',
        });

        if (result.canceled || !result.filePath) {
            return { success: false, error: 'Backup cancelled' };
        }

        // Write JSON file in main process
        await fs.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf-8');

        return { success: true, filePath: result.filePath };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Backup failed: ${message}` };
    }
}

// Save pre-restore backup when renderer sends its current data
async function handlePreRestoreBackup(
    backup: BackupFile,
    win: BrowserWindow,
): Promise<{ success: boolean; error?: string }> {
    try {
        const preRestorePath = `${process.env.HOME || process.cwd()}/pre-restore-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.jobbackup`;
        await fs.writeFile(preRestorePath, JSON.stringify(backup, null, 2), 'utf-8');
        console.log('[main] Pre-restore backup created:', preRestorePath);
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn('[main] Pre-restore backup failed (continuing anyway):', message);
        return { success: true }; // Continue even if pre-restore fails
    }
}

// Restore step 1: Open file dialog, read, validate
async function handleRestoreRequestFile(
    win: BrowserWindow,
): Promise<{ valid: boolean; backup?: BackupFile; error?: string }> {
    try {
        // Open native open-file dialog
        const result = await dialog.showOpenDialog(win, {
            title: 'Restore Backup',
            filters: BACKUP_FILE_FILTER,
            buttonLabel: 'Open Backup',
            properties: ['openFile'],
        });

        if (result.canceled || !result.filePaths.length) {
            return { valid: false, error: 'Cancelled' };
        }

        const filePath = result.filePaths[0];

        // Read and parse the backup file
        const raw = await fs.readFile(filePath, 'utf-8');
        let parsed: unknown;

        try {
            parsed = JSON.parse(raw);
        } catch {
            return { valid: false, error: 'The selected file is not a valid JSON backup file.' };
        }

        // Validate backup format
        if (!validateBackup(parsed)) {
            return { valid: false, error: 'This file is not a valid Job Application Tracker backup.' };
        }

        const validatedBackup = parsed as BackupFile;

        // Return preview info (clone to avoid serialization issues)
        return {
            valid: true,
            backup: {
                ...validatedBackup,
                docs: JSON.parse(JSON.stringify(validatedBackup.docs)),
            },
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { valid: false, error: `Failed to read backup file: ${message}` };
    }
}
