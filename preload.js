const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  toggleFullscreen: () => ipcRenderer.send("toggle-fullscreen"),
  onFullscreenChange: (callback) => {
    const listener = (event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("fullscreen-change", listener);
    return () => ipcRenderer.removeListener("fullscreen-change", listener);
  }
});
