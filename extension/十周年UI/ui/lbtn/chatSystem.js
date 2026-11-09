/**
 * @fileoverview 聊天系统模块
 * 合并了chat.js和chatSystem.js的功能，提供游戏内聊天、表情、投掷等交互功能
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { hideDialog as hideDialogUtil, addClickEffect as addClickEffectUtil } from "../utils.js";

// ==================== 常量 ====================
//const MAX_CHAT_RECORDS = 50;
const DIALOG_HIDE_DELAY = 1000;
const DIALOG_LIFESAY_HIDE_DELAY = 100;
const DIALOG_ANIMATION_DELAY = 50;/*★ 100→50：弹窗出现动画加快一倍 */
const XUWU_COUNT = 10;
const XUWU_DELAY = 100;

//●投掷物品配置
export const THROW_ITEMS = [
	{ name: "meijiu", left: "-155px", bottom: "150px", image: "meijiu", label: "酒杯", emotionType: "wine" },
	{ name: "xianhua", left: "-230px", bottom: "150px", image: "xianhua", label: "鲜花", emotionType: "flower" },
	{ name: "tuoxie", left: "-155px", bottom: "82px", image: "tuoxie", label: "拖鞋", emotionType: "shoe" },
	{ name: "jidan", left: "-230px", bottom: "82px", image: "jidan", label: "鸡蛋", emotionType: "egg" },
	{ name: "cailan", left: "-80px", bottom: "150px", image: "cailan", label: "宝珠", emotionType: "baozhu" },
	{ name: "qicai", left: "-155px", bottom: "13px", image: "qicai", label: "烟花", emotionType: "yanhua" },
	{ name: "xiaojiu", left: "-230px", bottom: "13px", image: "xiaojiu", label: "灯笼", emotionType: "denglong" },
	{ name: "xueqiu", left: "-80px", bottom: "82px", image: "xueqiu", label: "雪球", emotionType: "snow" },
];

const THROW_ITEM_NAMES = ["jidan", "tuoxie", "xianhua", "meijiu", "cailan", "qicai", "xiaojiu", "xueqiu", "xuwu"];

// ==================== 工具函数 ====================

/**
 * 获取当前玩家
 * @returns {Object|null} 当前玩家对象
 */
export function getCurrentPlayer() {
	if (game.me) return game.me;
	if (game.connectPlayers) {
		return game.online ? game.connectPlayers.find(p => p.playerid === game.onlineID) : game.connectPlayers[0];
	}
	return null;
}

//★【新增】取玩家座位号（兼容游戏还没开始、座位尚未分配的情况：seatNum 只有开局后才会有）
/**
 * @param {Object} player - 玩家对象（联机房间阶段可能是连接玩家）
 * @returns {number} 座位号；取不到时返回 0
 */
function getSeatNumber(player) {
	let seat = 0;
	try {
		if (typeof player.getSeatNum === "function") seat = Number(player.getSeatNum()) || 0;
		if (!seat && typeof player.seatNum === "number") seat = player.seatNum;
		if (!seat && game && Array.isArray(game.connectPlayers)) {
			const idx = game.connectPlayers.indexOf(player);
			if (idx >= 0) seat = idx + 1;
		}
	} catch (e) {}
	return seat > 0 ? seat : 0;
}

//★【新增】取发言者标签，弹幕与聊天记录用同一套：
//  已选将/游戏进行中 → 武将名；游戏还没开始（还没有武将名）→ 「N号位」。
//  只在本机（房主端）计算，算出的纯文本再由 game.broadcastAll 下发各端渲染，昵称相同的玩家也能分清。
/**
 * @param {Object} player - 发言玩家
 * @returns {{prefix: string, nickname: string}} prefix 为武将名或座位号（都没有时为空串）
 */
export function getSpeakerInfo(player) {
	if (!player) return { prefix: "", nickname: "" };
	const nickname = player.nickname ? String(player.nickname) : "";
	let prefix = "";

	// ① 武将名：游戏进行中 / 已完成选将时 player.name 才是真实武将
	const raw = player.name == null ? "" : String(player.name);
	// 本体约定：未选将 / 隐藏身份时 name 以 "unknown" 开头（见 player.js 的 startsWith("unknown") 判断）
	const hasName = !!raw && !raw.startsWith("unknown");
	const started = !!(game && Array.isArray(game.players) && game.players.includes(player));
	const isHeroName = hasName && !!(get.character && get.character(raw));
	if (isHeroName || (started && hasName)) {
		try {
			prefix = (get.slimNameHorizontal && get.slimNameHorizontal(raw)) || get.translation(raw) || raw;
		} catch (e) {
			prefix = raw;
		}
	}

	// ② 还没有武将名：退回座位号区分（游戏未开始 / 选将前）
	if (!prefix) {
		const seat = getSeatNumber(player);
		if (seat > 0) prefix = `${get.cnNumber(seat, true)}号位`;
	}

	return { prefix, nickname };
}

/**
 * 武将台词语音广播：各端用本机语音文件各自播放（与「固定常用语」同一套模型——每端本地播放）。
 * ※ 本函数会经 game.broadcastAll 序列化后下发（含未装本扩展的客机），
 *   所以函数体内只能引用全局对象（game），不能引用本模块的闭包变量。
 * @param {string} path - 语音路径（与 game.playAudio 的参数一致）
 * @returns {void}
 */
function playNzmVoice(path) {
	if (!path) return;
	if (typeof game.playAudio === "function") game.playAudio(path);
}

//★ 语音兜底：刚用 /playAudio 命令播过的台词（避免下面的文本反查再播一次，重复出声）
let _nzmVoiceMarkText = "";
let _nzmVoiceMarkAt = 0;

/**
 * 规范化台词文本，便于比对：去 HTML、把 ~（停顿符）当空格、去掉开头的「技能名」、去掉所有空白。
 * @param {string} str - 台词文本
 * @returns {string} 规范化结果
 */
function nzmVoiceTextNormalize(str) {
	return get
		.plainText(String(str || ""))
		.replace(/~/g, " ")
		.replace(/^[「【\[]([^」】\]]*)[」】\]]/, "")
		.replace(/[\s\u3000]+/g, "");
}

/**
 * 标记「这条台词刚播过」
 * @param {string} str - 台词文本
 * @returns {void}
 */
function nzmVoiceMark(str) {
	_nzmVoiceMarkText = nzmVoiceTextNormalize(str);
	_nzmVoiceMarkAt = Date.now();
}

/**
 * 这条台词是否刚被 /playAudio 播过（1.5 秒内视为同一条）
 * @param {string} str - 台词文本
 * @returns {boolean}
 */
function nzmVoiceIsJustMarked(str) {
	return !!_nzmVoiceMarkText && _nzmVoiceMarkText === nzmVoiceTextNormalize(str) && Date.now() - _nzmVoiceMarkAt < 1500;
}

/**
 * 用「发言者的武将台词表」把消息文本反查成语音文件。
 * 客机没装本扩展（或装的是旧版）时，点常用语只会把台词文本发出来，靠这里补上语音。
 * @param {Object} player - 发言者
 * @param {string} str - 消息文本
 * @returns {string|null} 语音文件路径（未做 processAudioPath 转换）
 */
function findPlayerVoicePath(player, str) {
	const target = nzmVoiceTextNormalize(str);
	if (!target) return null;
	let found = null;
	const collect = (textList, fileList) => {
		if (found || !textList || !fileList) return;
		for (let i = 0; i < textList.length; i++) {
			if (fileList[i] && nzmVoiceTextNormalize(textList[i]) === target) {
				found = fileList[i];
				return;
			}
		}
	};
	try {
		// ① 技能语音（含衍生技）——与常用语面板同一套取法
		const skills = (player.getSkills ? player.getSkills(null, false, false) : []).filter(s => !get.info(s)?.charlotte);
		const all = skills.slice();
		skills.forEach(s => {
			const info = get.info(s);
			if (info?.derivation) all.push(...(Array.isArray(info.derivation) ? info.derivation : [info.derivation]));
		});
		for (const s of [...new Set(all)]) {
			if (found) break;
			if (!get.info(s)) continue;
			try {
				const { textList, fileList } = get.Audio.skill({ skill: s, player: player.name });
				collect(textList, fileList);
			} catch (e) {}
		}
		// ② 阵亡语音
		if (!found) {
			try {
				const { textList, fileList } = get.Audio.die({ player: player.name });
				collect(textList, fileList);
			} catch (e) {}
		}
	} catch (e) {}
	return found;
}

