import { app, getCurrentWindow } from "@electron/remote";
import { createRequire } from "node:module";
import path from "node:path";

if (process.isMainFrame) {
	const gameRoot = import.meta.env.DEV ? path.resolve(app.getAppPath(), "../core") : app.getAppPath();
	const gameRequire = createRequire(path.join(gameRoot, "package.json"));
	// Resolve native extension dependencies before the game installs its isolation hooks.
	gameRequire("@electron/remote");
	const dragZip = "./extension/拖拽读取/jszip.js";
	if (gameRequire("fs").existsSync(path.resolve(gameRoot, dragZip))) gameRequire(dragZip);
	Object.assign(window, { __dirname: gameRoot, __filename: path.join(gameRoot, "index.html"), require: gameRequire, process, nonameResourceRoot: path.join(app.getPath("userData"), "Resources") });
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
}
