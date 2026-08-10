import { BrowserWindow as e, app as t } from "electron";
import n from "path";
import { fileURLToPath as r } from "url";
//#region main.js
var i = r(import.meta.url), a = n.dirname(i), o = !t.isPackaged;
function s() {
	let t = new e({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: n.join(a, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		}
	});
	o ? (t.loadURL("http://localhost:5173"), t.webContents.openDevTools()) : t.loadFile(n.join(a, "../dist/index.html"));
}
t.whenReady().then(() => {
	s(), t.on("activate", () => {
		e.getAllWindows().length === 0 && s();
	});
}), t.on("window-all-closed", () => {
	process.platform !== "darwin" && t.quit();
});
//#endregion
export {};
