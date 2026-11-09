/**
 * @fileoverview UI更新方法模块
 * @description 包含各种UI更新相关的覆写方法
 * @module overrides/ui/update
 */

import { lib, game, ui, get, _status } from "noname";
import { throttle } from "../../animation/index.js";
import { getBaseUiUpdate } from "./base.js";

//●只有「移动版」(off) 样式才用新的按钮定位逻辑；
//  其它样式（online / 一将成名 / 欢乐三国杀 / 十周年 等）沿用十周年UI旧版的算法
const MOBILE_STYLE = "off";
function isMobileStyle() {
	return lib.config.extension_十周年UI_newDecadeStyle === MOBILE_STYLE;
}

/**
 * 旧版控制栏定位逻辑
 * @description 与十周年UI旧版文件完全一致，供非移动版样式使用
 */
function uiUpdatecLegacy() {
	const controls = ui.control.childNodes;
	let stayleft;
	let offsetLeft;
	for (let i = 0; i < controls.length; i++) {
		if (!stayleft && controls[i].stayleft) {
			stayleft = controls[i];
		} else if (!offsetLeft) {
			offsetLeft = controls[i].offsetLeft;
		}
		if (stayleft && offsetLeft) break;
	}
	if (stayleft) {
		if (ui.$stayleft != stayleft) {
			stayleft._width = stayleft.offsetWidth;
			ui.$stayleft = stayleft;
		}
		if (offsetLeft < stayleft._width) {
			stayleft.style.position = "static";
		} else {
			stayleft.style.position = "absolute";
		}
	}
}

//●监听确认栏内部按钮的增删/显示变化（重铸等，自用美化与十周年UI都会往栏里塞按钮），
//  变化后自动重新居中，无需其它扩展配合
let confirmObserver = null;
function ensureConfirmObserver(confirm) {
	if (confirmObserver && confirmObserver.__target === confirm) return;
	if (confirmObserver) {
		confirmObserver.disconnect();
		confirmObserver = null;
	}
	const observer = new MutationObserver(records => {
		for (const record of records) {
			if (record.type === "childList" && record.target === confirm) {
				ui.updatec();
				return;
			}
			//●忽略作用在确认栏自身的 translate（那是本函数自己写的），只响应内部按钮的变化
			if (record.type === "attributes" && record.target !== confirm && confirm.contains(record.target)) {
				ui.updatec();
				return;
			}
		}
	});
	observer.observe(confirm, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
	observer.__target = confirm;
	confirmObserver = observer;
}

/**
 * 收紧控制按钮的可点范围
 * @description 每个 .control 都绑定了 ui.click.control2，按钮两侧 15px 的透明外边距
 * 也会被算作按钮的点击范围，点按钮之间的空白会误触按钮（并让按钮整体错位）；
 * 这里移除该转发，只保留按钮自身的点击监听，让可点范围和按钮可见区域一致。
 * @param {HTMLElement} node - 控制按钮容器
 */
function ensureHitArea(node) {
	if (node._duiHitAreaFixed) return;
	node._duiHitAreaFixed = true;
	node.removeEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control2);
}

//●下一帧调度（多个触发合并成一次，避免重复结算）
const nextFrame = typeof requestAnimationFrame === "function" ? cb => requestAnimationFrame(cb) : cb => setTimeout(cb, 16);
let duiQueuePending = false;
function queueUpdate() {
	if (duiQueuePending) return;
	duiQueuePending = true;
	nextFrame(() => {
		duiQueuePending = false;
		if (ui.updatec) ui.updatec();
	});
}

