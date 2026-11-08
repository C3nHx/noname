import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseResourceManifest } from "../apps/core/noname/resources/manifest.js";
import { checkExtensionImports } from "./check-extension-imports.mjs";

export async function configureWebRuntime(web) {
	const configPath = path.join(web, "game/config.json");
	const config = JSON.parse(await fs.readFile(configPath, "utf8"));
	await checkExtensionImports(web, config.extensions);
	config.mode = "connect";
	config.show_splash = "off";
	config.mode_config.connect ??= {};
	config.mode_config.connect.read_clipboard = false;
	const serializedConfig = JSON.stringify(config, null, "\t") + "\n";
	await fs.writeFile(configPath, serializedConfig);
	const deployment = 'import { lib } from "/noname.js";\nconst lobby = new URL("/lobby", location.href);\nlobby.protocol = location.protocol === "https:" ? "wss:" : "ws:";\nlib.hallURL = lobby.href;\nconst loadtime = lib.configprefix + "loadtime";\nif (localStorage.getItem(loadtime) === null) localStorage.setItem(loadtime, "60000");\n';
	await fs.writeFile(path.join(web, "deployment.js"), deployment);
	const indexPath = path.join(web, "index.html");
	const original = await fs.readFile(indexPath, "utf8");
	if (!original.includes('<script type="module">')) throw new Error("Built HTML module entry was not found");
	const html = original.replace('<script type="module">', '<script type="module" src="/deployment.js"></script>\n<script type="module">');
	await fs.writeFile(indexPath, html);
	const manifestPath = path.join(web, "resource-manifest.json");
	const manifest = parseResourceManifest(JSON.parse(await fs.readFile(manifestPath, "utf8")));
	manifest.buildId = createHash("sha256").update(manifest.buildId).update(serializedConfig).update(deployment).update(html).digest("hex");
	manifest.core = [...new Set([...manifest.core, "deployment.js"])];
	await fs.writeFile(manifestPath, JSON.stringify(manifest) + "\n");
	await fs.writeFile(path.join(web, "resource-version.json"), JSON.stringify({ schemaVersion: 1, version: manifest.version, buildId: manifest.buildId }) + "\n");
}
