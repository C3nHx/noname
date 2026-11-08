import { parseVersion } from "./version.js";
const distribution = Object.freeze({
  upstreamVersion: "1.11.7",
  forkId: "c3nhx",
  revision: 1,
  owner: "C3nHx",
  repository: "noname"
});
const forkVersion = `${distribution.upstreamVersion}-${distribution.forkId}.${distribution.revision}`;
const repositoryName = `${distribution.owner}/${distribution.repository}`;
const repositoryURL = `https://github.com/${repositoryName}`;
const releasesURL = `${repositoryURL}/releases`;
const rawRepositoryURL = `https://raw.githubusercontent.com/${repositoryName}`;
const stableRuntimeRef = "release-output";
const runtimeRef = (version) => `runtime-v${String(version).replace(/^v/, "")}`;
function isForkRelease(version) {
  try {
    const parsed = parseVersion(version);
    return parsed.parts.length === 3 && parsed.fork === distribution.forkId;
  } catch {
    return false;
  }
}
const [major, minor, patch] = distribution.upstreamVersion.split(".").map(Number);
if (!/^\d+\.\d+\.\d+$/.test(distribution.upstreamVersion) || ![major, minor, patch].every(Number.isSafeInteger) || minor >= 100 || patch >= 100 || !Number.isSafeInteger(distribution.revision) || distribution.revision < 1 || distribution.revision >= 1e4) {
  throw new Error("Invalid distribution version components");
}
const nativeVersions = Object.freeze({
  marketing: distribution.upstreamVersion,
  build: String(distribution.revision),
  windows: `${distribution.upstreamVersion}.${distribution.revision}`,
  androidCode: major * 1e8 + minor * 1e6 + patch * 1e4 + distribution.revision
});
if (nativeVersions.androidCode > 21e8) throw new Error("Android versionCode is out of range");
export {
  distribution,
  forkVersion,
  isForkRelease,
  nativeVersions,
  rawRepositoryURL,
  releasesURL,
  repositoryName,
  repositoryURL,
  runtimeRef,
  stableRuntimeRef
};