//●监听控制栏本身的节点增删和尺寸变化：
//  其它扩展/引擎会在任意时刻插入、移除按钮或改动控制栏宽度，
//  这些情况不会调用 ui.updatec，会让按钮一直停在错误的位置直到下一次点击
let controlObserver = null;
let controlResizeObserver = null;
let resizeHooked = false;
function ensureControlObservers(container) {
	if (controlObserver && controlObserver.__container === container) return;
	if (controlObserver) {
		controlObserver.disconnect();
		controlObserver = null;
	}
	if (controlResizeObserver) {
		controlResizeObserver.disconnect();
		controlResizeObserver = null;
	}
	if (typeof MutationObserver === "function") {
		const observer = new MutationObserver(() => queueUpdate());
		//●除了直接子节点的增删，还要监听整个控制栏子树里的文字/样式变化：
		//  「取消」变成「结束出牌」这类只改文字、不改节点的情况会改变按钮宽度，
		//  如果不监听，确认栏会一直停在旧位置（表现为轻微偏左/偏右几像素）。
		//  这里只监听 class 和文字，不监听 style——否则会监听到我们自己写入的平移
		observer.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
			attributeFilter: ["class"],
		});
		observer.__container = container;
		controlObserver = observer;
	}
	if (typeof ResizeObserver === "function") {
		const resizeObserver = new ResizeObserver(() => queueUpdate());
		resizeObserver.observe(container);
		controlResizeObserver = resizeObserver;
	}
	if (!resizeHooked && typeof window !== "undefined" && window.addEventListener) {
		resizeHooked = true;
		window.addEventListener("resize", queueUpdate);
		window.addEventListener("orientationchange", queueUpdate);
	}
}

//●布局刚变化后，接下来几帧复核一次真实位置：
//  刚创建的按钮可能还没拿到最终尺寸（图片/字体未就绪、动画中），
//  只测量一次容易把错误的位置固定下来，多复核几帧即可自动回正
let duiVerifyPending = 0;
let duiVerifyScheduled = false;
function runVerify() {
	if (duiVerifyScheduled || duiVerifyPending <= 0) return;
	duiVerifyScheduled = true;
	nextFrame(() => {
		duiVerifyScheduled = false;
		duiVerifyPending--;
		if (ui.control) layoutControls(ui.control);
		if (duiVerifyPending > 0) runVerify();
	});
}
function scheduleVerify() {
	duiVerifyPending = 3;
	runVerify();
}

//●确认栏里代表「确定」的节点，用于居中
function getConfirmAnchor(confirm) {
	return (
		confirm.node?.ok ||
		Array.from(confirm.children).find(child => child.link === "ok") ||
		Array.from(confirm.children).find(child => child.link === "cancel") ||
		confirm.firstElementChild ||
		confirm
	);
}

/**
 * 计算控制栏布局（幂等）
 * @description 每次都先把上一次的平移撤掉，按「没有任何位移」的原始布局重新测量，
 * 再把「确定」摆到容器正中。这样得到的是绝对值，不依赖上一帧的累计结果：
 * 按钮宽度变化（如「取消」变成「结束出牌」）、容器宽度变化之后都能一次算准。
 * @param {HTMLElement} container - 控制栏容器
 * @returns {boolean} 是否发生了位置变化
 */
