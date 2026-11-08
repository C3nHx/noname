import fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { parseResourceManifest, resourceURL } from "../apps/core/noname/resources/manifest.js";
import { createResourceDecryptor } from "../apps/core/noname/resources/crypto.js";
import { downloadResourcePart } from "../apps/core/noname/resources/download.js";

const { values } = parseArgs({ options: { repo: { type: "string" }, tag: { type: "string" }, directory: { type: "string", default: "output/resource-packs" }, "key-config": { type: "string", default: "dist/resource-key.json" }, concurrency: { type: "string", default: "3" }, receipt: { type: "string", default: ".audit/cnb-resource-publication.json" }, "parts-only": { type: "boolean" }, "catalog-only": { type: "boolean" } } });
if (values["parts-only"] && values["catalog-only"]) throw new Error("Choose one publication phase");
if (!values.repo || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(values.repo)) throw new Error("Provide --repo organization/repository");
const directory = path.resolve(values.directory);
const manifest = parseResourceManifest(JSON.parse(await fs.readFile(path.join(directory, "resource-manifest.json"), "utf8")));
const tag = values.tag || `v${manifest.version}`;
if (!/^[A-Za-z0-9_.-]+$/.test(tag)) throw new Error("Invalid release tag");
const baseURL = `https://cnb.cool/${values.repo}/-/releases/download/${tag}/`;
if (manifest.baseURL !== baseURL) throw new Error("Build the client with NONAME_RESOURCE_BASE_URL set to this CNB release first");
const keyConfig = JSON.parse(await fs.readFile(values["key-config"], "utf8"));
const decrypt = await createResourceDecryptor(keyConfig, manifest.encryption.keyId);
if (JSON.stringify(manifest).includes(keyConfig.key)) throw new Error("The public catalog must not contain the client key");
const concurrency = Number(values.concurrency);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("Concurrency must be between 1 and 8");
const cliJS = process.env.CNB_CLI_JS || (process.platform === "win32" ? path.join(process.env.APPDATA, "npm/node_modules/@cnbcool/cnb-cli/bin/cnb.js") : undefined);
const run = promisify(execFile);
async function cnb(module, command, args = [], allowed = []) {
	const cliArgs = [module, command, "--repo", values.repo, "--verbose", ...args];
	let exitCode = 0;
	const result = await (cliJS && existsSync(cliJS) ? run(process.execPath, [cliJS, ...cliArgs], { maxBuffer: 8 * 1024 * 1024 }) : run("cnb", cliArgs, { maxBuffer: 8 * 1024 * 1024 })).catch(error => {
		exitCode = error.code ?? 1;
		if (typeof error.stdout === "string" && error.stdout.trim()) return { stdout: error.stdout };
		throw new Error(`CNB CLI ${command} failed`);
	});
	let response;
	try {
		response = JSON.parse(result.stdout);
	} catch {
		throw new Error(`CNB CLI ${command} returned an invalid response`);
	}
	if (exitCode && response.status < 400) throw new Error(`CNB CLI ${command} exited with an error`);
	if (!Number.isInteger(response.status) || response.status < 200 || (response.status >= 400 && !allowed.includes(response.status))) throw new Error(`CNB ${command} returned HTTP ${response.status}, code ${response.data?.errcode ?? "unknown"}`);
	return response;
}

let release = await cnb("releases", "get-release-by-tag", ["--tag", tag], [404]);
if (release.status === 404) release = await cnb("releases", "post-release", ["--tag-name", tag, "--target-commitish", "main", "--name", `Encrypted resources ${manifest.version}`, "--body", "AES-256-GCM encrypted optional resource volumes for the lightweight client. Client key material is distributed separately with the client. Attachments are retained permanently without replacement."]);
const releaseId = String(release.data.id);
const existing = new Map((release.data.assets ?? []).map(asset => [asset.name, asset]));
let published = [];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

