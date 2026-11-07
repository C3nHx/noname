import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";
import { forkVersion, rawRepositoryURL, repositoryURL, runtimeRef } from "../../apps/core/noname/util/distribution.js";
import { fetchLatestRelease, selectLatestRelease } from "../../apps/core/noname/util/releases.js";
import { getRuntimeURL, updateURLs } from "../../apps/core/noname/library/update-urls.js";

const release = (tag, extra = {}) => ({ tag_name: tag, draft: false, prerelease: false, html_url: `${repositoryURL}/releases/tag/${tag}`, assets: [], ...extra });

test("only published fork releases participate in numeric revision selection", () => {
	const selected = selectLatestRelease([release("v1.12.0"), release("v1.11.7-c3nhx.2"), release("v1.11.8-c3nhx.1", { draft: true }), release("v1.11.9-c3nhx.1", { prerelease: true }), release("v1.11.7-c3nhx.10"), release("v1.11.7-c3nhx.9007199254740992")]);
	assert.equal(selected.tag, "v1.11.7-c3nhx.10");
	assert.equal(selectLatestRelease([release("v1.11.8")]), null);
});

test("the update client requests fork releases and returns uploaded assets", async t => {
	let observed;
	const assetURL = `${repositoryURL}/releases/download/v${forkVersion}/noname.core.zip`;
	const server = http.createServer((request, response) => {
		observed = { path: request.url, accept: request.headers.accept };
		response.setHeader("Content-Type", "application/json");
		response.end(
			JSON.stringify([
				release(`v${forkVersion}`, {
					zipball_url: "https://example.invalid/source-archive.zip",
					assets: [{ name: "noname.core.zip", browser_download_url: assetURL, size: 123 }],
				}),
			])
		);
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	t.after(() => new Promise(resolve => server.close(resolve)));
	let requestedURL;
	const result = await fetchLatestRelease({
		fetcher(url, options) {
			requestedURL = url;
			return fetch(`http://127.0.0.1:${server.address().port}/releases?per_page=100`, options);
		},
	});
	assert.equal(requestedURL, "https://api.github.com/repos/C3nHx/noname/releases?per_page=100");
	assert.equal(observed.path, "/releases?per_page=100");
	assert.equal(observed.accept, "application/vnd.github+json");
	assert.equal(result.assets[0].url, assetURL);
});

test("unpublished or failed release requests do not fall back to upstream", async () => {
	await assert.rejects(fetchLatestRelease({ fetcher: async () => new Response("[]", { status: 200 }) }), /Release/);
	await assert.rejects(fetchLatestRelease({ fetcher: async () => new Response("", { status: 403 }) }), /403/);
});

test("old update settings resolve compiled fork files instead of source tags", () => {
	for (const base of [updateURLs.github, updateURLs.coding, "https://raw.githubusercontent.com/libnoname/noname/", "https://unitedrhythmized.club/libccy/noname"]) {
		assert.equal(getRuntimeURL(base, undefined, forkVersion), `${rawRepositoryURL}/release-output/`);
		assert.equal(getRuntimeURL(base, "nodev", forkVersion), `${rawRepositoryURL}/${runtimeRef(forkVersion)}/`);
	}
});
