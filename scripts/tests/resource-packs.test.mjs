import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { splitRuntimeResources } from "../resource-packs.mjs";
import { createResourceIndex, parseResourceManifest, resourceGroup, resourceURL } from "../../apps/core/noname/resources/manifest.js";
import { installResourcePack } from "../../apps/core/noname/resources/download.js";
import { createResourceDecryptor, sha256 } from "../../apps/core/noname/resources/crypto.js";
import { encryptResourcePart, resourceKeyConfig } from "../resource-key.mjs";
import { rangeResponse } from "../../apps/core/noname/resources/worker.js";
import { browserResourceStorage, desktopResourceStorage, nativeResourceStorage, reconcileResourceState } from "../../apps/core/noname/resources/storage.js";

const JSZip = createRequire(new URL("../../apps/core/package.json", import.meta.url))("jszip");

async function fixture(t, key = Buffer.alloc(32, 7)) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "noname-resource-test-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	const root = path.join(directory, "dist");
	const resources = path.join(directory, "resources");
	const full = path.join(directory, "full");
	const files = {
		"index.html": "<!doctype html><head></head><body>core</body>",
		"noname.js": "game mechanics",
		"layout/default.css": "core layout",
		"extension/示例/dynamicWorker.js": "worker code",
		"extension/示例/skin.json": '{"skeleton":{}}',
		"image/character/曹操.jpg": "character artwork",
		"audio/skill/test.mp3": "skill audio",
		"extension/示例/skin.skel": "skeleton bytes",
		"extension/示例/skin.atlas": "atlas text",
		"font/game.woff2": "font data",
	};
	for (const [filename, bytes] of Object.entries(files)) {
		await fs.mkdir(path.dirname(path.join(root, filename)), { recursive: true });
		await fs.writeFile(path.join(root, filename), bytes);
	}
	await splitRuntimeResources({ directory: root, resourceDirectory: resources, fullDirectory: full, partBytes: 20, key });
	const manifest = parseResourceManifest(JSON.parse(await fs.readFile(path.join(root, "resource-manifest.json"), "utf8")));
	const decrypt = await createResourceDecryptor(resourceKeyConfig(key), manifest.encryption.keyId);
	return { directory, root, resources, full, files, manifest, key, decrypt };
}

test("light runtime retains mechanics and workers while artwork is recoverable from versioned packs", async t => {
	const { root, full, manifest, files } = await fixture(t);
	for (const filename of manifest.core.filter(filename => !["index.html", "resource-version.json", "resource-key.json"].includes(filename))) assert.equal(await fs.readFile(path.join(root, filename), "utf8"), files[filename]);
	assert.equal(JSON.parse(await fs.readFile(path.join(root, "resource-version.json"), "utf8")).buildId, manifest.buildId);
	for (const pack of manifest.packs)
		for (const file of pack.files) {
			await assert.rejects(fs.access(path.join(root, file.path)));
			assert.equal(await fs.readFile(path.join(full, file.path), "utf8"), files[file.path]);
		}
	assert.match(await fs.readFile(path.join(root, "index.html"), "utf8"), /data-resource-profile="lite"/);
	assert.equal(resourceGroup("extension/示例/dynamicWorker.js"), null);
	assert.equal(resourceGroup("extension/示例/skin.json"), null);
	assert.ok(manifest.packs.some(pack => pack.id === "fonts"));
});

test("downloaded packs survive manager recreation without another network download", async t => {
	const { resources, manifest, files, decrypt } = await fixture(t);
	const stored = new Map(),
		requests = [];
	const storage = {
		async has(file) {
			return stored.has(file.sha256);
		},
		async write(file, bytes) {
			stored.set(file.sha256, bytes);
		},
	};
	let state = { files: {} };
	const fetcher = async url => {
		requests.push(url);
		return new Response(await fs.readFile(path.join(resources, new URL(url).pathname.slice(1))));
	};
	for (let boot = 0; boot < 2; boot++) {
		for (const pack of manifest.packs) await installResourcePack({ pack, storage, state, source: "https://resources.example/", resolveURL: resourceURL, decrypt, unzip: bytes => new JSZip(bytes), fetcher });
		state = JSON.parse(JSON.stringify(state));
	}
	assert.equal(
		requests.length,
		manifest.packs.reduce((sum, pack) => sum + pack.parts.length, 0)
	);
	for (const pack of manifest.packs) for (const file of pack.files) assert.equal(new TextDecoder().decode(stored.get(file.sha256)), files[file.path]);
});

