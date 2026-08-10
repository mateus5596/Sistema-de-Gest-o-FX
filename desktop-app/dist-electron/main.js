import { BrowserWindow, app } from "electron";
import path from "path";
import { fileURLToPath } from "url";
//#region main.js
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isDev = !app.isPackaged;
function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	if (isDev) {
		mainWindow.loadURL("http://localhost:5173");
		mainWindow.webContents.openDevTools();
	} else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