function layoutControls(container) {
	const nodes = [];
	for (const node of container.childNodes) {
		if (node.nodeType !== 1 || node.classList.contains("removing")) continue;
		nodes.push(node);
	}

	const confirm = ui.confirm; //●没有确认栏时（再战、退出房间等）不处理
	if (!confirm || confirm.parentNode !== container) return false;
	for (const node of nodes) ensureHitArea(node); //●点按钮之间的空白不再误触按钮

	const mobile = !!ui.arena?.classList?.contains("dui-mobile");
	const base = mobile ? 120 : -25; //●沿用 stayleft 原来的左基准
	const gap = 8; //●左侧按钮彼此之间的堆叠间距
	const sideGap = 30; //●左侧按钮右边缘到确认栏的间距，与「确定—取消」的间距保持一致

	//●左侧按钮（stayleft）按顺序排开，避免多个按钮叠在一起
	const sides = nodes.filter(node => node !== confirm && node.classList.contains("stayleft"));
	let cursor = base;
	for (const node of sides) {
		if (node._duiSideLeft !== cursor) {
			node._duiSideLeft = cursor;
			node.style.setProperty("left", cursor + "px", "important");
		}
		cursor += (node.offsetWidth || 0) + gap;
	}
	const sideRight = sides.length ? cursor - gap : -Infinity;
	//●按钮不再是 stayleft 时，清掉之前写进去的 left，交回样式表控制；
	//  变成 stayleft 的按钮则清掉之前算出来的平移，避免叠加两种定位
	for (const node of nodes) {
		if (node === confirm) continue;
		if (node.classList.contains("stayleft")) {
			if (node._duiShiftDelta) {
				node._duiShiftDelta = 0;
				node.style.translate = "";
			}
			continue;
		}
		if (node._duiSideLeft !== undefined) {
			node.style.removeProperty("left");
			node._duiSideLeft = undefined;
		}
	}

	//●其余控件保持在流内，整体平移让确认栏居中
	const flow = nodes.filter(node => node !== confirm && !node.classList.contains("stayleft"));
	flow.unshift(confirm);

	//●先把上一次的平移撤掉，保证下面量到的是原始布局
	const prevShift = confirm._duiShiftDelta || 0;
	const W = container.clientWidth;
	if (!W) return false;
	const cw = confirm.offsetWidth || 0;
	const cl = confirm.offsetLeft || 0;
	for (const node of flow) {
		if (node._duiShiftDelta) {
			node._duiShiftDelta = 0;
			node.style.translate = "";
		}
	}

	//●真实缩放比例：控制栏可能被 zoom / transform 缩放，
	//  getBoundingClientRect 是缩放后的像素，offsetWidth 是布局像素
	const containerRect = container.getBoundingClientRect();
	const scale = containerRect.width ? containerRect.width / W : 0;
	if (!scale) return false;
	const anchor = getConfirmAnchor(confirm);
	const anchorRect = anchor.getBoundingClientRect();

	//●让「确定」的中心落在容器正中（屏幕坐标换算回布局像素）
	let delta = (containerRect.left + containerRect.width / 2 - (anchorRect.left + anchorRect.width / 2)) / scale;
	if (Math.abs(delta) < 0.5) delta = 0; //●小于半像素就不动，避免无意义的抖动

	//●不能把最左侧的流内控件推出容器
	let minOffset = Infinity;
	for (const node of flow) {
		minOffset = Math.min(minOffset, node.offsetLeft || 0);
	}
	if (minOffset !== Infinity) delta = Math.max(delta, -minOffset);

	//●左侧按钮过长、会和确认栏靠得太近时，按它的右边缘退让，
	//  保证留出的间距和「确定—取消」一样
	if (sideRight + sideGap > cl + delta) {
		delta += sideRight + sideGap - (cl + delta);
	}
	//●不能超出容器右边
	delta = Math.min(delta, W - (cl + cw));

	for (const node of flow) {
		node._duiShiftDelta = delta;
		node.style.translate = delta ? delta + "px" : "";
	}
	return Math.abs(prevShift - delta) >= 0.5;
}

/**
 * 更新控制栏位置
 * @description 让确认栏始终居中；只有左侧按钮确实放不下时才右移确认栏。
 * 不再只处理 stayleft，所有控制按钮都参与计算。
 */
export function uiUpdatec() {
	//●非移动版样式一律走旧版逻辑，按钮位置保持十周年UI旧版文件的行为
	if (!isMobileStyle()) {
		uiUpdatecLegacy();
		return;
	}

	const container = ui.control;
	if (!container) return;
	const confirm = ui.confirm;
	if (!confirm || confirm.parentNode !== container) return;

	ensureConfirmObserver(confirm);
	ensureControlObservers(container);
	if (layoutControls(container)) scheduleVerify(); //●位置刚变过，后面几帧再复核
}

/**
 * 更新手牌布局
 * @description 触发decadeUI的手牌布局更新
 */
export function uiUpdatehl() {
	decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
}

