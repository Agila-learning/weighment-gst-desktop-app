import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import { initDatabase, executeQuery } from './database'

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(currentDir, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.ico'),
    webPreferences: {
      preload: path.join(currentDir, 'preload.cjs'),
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

async function waitForBackend() {
  const maxRetries = 60;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/health');
      if (res.ok) {
        console.log('Backend is ready!');
        return true;
      }
    } catch (e) {
      // expected to fail until backend is up
    }
    console.log('Waiting for backend... attempt ' + (retries + 1));
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;
  }
  return false;
}

app.whenReady().then(async () => {
  const isBackendReady = await waitForBackend();
  if (!isBackendReady) {
    dialog.showErrorBox(
      'Startup Error',
      'Unable to connect to the backend server or database. Please check if the backend is running properly.'
    );
    app.quit();
    return;
  }

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

  ipcMain.handle('save-pdf-dialog', async (event, { buffer, defaultFilename }) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(win!, {
        title: 'Save PDF',
        defaultPath: defaultFilename || 'document.pdf',
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, Buffer.from(buffer));
      return { success: true, path: filePath };
    } catch (err: any) {
      console.error('Error in save-pdf-dialog:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('generate-pdf', async (event, htmlContent) => {
    try {
      const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      await new Promise(resolve => printWin.webContents.once('did-finish-load', () => resolve(null)));
      
      const pdfBuffer = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      printWin.close();
      return { success: true, buffer: pdfBuffer };
    } catch (err: any) {
      console.error('Local PDF Generation Error:', err);
      return { success: false, error: err.message || String(err) };
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

