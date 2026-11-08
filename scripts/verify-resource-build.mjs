import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { parseResourceManifest } from "../apps/core/noname/resources/manifest.js";
import { createResourceDecryptor } from "../apps/core/noname/resources/crypto.js";

const root = path.resolve(import.meta.dirname, "..");
const JSZip = createRequire(new URL("../apps/core/package.json", import.meta.url))("jszip");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const runtime = path.join(root, "dist");
const resources = path.join(root, "output/resource-packs");
const full = path.join(root, "output/runtime-full");
const manifest = parseResourceManifest(JSON.parse(await fs.readFile(path.join(runtime, "resource-manifest.json"), "utf8")));
const decrypt = await createResourceDecryptor(JSON.parse(await fs.readFile(path.join(runtime, "resource-key.json"), "utf8")), manifest.encryption.keyId);
await assert.rejects(fs.access(path.join(resources, "resource-key.json")));
assert.equal(manifest.profile, "lite");
assert.match(await fs.readFile(path.join(runtime, "index.html"), "utf8"), /data-resource-profile="lite"/);
for (const name of ["天庭", "奇妙工具"]) {
	for (const directory of [runtime, full]) await assert.rejects(fs.access(path.join(directory, "extension", name)));
}
await assert.rejects(fs.access(path.join(runtime, "docs/web-deployment.md")));
let coreBytes = 0,
	fullBytes = 0,
	mediaBytes = 0,
	downloadBytes = 0,
	partCount = 0,
	fileCount = 0;
for (const filename of [...manifest.core, "resource-manifest.json"]) {
	coreBytes += (await fs.stat(path.join(runtime, filename))).size;
	fullBytes += (await fs.stat(path.join(full, filename))).size;
}
for (const pack of manifest.packs) {
	const files = new Map(pack.files.map(file => [file.path, file]));
	for (const part of pack.parts) {
		const bytes = await fs.readFile(path.join(resources, part.path));
		assert.equal(bytes.length, part.bytes);
		assert.throws(() => new JSZip(bytes));
		const plaintext = await decrypt(bytes, part);
		const zip = new JSZip(plaintext);
		assert.deepEqual(
			Object.values(zip.files)
				.filter(file => !file.dir)
				.map(file => file.name)
				.sort(),
			[...part.files].sort()
		);
		for (const filename of part.files) {
			const file = files.get(filename);
			const data = zip.file(filename).asUint8Array();
			assert.equal(data.length, file.bytes);
			assert.equal(digest(data), file.sha256);
			await assert.rejects(fs.access(path.join(runtime, filename)));
			assert.equal(digest(await fs.readFile(path.join(full, filename))), file.sha256);
			mediaBytes += file.bytes;
			fullBytes += file.bytes;
			fileCount++;
		}
		downloadBytes += bytes.length;
		partCount++;
	}
}
const report = { verified: true, buildId: manifest.buildId, coreBytes, fullBytes, mediaBytes, downloadBytes, mediaFiles: fileCount, parts: partCount, packs: manifest.packs.length };
await fs.writeFile(path.join(root, "output/resource-verification.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
