import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { forkVersion, repositoryURL } from "../apps/core/noname/util/distribution.js";
import { parseResourceManifest, resourceGroup, resourceURL } from "../apps/core/noname/resources/manifest.js";
import { createResourceDecryptor } from "../apps/core/noname/resources/crypto.js";
import { encryptResourcePart, resourceKeyConfig } from "./resource-key.mjs";

const requireCore = createRequire(new URL("../apps/core/package.json", import.meta.url));
const JSZip = requireCore("jszip");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const archiveVersion = 1;

async function inventory(directory, prefix = "") {
	const files = [];
	for (const entry of (await fs.readdir(path.join(directory, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
		const filename = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isSymbolicLink()) throw new Error(`Runtime contains a symbolic link: ${filename}`);
		if (entry.isDirectory()) files.push(...(await inventory(directory, filename)));
		else files.push(filename);
	}
	return files;
}

export async function splitRuntimeResources({ directory, resourceDirectory, fullDirectory, key, profile = "lite", rootURL, baseURL = rootURL ? resourceURL(rootURL, `v${forkVersion}`) + "/" : `${repositoryURL}/releases/download/v${forkVersion}/`, deliveryURL = "", partBytes = 24 * 1024 * 1024 }) {
	const keyConfig = resourceKeyConfig(key);
	const decrypt = await createResourceDecryptor(keyConfig, keyConfig.keyId);
	const root = path.resolve(directory);
	for (const target of [resourceDirectory, fullDirectory]) {
		const resolved = path.resolve(target);
		if (resolved === root || resolved.startsWith(root + path.sep) || root.startsWith(resolved + path.sep)) throw new Error("Resource outputs must be separate from the runtime");
	}
	let previous;
	try {
		previous = parseResourceManifest(JSON.parse(await fs.readFile(path.join(resourceDirectory, "resource-manifest.json"), "utf8")));
	} catch {}
	const priorParts = new Map();
	const signature = files => hash(JSON.stringify(files.map(file => [file.path, file.bytes, file.sha256])));
	for (const pack of previous?.archiveVersion === archiveVersion && previous.encryption.keyId === keyConfig.keyId ? previous.packs : []) {
		const files = new Map(pack.files.map(file => [file.path, file]));
		for (const part of pack.parts) priorParts.set(signature(part.files.map(filename => files.get(filename))), part);
	}
	await fs.mkdir(resourceDirectory, { recursive: true });
	await fs.writeFile(path.join(root, "resource-key.json"), JSON.stringify(keyConfig) + "\n");
	await fs.rm(fullDirectory, { recursive: true, force: true });
	await fs.cp(root, fullDirectory, { recursive: true });
	const groups = new Map();
	const core = [];
	for (const filename of await inventory(root)) {
		if (filename === "resource-manifest.json" || filename === "resource-version.json") continue;
		const group = resourceGroup(filename);
		if (!group) {
			core.push(filename);
			continue;
		}
		if (!groups.has(group.id)) groups.set(group.id, { ...group, files: [], parts: [] });
		const bytes = await fs.readFile(path.join(root, filename));
		groups.get(group.id).files.push({ path: filename, bytes: bytes.length, sha256: hash(bytes) });
	}
	for (const pack of groups.values()) {
		let pending = [],
			size = 0;
		async function flush() {
			if (!pending.length) return;
			const previous = priorParts.get(signature(pending));
			if (previous) {
				try {
					const data = await fs.readFile(path.join(resourceDirectory, previous.path));
					if (data.length === previous.bytes && (await decrypt(data, previous))) {
						pack.parts.push(previous);
						pending = [];
						size = 0;
						return;
					}
				} catch {}
			}
			const zip = new JSZip();
			// JSZip writes local DOS fields, so pin those fields instead of a UTC instant.
			for (const file of pending) zip.file(file.path, await fs.readFile(path.join(root, file.path)), { date: new Date(2000, 0, 1), createFolders: false });
			const plaintext = zip.generate({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 1 } });
			const { bytes: data, sha256 } = encryptResourcePart(plaintext, key);
			const name = `resources-${keyConfig.keyId}-${sha256.slice(0, 24)}.nrp`;
			await fs.writeFile(path.join(resourceDirectory, name), data);
			pack.parts.push({ path: name, bytes: data.length, sha256, files: pending.map(file => file.path) });
			pending = [];
			size = 0;
		}
		for (const file of pack.files) {
			if (size && size + file.bytes > partBytes) await flush();
			pending.push(file);
			size += file.bytes;
		}
		await flush();
	}
	const coreHash = createHash("sha256");
	coreHash.update(JSON.stringify({ baseURL, deliveryURL }));
	for (const filename of core) coreHash.update(filename).update(await fs.readFile(path.join(root, filename)));
	const buildId = coreHash.digest("hex");
	const version = JSON.stringify({ schemaVersion: 1, version: forkVersion, buildId }) + "\n";
	core.push("resource-version.json");
	await fs.writeFile(path.join(root, "resource-version.json"), version);
	await fs.writeFile(path.join(fullDirectory, "resource-version.json"), version);
	const manifest = parseResourceManifest({ schemaVersion: 2, archiveVersion, encryption: { algorithm: "AES-256-GCM", keyId: keyConfig.keyId }, version: forkVersion, buildId, profile, baseURL, ...(deliveryURL ? { deliveryURL } : {}), core, packs: [...groups.values()] });
	const serialized = JSON.stringify(manifest) + "\n";
	await fs.writeFile(path.join(root, "resource-manifest.json"), serialized);
	await fs.writeFile(path.join(resourceDirectory, "resource-manifest.json"), serialized);
	const referenced = new Set(manifest.packs.flatMap(pack => pack.parts.map(part => part.path)));
	for (const entry of await fs.readdir(resourceDirectory)) if (/^resources-[a-f0-9-]+\.(zip|nrp)$/.test(entry) && !referenced.has(entry)) await fs.unlink(path.join(resourceDirectory, entry));
	await fs.writeFile(path.join(fullDirectory, "resource-manifest.json"), JSON.stringify({ ...manifest, profile: "full" }) + "\n");
	if (profile === "lite") {
		for (const pack of manifest.packs) for (const file of pack.files) await fs.unlink(path.join(root, file.path));
		const html = await fs.readFile(path.join(root, "index.html"), "utf8");
		const lightweight = /<html\b/i.test(html) ? html.replace(/<html\b/i, '<html data-resource-profile="lite"') : html.replace(/<!doctype html>/i, '$&\n<html data-resource-profile="lite">');
		if (!lightweight.includes('data-resource-profile="lite"')) throw new Error("Runtime HTML has no document entry");
		await fs.writeFile(path.join(root, "index.html"), lightweight);
	}
	const summary = {
		profile,
		coreFiles: core.length,
		mediaFiles: manifest.packs.reduce((sum, pack) => sum + pack.files.length, 0),
		mediaBytes: manifest.packs.reduce((sum, pack) => sum + pack.files.reduce((n, file) => n + file.bytes, 0), 0),
		downloadBytes: manifest.packs.reduce((sum, pack) => sum + pack.parts.reduce((n, part) => n + part.bytes, 0), 0),
		packs: manifest.packs.map(pack => ({ id: pack.id, files: pack.files.length, parts: pack.parts.length })),
	};
	await fs.writeFile(path.join(resourceDirectory, "build-summary.json"), JSON.stringify(summary, null, 2) + "\n");
	return summary;
}
