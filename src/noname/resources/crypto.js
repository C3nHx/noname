export const RESOURCE_MAGIC = Object.freeze([78, 82, 80, 50]);
export const RESOURCE_OVERHEAD = 32;

export async function sha256(bytes) {
	if (globalThis.crypto?.subtle) {
		const hash = await crypto.subtle.digest("SHA-256", bytes);
		return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
	}
	const { default: CryptoJS } = await import("crypto-js");
	return CryptoJS.SHA256(CryptoJS.lib.WordArray.create(bytes)).toString();
}

export function resourceAAD(keyId, contentHash) {
	return new TextEncoder().encode(`noname-resources-v2:${keyId}:${contentHash}`);
}

/** Import the client key without exposing it in the public resource catalog. */
export async function createResourceDecryptor(config, expectedKeyId) {
	if (!globalThis.crypto?.subtle) throw new Error("资源解密需要 HTTPS 或本地客户端");
	if (!config || config.schemaVersion !== 1 || config.keyId !== expectedKeyId || typeof config.key !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(config.key)) throw new Error("客户端资源密钥配置无效");
	const raw = Uint8Array.from(atob(config.key), character => character.charCodeAt(0));
	if (raw.length !== 32 || (await sha256(raw)).slice(0, 32) !== config.keyId) throw new Error("客户端资源密钥与资源包不匹配");
	const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
	return async (bytes, part) => {
		if (bytes.length <= RESOURCE_OVERHEAD || !RESOURCE_MAGIC.every((byte, index) => bytes[index] === byte)) throw new Error("资源包不是受支持的加密格式");
		let plaintext;
		try {
			plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(4, 16), additionalData: resourceAAD(config.keyId, part.sha256), tagLength: 128 }, key, bytes.slice(16)));
		} catch {
			throw new Error("资源包解密失败，密钥不匹配或内容已损坏");
		}
		if ((await sha256(plaintext)) !== part.sha256) throw new Error("解密后的资源包校验失败");
		return plaintext;
	};
}
