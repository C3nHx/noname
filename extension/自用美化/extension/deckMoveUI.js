import { lib, ui, _status } from "../../../noname.js";

//●进度条时限（秒）：联机 choose_timeout 优先；否则用十周年UI的「进度条速度」（配置值是秒数的 2 倍）；都没有则固定 30 秒
function ssProgressSeconds() {
	try {
		const ol = lib.configOL;
		if (ol && ol.choose_timeout != null && ol.choose_timeout !== "") {
			const n = parseFloat(ol.choose_timeout);
			if (isFinite(n) && n > 0) return n;
		}
	} catch (e) {}
	try {
		const cfg = lib.config && lib.config.extension_十周年UI_jindutiaoST;
		const n = parseFloat(cfg);
		if (isFinite(n) && n > 0) return n / 2;
	} catch (e) {}
	return 30;
}

/*
 * 手杀观星框：把 lib.element.content.chooseToMove 生成的两行分牌窗口
 *（观星/辅主/问天等“牌堆顶—牌堆底”界面）改成仿魄袭框样式。
 * 只处理 list 恰好为两组的 chooseToMove，其他分组数量保持原版。
 */

const NS = "__ssDeckMove";

function node() {
	if (!window[NS]) window[NS] = {};
	return window[NS];
}

node().loadCss = function () {
	//●给 CSS 一个「未装十周年UI」的标记：.info 的修正只在这种情况下生效
	try { document.body.classList.toggle("ss-no-decade", !window.decadeUI); } catch (e) {}
	if (window[NS]._cssLoaded) return;
	window[NS]._cssLoaded = true;
	try {
		if (!document.getElementById("ss-deck-move-css")) {
			const link = document.createElement("link");
			link.id = "ss-deck-move-css";
			link.rel = "stylesheet";
			link.href = lib.assetURL + "extension/自用美化/css/deckMoveUI.css";
			document.head.appendChild(link);
		}
	} catch (e) {}
};

/*
 * 原生在事件结束后会 delete ui.selected.guanxing_buttons，
 * 但窗口关闭动画期间迟到的 touchend/click 仍会触发挂在 dialog 上的 dragEnd，
 * 在 document 捕获阶段先补回空数组，避免“Cannot read properties of undefined (reading 'length')”。
 */
node().guardSelected = function () {
	if (window[NS]._guardInstalled) return;
	window[NS]._guardInstalled = true;
	const gxGuard = function () {
		try {
			if (!document.getElementById("ss-deckmove")) return;
			if (!ui.selected) return;
			if (!ui.selected.guanxing_buttons) ui.selected.guanxing_buttons = [];
			if (!ui.selected.guanxing_button) ui.selected.guanxing_button = null;
		} catch (e) {}
	};
	["touchstart", "touchmove", "touchend", "touchcancel", "mousedown", "mousemove", "mouseup", "click"].forEach(function (type) {
		document.addEventListener(type, gxGuard, true);
	});
};

function eligible(event) {
	if (!event || event.name !== "chooseToMove") return false;
	if (!Array.isArray(event.list) || event.list.length !== 2) return false;
	if (typeof event.isMine == "function" && !event.isMine()) return false;
	return true;
}

function promptText(event, content) {
	let text = "";
	try {
		if (typeof event.prompt == "string") text = event.prompt;
	} catch (e) {}
	if (!text && content) {
		const first = Array.from(content.children).find(
			(n) => n.classList && n.classList.contains("caption") && !n.classList.contains("choosetomove")
		);
		if (first) text = first.textContent || "";
	}
	return (text || "").trim();
}

