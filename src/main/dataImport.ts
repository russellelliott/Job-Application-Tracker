// One-time reset: clear DB and localStorage, then import fresh data
// Uncomment the next line to perform a one-time reset and import on next reload
// resetAndImport();
import db, { addApplication } from '../renderer/db';
import { JobApplication } from '../types';

export async function resetAndImport() {
  await db.destroy();
  localStorage.removeItem('dataImported');
  // Re-create DB instance after destroy
  window.location.reload();
}

export async function importInitialDataIfNeeded() {
  const importedFlag = localStorage.getItem('dataImported');
  if (importedFlag) {
    console.log('[renderer] Data already imported. Skipping import.');
    return;
  }

  // Prevent repeated import if DB is not empty
  const existing = await db.allDocs({ limit: 1 });
  if (existing.rows.length > 0) {
    console.log('[renderer] Database already has data. Skipping import.');
    localStorage.setItem('dataImported', 'true');
    return;
  }

  try {
    // @ts-ignore
    const data: JobApplication[] = await window.electron.readInitialData();
    console.log('[renderer] Read initial data:', data);
    // Import data as-is (no mapping)
    for (const app of data) {
      try {
        await addApplication(app);
        console.log('[renderer] Added application:', app.id);
      } catch (e) {
        console.error('[renderer] Error adding application:', app.id, e);
      }
    }
    localStorage.setItem('dataImported', 'true');
    console.log('[renderer] Data import complete.');
  } catch (e) {
    console.error('[renderer] Error during data import:', e);
  }
}

// Helper for development: clear DB and localStorage to force re-import
export async function resetInitialData() {
  await db.destroy();
  localStorage.removeItem('dataImported');
  console.log('[renderer] Database and localStorage cleared. Reloading...');
  window.location.reload();
}
