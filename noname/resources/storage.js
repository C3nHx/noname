import { RESOURCE_CACHE, cacheKey, mediaType, validResourcePath } from "./manifest.js";
import { sha256 } from "./crypto.js";
async function reconcileResourceState(manifest, state, storage) {
  const files = manifest.packs.flatMap((pack) => pack.files).filter((file) => state.files[file.path] === file.sha256);
  let changed = false;
  for (let start = 0; start < files.length; start += 32) {
    await Promise.all(
      files.slice(start, start + 32).map(async (file) => {
        if (!await storage.has(file, { verify: false })) {
          delete state.files[file.path];
          changed = true;
        }
      })
    );
  }
  return changed;
}
async function browserResourceStorage(root) {
  const cache = await caches.open(RESOURCE_CACHE);
  const keys = new Set((await cache.keys()).map((request) => request.url));
  return {
    hasCached(file) {
      return keys.has(cacheKey(root, file.sha256));
    },
    async has(file) {
      const key = cacheKey(root, file.sha256);
      const exists = !!await cache.match(key);
      if (exists) keys.add(key);
      else keys.delete(key);
      return exists;
    },
    async read(file) {
      const response = await cache.match(cacheKey(root, file.sha256));
      if (!response) {
        keys.delete(cacheKey(root, file.sha256));
        throw new Error(`资源尚未下载：${file.path}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    async write(file, bytes) {
      const key = cacheKey(root, file.sha256);
      await cache.put(key, new Response(bytes, { headers: { "Content-Type": mediaType(file.path), "Content-Length": String(bytes.length) } }));
      keys.add(key);
    }
  };
}
function nativeResourceStorage(game) {
  async function read(file) {
    return new Uint8Array(await new Promise((resolve, reject) => game.readFile(file.path, resolve, reject)));
  }
  return {
    async has(file, { verify = true } = {}) {
      try {
        const exists = await new Promise(
          (resolve) => game.checkFile(
            file.path,
            (result) => resolve(result === 1),
            () => resolve(false)
          )
        );
        if (!exists) return false;
        if (!verify) return true;
        const bytes = await read(file);
        return bytes.length === file.bytes && await sha256(bytes) === file.sha256;
      } catch {
        return false;
      }
    },
    read,
    async write(file, bytes) {
      const index = file.path.lastIndexOf("/");
      await new Promise((resolve, reject) => game.writeFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), index < 0 ? "" : file.path.slice(0, index), file.path.slice(index + 1), (error) => error ? reject(error) : resolve()));
      const saved = await read(file);
      if (saved.length !== file.bytes || await sha256(saved) !== file.sha256) throw new Error(`资源保存校验失败：${file.path}`);
    }
  };
}
function desktopResourceStorage(root) {
  const fs = window.require("fs").promises;
  const path = window.require("path");
  function target(file) {
    if (!validResourcePath(file.path)) throw new Error("资源路径无效");
    const filename = path.resolve(root, file.path);
    if (!filename.startsWith(path.resolve(root) + path.sep)) throw new Error("资源路径越界");
    return filename;
  }
  return {
    async has(file, { verify = true } = {}) {
      try {
        if ((await fs.stat(target(file))).size !== file.bytes) return false;
        if (!verify) return true;
        return await sha256(await fs.readFile(target(file))) === file.sha256;
      } catch {
        return false;
      }
    },
    async read(file) {
      return new Uint8Array(await fs.readFile(target(file)));
    },
    async write(file, bytes) {
      const filename = target(file);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      const temporary = `${filename}.download`;
      await fs.writeFile(temporary, bytes);
      await fs.rename(temporary, filename);
    }
  };
}
export {
  browserResourceStorage,
  desktopResourceStorage,
  nativeResourceStorage,
  reconcileResourceState
};
