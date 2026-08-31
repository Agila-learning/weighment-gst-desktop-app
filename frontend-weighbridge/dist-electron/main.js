//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let electron = require("electron");
let node_path = require("node:path");
node_path = __toESM(node_path);
let node_url = require("node:url");
let bcryptjs = require("bcryptjs");
bcryptjs = __toESM(bcryptjs);
let node_fs = require("node:fs");
node_fs = __toESM(node_fs);
let better_sqlite3 = require("better-sqlite3");
better_sqlite3 = __toESM(better_sqlite3);
//#region electron/database.ts
var dbInstance = null;
function initDatabase() {
	const dbPath = node_path.default.join(electron.app.getPath("userData"), "weighbridge_offline.db");
	dbInstance = new better_sqlite3.default(dbPath, { verbose: console.log });
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
    CREATE TABLE IF NOT EXISTS customer_material_prices (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      materialId TEXT NOT NULL,
      pricingType TEXT,
      billingUnit TEXT,
      rate REAL,
      isActive INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS device_settings (
      id TEXT PRIMARY KEY,
      connectionType TEXT,
      comPort TEXT,
      baudRate INTEGER,
      dataBits INTEGER,
      parity TEXT,
      stopBits INTEGER,
      ipAddress TEXT,
      port INTEGER,
      readInterval INTEGER,
      connectionTimeout INTEGER,
      updatedAt TEXT
    );
  `);
	for (const query of [
		"ALTER TABLE weighments ADD COLUMN loadType TEXT",
		"ALTER TABLE weighments ADD COLUMN firstWeightDate TEXT",
		"ALTER TABLE weighments ADD COLUMN secondWeightDate TEXT",
		"ALTER TABLE weighments ADD COLUMN firstWeightSource TEXT",
		"ALTER TABLE weighments ADD COLUMN secondWeightSource TEXT",
		"ALTER TABLE weighments ADD COLUMN invoiceReference TEXT",
		"ALTER TABLE weighments ADD COLUMN cancellationReason TEXT",
		"ALTER TABLE weighments ADD COLUMN originalWeighmentId TEXT",
		"ALTER TABLE weighments ADD COLUMN isCorrection INTEGER DEFAULT 0",
		"ALTER TABLE weighments ADD COLUMN pricingType TEXT",
		"ALTER TABLE weighments ADD COLUMN rate REAL",
		"ALTER TABLE weighments ADD COLUMN billingUnit TEXT",
		"ALTER TABLE weighments ADD COLUMN calculatedQuantity REAL",
		"ALTER TABLE weighments ADD COLUMN calculatedAmount REAL",
		"ALTER TABLE weighments ADD COLUMN pricingSnapshot TEXT",
		"ALTER TABLE materials ADD COLUMN pricingType TEXT",
		"ALTER TABLE materials ADD COLUMN billingUnit TEXT",
		"ALTER TABLE materials ADD COLUMN defaultRate REAL",
		"ALTER TABLE customers ADD COLUMN mobile1 TEXT",
		"ALTER TABLE customers ADD COLUMN mobile2 TEXT"
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
var currentDir = typeof __dirname !== "undefined" ? __dirname : node_path.default.dirname((0, node_url.fileURLToPath)(require("url").pathToFileURL(__filename).href));
process.env.DIST = node_path.default.join(currentDir, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : node_path.default.join(process.env.DIST, "../public");
var win;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
	win = new electron.BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: node_path.default.join(currentDir, "preload.cjs"),
			plugins: true
		}
	});
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(node_path.default.join(process.env.DIST || "", "index.html"));
}
async function waitForBackend() {
	const maxRetries = 15;
	let retries = 0;
	while (retries < maxRetries) {
		try {
			if ((await fetch("http://127.0.0.1:3000/api/health")).ok) {
				console.log("Backend is ready!");
				return true;
			}
		} catch (e) {}
		console.log("Waiting for backend... attempt " + (retries + 1));
		await new Promise((resolve) => setTimeout(resolve, 1e3));
		retries++;
	}
	return false;
}
electron.app.whenReady().then(async () => {
	if (!await waitForBackend()) {
		electron.dialog.showErrorBox("Startup Error", "Unable to connect to the backend server or database. Please check if the backend is running properly.");
		electron.app.quit();
		return;
	}
	initDatabase();
	electron.ipcMain.handle("db-query", async (event, query, params = []) => {
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
	electron.ipcMain.handle("db-transaction", async (event, queries) => {
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
	electron.ipcMain.handle("verify-password", async (event, password, hash) => {
		try {
			return {
				success: true,
				isValid: await bcryptjs.default.compare(password, hash)
			};
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	});
	electron.ipcMain.handle("backup-db", async () => {
		try {
			const dbPath = node_path.default.join(electron.app.getPath("userData"), "weighbridge_offline.db");
			if (!win) return {
				success: false,
				error: "No window"
			};
			const { canceled, filePath } = await electron.dialog.showSaveDialog(win, {
				title: "Save Database Backup",
				defaultPath: node_path.default.join(electron.app.getPath("documents"), `weighbridge_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`),
				filters: [{
					name: "SQLite Database",
					extensions: ["db"]
				}]
			});
			if (canceled || !filePath) return {
				success: false,
				error: "Cancelled"
			};
			node_fs.default.copyFileSync(dbPath, filePath);
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
	electron.ipcMain.handle("auto-backup-db", async () => {
		try {
			const dbPath = node_path.default.join(electron.app.getPath("userData"), "weighbridge_offline.db");
			const backupDir = node_path.default.join(electron.app.getPath("documents"), "Weighbridge_AutoBackups");
			if (!node_fs.default.existsSync(backupDir)) node_fs.default.mkdirSync(backupDir, { recursive: true });
			const filePath = node_path.default.join(backupDir, `auto_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`);
			node_fs.default.copyFileSync(dbPath, filePath);
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
	electron.ipcMain.handle("restore-db", async () => {
		try {
			const dbPath = node_path.default.join(electron.app.getPath("userData"), "weighbridge_offline.db");
			if (!win) return {
				success: false,
				error: "No window"
			};
			const { canceled, filePaths } = await electron.dialog.showOpenDialog(win, {
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
			if ((await electron.dialog.showMessageBox(win, {
				type: "warning",
				buttons: ["Yes, Restore", "Cancel"],
				title: "Confirm Restore",
				message: "Are you sure you want to overwrite the current database? This action cannot be undone and the application will restart."
			})).response !== 0) return {
				success: false,
				error: "Cancelled"
			};
			node_fs.default.copyFileSync(filePaths[0], dbPath);
			electron.app.relaunch();
			electron.app.exit(0);
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
electron.app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		electron.app.quit();
		win = null;
	}
});
electron.app.on("activate", () => {
	if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
//#endregion
