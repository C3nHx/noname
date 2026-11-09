import { lib, game, ui, get, ai, _status } from "../../../noname.js";

const BTN_SEL = ".lbtn-paixu,.lbtn-paixu1";
const IMG_NORMAL = "extension/十周年UI/ui/assets/lbtn/shousha/btn-paixu.png";
const MOVE_MS = 170;

function enabled() {
	return lib.config.extension_自用美化_paixuBtn !== false && !_status.connectMode && lib.config.extension_十周年UI_enable && lib.config.extension_十周年UI_newDecadeStyle === "off";
}

function stopAutoPaixu() {
	try {
		if (ui._autoPaixuObserver) ui._autoPaixuObserver.disconnect();
	} catch (e) {}
	ui._autoPaixuObserver = null;
	try {
		if (ui._autoPaixuDebounce) clearTimeout(ui._autoPaixuDebounce);
	} catch (e) {}
	ui._autoPaixuDebounce = null;
	try {
		if (ui._autoPaixuKeeper) clearInterval(ui._autoPaixuKeeper);
	} catch (e) {}
	ui._autoPaixuKeeper = null;
	ui._autoPaixuEnabled = false;
	ui._autoPaixuSorting = false;
	try {
		window.paixuxx = false;
	} catch (e) {}
}

function sortOnce(reverse) {
	const me = game.me;
	if (!me || !me.node || !me.node.handcards1) return;
	try {
		if (me.hasSkillTag && me.hasSkillTag("noSortCard")) return;
	} catch (e) {}
	const cont = me.node.handcards1;
	let nodes = [];
	let topNodes = [];
	try {
		Array.prototype.slice.call(cont.childNodes).forEach(function (c) {
			if (c && c.cardsTop) topNodes.push(c);
		});
	} catch (e) {}
	try {
		nodes = me.getCards("hs").filter(function (c) {
			return c && c.parentNode === cont && !c.cardsTop;
		});
	} catch (e) {
		nodes = Array.prototype.slice.call(cont.childNodes).filter(function (c) {
			return !(c && c.cardsTop);
		});
	}
	if ((!nodes || nodes.length < 2) && !topNodes.length) return;
	const order = { basic: 0, trick: 1, delay: 1, equip: 2 };
	const rank = function (c) {
		const t = order[get.type(c)];
		return t === undefined ? 99 : t;
	};
	const dir = reverse ? -1 : 1;
	const sorted = nodes.slice().sort(function (a, b) {
		const ca = rank(a);
		const cb = rank(b);
		if (ca !== cb) return (ca - cb) * dir;
		if (a.name !== b.name) return lib.sort.card(a.name, b.name);
		if (a.suit !== b.suit) return lib.suit.indexOf(a.suit) - lib.suit.indexOf(b.suit);
		return a.number - b.number;
	});
	nodes.forEach(function (n) {
		try {
			if (n.__ssPaixuPrev === undefined) n.__ssPaixuPrev = [n.style.transitionDuration, n.style.transitionDelay];
			n.style.setProperty("transition-duration", MOVE_MS + "ms", "important");
			n.style.setProperty("transition-delay", "0s", "important");
		} catch (e) {}
	});
	try {
		for (let k = 0; k < sorted.length; k++) {
			if (cont.childNodes[k] !== sorted[k]) cont.insertBefore(sorted[k], cont.childNodes[k] || null);
		}
	} catch (e) {}
	try {
		for (let k = 0; k < topNodes.length; k++) cont.appendChild(topNodes[k]);
	} catch (e) {}
	try {
		if (typeof decadeUI !== "undefined") decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
	} catch (e) {}
	setTimeout(function () {
		nodes.forEach(function (n) {
			try {
				const p = n.__ssPaixuPrev;
				if (!p) return;
				delete n.__ssPaixuPrev;
				if (p[0]) n.style.setProperty("transition-duration", p[0]);
				else n.style.removeProperty("transition-duration");
				if (p[1]) n.style.setProperty("transition-delay", p[1]);
				else n.style.removeProperty("transition-delay");
			} catch (e) {}
		});
	}, MOVE_MS + 220);
}

function restoreImg(btn) {
	try {
		btn.style.setProperty("background-image", "url('" + lib.assetURL + IMG_NORMAL + "')", "important");
		btn.style.setProperty("background-size", "100% 100%", "important");
	} catch (e) {}
}

function patch(btn) {
	if (!btn || btn.__ssPaixuPatched) return;
	if (!enabled()) return;
	btn.__ssPaixuPatched = true;
	btn.__ssPaixuOrig = btn.onclick;
	btn.__ssPaixuFlip = true;
	btn.onclick = function (e) {
		if (!enabled()) {
			if (typeof btn.__ssPaixuOrig === "function") btn.__ssPaixuOrig.call(btn, e);
			return;
		}
		stopAutoPaixu();
		restoreImg(btn);
		btn.__ssPaixuFlip = !btn.__ssPaixuFlip;
		sortOnce(!!btn.__ssPaixuFlip);
	};
	stopAutoPaixu();
	restoreImg(btn);
}

export function paixuBtn() {
	if (!enabled()) return;
	if (window.__ssPaixuInstalled) return;
	window.__ssPaixuInstalled = true;
	try {
		let st = document.getElementById("ss-paixu-z");
		if (!st) {
			st = document.createElement("style");
			st.id = "ss-paixu-z";
			document.head.appendChild(st);
		}
		st.textContent =
			"body.ss-compare-on .lbtn-controls{z-index:1200 !important;}" +
			"body.ss-compare-on .lbtn-paixu,body.ss-compare-on .lbtn-paixu1," +
			"body.ss-compare-on .latn-jilu,body.ss-compare-on .latn-jilu1{z-index:1200 !important;}";
	} catch (e) {}
	stopAutoPaixu();
	const tick = function () {
		try {
			document.querySelectorAll(BTN_SEL).forEach(patch);
		} catch (e) {}
	};
	tick();
	//●改为事件驱动：十周年UI 把手牌区按钮直接挂在 ui.arena 下，
	//  监听新增节点即可，不再每 500ms 全文档扫描。
	try {
		if (ui.arena && !window.__ssPaixuObserver) {
			window.__ssPaixuObserver = new MutationObserver(function (records) {
				for (let i = 0; i < records.length; i++) {
					const added = records[i].addedNodes;
					for (let j = 0; j < added.length; j++) {
						const n = added[j];
						if (!n || n.nodeType !== 1 || !n.classList) continue;
						if (n.classList.contains("lbtn-paixu") || n.classList.contains("lbtn-paixu1")) patch(n);
					}
				}
			});
			window.__ssPaixuObserver.observe(ui.arena, { childList: true });
		}
	} catch (e) {}
}
