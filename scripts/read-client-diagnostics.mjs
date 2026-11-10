import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { directory: { type: "string" }, session: { type: "string" }, since: { type: "string" }, limit: { type: "string", default: "200" } } });
if (!values.directory) throw new Error("--directory is required");
const limit = Number(values.limit),
	since = values.since ? Date.parse(values.since) : 0;
if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isFinite(since)) throw new Error("Invalid limit or time");
const latest = new Map();
for (const filename of ["client-errors.ndjson.3", "client-errors.ndjson.2", "client-errors.ndjson.1", "client-errors.ndjson"]) {
	const target = path.join(values.directory, filename);
	if (!fs.existsSync(target)) continue;
	try {
		const lines = readline.createInterface({ input: fs.createReadStream(target), crlfDelay: Infinity });
		for await (const line of lines) {
			try {
				const envelope = JSON.parse(line),
					record = envelope.record;
				if (!record || typeof record.id !== "string" || typeof record.lastAt !== "number" || typeof record.count !== "number" || typeof envelope.receivedAt !== "string") continue;
				if ((values.session && record.session !== values.session) || Date.parse(envelope.receivedAt) < since) continue;
				const previous = latest.get(record.id)?.record;
				if (!previous || record.count > previous.count || (record.count === previous.count && record.lastAt >= previous.lastAt)) {
					latest.delete(record.id);
					latest.set(record.id, envelope);
				}
				if (latest.size > 5000) latest.delete(latest.keys().next().value);
			} catch {}
		}
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
}
const records = [...latest.values()].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt)).slice(0, limit);
console.log(JSON.stringify({ records, count: records.length }, null, 2));