/**
 * 武将台词语音兜底：把消息文本反查成发言者的武将台词语音，并由房主广播到各端一起播。
 * 仅补语音，弹幕/记录不受影响；刚用 /playAudio 播过的同一条会跳过。
 * @param {Object} player - 发言者
 * @param {string} str - 消息文本
 * @returns {void}
 */
function nzmBroadcastVoiceByText(player, str) {
	if (!player || typeof str !== "string" || !str) return;
	if (str.indexOf("<img") !== -1) return; // 表情不带台词
	if (nzmVoiceIsJustMarked(str)) return;
	const path = findPlayerVoicePath(player, str);
	if (!path) return;
	nzmVoiceMark(str);
	game.broadcastAll(playNzmVoice, processAudioPath(path).fullPath);
}

/**
 * 发送聊天消息
 * @param {string} message - 消息内容
 * @returns {void}
 */
export function sendChatMessage(message) {
	const player = getCurrentPlayer();
	//●● 观战发言：观战者没有 player 对象，但允许其在线发送（参考云中守望）。
	if (!player && !game.online) return;

	// 处理 /playAudio 命令
	// 格式: /playAudio <path> <text>
	// 例如: /playAudio skill/dcsb_juemou2 「绝谋」武侯遗志...
	//●● 武将台词语音：原来只在点击者本机播放，别人听不到。改为交给房主广播：
	//  · 客机：把「/playAudio 路径 台词」原样发给房主（本机不再单独播放，否则会重复出声）；
	//  · 房主：game.broadcastAll 把语音下发到房主+所有客机，各端用本机语音文件各自播放
	//    （与「固定常用语」同一个模型；未装本扩展的客机也能听到）；
	//  · 台词文本仍按普通聊天走，弹幕 / 本扩展记录 / 本体记录都不变。
	if (message.startsWith("/playAudio ")) {
		const cut = message.indexOf(" ", 11);
		const audioPath = cut !== -1 ? message.slice(11, cut) : message.slice(11);
		const displayText = cut !== -1 ? message.slice(cut + 1) : "";
		if (!audioPath) return;
		if (game.online) {
			// 客机：原样转发，由房主拆包广播（房主端见下方的 server.chat 钩子）
			game.send("chat", game.onlineID, message);
		} else {
			// 房机：直接广播，房主和所有客机一起播放
			game.broadcastAll(playNzmVoice, audioPath);
			if (displayText) {
				nzmVoiceMark(displayText); // 标记本条已播，避免下面 say 的文本反查再播一次
				player.chat(displayText);
			}
		}
		return;
	}

	if (game.online) {
		game.send("chat", game.onlineID, message);
	} else {
		player.chat(message);
	}
}

/**
 * ●投掷表情
 * @param {Object} target - 目标玩家
 * @param {string} emotionType - 表情类型
 * @returns {void}
 */
let lastTime = false;
export function throwEmotion(target, emotionType, force) {
	if (game.online) {
		game.send("throwEmotion", target, emotionType);
	} else if(!lastTime || force){
		lastTime = true;
		game.me.throwEmotion(target, emotionType);
		setTimeout(() => lastTime = false , 300);
	} else return;
	if (window.shuliang) {
		window.shuliang.innerText = parseInt(window.shuliang.innerText) - 1;
	}
}

/**
 * 检查是否处于投掷模式
 * @returns {boolean} 是否处于投掷模式
 */
export function isInThrowMode() {
	return THROW_ITEM_NAMES.some(item => window[item]?.thrownn);
}

/**
 * 退出投掷模式
 * @returns {void}
 */
export function exitThrowMode() {
	THROW_ITEM_NAMES.forEach(item => {
		if (window[item]) window[item].thrownn = false;
	});
}

// 隐藏弹窗
export const hideDialog = hideDialogUtil;

/**
 * 隐藏其他弹窗
 * @param {string} excludeDialog - 排除的弹窗名称
 * @param {Array} dialogConfigs - 弹窗配置数组
 * @returns {void}
 */
export function hideOtherDialogs(excludeDialog, dialogConfigs) {
	dialogConfigs.forEach(({ name, prop, value, delay }) => {
		if (name !== excludeDialog && window[name]) {
			hideDialog(window[name], prop, value, delay || DIALOG_HIDE_DELAY);
		}
	});
}

/**
 * 创建弹窗基础元素
 * @param {Object} config - 弹窗配置
 * @returns {HTMLElement} 弹窗元素
 */
export function createDialogBase(config) {
	const dialog = ui.create.div("hidden");
	dialog.classList.add("popped", "static");
	dialog.show = true;
	Object.assign(dialog.style, config.styles);
	if (config.backgroundImage) dialog.setBackgroundImage(config.backgroundImage);
	if (config.zIndex) dialog.style.zIndex = config.zIndex;
	if (config.boxShadow !== undefined) dialog.style.boxShadow = config.boxShadow;
	if (config.animation) {
		setTimeout(() => Object.assign(dialog.style, config.animation), DIALOG_ANIMATION_DELAY);
	}
	ui.window.appendChild(dialog);
	return dialog;
}

/**
 * 创建弹窗内容容器
 * @param {HTMLElement} parent - 父元素
 * @param {Object} styles - 样式对象
 * @returns {HTMLElement} 容器元素
 */
export function createContentContainer(parent, styles) {
	const container = ui.create.div("hidden");
	Object.assign(container.style, styles);
	if (typeof lib !== "undefined") lib.setScroll(container);
	parent.appendChild(container);
	return container;
}

// 按钮点击效果
export const addClickEffect = addClickEffectUtil;

/**
 * 处理音频路径
 * @param {string} path - 音频路径
 * @returns {Object} 包含完整路径的对象
 */
export function processAudioPath(path) {
	const target = "ext:";
	const isMatch = path.startsWith(target);
	const actualPath = isMatch ? `../extension/${path.slice(target.length)}` : path;

	// 去掉扩展名，保留完整的相对路径
	const pathWithoutExt = actualPath.replace(/\.[^/.]+$/, "");

	// 返回完整路径（用于 game.playAudio）
	return { fullPath: pathWithoutExt };
}

/**
 * 创建语音项
 * @param {HTMLElement} container - 容器元素
 * @param {number} index - 索引
 * @param {string} content - 内容
 * @param {string} audioPath - 音频路径
 * @param {Function} onClick - 点击回调
 * @returns {HTMLElement} 语音项元素
 */
export function createVoiceItem(container, index, content, audioPath, onClick) {
	const item = ui.create.div("hidden", "", onClick);
	item.style.cssText = "height:10%;width:100%;left:0%;top:0%;position:relative;";
	item.pos = index;
	item.content = content;
	if (audioPath) item.audioPath = audioPath;
	item.innerHTML = `<font color=white>${content}</font>`;
	container.appendChild(item);
	addClickEffect(item);
	return item;
}

/**
 * 初始化聊天记录
 * @returns {void}
 */
export function initChatRecord() {
	if (!window.chatRecord) window.chatRecord = [];
}

/**
 * ★【新增】记录面板滚到最底部，打开时默认显示最新的一条，而不是最开始的记录
 * @returns {void}
 */
