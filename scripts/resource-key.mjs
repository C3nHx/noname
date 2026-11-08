import fs from "node:fs/promises";
import path from "node:path";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { RESOURCE_MAGIC, resourceAAD } from "../apps/core/noname/resources/crypto.js";

export function resourceKeyConfig(key) {
	if (!(key instanceof Uint8Array) || key.length !== 32) throw new Error("Resource encryption requires a 32-byte key");
	return { schemaVersion: 1, keyId: createHash("sha256").update(key).digest("hex").slice(0, 32), key: Buffer.from(key).toString("base64") };
}

export function encryptResourcePart(plaintext, key) {
	const { keyId } = resourceKeyConfig(key);
	const sha256 = createHash("sha256").update(plaintext).digest("hex");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	cipher.setAAD(resourceAAD(keyId, sha256));
	const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	return { bytes: Buffer.concat([Buffer.from(RESOURCE_MAGIC), iv, encrypted, cipher.getAuthTag()]), sha256 };
}

export async function loadBuildResourceKey(root) {
	if (process.env.NONAME_RESOURCE_KEY) {
		if (!/^[A-Za-z0-9+/]{43}=$/.test(process.env.NONAME_RESOURCE_KEY)) throw new Error("NONAME_RESOURCE_KEY must be a base64 encoded 32-byte key");
		const key = Buffer.from(process.env.NONAME_RESOURCE_KEY, "base64");
		resourceKeyConfig(key);
		return key;
	}
	if (process.env.CI && process.env.NONAME_BUILD_CHANNEL === "release" && !process.env.NONAME_RESOURCE_KEY_FILE) throw new Error("Release builds require NONAME_RESOURCE_KEY or NONAME_RESOURCE_KEY_FILE");
	const filename = path.resolve(root, process.env.NONAME_RESOURCE_KEY_FILE || ".audit/resource-packs.key");
	if (!process.env.NONAME_RESOURCE_KEY_FILE) {
		await fs.mkdir(path.dirname(filename), { recursive: true });
		try {
			await fs.writeFile(filename, randomBytes(32), { flag: "wx", mode: 0o600 });
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
		}
	}
	const key = await fs.readFile(filename);
	resourceKeyConfig(key);
	return key;
}
