import db from './db';
import { BackupFile as BackupFileType, JobApplication } from '../types';

// Re-export for convenience
export type BackupFile = BackupFileType;

// Raw PouchDB document type with internal metadata for stripping
interface RawPouchDoc extends JobApplication {
   _rev?: string;
   _id?: string;
}

// Export all PouchDB documents into a versioned backup object
export async function exportBackup(): Promise<BackupFile> {
  const rawDocs = await db.allDocs<RawPouchDoc>({
    include_docs: true,
    attachments: true,
    binary: false,
    });

  const docs = rawDocs.rows
       .map((row) => row.doc)
       .filter(Boolean) as RawPouchDoc[];

   // Strip PouchDB internal fields (_rev, _id) for portable backup
  return {
    format: 'job-application-tracker-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    docs: docs.map(({ _rev, ...doc }) => doc),
   };
}

// Validate a backup file object (also used by main process)
export function validateBackup(data: unknown): data is BackupFile {
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
    if (typeof doc.id !== 'string') return false;
  }

  return true;
}
