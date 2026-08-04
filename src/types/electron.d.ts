import type { ElectronApi } from '../../electron/preload.ts';

export {};

declare global {
  interface Window {
    electron: ElectronApi;
  }
}
