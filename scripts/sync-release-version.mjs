import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { distribution, forkVersion, nativeVersions } from "../apps/core/noname/util/distribution.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
const edits = [
	["apps/core/package.json", /("version"\s*:\s*")[^"]+("\s*,)/, `$1${forkVersion}$2`],
	["apps/electron/package.json", /("version"\s*:\s*")[^"]+("\s*,)/, `$1${forkVersion}$2`],
	["apps/core/game/update.js", /(version:\s*")[^"]+("\s*,)/, `$1${forkVersion}$2`],
	["apps/mobile/native/android/app/build.gradle.kts", /versionCode = \d+/, `versionCode = ${nativeVersions.androidCode}`],
	["apps/mobile/native/android/app/build.gradle.kts", /versionName = "[^"]+"/, `versionName = "${forkVersion}"`],
	["apps/mobile/native/ios/App/App.xcodeproj/project.pbxproj", /MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${nativeVersions.marketing};`],
	["apps/mobile/native/ios/App/App.xcodeproj/project.pbxproj", /CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${nativeVersions.build};`],
];
let stale = false;
for (const [relative, pattern, replacement] of edits) {
	const target = path.join(root, relative);
	const content = fs.readFileSync(target, "utf8");
	if (!content.match(pattern)) throw new Error(`Missing version field in ${relative}`);
	const updated = content.replace(pattern, replacement);
	if (content !== updated) {
		if (check) {
			console.error(`Version metadata is stale: ${relative}`);
			stale = true;
		} else {
			fs.writeFileSync(target, updated);
		}
	}
}
if (stale) process.exitCode = 1;
else console.log(`${forkVersion} (upstream ${distribution.upstreamVersion}) metadata ${check ? "verified" : "synchronized"}`);
