var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron2 = require("electron");
var import_node_path2 = __toESM(require("node:path"));
var import_node_url = require("node:url");
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_node_fs = __toESM(require("node:fs"));

// electron/database.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_node_path = __toESM(require("node:path"));
var import_electron = require("electron");
var dbInstance = null;
function initDatabase() {
  const dbPath = import_node_path.default.join(import_electron.app.getPath("userData"), "weighbridge_offline.db");
  dbInstance = new import_better_sqlite3.default(dbPath, { verbose: console.log });
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
      pricingType TEXT,
      rate REAL,
      billingUnit TEXT,
      calculatedQuantity REAL,
      calculatedAmount REAL,
      pricingSnapshot TEXT,
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
  const alters = [
    "ALTER TABLE weighments ADD COLUMN loadType TEXT",
    "ALTER TABLE weighments ADD COLUMN firstWeightDate TEXT",
    "ALTER TABLE weighments ADD COLUMN secondWeightDate TEXT",
    "ALTER TABLE weighments ADD COLUMN firstWeightSource TEXT",
    "ALTER TABLE weighments ADD COLUMN secondWeightSource TEXT",
    "ALTER TABLE weighments ADD COLUMN invoiceReference TEXT",
    "ALTER TABLE weighments ADD COLUMN cancellationReason TEXT",
    "ALTER TABLE weighments ADD COLUMN originalWeighmentId TEXT",
    "ALTER TABLE weighments ADD COLUMN isCorrection INTEGER DEFAULT 0",
    // Advanced Enhancements Additions
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
  ];
  for (const query of alters) {
    try {
      dbInstance.exec(query);
    } catch (e) {
    }
  }
  return dbInstance;
}
function executeQuery(query, params = []) {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  const stmt = dbInstance.prepare(query);
  if (query.trim().toUpperCase().startsWith("SELECT")) {
    return stmt.all(...params);
  } else {
    return stmt.run(...params);
  }
}

