import db from './db';
import { validateBackup } from '../backupValidation';
import type { BackupFile, JobApplication } from '../types';

export { validateBackup } from '../backupValidation';

/**
 * Export all PouchDB documents into a versioned backup object.
 * This function runs in the renderer where PouchDB lives.
 */
export async function exportBackup(): Promise<BackupFile> {
  const rawDocs = await db.allDocs<JobApplication & { _rev?: string }>({
    include_docs: true,
    attachments: true,
    binary: false,
  });

  const docs = rawDocs.rows
    .map((row) => row.doc)
    .filter(Boolean) as (JobApplication & { _rev?: string })[];

  // Strip PouchDB internal fields (_rev) for portable backup
  return {
    format: 'job-application-tracker-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    docs: docs.map(({ _rev, ...doc }) => doc),
  };
}

/**
 * Bulk restore documents into PouchDB.
 * This function runs in the renderer where PouchDB lives.
 * @param docs - The documents to restore (from a validated backup)
 */
export async function restoreBackupDocs(docs: JobApplication[]): Promise<void> {
     // Get all existing documents and delete them
  const existing = await db.allDocs<{ _id: string; _rev: string }>({ include_docs: false });
  const toDelete: Array<any> = existing.rows
       .filter((row) => row.doc != null)
       .map((row) => ({
         _id: (row.doc as any)._id,
         _rev: row.value.rev,
         _deleted: true,
       }));

  if (toDelete.length > 0) {
    await db.bulkDocs(toDelete);
    }

   // Insert backup documents (add _id back for PouchDB)
  const toInsert = docs.map((doc) => ({ ...doc, _id: doc.id }));
  const result = await db.bulkDocs(toInsert as any);

   // Check for failures
  const failures = result.filter((item) => item && 'error' in item && item.error);
  if (failures.length > 0) {
    throw new Error(`Restore failed for ${failures.length} document(s)`);
   }
}
