export const RESOURCE_CACHE = "noname-resource-files-v1";
export const RESOURCE_STATE = "noname-resource-state-v1";
const mediaTypes = new Map([
	["png", "image/png"],
	["jpg", "image/jpeg"],
	["jpeg", "image/jpeg"],
	["webp", "image/webp"],
	["gif", "image/gif"],
	["svg", "image/svg+xml"],
	["avif", "image/avif"],
	["ico", "image/x-icon"],
	["mp3", "audio/mpeg"],
	["ogg", "audio/ogg"],
	["wav", "audio/wav"],
	["m4a", "audio/mp4"],
	["mp4", "video/mp4"],
	["webm", "video/webm"],
	["woff", "font/woff"],
	["woff2", "font/woff2"],
	["ttf", "font/ttf"],
	["otf", "font/otf"],
	["atlas", "text/plain"],
	["skel", "application/octet-stream"],
]);

export function validResourcePath(value) {
	return typeof value === "string" && value.length > 0 && !/[\\?#:]/.test(value) && value.split("").every(character => character.charCodeAt(0) >= 32) && !value.startsWith("/") && value.split("/").every(part => part && part !== "." && part !== "..");
}

export function mediaType(filename) {
	return mediaTypes.get(filename.slice(filename.lastIndexOf(".") + 1).toLowerCase());
}

export function resourceGroup(filename) {
	if (!mediaType(filename) || filename.startsWith("node_modules/") || filename.startsWith("src/")) return null;
	const [directory, extension] = filename.split("/");
	if (directory === "extension") return { id: `extension-${extension}`, label: `${extension}美术` };
	if (directory === "audio") return { id: "audio", label: "游戏语音与音乐" };
	if (directory === "font") return { id: "fonts", label: "游戏字体" };
	if (directory === "image" && extension === "card") return { id: "cards", label: "卡牌图片" };
	if (directory === "image" && ["character", "skin"].includes(extension)) return { id: "portraits", label: "武将立绘与皮肤" };
	return { id: "images", label: "武将、卡牌与界面图片" };
}

export function resourceURL(base, filename) {
	if (!validResourcePath(filename)) throw new Error("资源路径无效");
	return new URL(filename.split("/").map(encodeURIComponent).join("/"), base.endsWith("/") ? base : `${base}/`).href;
}

export function cacheKey(root, sha256) {
	return new URL(`__resource_cache__/${sha256}`, root).href;
}

export function parseResourceManifest(value) {
	if (!value || typeof value !== "object" || value.schemaVersion !== 2 || !["lite", "full"].includes(value.profile) || typeof value.version !== "string" || !/^[a-f0-9]{64}$/.test(value.buildId) || typeof value.baseURL !== "string" || !Array.isArray(value.core) || !Array.isArray(value.packs)) throw new Error("资源清单格式不受支持");
	if (value.encryption?.algorithm !== "AES-256-GCM" || !/^[a-f0-9]{32}$/.test(value.encryption.keyId)) throw new Error("资源加密配置无效");
	if (!value.core.every(validResourcePath)) throw new Error("核心文件路径无效");
	const paths = new Set(value.core);
	const ids = new Set();
	for (const pack of value.packs) {
		if (!pack || typeof pack.id !== "string" || ids.has(pack.id) || typeof pack.label !== "string" || !Array.isArray(pack.files) || !Array.isArray(pack.parts)) throw new Error("资源包格式无效");
		ids.add(pack.id);
		const files = new Set();
		for (const file of pack.files) {
			if (!file || !validResourcePath(file.path) || !mediaType(file.path) || paths.has(file.path) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error("资源文件记录无效");
			paths.add(file.path);
			files.add(file.path);
		}
		const assigned = new Set();
		for (const part of pack.parts) {
			if (!part || !validResourcePath(part.path) || !part.path.endsWith(".nrp") || !Number.isSafeInteger(part.bytes) || part.bytes <= 32 || !/^[a-f0-9]{64}$/.test(part.sha256) || !Array.isArray(part.files)) throw new Error("资源分卷无效");
			for (const filename of part.files) {
				if (!files.has(filename) || assigned.has(filename)) throw new Error("资源分卷文件不匹配");
				assigned.add(filename);
			}
		}
		if (assigned.size !== files.size) throw new Error("资源分卷不完整");
	}
	return value;
}

export function createResourceIndex(manifest, available = () => true) {
	const files = new Map(manifest.packs.flatMap(pack => pack.files.map(file => [file.path, file])));
	const core = new Set(manifest.core);
	const directories = new Map();
	for (const filename of [...core, ...files.keys()]) {
		const segments = filename.split("/");
		for (let i = 0; i < segments.length; i++) {
			const parent = segments.slice(0, i).join("/");
			if (!directories.has(parent)) directories.set(parent, new Map());
			directories.get(parent).set(segments[i], i === segments.length - 1 ? "file" : "directory");
		}
	}
	return {
		files,
		stat(filename) {
			if (core.has(filename) || (files.has(filename) && available(files.get(filename)))) return { type: "file" };
			if (directories.has(filename)) return { type: "directory" };
			return null;
		},
		list(directory) {
			const entries = directories.get(directory.replace(/\/$/, ""));
			if (!entries) return [];
			return [...entries].filter(([name, type]) => type === "directory" || core.has(`${directory ? `${directory}/` : ""}${name}`) || available(files.get(`${directory ? `${directory}/` : ""}${name}`))).map(([name, type]) => ({ name, type }));
		},
	};
}