/**
 * 更新判定区
 * @description 更新玩家判定区的卡牌显示
 * @param {Object} player - 玩家对象
 */
export function uiUpdatej(player) {
	if (!player) return;

	const judges = player.node.judges.childNodes;
	for (let i = 0; i < judges.length; i++) {
		if (judges[i].classList.contains("removing")) continue;
		judges[i].classList.remove("drawinghidden");

		if (_status.connectMode) {
			const bgMark = lib.translate[judges[i].name + "_bg"] || get.translation(judges[i].name)[0];
			judges[i].node.judgeMark.node.judge.innerHTML = bgMark;
		}
	}
}

/**
 * 更新标记（空实现）
 * @description 十周年UI中标记更新由其他机制处理
 * @param {Object} player - 玩家对象
 */
export function uiUpdatem(player) {}

/**
 * 更新缩放
 * @description 设置文档缩放比例
 */
export function uiUpdatez() {
	window.documentZoom = game.documentZoom;
	document.body.style.zoom = game.documentZoom;
	document.body.style.width = "100%";
	document.body.style.height = "100%";
	document.body.style.transform = "";
}

/**
 * ●取出内容区里的「卡牌按钮行」
 * @description 只处理直接子级的 .buttons，且该行里确实有卡牌按钮
 * @param {HTMLElement} content - 对话框内容区
 * @returns {HTMLElement[]} 卡牌按钮行
 */
function getCardButtonRows(content) {
	const rows = [];
	for (const node of content.children) {
		if (!node.classList || !node.classList.contains("buttons")) continue;
		if (!node.querySelector(".button.card")) continue;
		rows.push(node);
	}
	return rows;
}

/**
 * ●还原某一行的按钮缩放
 * @param {HTMLElement} row - 卡牌按钮行
 */
function clearCardRowZoom(row) {
	if (!row._duiFitZoom) return;
	row._duiFitZoom = undefined;
	for (const node of row.children) node.style.removeProperty("zoom");
}

/**
 * ●记录多排卡牌按钮的未缩放尺寸
 * @description 只在对话框结构变化时测量一次：测量前先还原缩放，
 * 并临时关闭过渡，避免 zoom 过渡动画还没结束就量到中间值
 * @param {HTMLElement} dialog - 对话框
 * @param {HTMLElement} content - 对话框内容区
 * @param {HTMLElement[]} rows - 卡牌按钮行
 * @param {string} signature - 内容结构标识
 * @param {number} limit - 对话框可用高度
 * @returns {{signature: string, limit: number, contentHeight: number, rowsHeight: number}} 测量结果
 */
function measureCardButtonRows(dialog, content, rows, signature, limit) {
	const buttons = [];
	for (const row of rows) {
		for (const node of row.children) {
			buttons.push({ node, transition: node.style.transition });
			node.style.transition = "none";
		}
	}
	for (const row of rows) clearCardRowZoom(row);

	const contentHeight = content.offsetHeight;
	let rowsHeight = 0;
	for (const row of rows) rowsHeight += row.offsetHeight;

	for (const { node, transition } of buttons) node.style.transition = transition;

	const base = { signature, limit, contentHeight, rowsHeight };
	dialog._duiFitBase = base;
	dialog._duiFitRows = rows;
	return base;
}

/**
 * ●让多排卡牌按钮适配对话框可用高度
 * @description 对话框高度被限制在可视区域的 45%（移动端 75%-80px），
 * 两排以上卡牌（如「韬饵」选择阶段：阶段列表 + 已记录阶段）的内容高度超过该限制时，
 * 最后一排会被 .content-container 的 overflow 裁到可视区外，表现为看不到也点不到。
 * 这里在内容超高时等比缩小各排卡牌，保证所有按钮都留在对话框内。
 * @param {HTMLElement} dialog - 对话框
 * @param {number} limit - 对话框可用高度
 * @returns {number} 缩放后的内容高度
 */