export function scrollChatRecordToBottom() {
	const div = window.chatBackground2;
	if (!div) return;
	div.scrollTop = div.scrollHeight;
	//★ 面板刚创建时高度/内容还没排好版，下一帧再补一次；只在打开那一刻补，不影响之后再手动上翻
	if (typeof requestAnimationFrame === "function") {
		requestAnimationFrame(() => {
			if (div === window.chatBackground2) div.scrollTop = div.scrollHeight;
		});
	}
}

/**
 * ★【新增】常用语 / 表情 / 聊天记录 三个弹窗的统一尺寸与位置：
 * 宽 600、高 330、顶边 calc(35% - 125px)——即原来表情弹窗的位置和高度（图二），
 * 三个弹窗因此位置、大小一致，底边也落在同一高度，不会浮到屏幕顶部。
 * @returns {{width: number, height: number, top: string}} 弹窗几何参数
 */
function getChatPopupRect() {
	return { width: 600, height: 330, top: "calc(35% - 125px)" };
}

/**
 * ★【新增】弹窗（外框含透明留白）会盖住下面的聊天输入框，点在输入框上时点击落在弹窗里，输入框收不到点击。
 * 给弹窗加一个「捕获阶段」的点击转发：落点在输入框范围内就聚焦输入框（唤起输入法），弹窗本身的点击逻辑照常执行。
 * @param {HTMLElement} el - 弹窗元素
 * @returns {void}
 */
function zqPassTapToInput(el) {
	if (!el) return;
	el.addEventListener(
		"click",
		function (e) {
			const input = window.input;
			if (!input || typeof input.getBoundingClientRect !== "function" || !e || e.clientX == null) return;
			const r = input.getBoundingClientRect();
			if (e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8) {
				if (document.activeElement === input) input.blur();
				input.focus();
			}
		},
		true
	);
}

/**
 * 添加聊天记录
 * @param {string} str - 聊天内容
 * @returns {void}
 */
export function addChatWord(str) {
	initChatRecord();
	if (window.chatRecord.length > 50) {/*●●*/
		window.chatRecord.shift();
	}
	if (str) {
		window.chatRecord.push(str);
	}
	const html = window.chatRecord.map(r => `<br>${r}<br>`).join("");
	if (window.chatBackground2) {
		window.chatBackground2.innerHTML = html;
		//★ 记录面板始终滚到最底部，默认显示最新的聊天内容
		scrollChatRecordToBottom();
	}
}

//★ 表情条目是在 touchend 里发送的（无名的 listen 在触屏设备上绑定 touchend）：
//  弹窗在 touchend 当场就被 delete()，浏览器随后还会在同一坐标补发一次 click，
//  此时该位置最上层只剩全屏聊天遮罩层 chatOverlay（z-index 98），遮罩层的点击会调用
//  game.showChatWordBackgroundX()，于是「只该收起表情弹窗」变成了「整个聊天面板都关掉」。
//  这里记一个短暂的忽略时间窗，让这次补发的 click 不作数（只收起表情弹窗本身）。
//  ※ 常用语（语音弹窗）保持原来的行为：发送后整个聊天面板关闭，故不设置该窗口。
let zqOverlayIgnoreUntil = 0;

/**
 * 关闭语音弹窗
 * @returns {void}
 */
export function closeLifesayDialog() {
	if (window.dialog_lifesay) {
		window.dialog_lifesay.delete();
		window.dialog_lifesay = undefined;
	}
}

/**
 * 关闭表情弹窗
 * @returns {void}
 */
export function closeEmojiDialog() {
	//★ 记录忽略窗口：避免补发的 click 关掉整个聊天面板
	zqOverlayIgnoreUntil = Date.now() + 400;
	if (window.dialog_emoji) {
		window.dialog_emoji.delete();
		window.dialog_emoji = undefined;
	}
}

// ==================== 聊天系统初始化 ====================

/**
 * 初始化聊天系统
 * 注册game上的聊天相关方法
 */
