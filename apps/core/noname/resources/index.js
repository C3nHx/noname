import { createResourceIndex, parseResourceManifest, RESOURCE_CACHE, RESOURCE_STATE, resourceURL } from "./manifest.js";
import { browserResourceStorage, desktopResourceStorage, nativeResourceStorage, reconcileResourceState } from "./storage.js";
import { installResourcePack } from "./download.js";
import { createResourceDecryptor } from "./crypto.js";
import { bundledExtensions, hasBundledResources } from "../util/bundled-extensions.js";

async function resourceState() {
	const database = await new Promise((resolve, reject) => {
		const request = indexedDB.open(RESOURCE_STATE, 1);
		request.onupgradeneeded = () => request.result.createObjectStore("state");
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	const value = await new Promise((resolve, reject) => {
		const request = database.transaction("state").objectStore("state").get("resources");
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	const state = value && typeof value === "object" && value.files && typeof value.files === "object" ? { files: value.files, artwork: value.artwork === true, source: typeof value.source === "string" ? value.source : "" } : { files: {}, artwork: false, source: "" };
	return {
		state,
		save: () =>
			new Promise((resolve, reject) => {
				const transaction = database.transaction("state", "readwrite");
				transaction.objectStore("state").put(state, "resources");
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			}),
	};
}

export async function prepareResourcePacks({ lib, game }) {
	if (document.documentElement.dataset.resourceProfile !== "lite") return null;
	const root = new URL("./", location.href).href;
	const stylesheet = document.createElement("link");
	stylesheet.rel = "stylesheet";
	stylesheet.href = new URL("noname/resources/resource-packs.css", root).href;
	document.head.append(stylesheet);
	const response = await fetch(new URL("resource-manifest.json", root));
	if (!response.ok) throw new Error("轻量客户端缺少资源清单");
	const manifest = parseResourceManifest(await response.json());
	const { state, save } = await resourceState();
	const isDesktop = typeof window.require === "function";
	const isNative = !!window.Capacitor?.isNativePlatform?.() || !!window.webkit?.messageHandlers?.bridge;
	let storage;
	if (isDesktop) storage = desktopResourceStorage(window.nonameResourceRoot);
	else if (isNative) storage = nativeResourceStorage(game);
	else if ("caches" in window) storage = await browserResourceStorage(root);
	const available = file => !!file && state.files[file.path] === file.sha256 && (!storage?.hasCached || storage.hasCached(file));
	const cards = manifest.packs.find(pack => pack.id === "cards");
	let mode = state.artwork && cards?.files.every(available) ? "art" : "text";
	const index = createResourceIndex(manifest, available);
	const core = new Set(manifest.core);
	let decryptor;
	const manager = {
		manifest,
		state,
		index,
		root,
		get textMode() {
			return mode === "text";
		},
		allowsExtension(name) {
			return hasBundledResources(name, extension => {
				if (mode === "text") return false;
				const pack = manifest.packs.find(pack => pack.id === `extension-${extension}`);
				return !pack || pack.files.every(available);
			});
		},
		isManaged(filename) {
			return core.has(filename) || index.files.has(filename) || index.stat(filename)?.type === "directory";
		},
		async read(filename) {
			const file = index.files.get(filename);
			if (file) {
				if (!available(file) || !storage) throw new Error(`资源尚未下载：${filename}`);
				return storage.read(file);
			}
			const response = await fetch(resourceURL(root, filename));
			if (!response.ok) throw new Error(`文件读取失败：${filename}`);
			return new Uint8Array(await response.arrayBuffer());
		},
		async download(id, options = {}) {
			if (!storage) throw new Error("此浏览器不支持持久资源缓存，请使用 HTTPS 或本地客户端");
			const pack = manifest.packs.find(pack => pack.id === id);
			if (!pack) throw new Error("资源包不存在");
			const source = new URL(state.source || manifest.deliveryURL || manifest.baseURL, root);
			if (!["https:", "http:"].includes(source.protocol) || source.username || source.password) throw new Error("请填写有效的公开资源地址");
			await navigator.storage?.persist?.().catch(() => false);
			const decrypt = await (decryptor ??= (async () => {
				const response = await fetch(new URL("resource-key.json", root));
				if (!response.ok) throw new Error("客户端缺少资源解密配置");
				return createResourceDecryptor(await response.json(), manifest.encryption.keyId);
			})().catch(error => {
				decryptor = undefined;
				throw error;
			}));
			const { default: JSZip } = await import("jszip");
			await installResourcePack({ pack, storage, state, source: source.href, resolveURL: resourceURL, decrypt, unzip: bytes => new JSZip(bytes), persist: save, ...options });
			await save();
		},
		async attach() {
			if (storage && (isDesktop || isNative) && (await reconcileResourceState(manifest, state, storage))) await save();
			mode = state.artwork && cards?.files.every(available) ? "art" : "text";
			document.documentElement.dataset.resourceMode = mode;
			if (isDesktop) attachDesktopFiles(game, manager);
			mountResourcePanel(manager, save);
		},
	};
	lib.resourcePacks = manager;
	document.documentElement.dataset.resourceMode = mode;
	if (!isNative && !isDesktop && "serviceWorker" in navigator && "caches" in window) {
		try {
			const cache = await caches.open(RESOURCE_CACHE);
			await cache.put(new URL("resource-manifest.json", root).href, new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }));
			const registration = await navigator.serviceWorker.register(new URL("resource-worker.js", root), { type: "module", scope: root, updateViaCache: "none" });
			if (!navigator.serviceWorker.controller || navigator.serviceWorker.controller.scriptURL !== new URL("resource-worker.js", root).href) {
				await new Promise(resolve => {
					const done = () => {
						clearTimeout(timer);
						navigator.serviceWorker.removeEventListener("controllerchange", done);
						resolve();
					};
					const timer = setTimeout(done, 4000);
					navigator.serviceWorker.addEventListener("controllerchange", done);
				});
			}
			registration.active?.postMessage({ type: "resource-manifest" });
			const shell = await caches.open(`noname-core-${manifest.buildId}`);
			await shell.put(new URL("resource-manifest.json", root).href, new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }));
			const html = await fetch(new URL("index.html", root));
			if (html.ok) await shell.put(new URL("index.html", root).href, html);
		} catch (error) {
			console.warn("资源缓存未启用，继续文字模式", error);
		}
	}
	return manager;
}

