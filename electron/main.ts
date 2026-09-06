import { app, BrowserWindow, ipcMain, screen, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

app.setName('KetakKetik');

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL !== undefined;

async function createWindow(): Promise<BrowserWindow | null> {
  const iconPath = isDev
    ? path.join(app.getAppPath(), 'public', 'icons', 'icon.png')
    : path.join(__dirname, '..', 'icons', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (process.platform === 'darwin') app.dock?.setIcon(icon);
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width = Math.min(1440, workArea.width);
  const height = Math.min(960, workArea.height);
  const window = new BrowserWindow({
    width,
    height,
    x: workArea.x + Math.floor((workArea.width - width) / 2),
    y: workArea.y + Math.floor((workArea.height - height) / 2),
    show: false,
    title: 'KetakKetik',
    icon,

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  window.once('ready-to-show', () => window.show());

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
      await window.loadURL(devUrl);
    } else {
      throw new Error('VITE_DEV_SERVER_URL is not defined in dev mode');
    }
  } else {
    const indexPath = path.join(__dirname, '..', 'index.html');
    await window.loadFile(indexPath);
  }

  return window ?? null;
}

// ── Lifecycle ──────────────────────────────────────────────

app.whenReady().then(createWindow).catch((error: unknown) => {
  console.error('Failed to create window:', error);
  app.quit();
});

app.on('window-all-closed', (): void => {
  app.quit();
});

// ── IPC Handlers ───────────────────────────────────────────

// Profile switching
ipcMain.on('profile:switch', (_event: Electron.IpcMainEvent, profileId: string): void => {
  // Delegate to preload → renderer via contextBridge
  console.log('[main] profile:switch', profileId);
});

// Session recording
ipcMain.on('session:record', (_event: Electron.IpcMainEvent, data: unknown): void => {
  console.log('[main] session:record', data);
});

// Theme changes
ipcMain.on('theme:change', (_event: Electron.IpcMainEvent, theme: string): void => {
  console.log('[main] theme:change', theme);
});

// Keep reference to prevent GC
(globalThis as unknown as { mainWindow: BrowserWindow | null }).mainWindow = null;
