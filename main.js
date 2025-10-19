// --------------------------------------------
// handles main electron process setup, app launch,
// window creation, and core ipc communication
// --------------------------------------------

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// --------------------------------------------
// environment + setup
// --------------------------------------------

// suppress electron security warnings (safe since we control preload)
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// fully disable all chromium autofill & related popups
app.commandLine.appendSwitch(
  'disable-features',
  'Autofill,AutofillServerCommunication,PasswordManagerOnboarding,AutofillAddressProfileSavePrompt'
);
app.commandLine.appendSwitch('disable-autofill');

// resolve current directory references for esm
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// reference for main browser window
let mainWindow;

// --------------------------------------------
// ipc handlers
// --------------------------------------------

// handle navigation requests between pages
ipcMain.on('navigate', (event, page) => {
  if (!mainWindow) return;

  switch (page) {
    case 'dashboard':
      mainWindow.loadFile(path.join(__dirname, 'html/dashboard.html'));
      break;
    case 'login':
      mainWindow.loadFile(path.join(__dirname, 'html/auth/login.html'));
      break;
    default:
      console.warn(`unknown navigation target: ${page}`);
  }
});

// handle window minimize request
ipcMain.on('minimize-app', () => {
  if (mainWindow) mainWindow.minimize();
});

// handle window close request
ipcMain.on('close-app', () => {
  if (mainWindow) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

// --------------------------------------------
// create main window
// --------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false, // hide default frame for custom header controls
    transparent: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  // prevent autofill-related console spam from appearing
  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (
      message.includes('Autofill.enable') ||
      message.includes('Autofill.setAddresses')
    ) {
      event.preventDefault();
      return;
    }
    console.log(message);
  });

  // visually override chromium autofill colors (just in case)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        transition: background-color 9999s ease-in-out 0s;
        background-color: transparent !important;
        color: inherit !important;
      }
    `);
  });

  // initial window page (auth-check runs firebase user validation)
  mainWindow.loadFile(path.join(__dirname, 'html/auth/auth-check.html'));
}

// --------------------------------------------
// app lifecycle
// --------------------------------------------
app.whenReady().then(() => {
  createWindow();

  // recreate window if none open (mac behavior)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// close app when all windows shut (except on mac)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});