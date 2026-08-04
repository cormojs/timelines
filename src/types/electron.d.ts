import type { ElectronApi } from '../../electron/preload.cts'

export {}

declare global {
  interface Window {
    electron: ElectronApi
  }
}
