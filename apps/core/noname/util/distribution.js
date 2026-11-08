import { parseVersion } from "./version.js";

export const distribution = Object.freeze({
	upstreamVersion: "1.11.7",
	forkId: "c3nhx",
	revision: 3,
	owner: "C3nHx",
	repository: "noname",
});

export const forkVersion = `${distribution.upstreamVersion}-${distribution.forkId}.${distribution.revision}`;
export const repositoryName = `${distribution.owner}/${distribution.repository}`;
export const repositoryURL = `https://github.com/${repositoryName}`;
export const releasesURL = `${repositoryURL}/releases`;
export const rawRepositoryURL = `https://raw.githubusercontent.com/${repositoryName}`;
export const stableRuntimeRef = "release-output";
export const runtimeRef = version => `runtime-v${String(version).replace(/^v/, "")}`;

export function isForkRelease(version) {
	try {
		const parsed = parseVersion(version);
		return parsed.parts.length === 3 && parsed.fork === distribution.forkId;
	} catch {
		return false;
	}
}

const [major, minor, patch] = distribution.upstreamVersion.split(".").map(Number);
if (!/^\d+\.\d+\.\d+$/.test(distribution.upstreamVersion) || ![major, minor, patch].every(Number.isSafeInteger) || minor >= 100 || patch >= 100 || !Number.isSafeInteger(distribution.revision) || distribution.revision < 1 || distribution.revision >= 10000) {
	throw new Error("Invalid distribution version components");
}
export const nativeVersions = Object.freeze({
	marketing: distribution.upstreamVersion,
	build: String(distribution.revision),
	windows: `${distribution.upstreamVersion}.${distribution.revision}`,
	androidCode: major * 100000000 + minor * 1000000 + patch * 10000 + distribution.revision,
});
if (nativeVersions.androidCode > 2100000000) throw new Error("Android versionCode is out of range");
