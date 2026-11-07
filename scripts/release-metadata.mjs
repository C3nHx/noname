import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { forkVersion, isForkRelease, repositoryName, runtimeRef } from "../apps/core/noname/util/distribution.js";
import { checkVersion } from "../apps/core/noname/util/version.js";
import { selectLatestRelease } from "../apps/core/noname/util/releases.js";

const tag = process.argv[2];
if (!isForkRelease(tag) || tag !== `v${forkVersion}`) throw new Error(`Expected release tag v${forkVersion}`);
if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== repositoryName) {
	throw new Error(`Release repository must be ${repositoryName}`);
}
let latest = null;
if (!process.argv.includes("--offline")) {
	const data = execFileSync("gh", ["api", `repos/${repositoryName}/releases?per_page=100`], { encoding: "utf8" });
	latest = selectLatestRelease(JSON.parse(data));
}
const values = {
	version: forkVersion,
	tag,
	repository: repositoryName,
	runtime_ref: runtimeRef(forkVersion),
	is_latest_release: String(!latest || checkVersion(forkVersion, latest.version) >= 0),
};
if (process.env.GITHUB_OUTPUT)
	appendFileSync(
		process.env.GITHUB_OUTPUT,
		Object.entries(values)
			.map(([key, value]) => `${key}=${value}\n`)
			.join("")
	);
console.log(JSON.stringify(values, null, 2));