function skinDialog(dlg, event) {
	if (dlg.__ssDeckMoveSkined) return true;
	if (!document.body.contains(dlg)) return false;
	const content = dlg.content;
	if (!content) return false;
	const children = Array.from(content.children);
	const captions = children.filter((n) => n.classList && n.classList.contains("caption") && n.classList.contains("choosetomove"));
	const buttonsArr = children.filter((n) => n.classList && n.classList.contains("buttons") && n.classList.contains("guanxing"));
	if (buttonsArr.length < 2 || captions.length < 2) return false;
	dlg.__ssDeckMoveSkined = true;

	node().loadCss();
	document.body.classList.add("ss-deckmove-open");
	//●观星框：参考魄袭框——只隐藏本体确认条，不设 noconfirm、不删除 ui.confirm；
	//  框打开期间每 100ms 再压一次，框关闭后再恢复，换牌过程中不会提前冒出来
	try {
		if (ui.confirm) ui.confirm.style.setProperty("display", "none", "important");
		dlg.querySelectorAll(".dialog-confirm").forEach(function (el) {
			el.style.setProperty("display", "none", "important");
		});
	} catch (e) {}

	dlg.id = "ss-deckmove";
	["scroll1", "scroll2", "fullwidth", "fullheight"].forEach((cls) => dlg.classList.remove(cls));

	const labels = [0, 1].map((i) => (captions[i].textContent || "").trim());
	const hint = captions[2] ? (captions[2].textContent || "").trim() : "";
	const fullPrompt = promptText(event, content);
	let title = "";
	let desc = "";
	const colon = fullPrompt.search(/[：:]/);
	if (colon >= 0) {
		title = fullPrompt.slice(0, colon).trim();
		desc = fullPrompt.slice(colon + 1).trim();
	} else {
		//●prompt 没写技能名时，统一从事件链解析技能名（和拆顺框、魄袭框标题保持一致）
		try {
			title = window.ssFrameTitle ? window.ssFrameTitle(event, "") || "" : "";
		} catch (e) {}
		if (!title) title = "选择卡牌";
		desc = fullPrompt;
	}
	if (!title) title = "选择卡牌";
	if (!desc) desc = hint;

	const wrap = ui.create.div(".ss-wrap", dlg);
	const titleNode = ui.create.div(".ss-title", wrap);
	titleNode.textContent = title;
	//●标题右侧小三角：点击折叠/展开（样式参考拆顺框、魄袭框）
	const arrow = document.createElement("img");
	arrow.src = lib.assetURL + "extension/自用美化/image/arrow.png";
	arrow.alt = "";
	titleNode.appendChild(arrow);
	arrow.addEventListener("click", function (e) {
		e.stopPropagation();
		dlg.classList.toggle("ss-folded");
		try {
			foldedAdjust();
		} catch (err) {}
	});

	const nameTop = ui.create.div(".ss-name", wrap);
	nameTop.classList.add("ss-top");
	const nameTopText = ui.create.div(".ss-name-text", nameTop);
	//●逐字换行：括号等标点不会被禁则规则和相邻字绑在一行，竖排为 ( / 你 / )
	nameTopText.textContent = Array.from(labels[0] || "牌堆顶").join("\n");
	nameTopText.scrollTop = 0;
	const nameBottom = ui.create.div(".ss-name", wrap);
	nameBottom.classList.add("ss-bottom");
	const nameBottomText = ui.create.div(".ss-name-text", nameBottom);
	nameBottomText.textContent = Array.from(labels[1] || "牌堆底").join("\n");
	nameBottomText.scrollTop = 0;

	const areaTop = ui.create.div(".ss-area", wrap);
	areaTop.classList.add("ss-top");
	const areaBottom = ui.create.div(".ss-area", wrap);
	areaBottom.classList.add("ss-bottom");
	const areas = [areaTop, areaBottom];

	for (let i = 0; i < 2; i++) {
		const btn = buttonsArr[i];
		const prev = btn.previousElementSibling;
		if (prev && prev.classList && prev.classList.contains("select-all")) areas[i].appendChild(prev);
		areas[i].appendChild(btn);
	}
	try {
		content.style.setProperty("display", "none", "important");
	} catch (e) {}

	const bar = ui.create.div(".ss-bar", wrap);
	const ok = ui.create.div(".ss-ok", bar);
	const no = ui.create.div(".ss-no", bar);
	if (event.forced) no.style.setProperty("display", "none", "important");

	const timer = ui.create.div(".ss-timer", wrap);
	const fill = ui.create.div(".ss-fill", timer);
	if (desc) {
		const descNode = ui.create.div(".ss-desc", wrap);
		descNode.textContent = desc;
	}

	const evName = lib.config.touchscreen ? "touchend" : "click";
	//●原生确认/取消后会 delete ui.selected.guanxing_buttons，这里在下一次宏任务补回空数组，
	//  防止窗口关闭动画期间迟到的 touchend 再触发原生 dragEnd 时报 undefined
	const restoreSelected = function () {
		try {
			if (ui.selected && !ui.selected.guanxing_buttons) {
				ui.selected.guanxing_buttons = [];
				ui.selected.guanxing_button = null;
			}
		} catch (e) {}
	};
	ok.addEventListener(evName, function (e) {
		e.stopPropagation();
		if (ok.classList.contains("ss-disabled")) return;
		try {
			ui.click.ok();
		} catch (err) {}
		setTimeout(restoreSelected, 0);
	});
	no.addEventListener(evName, function (e) {
		e.stopPropagation();
		try {
			ui.click.cancel();
		} catch (err) {}
		setTimeout(restoreSelected, 0);
	});

	const setBox = function (folded) {
		dlg.style.setProperty("position", "absolute", "important");
		dlg.style.setProperty("left", "calc(50% - 651.5px)", "important");
		dlg.style.setProperty("right", "auto", "important");
		//●折叠态统一位置：由 extension.js 的 --ss-fold-top 控制
		dlg.style.setProperty("top", folded ? "var(--ss-fold-top)" : "65px", "important");
		dlg.style.setProperty("bottom", "auto", "important");
		dlg.style.setProperty("width", "1303px", "important");
		dlg.style.setProperty("max-width", "none", "important");
		dlg.style.setProperty("margin", "0", "important");
		dlg.style.setProperty("transform", "none", "important");
		dlg.style.setProperty("display", "block", "important");
		dlg.style.setProperty("z-index", "60", "important");
		dlg.style.setProperty("pointer-events", "auto", "important");
		dlg.style.setProperty("overflow", "visible", "important");
		dlg.style.setProperty("animation", "none", "important");
		dlg.style.setProperty("-webkit-animation", "none", "important");
		dlg.style.setProperty("transition", "none", "important");
		dlg.style.setProperty("background-size", folded ? "100% auto" : "100% 100%", "important");
	};

	const fit = function () {
		if (!document.body.contains(dlg)) return;
		const folded = dlg.classList.contains("ss-folded");
		let ch = dlg.__ssCh || 0;
		try {
			const card = areaTop.querySelector(".buttons > .card") || areaBottom.querySelector(".buttons > .card");
			if (card) {
				let scale = 1;
				try {
					const dr = dlg.getBoundingClientRect();
					if (dlg.offsetWidth && dr.width) scale = dr.width / dlg.offsetWidth;
				} catch (e2) {}
				if (!scale || !isFinite(scale)) scale = 1;
				ch = Math.round((card.getBoundingClientRect().height || 0) / scale) || Math.round(card.offsetHeight || 0);
			}
		} catch (e) {}
		if (!ch) ch = 106;
		if (dlg.__ssCh !== ch) {
			dlg.__ssCh = ch;
			dlg.style.setProperty("--ss-ch", ch + "px");
		}
		dlg.style.setProperty("height", (folded ? 78 : 138 + 2 * (ch + 4)) + "px", "important");
		setBox(folded);
		if (folded) return;
		//●左侧竖标签跟着卡槽高度垂直居中（魄袭框同款处理）
		try {
			[
				[nameTop, areaTop],
				[nameBottom, areaBottom],
			].forEach(function (pair) {
				const nm = pair[0];
				const ar = pair[1];
				const nh = nm.offsetHeight;
				if (!nh) return;
				nm.style.setProperty("top", Math.round(ar.offsetTop + (ar.offsetHeight - nh) / 2) + "px", "important");
			});
		} catch (e) {}
	};
	const foldedAdjust = function () {
		fit();
	};

	const syncOk = function () {
		try {
			const ready = typeof event.filterOk != "function" || event.filterOk(event.moved || []);
			ok.classList.toggle("ss-disabled", !ready);
			ok.style.setProperty("pointer-events", ready ? "auto" : "none", "important");
		} catch (e) {}
	};

	setBox(false);
	fit();
	setTimeout(fit, 60);
	setTimeout(fit, 200);
	setTimeout(fit, 500);
	setTimeout(fit, 1000);
	syncOk();

	//●红色进度条：与拆顺框一致，用 transition 从 100% 走到 0%；时限统一由 ssProgressSeconds 决定
	const countdown = function () {
		const dur = ssProgressSeconds();
		try {
			fill.style.setProperty("transition", "none", "important");
			fill.style.setProperty("width", "100%", "important");
			void fill.offsetWidth;
			fill.style.setProperty("transition", "width " + dur + "s linear", "important");
			fill.style.setProperty("width", "0%", "important");
		} catch (e) {}
	};
	countdown();

	const iv = setInterval(function () {
		try {
			if (!document.body.contains(dlg)) {
				clearInterval(iv);
				//●同屏若已有新的观星框（换牌/连续观星），保留 body 标记，避免本体按钮提前出现
				if (!document.getElementById("ss-deckmove")) {
					document.body.classList.remove("ss-deckmove-open");
					try {
						if (ui.confirm) ui.confirm.style.removeProperty("display");
					} catch (e) {}
				}
				return;
			}
			//●框还开着：本体确认条若被 game.check 重新创建，继续压掉
			try {
				if (ui.confirm) ui.confirm.style.setProperty("display", "none", "important");
			} catch (e) {}
			//●确认后窗口进入关闭动画时立刻屏蔽触摸并补回选中数组，避免迟到的 touchend 触发原生 dragEnd
			if (dlg.classList.contains("removing")) {
				dlg.style.setProperty("pointer-events", "none", "important");
				restoreSelected();
			}
			syncOk();
		} catch (e) {}
	}, 100);
	return true;
}