// electron/main.ts
var import_meta = {};
var currentDir = typeof __dirname !== "undefined" ? __dirname : import_node_path2.default.dirname((0, import_node_url.fileURLToPath)(import_meta.url));
process.env.DIST = import_node_path2.default.join(currentDir, "../dist");
process.env.VITE_PUBLIC = import_electron2.app.isPackaged ? process.env.DIST : import_node_path2.default.join(process.env.DIST, "../public");
var win;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new import_electron2.BrowserWindow({
    width: 1200,
    height: 800,
    icon: import_node_path2.default.join(process.env.VITE_PUBLIC || "", "icon.png"),
    webPreferences: {
      preload: import_node_path2.default.join(currentDir, "preload.cjs"),
      plugins: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(import_node_path2.default.join(process.env.DIST || "", "index.html"));
  }
}
async function waitForBackend() {
  const maxRetries = 60;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const res = await fetch("http://127.0.0.1:3000/api/health");
      if (res.ok) {
        console.log("Backend is ready!");
        return true;
      }
    } catch (e) {
    }
    console.log("Waiting for backend... attempt " + (retries + 1));
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    retries++;
  }
  return false;
}
import_electron2.app.whenReady().then(async () => {
  const isBackendReady = await waitForBackend();
  if (!isBackendReady) {
    import_electron2.dialog.showErrorBox(
      "Startup Error",
      "Unable to connect to the backend server or database. Please check if the backend is running properly."
    );
    import_electron2.app.quit();
    return;
  }
  initDatabase();
  import_electron2.ipcMain.handle("db-query", async (event, query, params = []) => {
    try {
      return { success: true, data: executeQuery(query, params) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron2.ipcMain.handle("db-transaction", async (event, queries) => {
    try {
      const db = initDatabase();
      const runTransaction = db.transaction((queriesList) => {
        const results = [];
        for (const q of queriesList) {
          const stmt = db.prepare(q.query);
          if (q.query.trim().toUpperCase().startsWith("SELECT")) {
            results.push(stmt.all(...q.params || []));
          } else {
            results.push(stmt.run(...q.params || []));
          }
        }
        return results;
      });
      return { success: true, data: runTransaction(queries) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron2.ipcMain.handle("verify-password", async (event, password, hash) => {
    try {
      const isValid = await import_bcryptjs.default.compare(password, hash);
      return { success: true, isValid };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron2.ipcMain.handle("backup-db", async () => {
    try {
      const dbPath = import_node_path2.default.join(import_electron2.app.getPath("userData"), "weighbridge_offline.db");
      if (!win) return { success: false, error: "No window" };
      const { canceled, filePath } = await import_electron2.dialog.showSaveDialog(win, {
        title: "Save Database Backup",
        defaultPath: import_node_path2.default.join(import_electron2.app.getPath("documents"), `weighbridge_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`),
        filters: [{ name: "SQLite Database", extensions: ["db"] }]
      });
      if (canceled || !filePath) return { success: false, error: "Cancelled" };
      import_node_fs.default.copyFileSync(dbPath, filePath);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron2.ipcMain.handle("auto-backup-db", async () => {
    try {
      const dbPath = import_node_path2.default.join(import_electron2.app.getPath("userData"), "weighbridge_offline.db");
      const backupDir = import_node_path2.default.join(import_electron2.app.getPath("documents"), "Weighbridge_AutoBackups");
      if (!import_node_fs.default.existsSync(backupDir)) {
        import_node_fs.default.mkdirSync(backupDir, { recursive: true });
      }
      const filePath = import_node_path2.default.join(backupDir, `auto_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`);
      import_node_fs.default.copyFileSync(dbPath, filePath);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron2.ipcMain.handle("save-pdf-dialog", async (event, { buffer, defaultFilename }) => {
    try {
      const { canceled, filePath } = await import_electron2.dialog.showSaveDialog(win, {
        title: "Save PDF",
        defaultPath: defaultFilename || "document.pdf",
        filters: [{ name: "PDF Documents", extensions: ["pdf"] }]
      });
      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }
      import_node_fs.default.writeFileSync(filePath, Buffer.from(buffer));
      return { success: true, path: filePath };
    } catch (err) {
      console.error("Error in save-pdf-dialog:", err);
      return { success: false, error: err.message };
    }
  });
  let sharedPdfWindow = null;
  import_electron2.ipcMain.handle("generate-pdf", async (event, htmlContent) => {
    try {
      if (!sharedPdfWindow || sharedPdfWindow.isDestroyed()) {
        sharedPdfWindow = new import_electron2.BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
      }
      await sharedPdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      const pdfBuffer = await sharedPdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      return { success: true, buffer: pdfBuffer };
    } catch (err) {
      console.error("Local PDF Generation Error:", err);
      return { success: false, error: err.message || String(err) };
    }
  });
  import_electron2.ipcMain.handle("restore-db", async () => {
    try {
      const dbPath = import_node_path2.default.join(import_electron2.app.getPath("userData"), "weighbridge_offline.db");
      if (!win) return { success: false, error: "No window" };
      const { canceled, filePaths } = await import_electron2.dialog.showOpenDialog(win, {
        title: "Restore Database Backup",
        filters: [{ name: "SQLite Database", extensions: ["db"] }],
        properties: ["openFile"]
      });
      if (canceled || filePaths.length === 0) return { success: false, error: "Cancelled" };
      const confirm = await import_electron2.dialog.showMessageBox(win, {
        type: "warning",
        buttons: ["Yes, Restore", "Cancel"],
        title: "Confirm Restore",
        message: "Are you sure you want to overwrite the current database? This action cannot be undone and the application will restart."
      });
      if (confirm.response !== 0) return { success: false, error: "Cancelled" };
      import_node_fs.default.copyFileSync(filePaths[0], dbPath);
      import_electron2.app.relaunch();
      import_electron2.app.exit(0);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  createWindow();
});
import_electron2.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
    win = null;
  }
});
import_electron2.app.on("activate", () => {
  if (import_electron2.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
