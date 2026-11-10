const DATABASE = "noname-client-diagnostics-v1";
const MAX_RECORDS = 200;
const MAX_BYTES = 256 * 1024;
const encoder = new TextEncoder();

export function diagnosticText(value, limit = 2000) {
	return String(value ?? "")
		.replace(/\b(?:data|blob):[^\s<>"']+/gi, "[embedded URL]")
		.replace(/\b(?:https?|wss?|file):\/\/[^\s<>"']+/gi, address => {
			try {
				const url = new URL(address);
				url.username = "";
				url.password = "";
				url.search = "";
				url.hash = "";
				return url.href;
			} catch {
				return "[URL]";
			}
		})
		.replace(/([?&](?:[^=\s&]+)=)[^\s&#]*/g, "$1[redacted]")
		.replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/gi, "[redacted credential]")
		.replace(/\b(password|authorization|secret|token|key)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
		.slice(0, limit);
}

function diagnosticURL(value) {
	if (!value) return "";
	try {
		const url = new URL(value, globalThis.location?.href || "https://local.invalid/");
		if (["data:", "blob:"].includes(url.protocol)) return "[embedded URL]";
		url.username = "";
		url.password = "";
		url.search = "";
		url.hash = "";
		return (url.origin === "https://local.invalid" ? url.pathname : url.href).slice(0, 2000);
	} catch {
		return diagnosticText(value);
	}
}

function contextValues(value) {
	if (!value || typeof value !== "object") return {};
	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => !/(?:password|authorization|secret|credential|token|cookie|^key$|access.?key|private.?key)/i.test(key))
			.slice(0, 24)
			.map(([key, item]) => [key, Array.isArray(item) ? item.slice(0, 30).map(entry => diagnosticText(entry, 200)) : diagnosticText(item, 1000)])
	);
}

export function limitDiagnosticRecords(records) {
	const result = [];
	let bytes = 2;
	for (const record of records.sort((a, b) => b.lastAt - a.lastAt || b.id.localeCompare(a.id, undefined, { numeric: true }))) {
		const size = encoder.encode(JSON.stringify(record)).length + 1;
		if (result.length === MAX_RECORDS || bytes + size > MAX_BYTES) break;
		result.push(record);
		bytes += size;
	}
	return result;
}

export function indexedDiagnosticStore(indexedDB = globalThis.indexedDB) {
	let opening;
	function open() {
		return (opening ??= new Promise((resolve, reject) => {
			if (!indexedDB) return reject(new Error("IndexedDB unavailable"));
			const request = indexedDB.open(DATABASE, 1);
			request.onupgradeneeded = () => request.result.createObjectStore("records", { keyPath: "id" });
			request.onerror = () => reject(request.error);
			request.onblocked = () => reject(new Error("Diagnostics database blocked"));
			request.onsuccess = () => {
				const database = request.result;
				database.onversionchange = () => {
					database.close();
					opening = undefined;
				};
				resolve(database);
			};
		}));
	}
	async function transaction(mode, action) {
		const database = await open();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction("records", mode);
			let result;
			action(transaction.objectStore("records"), value => {
				result = value;
			});
			transaction.oncomplete = () => resolve(result);
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
	}
	return {
		read: () =>
			transaction("readonly", (store, done) => {
				store.getAll().onsuccess = event => done(event.target.result);
			}),
		write: records =>
			transaction("readwrite", store => {
				for (const record of records) store.put(record);
				store.getAll().onsuccess = event => {
					const all = event.target.result;
					const retained = new Set(limitDiagnosticRecords(all).map(record => record.id));
					for (const record of all) if (!retained.has(record.id)) store.delete(record.id);
				};
			}),
		clear: () => transaction("readwrite", store => store.clear()),
	};
}

export function createDiagnosticRecorder({ store = indexedDiagnosticStore(), now = Date.now, context = () => ({}), session = `${Date.now()}-${Math.random().toString(36).slice(2)}`, delay = 250 } = {}) {
	const records = new Map();
	let seen = new WeakSet();
	let pending = new Map();
	let timer;
	let sequence = 0;
	let recordBytes = 0;
	const sizes = new Map();
	let persistence = true;
	let queue = Promise.resolve();
	const recorder = {
		record(input) {
			try {
				if (input.error && typeof input.error === "object") {
					if (seen.has(input.error)) return;
					seen.add(input.error);
				}
				const reason = typeof input.error?.message === "string" ? input.error.message : ["string", "number", "boolean"].includes(typeof input.error) ? input.error : "Unknown error";
				const message = diagnosticText(input.message || reason);
				const url = diagnosticURL(input.url);
				const kind = input.kind || "runtime";
				const key = `${kind}|${url}|${message}`;
				const previous = records.get(key);
				const timestamp = now();
				const record = {
					id: previous?.id ?? `${session}:${++sequence}`,
					session,
					kind,
					source: diagnosticText(input.source, 100),
					firstAt: previous?.firstAt ?? timestamp,
					lastAt: timestamp,
					count: (previous?.count ?? 0) + 1,
					message,
					url,
					status: Number.isInteger(input.status) ? input.status : null,
					stack: diagnosticText(typeof input.error?.stack === "string" ? input.error.stack : "", 6000),
					context: { ...contextValues(context()), ...contextValues(input.context) },
				};
				recordBytes -= sizes.get(key) ?? 0;
				records.delete(key);
				records.set(key, record);
				const size = encoder.encode(JSON.stringify(record)).length + 1;
				sizes.set(key, size);
				recordBytes += size;
				while (records.size > MAX_RECORDS || recordBytes + 2 > MAX_BYTES) {
					const oldest = records.keys().next().value;
					pending.delete(records.get(oldest).id);
					recordBytes -= sizes.get(oldest);
					sizes.delete(oldest);
					records.delete(oldest);
				}
				if (!records.has(key)) return;
				pending.set(record.id, record);
				if (timer === undefined)
					timer = setTimeout(() => {
						timer = undefined;
						void recorder.flush();
					}, delay);
			} catch {}
		},
		flush() {
			clearTimeout(timer);
			timer = undefined;
			queue = queue.then(async () => {
				const batch = [...pending.values()];
				pending = new Map();
				if (persistence && batch.length) {
					try {
						await store.write(batch);
					} catch {
						persistence = false;
					}
				}
			});
			return queue;
		},
		async snapshot() {
			await recorder.flush();
			let saved = [];
			if (persistence) {
				try {
					saved = await store.read();
				} catch {
					persistence = false;
				}
			}
			const merged = new Map([...saved, ...records.values()].map(record => [record.id, record]));
			return { schemaVersion: 1, exportedAt: new Date(now()).toISOString(), persistence: persistence ? "indexeddb" : "memory", context: contextValues(context()), records: limitDiagnosticRecords([...merged.values()]) };
		},
		async clear() {
			await recorder.flush();
			records.clear();
			pending.clear();
			sizes.clear();
			recordBytes = 0;
			seen = new WeakSet();
			try {
				await store.clear();
			} catch {
				persistence = false;
			}
		},
	};
	return recorder;
}

let details = () => ({});
let expectedResource = () => undefined;
let singleton;
const installed = new WeakMap();
const diagnostics = () => (singleton ??= createDiagnosticRecorder({ context: () => details() }));

export function configureClientDiagnostics({ context, isExpectedResource }) {
	if (context) details = context;
	if (isExpectedResource) expectedResource = isExpectedResource;
}

export function recordClientError(input) {
	diagnostics().record(input);
}
export function readClientDiagnostics() {
	return diagnostics().snapshot();
}
export function clearClientDiagnostics() {
	return diagnostics().clear();
}
export async function exportClientDiagnostics(game) {
	const report = await readClientDiagnostics();
	game.export(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), `noname-diagnostics-${new Date().toISOString().replaceAll(":", "-")}.json`);
}

export function installClientDiagnostics(target = window, recorder = diagnostics()) {
	if (installed.has(target)) return installed.get(target);
	const onError = event => {
		if (event.target && event.target !== target) {
			const element = event.target;
			const url = element.currentSrc || element.src || element.href;
			if (typeof url === "string" && expectedResource(url) === false) return;
			if (typeof url === "string" && url) recorder.record({ kind: "resource", source: "element", url, message: "资源加载失败", context: { element: element.tagName } });
		} else recorder.record({ kind: "runtime", source: "error", error: event.error, message: event.message, url: event.filename, context: { line: event.lineno, column: event.colno } });
	};
	const onRejection = event => recorder.record({ kind: "runtime", source: "unhandledrejection", error: event.reason });
	const onMessage = event => {
		const data = event.data;
		if (!data || data.type !== "noname-resource-error" || typeof data.url !== "string" || typeof data.reason !== "string") return;
		if (data.reason === "cache-miss" && !expectedResource(data.path, data.sha256)) return;
		recorder.record({ kind: "resource", source: "worker", url: data.url, message: data.reason, status: data.status, context: { buildId: data.buildId, path: data.path } });
	};
	const flush = () => {
		void recorder.flush();
	};
	target.addEventListener("error", onError, true);
	target.addEventListener("unhandledrejection", onRejection);
	target.addEventListener("pagehide", flush);
	target.navigator?.serviceWorker?.addEventListener("message", onMessage);
	const dispose = () => {
		target.removeEventListener("error", onError, true);
		target.removeEventListener("unhandledrejection", onRejection);
		target.removeEventListener("pagehide", flush);
		target.navigator?.serviceWorker?.removeEventListener("message", onMessage);
		installed.delete(target);
	};
	installed.set(target, dispose);
	return dispose;
}