test("corrupt archives and unlisted executable files are rejected before they can be installed", async t => {
	const { resources, manifest, key, decrypt } = await fixture(t);
	const pack = manifest.packs[0];
	const stored = new Map();
	const options = {
		pack,
		storage: {
			async has() {
				return false;
			},
			async write(file, bytes) {
				stored.set(file.path, bytes);
			},
		},
		state: { files: {} },
		source: "https://resources.example/",
		decrypt,
		resolveURL: resourceURL,
		unzip: bytes => new JSZip(bytes),
	};
	await assert.rejects(installResourcePack({ ...options, fetcher: async () => new Response(new Uint8Array(pack.parts[0].bytes)) }), /加密格式/);
	assert.equal(stored.size, 0);
	const data = await fs.readFile(path.join(resources, pack.parts[0].path));
	const zip = new JSZip(await decrypt(data, pack.parts[0]));
	zip.file("extension/evil.js", "unlisted executable");
	const modified = encryptResourcePart(zip.generate({ type: "uint8array" }), key);
	const altered = { ...pack, parts: [{ ...pack.parts[0], bytes: modified.bytes.length, sha256: modified.sha256 }] };
	await assert.rejects(installResourcePack({ ...options, pack: altered, fetcher: async () => new Response(modified.bytes) }), /清单以外/);
	assert.equal(stored.size, 0);
});

test("published resources cannot be unzipped or decrypted with another client key", async t => {
	const { resources, manifest, decrypt } = await fixture(t);
	assert.equal(manifest.schemaVersion, 2);
	assert.equal(JSON.stringify(manifest).includes('"key":'), false);
	await assert.rejects(fs.access(path.join(resources, "resource-key.json")));
	const part = manifest.packs[0].parts[0];
	const bytes = await fs.readFile(path.join(resources, part.path));
	assert.throws(() => new JSZip(bytes));
	const wrongConfig = resourceKeyConfig(Buffer.alloc(32, 8));
	const wrongDecrypt = await createResourceDecryptor(wrongConfig, wrongConfig.keyId);
	await assert.rejects(wrongDecrypt(bytes, part), /解密失败/);
	for (const index of [8, bytes.length - 1]) {
		const damaged = Buffer.from(bytes);
		damaged[index] ^= 1;
		await assert.rejects(decrypt(damaged, part), /解密失败/);
	}
	await assert.rejects(decrypt(bytes, { ...part, sha256: "f".repeat(64) }), /解密失败/);
	const archive = new JSZip(await decrypt(bytes, part));
	assert.ok(archive.file(part.files[0]));
});

test("independent encrypted builds use compatible resource names without reusing nonces", async t => {
	const first = await fixture(t);
	const second = await fixture(t);
	const left = first.manifest.packs[0].parts[0];
	const right = second.manifest.packs[0].parts[0];
	assert.equal(left.path, right.path);
	assert.equal(left.sha256, right.sha256);
	const bytes = await fs.readFile(path.join(first.resources, left.path));
	const other = await fs.readFile(path.join(second.resources, right.path));
	assert.notDeepEqual(bytes.slice(4, 16), other.slice(4, 16));
	assert.deepEqual(await first.decrypt(bytes, left), await second.decrypt(other, right));
	assert.deepEqual(await first.decrypt(other, left), await second.decrypt(bytes, right));
	const rotated = await fixture(t, Buffer.alloc(32, 9));
	assert.notEqual(rotated.manifest.packs[0].parts[0].path, left.path);
});

test("rebuilding a full runtime keeps its core version and encrypted resource catalog stable", async t => {
	const { directory, full, resources, manifest, key } = await fixture(t);
	await splitRuntimeResources({ directory: full, resourceDirectory: resources, fullDirectory: path.join(directory, "full-copy"), profile: "full", partBytes: 20, key });
	const rebuilt = parseResourceManifest(JSON.parse(await fs.readFile(path.join(full, "resource-manifest.json"), "utf8")));
	assert.equal(rebuilt.buildId, manifest.buildId);
	assert.deepEqual(rebuilt.packs, manifest.packs);
	assert.equal(rebuilt.core.filter(filename => filename === "resource-version.json").length, 1);
	assert.equal(rebuilt.core.includes("resource-manifest.json"), false);
});

