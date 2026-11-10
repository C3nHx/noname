import { acknowledgeClientDiagnostics, clientDiagnosticSession, readClientDiagnostics } from "./client-diagnostics.js";
import { diagnosticText, diagnosticContextKeys } from "./client-diagnostics-format.js";

const encoder = new TextEncoder();
const fields = ["id", "session", "kind", "source", "firstAt", "lastAt", "count", "message", "url", "status", "stack"];
const pending = record => record.reportedCount !== record.count || record.reportedLastAt !== record.lastAt;

function transportRecord(record) {
	const context = {};
	for (const key of diagnosticContextKeys) {
		const value = record.context[key];
		if (value === undefined) continue;
		const clean = Array.isArray(value) ? value.slice(0, 15).map(item => diagnosticText(item, 100)) : diagnosticText(value, 500);
		if (encoder.encode(JSON.stringify({ ...context, [key]: clean })).length <= 16 * 1024) context[key] = clean;
	}
	return { ...Object.fromEntries(fields.map(key => [key, record[key]])), context };
}

export function createDiagnosticUploader({ endpoint, snapshot, acknowledge, fetcher = globalThis.fetch, interval = 15000, timeout = 10000, session = "", onChange = () => {} }) {
	let checked = false,
		stopped = true,
		timer,
		running,
		controller;
	let backoff = interval;
	const state = { phase: "disabled", enabled: false, pending: 0, lastSuccess: null, session };
	const publish = changes => {
		Object.assign(state, changes);
		onChange({ ...state });
	};
	async function request(options) {
		controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);
		try {
			return await fetcher(endpoint, { credentials: "same-origin", cache: "no-store", ...options, signal: controller.signal });
		} finally {
			clearTimeout(timeoutId);
			controller = undefined;
		}
	}
	function schedule(delay) {
		clearTimeout(timer);
		if (!stopped)
			timer = setTimeout(() => {
				void uploader.flush();
			}, delay);
	}
	const uploader = {
		status: () => ({ ...state }),
		start() {
			if (!stopped) return;
			stopped = false;
			void uploader.flush();
		},
		stop() {
			stopped = true;
			clearTimeout(timer);
			controller?.abort();
		},
		flush() {
			if (running) return running;
			let next = interval;
			running = (async () => {
				try {
					const available = (await snapshot()).records.filter(pending);
					publish({ pending: available.length });
					if (!checked) {
						publish({ phase: "checking" });
						const response = await request({ method: "GET" });
						if (response.status === 404) {
							next = 60000;
							publish({ phase: "retry", enabled: false });
							return;
						}
						if (!response.ok) throw new Error("Collector unavailable");
						const capability = await response.json();
						if (capability.enabled !== true || capability.schemaVersion !== 1) {
							next = 60000;
							publish({ phase: "retry", enabled: false });
							return;
						}
						checked = true;
						publish({ enabled: true });
					}
					if (!available.length) {
						backoff = interval;
						publish({ phase: "idle" });
						return;
					}
					const batch = [];
					for (const record of available) {
						const candidate = [...batch, transportRecord(record)];
						if (candidate.length > 20 || encoder.encode(JSON.stringify({ schemaVersion: 1, records: candidate })).length > 96 * 1024) break;
						batch.push(candidate[candidate.length - 1]);
					}
					if (!batch.length) throw new Error("Diagnostic record exceeds upload limit");
					publish({ phase: "sending" });
					const response = await request({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schemaVersion: 1, records: batch }) });
					if (!response.ok) {
						const retryAfter = Number(response.headers.get("Retry-After"));
						if (Number.isFinite(retryAfter) && retryAfter > 0) next = Math.min(300000, retryAfter * 1000);
						throw new Error("Diagnostic upload failed");
					}
					const receipt = await response.json(),
						sent = new Map(batch.map(record => [record.id, record]));
					if (!Array.isArray(receipt.accepted) || receipt.accepted.length !== batch.length || new Set(receipt.accepted.map(record => record.id)).size !== batch.length || !receipt.accepted.every(record => sent.get(record.id)?.count === record.count && sent.get(record.id)?.lastAt === record.lastAt)) throw new Error("Invalid diagnostic receipt");
					await acknowledge(receipt.accepted);
					const remaining = (await snapshot()).records.filter(pending).length;
					backoff = interval;
					next = remaining ? 2000 : interval;
					publish({ phase: "idle", pending: remaining, lastSuccess: new Date().toISOString() });
				} catch {
					next = Math.max(next, backoff);
					backoff = Math.min(300000, backoff * 2);
					publish({ phase: "retry" });
				}
			})().finally(() => {
				running = undefined;
				schedule(next);
			});
			return running;
		},
	};
	return uploader;
}

let active;
const subscribers = new Set();
export function diagnosticUploadStatus() {
	return active?.status() ?? { phase: "disabled", enabled: false, pending: 0, lastSuccess: null, session: clientDiagnosticSession() };
}
export function subscribeDiagnosticUpload(callback) {
	subscribers.add(callback);
	callback(diagnosticUploadStatus());
	return () => subscribers.delete(callback);
}
export function enableClientDiagnosticUpload(endpoint = new URL("/client-diagnostics", location.href).href) {
	const url = new URL(endpoint, location.href);
	if (url.origin !== location.origin || url.username || url.password || url.search || url.hash || !["https:", "http:"].includes(url.protocol) || window.Capacitor?.isNativePlatform?.() || typeof window.require === "function") return;
	if (active) return active;
	active = createDiagnosticUploader({
		endpoint: url.href,
		snapshot: readClientDiagnostics,
		acknowledge: acknowledgeClientDiagnostics,
		session: clientDiagnosticSession(),
		onChange: state => {
			for (const callback of subscribers) {
				try {
					callback(state);
				} catch {}
			}
		},
	});
	window.addEventListener("online", () => {
		void active.flush();
	});
	active.start();
	return active;
}
