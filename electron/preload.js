const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getProjects: (folder) => ipcRenderer.invoke('get-projects', folder),
  analyzeProject: (projectPath) => ipcRenderer.invoke('analyze-project', projectPath),
  exportProject: (projectPath, outputFolder) => ipcRenderer.invoke('export-project', projectPath, outputFolder),
  importProject: (zipPath, targetFolder) => ipcRenderer.invoke('import-project', zipPath, targetFolder),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  getDefaultCapCutPath: () => ipcRenderer.invoke('get-default-capcut-path'),
  onExportProgress: (callback) => ipcRenderer.on('export-progress', (_, data) => callback(data)),
  onImportProgress: (callback) => ipcRenderer.on('import-progress', (_, data) => callback(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  getImageBase64: (filePath) => ipcRenderer.invoke('get-image-base64', filePath),
  getDiskSpace: (folderPath) => ipcRenderer.invoke('get-disk-space', folderPath),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  downloadAndInstallUpdate: (url) => ipcRenderer.invoke('download-and-install-update', url),
  onUpdateDownloadProgress: (cb) => ipcRenderer.on('update-download-progress', (_, d) => cb(d)),
})
