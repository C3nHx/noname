import { rawRepositoryURL, stableRuntimeRef, runtimeRef } from "../util/distribution.js";
const updateURLs = {
  coding: rawRepositoryURL,
  github: rawRepositoryURL
};
function getRuntimeURL(base, mode, version) {
  const previousSources = ["https://unitedrhythmized.club/libccy/noname", "https://raw.githubusercontent.com/libnoname/noname"];
  const root = (base || rawRepositoryURL).replace(/\/+$/, "");
  const source = previousSources.includes(root) ? rawRepositoryURL : root;
  return `${source}/${mode === "nodev" ? runtimeRef(version) : stableRuntimeRef}/`;
}
export {
  getRuntimeURL,
  updateURLs
};
