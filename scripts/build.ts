import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { splitRuntimeResources } from "./resource-packs.mjs";
import { loadBuildResourceKey } from "./resource-key.mjs";
const resourceKey = await loadBuildResourceKey(process.cwd());
for (const command of ["pnpm -F noname... build", "pnpm -F ./packages/extension/** build"]) {
	const result = spawnSync(command, { shell: true, stdio: "inherit" });
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("合并打包结果");
await fs.rm("dist", { recursive: true, force: true });
await fs.mkdir("dist", { recursive: true });
await Promise.all([fs.cp("apps/core/audio", "dist/audio", { recursive: true }), fs.cp("apps/core/image", "dist/image", { recursive: true }), fs.cp("apps/core/extension", "dist/extension", { recursive: true }), fs.cp("docs", "dist/docs", { recursive: true, filter: source => path.basename(source) !== "web-deployment.md" }), fs.cp(".nomedia", "dist/.nomedia"), fs.cp("LICENSE", "dist/LICENSE"), fs.cp("README.md", "dist/README.md")]);
await fs.cp("apps/core/dist", "dist", { recursive: true });
console.log(await splitRuntimeResources({ directory: "dist", resourceDirectory: "output/resource-packs", fullDirectory: "output/runtime-full", key: resourceKey, profile: process.argv.includes("--full") ? "full" : "lite", ...(process.env.NONAME_RESOURCE_ROOT_URL ? { rootURL: process.env.NONAME_RESOURCE_ROOT_URL } : {}), ...(process.env.NONAME_RESOURCE_BASE_URL ? { baseURL: process.env.NONAME_RESOURCE_BASE_URL } : {}), ...(process.env.NONAME_RESOURCE_DELIVERY_URL ? { deliveryURL: process.env.NONAME_RESOURCE_DELIVERY_URL } : {}) }));
