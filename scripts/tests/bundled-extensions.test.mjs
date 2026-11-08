import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { bundledExtensions, supportsExtension, hasBundledResources } from "../../apps/core/noname/util/bundled-extensions.js";
import { stageBundledExtensions } from "../bundle-extensions.mjs";

async function fixture(t) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "noname-bundles-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	const vendorRoot = path.join(directory, "vendor");
	const coreRoot = path.join(directory, "core");
	const destination = path.join(directory, "dist");
	const contents = { "extension/sample/extension.js": "author extension", "image/new.png": "author supplement", "image/existing.png": "old author art" };
	const files = [];
	for (const [name, data] of Object.entries(contents)) {
		const full = path.join(vendorRoot, "runtime", name);
		await fs.mkdir(path.dirname(full), { recursive: true });
		await fs.writeFile(full, data);
		files.push({ path: name, bytes: Buffer.byteLength(data), sha256: createHash("sha256").update(data).digest("hex") });
	}
	await fs.writeFile(path.join(vendorRoot, "manifest.json"), JSON.stringify({ files }));
	await fs.mkdir(path.join(coreRoot, "image"), { recursive: true });
	await fs.mkdir(path.join(destination, "image"), { recursive: true });
	await fs.writeFile(path.join(coreRoot, "image/existing.png"), "new upstream art");
	await fs.writeFile(path.join(destination, "image/existing.png"), "new upstream art");
	return { vendorRoot, coreRoot, destination };
}

test("bundled extension overlays repeat safely and preserve newer upstream media", async t => {
	const options = await fixture(t);
	await stageBundledExtensions(options.destination, options);
	await stageBundledExtensions(options.destination, options);
	assert.equal(await fs.readFile(path.join(options.destination, "extension/sample/extension.js"), "utf8"), "author extension");
	assert.equal(await fs.readFile(path.join(options.destination, "image/new.png"), "utf8"), "author supplement");
	assert.equal(await fs.readFile(path.join(options.destination, "image/existing.png"), "utf8"), "new upstream art");
});

test("a changed vendor resource fails its recorded checksum", async t => {
	const options = await fixture(t);
	await fs.writeFile(path.join(options.vendorRoot, "runtime/extension/sample/extension.js"), "corrupted");
	await assert.rejects(stageBundledExtensions(options.destination, options), /checksum mismatch/);
});

test("bundled extensions are available on desktop and native extensions are skipped elsewhere", async () => {
	const config = JSON.parse(await fs.readFile(new URL("../../apps/core/game/config.json", import.meta.url), "utf8"));
	assert.equal(bundledExtensions.length, 9);
	for (const name of ["天庭", "奇妙工具"]) {
		assert.equal(supportsExtension(name, true), false);
		assert.equal(supportsExtension(name, false), false);
		assert.equal(Object.keys(config).some(key => key.startsWith(`extension_${name}_`)), false);
		await assert.rejects(fs.access(new URL(`../../vendor/ziqi/runtime/extension/${name}/`, import.meta.url)));
		await assert.rejects(fs.access(new URL(`../../apps/core/extension/${name}/`, import.meta.url)));
	}
	assert.deepEqual(
		config.extensions,
		bundledExtensions.map(extension => extension.name)
	);
	assert.ok(config.extensions.every(name => typeof config[`extension_${name}_enable`] === "boolean" && supportsExtension(name, true)));
	assert.deepEqual(
		bundledExtensions.filter(extension => !supportsExtension(extension.name, false)).map(extension => extension.name),
		["应用配置", "拖拽读取"]
	);
	assert.equal(supportsExtension("user-installed-extension", false), true);
});

test("a downloaded skin switch cannot load before its required extension is ready", () => {
	assert.equal(hasBundledResources("皮肤切换", name => name === "皮肤切换"), false);
	assert.equal(hasBundledResources("皮肤切换", name => ["皮肤切换", "千幻聆音"].includes(name)), true);
	assert.equal(hasBundledResources("十周年UI", name => name === "十周年UI"), true);
	assert.equal(hasBundledResources("user-installed-extension", () => false), true);
});
