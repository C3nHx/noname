/**
 * @fileoverview 扩展配置项定义
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createCollapseTitle, createCollapseEnd } from "../utils.js";
import { onNewDecadeStyleClick, onNewDecadeStyleUpdate } from "../handlers/appearance-handlers.js";

/**
* zq修改添加
* @type {Object}
*/
export const zq_title = createCollapseTitle("zq_title", "美化补充");
/**
 * 切换样式配置
 * @type {Object}
 */
export const newDecadeStyle = {
	name: "●切换样式",
	intro: "切换武将边框样式和界面布局，选择不同设置后游戏会自动重启，电脑端支持alt+123456快捷切换",
	init: "off",
	item: {
		off: "<b><font color=80FFFF>移动版",
		on: "<b><font color=gold>十周年",
		othersOff: "<b><font color=\"#FFBB77\">一将成名",
		onlineUI: "<b><font color=\"#99FF75\">online",
		babysha: "<b><font color=\"pink\">欢乐三国杀",
		codename: "<b><font color=\"#AAAAFF\">名将杀",
	},
	onclick: onNewDecadeStyleClick,
	update: onNewDecadeStyleUpdate,
};
export const smallsuit = {
    name: "缩小花色",
    intro: "开启后，可以缩小卡牌花色，解决webview版本不同导致的显示差异",
    init: false,
};
export const shoushatexiao = {
    name: "播报特效",
    intro: "开启后，游戏内将有连续击杀特效等，如一破卧龙出山",
    init: true,
};
export const kapaitexiao = {
    name: "卡牌特效",
    intro: "开启后，游戏内将有游戏开始特效和手杀样式的卡牌使用特效，关闭特效可减少游戏卡顿",
    init: true,
};
export const juexingji = {
    name: "觉醒特效",
    intro: "开启后，将有限定技、觉醒技、使命技特效，样式根据全局美化风格自行切换，重启生效",
    init: true,
};
export const shuangjiang = {
    name: "副将边框",
    intro: "开启后，国战和双将模式有手杀样式副将边框。",
    init: true,
};
export const xuanjiang = {
	name: "手杀选将",
	intro: "手杀样式选将框美化，重启生效",
	init: true,
};
export const ssjiaobiao = {
	name: "手杀角标",
	intro: "开启后，武将右下角将有角标。",
	init: true,
};
export const equipments = {
    name: "手杀装备",
    intro: "开启后，将有手杀样式装备栏，需要关闭单独装备栏。",
    init: true,
};
export const pause = {
	name: "手杀记录",
	init: true,
	intro: "子琪改自凌梦大佬的星之梦扩展。注意：将“设置-显示-标记身份操作”设置为【菜单】<br>补充：开启“设置-显示-暂停时显示弃牌堆”，可以显示弃牌堆",
};

/*export const fgx0 = {
	name: '<b><font color="#00BFFF">---------美化补充---------',
	intro: "",
	init: true,
	clear: true,
	onclick: () => {
		game.playAudio("..", "extension", "十周年UI/audio", "bbkb");
	},
};*/

export const zq_title_end = createCollapseEnd("zq_title");

/**
 * 修改配置集合
 * @type {Object}
 */
export const zqConfigs = {
	zq_title,
	newDecadeStyle,
	smallsuit,
	equipments,
	xuanjiang,
	ssjiaobiao,
	pause,
	shoushatexiao,
	kapaitexiao,
	juexingji,
	shuangjiang,
	
	//fgx0,
	zq_title_end,
};

