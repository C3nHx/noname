import { distribution, isForkRelease } from "./distribution.js";
import { checkVersion } from "./version.js";

export function selectLatestRelease(releases) {
	if (!Array.isArray(releases)) throw new Error("Invalid GitHub releases response");
	const candidates = releases.filter(release => release && !release.draft && !release.prerelease && typeof release.tag_name === "string" && isForkRelease(release.tag_name));
	candidates.sort((left, right) => checkVersion(right.tag_name, left.tag_name));
	const latest = candidates[0];
	if (!latest) return null;
	return {
		tag: latest.tag_name,
		version: latest.tag_name.replace(/^v/, ""),
		url: latest.html_url,
		assets: (latest.assets ?? []).map(asset => ({ name: asset.name, url: asset.browser_download_url, size: asset.size })),
	};
}

export async function fetchLatestRelease({ owner = distribution.owner, repository = distribution.repository, headers = {}, fetcher = globalThis.fetch } = {}) {
	const response = await fetcher(`https://api.github.com/repos/${owner}/${repository}/releases?per_page=100`, {
		headers: { Accept: "application/vnd.github+json", ...headers },
	});
	if (!response.ok) throw new Error(`GitHub release request failed: HTTP ${response.status}`);
	const release = selectLatestRelease(await response.json());
	if (!release) throw new Error("本分支还没有已发布的正式 Release");
	return release;
}
