const bundledExtensions = [
  { name: "十周年UI", runtime: "web" },
  { name: "天庭", runtime: "web" },
  { name: "全能搜索", runtime: "web" },
  { name: "斗转星移", runtime: "web" },
  { name: "千幻聆音", runtime: "web" },
  { name: "皮肤切换", runtime: "web" },
  { name: "奇妙工具", runtime: "web" },
  { name: "自用美化", runtime: "web" },
  { name: "懒人包", runtime: "web" },
  { name: "应用配置", runtime: "electron" },
  { name: "拖拽读取", runtime: "electron" }
];
const electronExtensions = new Set(bundledExtensions.filter((extension) => extension.runtime === "electron").map((extension) => extension.name));
function supportsExtension(name, hasElectron) {
  return hasElectron || !electronExtensions.has(name);
}
export {
  bundledExtensions,
  supportsExtension
};
