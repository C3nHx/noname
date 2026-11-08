import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { stageBundledExtensions } from "./bundle-extensions.mjs";
import { checkExtensionImports } from "./check-extension-imports.mjs";

const repository = fileURLToPath(new URL("../", import.meta.url));
const destination = path.resolve(process.argv[2] ?? path.join(repository, "output/web-deployment"));
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repository, encoding: "utf8" }).trim();
await fs.mkdir(destination, { recursive: false });
const web = path.join(destination, "web");
await fs.cp(path.join(repository, "dist"), web, { recursive: true, dereference: true });
await stageBundledExtensions(web);
const configPath = path.join(web, "game/config.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
await checkExtensionImports(web, config.extensions);
config.mode = "connect";
config.show_splash = "off";
config.mode_config.connect ??= {};
config.mode_config.connect.read_clipboard = false;
await fs.writeFile(configPath, JSON.stringify(config, null, "\t") + "\n");
await fs.writeFile(path.join(web, "deployment.js"), 'import { lib } from "/noname.js";\nconst lobby = new URL("/lobby", location.href);\nlobby.protocol = location.protocol === "https:" ? "wss:" : "ws:";\nlib.hallURL = lobby.href;\nconst loadtime = lib.configprefix + "loadtime";\nif (localStorage.getItem(loadtime) === null) localStorage.setItem(loadtime, "60000");\n');
const indexPath = path.join(web, "index.html");
const html = await fs.readFile(indexPath, "utf8");
if (!html.includes('<script type="module">')) throw new Error("Built HTML module entry was not found");
await fs.writeFile(indexPath, html.replace('<script type="module">', '<script type="module" src="/deployment.js"></script>\n<script type="module">'));
const server = path.join(destination, "server");
await fs.mkdir(server);
await fs.cp(path.join(repository, "packages/fs/dist"), path.join(server, "dist"), { recursive: true });
const sourcePackage = JSON.parse(await fs.readFile(path.join(repository, "packages/fs/package.json"), "utf8"));
const { engines } = JSON.parse(await fs.readFile(path.join(repository, "package.json"), "utf8"));
const requireServer = createRequire(path.join(repository, "packages/fs/package.json"));
const dependencies = Object.fromEntries(await Promise.all(Object.keys(sourcePackage.dependencies).map(async name => [name, JSON.parse(await fs.readFile(requireServer.resolve(name + "/package.json"), "utf8")).version])));
await fs.writeFile(path.join(server, "package.json"), JSON.stringify({ name: "noname-web-server", private: true, type: "module", engines, dependencies }, null, 2) + "\n");
const files = [];
async function inventory(directory) {
	for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
		const target = path.join(directory, entry.name);
		const relative = path.relative(destination, target).split(path.sep).join("/");
		if (entry.isSymbolicLink() || [".git", "Home", "credentials"].includes(entry.name)) throw new Error(`Unexpected deployment file: ${relative}`);
		if (entry.isDirectory()) await inventory(target);
		else {
			const bytes = await fs.readFile(target);
			files.push({ path: relative, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
		}
	}
}
await inventory(destination);
files.sort((a, b) => a.path.localeCompare(b.path));
const vendor = JSON.parse(await fs.readFile(path.join(repository, "vendor/ziqi/manifest.json"), "utf8"));
const manifest = { commit, createdAt: new Date().toISOString(), nodePort: 10080, lobbyPath: "/lobby", extensions: vendor.extensions, files };
await fs.writeFile(path.join(destination, "deployment-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
const archive = destination + ".tar.gz";
if (process.platform === "win32") {
	const sevenZip = path.join(process.env.ProgramFiles, "7-Zip/7z.exe");
	execFileSync(sevenZip, ["a", "-ttar", destination + ".tar", ".", "-mx=0", "-bso0", "-bsp0"], { cwd: destination, stdio: "inherit" });
	execFileSync(sevenZip, ["a", "-tgzip", "-mx=1", archive, destination + ".tar", "-bso0", "-bsp0"], { stdio: "inherit" });
	await fs.unlink(destination + ".tar");
} else {
	execFileSync("tar", ["-czf", archive, "-C", destination, "."], { stdio: "inherit" });
}
const { createReadStream } = await import("node:fs");
const hash = createHash("sha256");
for await (const chunk of createReadStream(archive)) hash.update(chunk);
const sha256 = hash.digest("hex");
await fs.writeFile(archive + ".sha256", `${sha256}  ${path.basename(archive)}\n`);
const summary = { archive, sha256, fileCount: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), extensions: manifest.extensions };
await fs.writeFile(destination + ".json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
