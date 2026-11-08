import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { splitRuntimeResources } from "../resource-packs.mjs";
import { configureOssResourceCORS, ossResourceTarget, publishResourcesToOSS } from "../oss-resources.mjs";
import { configureWebRuntime } from "../web-runtime.mjs";
import { encryptResourcePart, resourceKeyConfig } from "../resource-key.mjs";
import { createResourceDecryptor } from "../../apps/core/noname/resources/crypto.js";
import { forkVersion } from "../../apps/core/noname/util/distribution.js";

async function fixture(t) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "noname-oss-test-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	const root = path.join(directory, "dist"),
		resources = path.join(directory, "resources"),
		full = path.join(directory, "full");
	const key = Buffer.alloc(32, 11),
		keyConfig = resourceKeyConfig(key);
	const target = ossResourceTarget({ bucket: "example-assets", region: "oss-cn-shanghai", prefix: `noname/v${forkVersion}` });
	const files = { "index.html": '<!doctype html><html><script type="module">core()</script></html>', "noname.js": "core", "game/config.json": JSON.stringify({ extensions: [], mode: "identity", mode_config: {} }), "image/card/example.webp": "card artwork", "audio/skill/example.mp3": "skill audio" };
	for (const [filename, bytes] of Object.entries(files)) {
		await fs.mkdir(path.dirname(path.join(root, filename)), { recursive: true });
		await fs.writeFile(path.join(root, filename), bytes);
	}
	await splitRuntimeResources({ directory: root, resourceDirectory: resources, fullDirectory: full, key, baseURL: target.baseURL, partBytes: 10 });
	const manifest = JSON.parse(await fs.readFile(path.join(resources, "resource-manifest.json"), "utf8"));
	return { directory, root, resources, full, key, keyConfig, target, manifest };
}

function remote() {
	const objects = new Map(),
		writes = [];
	const client = {
		async head(name) {
			if (!objects.has(name)) throw Object.assign(new Error("missing"), { code: "NoSuchKey" });
			return { res: { headers: { "content-length": String(objects.get(name).length) } } };
		},
		async put(name, bytes, options) {
			assert.equal(options.headers["x-oss-forbid-overwrite"], "true");
			assert.equal(options.headers["x-oss-object-acl"], "public-read");
			if (objects.has(name)) throw Object.assign(new Error("exists"), { code: "FileAlreadyExists" });
			writes.push(name);
			objects.set(name, Buffer.from(bytes));
		},
	};
	const fetcher = async (url, options) => {
		assert.equal(options.credentials, "omit");
		assert.equal(options.redirect, "error");
		const bytes = objects.get(decodeURIComponent(new URL(url).pathname.slice(1)));
		return new Response(bytes, { status: bytes ? 200 : 404, headers: { "Access-Control-Allow-Origin": "*" } });
	};
	return { objects, writes, client, fetcher };
}

function options(data, server) {
	return { ...server, target: data.target, directory: data.resources, keyConfig: data.keyConfig, concurrency: 1, receipt: path.join(data.directory, "receipt.json"), verifyOrigin: "https://game.example.com" };
}

test("OSS publication verifies encrypted objects before exposing the catalog and can run twice", async t => {
	const data = await fixture(t),
		server = remote();
	const result = await publishResourcesToOSS(options(data, server));
	assert.equal(result.phase, "complete");
	assert.equal(server.writes.at(-1), data.target.prefix + "resource-manifest.json");
	assert.equal(server.writes.length, result.assets.length + 1);
	assert(server.writes.every(name => name.endsWith(".nrp") || name.endsWith("/resource-manifest.json")));
	assert(!JSON.stringify(result).includes(data.keyConfig.key));
	const count = server.writes.length;
	await publishResourcesToOSS(options(data, server));
	assert.equal(server.writes.length, count);
});

test("OSS reuses authenticated remote ciphertext from a different random IV", async t => {
	const data = await fixture(t),
		server = remote();
	await publishResourcesToOSS(options(data, server));
	const part = data.manifest.packs[0].parts[0];
	const decrypt = await createResourceDecryptor(data.keyConfig, data.keyConfig.keyId);
	const original = await fs.readFile(path.join(data.resources, part.path));
	const changed = encryptResourcePart(await decrypt(original, part), data.key).bytes;
	assert.notDeepEqual(changed, original);
	await fs.writeFile(path.join(data.resources, part.path), changed);
	const count = server.writes.length;
	await publishResourcesToOSS(options(data, server));
	assert.equal(server.writes.length, count);
	assert.deepEqual(server.objects.get(data.target.prefix + part.path), original);
});

