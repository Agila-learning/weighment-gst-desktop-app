import { BrowserWindow as e, app as t, dialog as n, ipcMain as r, shell as i } from "electron";
import a from "node:path";
import { fileURLToPath as o } from "node:url";
import s from "node:fs";
//#region electron/main.ts
var c = a.dirname(o(import.meta.url));
process.env.DIST = a.join(c, "../dist"), process.env.VITE_PUBLIC = t.isPackaged ? process.env.DIST : a.join(process.env.DIST, "../public");
var l, u = process.env.VITE_DEV_SERVER_URL;
function d() {
	l = new e({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: a.join(c, "preload.js"),
			plugins: !0
		}
	}), l.webContents.on("did-finish-load", () => {
		l?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	}), u ? l.loadURL(u) : l.loadFile(a.join(process.env.DIST, "index.html"));
}
t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), l = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && d();
}), t.whenReady().then(() => {
	r.handle("choose-folder", async () => {
		let e = await n.showOpenDialog(l, { properties: ["openDirectory"] });
		return !e.canceled && e.filePaths.length > 0 ? e.filePaths[0] : null;
	}), r.handle("save-pdf", async (e, { buffer: n, invoiceNumber: r, customPath: i, forceReplace: o }) => {
		try {
			let e = i;
			e ||= a.join(t.getPath("documents"), "GST Billing", "Invoices", (/* @__PURE__ */ new Date()).getFullYear().toString()), s.existsSync(e) || s.mkdirSync(e, { recursive: !0 });
			let c = a.join(e, `${r}.pdf`);
			return s.existsSync(c) && !o ? {
				success: !1,
				error: "FILE_EXISTS",
				path: c
			} : (s.writeFileSync(c, Buffer.from(n)), {
				success: !0,
				path: c
			});
		} catch (e) {
			return console.error("Error saving PDF:", e), {
				success: !1,
				error: e.message
			};
		}
	}), r.handle("save-pdf-dialog", async (e, { buffer: t, defaultFilename: r }) => {
		try {
			let { canceled: e, filePath: i } = await n.showSaveDialog(l, {
				title: "Save Invoice PDF",
				defaultPath: r || "invoice.pdf",
				filters: [{
					name: "PDF Documents",
					extensions: ["pdf"]
				}]
			});
			return e || !i ? {
				success: !1,
				canceled: !0
			} : (s.writeFileSync(i, Buffer.from(t)), {
				success: !0,
				path: i
			});
		} catch (e) {
			return console.error("Error in save-pdf-dialog:", e), {
				success: !1,
				error: e.message
			};
		}
	}), r.handle("check-pdf-exists", async (e, { invoiceNumber: n, customPath: r }) => {
		if (!n) return { exists: !1 };
		let i = r;
		i ||= a.join(t.getPath("documents"), "GST Billing", "Invoices", (/* @__PURE__ */ new Date()).getFullYear().toString());
		let o = a.join(i, `${n}.pdf`);
		return {
			exists: s.existsSync(o),
			path: o
		};
	}), r.handle("open-pdf", async (e, t) => {
		if (!t || !s.existsSync(t)) return {
			success: !1,
			error: "File not found"
		};
		let n = await i.openPath(t);
		return n ? {
			success: !1,
			error: n
		} : { success: !0 };
	}), r.handle("open-folder", async (e, t) => !t || !s.existsSync(t) ? {
		success: !1,
		error: "File not found"
	} : (i.showItemInFolder(t), { success: !0 })), r.handle("get-printers", async () => l ? await l.webContents.getPrintersAsync() : []), r.handle("print-pdf", async (t, { filePath: n, printerName: r }) => {
		try {
			let t = new e({ show: !1 });
			return await t.loadURL(`file://${n}`), new Promise((e) => {
				t.webContents.print({
					deviceName: r,
					silent: !0
				}, (n, r) => {
					t.close(), e(n ? { success: !0 } : {
						success: !1,
						error: r
					});
				});
			});
		} catch (e) {
			return {
				success: !1,
				error: e.message
			};
		}
	}), r.handle("generate-pdf", async (n, r) => {
		try {
			let n = a.join(t.getPath("temp"), `temp_invoice_${Date.now()}.html`);
			s.writeFileSync(n, r, "utf-8");
			let i = new e({
				show: !1,
				webPreferences: {
					nodeIntegration: !1,
					contextIsolation: !0
				}
			});
			await i.loadURL(`file://${n}`), await new Promise((e) => i.webContents.once("did-finish-load", () => e(null)));
			let o = await i.webContents.printToPDF({
				printBackground: !0,
				pageSize: "A4",
				margins: {
					top: 0,
					bottom: 0,
					left: 0,
					right: 0
				}
			});
			i.close();
			try {
				s.unlinkSync(n);
			} catch {}
			return {
				success: !0,
				buffer: o
			};
		} catch (e) {
			return console.error("Local PDF Generation Error:", e), {
				success: !1,
				error: e.message || String(e)
			};
		}
	}), d();
});
//#endregion
export {};