export function initChatSystem(lib, game, ui, get) {
	const assetPath = "extension/十周年UI/ui/assets/";
	const chatAssetPath = `${assetPath}chat/`;

	initChatRecord();

	const EMOTION_SIZE = 50;/*●●*/

	// 添加聊天记录
	game.addChatWord = str => {
		if (window.chatRecord.length > 50) window.chatRecord.shift();/*●●*/
		if (str) window.chatRecord.push(str);
		if (window.chatBackground2) game.updateChatWord(window.chatRecord.map(r => `<br>${r}<br>`).join(""));
	};

	game.updateChatWord = str => {
		if (window.chatBackground2) {
			window.chatBackground2.innerHTML = str;
			//★ 刷新后滚到最底部：打开面板时直接显示最新记录，来新消息也不会停在顶部
			scrollChatRecordToBottom();
		}
	};

	// 显示聊天界面
	game.showChatWordBackgroundX = () => {
		if (window.chatBg?.show) {
			window.chatBg.hide();
			THROW_ITEM_NAMES.forEach(item => {
				if (window[item]?.thrownn) window[item].thrownn = false;
			});
			window.chatBg.show = false;

			// 移除遮罩层
			if (window.chatOverlay) {
				window.chatOverlay.remove();
				window.chatOverlay = null;
			}

			const dialogConfigs = [
				{ name: "dialog_lifesay", prop: "left", value: `-${window.dialog_lifesay?.style.width}`, delay: DIALOG_LIFESAY_HIDE_DELAY },
				{ name: "dialog_emoji", prop: "top", value: "100%", delay: DIALOG_HIDE_DELAY },
				{ name: "chatBackground", prop: "left", value: "100%", delay: DIALOG_HIDE_DELAY },
				{ name: "dialog_emotion", prop: "bottom", value: "100%", delay: DIALOG_HIDE_DELAY },
			];
			dialogConfigs.forEach(({ name, prop, value, delay }) => hideDialog(window[name], prop, value, delay));
			return;
		}

		// 遮罩层：处理点击关闭和投掷转发
		window.chatOverlay = ui.create.div("hidden");
		window.chatOverlay.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:98;background:transparent;";
		window.chatOverlay.onclick = e => {
			//★ 刚发过表情/常用语时，浏览器补发的那次 click 落在遮罩层上：不作数，避免整个聊天面板被关掉
			if (Date.now() < zqOverlayIgnoreUntil) return;
			if (isInThrowMode()) {
				const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
				const player = game.players?.find(p => elementsAtPoint.some(el => p === el || p.contains(el)));
				if (player?.onclick) {
					player.onclick.call(player);
				} else {
					exitThrowMode();
					game.showChatWordBackgroundX();
				}
			} else {
				game.showChatWordBackgroundX();
			}
		};
		ui.window.appendChild(window.chatOverlay);

		window.chatBg = ui.create.div("hidden");
		window.chatBg.classList.add("popped", "static");
		window.chatBg.show = true;
		window.chatBg.style.cssText = "display:block;--w:450px;--h:calc(var(--w)*300/900);width:var(--w);height:var(--h);position:fixed;left:30%;bottom:10%;opacity:1;background-size:100% 100%;background-color:transparent;z-index:99;transition:all 0.5s;";
		window.chatBg.setBackgroundImage(`${chatAssetPath}chat.png`);
		ui.window.appendChild(window.chatBg);

		// 互动框
		window.hudongkuang = ui.create.div("hidden");
		window.hudongkuang.style.cssText = "display:block;--w:315px;--h:calc(var(--w)*135/142);width:var(--w);height:var(--h);left:-280px;bottom:-55px;transition:none;background-size:100% 100%;pointer-events:none;";
		window.hudongkuang.setBackgroundImage(`${chatAssetPath}hudong.png`);
		window.chatBg.appendChild(window.hudongkuang);

		// 语音按钮
		game.open_lifesay = () => {
			hideOtherDialogs("dialog_lifesay", [
				{ name: "dialog_emoji", prop: "top", value: "100%" },
				{ name: "chatBackground", prop: "left", value: "100%" },
				{ name: "dialog_emotion", prop: "bottom", value: "100%" },
			]);

			if (window.dialog_lifesay?.show) {
				window.dialog_lifesay.hide();
				window.dialog_lifesay.show = false;
				return;
			}

			//★ 与表情、聊天记录共用同一套尺寸/位置（原来表情弹窗的高度和位置），动画 0.5s（原来 1s）
			const popupRect = getChatPopupRect();
			window.dialog_lifesay = createDialogBase({
				styles: { height: `${popupRect.height}px`, width: `${popupRect.width}px`, left: `-${popupRect.width}px`, top: popupRect.top, transition: "all 0.5s", opacity: "1", borderRadius: "8px", backgroundSize: "100% 100%" },
				backgroundImage: `${chatAssetPath}saydiv.png`,
				zIndex: 999999999,
				boxShadow: "none",
				animation: { left: `calc(50% - ${popupRect.width / 2}px)` },
			});
			//★ 弹窗盖住输入框时，点在输入框上也能聚焦（唤起输入法）
			zqPassTapToInput(window.dialog_lifesay);

			const bgColor = createContentContainer(window.dialog_lifesay, {
				height: "70%",
				width: "80%",
				left: "10%",
				top: "10%",
				borderRadius: "8px",
				overflowY: "scroll",
			});

			let skills = game.me?.getSkills?.(null, false, false).filter(s => !get.info(s)?.charlotte) || [];
			let skillsx = [...skills];
			skills.forEach(skill => {
				const info = get.info(skill);
				if (info?.derivation) {
					skillsx.push(...(Array.isArray(info.derivation) ? info.derivation : [info.derivation]));
				}
			});
			skillsx = [...new Set(skillsx)];

			let skillIndex = 0;
			skillsx.forEach(name => {
				if (!get.info(name)) return;
				const skillAudioData = get.Audio.skill({ skill: name, player: game.me.name });
				const { textList, fileList: audioList } = skillAudioData;
				textList.forEach((text, i) => {
					const displayContent = `「${get.skillTranslation(name)}」${text.replace(/~/g, " ")}`;
					const pureText = text.replace(/~/g, " "); // 纯台词，不带技能名
					const item = createVoiceItem(bgColor, skillIndex++, displayContent, audioList[i], function () {
						const { fullPath } = processAudioPath(this.audioPath);
						sendChatMessage(`/playAudio ${fullPath} ${this.pureText}`);
						closeLifesayDialog();
					});
					item.pureText = pureText;
				});
			});

			if (game.me?.name) {
				const dieAudioData = get.Audio.die({ player: game.me.name });
				const { textList: dieTextList, fileList: dieAudioList } = dieAudioData;
				dieTextList.forEach((text, i) => {
					const displayContent = `「阵亡」${text.replace(/~/g, " ")}`;
					const pureText = text.replace(/~/g, " ");
					const item = createVoiceItem(bgColor, skillIndex++, displayContent, dieAudioList[i], function () {
						const { fullPath } = processAudioPath(this.audioPath);
						sendChatMessage(`/playAudio ${fullPath} ${this.pureText}`);
						closeLifesayDialog();
					});
					item.pureText = pureText;
				});
			}

			lib.quickVoice?.forEach((voice, i) => {
				createVoiceItem(bgColor, skillIndex + i, voice, null, function () {
					sendChatMessage(this.content);
					closeLifesayDialog();
				});
			});
		};

		window.chatButton1 = ui.create.div("hidden", "", game.open_lifesay);
		window.chatButton1.style.cssText = "display:block;--w:75px;--h:calc(var(--w)*82/98);width:var(--w);height:var(--h);left:30px;bottom:15px;transition:none;background-size:100% 100%";
		window.chatButton1.setBackgroundImage(`${chatAssetPath}lifesay.png`);
		lib.setScroll(window.chatButton1);
		window.chatBg.appendChild(window.chatButton1);
		addClickEffect(window.chatButton1);

		// 创建投掷物品
		THROW_ITEMS.forEach(item => createThrowItemElement(item, chatAssetPath, game, ui, lib));

		// 鸡蛋风暴
		createXuwuElement(chatAssetPath, game, ui, lib);

		// 菜篮子
		createCailanziElement(chatAssetPath, ui);

		// 表情按钮
		createEmojiButton(chatAssetPath, EMOTION_SIZE, game, ui, lib);

		// 记录按钮
		window.chatButton3 = ui.create.div("hidden", "", game.showChatWord);
		window.chatButton3.style.cssText = "display:block;--w:75px;--h:calc(var(--w)*82/98);width:var(--w);height:var(--h);left:210px;bottom:15px;transition:none;background-size:100% 100%";
		window.chatButton3.setBackgroundImage(`${chatAssetPath}jilu.png`);
		lib.setScroll(window.chatButton3);
		window.chatBg.appendChild(window.chatButton3);
		addClickEffect(window.chatButton3);

		// 发送按钮
		createSendButton(chatAssetPath);

		game.addChatWord();

		// 输入框
		createInputArea(chatAssetPath);
	};

	// 显示聊天记录
	game.showChatWord = () => {
		hideOtherDialogs("chatBackground", [
			{ name: "dialog_lifesay", prop: "left", value: `-${window.dialog_lifesay?.style.width}` },
			{ name: "dialog_emoji", prop: "top", value: "100%" },
			{ name: "dialog_emotion", prop: "bottom", value: "100%" },
		]);

		if (window.chatBackground?.show) {
			window.chatBackground.hide();
			window.chatBackground.show = false;
			return;
		}

		//★ 与常用语、表情共用同一套尺寸/位置（原来表情弹窗的高度和位置），动画 0.5s（原来 1s）
		const popupRect = getChatPopupRect();

		window.chatBackground = ui.create.div("hidden");
		window.chatBackground.classList.add("static");
		window.chatBackground.show = true;
		window.chatBackground.style.cssText = `transition:all 0.5s;height:${popupRect.height}px;width:${popupRect.width}px;top:${popupRect.top};left:100%;opacity:1;border-radius:10px;background-size:100% 100%;`;
		window.chatBackground.setBackgroundImage(`${chatAssetPath}saydiv.png`);
		window.chatBackground.style.zIndex = 999999999;
		window.chatBackground.style.boxShadow = "none";
		setTimeout(() => (window.chatBackground.style.left = `calc(50% - ${popupRect.width / 2}px)`), DIALOG_ANIMATION_DELAY);

		game.mouseChatDiv = div => {
			if (lib.device === undefined) {
				div.onmouseover = function () {
					this.style.opacity = "1.0";
				};
				div.onmouseout = function () {
					this.style.opacity = "0.25";
				};
			} else {
				div.onclick = function () {
					this.style.opacity = this.style.opacity === "0.25" ? "0.75" : "0.25";
				};
			}
		};
		game.mouseChatDiv(window.chatBackground);
		//★ 记录面板的外框（含透明留白）会盖住下面的聊天输入框，点在输入框上时点击被面板吃掉，只会切换透明度。
		//  这里拦截这个点击：落点在输入框范围内就改为「聚焦输入框」（弹出输入法），其余位置仍保留原来的透明度切换。
		if (window.chatBackground.onclick) {
			const zqToggleOpacity = window.chatBackground.onclick;
			window.chatBackground.onclick = function (e) {
				const input = window.input;
				if (input && typeof input.getBoundingClientRect === "function" && e && e.clientX != null) {
					const r = input.getBoundingClientRect();
					if (e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8) {
						if (document.activeElement === input) input.blur();
						input.focus();
						return;
					}
				}
				return zqToggleOpacity.apply(this, arguments);
			};
		}
		ui.window.appendChild(window.chatBackground);

		const bgColor = createContentContainer(window.chatBackground, {
			height: "70%",
			width: "80%",
			left: "10%",
			top: "10%",
			transition: "none",
			borderRadius: "8px",
			backgroundSize: "100% 100%",
		});

		window.chatBackground2 = ui.create.div("hidden");
		window.chatBackground2.style.cssText = "height:100%;width:100%;left:0%;bottom:0%;transition:none;text-align:left;overflow-y:scroll;";
		window.chatBackground2.innerHTML = "";
		lib.setScroll(window.chatBackground2);
		bgColor.appendChild(window.chatBackground2);
		game.addChatWord();
	};

//★【改动】限频统一为一处函数：按「每个人」各自计算，每人每秒最多一条弹幕。
//  之前是玩家用全局 1 秒、观战者用各连接 2 秒，三处各写一套；现在合成本函数，三处共用。
//  只限制「弹幕绘制」，不会丢消息本身，也不会丢聊天记录（被限频的消息照常进记录）。
//  时间戳直接存在发言者对象上（玩家对象 / 观战连接对象），天然按人分开计算。
/**
 * @param {Object} who - 发言者对象（玩家对象，或观战者的连接对象）
 * @returns {boolean} 本次是否允许绘制弹幕
 */
function nzmDanmuThrottle(who) {
	if (!who) return false;
	const now = Date.now();
	if (who._nzmDanmuAt && now - who._nzmDanmuAt < 1000) return false;
	who._nzmDanmuAt = now;
	return true;
}

	//★【改动】联机房间弹幕：改由「房主」统一广播到各端绘制，客机无需安装本扩展也能看到。
	//  ① 玩家的 聊天/表情/常用语 最终都走 chat/emotion → this.say(str)；房主在联机房里
	//     game.onlineroom=true / game.online=false，且本机与各客机的消息都会经过房主，
	//     所以在房主端覆写 say，用 game.broadcastAll(renderEntry,...) 一次画到房主+所有客机；
	//  ② game.broadcastAll 会把 renderEntry 序列化后下发（get.stringifiedResult），
	//     renderEntry 只引用全局对象，故客机即使没装本扩展也能执行它；
	//  ③ 客机不再本地绘制，避免同一条消息出现两次弹幕。
	//  ④ 与「云中守望」扩展互斥：云中守望也覆写 lib.element.player.say 画弹幕，其启用标志是
	//     _status.swOptions.swCdown（见其 preload.js 的 cdown）。两者叠加会让同一条消息飘两次，
	//     所以这里让位：只要云中守望的弹幕已启用，本扩展就不再绘制（此时用云中的弹幕；
	//     若想改用本扩展的弹幕，把云中守望的“弹幕”开关关掉即可）。判断放在调用时，
	//     这样无论两个扩展谁先加载都能正确让位。
	if (lib.element && lib.element.player && !lib.element.player.say._nzmDanmu) {
		const _nzmSay = lib.element.player.say;
		lib.element.player.say = function (str) {
			try {
				//★ 云中守望弹幕已启用 → 弹幕交给它画，本扩展不画（但聊天记录仍要补写，不能一起跳过）
				const yzsw = typeof _status === "object" && _status && _status.swOptions && _status.swOptions.swCdown;
				if (game.onlineroom && !game.online && typeof str === "string" && str) {
					//★ 发言者标签与聊天记录保持一致：有武将名用「武将名[昵称]」，
					//  游戏还没开始（还没有武将名）则用「N号位[昵称]」，昵称相同也能分清是谁。
					const { prefix: speaker, nickname } = getSpeakerInfo(this);
					const danmuName = speaker || nickname;
					if (danmuName) {
						//★ 弹幕限频：每人每秒最多一条（只丢弃弹幕，聊天记录照常写）——统一走 nzmDanmuThrottle
						const draw = !yzsw && nzmDanmuThrottle(this);
						//★ 聊天记录：本体的「聊天记录技能」只在开局后接管 say 并自己写记录
						//  （见下方 _wmkzSayChange，它会给玩家打上 change_sayFunction 标记）。
						//  还没被接管时（游戏未开始）由本扩展补写，避免等待阶段记录为空；被接管后
						//  交给它写，不会重复。两者互斥，所以每条消息恰好只写一次记录。
						const record = this.change_sayFunction !== true;
						if (draw || record) game.broadcastAll(renderEntry, "", danmuName, str, record, speaker ? nickname : "", draw, true);
					}
					//●● 武将台词语音兜底：客机（没装本扩展 / 装的是旧版）点常用语时只会把台词文本发出来，
					//  这里用「发言者的武将台词表」把文本反查成语音文件，再由房主广播到各端一起播，
					//  这样没装扩展的客机也能听见；已由 /playAudio 命令播过的同一条会跳过，不重复出声。
					if (!yzsw) nzmBroadcastVoiceByText(this, str);
				}
			} catch (e) {}
			return _nzmSay.apply(this, arguments);
		};
		lib.element.player.say._nzmDanmu = true;
	}

	// 聊天记录技能
	if (!lib._originalPlayerSay) {
		lib._originalPlayerSay = lib.element.player.say;
	}

	lib.skill._wmkzSayChange = {
		trigger: { global: ["gameStart", "phaseBegin", "phaseAfter", "useCardAfter"] },
		forced: true,
		silent: true,
		filter: (event, player) => player.change_sayFunction !== true,
		content() {
			const currentPlayer = player;
			currentPlayer.change_sayFunction = true;
			currentPlayer.say = function (str) {
				const thisPlayer = this;
				const playerName = get.slimNameHorizontal(String(thisPlayer.name));
				//const playerName = get.translation(String(player.name));//LM修改
				const playerNickname = thisPlayer.nickname || null;
				const assetURL = lib.assetURL;
				game.broadcastAll(
					function (playerNameArg, playerNicknameArg, messageStrArg, assetURLArg) {
						if(!window.decadeUI) return;/*●●*/
						var globalGame = (function () {
							try {
								return eval("game");
							} catch (e) {
								return window.game;
							}
						})();
						if (!globalGame) return;
						if (typeof globalGame.addChatWord !== "function") {
							if (!window.chatRecord) window.chatRecord = [];
							if (window.chatBackground2) {
								window.chatBackground2.innerHTML = window.chatRecord
									.map(function (r) {
										return "<br>" + r + "<br>";
									})
									.join("");
								//★ 直接写 innerHTML 的分支也要滚到最底部（这段会序列化下发，只能用全局对象，不能再调用模块里的函数）
								window.chatBackground2.scrollTop = window.chatBackground2.scrollHeight;
							}
							globalGame.addChatWord = function (strx) {
								if (window.chatRecord.length > 50) window.chatRecord.shift();
								if (strx) window.chatRecord.push(strx);
								if (window.chatBackground2) {
									window.chatBackground2.innerHTML = window.chatRecord.map(r => `<br>${r}<br>`).join("");
									//★ 同上：刷新记录后滚到最底部，默认显示最新的聊天内容
									window.chatBackground2.scrollTop = window.chatBackground2.scrollHeight;
								}
							};
						}
						var processedStr = messageStrArg.replace(/##assetURL##/g, assetURLArg);
					/*玩家-聊天记录颜色*/
					var nameHtml = "<font color=#66ff66><b>" + playerNameArg + "</b></font>" + (playerNicknameArg ? "&nbsp; <font color=gold><b>[" + playerNicknameArg + "]</b></font>" : ""); /*●●●绿+金*/
					globalGame.addChatWord(nameHtml + "<font color=white>：" + processedStr + "</font>");
					},
					playerName,
					playerNickname,
					str,
					assetURL
				);
				if (lib._originalPlayerSay) {
					lib._originalPlayerSay.call(thisPlayer, str);
				}
			};
		},
	};

	// ==================== 联机观战发言 ====================

	//●● 解除本体对观战端发送 chat/emotion 的拦截（纯函数，无闭包，可被广播序列化）
	function installSendBypass() {
		if (game.send && !game.send._nzmObserveSend) {
			game.send._nzmObserveSend = true;
			var _os = game.send;
			game.send = function () {
				if (game.observe && (arguments[0] === "chat" || arguments[0] === "emotion")) {
					if (game.ws) {
						var msgs = Array.from(arguments);
						if (typeof msgs[0] === "function") msgs.unshift("exec");
						game.ws.send(JSON.stringify(get.stringifiedResult(msgs)));
						return;
					}
				}
				return _os.apply(this, arguments);
			};
		}
	}
	// 本机也启用（兼容器机已装新文件的情形）
	installSendBypass();

	// 弹幕+聊天记录渲染（广播到各端执行）
	//★【改动】新增 record 参数：false → 只画弹幕、不写记录（游戏中由聊天记录技能负责写）；
	//  true → 画弹幕并补写记录（游戏未开始、聊天记录技能还没接管 say 时）。观战调用不带该参 → 默认 true，行为不变。
	//【改动】新增 nickname 参数：玩家弹幕传「武将名/座位号 + 昵称」，渲染成与聊天记录同款的
	//  「武将名[昵称]」标签（武将名为绿、昵称为金）；观战调用不带该参 → 仍只显示昵称，行为不变。
	//【改动】新增 draw 参数：房主端限频（每秒最多一条弹幕）时传 false → 只写记录、不画弹幕。
	//【改动】新增 extOnly 参数：真实玩家发言传 true → 只写本扩展的聊天记录（本体 say 已经写过本体记录），
	//  避免同一条消息在本体聊天记录里出现两次；观战者发言不带该参 → 行为不变。
	//  ※ 本函数会被 game.broadcastAll 序列化后下发到客机（含未装本扩展的客机），
	//    因此函数体内只能引用全局对象（get/lib/game/_status/window/document），不能引用外部闭包变量。
	function renderEntry(prefix, name, str, record = true, nickname = "", draw = true, extOnly = false) {
		if (!window._nzmDanmu_rd) {
			window._nzmDanmu_rd = true;
			var st = document.createElement("style");
			st.textContent = "@keyframes nzmDanmuK{0%{transform:translateX(0);}100%{transform:translateX(calc(-100vw - 420px));}}";
			(document.head || document.documentElement).appendChild(st);
		}
		var plain = (str.indexOf("<img") !== -1) ? str : get.plainText(str);
		var show = plain.replace(/##assetURL##/g, lib.assetURL);
		var plainName = get.plainText(name);
		//★ 与聊天记录同款：有昵称时显示「绿色武将名 [金色昵称]」，没有昵称时退回原样式（旁观）
		var plainNick = nickname ? get.plainText(nickname) : "";
		var speaker = plainNick
			? "<font color=#66ff66><b>" + plainName + "</b></font>&nbsp; <font color=gold><b>[" + plainNick + "]</b></font>"
			: "<font color=gold><b>" + plainName + "</b></font>";/*●●●蓝+金 （旁观）*/
		var info = [prefix + plainName + (plainNick ? "[" + plainNick + "]" : ""), show];
		var entry = prefix + speaker + "<font color=white>：" + show + "</font>";
		//★ 去重：同一条内容在 500ms 内被重复执行 renderEntry（观战发言被多处广播时会出现）只保留第一条，
		//  否则同一条发言会在聊天记录 / 弹幕里显示两遍。
		var _nzmNow = Date.now();
		if (window._nzmLastRender && window._nzmLastRender.entry === entry && _nzmNow - window._nzmLastRender.at < 500) return;
		window._nzmLastRender = { entry: entry, at: _nzmNow };
		if (draw !== false) { /*★ 限频时跳过弹幕绘制，但下面照样写记录 */
			try {
				var el = document.createElement("div");
				el.innerHTML = entry;
				el.style.cssText = "position:fixed;left:100vw;top:" + (33 + Math.random() * 33) + "%;transform:translateX(0);white-space:nowrap;font-size:17px;line-height:1.4;color:#fff;background:rgba(0,0,0,0.1);border-radius:6px;padding:4px 10px;box-shadow:0 0 6px rgba(0,0,0,0.1);z-index:99999;pointer-events:none;max-width:200vw;overflow:hidden;text-overflow:ellipsis;";/*●●● 弹幕区域*/
				document.body.appendChild(el);
				var d = 8 + Math.random() * 4;/*●●● 弹幕速度*/
				el.style.animation = "nzmDanmuK " + d + "s linear forwards";
				setTimeout(function () { try { el.remove(); } catch (e) {} }, d * 1000 + 250);
			} catch (e) {}
		}
		if (record === false) return; /*★ 游戏中的玩家弹幕：只画弹幕、不写记录（记录由聊天记录技能负责） */
		// 本扩展的聊天记录：game.addChatWord 自己会往 window.chatRecord 里存并刷新面板，
		//  所以这里只在它不可用时兜底，避免同一条消息在记录面板里出现两次。
		if (typeof game.addChatWord === "function") game.addChatWord(entry);
		else if (window.chatRecord) window.chatRecord.push(entry);
		if (extOnly) return; /*★ 真实玩家发言：本体记录（lib.chatHistory / _status.addChatEntry）已由本体 say 写过 */
		if (_status.addChatEntry) {
			if (_status.addChatEntry._origin && _status.addChatEntry._origin.parentNode) {
				_status.addChatEntry(info, false);
			} else {
				delete _status.addChatEntry;
			}
		}
	}
	const OBS_PREFIX = '<span style="font-weight: bold; color: rgb(126, 180, 255)">（旁观）</span>'; /*●●●蓝色*/

	// 服务端（房主）放行并广播观战发言/表情；客机上这些 handler 不会被调到，安全
	if (lib.message.server) {
		if (lib.message.server.chat && !lib.message.server.chat._nzmHook) {
			lib.message.server.chat._nzmHook = true;
			const _chat = lib.message.server.chat;
			lib.message.server.chat = function (id, str) {
				if (lib.node && lib.node.observing && lib.node.observing.includes(this)) {
					//★ 观战者点「武将台词」发来的是「/playAudio 路径 台词」，这里只取台词部分显示，
					//  避免聊天记录 / 弹幕里出现 “/playAudio skill//xxx” 这段英文命令；观战者不放音（保持原有限制）
					let text = str;
					if (typeof text === "string" && text.indexOf("/playAudio ") === 0) {
						const cut = text.indexOf(" ", 11);
						text = cut === -1 ? "" : text.slice(cut + 1);
					}
					if (!text) return;
					//●●● 弹幕限频：每人每秒最多一条——统一走 nzmDanmuThrottle；只丢弹幕，记录照写
					const draw = nzmDanmuThrottle(this);
					game.broadcastAll(renderEntry, OBS_PREFIX, this.nickname || "观战者", text, true, "", draw, false);
					return;
				}
				//●● 武将台词语音：客机发来的「/playAudio 路径 台词」由房主拆包——
				//  语音广播到各端一起播；台词文本按普通聊天继续交给本体，
				//  各端的弹幕/记录/本体记录与普通发言完全一致。
				//  ※ 放在观战分支之后，避免观战者借这条命令给别人放语音。
				if (typeof str === "string" && str.indexOf("/playAudio ") === 0) {
					const cut = str.indexOf(" ", 11);
					const audioPath = cut === -1 ? str.slice(11) : str.slice(11, cut);
					const displayText = cut === -1 ? "" : str.slice(cut + 1);
					if (audioPath) game.broadcastAll(playNzmVoice, audioPath);
					if (displayText) {
						nzmVoiceMark(displayText); // 标记本条已播，避免房主 say 的文本反查再播一次
						return _chat.apply(this, [id, displayText]);
					}
					return;
				}
				return _chat.apply(this, arguments);
			};
		}
		if (lib.message.server.emotion && !lib.message.server.emotion._nzmHook) {
			lib.message.server.emotion._nzmHook = true;
			const _emo = lib.message.server.emotion;
			lib.message.server.emotion = function (id, pack, file) {
				if (lib.node && lib.node.observing && lib.node.observing.includes(this)) {
					//●●● 弹幕限频：每人每秒最多一条——统一走 nzmDanmuThrottle；只丢弹幕，记录照写
					const draw = nzmDanmuThrottle(this);
					const str = `<img src="##assetURL##image/emotion/${pack}/${file}" style="width:50px;height:50px;">`;
					game.broadcastAll(renderEntry, OBS_PREFIX, this.nickname || "观战者", str, true, "", draw, false);
					return;
				}
				return _emo.apply(this, arguments);
			};
		}
		//●● 捕获观战者昵称：client 的 init 消息带 config.nickname，但观战分支不存到连接
		if (lib.message.server.init && !lib.message.server.init._nzmNick) {
			lib.message.server.init._nzmNick = true;
			const _init = lib.message.server.init;
			lib.message.server.init = function (version, config, banned_info) {
				_init.apply(this, arguments);
				if (config && config.nickname) this.nickname = config.nickname;
			};
		}
		//★ 观战者退出房间时自动提示：谁退出、还剩几名旁观者
		//  挂 Client.close：本体在连接断开（ws.on('close')）时调用它，且它会先把该连接从 lib.node.observing 移除
		//  1.9 系的 lib.element.client 是按实例拷贝的对象，1.10 系是 class 原型，两种都兼容
		(function () {
			var proto = null;
			if (lib.element) {
				if (lib.element.Client && lib.element.Client.prototype && typeof lib.element.Client.prototype.close === "function") {
					proto = lib.element.Client.prototype;
				} else if (lib.element.client && typeof lib.element.client.close === "function") {
					proto = lib.element.client;
				}
			}
			if (!proto || proto._nzmObsExit) return;
			proto._nzmObsExit = true;
			const _closeObs = proto.close;
			proto.close = function () {
				//★ 必须在原 close 之前判断：原 close 第一件事就是把 this 从 observing 里移除
				const isObs = !!(lib.node && lib.node.observing && lib.node.observing.includes(this));
				const nick = this.nickname;
				const ret = _closeObs.apply(this, arguments);
				if (isObs) {
					const left = lib.node && lib.node.observing ? lib.node.observing.length : 0;
					game.broadcastAll(renderEntry, OBS_PREFIX, nick || "观战者", "退出房间，剩余" + left + "名旁观者");
				}
				return ret;
			};
		})();
		//●● 客机进房完成时：推送发送放行（只改房主）+ 观战者进房自动弹幕提示
		if (lib.message.server.reinited && !lib.message.server.reinited._nzmPush) {
			lib.message.server.reinited._nzmPush = true;
			const _ri = lib.message.server.reinited;
			lib.message.server.reinited = function () {
				_ri.apply(this, arguments);
				game.broadcast(installSendBypass);
				if (!this._nzmAnnounced) {
					this._nzmAnnounced = true;
					let left = 1;
					if (lib.node && lib.node.observing && lib.node.observing.includes(this)) left = lib.node.observing.length;
					game.broadcastAll(renderEntry, OBS_PREFIX, this.nickname || "观战者", "第" + left + "个进入房间，本房间允许旁观发言");
				}
			};
		}
	}
}

// ==================== 内部辅助函数 ====================

// 创建投掷物品元素
function createThrowItemElement(config, chatAssetPath, game, ui, lib) {
	const { name, left, bottom, image, label, emotionType } = config;

	game[`open_${name}`] = () => {
		game.players.forEach(player => {
			player.onclick = function () {
				if (window[name].thrownn) throwEmotion(this, emotionType);
			};
		});
	};

	window[name] = ui.create.div("hidden", "", game[`open_${name}`]);
	window[name].style.cssText = `display:block;--w:63px;--h:calc(var(--w)*50/50);width:var(--w);height:var(--h);left:${left};bottom:${bottom};transition:none;background-size:100% 100%`;
	window[name].setBackgroundImage(`${chatAssetPath}${image}.png`);

	const labelDiv = document.createElement("div");
	labelDiv.textContent = label;
	labelDiv.style.cssText = "position:absolute;bottom:1px;left:0;right:0;text-align:center;color:rgba(255,220,0,0.7);font-size:12px;font-family:shousha;";
	window[name].appendChild(labelDiv);
	window[name].onclick = () => {
		window[name].thrownn = true;
	};
	window.chatBg.appendChild(window[name]);
	if (typeof lib !== "undefined") lib.setScroll(window[name]);
	addClickEffect(window[name]);
}

// ●创建鸡蛋风暴元素
let shoeOver = false;
function createXuwuElement(chatAssetPath, game, ui, lib) {
	game.open_xuwu = () => {
		game.players.forEach(player => {
			player.onclick = function () {
				if (shoeOver) return;
				if (window.xuwu.thrownn) {
					shoeOver = true;
					for (let i = 0; i < XUWU_COUNT; i++) {
						setTimeout(() => throwEmotion(this, i <= 8 ? "egg" : "shoe", true), XUWU_DELAY * i);
					}
					setTimeout(() => shoeOver = false , 2000);
				}
			};
		});
	};

	window.xuwu = ui.create.div("hidden", "", game.open_xuwu);
	window.xuwu.style.cssText = "display:block;--w:63px;--h:calc(var(--w)*50/50);width:var(--w);height:var(--h);left:-80px;bottom:13px;transition:none;background-size:100% 100%";
	window.xuwu.setBackgroundImage(`${chatAssetPath}xuwu.png`);
	const xuwuLabel = document.createElement("div");
	xuwuLabel.textContent = "鸡蛋风暴";
	xuwuLabel.style.cssText = "position:absolute;bottom:1px;left:0;right:0;text-align:center;color:rgba(255,220,0,0.7);font-size:12px;font-family:shousha;";
	window.xuwu.appendChild(xuwuLabel);
	window.xuwu.onclick = () => {
		window.xuwu.thrownn = true;
	};
	window.chatBg.appendChild(window.xuwu);
	if (typeof lib !== "undefined") lib.setScroll(window.xuwu);
	addClickEffect(window.xuwu);
}

// 创建菜篮子元素
function createCailanziElement(chatAssetPath, ui) {
	window.cailanzi = ui.create.div("hidden");
	window.cailanzi.style.cssText = "display:block;--w:100px;--h:calc(var(--w)*59/150);width:var(--w);height:var(--h);left:-230px;bottom:225px;transition:none;background-size:100% 100%";
	window.cailanzi.setBackgroundImage(`${chatAssetPath}cailanzi.png`);
	window.chatBg.appendChild(window.cailanzi);

	window.shuliang = ui.create.node("div");
	window.shuliang.innerText = Math.floor(Math.random() * (999 - 100 + 1) + 100);
	window.shuliang.style.cssText = "display:block;left:-180px;bottom:235px;font-family:shousha;color:#97856a;font-weight:900;text-shadow:none;transition:none;background-size:100% 100%";
	window.chatBg.appendChild(window.shuliang);
}

// 创建表情按钮
function createEmojiButton(chatAssetPath, EMOTION_SIZE, game, ui, lib) {
	game.open_emoji = () => {
		hideOtherDialogs("dialog_emoji", [
			{ name: "dialog_lifesay", prop: "left", value: `-${window.dialog_lifesay?.style.width}` },
			{ name: "chatBackground", prop: "left", value: "100%" },
			{ name: "dialog_emotion", prop: "bottom", value: "100%" },
		]);

		if (window.dialog_emoji?.show) {
			window.dialog_emoji.hide();
			window.dialog_emoji.show = false;
			return;
		}

		//★ 与常用语、聊天记录共用同一套尺寸/位置（原来表情弹窗的高度和位置），动画 0.5s（原来 1s）
		const popupRect = getChatPopupRect();
		window.dialog_emoji = createDialogBase({
			styles: { height: `${popupRect.height}px`, width: `${popupRect.width}px`, left: `calc(50% - ${popupRect.width / 2}px)`, top: "100%", transition: "all 0.5s", opacity: "1", borderRadius: "8px", backgroundSize: "100% 100%" },
			backgroundImage: `${chatAssetPath}saydiv.png`,
			zIndex: 999999999,
			boxShadow: "none",
			animation: { top: popupRect.top },
		});
		//★ 弹窗盖住输入框时，点在输入框上也能聚焦（唤起输入法）
		zqPassTapToInput(window.dialog_emoji);

		const bgColor = createContentContainer(window.dialog_emoji, {
			height: "70%",
			width: "80%",
			left: "10%",
			top: "10%",
			borderRadius: "8px",
			overflowY: "scroll",
		});

		const srcBase = `${lib.assetURL}image/emotion/`;
		const packList = [];

		// 动态获取表情包列表
		game.getFileList(
			srcBase,
			folders => {
				folders
					.filter(pack => pack !== "throw_emotion")
					.forEach(pack => {
						packList.push(pack);
						const packDiv = ui.create.div("hidden", "", function () {
							packList.forEach(p => {
								if (window[`dialog_emojiPack_${p}`]) window[`dialog_emojiPack_${p}`].style.display = "none";
							});
							document.querySelectorAll(".dialog_emojiContent").forEach(el => {
								el.style.display = el.dataset.pack === this.packName ? "" : "none";
							});
						});
						packDiv.style.cssText = "height:70px;width:70px;margin:0 5px 5px 0;display:inline-block;left:15px;top:0px;position:relative;background-size:100% 100%;";
						packDiv.packName = pack;
						packDiv.setBackgroundImage(`image/emotion/${pack}/1.gif`);
						window[`dialog_emojiPack_${pack}`] = packDiv;
						bgColor.appendChild(packDiv);
						addClickEffect(packDiv);

						game.getFileList(
							`${srcBase}${pack}/`,
							(_, files) => {
								files.forEach(file => {
									const emotionDiv = ui.create.div("hidden", "", function () {
										packList.forEach(p => {
											if (window[`dialog_emojiPack_${p}`]) window[`dialog_emojiPack_${p}`].style.display = "";
										});
										document.querySelectorAll(".dialog_emojiContent").forEach(el => {
											el.style.display = "none";
										});
										//●● 改用本体 emotion 通道发送（与无名杀本体聊天框一致）：
									// 各端会用各自本地 image/emotion 渲染，房主自己与未开十周年UI的端都能看到图片；
									// 不能用占位 src 当 chat 文本发送（chat 通道不会替换 ##assetURL##，会破图）。
									if (game.online) {
										game.send("emotion", game.onlineID, this.dataset.pack, this.dataset.file);
									} else {
										//★【修复】房主在“等待开始游戏”阶段 game.me 为 null，直接 game.me.emotion 会报错；
										//  改用 getCurrentPlayer()（房主端返回 game.connectPlayers[0]，与无名杀核心 connect 阶段发言/表情的做法一致）。
										const curPlayer = getCurrentPlayer();
										if (curPlayer) curPlayer.emotion(this.dataset.pack, this.dataset.file);
									}
									closeEmojiDialog();
									});
									emotionDiv.className = "dialog_emojiContent";
									emotionDiv.style.cssText = "height:70px;width:70px;margin:0 5px 5px 0;display:inline-block;left:15px;top:0px;position:relative;background-size:100% 100%;display:none;";
									emotionDiv.dataset.pack = pack;
									emotionDiv.dataset.file = file;
									emotionDiv.setBackgroundImage(`image/emotion/${pack}/${file}`);
									bgColor.appendChild(emotionDiv);
									addClickEffect(emotionDiv);
								});
							},
							() => {}
						);
					});
			},
			() => {}
		);
	};

	window.chatButton2 = ui.create.div("hidden", "", game.open_emoji);
	window.chatButton2.style.cssText = "display:block;--w:75px;--h:calc(var(--w)*82/98);width:var(--w);height:var(--h);left:120px;bottom:15px;transition:none;background-size:100% 100%";
	window.chatButton2.setBackgroundImage(`${chatAssetPath}emoji.png`);
	lib.setScroll(window.chatButton2);
	window.chatBg.appendChild(window.chatButton2);
	addClickEffect(window.chatButton2);
}

// 创建发送按钮
function createSendButton(chatAssetPath) {
	window.sendInfo = content => {
		sendChatMessage(content);
		if (window.input) window.input.value = "";
	};

	window.chatSendBottom = ui.create.div("", "", () => {
		if (!window.input?.value) return;
		window.sendInfo(window.input.value);
	});
	window.chatSendBottom.style.cssText = "display:block;--w:100px;--h:calc(var(--w)*62/160);width:var(--w);height:var(--h);left:72%;top:16%;transition:none;background-size:100% 100%;text-align:center;border-radius:8px;";
	window.chatSendBottom.setBackgroundImage(`${chatAssetPath}buttonsend.png`);
	window.chatSendBottom.innerHTML = '<span style="color:#e6e6e6;font-size:23px;line-height:38px;font-weight:400;font-family:shousha">发送</span>';
	window.chatBg.appendChild(window.chatSendBottom);
	addClickEffect(window.chatSendBottom);
}

// 创建输入区域
function createInputArea(chatAssetPath) {
	const assetURL = typeof lib !== "undefined" ? lib.assetURL : "";

	window.chatInputOut = ui.create.div("hidden");
	window.chatInputOut.style.cssText = "display:block;--w:275px;--h:calc(var(--w)*50/320);width:var(--w);height:var(--h);left:8%;top:14%;transition:none;background-size:100% 100%;pointer-events:none;z-index:6;";
	window.chatInputOut.style.backgroundImage = `url('${assetURL}${chatAssetPath}sayX.png')`;
	window.chatBg.appendChild(window.chatInputOut);

	window.chatInput = ui.create.dialog("hidden");
	window.chatInput.style.cssText = "height:24px;width:44%;left:24.2%;top:31px;transition:none;";
	window.chatBg.appendChild(window.chatInput);

	window.ipt = ui.create.div();
	window.ipt.style.cssText = "height:24px;width:100%;top:0px;left:0px;margin:0px;border-radius:0px;background-image:linear-gradient(rgba(0,0,0,0.2),rgba(0,0,0,0.4));";
	if (window.input?.value) window.input_value = window.input.value;
	window.ipt.innerHTML = `<input type="text" value="${window.input_value || "※号表示玩家已开启十周年UI"}" style="color:white;font-family:shousha;width:calc(100% - 10px);text-align:left;"></input>`;/*●●*/
	window.input = window.ipt.querySelector("input");
	window.input.style.backgroundImage = `url('${assetURL}${chatAssetPath}say.png')`;
	window.input.style.backgroundSize = "120% 120%";
	window.input.style.boxShadow = "none";
	//★ 打开聊天记录面板后再点输入框，输入框可能还保留着焦点（键盘已被收起），
	//  此时再点它不会触发 focus，输入法不弹出。点击输入区时强制「先失焦再聚焦」。
	const zqFocusChatInput = e => {
		if (e && typeof e.stopPropagation === "function") e.stopPropagation();
		if (document.activeElement === window.input) window.input.blur();
		window.input.focus();
	};
	window.input.onclick = zqFocusChatInput;
	window.ipt.onclick = zqFocusChatInput;
	window.chatInput.onclick = zqFocusChatInput;
	window.input.onfocus = function () {
		if (this.value === "※号表示玩家已开启十周年UI") this.value = "";/*●●*/
	};
	window.input.onkeydown = e => {
		e.stopPropagation();
		if (e.keyCode === 13 || e.key === "Enter") {
			const value = String(e.target.value ?? "");
			if (value) window.sendInfo(value);
		}
	};
	window.chatInput.add(window.ipt);
}