function attachDesktopFiles(game, manager) {
	for (const name of ["readFile", "readFileAsText", "checkFile", "checkDir", "getFileList"]) {
		const original = game[name];
		game[name] = function (filename, success = () => {}, failure = console.error) {
			if (!manager.isManaged(filename)) return original.call(this, filename, success, failure);
			if (name === "getFileList") {
				const entries = manager.index.list(filename);
				const merge = (folders = [], files = []) => success([...new Set([...folders, ...entries.filter(entry => entry.type === "directory").map(entry => entry.name)])], [...new Set([...files, ...entries.filter(entry => entry.type === "file").map(entry => entry.name)])]);
				return original.call(this, filename, merge, () => merge());
			} else if (name === "checkDir") {
				const info = manager.index.stat(filename);
				if (info?.type === "directory") return success(1);
			} else if (manager.index.files.has(filename) && manager.index.stat(filename)?.type === "file") {
				if (name === "checkFile") return success(1);
				return manager.read(filename).then(bytes => success(name === "readFileAsText" ? new TextDecoder().decode(bytes) : window.require("buffer").Buffer.from(bytes)), failure);
			}
			return original.call(this, filename, success, failure);
		};
	}
}

function mountResourcePanel(manager, save) {
	const button = document.createElement("button");
	button.id = "resource-packs-button";
	button.textContent = "资源";
	button.type = "button";
	const panel = document.createElement("section");
	panel.id = "resource-packs-panel";
	panel.hidden = true;
	panel.setAttribute("aria-label", "游戏资源");
	const heading = document.createElement("h2");
	heading.textContent = "游戏资源";
	const description = document.createElement("p");
	description.textContent = "文字模式可直接游玩。下载美术和语音后保存在本机，下次启动继续使用。";
	const close = document.createElement("button");
	close.textContent = "关闭";
	close.onclick = () => {
		panel.hidden = true;
	};
	const artwork = document.createElement("input");
	artwork.type = "checkbox";
	artwork.checked = manager.state.artwork;
	const label = document.createElement("label");
	label.append(artwork, " 使用已下载美术与界面扩展，下次启动生效");
	artwork.onchange = async () => {
		manager.state.artwork = artwork.checked;
		await save();
		status.textContent = "外观设置已保存，下次启动生效。";
	};
	const source = document.createElement("input");
	source.type = "url";
	source.value = manager.state.source || manager.manifest.deliveryURL || manager.manifest.baseURL;
	source.setAttribute("aria-label", "公开资源下载地址");
	source.onchange = async () => {
		manager.state.source = source.value.trim();
		await save();
	};
	const sourceLabel = document.createElement("label");
	sourceLabel.textContent = "资源下载地址";
	sourceLabel.append(source);
	const status = document.createElement("p");
	status.setAttribute("role", "status");
	const rows = document.createElement("div");
	let running;
	const order = ["cards", "portraits", "images", "fonts", "extension-十周年UI", "audio"];
	const packs = [...manager.manifest.packs].sort((a, b) => (order.includes(a.id) ? order.indexOf(a.id) : order.length) - (order.includes(b.id) ? order.indexOf(b.id) : order.length));
	for (const pack of packs) {
		const row = document.createElement("div");
		row.className = "resource-pack-row";
		const text = document.createElement("span");
		const bytes = pack.parts.reduce((sum, part) => sum + part.bytes, 0);
		const requires = bundledExtensions.find(extension => pack.id === `extension-${extension.name}`)?.requires ?? [];
		const done = () => pack.files.every(file => manager.index.stat(file.path)?.type === "file");
		const update = () => {
			text.textContent = `${pack.label} · ${(bytes / 1048576).toFixed(1)} MiB${requires.length ? ` · 需${requires.join("、")}` : ""}${done() ? " · 已下载" : ""}`;
		};
		update();
		const download = document.createElement("button");
		download.type = "button";
		download.textContent = "下载 / 检查";
		download.onclick = async () => {
			if (running) return;
			running = new AbortController();
			download.disabled = true;
			try {
				await manager.download(pack.id, {
					signal: running.signal,
					onProgress: progress => {
						status.textContent = `${pack.label}：${progress.completed}/${progress.total} 个文件${progress.partBytes ? `，分卷 ${Math.round((progress.received / progress.partBytes) * 100)}%` : ""}`;
					},
				});
				status.textContent = `${pack.label}已保存。${requires.length ? `此扩展还需${requires.join("、")}美术。` : ""}准备好卡牌图片并勾选美术选项后，重新启动即可使用。`;
			} catch (error) {
				status.textContent = running.signal.aborted ? "下载已暂停，已保存的资源可继续复用。" : `下载未完成：${error.message}。可以重试或继续文字模式。`;
			} finally {
				running = null;
				download.disabled = false;
				update();
			}
		};
		row.append(text, download);
		rows.append(row);
	}
	const pause = document.createElement("button");
	pause.textContent = "暂停下载";
	pause.onclick = () => running?.abort();
	panel.append(heading, description, label, rows, sourceLabel, pause, close, status);
	button.onclick = () => {
		panel.hidden = !panel.hidden;
	};
	document.body.append(button, panel);
}
