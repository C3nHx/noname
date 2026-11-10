import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { diagnosticText, diagnosticContextKeys } from "../../../apps/core/noname/util/client-diagnostics-format.js";

type DiagnosticRecord = {
	id: string;
	session: string;
	kind: string;
	source: string;
	firstAt: number;
	lastAt: number;
	count: number;
	message: string;
	url: string;
	status: number | null;
	stack: string;
	context: Record<string, string | string[]>;
};
type DiagnosticBatch = { schemaVersion: 1; records: DiagnosticRecord[] };
type CollectorOptions = { directory: string; origin: string; maxFileBytes?: number; fileCount?: number; requestsPerMinute?: number };
const text = (maxLength: number) => ({ type: "string", maxLength });
const recordSchema = {
	type: "object",
	additionalProperties: false,
	required: ["id", "session", "kind", "source", "firstAt", "lastAt", "count", "message", "url", "status", "stack", "context"],
	properties: {
		id: { ...text(160), minLength: 1, pattern: "^[A-Za-z0-9:_-]+$" },
		session: { ...text(128), minLength: 1, pattern: "^[A-Za-z0-9:_-]+$" },
		kind: { enum: ["runtime", "resource", "request", "startup", "package", "game-event"] },
		source: text(100),
		firstAt: { type: "integer", minimum: 0 },
		lastAt: { type: "integer", minimum: 0 },
		count: { type: "integer", minimum: 1, maximum: 1000000000 },
		message: text(2000),
		url: text(2000),
		stack: text(6000),
		status: { anyOf: [{ type: "null" }, { type: "integer", minimum: 0, maximum: 599 }] },
		context: { type: "object", additionalProperties: false, properties: Object.fromEntries(diagnosticContextKeys.map(key => [key, { anyOf: [text(1000), { type: "array", maxItems: 30, items: text(200) }] }])) },
	},
};

function isMissing(error: unknown) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export function createClientDiagnosticLog({ directory, maxFileBytes = 5 * 1024 * 1024, fileCount = 4 }: Pick<CollectorOptions, "directory" | "maxFileBytes" | "fileCount">) {
	if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1 || !Number.isInteger(fileCount) || fileCount < 1 || fileCount > 8) throw new RangeError("Invalid diagnostic log capacity");
	const files = Array.from({ length: fileCount }, (_, index) => path.join(directory, index ? `client-errors.ndjson.${index}` : "client-errors.ndjson"));
	let queue = Promise.resolve();
	return {
		append(records: DiagnosticRecord[]) {
			const receivedAt = new Date().toISOString();
			const lines =
				records
					.map(record =>
						JSON.stringify({
							receivedAt,
							record: {
								...record,
								message: diagnosticText(record.message),
								url: diagnosticText(record.url),
								stack: diagnosticText(record.stack, 6000),
								context: Object.fromEntries(Object.entries(record.context).map(([key, value]) => [key, Array.isArray(value) ? value.map(item => diagnosticText(item, 200)) : diagnosticText(value, 1000)])),
							},
						})
					)
					.join("\n") + "\n";
			const bytes = Buffer.byteLength(lines);
			const task = queue.then(async () => {
				if (bytes > maxFileBytes) throw new Error("Diagnostic batch exceeds log capacity");
				await fs.mkdir(directory, { recursive: true, mode: 0o700 });
				await fs.chmod(directory, 0o700);
				const size = await fs.stat(files[0]).then(
					stat => stat.size,
					error => {
						if (isMissing(error)) return 0;
						throw error;
					}
				);
				if (size + bytes > maxFileBytes) {
					await fs.rm(files[files.length - 1], { force: true });
					for (let index = files.length - 1; index > 0; index--)
						await fs.rename(files[index - 1], files[index]).catch(error => {
							if (!isMissing(error)) throw error;
						});
				}
				await fs.appendFile(files[0], lines, { mode: 0o600 });
				await fs.chmod(files[0], 0o600);
			});
			queue = task.catch(() => {});
			return task;
		},
		flush: () => queue,
	};
}

export function registerClientDiagnostics(app: FastifyInstance, options: CollectorOptions) {
	const origin = new URL(options.origin).origin;
	if (origin !== options.origin || !/^https?:\/\//.test(origin)) throw new Error("Diagnostics origin must be an HTTP origin without a path");
	const log = createClientDiagnosticLog(options);
	let windowStart = Date.now(),
		requests = 0;
	app.get("/client-diagnostics", async () => ({ enabled: true, schemaVersion: 1 }));
	app.post<{ Body: DiagnosticBatch }>(
		"/client-diagnostics",
		{
			bodyLimit: 128 * 1024,
			schema: { body: { type: "object", additionalProperties: false, required: ["schemaVersion", "records"], properties: { schemaVersion: { const: 1 }, records: { type: "array", minItems: 1, maxItems: 20, items: recordSchema } } } },
			onRequest: async (request, reply) => {
				if (request.headers.origin !== origin || request.headers["sec-fetch-site"] === "cross-site") return reply.code(403).send({ error: "Same-origin diagnostic reports required" });
				if (!/^application\/json(?:;|$)/i.test(request.headers["content-type"] ?? "")) return reply.code(415).send({ error: "JSON diagnostic reports required" });
				const now = Date.now();
				if (now - windowStart >= 60000) {
					windowStart = now;
					requests = 0;
				}
				if (++requests > (options.requestsPerMinute ?? 120))
					return reply
						.header("Retry-After", Math.ceil((60000 - (now - windowStart)) / 1000))
						.code(429)
						.send({ error: "Diagnostic report limit reached" });
			},
			errorHandler(error, request, reply) {
				return reply.code(error.statusCode ?? 400).send({ error: "Invalid diagnostic report" });
			},
		},
		async (request, reply) => {
			try {
				await log.append(request.body.records);
				return reply.code(202).send({ accepted: request.body.records.map(({ id, count, lastAt }) => ({ id, count, lastAt })) });
			} catch (error) {
				request.log.error(error, "Could not persist client diagnostics");
				return reply.code(503).send({ error: "Diagnostic storage unavailable" });
			}
		}
	);
	app.addHook("onClose", async () => log.flush());
}
