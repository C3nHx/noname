import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const destination = path.resolve(process.argv[2]);
const installedApp = path.resolve(process.argv[3], "resources/app");
const files = [
	["apps/core", "game/config.json"],
	["apps/core", "noname/util/bundled-config.js"],
	["vendor/ziqi/runtime", "extension/懒人包/extension.js"],
	["vendor/ziqi/runtime", "extension/斗转星移/class/Banchar.js"],
	["vendor/ziqi/runtime", "extension/斗转星移/class/ChooseChar.js"],
	["vendor/ziqi/runtime", "extension/十周年UI/ui/styles/lbtn/window/shousha.css"],
];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const records = [];
await fs.mkdir(destination, { recursive: true });
for (const [sourceRoot, name] of files) {
	const bytes = await fs.readFile(path.join(repository, sourceRoot, name));
	const target = path.join(destination, "files", name);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, bytes);
	let beforeSha256 = null;
	try { beforeSha256 = hash(await fs.readFile(path.join(installedApp, name))); }
	catch (error) { if (error.code !== "ENOENT") throw error; }
	records.push({ path: name, bytes: bytes.length, sha256: hash(bytes), beforeSha256 });
}
await fs.copyFile(path.join(repository, "scripts/apply-windows-settings-fix.ps1"), path.join(destination, "apply.ps1"));
await fs.writeFile(path.join(destination, "manifest.json"), JSON.stringify({ version: "1.11.7-c3nhx.1", fix: "settings-ban-1", files: records }, null, 2) + "\n");
console.log(`Created ${records.length}-file Windows patch at ${destination}`);
