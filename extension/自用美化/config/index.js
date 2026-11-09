import { lib } from "../../../noname.js";

export async function config() {
	const baseUrl = `${lib.assetURL}extension/自用美化/`;
	const extensionInfo = await lib.init.promises.json(`${baseUrl}info.json`);

	return {
		title_version: {
			name: `<font size='4'>版本号：${extensionInfo.version}联机版</font>`,
			clear: true,
		},
		onlineMode: {
			name: "●联机生效",
			intro: "开启后，手杀美化框会在联机对局中生效（不依赖房主是否安装本扩展或者十周年UI），重启游戏生效。",
			init: true,
		},
		pindian: {
			name: "手杀拼点框",
			intro: "仿手杀拼点",
			init: true,
		},
		panding: {
			name: "手杀判定框",
			intro: "仿手杀判定",
			init: true,
		},
		shunshou: {
			name: "手杀拆顺框",
			intro: "手杀样式，含移动场上牌的界面",
			init: true,
		},
		wuguUI: {
			name: "手杀五谷框",
			intro: "仿手杀五谷丰登框，改自选牌美化扩展，作者：提醒喝药小助手。",
			init: true,
		},
		deckMoveUI: {
			name: "手杀观星框",
			intro: "仿手杀观星等技能弹框样式，本功能作者：子琪。",
			init: true,
		},
		poxiUI: {
			name: "手杀魄袭框",
			intro: "仿手杀魄袭/窥机弹框样式。",
			init: true,
		},
		shoushaUI: {
			name: "手杀印牌框",
			intro: "仿手杀转化牌 / 印牌虚拟牌入手的样式 改自缘之空扩展，作者：空",
			init: true,
		},

		directRecast: {
			name: "手杀重铸",
			intro: "选中可重铸的牌（如铁索连环）后，确认栏才会出现重铸按钮；点击按钮直接重铸选中的牌，无需再选一次。",
			init: true,
		},
		paixuBtn: {
			name: "手杀排序",
			intro: "需要十周年UI",
			init: true,
		},
		numberPick: {
			name: "手杀选数",
			intro: "选数字的弹框改为手杀风格加减号选择器，如势邓艾屯田等",
			init: true,
		},
		confirmGlow: {
			name: "按钮泛白",
			intro: "仿手杀点击效果",
			init: true,
		},
		aiShunshou: {
			name: "拆顺AI随机",
			intro: "开启后，AI使用顺手牵羊/过河拆桥时无法看到你的暗手牌，只能在暗手牌中随机选择；装备区、判定区以及技能带来的合法看牌不受影响。",
			init: true,
		},
	};
}
