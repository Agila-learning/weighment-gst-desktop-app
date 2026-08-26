import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import { initDatabase, executeQuery } from './database'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      plugins: true,
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase();

  ipcMain.handle('db-query', async (event, query: string, params: any[] = []) => {
    try {
      return { success: true, data: executeQuery(query, params) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-transaction', async (event, queries: { query: string, params: any[] }[]) => {
    try {
      const db = initDatabase();
      const runTransaction = db.transaction((queriesList: any[]) => {
        const results = [];
        for (const q of queriesList) {
          const stmt = db.prepare(q.query);
          if (q.query.trim().toUpperCase().startsWith('SELECT')) {
            results.push(stmt.all(...(q.params || [])));
          } else {
            results.push(stmt.run(...(q.params || [])));
          }
        }
        return results;
      });
      return { success: true, data: runTransaction(queries) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('verify-password', async (event, password, hash) => {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return { success: true, isValid };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });



  ipcMain.handle('backup-db', async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'weighbridge_offline.db');
      if (!win) return { success: false, error: 'No window' };
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Save Database Backup',
        defaultPath: path.join(app.getPath('documents'), `weighbridge_backup_${new Date().toISOString().split('T')[0]}.db`),
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      });
      if (canceled || !filePath) return { success: false, error: 'Cancelled' };
      
      fs.copyFileSync(dbPath, filePath);
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auto-backup-db', async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'weighbridge_offline.db');
      
      const backupDir = path.join(app.getPath('documents'), 'Weighbridge_AutoBackups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const filePath = path.join(backupDir, `auto_backup_${new Date().toISOString().split('T')[0]}.db`);
      fs.copyFileSync(dbPath, filePath);
      
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('restore-db', async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'weighbridge_offline.db');
      if (!win) return { success: false, error: 'No window' };
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Restore Database Backup',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile']
      });
      if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelled' };
      
      const confirm = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['Yes, Restore', 'Cancel'],
        title: 'Confirm Restore',
        message: 'Are you sure you want to overwrite the current database? This action cannot be undone and the application will restart.'
      });
      
      if (confirm.response !== 0) return { success: false, error: 'Cancelled' };

      fs.copyFileSync(filePaths[0], dbPath);
      
      // Relaunch to reload db
      app.relaunch();
      app.exit(0);
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

