import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
//#region electron/main.ts
var currentDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(currentDir, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
var win;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(currentDir, "preload.cjs"),
			plugins: true
		}
	});
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(process.env.DIST, "index.html"));
}
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(() => {
	ipcMain.handle("choose-folder", async () => {
		const result = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
		if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0];
		return null;
	});
	ipcMain.handle("save-pdf", async (event, { buffer, invoiceNumber, customPath, forceReplace }) => {
		try {
			let targetDir = customPath;
			if (!targetDir) targetDir = path.join(app.getPath("documents"), "GST Billing", "Invoices", (/* @__PURE__ */ new Date()).getFullYear().toString());
			if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
			const filePath = path.join(targetDir, `${invoiceNumber}.pdf`);
			if (fs.existsSync(filePath) && !forceReplace) return {
				success: false,
				error: "FILE_EXISTS",
				path: filePath
			};
			fs.writeFileSync(filePath, Buffer.from(buffer));
			return {
				success: true,
				path: filePath
			};
		} catch (err) {
			console.error("Error saving PDF:", err);
			return {
				success: false,
				error: err.message
			};
		}
	});
	ipcMain.handle("save-pdf-dialog", async (event, { buffer, defaultFilename }) => {
		try {
			const { canceled, filePath } = await dialog.showSaveDialog(win, {
				title: "Save Invoice PDF",
				defaultPath: defaultFilename || "invoice.pdf",
				filters: [{
					name: "PDF Documents",
					extensions: ["pdf"]
				}]
			});
			if (canceled || !filePath) return {
				success: false,
				canceled: true
			};
			fs.writeFileSync(filePath, Buffer.from(buffer));
			return {
				success: true,
				path: filePath
			};
		} catch (err) {
			console.error("Error in save-pdf-dialog:", err);
			return {
				success: false,
				error: err.message
			};
		}
	});
	ipcMain.handle("check-pdf-exists", async (event, { invoiceNumber, customPath }) => {
		if (!invoiceNumber) return { exists: false };
		let targetDir = customPath;
		if (!targetDir) targetDir = path.join(app.getPath("documents"), "GST Billing", "Invoices", (/* @__PURE__ */ new Date()).getFullYear().toString());
		const filePath = path.join(targetDir, `${invoiceNumber}.pdf`);
		return {
			exists: fs.existsSync(filePath),
			path: filePath
		};
	});
	ipcMain.handle("open-pdf", async (event, filePath) => {
		if (!filePath || !fs.existsSync(filePath)) return {
			success: false,
			error: "File not found"
		};
		const err = await shell.openPath(filePath);
		if (err) return {
			success: false,
			error: err
		};
		return { success: true };
	});
	ipcMain.handle("open-folder", async (event, filePath) => {
		if (!filePath || !fs.existsSync(filePath)) return {
			success: false,
			error: "File not found"
		};
		shell.showItemInFolder(filePath);
		return { success: true };
	});
	ipcMain.handle("get-printers", async () => {
		if (!win) return [];
		return await win.webContents.getPrintersAsync();
	});
	ipcMain.handle("print-pdf", async (event, { filePath, printerName }) => {
		try {
			const printWin = new BrowserWindow({ show: false });
			await printWin.loadURL(`file://${filePath}`);
			return new Promise((resolve) => {
				printWin.webContents.print({
					deviceName: printerName,
					silent: true
				}, (success, failureReason) => {
					printWin.close();
					if (success) resolve({ success: true });
					else resolve({
						success: false,
						error: failureReason
					});
				});
			});
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	});
	ipcMain.handle("generate-pdf", async (event, htmlContent) => {
		try {
			const tempPath = path.join(app.getPath("temp"), `temp_invoice_${Date.now()}.html`);
			fs.writeFileSync(tempPath, htmlContent, "utf-8");
			const printWin = new BrowserWindow({
				show: false,
				webPreferences: {
					nodeIntegration: false,
					contextIsolation: true
				}
			});
			await printWin.loadURL(`file://${tempPath}`);
			await new Promise((resolve) => printWin.webContents.once("did-finish-load", () => resolve(null)));
			const pdfBuffer = await printWin.webContents.printToPDF({
				printBackground: true,
				pageSize: "A4",
				margins: {
					top: 0,
					bottom: 0,
					left: 0,
					right: 0
				}
			});
			printWin.close();
			try {
				fs.unlinkSync(tempPath);
			} catch (e) {}
			return {
				success: true,
				buffer: pdfBuffer
			};
		} catch (err) {
			console.error("Local PDF Generation Error:", err);
			return {
				success: false,
				error: err.message || String(err)
			};
		}
	});
	createWindow();
});
//#endregion
export {};
