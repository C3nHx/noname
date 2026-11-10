import assert from "node:assert/strict";
import test from "node:test";
import { configureClientDiagnostics, createDiagnosticRecorder, diagnosticText, installClientDiagnostics } from "../../apps/core/noname/util/client-diagnostics.js";

function memoryStore() {
	const saved = new Map();
	return {
		async read() {
			return structuredClone([...saved.values()]);
		},
		async write(records) {
			for (const record of records) saved.set(record.id, structuredClone(record));
		},
		async clear() {
			saved.clear();
		},
	};
}

test("diagnostics retain errors across recreation and merge repeated failures", async () => {
	const store = memoryStore();
	const recorder = createDiagnosticRecorder({ store, session: "one", context: () => ({ version: "test", mode: "identity" }) });
	const error = new Error("logic failure");
	recorder.record({ kind: "runtime", error });
	recorder.record({ kind: "runtime", error, source: "onerror" });
	for (let i = 0; i < 20; i++) recorder.record({ kind: "resource", message: "HTTP 404", url: "https://game.example/extension/art.png?token=secret#private", status: 404 });
	const original = await recorder.snapshot();
	assert.equal(original.records.length, 2);
	assert.equal(original.records.find(record => record.kind === "resource").count, 20);
	assert.equal(original.records.find(record => record.kind === "runtime").count, 1);
	assert.equal(original.records[0].context.mode, "identity");
	assert.equal(JSON.stringify(original).includes("secret"), false);
	const restarted = await createDiagnosticRecorder({ store, session: "three" }).snapshot();
	assert.deepEqual(restarted.records, original.records);
	await recorder.clear();
	assert.equal((await createDiagnosticRecorder({ store }).snapshot()).records.length, 0);
});

test("diagnostic messages omit URL credentials, parameters and embedded resource bodies", () => {
	const text = diagnosticText("fetch https://user:password@example.com/path.png?key=secret#fragment data:image/png;base64,private");
	for (const secret of ["user:", "password", "secret", "fragment", "base64", "private"]) assert.equal(text.includes(secret), false);
	assert.ok(text.includes("https://example.com/path.png"));
	assert.equal(diagnosticText("x".repeat(9000)).length, 2000);
	assert.equal(diagnosticText("Authorization: Bearer abc123").includes("abc123"), false);
});

test("structured credentials are omitted while useful context remains", async () => {
	const recorder = createDiagnosticRecorder({ store: memoryStore(), context: () => ({ mode: "identity", token: "private-token", authorization: "Bearer private-header", password: "private-password" }) });
	recorder.record({ message: "failure", context: { cookie: "private-cookie", event: "phaseUse" } });
	const report = await recorder.snapshot();
	assert.equal(report.records[0].context.mode, "identity");
	assert.equal(report.records[0].context.event, "phaseUse");
	assert.equal(JSON.stringify(report).includes("private-"), false);
});

test("resource failures before game configuration are still recorded", async () => {
	const recorder = createDiagnosticRecorder({ store: memoryStore() });
	const target = new EventTarget();
	const dispose = installClientDiagnostics(target, recorder);
	const event = new Event("error");
	Object.defineProperty(event, "target", { value: { tagName: "SCRIPT", src: "https://game.example/entry.js" } });
	target.dispatchEvent(event);
	const record = (await recorder.snapshot()).records[0];
	assert.equal(record.url, "https://game.example/entry.js");
	assert.equal(record.message, "资源加载失败");
	dispose();
});

test("diagnostic storms retain recent records within both count and byte limits", async () => {
	const recorder = createDiagnosticRecorder({ store: memoryStore(), session: "storm", now: () => 1 });
	for (let i = 0; i < 1000; i++) recorder.record({ message: `failure-${i}-` + "界".repeat(2000) });
	const { records } = await recorder.snapshot();
	assert.ok(records.length <= 200);
	assert.ok(new TextEncoder().encode(JSON.stringify(records)).length <= 256 * 1024);
	assert.ok(records[0].message.startsWith("failure-999-"));
	assert.equal(
		records.some(record => record.message.startsWith("failure-0-")),
		false
	);
});

test("unavailable persistent storage keeps an exportable memory report", async () => {
	const store = {
		async read() {
			throw new Error("blocked");
		},
		async write() {
			throw new Error("quota");
		},
		async clear() {
			throw new Error("blocked");
		},
	};
	const recorder = createDiagnosticRecorder({ store });
	recorder.record({ error: new Error("game failure") });
	const report = await recorder.snapshot();
	assert.equal(report.persistence, "memory");
	assert.equal(report.records[0].message, "game failure");
	await recorder.clear();
	assert.deepEqual((await recorder.snapshot()).records, []);
});

test("early listeners capture runtime and resource errors without replacing existing handlers", async () => {
	const recorder = createDiagnosticRecorder({ store: memoryStore() });
	const target = new EventTarget();
	const worker = new EventTarget();
	target.navigator = { serviceWorker: worker };
	const existing = () => {};
	target.onerror = existing;
	configureClientDiagnostics({ isExpectedResource: (path, hash) => (path === "image/card/test.png" ? hash === "installed" : undefined) });
	const dispose = installClientDiagnostics(target, recorder);
	assert.equal(installClientDiagnostics(target, recorder), dispose);
	const emit = (type, fields, destination = target) => {
		const event = new Event(type);
		for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value });
		destination.dispatchEvent(event);
	};
	emit("error", { error: new Error("script failure"), message: "script failure" });
	emit("unhandledrejection", { reason: new Error("rejected action") });
	emit("error", { target: { tagName: "IMG", src: "https://game.example/missing.png" } });
	emit("message", { data: { type: "noname-resource-error", reason: "cache-miss", path: "image/card/test.png", sha256: "not-installed", url: "https://game.example/optional.png" } }, worker);
	emit("message", { data: { type: "noname-resource-error", reason: "cache-miss", path: "image/card/test.png", sha256: "installed", url: "https://game.example/installed.png" } }, worker);
	const report = await recorder.snapshot();
	assert.equal(report.records.length, 4);
	assert.equal(report.records.filter(record => record.kind === "runtime").length, 2);
	assert.equal(
		report.records.some(record => record.url.endsWith("optional.png")),
		false
	);
	assert.equal(target.onerror, existing);
	dispose();
	emit("unhandledrejection", { reason: new Error("after dispose") });
	assert.equal((await recorder.snapshot()).records.length, 4);
});
