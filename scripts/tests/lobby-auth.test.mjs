import assert from "node:assert/strict";
import { test } from "node:test";

function storage() {
	const values = new Map();
	return {
		get length() {
			return values.size;
		},
		key(index) {
			return [...values.keys()][index] ?? null;
		},
		getItem(key) {
			return values.get(key) ?? null;
		},
		setItem(key, value) {
			values.set(key, String(value));
		},
		removeItem(key) {
			values.delete(key);
		},
		clear() {
			values.clear();
		},
	};
}

let moduleId = 0;
const load = () => import(`../../apps/core/noname/game/lobby-auth.js?test=${moduleId++}`);

test("authenticated lobby passwords survive a new page session and remain scoped to its address", async () => {
	globalThis.localStorage = storage();
	globalThis.sessionStorage = storage();
	const firstPage = await load();
	firstPage.rememberLobbyPassword("ws://example.test:8082/", "test-key");
	sessionStorage.clear();
	const nextPage = await load();
	assert.equal(nextPage.readLobbyPassword("ws://example.test:8082/"), "test-key");
	assert.equal(nextPage.readLobbyPassword("ws://other.test:8082/"), "");
	assert.equal(nextPage.readLobbyPassword("wss://example.test:8082/"), "");
	nextPage.forgetLobbyPassword("ws://example.test:8082/");
	assert.equal((await load()).readLobbyPassword("ws://example.test:8082/"), "");
});

test("clearing recent lobbies removes stored credentials without touching other settings", async () => {
	globalThis.localStorage = storage();
	globalThis.sessionStorage = storage();
	localStorage.setItem("game-setting", "keep");
	sessionStorage.setItem("noname:lobby-password:ws://legacy.test/", "old-key");
	const page = await load();
	page.rememberLobbyPassword("ws://example.test/", "test-key");
	page.forgetAllLobbyPasswords();
	assert.equal(page.readLobbyPassword("ws://example.test/"), "");
	assert.equal((await load()).readLobbyPassword("ws://legacy.test/"), "");
	assert.equal(localStorage.getItem("game-setting"), "keep");
});

test("unavailable persistent storage still permits session authentication", async () => {
	globalThis.localStorage = {
		getItem() {
			throw new Error("disabled");
		},
		setItem() {
			throw new Error("disabled");
		},
		removeItem() {
			throw new Error("disabled");
		},
	};
	globalThis.sessionStorage = storage();
	const page = await load();
	page.rememberLobbyPassword("ws://example.test/", "test-key");
	assert.equal((await load()).readLobbyPassword("ws://example.test/"), "test-key");
	page.forgetLobbyPassword("ws://example.test/");
	assert.equal((await load()).readLobbyPassword("ws://example.test/"), "");
});
