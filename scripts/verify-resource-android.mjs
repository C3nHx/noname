import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import { promisify, parseArgs } from "node:util";

const { values } = parseArgs({ options: { device: { type: "string" }, adb: { type: "string" }, report: { type: "string", default: ".audit/resource-android-result.json" } } });
if (!/^emulator-\d+$/.test(values.device ?? "")) throw new Error("Provide --device emulator-N for a disposable Android emulator; its test app data will be cleared");
const root = path.resolve(import.meta.dirname, "..");
const adbPath = values.adb || (process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb") : "adb");
const reportPath = path.resolve(values.report);
await fs.mkdir(path.dirname(reportPath), { recursive: true });
const run = promisify(execFile);
const report = { device: values.device, requests: [], tests: [] };
const server = http.createServer(async (request, response) => {
	try {
		const name = decodeURIComponent(new URL(request.url, "http://localhost").pathname).slice(1);
		if (request.method !== "GET" || !/^resources-[a-f0-9]{32}-[a-f0-9]{24}\.nrp$/.test(name)) throw new Error("unexpected path");
		const target = path.join(root, "output/resource-packs", name);
		const stat = await fs.stat(target);
		report.requests.push(name);
		response.writeHead(200, { "Content-Type": "application/octet-stream", "Access-Control-Allow-Origin": "*", "Content-Length": stat.size });
		createReadStream(target).pipe(response);
	} catch {
		response.writeHead(404).end();
	}
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const source = `http://10.0.2.2:${server.address().port}/`;
async function adb(...args) {
	const result = await run(adbPath, ["-s", values.device, ...args], { timeout: 360000, maxBuffer: 4 * 1024 * 1024 });
	return result.stdout;
}
try {
	await adb("install", "-r", path.join(root, "apps/mobile/native/android/app/build/outputs/apk/release/app-release.apk"));
	await adb("install", "-r", path.join(root, "apps/mobile/native/android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk"));
	await adb("shell", "pm", "clear", "com.libnoname.noname");
	for (const [index, method] of ["downloadAndPlayWithoutArt", "reuseAfterProcessRestart", "missingArtworkFallsBack"].entries()) {
		const output = await adb("shell", "am", "instrument", "-w", "-e", "class", `com.libnoname.noname.ResourcePacksInstrumentedTest#${method}`, "-e", "resourceURL", source, "com.libnoname.noname.test/androidx.test.runner.AndroidJUnitRunner");
		await fs.writeFile(path.join(path.dirname(reportPath), `android-resource-${index + 1}.log`), output);
		assert.match(output, /OK \(1 test\)/);
		report.tests.push({ method, requests: report.requests.length });
		assert.equal(report.requests.length, 1);
		await adb("shell", "am", "force-stop", "com.libnoname.noname");
	}
	report.result = "PASS";
} catch (error) {
	report.result = "FAIL";
	report.failure = error.stack;
	process.exitCode = 1;
} finally {
	await new Promise(resolve => server.close(resolve));
	await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
	console.log(JSON.stringify(report));
}
