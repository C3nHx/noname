/**●
 * @fileoverview Lbtn模块加载器
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createLbtnPlugin } from "./plugin.js";
// import { registerPlugin } from "../utils.js";

// createLbtnPlugin(window.lib, window.game, window.ui, window.get, window.ai, window._status, window.app)
// 	.then(registerPlugin)
// 	.catch(e => console.error("[十周年UI] Lbtn模块加载失败:", e));
try {
	const plugin = createLbtnPlugin(window.lib, window.game, window.ui, window.get, window.ai, window._status, window.app);
	if (plugin) {
		if (plugin.name) window.app.pluginsMap[plugin.name] = plugin;
		if (plugin.precontent && (!plugin.filter || plugin.filter())) {
			plugin.precontent();
		}
		window.app.plugins.push(plugin);
	}
} catch (e) {
	console.error("[十周年UI] Lbtn模块加载失败:", e);
}