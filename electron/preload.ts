import { contextBridge, ipcRenderer, webUtils } from 'electron';

type IpcPayload = unknown;
type SaveTimelineOptions = { create?: boolean } | undefined;
type IpcListener = (data: unknown) => void;
type UpdaterStatusListener = (data: { status: string }) => void;

const electronApi = {
  saveTimeline: (data: IpcPayload, filename: string, options?: SaveTimelineOptions) =>
    ipcRenderer.invoke('save-timeline', { data, filename, create: options?.create === true }),
  saveTimelineThumbnail: (payload: IpcPayload) => ipcRenderer.invoke('save-timeline-thumbnail', payload),
  listTimelines: () => ipcRenderer.invoke('list-timelines'),
  loadTimeline: (filename: string) => ipcRenderer.invoke('load-timeline', filename),
  exportTimeline: (data: IpcPayload, suggestedName: string) => ipcRenderer.invoke('export-timeline', { data, suggestedName }),
  exportTimelinePackage: (data: IpcPayload, suggestedName: string) =>
    ipcRenderer.invoke('export-timeline-package', { data, suggestedName }),
  importTimeline: (payload: IpcPayload) => ipcRenderer.invoke('import-timeline', payload),
  deleteTimeline: (payload: IpcPayload) => ipcRenderer.invoke('delete-timeline', payload),
  createNote: (payload: IpcPayload) => ipcRenderer.invoke('create-note', payload),
  addExistingNote: (payload: IpcPayload) => ipcRenderer.invoke('add-existing-note', payload),
  readNote: (payload: IpcPayload) => ipcRenderer.invoke('read-note', payload),
  writeNote: (payload: IpcPayload) => ipcRenderer.invoke('write-note', payload),
  deleteNote: (payload: IpcPayload) => ipcRenderer.invoke('delete-note', payload),
  renameNote: (payload: IpcPayload) => ipcRenderer.invoke('rename-note', payload),
  renameTimeline: (payload: IpcPayload) => ipcRenderer.invoke('rename-timeline', payload),
  createFolder: (payload: IpcPayload) => ipcRenderer.invoke('create-folder', payload),
  listFolders: () => ipcRenderer.invoke('list-folders'),
  moveTimeline: (payload: IpcPayload) => ipcRenderer.invoke('move-timeline', payload),
  renameFolder: (payload: IpcPayload) => ipcRenderer.invoke('rename-folder', payload),
  updateTimelineTitle: (payload: IpcPayload) => ipcRenderer.invoke('update-timeline-title', payload),
  setTimelineNeverSync: (payload: IpcPayload) => ipcRenderer.invoke('set-timeline-never-sync', payload),
  deleteFolder: (payload: IpcPayload) => ipcRenderer.invoke('delete-folder', payload),
  moveFolder: (payload: IpcPayload) => ipcRenderer.invoke('move-folder', payload),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  setAppSettings: (settings: IpcPayload) => ipcRenderer.invoke('set-app-settings', settings),
  chooseTimelinesDir: () => ipcRenderer.invoke('choose-timelines-dir'),
  chooseNotesDir: () => ipcRenderer.invoke('choose-notes-dir'),
  chooseNotesSubfolder: () => ipcRenderer.invoke('choose-notes-subfolder'),
  relaunchApp: () => ipcRenderer.invoke('relaunch-app'),
  openTimelinesFolder: () => ipcRenderer.invoke('open-timelines-folder'),
  openNotesFolder: () => ipcRenderer.invoke('open-notes-folder'),
  openThemesFolder: () => ipcRenderer.invoke('open-themes-folder'),
  openFontsFolder: () => ipcRenderer.invoke('open-fonts-folder'),
  getNotesBaseDir: () => ipcRenderer.invoke('get-notes-base-dir'),
  getAssetsBaseDir: () => ipcRenderer.invoke('get-assets-base-dir'),
  pickAndImportImage: (payload: IpcPayload) => ipcRenderer.invoke('pick-and-import-image', payload),
  importImageFromPath: (payload: IpcPayload) => ipcRenderer.invoke('import-image-from-path', payload),
  copyTimelineStorage: (payload: IpcPayload) => ipcRenderer.invoke('copy-timeline-storage', payload),
  deleteAsset: (payload: IpcPayload) => ipcRenderer.invoke('delete-asset', payload),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  chooseAssetsDir: () => ipcRenderer.invoke('choose-assets-dir'),
  openAssetsFolder: () => ipcRenderer.invoke('open-assets-folder'),
  listThemes: () => ipcRenderer.invoke('list-themes'),
  listFonts: () => ipcRenderer.invoke('list-fonts'),
  saveUserTheme: (payload: IpcPayload) => ipcRenderer.invoke('save-user-theme', payload),
  deleteUserTheme: (payload: IpcPayload) => ipcRenderer.invoke('delete-user-theme', payload),
  importThemeDialog: () => ipcRenderer.invoke('import-theme-dialog'),
  fetchWikipedia: (payload: IpcPayload) => ipcRenderer.invoke('fetch-wikipedia', payload),
  openExternal: (payload: IpcPayload) => ipcRenderer.invoke('open-external', payload),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  gitSyncConnect: (payload: IpcPayload) => ipcRenderer.invoke('git-sync-connect', payload),
  gitSyncUpdateCredentials: (payload: IpcPayload) => ipcRenderer.invoke('git-sync-update-credentials', payload),
  gitSyncNow: () => ipcRenderer.invoke('git-sync-now'),
  gitSyncStatus: () => ipcRenderer.invoke('git-sync-status'),
  gitSyncUpdateSettings: (payload: IpcPayload) => ipcRenderer.invoke('git-sync-update-settings', payload),
  gitSyncDisconnect: (payload: IpcPayload) => ipcRenderer.invoke('git-sync-disconnect', payload),
  gitSyncRebuild: () => ipcRenderer.invoke('git-sync-rebuild'),
  gitSyncMirrorSize: () => ipcRenderer.invoke('git-sync-mirror-size'),
  gitSyncShareInfo: (payload: IpcPayload) => ipcRenderer.invoke('git-sync-share-info', payload),
  gitSyncFileHistory: (payload: IpcPayload) => ipcRenderer.invoke('git-sync-file-history', payload),
  gitSyncRestoreVersion: (payload: IpcPayload) => ipcRenderer.invoke('git-sync-restore-version', payload),
  onGitSyncState: (callback: IpcListener) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on('git-sync-state-changed', listener);
    return () => {
      ipcRenderer.removeListener('git-sync-state-changed', listener);
    };
  },
  onGitSyncApplied: (callback: IpcListener) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on('git-sync-applied', listener);
    return () => {
      ipcRenderer.removeListener('git-sync-applied', listener);
    };
  },
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdaterStatus: (callback: UpdaterStatusListener) => {
    ipcRenderer.on('updater-status', (_event: Electron.IpcRendererEvent, data: { status: string }) => callback(data));
  },
  offUpdaterStatus: () => {
    ipcRenderer.removeAllListeners('updater-status');
  },
  platform: process.platform,
};

export type ElectronApi = typeof electronApi;

contextBridge.exposeInMainWorld('electron', electronApi);
