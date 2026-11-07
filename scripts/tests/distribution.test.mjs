import assert from "node:assert/strict";
import test from "node:test";
import { checkVersion, parseVersion } from "../../apps/core/noname/util/version.js";
import { distribution, forkVersion, isForkRelease, nativeVersions } from "../../apps/core/noname/util/distribution.js";

test("fork revisions advance within an upstream baseline", () => {
	assert.equal(checkVersion("1.11.7-c3nhx.1", "1.11.7"), 1);
	assert.equal(checkVersion("v1.11.7-c3nhx.10", "1.11.7-c3nhx.2"), 1);
	assert.equal(checkVersion("1.11.7-c3nhx.1", "v1.11.7-c3nhx.1"), 0);
	assert.equal(checkVersion("1.11.7-c3nhx.99", "1.11.8"), -1);
	assert.equal(checkVersion("1.11.7-c3nhx.1", "1.11.6.1"), 1);
});

test("existing numeric extension and runtime versions remain comparable", () => {
	assert.equal(checkVersion("13", "13.0.0"), 0);
	assert.equal(checkVersion("10.12.0", "12.10.0"), -1);
	assert.equal(checkVersion("v1.2.3-2", "1.2.3.1"), 1);
	assert.equal(checkVersion("9.26", "9.9"), 1);
});

test("malformed versions and unrelated fork revisions are rejected", () => {
	for (const input of ["", "1..2", "1.2.", "1.11.7-c3nhx.0", "nightly", "1.11.7-c3nhx.9007199254740992"]) {
		assert.throws(() => parseVersion(input));
	}
	assert.throws(() => checkVersion("1.11.7-other.1", forkVersion), /different forks/);
	assert.equal(isForkRelease("v1.11.7-c3nhx.1"), true);
	assert.equal(isForkRelease("v1.11.7"), false);
	assert.equal(isForkRelease("runtime-v1.11.7-c3nhx.1"), false);
});

test("native package fields preserve platform version requirements", () => {
	assert.equal(forkVersion, `${distribution.upstreamVersion}-c3nhx.${distribution.revision}`);
	assert.match(nativeVersions.marketing, /^\d+\.\d+\.\d+$/);
	assert.match(nativeVersions.build, /^[1-9]\d*$/);
	assert.match(nativeVersions.windows, /^\d+\.\d+\.\d+\.\d+$/);
	assert.equal(nativeVersions.androidCode, 111070001);
});
