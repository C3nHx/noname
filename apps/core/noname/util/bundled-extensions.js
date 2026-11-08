export const bundledExtensions = [
	{ name: "十周年UI", runtime: "web" },
	{ name: "全能搜索", runtime: "web" },
	{ name: "斗转星移", runtime: "web" },
	{ name: "千幻聆音", runtime: "web" },
	{ name: "皮肤切换", runtime: "web", requires: ["千幻聆音"] },
	{ name: "自用美化", runtime: "web" },
	{ name: "懒人包", runtime: "web" },
	{ name: "应用配置", runtime: "electron" },
	{ name: "拖拽读取", runtime: "electron" },
];

const electronExtensions = new Set(bundledExtensions.filter(extension => extension.runtime === "electron").map(extension => extension.name));
const retiredExtensions = new Set(["天庭", "奇妙工具"]);

export function supportsExtension(name, hasElectron) {
	return !retiredExtensions.has(name) && (hasElectron || !electronExtensions.has(name));
}

export function hasBundledResources(name, isReady) {
	const extension = bundledExtensions.find(extension => extension.name === name);
	return !extension || (isReady(name) && (extension.requires ?? []).every(dependency => hasBundledResources(dependency, isReady)));
}