test("corrupted remote resources and mismatched catalogs are not replaced", async t => {
	const data = await fixture(t),
		server = remote();
	const part = data.manifest.packs[0].parts[0];
	const corrupted = await fs.readFile(path.join(data.resources, part.path));
	corrupted[20] ^= 1;
	server.objects.set(data.target.prefix + part.path, corrupted);
	await assert.rejects(publishResourcesToOSS(options(data, server)));
	assert(!server.objects.has(data.target.prefix + "resource-manifest.json"));
	server.objects.clear();
	await publishResourcesToOSS(options(data, server));
	const catalogKey = data.target.prefix + "resource-manifest.json";
	const catalog = Buffer.from(server.objects.get(catalogKey));
	catalog[0] ^= 1;
	server.objects.set(catalogKey, catalog);
	await assert.rejects(publishResourcesToOSS(options(data, server)), /catalog does not match/);
	assert.deepEqual(server.objects.get(catalogKey), catalog);
});

test("publication resumes after an interrupted object upload without duplicating completed objects", async t => {
	const data = await fixture(t),
		server = remote();
	const put = server.client.put;
	let calls = 0;
	server.client.put = async (...args) => {
		if (++calls === 2) throw new Error("connection lost");
		return put(...args);
	};
	await assert.rejects(publishResourcesToOSS(options(data, server)), /connection lost/);
	assert.equal(server.writes.length, 1);
	assert(!server.objects.has(data.target.prefix + "resource-manifest.json"));
	server.client.put = put;
	await publishResourcesToOSS(options(data, server));
	assert.equal(new Set(server.writes).size, server.writes.length);
});

test("a successful GET without the required CORS response cannot complete publication", async t => {
	const data = await fixture(t),
		server = remote();
	const fetcher = async (...args) => {
		const response = await server.fetcher(...args);
		response.headers.delete("Access-Control-Allow-Origin");
		return response;
	};
	await assert.rejects(publishResourcesToOSS({ ...options(data, server), fetcher }), /verification Origin/);
	assert(!server.objects.has(data.target.prefix + "resource-manifest.json"));
});

test("CORS setup preserves existing rules and is repeatable", async t => {
	const data = await fixture(t);
	const original = { allowedOrigin: "https://existing.example.com", allowedMethod: "PUT", allowedHeader: "*" };
	let rules = [original],
		writes = 0;
	const client = {
		async getBucketCORS() {
			return { rules };
		},
		async putBucketCORS(bucket, updated) {
			assert.equal(bucket, data.target.bucket);
			rules = updated;
			writes++;
		},
	};
	await configureOssResourceCORS({ client, target: data.target, backupDirectory: data.directory });
	await configureOssResourceCORS({ client, target: data.target, backupDirectory: data.directory });
	assert.equal(writes, 1);
	assert.deepEqual(rules[0], original);
	assert.deepEqual(JSON.parse(await fs.readFile(path.join(data.directory, `oss-cors-${data.target.bucket}-before.json`), "utf8")).rules, [original]);
});

test("the resource root selects the current version while an explicit base URL takes precedence", async t => {
	const data = await fixture(t);
	await fs.cp(data.full, data.root, { recursive: true });
	const build = { directory: data.root, resourceDirectory: data.resources, fullDirectory: data.full, key: data.key, rootURL: "https://resources.example.com/noname" };
	await splitRuntimeResources(build);
	assert.equal(JSON.parse(await fs.readFile(path.join(data.resources, "resource-manifest.json"), "utf8")).baseURL, `https://resources.example.com/noname/v${forkVersion}/`);
	await fs.cp(data.full, data.root, { recursive: true });
	await splitRuntimeResources({ ...build, baseURL: "https://override.example.com/release/" });
	assert.equal(JSON.parse(await fs.readFile(path.join(data.resources, "resource-manifest.json"), "utf8")).baseURL, "https://override.example.com/release/");
});

test("packaged web startup files participate in the core cache version without changing artwork", async t => {
	const data = await fixture(t);
	await configureWebRuntime(data.root);
	const manifest = JSON.parse(await fs.readFile(path.join(data.root, "resource-manifest.json"), "utf8"));
	const version = JSON.parse(await fs.readFile(path.join(data.root, "resource-version.json"), "utf8"));
	assert(manifest.core.includes("deployment.js"));
	assert.notEqual(manifest.buildId, data.manifest.buildId);
	assert.equal(version.buildId, manifest.buildId);
	assert.deepEqual(manifest.packs, data.manifest.packs);
	assert.match(await fs.readFile(path.join(data.root, "index.html"), "utf8"), /src="\/deployment.js"/);
	assert.equal(JSON.parse(await fs.readFile(path.join(data.root, "game/config.json"), "utf8")).mode, "connect");
});
