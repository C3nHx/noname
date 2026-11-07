import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { forkVersion, repositoryName, runtimeRef } from "../apps/core/noname/util/distribution.js";

export function publishRuntime({ repositoryRoot, directory, ref }) {
	const immutable = ref.startsWith("runtime-");
	if (!(ref === "build-output" || ref === "release-output" || ref === runtimeRef(forkVersion))) {
		throw new Error(`Invalid runtime ref: ${ref}`);
	}
	const info = JSON.parse(fs.readFileSync(path.join(directory, "game/build-info.json"), "utf8"));
	if ((immutable || ref === "release-output") && info.channel !== "release") throw new Error("A release runtime requires release build metadata");
	if (info.version !== forkVersion || info.repository !== repositoryName || !fs.existsSync(path.join(directory, "index.html")) || !fs.existsSync(path.join(directory, "noname/entry.js"))) {
		throw new Error("Runtime output does not match this fork release");
	}
	const run = (args, options = {}) => execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8", ...options }).trim();
	const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "noname-runtime-"));
	try {
		const env = {
			...process.env,
			GIT_DIR: run(["rev-parse", "--absolute-git-dir"]),
			GIT_WORK_TREE: directory,
			GIT_INDEX_FILE: path.join(temporary, "index"),
			GIT_AUTHOR_NAME: "github-actions[bot]",
			GIT_AUTHOR_EMAIL: "github-actions[bot]@users.noreply.github.com",
			GIT_COMMITTER_NAME: "github-actions[bot]",
			GIT_COMMITTER_EMAIL: "github-actions[bot]@users.noreply.github.com",
		};
		const staged = args => run(args, { cwd: directory, env });
		staged(["read-tree", "--empty"]);
		staged(["add", "--all", "--force"]);
		const tree = staged(["write-tree"]);
		const target = `refs/${immutable ? "tags" : "heads"}/${ref}`;
		if (immutable && run(["ls-remote", "origin", target])) {
			run(["fetch", "--depth=1", "origin", target]);
			if (run(["rev-parse", "FETCH_HEAD^{tree}"]) !== tree) throw new Error(`Runtime tag ${ref} already has different contents`);
			return;
		}
		const commit = staged(["commit-tree", tree, "-m", `Publish ${ref} from ${info.commit}`]);
		run(["push", ...(immutable ? [] : ["--force"]), "origin", `${commit}:${target}`]);
	} finally {
		fs.rmSync(temporary, { recursive: true, force: true });
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
	publishRuntime({ repositoryRoot, directory: path.join(repositoryRoot, "dist"), ref: process.argv[2] ?? "build-output" });
}
