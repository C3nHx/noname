import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createApp from "../dist/index.js";

test("public resources can be read while every file mutation is rejected", async () => {
	const dirname = await fs.mkdtemp(path.join(os.tmpdir(), "noname-readonly-"));
	await fs.writeFile(path.join(dirname, "noname.js"), "export const game = {};");
	await fs.mkdir(path.join(dirname, "extension"));
	const app = createApp({ dirname, port: 0, server: true, readonly: true });
	try {
		await once(app.server, "listening");
		assert.equal((await app.inject("/noname.js")).statusCode, 200);
		assert.equal((await app.inject("/checkFile?fileName=noname.js")).json().data, "file");
		assert.deepEqual((await app.inject("/getFileList?dir=.")).json().data.folders, ["extension"]);
		assert.equal((await app.inject("/readFileAsText?fileName=../outside")).json().success, false);
		for (const url of ["/createDir?dir=new", "/removeDir?dir=extension", "/removeFile?fileName=noname.js", "/%63reateDir?dir=new", "/%72emoveDir?dir=extension", "/%72emoveFile?fileName=noname.js"]) {
			assert.equal((await app.inject(url)).statusCode, 403, url);
		}
		const write = await app.inject({ method: "POST", url: "/writeFile", payload: { path: "noname.js", data: [0] } });
		assert.equal(write.statusCode, 403);
		assert.equal((await app.inject({ method: "POST", url: "/%77riteFile", payload: { path: "noname.js", data: [0] } })).statusCode, 403);
		assert.equal(await fs.readFile(path.join(dirname, "noname.js"), "utf8"), "export const game = {};");
		assert.deepEqual(await fs.readdir(dirname), ["extension", "noname.js"]);
	} finally {
		await app.close();
		await fs.rm(dirname, { recursive: true, force: true });
	}
});
