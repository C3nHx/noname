import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseResourceManifest, resourceURL, validResourcePath } from "../apps/core/noname/resources/manifest.js";
import { createResourceDecryptor } from "../apps/core/noname/resources/crypto.js";
import { downloadResourcePart } from "../apps/core/noname/resources/download.js";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const list = value => (Array.isArray(value) ? value : value ? [value] : []);
export class ResourcePublicationError extends Error {}

export function ossResourceTarget({ bucket, region, prefix, publicBaseURL }) {
	if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket ?? "")) throw new ResourcePublicationError("Provide a valid OSS bucket name");
	if (!/^oss-[a-z0-9-]+$/.test(region ?? "")) throw new ResourcePublicationError("Provide an OSS region such as oss-cn-shanghai");
	const directory = (prefix ?? "").replace(/\/$/, "");
	if (!validResourcePath(directory)) throw new ResourcePublicationError("Provide a nonempty relative OSS prefix");
	const origin = `https://${bucket}.${region}.aliyuncs.com/`;
	const baseURL = publicBaseURL ?? resourceURL(origin, directory) + "/";
	const url = new URL(baseURL);
	if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !baseURL.endsWith("/")) throw new ResourcePublicationError("The public OSS resource URL must be an HTTPS directory without credentials or parameters");
	return { bucket, region, prefix: directory + "/", baseURL };
}

export async function configureOssResourceCORS({ client, target, backupDirectory = ".audit" }) {
	let rules;
	try {
		rules = (await client.getBucketCORS(target.bucket)).rules;
	} catch (error) {
		if (error.code !== "NoSuchCORSConfiguration") throw error;
		rules = [];
	}
	if (rules.some(rule => list(rule.allowedOrigin).includes("*") && ["GET", "HEAD"].every(method => list(rule.allowedMethod).includes(method)))) return false;
	await fs.mkdir(backupDirectory, { recursive: true });
	await fs.writeFile(path.join(backupDirectory, `oss-cors-${target.bucket}-before.json`), JSON.stringify({ bucket: target.bucket, region: target.region, rules }, null, 2) + "\n", { flag: "wx" }).catch(error => {
		if (error.code !== "EEXIST") throw error;
	});
	await client.putBucketCORS(target.bucket, [...rules, { allowedOrigin: "*", allowedMethod: ["GET", "HEAD"], exposeHeader: ["Content-Length", "Content-Range", "ETag"], maxAgeSeconds: 3600 }]);
	return true;
}