function fitCardButtonRows(dialog, limit) {
	const content = dialog.content;
	if (!content || !content.children) return Infinity;

	const rows = getCardButtonRows(content);
	if (rows.length < 2) {
		if (dialog._duiFitRows) for (const row of dialog._duiFitRows) clearCardRowZoom(row);
		dialog._duiFitRows = undefined;
		dialog._duiFitBase = undefined;
		return content.offsetHeight;
	}

	const signature = rows.map(row => row.childElementCount).join(",") + "|" + content.childElementCount;
	let base = dialog._duiFitBase;
	if (!base || base.signature !== signature || base.limit !== limit) {
		base = measureCardButtonRows(dialog, content, rows, signature, limit);
	}

	const { contentHeight, rowsHeight } = base;
	if (!(limit > 0) || contentHeight <= limit) {
		for (const row of rows) clearCardRowZoom(row);
		return contentHeight;
	}

	const baseHeight = contentHeight - rowsHeight;
	if (rowsHeight <= 0) return contentHeight;

	// 预留 4px，避免取整误差把最后一行裁掉几个像素
	const scale = Math.max(0.5, Math.min(1, (limit - baseHeight - 4) / rowsHeight));
	if (scale >= 1) return contentHeight;

	for (const row of rows) {
		if (row._duiFitZoom === scale) continue;
		row._duiFitZoom = scale;
		for (const node of row.children) node.style.zoom = scale.toFixed(3);
	}
	return baseHeight + rowsHeight * scale;
}

/**
 * 更新对话框
 * @description 更新对话框的高度和滚动状态
 */
export function uiUpdate() {
	for (const update of ui.updates) update();

	if (ui.dialog === undefined || ui.dialog.classList.contains("noupdate")) return;

	if (game.chess) return getBaseUiUpdate()?.();

	// 处理对话框样式
	if ((!ui.dialog.buttons || !ui.dialog.buttons.length) && !ui.dialog.forcebutton && ui.dialog.classList.contains("fullheight") === false && get.mode() !== "stone") {
		ui.dialog.classList.add("prompt");
	} else {
		ui.dialog.classList.remove("prompt");

		let height;
		if (decadeUI.isMobile()) {
			height = decadeUI.get.bodySize().height * 0.75 - 80;
		} else {
			height = decadeUI.get.bodySize().height * 0.45;
		}
		const contentHeight = fitCardButtonRows(ui.dialog, height);
		ui.dialog.style.height = Math.min(height, contentHeight) + "px";
	}

	// 处理滚动样式
	if (!ui.dialog.forcebutton && !ui.dialog._scrollset) {
		ui.dialog.classList.remove("scroll1");
		ui.dialog.classList.remove("scroll2");
	} else {
		ui.dialog.classList.add("scroll1");
		ui.dialog.classList.add("scroll2");
	}
}

/**
 * 更新判定标记
 * @description 更新判定区节点的变换样式
 * @param {Object} player - 玩家对象
 * @param {NodeList} nodes - 节点列表
 * @param {number} [start=0] - 起始位置
 * @param {boolean} [inv] - 是否反转
 */
export function uiUpdatejm(player, nodes, start, inv) {
	if (typeof start != "number") start = 0;

	for (let i = 0; i < nodes.childElementCount; i++) {
		const node = nodes.childNodes[i];
		if (i < start) {
			node.style.transform = "";
		} else if (node.classList.contains("removing")) {
			start++;
		} else {
			node.classList.remove("drawinghidden");
		}
	}
}

/**
 * 节流更新 - 延迟初始化
 * @type {Function|null}
 * @private
 */
let _uiUpdatexr = null;

/**
 * 节流更新方法
 * @description 使用节流函数限制更新频率
 * @returns {*} 更新结果
 */
export function uiUpdatexr() {
	if (!_uiUpdatexr) {
		_uiUpdatexr = throttle(ui.updatex, 100, ui);
	}
	return _uiUpdatexr.apply(this, arguments);
}
