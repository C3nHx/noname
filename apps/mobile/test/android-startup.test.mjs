import assert from "node:assert/strict";
import { mock, test } from "node:test";

const calls = [];
const plugin = {
	hasAccess: async () => ({ granted: false }),
	requestAccess: async () => {
		calls.push("requestAccess");
		throw new Error("未选择游戏目录");
	},
	statEntry: async ({ entryName }) => ({ type: entryName === "noname.js" ? "file" : "none" }),
};

mock.module("@capacitor/core", {
	namedExports: { registerPlugin: () => plugin },
});

const { initializeAndroid } = await import("../src/platform/android.ts");

test("packaged Android resources load without selecting an external directory", async () => {
	const { fs } = await initializeAndroid();
	assert.deepEqual(await fs.statEntry({ entryName: "noname.js" }), { type: "file" });
	assert.deepEqual(calls, []);
});
