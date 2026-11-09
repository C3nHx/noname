import { RESOURCE_CACHE, cacheKey, createResourceIndex, mediaType, parseResourceManifest } from "./manifest.js";

export function rangeResponse(response, range) {
	if (!range) return response;
	return response.arrayBuffer().then(buffer => {
		const match = /^bytes=(\d*)-(\d*)$/.exec(range);
		if (!match || (!match[1] && !match[2])) return new Response(buffer, { headers: response.headers });
		const start = match[1] ? Number(match[1]) : Math.max(0, buffer.byteLength - Number(match[2]));
		const end = match[1] ? (match[2] ? Math.min(Number(match[2]), buffer.byteLength - 1) : buffer.byteLength - 1) : buffer.byteLength - 1;
		if (start > end || start >= buffer.byteLength) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${buffer.byteLength}` } });
		const headers = new Headers(response.headers);
		headers.set("Content-Range", `bytes ${start}-${end}/${buffer.byteLength}`);
		headers.set("Content-Length", String(end - start + 1));
		headers.set("Accept-Ranges", "bytes");
		return new Response(buffer.slice(start, end + 1), { status: 206, headers });
	});
}

export function installResourceWorker(worker) {
	const root = worker.registration.scope;
	let current;
	const describe = manifest => ({ manifest, index: createResourceIndex(manifest), core: new Set([...manifest.core, "index.html", "resource-manifest.json", "resource-version.json"]) });
	function manifest() {
		return (current ??= (async () => {
			const cache = await caches.open(RESOURCE_CACHE);
			const response = (await cache.match(new URL("resource-manifest.json", root).href)) ?? (await fetch(new URL("resource-manifest.json", root)));
			const manifest = parseResourceManifest(await response.json());
			return describe(manifest);
		})());
	}
	async function navigationManifest() {
		let active = await manifest();
		try {
			const versionResponse = await fetch(new URL("resource-version.json", root), { cache: "no-store" });
			if (!versionResponse.ok) return active;
			const version = await versionResponse.json();
			if (version.buildId !== active.manifest.buildId) {
				const response = await fetch(new URL("resource-manifest.json", root), { cache: "no-store" });
				if (!response.ok) return active;
				const updated = parseResourceManifest(await response.json());
				if (updated.buildId !== version.buildId) return active;
				const cache = await caches.open(RESOURCE_CACHE);
				await cache.put(new URL("resource-manifest.json", root).href, new Response(JSON.stringify(updated), { headers: { "Content-Type": "application/json" } }));
				active = describe(updated);
				current = Promise.resolve(active);
			}
		} catch {}
		return active;
	}
	worker.addEventListener("install", event => event.waitUntil(worker.skipWaiting()));
	worker.addEventListener("activate", event => event.waitUntil(worker.clients.claim()));
	worker.addEventListener("message", event => {
		if (event.data?.type === "resource-manifest") current = undefined;
	});
	worker.addEventListener("fetch", event => {
		const request = event.request;
		if (request.method !== "GET" || !request.url.startsWith(root)) return;
		event.respondWith(
			(async () => {
				const { manifest: description, index, core } = request.mode === "navigate" ? await navigationManifest() : await manifest();
				const url = new URL(request.url);
				let filename;
				try {
					filename = decodeURIComponent(url.pathname.slice(new URL(root).pathname.length)) || "index.html";
				} catch {
					return new Response("Bad Request", { status: 400 });
				}
				const file = index.files.get(filename);
				if (file) {
					const cache = await caches.open(RESOURCE_CACHE);
					const cached = await cache.match(cacheKey(root, file.sha256));
					if (cached) return rangeResponse(cached, request.headers.get("Range"));
					if (mediaType(filename)?.startsWith("image/")) return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>', { headers: { "Content-Type": "image/svg+xml" } });
					return new Response(null, { status: 404 });
				}
				if (core.has(filename)) {
					const cache = await caches.open(`noname-core-${description.buildId}`);
					const key = new URL(filename, root).href;
					const cached = await cache.match(key);
					if (cached) return cached;
					const response = await fetch(request);
					if (response.ok) await cache.put(key, response.clone());
					return response;
				}
				return fetch(request);
			})().catch(() => fetch(request))
		);
	});
}
