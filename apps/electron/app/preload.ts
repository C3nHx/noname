import { app, getCurrentWindow } from "@electron/remote";
import { createRequire } from "node:module";
import path from "node:path";

const gameRoot = import.meta.env.DEV ? path.resolve(app.getAppPath(), "../core") : app.getAppPath();
Object.assign(window, { __dirname: gameRoot, __filename: path.join(gameRoot, "index.html"), require: createRequire(path.join(gameRoot, "package.json")), process });
localStorage.setItem("noname_inited", "nodejs");
const thisWindow = getCurrentWindow();

thisWindow.setAutoHideMenuBar(false);
thisWindow.setMenuBarVisibility(true);

thisWindow.on("leave-full-screen", () => {
	if (!thisWindow.isDestroyed()) {
		thisWindow.webContents.closeDevTools();
	} else {
		app.exit(0);
	}
});
