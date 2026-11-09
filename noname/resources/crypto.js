const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["../../_virtual/index4.js","../../_virtual/_commonjsHelpers.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/index.js","../../_virtual/index5.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/core.js","../../_virtual/_commonjs-dynamic-modules.js","../../_virtual/core.js","../../_virtual/___vite-browser-external.js","../../_virtual/__vite-browser-external.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/x64-core.js","../../_virtual/x64-core.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/lib-typedarrays.js","../../_virtual/lib-typedarrays.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/enc-utf16.js","../../_virtual/enc-utf16.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/enc-base64.js","../../_virtual/enc-base64.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/enc-base64url.js","../../_virtual/enc-base64url.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/md5.js","../../_virtual/md5.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/sha1.js","../../_virtual/sha1.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/sha256.js","../../_virtual/sha256.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/sha224.js","../../_virtual/sha224.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/sha512.js","../../_virtual/sha512.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/sha384.js","../../_virtual/sha384.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/sha3.js","../../_virtual/sha3.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/ripemd160.js","../../_virtual/ripemd160.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/hmac.js","../../_virtual/hmac.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/pbkdf2.js","../../_virtual/pbkdf2.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/evpkdf.js","../../_virtual/evpkdf.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/cipher-core.js","../../_virtual/cipher-core.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/mode-cfb.js","../../_virtual/mode-cfb.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/mode-ctr.js","../../_virtual/mode-ctr.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/mode-ctr-gladman.js","../../_virtual/mode-ctr-gladman.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/mode-ofb.js","../../_virtual/mode-ofb.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/mode-ecb.js","../../_virtual/mode-ecb.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/pad-ansix923.js","../../_virtual/pad-ansix923.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/pad-iso10126.js","../../_virtual/pad-iso10126.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/pad-iso97971.js","../../_virtual/pad-iso97971.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/pad-zeropadding.js","../../_virtual/pad-zeropadding.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/pad-nopadding.js","../../_virtual/pad-nopadding.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/format-hex.js","../../_virtual/format-hex.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/aes.js","../../_virtual/aes.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/tripledes.js","../../_virtual/tripledes.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/rc4.js","../../_virtual/rc4.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/rabbit.js","../../_virtual/rabbit.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/rabbit-legacy.js","../../_virtual/rabbit-legacy.js","../../node_modules/.pnpm/crypto-js@4.2.0/node_modules/crypto-js/blowfish.js","../../_virtual/blowfish.js"])))=>i.map(i=>d[i]);
import { __vitePreload } from "../../_virtual/preload-helper.js";
const RESOURCE_MAGIC = Object.freeze([78, 82, 80, 50]);
const RESOURCE_OVERHEAD = 32;
async function sha256(bytes) {
  if (globalThis.crypto?.subtle) {
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  const { default: CryptoJS } = await __vitePreload(async () => {
    const { default: CryptoJS2 } = await import("../../_virtual/index4.js").then((n) => n.i);
    return { default: CryptoJS2 };
  }, true ? __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76]) : void 0, import.meta.url);
  return CryptoJS.SHA256(CryptoJS.lib.WordArray.create(bytes)).toString();
}
function resourceAAD(keyId, contentHash) {
  return new TextEncoder().encode(`noname-resources-v2:${keyId}:${contentHash}`);
}
async function createResourceDecryptor(config, expectedKeyId) {
  if (!globalThis.crypto?.subtle) throw new Error("资源解密需要 HTTPS 或本地客户端");
  if (!config || config.schemaVersion !== 1 || config.keyId !== expectedKeyId || typeof config.key !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(config.key)) throw new Error("客户端资源密钥配置无效");
  const raw = Uint8Array.from(atob(config.key), (character) => character.charCodeAt(0));
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
    if (await sha256(plaintext) !== part.sha256) throw new Error("解密后的资源包校验失败");
    return plaintext;
  };
}
export {
  RESOURCE_MAGIC,
  RESOURCE_OVERHEAD,
  createResourceDecryptor,
  resourceAAD,
  sha256
};
