// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { BackupFile, JobApplicationInput } from '../types';

export type Channels =
     | 'ipc-example'
     | 'backup:create:trigger'
     | 'backup:restore:trigger';

interface ElectronAPIDefs {
  readInitialData(): Promise<JobApplicationInput[]>;
  parseNetworkingNotes(notes: string): Promise<JobApplicationInput[]>;
  exportBackup(): Promise<{ success: boolean; filePath?: string; error?: string }>;
  requestRestore(): Promise<{ valid: boolean; backup?: BackupFile; error?: string }>;
  confirmRestore(): Promise<{ success: boolean; error?: string }>;
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
  exportBackup: () => ipcRenderer.invoke('backup:create'),
  requestRestore: () => ipcRenderer.invoke('backup:restore:request'),
  confirmRestore: () => ipcRenderer.invoke('backup:restore:confirm'),
  cancelRestore: () => ipcRenderer.invoke('backup:restore:cancel'),
};

const ipcRendererBridge: IPCRendererBridge = {
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
