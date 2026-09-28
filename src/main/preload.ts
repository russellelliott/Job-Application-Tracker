// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { BackupFile, JobApplicationInput, JobApplication } from '../types';

export type Channels =
       | 'ipc-example'
       | 'backup:create:trigger'
       | 'backup:restore:trigger';

interface ElectronAPIDefs {
     readInitialData(): Promise<JobApplicationInput[]>;
     parseNetworkingNotes(notes: string): Promise<JobApplicationInput[]>;

      // Backup operations — direct renderer-side calls for PouchDB operations,
      // IPC only for file dialogs (main process).
      // createBackup: Full export + save flow. Calls local exportBackup(), then
      // IPCs the data to main for file save dialog.
     createBackup(backup: BackupFile): Promise<{ success: boolean; filePath?: string; error?: string }>;

      // restoreBackup: Opens main-process file dialog, reads & validates backup.
      // Returns preview data for the dialog component.
     restoreBackup(): Promise<{ valid: boolean; backup?: BackupFile; error?: string }>;

      // confirmRestore: Called by the renderer after user confirms.
      // 1. Renders its current state via local exportBackup()
      // 2. Sends it to main for pre-restore file save
      // 3. Then calls local restoreBackupDocs() with the backup docs
     confirmRestore(
          docs: JobApplication[],
          currentBackup: BackupFile,
     ): Promise<{ success: boolean; error?: string }>;

     cancelRestore(): Promise<{ success: boolean }>;
}

interface IPCRendererBridge {
     sendMessage(channel: Channels, ...args: unknown[]): void;
     on(channel: Channels, func: (...args: unknown[]) => void): () => void;
     once(channel: Channels, func: (...args: unknown[]) => void): void;
     removeListener(channel: string, func: (...args: unknown[]) => void): void;
}

declare global {
      // eslint-disable-next-line no-unused-vars
    interface Window {
        electron: ElectronAPIDefs & {
            ipcRenderer: IPCRendererBridge;
          };
      }
}

const electronHandler: ElectronAPIDefs = {
     readInitialData: () => ipcRenderer.invoke('read-initial-data'),
     parseNetworkingNotes: (notes: string) =>
         ipcRenderer.invoke('parse-networking-notes', notes),

      // Create Backup: two-step — renderer exports, main saves file
     createBackup: (backup: BackupFile) => {
          return ipcRenderer.invoke('backup:save-file', backup);
       },

      // Restore Backup step 1: Open file dialog in main, read, validate, return preview
     restoreBackup: () => ipcRenderer.invoke('backup:restore-request'),

      // Confirm Restore: renderer exports its current data for pre-restore backup,
      // then applies the incoming docs locally. No executeJavaScript needed.
     confirmRestore: (docs: JobApplication[], currentBackup: BackupFile) => {
          return ipcRenderer.invoke('backup:get-current-and-backup', currentBackup)
            .then(() => ipcRenderer.invoke('backup:apply-restore', docs));
       },

     cancelRestore: () => ipcRenderer.invoke('backup:restore-cancel'),
};

const ipcRendererBridge = {
     sendMessage(channel: Channels, ...args: unknown[]) {
         ipcRenderer.send(channel, ...args);
       },
     on(channel: string, func: (...args: unknown[]) => void) {
          const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
              func(...args);
         ipcRenderer.on(channel, subscription);
         return () => ipcRenderer.removeListener(channel, subscription);
       },
     once(channel: string, func: (...args: unknown[]) => void) {
          ipcRenderer.once(channel, (_event, ...args) => func(...args));
       },
     removeListener(channel: string, func: (...args: unknown[]) => void) {
         ipcRenderer.removeListener(channel, func);
       },
};

contextBridge.exposeInMainWorld('electron', {
       ...electronHandler,
     ipcRenderer: ipcRendererBridge,
});

export type ElectronHandler = typeof electronHandler;
