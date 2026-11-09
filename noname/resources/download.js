import { sha256 } from "./crypto.js";
async function downloadResourcePart(url, record, { signal, fetcher = fetch, onBytes = () => {
} } = {}) {
  const response = await fetcher(url, { signal, credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error(`下载失败，HTTP ${response.status}`);
  const chunks = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > record.bytes) throw new Error("资源分卷大小与清单不符");
      chunks.push(value);
      onBytes(size);
    }
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  }
  if (size !== record.bytes) throw new Error("资源分卷下载不完整");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function installResourcePack({ pack, storage, state, source, resolveURL, decrypt, unzip, signal, fetcher, onProgress = () => {
}, persist = () => {
} }) {
  const files = new Map(pack.files.map((file) => [file.path, file]));
  let completed = 0;
  for (const part of pack.parts) {
    if (signal?.aborted) throw new DOMException("下载已暂停", "AbortError");
    const missing = [];
    for (const filename of part.files) {
      const file = files.get(filename);
      const exists = await storage.has(file);
      if (exists && state.files[filename] !== file.sha256 && storage.read && await sha256(await storage.read(file)) === file.sha256) state.files[filename] = file.sha256;
      if (state.files[filename] !== file.sha256 || !exists) missing.push(file);
    }
    if (missing.length) {
      const bytes = await downloadResourcePart(resolveURL(source, part.path), part, { signal, fetcher, onBytes: (bytes2) => onProgress({ completed, total: pack.files.length, received: bytes2, partBytes: part.bytes }) });
      const archive = await unzip(await decrypt(bytes, part));
      const expected = new Set(part.files);
      if (Object.values(archive.files).some((file) => !file.dir && !expected.has(file.name))) throw new Error("资源包包含清单以外的文件");
      for (const file of missing) {
        if (signal?.aborted) throw new DOMException("下载已暂停", "AbortError");
        const entry = archive.file(file.path);
        if (!entry) throw new Error(`资源包缺少文件：${file.path}`);
        const data = entry.asUint8Array();
        if (data.length !== file.bytes || await sha256(data) !== file.sha256) throw new Error(`资源文件校验失败：${file.path}`);
        await storage.write(file, data);
        state.files[file.path] = file.sha256;
        onProgress({ completed: completed + part.files.length - missing.length + missing.indexOf(file) + 1, total: pack.files.length, received: part.bytes, partBytes: part.bytes });
      }
    }
    await persist();
    completed += part.files.length;
    onProgress({ completed, total: pack.files.length, received: 0, partBytes: 0 });
  }
}
async function downloadResourcePacks({ packs, download, signal, onProgress = () => {
} }) {
  const total = packs.reduce((sum, pack) => sum + pack.files.length, 0);
  let completed = 0;
  for (const [index, pack] of packs.entries()) {
    if (signal?.aborted) throw new DOMException("下载已暂停", "AbortError");
    await download(pack.id, { signal, onProgress: (progress) => onProgress({ ...progress, pack, packIndex: index + 1, packCount: packs.length, packCompleted: progress.completed, completed: completed + progress.completed, total }) });
    completed += pack.files.length;
  }
}
export {
  downloadResourcePacks,
  downloadResourcePart,
  installResourcePack
};
