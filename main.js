// ** TODO: set a real CSP in HTML <meta> tag so app isn't vulnerable

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const path = require('path');

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    frame: false,
    movable: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'html/dashboard.html'));
  // mainWindow.loadFile(path.join(__dirname, 'html/auth-check.html'));
  // mainWindow.webContents.openDevTools(); // optional
};

ipcMain.on('show-window', () => {
  if (mainWindow) mainWindow.show();
});

ipcMain.on('close-app', () => app.quit());

ipcMain.on('minimize-app', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});