import { createRequire } from "node:module";
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import fs from "node:fs";
//#region electron/database.ts
var Database = createRequire(import.meta.url)("better-sqlite3");
var dbInstance = null;
function initDatabase() {
	dbInstance = new Database(path.join(app.getPath("userData"), "weighbridge_offline.db"), { verbose: console.log });
	dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gstin TEXT
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      vehicleNumber TEXT NOT NULL,
      tareWeight REAL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transporters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS weighments (
      id TEXT PRIMARY KEY,
      slipNumber TEXT,
      vehicleId TEXT,
      vehicleNumber TEXT,
      customerId TEXT,
      customerName TEXT,
      materialId TEXT,
      materialName TEXT,
      driverId TEXT,
      driverName TEXT,
      transporterId TEXT,
      transporterName TEXT,
      firstWeight REAL,
      secondWeight REAL,
      netWeight REAL,
      status TEXT,
      syncStatus TEXT,
      date TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      loadType TEXT,
      firstWeightDate TEXT,
      secondWeightDate TEXT,
      firstWeightSource TEXT,
      secondWeightSource TEXT
    );
    
    CREATE TABLE IF NOT EXISTS local_sync_queue (
      id TEXT PRIMARY KEY,
      entityType TEXT,
      entityId TEXT,
      operation TEXT,
      payload TEXT,
      status TEXT,
      retryCount INTEGER DEFAULT 0,
      errorMessage TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      action TEXT,
      entity TEXT,
      entityId TEXT,
      details TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS auth_cache (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT,
      name TEXT,
      role TEXT,
      localHash TEXT,
      applicationAccess TEXT
    );
  `);
	for (const query of [
		"ALTER TABLE weighments ADD COLUMN loadType TEXT",
		"ALTER TABLE weighments ADD COLUMN firstWeightDate TEXT",
		"ALTER TABLE weighments ADD COLUMN secondWeightDate TEXT",
		"ALTER TABLE weighments ADD COLUMN firstWeightSource TEXT",
		"ALTER TABLE weighments ADD COLUMN secondWeightSource TEXT"
	]) try {
		dbInstance.exec(query);
	} catch (e) {}
	return dbInstance;
}
function executeQuery(query, params = []) {
	if (!dbInstance) dbInstance = initDatabase();
	const stmt = dbInstance.prepare(query);
	if (query.trim().toUpperCase().startsWith("SELECT")) return stmt.all(...params);
	else return stmt.run(...params);
}
//#endregion
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
var win;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: { preload: path.join(__dirname, "preload.mjs") }
	});
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(process.env.DIST || "", "index.html"));
}
app.whenReady().then(() => {
	initDatabase();
	ipcMain.handle("db-query", async (event, query, params = []) => {
		try {
			return {
				success: true,
				data: executeQuery(query, params)
			};
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	});
	ipcMain.handle("db-transaction", async (event, queries) => {
		try {
			const db = initDatabase();
			return {
				success: true,
				data: db.transaction((queriesList) => {
					const results = [];
					for (const q of queriesList) {
						const stmt = db.prepare(q.query);
						if (q.query.trim().toUpperCase().startsWith("SELECT")) results.push(stmt.all(...q.params || []));
						else results.push(stmt.run(...q.params || []));
					}
					return results;
				})(queries)
			};
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	});
	ipcMain.handle("verify-password", async (event, password, hash) => {
		try {
			return {
				success: true,
				isValid: await bcrypt.compare(password, hash)
			};
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	});
	ipcMain.handle("backup-db", async () => {
		try {
			const dbPath = path.join(app.getPath("userData"), "weighbridge_offline.db");
			if (!win) return {
				success: false,
				error: "No window"
			};
			const { canceled, filePath } = await dialog.showSaveDialog(win, {
				title: "Save Database Backup",
				defaultPath: path.join(app.getPath("documents"), `weighbridge_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`),
				filters: [{
					name: "SQLite Database",
					extensions: ["db"]
				}]
			});
			if (canceled || !filePath) return {
				success: false,
				error: "Cancelled"
			};
			fs.copyFileSync(dbPath, filePath);
			return {
				success: true,
				filePath
			};
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	});
	ipcMain.handle("restore-db", async () => {
		try {
			const dbPath = path.join(app.getPath("userData"), "weighbridge_offline.db");
			if (!win) return {
				success: false,
				error: "No window"
			};
			const { canceled, filePaths } = await dialog.showOpenDialog(win, {
				title: "Restore Database Backup",
				filters: [{
					name: "SQLite Database",
					extensions: ["db"]
				}],
				properties: ["openFile"]
			});
			if (canceled || filePaths.length === 0) return {
				success: false,
				error: "Cancelled"
			};
			if ((await dialog.showMessageBox(win, {
				type: "warning",
				buttons: ["Yes, Restore", "Cancel"],
				title: "Confirm Restore",
				message: "Are you sure you want to overwrite the current database? This action cannot be undone and the application will restart."
			})).response !== 0) return {
				success: false,
				error: "Cancelled"
			};
			fs.copyFileSync(filePaths[0], dbPath);
			app.relaunch();
			app.exit(0);
			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	});
	createWindow();
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
//#endregion
export {};
