const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getApiToken: () => ipcRenderer.invoke("get-api-token"),
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  startDownload: (options) => ipcRenderer.send("start-download", options),
  onDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("download-progress", listener);
    return () => ipcRenderer.removeListener("download-progress", listener);
  },
  onDownloadComplete: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("download-complete", listener);
    return () => ipcRenderer.removeListener("download-complete", listener);
  },
  toggleFullscreen: () => ipcRenderer.send("toggle-fullscreen"),
  onFullscreenChange: (callback) => {
    const listener = (event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("fullscreen-change", listener);
    return () => ipcRenderer.removeListener("fullscreen-change", listener);
  }
});