export async function publishResourcesToOSS({ client, target, directory = "output/resource-packs", keyConfig, concurrency = 3, receipt = ".audit/oss-resource-publication.json", verifyOrigin, reusePrefix, partsOnly = false, fetcher = fetch, onProgress = () => {} }) {
	if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new ResourcePublicationError("Concurrency must be between 1 and 8");
	if (verifyOrigin && new URL(verifyOrigin).origin !== verifyOrigin) throw new ResourcePublicationError("Provide a complete verification Origin without a path");
	const sourcePrefix = reusePrefix?.replace(/\/$/, "");
	if (sourcePrefix !== undefined && !validResourcePath(sourcePrefix)) throw new ResourcePublicationError("The reusable OSS prefix must be a nonempty relative directory");
	const catalog = await fs.readFile(path.join(directory, "resource-manifest.json"));
	const manifest = parseResourceManifest(JSON.parse(catalog));
	if ((manifest.deliveryURL || manifest.baseURL) !== target.baseURL) throw new ResourcePublicationError("Build the client with this OSS resource directory before publishing");
	const decrypt = await createResourceDecryptor(keyConfig, manifest.encryption.keyId);
	if (catalog.includes(keyConfig.key)) throw new ResourcePublicationError("The public catalog must not contain the client key");
	const request = async (url, options) => {
		const response = await fetcher(url, { ...options, signal: options.signal ?? AbortSignal.timeout(600000), redirect: "error", ...(verifyOrigin ? { headers: { Origin: verifyOrigin } } : {}) });
		if (verifyOrigin && !["*", verifyOrigin].includes(response.headers.get("Access-Control-Allow-Origin"))) {
			await response.body?.cancel();
			throw new ResourcePublicationError("OSS did not permit the verification Origin");
		}
		return response;
	};
	let expectedCatalog = catalog;
	if (partsOnly) {
		const response = await request(resourceURL(target.baseURL, "resource-manifest.json"), { credentials: "omit", cache: "no-store" });
		if (!response.ok) throw new ResourcePublicationError("Parts-only publication requires an existing public catalog");
		expectedCatalog = new Uint8Array(await response.arrayBuffer());
		const published = parseResourceManifest(JSON.parse(new TextDecoder().decode(expectedCatalog)));
		const files = new Map(published.packs.flatMap(pack => pack.files.map(file => [file.path, file])));
		const clientFiles = manifest.packs.flatMap(pack => pack.files);
		if (published.version !== manifest.version || published.encryption.keyId !== manifest.encryption.keyId || files.size !== clientFiles.length || clientFiles.some(file => files.get(file.path)?.sha256 !== file.sha256 || files.get(file.path)?.bytes !== file.bytes)) throw new ResourcePublicationError("Parts-only publication must use the same files, version and key as the public catalog");
	}
	async function putIfAbsent(filename, bytes, mime) {
		const object = target.prefix + filename;
		try {
			const head = await client.head(object);
			if (Number(head.res.headers["content-length"]) !== bytes.length) throw new ResourcePublicationError(`An existing OSS object has a different size: ${filename}`);
			return "existing";
		} catch (error) {
			if (error.code !== "NoSuchKey") throw error;
		}
		const headers = { "x-oss-object-acl": "public-read", "x-oss-forbid-overwrite": "true", "Cache-Control": filename.endsWith(".nrp") ? "public, max-age=31536000, immutable" : "public, max-age=300" };
		if (sourcePrefix && filename.endsWith(".nrp")) {
			try {
				const source = sourcePrefix + "/" + filename;
				const head = await client.head(source);
				if (Number(head.res.headers["content-length"]) !== bytes.length) throw new ResourcePublicationError(`A reusable OSS object has a different size: ${filename}`);
				await client.copy(object, source, target.bucket, { headers: { ...headers } });
				return "copy";
			} catch (error) {
				if (error.code === "FileAlreadyExists") return "existing";
				if (error.code !== "NoSuchKey") throw error;
			}
		}
		try {
			await client.put(object, bytes, { mime, headers: { ...headers } });
			return "upload";
		} catch (error) {
			if (error.code !== "FileAlreadyExists") throw error;
			return "existing";
		}
	}
	const parts = [...new Map(manifest.packs.flatMap(pack => pack.parts.map(part => [part.path, part]))).values()];
	const published = [];
	let next = 0;
	let failure;
	await Promise.all(
		Array.from({ length: Math.min(concurrency, parts.length) }, async () => {
			while (!failure && next < parts.length) {
				const part = parts[next++];
				try {
					const local = await fs.readFile(path.join(directory, part.path));
					if (local.length !== part.bytes) throw new ResourcePublicationError(`A local resource has an incorrect size: ${part.path}`);
					await decrypt(local, part);
					const transfer = await putIfAbsent(part.path, local, "application/octet-stream");
					const bytes = await downloadResourcePart(resourceURL(target.baseURL, part.path), part, { fetcher: request });
					await decrypt(bytes, part);
					published.push({ path: part.path, bytes: bytes.length, ciphertextSha256: digest(bytes), plaintextSha256: part.sha256, transfer });
					onProgress({ verified: published.length, total: parts.length, path: part.path });
				} catch (error) {
					failure ??= error;
				}
			}
		})
	);
	if (failure) throw failure;
	if (!partsOnly) await putIfAbsent("resource-manifest.json", catalog, "application/json");
	const publicCatalog = await request(resourceURL(target.baseURL, "resource-manifest.json"), { credentials: "omit", cache: "no-store" });
	if (!publicCatalog.ok || digest(new Uint8Array(await publicCatalog.arrayBuffer())) !== digest(expectedCatalog)) throw new ResourcePublicationError("The public OSS catalog does not match this build; use a new version instead of replacing it");
	const result = { phase: partsOnly ? "parts" : "complete", provider: "oss", ...target, algorithm: manifest.encryption.algorithm, keyId: manifest.encryption.keyId, version: manifest.version, buildId: manifest.buildId, assets: published.sort((left, right) => left.path.localeCompare(right.path)), ...(verifyOrigin ? { verifyOrigin } : {}), ...(sourcePrefix ? { reusePrefix: sourcePrefix + "/" } : {}), ...(partsOnly ? { catalogSha256: digest(expectedCatalog), clientCatalogSha256: digest(catalog) } : {}), verifiedAt: new Date().toISOString() };
	await fs.mkdir(path.dirname(path.resolve(receipt)), { recursive: true });
	await fs.writeFile(receipt, JSON.stringify(result, null, 2) + "\n");
	return result;
}
