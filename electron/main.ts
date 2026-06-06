import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const isDev = !app.isPackaged;
const PORT = Number(process.env.PORT ?? 4317);

let mainWindow: BrowserWindow | null = null;
let dbPath = '';

function resolveAppPaths() {
  const appPath = app.getAppPath();
  const dataDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'ma_traders.db');
  return {
    dataDir,
    migrationsFolder: path.join(appPath, 'backend', 'drizzle'),
    staticDir: path.join(appPath, 'frontend', 'dist'),
  };
}

async function startApi() {
  const { dataDir, migrationsFolder, staticDir } = resolveAppPaths();
  // config.ts reads these at import time, so set them before importing the server
  process.env.MA_DATA_DIR = dataDir;
  process.env.MA_DB_PATH = dbPath;
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(PORT);

  // Compiled layout: dist/electron/main.js -> dist/backend/src/server.js
  const { startServer } = await import('../backend/src/server.js');
  await startServer({ port: PORT, migrationsFolder, staticDir });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    title: 'MA Traders',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  buildMenu();
  mainWindow.loadURL(`http://localhost:${PORT}`);
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Backup Database...',
          click: () => backupDatabase(),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function backupDatabase() {
  if (!mainWindow) return;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup MA Traders Database',
    defaultPath: `ma_traders_backup_${stamp}.db`,
    filters: [{ name: 'Database', extensions: ['db'] }],
  });
  if (canceled || !filePath) return;
  try {
    fs.copyFileSync(dbPath, filePath);
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: 'Backup completed successfully.',
      detail: filePath,
    });
  } catch (err) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: 'Backup failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

ipcMain.handle('app:backup', () => backupDatabase());
ipcMain.handle('app:version', () => app.getVersion());

app.whenReady().then(async () => {
  try {
    await startApi();
    createWindow();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start MA Traders:', err);
    dialog.showErrorBox(
      'Startup Error',
      err instanceof Error ? err.message : String(err),
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
