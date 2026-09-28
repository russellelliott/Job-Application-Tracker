import type { ElectronHandler } from '../main/preload';

interface IPCRendererBridge {
  on(channel: string, func: (...args: unknown[]) => void): () => void;
  removeListener(channel: string, func: (...args: unknown[]) => void): void;
  once(channel: string, func: (...args: unknown[]) => void): void;
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler & {
      ipcRenderer: IPCRendererBridge;
    };
  }
}

export {};
