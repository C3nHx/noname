import assert from "node:assert/strict";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Fastify from "fastify";
import createApp from "../dist/index.js";
import { createClientDiagnosticLog, registerClientDiagnostics } from "../src/client-diagnostics.ts";

const origin = "https://game.example";
const headers = { origin, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const record = (id = "session:1", count = 1) => ({ id, session: "session", kind: "resource", source: "worker", firstAt: 1, lastAt: count, count, message: "GET https://user:password@game.example/image.png?token=private", url: "https://game.example/image.png?key=private", status: 404, stack: "", context: { mode: "identity", token: "private-context" } });
const batch = (...records) => ({ schemaVersion: 1, records });

async function fixture(t, options = {}) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "noname-collector-"));
	const app = Fastify();
	registerClientDiagnostics(app, { directory, origin, ...options });
	t.after(async () => {
		await app.close();
		await fs.rm(directory, { recursive: true, force: true });
	});
	return { directory, app, post: payload => app.inject({ method: "POST", url: "/client-diagnostics", headers, payload }) };
}

test("diagnostics persist accepted versions and redact client-supplied credentials", async t => {
	const { directory, app, post } = await fixture(t);
	assert.deepEqual((await app.inject("/client-diagnostics")).json(), { enabled: true, schemaVersion: 1 });
	const response = await post(batch(record()));
	assert.equal(response.statusCode, 202);
	assert.deepEqual(response.json().accepted, [{ id: "session:1", count: 1, lastAt: 1 }]);
	const contents = await fs.readFile(path.join(directory, "client-errors.ndjson"), "utf8");
	assert.equal(contents.includes("private"), false);
	assert.equal(contents.includes("password"), false);
	assert.equal(JSON.parse(contents).record.context.mode, "identity");
	assert.equal((await app.inject("/client-errors.ndjson")).statusCode, 404);
});

test("diagnostics reject cross-origin, non-JSON, malformed and oversized writes", async t => {
	const { app } = await fixture(t);
	for (const requestHeaders of [{ "content-type": "application/json" }, { ...headers, origin: "https://other.example" }, { ...headers, "sec-fetch-site": "cross-site" }]) assert.equal((await app.inject({ method: "POST", url: "/client-diagnostics", headers: requestHeaders, payload: batch(record()) })).statusCode, 403);
	assert.equal((await app.inject({ method: "POST", url: "/client-diagnostics", headers: { ...headers, "content-type": "text/plain" }, payload: JSON.stringify(batch(record())) })).statusCode, 415);
	for (const payload of [batch(), batch({ ...record(), count: -1 }), batch({ ...record(), stack: "x".repeat(6001) })]) assert.equal((await app.inject({ method: "POST", url: "/client-diagnostics", headers, payload })).statusCode, 400);
	assert.equal((await app.inject({ method: "POST", url: "/client-diagnostics", headers, payload: JSON.stringify(batch(record())) + " ".repeat(128 * 1024) })).statusCode, 413);
	assert.equal((await app.inject({ method: "OPTIONS", url: "/client-diagnostics", headers: { origin: "https://other.example", "access-control-request-method": "POST" } })).headers["access-control-allow-origin"], undefined);
});

test("rotation bounds disk use and query deduplication never regresses a reported count", async t => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "noname-log-rotation-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	const log = createClientDiagnosticLog({ directory, maxFileBytes: 1800, fileCount: 2 });
	for (let i = 1; i <= 12; i++) await log.append([{ ...record(`session:${i}`), context: {} }]);
	assert((await fs.readdir(directory)).length <= 2);
	for (const filename of await fs.readdir(directory)) assert((await fs.stat(path.join(directory, filename))).size <= 1800);
	await log.append([record("same:1", 3)]);
	await log.append([record("same:1", 3)]);
	await log.append([{ ...record("same:1", 2), lastAt: 9999 }]);
	const script = path.resolve("scripts/read-client-diagnostics.mjs");
	const { stdout } = await promisify(execFile)(process.execPath, [script, "--directory", directory]);
	const report = JSON.parse(stdout),
		matching = report.records.filter(item => item.record.id === "same:1");
	assert.equal(matching.length, 1);
	assert.equal(matching[0].record.count, 3);
	const restarted = createClientDiagnosticLog({ directory, maxFileBytes: 1800, fileCount: 2 });
	await restarted.append([{ ...record("after-restart"), context: {} }]);
	assert((await fs.readFile(path.join(directory, "client-errors.ndjson"), "utf8")).includes("after-restart"));
});

test("write failures can recover and diagnostic rate limits return a retry interval", async t => {
	const { directory, app, post } = await fixture(t, { requestsPerMinute: 2 });
	assert.equal((await post(batch(record()))).statusCode, 202);
	assert.equal((await post(batch(record("session:2")))).statusCode, 202);
	const limited = await post(batch(record("session:3")));
	assert.equal(limited.statusCode, 429);
	assert(Number(limited.headers["retry-after"]) > 0);
	const blocked = path.join(directory, "blocked");
	await fs.writeFile(blocked, "file");
	const log = createClientDiagnosticLog({ directory: blocked });
	await assert.rejects(log.append([record()]));
	await fs.unlink(blocked);
	await log.append([record()]);
	assert((await fs.readFile(path.join(blocked, "client-errors.ndjson"), "utf8")).includes("session:1"));
});

test("enabling diagnostic writes preserves every game filesystem write restriction", async t => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "noname-collector-readonly-")),
		web = path.join(directory, "web"),
		logs = path.join(directory, "logs");
	await fs.mkdir(web);
	await fs.writeFile(path.join(web, "noname.js"), "export {};");
	const app = createApp({ dirname: web, port: 0, server: true, readonly: true, diagnosticsDir: logs, diagnosticsOrigin: origin });
	t.after(async () => {
		await app.close();
		await fs.rm(directory, { recursive: true, force: true });
	});
	await once(app.server, "listening");
	assert.equal((await app.inject({ method: "POST", url: "/client-diagnostics", headers, payload: batch(record()) })).statusCode, 202);
	assert.equal((await app.inject({ method: "POST", url: "/writeFile", payload: { path: "noname.js", data: [0] } })).statusCode, 403);
	assert.equal((await app.inject("/removeFile?fileName=noname.js")).statusCode, 403);
	assert.equal((await app.inject("/readFileAsText?fileName=../logs/client-errors.ndjson")).json().success, false);
	assert.equal((await app.inject("/client-errors.ndjson")).statusCode, 404);
	assert.equal((await app.inject({ method: "POST", url: "/client-diagnostics", headers: { ...headers, origin: "https://other.example" }, payload: batch(record()) })).statusCode, 403);
	assert.equal(await fs.readFile(path.join(web, "noname.js"), "utf8"), "export {};");
});
