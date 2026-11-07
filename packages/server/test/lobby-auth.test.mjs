import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { WebSocket } from "ws";
import { createServer } from "../dist/index.js";

const password = "test-only-大厅-secret";
const { AbortSignal } = globalThis;

async function availablePort() {
	const reservation = net.createServer();
	reservation.listen(0, "127.0.0.1");
	await once(reservation, "listening");
	const port = reservation.address().port;
	await new Promise(resolve => reservation.close(resolve));
	return port;
}

async function startLobby(t, options = {}) {
	const port = await availablePort();
	const server = createServer({ port, ...options });
	await server.start();
	t.after(() => server.stop());
	return { server, url: `ws://127.0.0.1:${port}` };
}

async function connect(url) {
	const socket = new WebSocket(url);
	const messages = [];
	socket.on("message", data => messages.push(JSON.parse(data.toString())));
	await once(socket, "open");
	return {
		socket,
		messages,
		send: (...args) => socket.send(JSON.stringify(args)),
		async next() {
			if (!messages.length) {
				await once(socket, "message", { signal: AbortSignal.timeout(15000) });
			}
			return messages.shift();
		},
	};
}

async function authenticate(client, key) {
	assert.deepEqual(await client.next(), ["lobby_auth_required"]);
	client.send("server", "lobby_auth", password);
	const roomlist = await client.next();
	assert.equal(roomlist[0], "roomlist");
	client.send("server", "key", [key, "test-version"]);
	return roomlist;
}

test("public lobbies retain the old room creation and join protocol", async t => {
	const { url } = await startLobby(t);
	const owner = await connect(url);
	assert.equal((await owner.next())[0], "roomlist");
	owner.send("server", "key", ["owner", "test-version"]);
	owner.send("server", "create", "owner", "Host", "caocao");
	assert.deepEqual(await owner.next(), ["createroom", "owner"]);
	const guest = await connect(url);
	const roomlist = await guest.next();
	assert.equal(roomlist[0], "roomlist");
	owner.send("server", "config", { mode: "identity" });
	const rooms = await guest.next();
	assert.equal(rooms[0], "updaterooms");
	assert.equal(rooms[1][0][4], "owner");
	guest.send("server", "key", ["guest", "test-version"]);
	guest.send("server", "enter", "owner", "Guest", "caocao");
	const notification = await owner.next();
	assert.equal(notification[0], "onconnection");
	guest.send("game-message");
	assert.deepEqual(await owner.next(), ["onmessage", notification[1], '["game-message"]']);
});

test("only authenticated clients see or appear in the protected lobby", async t => {
	const { url } = await startLobby(t, { lobbyPassword: password });
	const owner = await connect(url);
	await authenticate(owner, "owner");
	const pending = await connect(url);
	assert.deepEqual(await pending.next(), ["lobby_auth_required"]);
	owner.send("server", "status", "ready");
	const clients = await owner.next();
	assert.equal(clients[0], "updateclients");
	assert.equal(clients[1].length, 1);
	assert.deepEqual(pending.messages, []);
	pending.send("server", "lobby_auth", password);
	const roomlist = await pending.next();
	assert.equal(roomlist[0], "roomlist");
	assert.equal(roomlist[3].length, 2);
	pending.send("server", "key", ["guest", "test-version"]);
	pending.send("server", "status", "authenticated");
	assert.equal((await pending.next())[0], "updateclients");
});

for (const [name, payload] of [
	["missing password", ["server", "lobby_auth", ""]],
	["wrong password", ["server", "lobby_auth", "incorrect"]],
	["non-string password", ["server", "lobby_auth", {}]],
	["old identity handshake", ["server", "key", ["owner", "test-version"]]],
	["room creation", ["server", "create", "owner", "Host", "caocao"]],
	["room entry", ["server", "enter", "owner", "Guest", "caocao"]],
	["client updates", ["server", "status", "bypass"]],
	["heartbeat", "heartbeat"],
	["malformed JSON", "{"],
]) {
	test(`unauthenticated ${name} is rejected without lobby data`, async t => {
		const { url } = await startLobby(t, { lobbyPassword: password });
		const client = await connect(url);
		assert.deepEqual(await client.next(), ["lobby_auth_required"]);
		const closed = once(client.socket, "close");
		client.socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
		client.send("server", "lobby_auth", password);
		assert.deepEqual(await client.next(), ["denied", "lobby_auth"]);
		assert.equal((await closed)[0], 1008);
		assert.deepEqual(client.messages, []);
	});
}

test("a silent connection times out without receiving the lobby", { timeout: 15000 }, async t => {
	const { url } = await startLobby(t, { lobbyPassword: password });
	const client = await connect(url);
	assert.deepEqual(await client.next(), ["lobby_auth_required"]);
	const closed = once(client.socket, "close");
	assert.deepEqual(await client.next(), ["denied", "lobby_timeout"]);
	assert.equal((await closed)[0], 1008);
	assert.deepEqual(client.messages, []);
});

test("stopping a lobby also closes pending authentication connections", async t => {
	const { server, url } = await startLobby(t, { lobbyPassword: password });
	const client = await connect(url);
	assert.deepEqual(await client.next(), ["lobby_auth_required"]);
	const closed = once(client.socket, "close", { signal: AbortSignal.timeout(2000) });
	await server.stop();
	await closed;
});

test("an explicitly empty password cannot silently create a public lobby", () => {
	assert.throws(() => createServer({ lobbyPassword: "" }), /LOBBY_PASSWORD must not be empty/);
});

test("the CLI enforces the environment password without logging it", { timeout: 10000 }, async t => {
	const port = await availablePort();
	const child = spawn(process.execPath, [fileURLToPath(new URL("../dist/cli.js", import.meta.url))], {
		env: { ...process.env, PORT: String(port), LOBBY_PASSWORD: password },
		windowsHide: true,
	});
	t.after(async () => {
		if (child.exitCode === null && child.signalCode === null) {
			const exited = once(child, "exit");
			child.kill();
			await exited;
		}
	});
	const [output] = await once(child.stdout, "data", { signal: AbortSignal.timeout(5000) });
	assert.match(output.toString(), /Server listening on port/);
	assert.equal(output.toString().includes(password), false);
	const client = await connect(`ws://127.0.0.1:${port}`);
	await authenticate(client, "cli-client");
});
