import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { forkVersion, repositoryName, runtimeRef } from "../../apps/core/noname/util/distribution.js";
import { publishRuntime } from "../publish-runtime.mjs";

function fixture(t) {
	const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "noname-publish-test-"));
	t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
	const repositoryRoot = path.join(temporary, "source");
	const origin = path.join(temporary, "origin.git");
	fs.mkdirSync(repositoryRoot);
	const git = (...args) => execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
	git("init", "--bare", origin);
	git("init", "-b", "main");
	git("config", "user.name", "test");
	git("config", "user.email", "test@example.invalid");
	git("config", "core.autocrlf", "false");
	git("remote", "add", "origin", origin);
	fs.writeFileSync(path.join(repositoryRoot, ".gitignore"), "/dist/\n");
	fs.writeFileSync(path.join(repositoryRoot, "source-only.txt"), "source\n");
	git("add", ".");
	git("commit", "-m", "source fixture");
	const head = git("rev-parse", "HEAD");
	const directory = path.join(repositoryRoot, "dist");
	fs.mkdirSync(path.join(directory, "game"), { recursive: true });
	fs.mkdirSync(path.join(directory, "noname"));
	fs.writeFileSync(path.join(directory, "index.html"), "runtime\n");
	fs.writeFileSync(path.join(directory, "noname/entry.js"), "export const runtime = true;\n");
	fs.writeFileSync(path.join(directory, ".nomedia"), "");
	fs.writeFileSync(path.join(directory, "game/build-info.json"), JSON.stringify({ version: forkVersion, repository: repositoryName, channel: "release", commit: head }));
	return { repositoryRoot, directory, git, head };
}

test("publishing compiled files preserves source checkout and hidden runtime files", t => {
	const data = fixture(t);
	publishRuntime({ ...data, ref: "build-output" });
	assert.equal(data.git("rev-parse", "HEAD"), data.head);
	assert.equal(data.git("status", "--porcelain"), "");
	assert.match(data.git("ls-tree", "--name-only", "origin/build-output"), /\.nomedia/);
	assert.equal(data.git("show", "origin/build-output:index.html"), "runtime");
	assert.doesNotMatch(data.git("ls-tree", "--name-only", "origin/build-output"), /source-only/);
});

test("release runtime tags are repeatable and cannot be overwritten with different contents", t => {
	const data = fixture(t);
	const ref = runtimeRef(forkVersion);
	publishRuntime({ ...data, ref });
	const original = data.git("ls-remote", "origin", `refs/tags/${ref}`);
	publishRuntime({ ...data, ref });
	assert.equal(data.git("ls-remote", "origin", `refs/tags/${ref}`), original);
	fs.writeFileSync(path.join(data.directory, "index.html"), "changed\n");
	assert.throws(() => publishRuntime({ ...data, ref }), /different contents/);
	assert.equal(data.git("ls-remote", "origin", `refs/tags/${ref}`), original);
});

test("invalid targets and artifacts cannot publish over source branches", t => {
	const data = fixture(t);
	assert.throws(() => publishRuntime({ ...data, ref: "main" }), /Invalid runtime ref/);
	assert.throws(() => publishRuntime({ ...data, ref: "runtime-v1.11.8-c3nhx.1" }), /Invalid runtime ref/);
	fs.writeFileSync(path.join(data.directory, "game/build-info.json"), JSON.stringify({ version: forkVersion, repository: repositoryName, channel: "test" }));
	assert.throws(() => publishRuntime({ ...data, ref: runtimeRef(forkVersion) }), /release build metadata/);
});
