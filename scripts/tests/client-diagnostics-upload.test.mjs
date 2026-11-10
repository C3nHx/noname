import assert from "node:assert/strict";
import test from "node:test";
import { createDiagnosticRecorder } from "../../apps/core/noname/util/client-diagnostics.js";
import { createDiagnosticUploader } from "../../apps/core/noname/util/client-diagnostics-upload.js";

function storage() {
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
		async acknowledge(versions) {
			for (const version of versions) {
				const record = saved.get(version.id);
				if (record?.count === version.count && record?.lastAt === version.lastAt) saved.set(record.id, { ...record, reportedCount: version.count, reportedLastAt: version.lastAt });
			}
		},
	};
}

function collector(posts, intercept = () => {}) {
	return async (url, options) => {
		assert.equal(options.credentials, "same-origin");
		if (options.method === "GET") return Response.json({ enabled: true, schemaVersion: 1 });
		const body = JSON.parse(options.body);
		posts.push(body);
		await intercept(body);
		return Response.json({ accepted: body.records.map(({ id, count, lastAt }) => ({ id, count, lastAt })) }, { status: 202 });
	};
}

test("server acknowledgement survives recreation without deleting local diagnostics", async () => {
	const store = storage(),
		posts = [];
	let recorder = createDiagnosticRecorder({ store, session: "browser-a" });
	recorder.record({ message: "retained failure", context: { mode: "identity" } });
	assert.equal((await recorder.snapshot()).records[0].reportedCount, undefined);
	let uploader = createDiagnosticUploader({ endpoint: "https://game.example/client-diagnostics", snapshot: recorder.snapshot, acknowledge: recorder.acknowledge, fetcher: collector(posts) });
	await uploader.flush();
	uploader.stop();
	assert.equal(posts.length, 1);
	assert.equal((await recorder.snapshot()).records.length, 1);
	recorder = createDiagnosticRecorder({ store, session: "browser-b" });
	uploader = createDiagnosticUploader({ endpoint: "https://game.example/client-diagnostics", snapshot: recorder.snapshot, acknowledge: recorder.acknowledge, fetcher: collector(posts) });
	await uploader.flush();
	uploader.stop();
	assert.equal(posts.length, 1);
});

test("new duplicate counts during an upload remain pending after an older receipt", async () => {
	const recorder = createDiagnosticRecorder({ store: storage(), session: "browser" }),
		posts = [];
	recorder.record({ message: "same failure" });
	let changed = false;
	const uploader = createDiagnosticUploader({
		endpoint: "https://game.example/client-diagnostics",
		snapshot: recorder.snapshot,
		acknowledge: recorder.acknowledge,
		fetcher: collector(posts, () => {
			if (!changed) {
				changed = true;
				recorder.record({ message: "same failure" });
			}
		}),
	});
	await uploader.flush();
	let record = (await recorder.snapshot()).records[0];
	assert.equal(record.count, 2);
	assert.notEqual(record.reportedCount, 2);
	await uploader.flush();
	uploader.stop();
	record = (await recorder.snapshot()).records[0];
	assert.deepEqual(
		posts.map(post => post.records[0].count),
		[1, 2]
	);
	assert.equal(record.reportedCount, 2);
});

test("failed uploads retain records for a later browser session and do not log themselves", async () => {
	const store = storage();
	const recorder = createDiagnosticRecorder({ store, session: "offline" });
	recorder.record({ message: "game failed offline" });
	const uploader = createDiagnosticUploader({
		endpoint: "https://game.example/client-diagnostics",
		snapshot: recorder.snapshot,
		acknowledge: recorder.acknowledge,
		fetcher: async () => {
			throw new Error("offline");
		},
	});
	await uploader.flush();
	uploader.stop();
	assert.equal(uploader.status().phase, "retry");
	const next = createDiagnosticRecorder({ store, session: "online" }),
		posts = [];
	const retry = createDiagnosticUploader({ endpoint: "https://game.example/client-diagnostics", snapshot: next.snapshot, acknowledge: next.acknowledge, fetcher: collector(posts) });
	await retry.flush();
	retry.stop();
	assert.equal(posts.length, 1);
	assert.equal((await next.snapshot()).records.length, 1);
});

test("large backlogs use bounded batches and never acknowledge an invalid receipt", async () => {
	const recorder = createDiagnosticRecorder({ store: storage() }),
		posts = [];
	for (let i = 0; i < 55; i++) recorder.record({ message: `failure ${i}` });
	const uploader = createDiagnosticUploader({ endpoint: "https://game.example/client-diagnostics", snapshot: recorder.snapshot, acknowledge: recorder.acknowledge, fetcher: collector(posts) });
	for (let i = 0; i < 3; i++) await uploader.flush();
	uploader.stop();
	assert.deepEqual(
		posts.map(post => post.records.length),
		[20, 20, 15]
	);
	assert(posts.every(post => Buffer.byteLength(JSON.stringify(post)) <= 96 * 1024));
	recorder.record({ message: "new failure" });
	const invalid = createDiagnosticUploader({ endpoint: "https://game.example/client-diagnostics", snapshot: recorder.snapshot, acknowledge: recorder.acknowledge, fetcher: async (url, options) => (options.method === "GET" ? Response.json({ enabled: true, schemaVersion: 1 }) : Response.json({ accepted: [{ id: "other", count: 1, lastAt: 0 }] })) });
	await invalid.flush();
	invalid.stop();
	assert.equal(invalid.status().phase, "retry");
	assert.equal((await recorder.snapshot()).records.find(record => record.message === "new failure").reportedCount, undefined);
});

test("a large individual error still uploads with bounded context", async () => {
	const recorder = createDiagnosticRecorder({ store: storage() }),
		posts = [];
	const context = Object.fromEntries(["version", "commit", "channel", "platform", "userAgent", "mode", "resourceMode", "buildId", "event", "step", "parentEvent", "skill", "card", "extensions", "line", "column", "element", "path", "extension", "package"].map(key => [key, "界".repeat(1000)]));
	recorder.record({ message: "界".repeat(2000), error: { stack: "界".repeat(6000) }, context });
	const uploader = createDiagnosticUploader({ endpoint: "https://game.example/client-diagnostics", snapshot: recorder.snapshot, acknowledge: recorder.acknowledge, fetcher: collector(posts) });
	await uploader.flush();
	uploader.stop();
	assert.equal(posts.length, 1);
	assert(Buffer.byteLength(JSON.stringify(posts[0])) <= 96 * 1024);
	assert.equal((await recorder.snapshot()).records[0].reportedCount, 1);
});