function queueSkin(dlg, event) {
	let tries = 0;
	const run = function () {
		if (dlg.__ssDeckMoveSkined) return;
		if (!document.body.contains(dlg)) {
			if (++tries > 10) {
				dlg.__ssDeckMoveSkined = true;
				return;
			}
			return setTimeout(run, 50);
		}
		if (skinDialog(dlg, event)) return;
		if (++tries > 10) {
			dlg.__ssDeckMoveSkined = true;
			return;
		}
		setTimeout(run, 50);
	};
	setTimeout(run, 0);
}

function applyOverride() {
	if (!lib.element || !lib.element.content || typeof lib.element.content.chooseToMove != "function") return;
	const current = lib.element.content.chooseToMove;
	if (current.__ssDeckMove === true) {
		window.__ssDeckMoveApplied = true;
		return;
	}
	const original = current;
	const wrapped = async function (event, trigger, player) {
		if (!eligible(event)) return original.apply(this, arguments);
		event.__ssDeckMoveQueued = true;
		const createDialog = ui.create.dialog;
		ui.create.dialog = function (...args) {
			const dlg = createDialog.apply(this, args);
			try {
				if (_status.event === event) queueSkin(dlg, event);
			} catch (e) {}
			return dlg;
		};
		try {
			return await original.apply(this, arguments);
		} finally {
			ui.create.dialog = createDialog;
		}
	};
	wrapped.__ssDeckMove = true;
	lib.element.content.chooseToMove = wrapped;
	window.__ssDeckMoveApplied = true;
}

export function deckMoveUI() {
	node().loadCss();
	node().guardSelected();
	applyOverride();
	try {
		if (lib.arenaReady && typeof lib.arenaReady.push == "function") {
			lib.arenaReady.push(applyOverride);
		}
	} catch (e) {}
	try {
		if (!window.__ssDeckMoveGuard) {
			window.__ssDeckMoveGuard = setInterval(function () {
				try {
					const c = lib.element && lib.element.content && lib.element.content.chooseToMove;
					if (typeof c != "function" || c.__ssDeckMove !== true) applyOverride();
				} catch (e) {}
			}, 3000);
		}
	} catch (e) {}
}
