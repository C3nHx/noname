import { build as buildElectron, Platform, Arch, type PackagerOptions, type Configuration } from "electron-builder";
import { build as buildVite } from "vite";
import { forkVersion, nativeVersions } from "../core/noname/util/distribution.js";
import { copyFile } from "node:fs/promises";

async function main(targets: PackagerOptions["targets"], config: Partial<Configuration> = {}) {
	const appPaths = await buildElectron({
		config: {
			asar: false,
			appId: "com.libnoname.noname",
			productName: "noname",
			buildVersion: nativeVersions.windows,
			directories: {
				output: "../../output",
			},
			files: [{ from: "dist", to: "" }, { from: "../../dist", to: "" }, { from: "../../dist/node_modules", to: "node_modules" }, "package.json"],
			extraMetadata: {
				main: "app/main.js",
				version: forkVersion,
			},
			...config,
		},
		targets,
	});
	console.log("打包完成");
}

await buildVite();
await copyFile("noname.ico", "dist/app/noname.ico");

switch (process.argv[2]) {
	case "dir":
		await main(Platform.WINDOWS.createTarget("dir", Arch.x64), { win: { signAndEditExecutable: false } });
		break;
	case "win":
		main(Platform.WINDOWS.createTarget("nsis", Arch.x64), {
			win: {
				verifyUpdateCodeSignature: false,
				icon: "noname.ico",
			},
			nsis: {
				oneClick: false,
				allowToChangeInstallationDirectory: true,
			},
		});
		break;
	case "linux":
		main(Platform.LINUX.createTarget("AppImage", Arch.x64));
		break;
	case "macos":
		main(Platform.MAC.createTarget("dmg", Arch.arm64, Arch.x64), {
			mac: {
				identity: null,
				bundleVersion: nativeVersions.build,
				bundleShortVersion: nativeVersions.marketing,
			},
		});
		break;
	default:
		console.log("未知平台:", process.argv[2]);
}
