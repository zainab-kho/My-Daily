const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    closeApp: () => ipcRenderer.send('close-app'),
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    sendAuthState: (state) => ipcRenderer.send('auth-state', state),
    onAuthStateChanged: (callback) => ipcRenderer.on('auth-state-changed', callback),
    showWindow: () => ipcRenderer.send('show-window')
  });

