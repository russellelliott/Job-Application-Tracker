import type { BackupFile } from './types';

/**
 * Validate a backup file object without importing renderer-only dependencies.
 */
export function validateBackup(data: unknown): data is BackupFile {
  if (!data || typeof data !== 'object') return false;

  const backup = data as Record<string, unknown>;

  if (backup.format !== 'job-application-tracker-backup') return false;
  if (backup.version !== 1) return false;

  if (typeof backup.createdAt !== 'string') return false;
  const date = new Date(backup.createdAt);
  if (isNaN(date.getTime())) return false;

  if (!Array.isArray(backup.docs)) return false;

  for (const doc of backup.docs) {
    if (!doc || typeof doc !== 'object') return false;
    if (typeof (doc as Record<string, unknown>).id !== 'string') return false;
  }

  return true;
}
