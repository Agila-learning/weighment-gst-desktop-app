import { createRequire as e } from "node:module";
import { BrowserWindow as t, app as n, dialog as r, ipcMain as i } from "electron";
import a from "node:path";
import { fileURLToPath as o } from "node:url";
import s from "bcryptjs";
import c from "node:fs";
//#region electron/database.ts
var l = e(import.meta.url)("better-sqlite3"), u = null;
function d() {
	u = new l(a.join(n.getPath("userData"), "weighbridge_offline.db"), { verbose: console.log }), u.exec("\n    CREATE TABLE IF NOT EXISTS customers (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL,\n      gstin TEXT\n    );\n    CREATE TABLE IF NOT EXISTS vehicles (\n      id TEXT PRIMARY KEY,\n      vehicleNumber TEXT NOT NULL,\n      tareWeight REAL\n    );\n    CREATE TABLE IF NOT EXISTS materials (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL\n    );\n    CREATE TABLE IF NOT EXISTS drivers (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL\n    );\n    CREATE TABLE IF NOT EXISTS transporters (\n      id TEXT PRIMARY KEY,\n      name TEXT NOT NULL\n    );\n    CREATE TABLE IF NOT EXISTS weighments (\n      id TEXT PRIMARY KEY,\n      slipNumber TEXT,\n      vehicleId TEXT,\n      vehicleNumber TEXT,\n      customerId TEXT,\n      customerName TEXT,\n      materialId TEXT,\n      materialName TEXT,\n      driverId TEXT,\n      driverName TEXT,\n      transporterId TEXT,\n      transporterName TEXT,\n      firstWeight REAL,\n      secondWeight REAL,\n      netWeight REAL,\n      status TEXT,\n      syncStatus TEXT,\n      date TEXT,\n      createdAt TEXT,\n      updatedAt TEXT,\n      loadType TEXT,\n      firstWeightDate TEXT,\n      secondWeightDate TEXT,\n      firstWeightSource TEXT,\n      secondWeightSource TEXT\n    );\n    \n    CREATE TABLE IF NOT EXISTS local_sync_queue (\n      id TEXT PRIMARY KEY,\n      entityType TEXT,\n      entityId TEXT,\n      operation TEXT,\n      payload TEXT,\n      status TEXT,\n      retryCount INTEGER DEFAULT 0,\n      errorMessage TEXT,\n      createdAt TEXT,\n      updatedAt TEXT\n    );\n    CREATE TABLE IF NOT EXISTS audit_logs (\n      id TEXT PRIMARY KEY,\n      userId TEXT,\n      action TEXT,\n      entity TEXT,\n      entityId TEXT,\n      details TEXT,\n      createdAt TEXT\n    );\n    CREATE TABLE IF NOT EXISTS auth_cache (\n      id TEXT PRIMARY KEY,\n      username TEXT,\n      email TEXT,\n      name TEXT,\n      role TEXT,\n      localHash TEXT,\n      applicationAccess TEXT\n    );\n    CREATE TABLE IF NOT EXISTS customer_material_prices (\n      id TEXT PRIMARY KEY,\n      customerId TEXT NOT NULL,\n      materialId TEXT NOT NULL,\n      pricingType TEXT,\n      billingUnit TEXT,\n      rate REAL,\n      isActive INTEGER DEFAULT 1\n    );\n\n    CREATE TABLE IF NOT EXISTS device_settings (\n      id TEXT PRIMARY KEY,\n      connectionType TEXT,\n      comPort TEXT,\n      baudRate INTEGER,\n      dataBits INTEGER,\n      parity TEXT,\n      stopBits INTEGER,\n      ipAddress TEXT,\n      port INTEGER,\n      readInterval INTEGER,\n      connectionTimeout INTEGER,\n      updatedAt TEXT\n    );\n  ");
	for (let e of [
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
		u.exec(e);
	} catch {}
	return u;
}
function f(e, t = []) {
	u ||= d();
	let n = u.prepare(e);
	return e.trim().toUpperCase().startsWith("SELECT") ? n.all(...t) : n.run(...t);
}
//#endregion
//#region electron/main.ts
var p = a.dirname(o(import.meta.url));
process.env.DIST = a.join(p, "../dist"), process.env.VITE_PUBLIC = n.isPackaged ? process.env.DIST : a.join(process.env.DIST, "../public");
var m, h = process.env.VITE_DEV_SERVER_URL;
function g() {
	m = new t({
		width: 1200,
		height: 800,
		webPreferences: { preload: a.join(p, "preload.mjs") }
	}), m.webContents.on("did-finish-load", () => {
		m?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	}), h ? m.loadURL(h) : m.loadFile(a.join(process.env.DIST || "", "index.html"));
}
n.whenReady().then(() => {
	d(), i.handle("db-query", async (e, t, n = []) => {
		try {
			return {
				success: !0,
				data: f(t, n)
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}), i.handle("db-transaction", async (e, t) => {
		try {
			let e = d();
			return {
				success: !0,
				data: e.transaction((t) => {
					let n = [];
					for (let r of t) {
						let t = e.prepare(r.query);
						r.query.trim().toUpperCase().startsWith("SELECT") ? n.push(t.all(...r.params || [])) : n.push(t.run(...r.params || []));
					}
					return n;
				})(t)
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}), i.handle("verify-password", async (e, t, n) => {
		try {
			return {
				success: !0,
				isValid: await s.compare(t, n)
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}), i.handle("backup-db", async () => {
		try {
			let e = a.join(n.getPath("userData"), "weighbridge_offline.db");
			if (!m) return {
				success: !1,
				error: "No window"
			};
			let { canceled: t, filePath: i } = await r.showSaveDialog(m, {
				title: "Save Database Backup",
				defaultPath: a.join(n.getPath("documents"), `weighbridge_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`),
				filters: [{
					name: "SQLite Database",
					extensions: ["db"]
				}]
			});
			return t || !i ? {
				success: !1,
				error: "Cancelled"
			} : (c.copyFileSync(e, i), {
				success: !0,
				filePath: i
			});
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}), i.handle("auto-backup-db", async () => {
		try {
			let e = a.join(n.getPath("userData"), "weighbridge_offline.db"), t = a.join(n.getPath("documents"), "Weighbridge_AutoBackups");
			c.existsSync(t) || c.mkdirSync(t, { recursive: !0 });
			let r = a.join(t, `auto_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`);
			return c.copyFileSync(e, r), {
				success: !0,
				filePath: r
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}), i.handle("restore-db", async () => {
		try {
			let e = a.join(n.getPath("userData"), "weighbridge_offline.db");
			if (!m) return {
				success: !1,
				error: "No window"
			};
			let { canceled: t, filePaths: i } = await r.showOpenDialog(m, {
				title: "Restore Database Backup",
				filters: [{
					name: "SQLite Database",
					extensions: ["db"]
				}],
				properties: ["openFile"]
			});
			return t || i.length === 0 || (await r.showMessageBox(m, {
				type: "warning",
				buttons: ["Yes, Restore", "Cancel"],
				title: "Confirm Restore",
				message: "Are you sure you want to overwrite the current database? This action cannot be undone and the application will restart."
			})).response !== 0 ? {
				success: !1,
				error: "Cancelled"
			} : (c.copyFileSync(i[0], e), n.relaunch(), n.exit(0), { success: !0 });
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}), g();
}), n.on("window-all-closed", () => {
	process.platform !== "darwin" && (n.quit(), m = null);
}), n.on("activate", () => {
	t.getAllWindows().length === 0 && g();
});
//#endregion
export {};
