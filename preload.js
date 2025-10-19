const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // window controls
  closeApp: () => ipcRenderer.send("close-app"),
  minimizeApp: () => ipcRenderer.send("minimize-app"),

  // auth + window handling
  showWindow: () => ipcRenderer.send("show-window"),
  sendAuthState: (state) => ipcRenderer.send("auth-state", state),
  onAuthStateChanged: (callback) => ipcRenderer.on("auth-state-changed", callback),

  // navigation
  navigate: (page) => ipcRenderer.send("navigate", page),
});