async function upload(filename, bytes) {
	if (existing.has(filename)) {
		if (existing.get(filename).size !== bytes) throw new Error(`Existing CNB attachment has a different size: ${filename}`);
		return;
	}
	const response = await cnb("releases", "post-release-asset-upload-url", ["--release-id", releaseId, "--asset-name", filename, "--size", String(bytes), "--ttl", "0"]);
	const uploaded = await fetch(response.data.upload_url, { method: "PUT", headers: { "Content-Length": String(bytes), "Content-Type": "application/octet-stream" }, body: createReadStream(path.join(directory, filename)), duplex: "half", redirect: "error", signal: AbortSignal.timeout(600000) });
	await uploaded.body?.cancel();
	if (!uploaded.ok) throw new Error(`Upload returned HTTP ${uploaded.status}: ${filename}`);
	const segments = new URL(response.data.verify_url, "https://api.cnb.cool").pathname.split("/");
	const start = segments.indexOf("asset-upload-confirmation");
	if (start < 0 || !segments[start + 1] || !segments[start + 2]) throw new Error("CNB returned an invalid upload confirmation path");
	await cnb("releases", "post-release-asset-upload-confirmation", ["--release-id", releaseId, "--upload-token", decodeURIComponent(segments[start + 1]), "--asset-path", decodeURIComponent(segments.slice(start + 2).join("/")), "--ttl", "0"]);
}

const parts = [...new Map(manifest.packs.flatMap(pack => pack.parts.map(part => [part.path, part]))).values()].sort((left, right) => Number(right.files.some(file => file.startsWith("image/card/"))) - Number(left.files.some(file => file.startsWith("image/card/"))));
let next = 0;
if (values["catalog-only"]) {
	const previous = JSON.parse(await fs.readFile(values.receipt, "utf8"));
	if (previous.baseURL !== baseURL || previous.keyId !== manifest.encryption.keyId || previous.assets.length !== parts.length) throw new Error("The resource upload receipt does not match this catalog");
	for (const part of parts) {
		if (!previous.assets.some(asset => asset.path === part.path && asset.bytes === part.bytes && asset.plaintextSha256 === part.sha256) || !existing.has(part.path)) throw new Error(`Unverified CNB resource: ${part.path}`);
	}
	published = previous.assets;
} else
	await Promise.all(
		Array.from({ length: Math.min(concurrency, parts.length) }, async () => {
			while (next < parts.length) {
				const part = parts[next++];
				const local = await fs.readFile(path.join(directory, part.path));
				if (local.length !== part.bytes) throw new Error(`Local resource has an incorrect size: ${part.path}`);
				await decrypt(local, part);
				await upload(part.path, part.bytes);
				const bytes = await downloadResourcePart(resourceURL(baseURL, part.path), part);
				await decrypt(bytes, part);
				published.push({ path: part.path, bytes: bytes.length, ciphertextSha256: digest(bytes), plaintextSha256: part.sha256 });
				console.log(JSON.stringify({ verified: published.length, total: parts.length, path: part.path }));
			}
		})
	);
if (!values["parts-only"]) {
	const catalog = await fs.readFile(path.join(directory, "resource-manifest.json"));
	await upload("resource-manifest.json", catalog.length);
	const publicCatalog = await fetch(resourceURL(baseURL, "resource-manifest.json"), { credentials: "omit", cache: "no-store" });
	if (!publicCatalog.ok || digest(new Uint8Array(await publicCatalog.arrayBuffer())) !== digest(catalog)) throw new Error("The public CNB catalog does not match this build");
}
const receipt = { phase: values["parts-only"] ? "parts" : "complete", repository: values.repo, tag, releaseId, baseURL, algorithm: manifest.encryption.algorithm, keyId: manifest.encryption.keyId, buildId: manifest.buildId, assets: published.sort((left, right) => left.path.localeCompare(right.path)), verifiedAt: new Date().toISOString() };
await fs.mkdir(path.dirname(path.resolve(values.receipt)), { recursive: true });
await fs.writeFile(values.receipt, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ verified: true, phase: receipt.phase, repository: values.repo, tag, assets: published.length + (values["parts-only"] ? 0 : 1), receipt: values.receipt }));
