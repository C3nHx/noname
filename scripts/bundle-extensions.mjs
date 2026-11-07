import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));

export async function stageBundledExtensions(destination, { vendorRoot = path.join(repository, "vendor/ziqi"), coreRoot = path.join(repository, "apps/core") } = {}) {
	const manifest = JSON.parse(await fs.readFile(path.join(vendorRoot, "manifest.json"), "utf8"));
	for (const file of manifest.files) {
		if (!/^(extension|audio|image|theme|layout|font)\//.test(file.path) || file.path.split("/").includes("..") || file.path.includes("\\")) throw new Error(`Invalid bundled path: ${file.path}`);
		const source = path.join(vendorRoot, "runtime", file.path);
		const data = await fs.readFile(source);
		if (data.length !== file.bytes || createHash("sha256").update(data).digest("hex") !== file.sha256) throw new Error(`Bundled resource checksum mismatch: ${file.path}`);
		if (!file.path.startsWith("extension/")) {
			try {
				await fs.access(path.join(coreRoot, file.path));
				continue;
			} catch (error) {
				if (error.code !== "ENOENT") throw error;
			}
		}
		const target = path.join(destination, file.path);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.copyFile(source, target);
	}
}

export async function stageExtensionDependencies(destination) {
	const require = createRequire(import.meta.url);
	const compiler = path.dirname(require.resolve("typescript/package.json"));
	const target = path.join(destination, "node_modules/typescript");
	await fs.mkdir(target, { recursive: true });
	await fs.cp(path.join(compiler, "lib"), path.join(target, "lib"), { recursive: true });
	for (const name of ["package.json", "LICENSE.txt", "ThirdPartyNoticeText.txt"]) await fs.copyFile(path.join(compiler, name), path.join(target, name));
	await fs.cp(path.join(repository, "apps/core/typings"), path.join(destination, "node_modules/@types/noname-typings"), { recursive: true });
}