test("resource paths cannot escape the runtime or overwrite code", async t => {
	const { manifest } = await fixture(t);
	for (const filename of ["../a.png", "/a.png", "extension/../a.png", "a\\b.png"]) assert.throws(() => resourceURL("https://resources.example/", filename), /路径/);
	assert.equal(resourceURL("https://resources.example/base/", "image/曹操.jpg"), "https://resources.example/base/image/%E6%9B%B9%E6%93%8D.jpg");
	const invalid = structuredClone(manifest);
	invalid.packs[0].files[0].path = "noname.js";
	assert.throws(() => parseResourceManifest(invalid), /资源文件/);
	const index = createResourceIndex(manifest, () => false);
	assert.equal(index.stat("noname.js").type, "file");
	assert.equal(index.stat("image/character/曹操.jpg"), null);
	assert.deepEqual(index.list("image/character"), []);
});

test("cached audio supports browser range requests", async () => {
	const bytes = new TextEncoder().encode("0123456789");
	const response = await rangeResponse(new Response(bytes, { headers: { "Content-Type": "audio/mpeg" } }), "bytes=3-5");
	assert.equal(response.status, 206);
	assert.equal(await response.text(), "345");
	assert.equal(response.headers.get("Content-Range"), "bytes 3-5/10");
	assert.equal((await rangeResponse(new Response(bytes), "bytes=15-")).status, 416);
});

test("native resource writes preserve root paths and detect incomplete or corrupted files", async () => {
	const data = new TextEncoder().encode("verified image");
	const file = { path: "logo.png", bytes: data.length, sha256: await sha256(data) };
	const files = new Map();
	let writeDirectory;
	const storage = nativeResourceStorage({
		checkFile(name, success) {
			success(files.has(name) ? 1 : -1);
		},
		readFile(name, success, failure) {
			files.has(name) ? success(files.get(name)) : failure(new Error("missing"));
		},
		writeFile(bytes, directory, name, done) {
			writeDirectory = directory;
			files.set(directory ? `${directory}/${name}` : name, bytes);
			done();
		},
	});
	await storage.write(file, data);
	assert.equal(writeDirectory, "");
	assert.equal(await storage.has(file), true);
	files.set(file.path, new Uint8Array(data.length).buffer);
	assert.equal(await storage.has(file), false);
	const state = { files: { [file.path]: file.sha256 } };
	files.delete(file.path);
	assert.equal(await reconcileResourceState({ packs: [{ files: [file] }] }, state, storage), true);
	assert.equal(state.files[file.path], undefined);
	const truncated = nativeResourceStorage({
		readFile(name, success) {
			success(data.slice(1).buffer);
		},
		writeFile(bytes, directory, name, done) {
			done();
		},
	});
	await assert.rejects(truncated.write(file, data), /保存校验失败/);
});

test("desktop updates replace existing resource files and detect same-size corruption", async t => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "noname-desktop-resource-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	const originalWindow = globalThis.window;
	globalThis.window = { require: createRequire(import.meta.url) };
	t.after(() => {
		globalThis.window = originalWindow;
	});
	const bytes = new TextEncoder().encode("version one");
	const file = { path: "image/test.png", bytes: bytes.length, sha256: await sha256(bytes) };
	const storage = desktopResourceStorage(directory);
	await storage.write(file, bytes);
	await fs.writeFile(path.join(directory, file.path), new Uint8Array(bytes.length));
	assert.equal(await storage.has(file), false);
	await storage.write(file, bytes);
	assert.equal(await storage.has(file), true);
	const state = { files: { [file.path]: file.sha256 } };
	const manifest = { packs: [{ files: [file] }] };
	assert.equal(await reconcileResourceState(manifest, state, storage), false);
	await fs.unlink(path.join(directory, file.path));
	assert.equal(await reconcileResourceState(manifest, state, storage), true);
	assert.equal(state.files[file.path], undefined);
});

test("browser storage notices cache eviction during the same session", async t => {
	const entries = new Map();
	const cache = {
		async keys() {
			return [...entries.keys()].map(url => ({ url }));
		},
		async match(key) {
			return entries.get(key)?.clone();
		},
		async put(key, response) {
			entries.set(key, response);
		},
	};
	const originalCaches = globalThis.caches;
	globalThis.caches = {
		async open() {
			return cache;
		},
	};
	t.after(() => {
		globalThis.caches = originalCaches;
	});
	const bytes = new TextEncoder().encode("image");
	const file = { path: "test.png", bytes: bytes.length, sha256: await sha256(bytes) };
	const storage = await browserResourceStorage("https://game.example/");
	await storage.write(file, bytes);
	assert.equal(await storage.has(file), true);
	entries.clear();
	assert.equal(await storage.has(file), false);
	assert.equal(storage.hasCached(file), false);
});
