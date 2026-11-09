import { lib, game, ui, get, ai, _status } from "../../../noname.js";

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

//●统一标题：先走 window.ssFrameTitle；取不到时，联机客机用主机 logv 广播记录下来的技能名兜底
/*●联机标题队列：主机在“事件创建的那一刻”就把技能/卡牌名记下来并广播，
  客机建框时按类型取队首。这样不再依赖“框出现时事件链还在不在”，也不会受动画延迟影响。 */
window.__ssTitleQueues = window.__ssTitleQueues || {};
window.ssPushTitle = function (type, title, pid, isCard) {
	try {
		if (!title || !type) return;
		var key = type + "|" + (pid == null ? "-" : pid);
		//●记入“最近标题栈”，并标记卡牌/技能：客机按同类最近一条取，不会把过河拆桥显示成技能名
		try { if (window.ssRememberTitle) window.ssRememberTitle(title, pid, isCard); } catch (e) {}
		//●先在本机记一份：客机自己发起的事件也要能取到标题（主机没装扩展时尤其重要）
		try {
			window.__ssTitleQueues = window.__ssTitleQueues || {};
			var lq = window.__ssTitleQueues[key] || (window.__ssTitleQueues[key] = []);
			lq.push(title);
			if (lq.length > 20) lq.shift();
		} catch (e) {}
		//●主机再广播给客机
		if (!game.online || !game.servermode || typeof game.broadcast !== "function") return;
		game.broadcast(function (t, s) {
			try {
				window.__ssTitleQueues = window.__ssTitleQueues || {};
				var q = window.__ssTitleQueues[s] || (window.__ssTitleQueues[s] = []);
				q.push(t);
				if (q.length > 20) q.shift();
			} catch (e) {}
		}, title, key);
	} catch (e) {}
};
window.ssPopTitle = function (type, pid) {
	try {
		var Q = window.__ssTitleQueues;
		if (!Q) return null;
		var key = type + "|" + (pid == null ? "-" : pid);
		var q = Q[key];
		if (q && q.length) return q.shift();
		//●精确分桶没命中（客机上事件没带玩家）时，取该类型最早的一条，避免标题丢失
		var pre = type + "|";
		for (var k in Q) {
			if (k.indexOf(pre) === 0 && Q[k] && Q[k].length) return Q[k].shift();
		}
	} catch (e) {}
	return null;
};
window.__ssPidOf = function (evt) {
	try {
		if (evt && evt.player && evt.player.playerid != null) return evt.player.playerid;
	} catch (e) {}
	return null;
};
window.ssTitleFor = function (evt, fb, type) {
	//●统一交给 ssFrameTitle：它内部已经包含 客机队列 → 事件链 → 主机 logv 记录 的完整顺序
	try {
		if (window.ssFrameTitle) {
			var t = window.ssFrameTitle(evt, null);
			if (t) return t;
		}
	} catch (e) {}
	return fb;
};


/*●在事件创建时记录标题（主机广播给客机）：_status.event 此刻一定是技能/卡牌事件，取值稳定 */
(function () {
	var TYPES = {
		choosePlayerCard: "choose",
		gainPlayerCard: "gain",
		discardPlayerCard: "discard",
		chooseToCompare: "compare",
		chooseToCompareMultiple: "compare",
	};
	var done = false;
	function wrap() {
		try {
			var proto = lib.element.player && lib.element.player.prototype;
			if (!proto) return false;
			if (proto.__ssTitleWrapped) { done = true; return true; }
			for (var name in TYPES) {
				if (typeof proto[name] !== "function") continue;
				(function (nm, ty) {
					var orig = proto[nm];
					proto[nm] = function () {
						try {
							var t = window.ssFrameTitle ? window.ssFrameTitle(_status.event, null) : null;
							if (t) {
								//●判断是卡牌还是技能：链上出现 cards/card 即为卡牌（过河拆桥、顺手牵羊这类）
								var isCard = null;
								try {
									var ee = _status.event, dd = 0;
									while (ee && dd < 6) {
										if ((Array.isArray(ee.cards) && ee.cards.length) || ee.card) { isCard = true; break; }
										ee = ee.parent;
										dd++;
									}
								} catch (e0) {}
								window.ssPushTitle(ty, t, this && this.playerid != null ? this.playerid : null, isCard);
							}
						} catch (e) {}
						return orig.apply(this, arguments);
					};
				})(name, TYPES[name]);
			}
			proto.__ssTitleWrapped = true;
			done = true;
			return true;
		} catch (e) { return false; }
	}
	if (!wrap()) {
		var iv = setInterval(function () { if (wrap()) clearInterval(iv); }, 300);
	}
})();

const EXT_NAME = "自用美化";

const BASE = lib.assetURL + "extension/" + EXT_NAME + "/";

//●折叠下限：折叠后每张牌至少保留自身宽度的这个比例（0.09 = 9%），防止牌太多时无限折叠成一条
//  调大 → 折叠得更松（列更长、更容易横向滑动）；调小 → 可以叠得更紧。
//  ●必须挂在 window 上：discardPlayerCard 等事件内容在 StepCompiler 的独立上下文执行，模块内的 const 在那里不可见（会报 SS_HAND_MIN_RATIO is not defined）
window.__ssHandMinRatio = 0.1;
//●折叠阈值：整排总宽超过「N 张牌的自然总宽」才开始折叠（N 默认 10）。
//  不再按卡槽宽度判断（那样实测约 7 张就压缩，太早）；折叠时压到「N 张牌的总宽」，不是压到卡槽宽。
//  同样挂在 window 上（事件内容在 StepCompiler 独立上下文执行，模块内 const 不可见）。
window.__ssHandFoldCards = 9;

export function initShunshouCss() {
	//●给 CSS 一个「未装十周年UI」的标记：22 版新增的 .info 修正只在这种情况下生效，
	//  装了十周年UI时不再覆盖卡牌自身布局（否则会把 gaintag 等标记挤偏）
	try { document.body.classList.toggle("ss-no-decade", !window.decadeUI); } catch (e) {}
	const href = BASE + "css/shunshou.css";
	document.querySelectorAll('link[href*="shunshou.css"]').forEach(el => el.remove());
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = href + "?v=" + Date.now();
	document.head.appendChild(link);
}

window.__ssAutoConfirmOn = function (dialog) {
	try {
		if (!dialog || typeof lib === "undefined" || !lib.config) return;
		if (dialog.__ssAcSuppress) return;
		if (lib.config.auto_confirm) return;
		try { if (dialog.__ssMo2) { dialog.__ssMo2.disconnect(); dialog.__ssMo2 = null; } if (dialog.__ssIv) { clearInterval(dialog.__ssIv); dialog.__ssIv = null; } } catch (e) {}
		dialog.__ssAutoConfirm = true;
		dialog.__ssPrevAc = !!lib.config.auto_confirm;
		lib.config.auto_confirm = true;
		const bornAt = Date.now();
		const mo = new MutationObserver(function () {
			try {
				const gone = !dialog.isConnected ||
					(Date.now() - bornAt > 1200 && (getComputedStyle(dialog).display === "none" || dialog.offsetParent === null));
				if (gone) {
					mo.disconnect();
					dialog.__ssAutoConfirm = false;
					dialog.__ssMo2 = null;
					lib.config.auto_confirm = !!dialog.__ssPrevAc;
				}
			} catch (e) {}
		});
		try { mo.observe(dialog.parentNode || document.body, { childList: true }); } catch (e) {}
		try { mo.observe(dialog, { attributes: true, attributeFilter: ["style", "class"] }); } catch (e) {}
		dialog.__ssMo2 = mo;
		const iv = setInterval(function () {
			try {
				if (!dialog.isConnected || (Date.now() - bornAt > 1200 && (getComputedStyle(dialog).display === "none" || dialog.offsetParent === null))) {
					clearInterval(iv); mo.disconnect();
					dialog.__ssAutoConfirm = false; dialog.__ssMo2 = null; dialog.__ssIv = null;
					lib.config.auto_confirm = !!dialog.__ssPrevAc;
				}
			} catch (e) { clearInterval(iv); }
		}, 400);
		dialog.__ssIv = iv;
	} catch (e) {}
};

window.__ssAutoConfirmSuppress = function (dialog) {
	try {
		if (!dialog || typeof lib === "undefined" || !lib.config) return;
		dialog.__ssAcSuppress = true;
		try { if (dialog.__ssMo2) { dialog.__ssMo2.disconnect(); dialog.__ssMo2 = null; } if (dialog.__ssIv) { clearInterval(dialog.__ssIv); dialog.__ssIv = null; } } catch (e) {}
		dialog.__ssAutoConfirm = false;
		if (typeof dialog.__ssPrevAc === "undefined") dialog.__ssPrevAc = !!lib.config.auto_confirm;
		lib.config.auto_confirm = false;
		const bornAt = Date.now();
		const _restore = function () {
			try {
				if (dialog.__ssAcRestored) return;
				dialog.__ssAcRestored = true;
				dialog.__ssAcSuppress = false;
				lib.config.auto_confirm = !!dialog.__ssPrevAc;
			} catch (e) {}
		};
		const mo = new MutationObserver(function () {
			try {
				const gone = !dialog.isConnected ||
					(Date.now() - bornAt > 1200 && (getComputedStyle(dialog).display === "none" || dialog.offsetParent === null));
				if (gone) {
					mo.disconnect();
					dialog.__ssMo2 = null;
					_restore();
				}
			} catch (e) {}
		});
		try { mo.observe(dialog.parentNode || document.body, { childList: true }); } catch (e) {}
		try { mo.observe(dialog, { attributes: true, attributeFilter: ["style", "class"] }); } catch (e) {}
		dialog.__ssMo2 = mo;
		const iv = setInterval(function () {
			try {
				if (!dialog.isConnected || (Date.now() - bornAt > 1200 && (getComputedStyle(dialog).display === "none" || dialog.offsetParent === null))) {
					clearInterval(iv); mo.disconnect();
					dialog.__ssMo2 = null; dialog.__ssIv = null;
					_restore();
				}
			} catch (e) { clearInterval(iv); }
		}, 400);
		dialog.__ssIv = iv;
	} catch (e) {}
};

function patchDialogAdd() {
	if (lib.element.dialog.add.__ssPatched) return;
		const _coreAdd = lib.element.dialog.add;
	lib.element.dialog.add = function (item, noclick, zoom, ac) {
		var _content = this.content || this;
		var _before = _content.querySelectorAll ? Array.prototype.slice.call(_content.querySelectorAll(".buttons")) : [];
		var _result = _coreAdd.call(this, item, noclick, zoom);
		if (ac) {
			var _after = _content.querySelectorAll ? Array.prototype.slice.call(_content.querySelectorAll(".buttons")) : [];
			for (var _i = 0; _i < _after.length; _i++) {
				if (_before.indexOf(_after[_i]) < 0) ac.appendChild(_after[_i]);
			}
		}
		return _result;
	};
	lib.element.dialog.add.__ssPatched = true;
	//●本包装是在手杀美化之后套上的，把它的安装标记带到最外层，避免调试时被误判为未安装
	if (_coreAdd.__ssShoushaAdd) lib.element.dialog.add.__ssShoushaAdd = true;
}

window.__ssRestoreNativeUI = function () {
	try {
		if (ui.confirm && ui.confirm._ssTmpHidden) {
			ui.confirm._ssTmpHidden = false;
			ui.confirm.show();
		}
	} catch (e) {}
};

function patchConfirm() {
	if (game.check.__ssShunshouCheck) return;
	const _check = game.check;
	game.check = function () {
		const result = _check.apply(this, arguments);
		const evt = _status.event;
		try {
		const ssDlg = document.getElementById("shunshouDialog");
		//●moveCard 的对话框也用了同一个 id，但它有自己的布局和按钮；
		//  这里绝不能走普通拆顺框的逻辑（会被移到 body、塞入本体进度条/新的 .ss-timer，
		//  导致按钮栏和进度条位置错乱）。用 .ss-move 区分并跳过。
		const _ssMoveDlg = !!(ssDlg && ssDlg.classList && ssDlg.classList.contains("ss-move"));
		document.body.classList.toggle("ss-dlg-open", !!ssDlg);
		if (ssDlg && !_ssMoveDlg) {
			try { if (window.__ssApplyZoom) window.__ssApplyZoom(); } catch (e) {}
			//●对话框显示后再补测一次卡牌尺寸：之前 dialog 可能还没显示（尺寸为 0），导致卡槽用了默认尺寸没跟着卡牌变小
			try {
				if (window.__ssSyncCardVars) window.__ssSyncCardVars(ssDlg);
				if (window.__ssSyncCardVarsSoon && !ssDlg.__ssSyncQueued) {
					ssDlg.__ssSyncQueued = true;
					window.__ssSyncCardVarsSoon(ssDlg);
				}
			} catch (e) {}
			if (window.__ssAutoConfirmOn) window.__ssAutoConfirmOn(ssDlg);
			if (!ssDlg.classList.contains("ss-look")) {
				try {
					const _bw = Math.round(132 * K);
					const _bh = Math.round(52 * K);
					const _bm = Math.round(28 * K);
					const _bb = Math.round(36 * K);
					document.querySelectorAll(".dialog-confirm").forEach(function (_cf) {
						try {
							if (_cf._ssCfStyled) return;
							if (_cf.closest && _cf.closest("#shunshouDialog.ss-look")) return;
							_cf._ssCfStyled = true;
							const _cs = _cf.style;
							_cs.setProperty("left", "0", "important");
							_cs.setProperty("right", "0", "important");
							_cs.setProperty("width", "100%", "important");
							_cs.setProperty("margin", "0", "important");
							_cs.setProperty("height", _bh + "px", "important");
							_cs.setProperty("bottom", _bb + "px", "important");
							_cs.setProperty("top", "auto", "important");
							_cs.setProperty("display", "flex", "important");
							_cs.setProperty("justify-content", "center", "important");
							_cs.setProperty("align-items", "center", "important");
							_cs.setProperty("z-index", "8", "important");
							_cf.querySelectorAll(".dialog-confirm-button-ok,.dialog-confirm-button-cancel").forEach(function (_b, _i) {
								const _bs = _b.style;
								_bs.setProperty("position", "relative", "important");
								_bs.setProperty("left", "auto", "important");
								_bs.setProperty("right", "auto", "important");
								_bs.setProperty("top", "auto", "important");
								_bs.setProperty("bottom", "auto", "important");
								_bs.setProperty("width", _bw + "px", "important");
								_bs.setProperty("height", _bh + "px", "important");
								_bs.setProperty("margin", "0 " + _bm + "px", "important");
								_bs.setProperty("background-size", "100% 100%", "important");
								_bs.setProperty("background-position", "center", "important");
								_bs.setProperty("background-repeat", "no-repeat", "important");
								_bs.setProperty(
									"background-image",
									"url('" + lib.assetURL + "extension/自用美化/image/" + (_i === 0 ? "confirmButton.png" : "cancel.png") + "')",
									"important"
								);
							});
						} catch (e) {}
					});
				} catch (e) {}
			}
			if (lib.config.auto_confirm && !ssDlg.__ssNudged) {
				ssDlg.__ssNudged = true;
				try { setTimeout(function () { try { game.check(); } catch (e) {} }, 0); } catch (e) {}
			}
			if (ssDlg.parentNode && ssDlg.parentNode !== document.body) {
				document.body.appendChild(ssDlg);
			}
			var _timer = ssDlg.querySelector(".ss-timer");
			if (!_timer) {
				_timer = document.createElement("div");
				_timer.className = "ss-timer";
				var _fill = document.createElement("div");
				_fill.className = "ss-timer-fill";
				_timer.appendChild(_fill);
				ssDlg.appendChild(_timer);
			}
			if (!_timer.__ssRunning) {
				_timer.__ssRunning = true;
				var _dur = ssProgressSeconds();
				var _f = _timer.firstElementChild;
				_f.style.transition = "none";
				_f.style.width = "100%";
				void _f.offsetWidth;
				_f.style.transition = "width " + _dur + "s linear";
				_f.style.width = "0%";
			}
			const _nat = document.getElementById("jindutiaopl");
			if (_nat) {
				if (_nat.parentNode !== ssDlg) ssDlg.appendChild(_nat);
				_nat.style.removeProperty("display");
			}
		} else if (!_ssMoveDlg) {
			var _orphan = document.getElementById("jindutiaopl");
			if (_orphan) _orphan.style.removeProperty("display");
			if (window.__ssRestoreNativeUI) window.__ssRestoreNativeUI();
		}
		} catch (e) {}
		if (ui.create._ssConfirmSync) {
			try {
				const _ssDlgNow = document.getElementById("shunshouDialog");
				if (_ssDlgNow && _ssDlgNow._ssConfirm) {
					const _ssEvt = evt && evt.newconfirm1 ? evt : _ssDlgNow._ssConfirmEvt || evt;
					ui.create._ssConfirmSync(_ssDlgNow, _ssEvt, result);
				}
			} catch (e) {}
		}
		if (ui.confirm) {
			if (evt && (evt.newconfirm1 || evt.auto)) {
				ui.confirm.classList.remove("newconfirm1");
				let _ssOne = false;
				try {
					const _ssSel = get.select(evt.selectButton);
					_ssOne = !!_ssSel && _ssSel[0] === 1 && _ssSel[1] === 1;
				} catch (e) {}
				if (evt.auto && (evt.name !== "choosePlayerCard" || _ssOne)) {
					try {
						ui.confirm.hide();
						ui.confirm._ssTmpHidden = true;
					} catch (e) {}
				} else {
					ui.confirm.classList.add("newconfirm1");
					const _cn = ui.confirm.node && ui.confirm.node.cancel;
					if (_cn) _cn.style.display = evt.forced ? "none" : "block";
					const _on = ui.confirm.node && ui.confirm.node.ok;
					if (_on) _on.style.display = "block";
				}
			} else {
				ui.confirm.classList.remove("newconfirm1");
				if (ui.confirm._ssTmpHidden) {
					ui.confirm._ssTmpHidden = false;
					try {
						ui.confirm.show();
					} catch (e) {}
				}
			}
		}
		//●联机客机：房主发来的 moveCard 选牌（chooseButton）在这里换成自绘 moved 框
		try {
			if (window.__ssMoveOnlineCheck) window.__ssMoveOnlineCheck(evt);
		} catch (e) {}
		return result;
	};
	//●手杀美化的标记要带到最外层（本包装是后套的），否则调试时会误判成未安装
	if (_check.__ssShoushaCheck) game.check.__ssShoushaCheck = true;
	game.check.__ssShunshouCheck = true;
}

ui.create._ssConfirm = function (dialog, evt) {
	if (!dialog) return;
	dialog.classList.add("ss-has-confirm");
	var confirm = dialog._ssConfirm;
	if (!confirm) {
		confirm = ui.create.div(".ss-confirm", dialog);
		confirm.ok = ui.create.div(".ss-confirm-ok", confirm, function () {
			if (window.__ssRestoreNativeUI) window.__ssRestoreNativeUI();
			ui.click.ok();
		});
		confirm.cancel = ui.create.div(".ss-confirm-cancel", confirm, function () {
			if (window.__ssRestoreNativeUI) window.__ssRestoreNativeUI();
			ui.click.cancel();
		});
		confirm.ok.classList.add("unclickable");
		confirm.cancel.classList.add("ss-hidden");
		dialog._ssConfirm = confirm;
	}
	if (evt) {
		if (!dialog._ssConfirmEvt) dialog._ssConfirmEvt = evt;
		evt.set("noconfirm", true);
	}
	return confirm;
};

ui.create._ssConfirmSync = function (dialog, evt, ok) {
	var confirm = dialog && dialog._ssConfirm;
	if (!confirm) return;
	if (evt) {
		try {
			const _need = get.select(evt.selectButton)[0];
			const _sel =
				(ui.selected.buttons ? ui.selected.buttons.length : 0) +
				(ui.selected.cards ? ui.selected.cards.length : 0) +
				(ui.selected.targets ? ui.selected.targets.length : 0);
			if (_sel >= _need) ok = typeof evt.filterOk === "function" ? !!evt.filterOk() : true;
		} catch (e) {}
	}
	if (ok) confirm.ok.classList.remove("unclickable");
	else confirm.ok.classList.add("unclickable");
	if (!evt || (!evt.forced && !evt.fakeforce)) {
		confirm.cancel.classList.remove("ss-hidden");
		confirm.ok.classList.remove("ss-no-cancel");
	} else {
		confirm.cancel.classList.add("ss-hidden");
		confirm.ok.classList.add("ss-no-cancel");
	}
};

ui.create._ssFixClick = function (dialog) {
	if (!dialog || dialog._ssClickFixed) return;
	dialog._ssClickFixed = true;
	dialog.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
		if (_status.clicked) _status.clicked = false;
		if (_status.clicked2) _status.clicked2 = false;
	});
};

function _ssSlotCards(slot) {
	const out = [];
	slot.querySelectorAll(".card").forEach(function (c) {
		out.push(c);
	});
	return out;
}

function _ssApplySlotFold(slot) {
	const cards = _ssSlotCards(slot);
	if (!cards.length) return;
	if (!slot.classList.contains("ss-folded")) {
		cards.forEach(function (c) {
			c.style.setProperty("transform", "translateX(0px)", "important");
		});
		return;
	}
	const expanded = slot.classList.contains("ss-expanded");
	if (!expanded) {
		let _stp = 14;
		try {
			const _sw = slot.offsetWidth || 84;
			_stp = Math.max(8, Math.round(_sw / Math.max(cards.length, 1)));
		} catch (e) {}
		cards.forEach(function (c, i) {
			if (i === 0) c.style.setProperty("transform", "translateX(0px)", "important");
			else c.style.setProperty("transform", "translateX(" + i * _stp + "px)", "important");
		});
		return;
	}
	let step = Math.round(slot.offsetWidth) + 5;
	try {
		const _next = slot.nextElementSibling;
		if (_next) {
			const _d = _next.getBoundingClientRect().left - slot.getBoundingClientRect().left;
			if (_d > 20) step = Math.round(_d);
		}
	} catch (e) {}
	let dir = 1;
	try {
		const vw = document.body.offsetWidth || window.innerWidth || 1080;
		const cw = cards[0].offsetWidth || 80;
		const sl = slot.getBoundingClientRect().left;
		const n = cards.length - 1;
		if (n > 0) {
			dir = sl > vw / 2 ? -1 : 1;
			if (dir === 1 && sl + n * step + cw > vw - 8) {
				if (sl - n * step >= 8) {
					dir = -1;
				} else {
					const maxStepR = Math.floor((vw - 8 - sl - cw) / n);
					if (maxStepR >= 20 && maxStepR < step) step = maxStepR;
				}
			} else if (dir === -1 && sl - n * step < 8) {
				if (sl + n * step + cw <= vw - 8) {
					dir = 1;
				} else {
					const maxStepL = Math.floor((sl - 8) / n);
					if (maxStepL >= 20 && maxStepL < step) step = maxStepL;
				}
			}
		}
	} catch (e) {}
	cards.forEach(function (c, i) {
		if (i === 0) c.style.setProperty("transform", "translateX(0px)", "important");
		else c.style.setProperty("transform", "translateX(" + dir * i * step + "px)", "important");
	});
}

window.__ssFoldAll = function () {
	document.querySelectorAll(".eAreaCard.ss-expanded,.jAreaCard.ss-expanded").forEach(function (s) {
		s.classList.remove("ss-expanded");
		s.style.removeProperty("z-index");
		_ssApplySlotFold(s);
	});
};

function _ssSetupSlot(slot) {
	_ssSetupSlotOnce(slot);
	setTimeout(function () {
		_ssSetupSlotOnce(slot);
	}, 40);
	setTimeout(function () {
		_ssSetupSlotOnce(slot);
	}, 220);
}

//●读取十周年UI实际渲染出来的卡牌尺寸，写到对话框的 CSS 变量 --ss-cw/--ss-ch 上；
//  之后卡槽/装备区/判定区/手牌区都用这两个变量排版，从而做到「卡牌大小由十周年UI决定，卡槽自适应卡牌」
window.__ssSyncCardVars = function (dlg) {
	try {
		if (!dlg || !dlg.querySelector) return;
		const card =
			dlg.querySelector(".hArea .buttons > .card") ||
			dlg.querySelector(".eAreaCard .buttons > .card") ||
			dlg.querySelector(".jAreaCard .buttons > .card") ||
			dlg.querySelector(".buttons > .card") ||
			dlg.querySelector(".card");
		if (!card) return;
		//●改用 getBoundingClientRect 取「屏幕上实际渲染」的尺寸（它包含卡牌自身的 zoom）；
		//  offsetWidth 在部分 WebView 里不含 zoom，导致卡牌缩到 70% 后卡槽仍按原尺寸排
		const rect = card.getBoundingClientRect();
		if (!rect.width || !rect.height) return;
		let sc = 1;
		try {
			//●再除掉对话框自身的 transform 缩放（--ss-zoom），换算出卡牌在对话框坐标系里的真实宽高
			const dr = dlg.getBoundingClientRect();
			if (dlg.offsetWidth > 0 && dr.width > 0) sc = dr.width / dlg.offsetWidth;
			if (!sc || !isFinite(sc)) sc = 1;
		} catch (e) {
			sc = 1;
		}
		const w = Math.round(rect.width / sc);
		const h = Math.round(rect.height / sc);
		if (!w || !h) return;
		if (dlg.__ssCw === w && dlg.__ssCh === h) return;
		dlg.__ssCw = w;
		dlg.__ssCh = h;
		dlg.style.setProperty("--ss-cw", w + "px");
		dlg.style.setProperty("--ss-ch", h + "px");
	} catch (e) {}
};
window.__ssSyncCardVarsSoon = function (dlg) {
	//●多点重试：对话框刚创建时可能还没显示（尺寸为 0），显示后再补测，确保卡槽最终跟上卡牌大小
	[0, 60, 260, 600, 1200].forEach(function (_t) {
		setTimeout(function () {
			window.__ssSyncCardVars(dlg);
		}, _t);
	});
};
function _ssSetupSlotOnce(slot) {
	if (!slot || !slot.isConnected) return;
	try {
		window.__ssSyncCardVarsSoon(slot.closest ? slot.closest(".dialog") : null);
	} catch (e) {}
	const cards = _ssSlotCards(slot);
	if (cards.length > 1) {
		slot.classList.add("ss-folded");
		if (!slot._ssFoldBound) {
			slot._ssFoldBound = true;
			["mousedown", "touchstart", "click", "touchend"].forEach(function (_t) {
				slot.addEventListener(
					_t,
					function (e) {
						if (!slot.classList.contains("ss-folded")) return;
						if (slot._ssBlockType && e.type === slot._ssBlockType) {
							if (Date.now() - (slot._ssBlockAt || 0) > 1500) {
								slot._ssBlockType = "";
							} else {
								e.stopPropagation();
								e.preventDefault();
								slot._ssBlockType = "";
								return;
							}
						}
						if (slot.classList.contains("ss-expanded")) {
							const _onCard = e.target && e.target.closest ? e.target.closest(".card") : null;
							if (!_onCard) {
								e.stopPropagation();
								e.preventDefault();
								slot.classList.remove("ss-expanded");
								slot.style.removeProperty("z-index");
								_ssApplySlotFold(slot);
							}
							return;
						}
						if (e.type === "click" || e.type === "touchend") return;
						e.stopPropagation();
						e.preventDefault();
						if (_status.clicked) _status.clicked = false;
						if (_status.clicked2) _status.clicked2 = false;
						document.querySelectorAll(".eAreaCard.ss-expanded,.jAreaCard.ss-expanded").forEach(function (s) {
							if (s === slot) return;
							s.classList.remove("ss-expanded");
							s.style.removeProperty("z-index");
							_ssApplySlotFold(s);
						});
						slot.classList.add("ss-expanded");
						slot.style.setProperty("z-index", "80", "important");
						slot._ssBlockType = lib.config.touchscreen ? "touchend" : "click";
						slot._ssBlockAt = Date.now();
						_ssApplySlotFold(slot);
					},
					true
				);
			});
		}
	}
	_ssApplySlotFold(slot);
}

if (!window.__ssSlotFoldHook) {
	window.__ssSlotFoldHook = true;
	document.addEventListener(
		lib.config.touchscreen ? "touchend" : "click",
		function (e) {
			const open = document.querySelectorAll(".eAreaCard.ss-expanded,.jAreaCard.ss-expanded");
			if (!open.length) return;
			let inside = false;
			open.forEach(function (s) {
				if (s.contains(e.target)) inside = true;
			});
			if (inside) return;
			if (_status.clicked) _status.clicked = false;
			if (_status.clicked2) _status.clicked2 = false;
			window.__ssFoldAll();
		},
		true
	);
}

//●同样必须挂 window：下面 content 的编译环境里看不到模块内函数（否则报 _ssEquipRow is not defined）
function _ssEquipRow(target, dialog, area, es, evt) {
	const labels = ["武器牌", "防具牌", "+1马", "-1马", "宝物牌"];
	const shown = [];
	for (let x = 1; x < 6; x++) {
		const slot = ui.create.div(".eAreaCard", area);
		slot.setAttribute("id", "equip" + x);
		let has = true;
		try {
			has = target.hasEnabledSlot(x);
		} catch (e) {}
		slot.innerHTML = has ? labels[x - 1] : "已废除";
		if (!has) slot.classList.add("ss-slot-disabled");
		let cards = [];
		try {
			cards = target.getEquips(x);
		} catch (e) {
			cards = [];
		}
		if (es && es.length) {
			cards = cards.filter(function (c) {
				return es.includes(c);
			});
		}
		cards.forEach(function (c) {
			shown.push(c);
		});
		if (cards.length) {
			//●一个槽位只放一张牌；同一槽位有多张（装备复制/废除类技能等）时，其余各占一个新槽位平铺，
			//  不再全部挤进同一个框；超过区域宽度后由 .eArea 横向滑动
			dialog.add([cards[0]], "", "", slot);
			_ssSetupSlot(slot);
			for (let i = 1; i < cards.length; i++) {
				const extraSlot = ui.create.div(".eAreaCard ss-slot-extra", area);
				extraSlot.setAttribute("id", "equip" + x + "_" + i);
				extraSlot.innerHTML = "";
				dialog.add([cards[i]], "", "", extraSlot);
				_ssSetupSlot(extraSlot);
			}
		} else {
			try {
				if (evt && typeof evt.filterButton === "function" && evt.filterButton !== lib.filter.all) slot.remove();
			} catch (e) {}
		}
	}
	let unknown = [];
	try {
		unknown = target.getCards("e") || [];
	} catch (e) {
		unknown = [];
	}
	if (es && es.length) {
		unknown = unknown.filter(function (c) {
			return es.includes(c);
		});
	}
	for (let i = 0; i < unknown.length; i++) {
		if (shown.indexOf(unknown[i]) >= 0) continue;
		const extraSlot = ui.create.div(".eAreaCard ss-slot-extra", area);
		extraSlot.innerHTML = "";
		dialog.add([unknown[i]], "", "", extraSlot);
		_ssSetupSlot(extraSlot);
	}
}

function _ssJudgeRow(target, dialog, area, js, evt) {
	//●每张延时锦囊各占一个槽位平铺（不够 3 张时保留空槽位占位），超过 3 张时由 .jArea 横向滑动，
	//  不再用 js.slice(2) 把多余的牌全塞进第 3 个框
	const total = Math.max(3, js.length);
	for (let x = 0; x < total; x++) {
		const slot = ui.create.div(".jAreaCard", area);
		slot.setAttribute("id", "judgeCard" + x);
		slot.innerHTML = "单张牌<br>延时锦囊";
		const cards = js[x] ? [js[x]] : [];
		if (cards.length) {
			dialog.add(cards, "", "", slot);
			_ssSetupSlot(slot);
		}
	}
}
window._ssEquipRow = _ssEquipRow;
window._ssJudgeRow = _ssJudgeRow;

export function gainPlayerCard() {
	lib.element.content.gainPlayerCard = function () {
		"step 0";
		if (event.directresult) {
			event.result = {
				buttons: [],
				cards: event.directresult.slice(0),
				links: event.directresult.slice(0),
				targets: [],
				confirm: "ok",
				bool: true,
			};
			event.cards = event.directresult.slice(0);
			event.goto(2);
			return;
		}
		if (!event.dialog) {
			event.dialog = ui.create.dialog("hidden");
			event.dialog.classList.add("noupdate");
			event.dialog.id = "shunshouDialog";
		} else if (!event.isMine()) {
			event.dialog.style.display = "none";
		}
		event.dialog.classList.remove("ss-has-confirm");
		ui.create._ssFixClick(event.dialog);
		const shunshouTitle = ui.create.div(".shunshouTitle");
		//●统一走 window.ssFrameTitle：优先 lib.translate（英文技能名也照用），查不到再剥前后缀
		let _titleText = (window.ssTitleFor ? window.ssTitleFor(event, "拿牌", "gain") : null) || "拿牌";
		shunshouTitle.innerHTML = _titleText + '<img src=' + lib.assetURL + 'extension/自用美化/image/arrow.png' + ' style=width:30px;height:25px;margin-bottom:5px;left:2px;margin-right:-30px;/>';
		event.dialog.appendChild(shunshouTitle);
		var _ssDlg = event.dialog;
		if (window.__ssAutoConfirmOn) window.__ssAutoConfirmOn(_ssDlg);
		var _ssArrow = shunshouTitle.querySelector("img");
		if (_ssArrow) {
			_ssArrow.classList.add("ss-arrow");
			_ssArrow.style.width = "46px";
			_ssArrow.style.height = "38px";
			_ssArrow.style.marginBottom = "0px";
			_ssArrow.style.position = "relative";
			_ssArrow.style.top = "7px";
			_ssArrow.style.cursor = "pointer";
			_ssArrow.addEventListener("click", function (e) {
				e.stopPropagation();
				_ssDlg.classList.toggle("folded");
			});
		}
		var directh = !lib.config.unauto_choose && !event.complexSelect;
		event.join_h = function () {
			var hs = target.getGainableCards(player, "h");
			var hArea = ui.create.div(".hArea", event.dialog);
			var hTitle = ui.create.div(".hTitle", event.dialog);
			hTitle.innerHTML = "手牌";
			if (event.position && event.position.includes("h")) {
				if (hs.length) {
					hs.randomSort();
					if (event.visible || target.isUnderControl(true) || player.hasSkillTag("viewHandcard", null, target, true)) {
						event.dialog.add(hs, "", "", hArea);
						directh = false;
					} else {
						event.dialog.add([hs, "blank"], "", "", hArea);
					}
				}
			}
		};
		event.join_e = function () {
			var es = target.getGainableCards(player, "e");
			var eArea = ui.create.div(".eArea", event.dialog),
				eTitle = ui.create.div(".eTitle", event.dialog);
			eTitle.innerHTML = "装备牌";
			window._ssEquipRow(target, event.dialog, eArea, es, event);
			if (es.length) {
				directh = false;
			}
		};
		event.join_j = function () {
			var js = target.getGainableCards(player, "j");
			var jArea = ui.create.div(".jArea", event.dialog),
				jTitle = ui.create.div(".jTitle", event.dialog);
			jTitle.innerHTML = "延时锦囊牌";
			window._ssJudgeRow(target, event.dialog, jArea, js, event);
			if (js.length) {
				directh = false;
			}
		};
		let pst = "";
		if (event.position.indexOf("h") !== -1) {
			event.join_h();
			pst += "h";
		}
		if (event.position.indexOf("e") !== -1) {
			event.join_e();
			pst += "e";
		}
		if (event.position.indexOf("j") !== -1) {
			event.join_j();
			pst += "j";
		}
		if (pst !== "hej") event.dialog.dataset.pst = pst;
		setTimeout(_ssFitHand, 30);
		setTimeout(function () {
			var _ha = event.dialog.querySelector(".hArea");
			if (_ha && window.MutationObserver && !_ha._ssObs) {
				_ha._ssObs = new MutationObserver(_ssFitHand);
				_ha._ssObs.observe(_ha, { childList: true });
			}
		}, 30);
		if (!event.dialog._ssFitWrapped) {
			var _ssOrigOpen = event.dialog.open;
			event.dialog.open = function () {
				var _r = _ssOrigOpen.apply(event.dialog, arguments);
				if (window.requestAnimationFrame) {
					requestAnimationFrame(function () { requestAnimationFrame(_ssFitHand); });
				} else {
					setTimeout(_ssFitHand, 30);
				}
				try {
					var _ha = event.dialog.querySelector(".hArea");
					var _btns = _ha && _ha.querySelector(".buttons");
					if (_btns && !_btns._ssObs) {
						_btns._ssObs = new MutationObserver(function () {
							if (window.requestAnimationFrame) requestAnimationFrame(_ssFitHand);
							else setTimeout(_ssFitHand, 30);
						});
						_btns._ssObs.observe(_btns, { childList: true });
					}
				} catch (_e) {}
				return _r;
			};
			event.dialog._ssFitWrapped = true;
		}
		function _ssFitHand() {
			var _dlg = event.dialog;
			//●同步十周年UI卡牌尺寸到 --ss-cw/--ss-ch，让手牌区/卡槽跟着卡牌大小走
			try {
				window.__ssSyncCardVarsSoon(_dlg);
			} catch (_e) {}
			var _ha = _dlg.querySelector(".hArea");
			if (!_ha) return;
			var _btns = _ha.querySelector(".buttons") || _ha;
			if (!_btns) return;
			var _cards = [];
			for (var _i = 0; _i < _btns.children.length; _i++) {
				var _c = _btns.children[_i];
				if (_c && _c.classList && (_c.classList.contains("card") || _c.classList.contains("button"))) _cards.push(_c);
			}
			var _n = _cards.length;
			if (_n < 1) return;
			var _haCs = window.getComputedStyle ? getComputedStyle(_ha) : null;
			//●手牌区可用宽度改为「扣掉左右 padding」，并去掉原来额外多扣的 2px：
			//  配合 CSS 的 padding-right:0，卡牌可铺满到卡槽右边缘，不再比卡槽短一截
			var _areaW = _ha.clientWidth -
				(_haCs ? (parseFloat(_haCs.paddingLeft) || 0) : 0) -
				(_haCs ? (parseFloat(_haCs.paddingRight) || 0) : 0);
			if (_areaW <= 0) return;
			var _cw = _cards[0].offsetWidth || 80;
			var _gap = 0;
			try {
				var _bcs = window.getComputedStyle ? getComputedStyle(_btns) : null;
				if (_bcs) _gap = parseFloat(_bcs.columnGap) || parseFloat(_bcs.gap) || 0;
			} catch (_e) {}
			var _m;
			if (_n === 1) _m = 0;
			else {
				//●折叠阈值：整排宽度超过「window.__ssHandFoldCards（默认 10）张牌的自然总宽」才折叠，否则保持自然间距
				var _foldN = window.__ssHandFoldCards || 10;
				var _foldW = _foldN * _cw + (_foldN - 1) * (_gap + 1);
				if (_n * _cw + (_n - 1) * (_gap + 1) <= _foldW) {
					for (var _k = 0; _k < _cards.length; _k++) {
						_cards[_k].style.removeProperty("margin-left");
						_cards[_k].style.removeProperty("margin-right");
					}
					return;
				}
				_m = (_foldW - _n * _cw) / (_n - 1) - _gap;
				//●折叠下限：每张牌至少保留自身宽度的 window.__ssHandMinRatio（默认 0.09），超出就按这个最小间距折叠，不再无限压缩
				var _minM = -_cw * (1 - (window.__ssHandMinRatio || 0.09)) - _gap;
				if (_m < _minM) _m = _minM;
			}
			for (var _j = 0; _j < _cards.length; _j++) {
				_cards[_j].style.setProperty("margin-left", _j === 0 ? "0px" : (_m + "px"), "important");
				_cards[_j].style.setProperty("margin-right", "0px", "important");
			}
		}
		var _verb = event.name === "gainPlayerCard" ? "获得" : "弃置";
		var _skillId = null;
		var _skillName = "牌";
		for (var _n = 1; _n <= 10; _n++) {
			var _par = null;
			try { _par = this.getParent(_n); } catch (_e) { break; }
			if (!_par) break;
			var _sid = typeof _par.skill === "string" && _par.skill ? _par.skill : _par.name;
			if (!_sid) break;
			var _cn = get.translation(_sid);
			if (_cn && /[\u4E00-\u9FA5]/.test(_cn)) { _skillId = _sid; _skillName = _cn; break; }
		}
		var _sel = get.select(event.selectButton);
		var _max = _sel[1] === Infinity ? 99 : _sel[1];
		var _numStr;
		if (_sel[0] === _sel[1]) _numStr = _sel[0] + "张";
		else if (_sel[1] === Infinity) _numStr = "至多" + _sel[0] + "张";
		else _numStr = _sel[0] + "至" + _sel[1] + "张";
		var _noun = event.ssNoun || (pst === "h" ? "手牌" : "牌");
		var _isCardSkill = _skillId === "guohe" || _skillId === "shunshou";
		var _head = !/阶段/.test(_skillName) && /[\u4E00-\u9FA5]/.test(_skillName)
			? "你" + (_isCardSkill ? "使用" : "发动") + "了<span class='card-blue'>" + _skillName + "</span>，"
			: "";
		var _ssHint = ui.create.div(".shunshouHint", event.dialog);
		_ssHint.innerHTML = _head + "请" + _verb + "<span class='card-blue'>" + get.translation(target) + "</span>的" + _numStr + _noun;
		if (event.dialog.buttons.length === 0) {
			//●本体在此分支会写入 result，调用方 await forResult() 后读 result.bool，缺了会 TypeError
			event.result = { bool: false };
			event.dialog.close();
			event.finish();
			return;
		}
		var cs = target.getCards(event.position);
		var select = get.select(event.selectButton);
		//●与本体一致：只有 forced 且没有自定义 filterOk/selectButton/filterButton 时才能"直接全取"
		var directFilter = event.forced && typeof event.filterOk != "function" && typeof event.selectButton != "function" && event.filterButton == lib.filter.all;
		if (directFilter && select[0] >= cs.length) {
			event.result = {
				bool: true,
				buttons: event.dialog.buttons,
				links: cs,
			};
		} else if (directFilter && directh && !event.isOnline() && select[0] === select[1]) {
			event.result = {
				bool: true,
				buttons: event.dialog.buttons.randomGets(select[0]),
				links: [],
			};
			for (var i = 0; i < event.result.buttons.length; i++) {
				event.result.links[i] = event.result.buttons[i].link;
			}
		} else {
			if (event.isMine()) {
				if (!event.forced) {
					var _pn = event.parent && event.parent.name;
					if (typeof _pn !== "string" || !lib.translate[_pn]) {
						var _c0 = event.parent && event.parent.skill;
						var _c1 = typeof _pn === "string" ? _pn : "";
						if (_c1.startsWith("pre_")) _c1 = _c1.slice(4);
						if (_c1.endsWith("_backup")) _c1 = _c1.slice(0, -7);
						if (_c1.endsWith("_cost")) _c1 = _c1.slice(0, -5);
						if (typeof _c0 === "string" && lib.translate[_c0]) _pn = _c0;
						else if (_c1 && lib.translate[_c1]) _pn = _c1;
						else if (typeof _c0 === "string" && _c0) _pn = _c0;
						else if (_c1) _pn = _c1;
					}
					var str = "是否发动【" + get.translation(_pn) + "】获得" + get.translation(target);
					var range = get.select(event.selectButton);
					if (range[0] === range[1]) str += get.cnNumber(range[0]);
					else if (range[1] === Infinity) str += "至少" + get.cnNumber(range[0]);
					else str += get.cnNumber(range[0]) + "至" + get.cnNumber(range[1]);
					str += "张牌";
					game.me.chooseBool(str);
				} else {
					var range = get.select(event.selectButton);
					if (range[0] === range[1] && range[0] === 1) event.auto = true;
					else {
						event.newconfirm1 = true;
						ui.create._ssConfirm(event.dialog, event);
					}
					event.dialog.open();
					game.check();
					game.pause();
				}
			} else if (event.isOnline()) {
				event.send();
			} else {
				event.result = "ai";
			}
		}
		"step 1";
		if (event.result === "ai") {
			game.check();
			if ((ai.basic.chooseButton(event.ai) || forced) && (!event.filterOk || event.filterOk())) ui.click.ok();
			else ui.click.cancel();
		} else if (result && result.bool) {
			event.forced = true;
			var range = get.select(event.selectButton);
			if (range[0] === range[1] && range[0] === 1) event.auto = true;
			else {
				event.newconfirm1 = true;
				ui.create._ssConfirm(event.dialog, event);
			}
			event.dialog.open();
			game.check();
			game.pause();
		} else if (result && result.bool === false) {
			event.finish();
			return;
		}
		"step 2";
		if (typeof game.uncheck === "function") {
			try { game.uncheck(); } catch (e) {}
		}
		if (ui && ui._temp_vituralCard) {
			for (var _vid in ui._temp_vituralCard) {
				try {
					var _vc = ui._temp_vituralCard[_vid];
					if (_vc && _vc.delete) _vc.delete(200);
					else if (_vc && _vc.remove) _vc.remove();
				} catch (e) {}
			}
			ui._temp_vituralCard = {};
		}
		//●directresult 路径直接 goto(2)，此时并没有创建 dialog，必须判空再关
		if (event.dialog) event.dialog.close();
		"step 3";
		event.resume();
		if (game.online || !event.result.bool) {
			event.finish();
		}
		"step 4";
		if (event.logSkill && event.result.bool && !game.online) {
			if (typeof event.logSkill === "string") {
				player.logSkill(event.logSkill);
			} else if (Array.isArray(event.logSkill)) {
				player.logSkill.apply(player, event.logSkill);
			}
		}
		var cards = [];
		for (var i = 0; i < event.result.links.length; i++) {
			cards.push(event.result.links[i]);
		}
		event.result.cards = event.result.links.slice(0);
		event.cards = cards;
		event.trigger("rewriteGainResult");
		"step 5";
		if (event.boolline) {
			player.line(target, "green");
		}
		if (!event.chooseonly) {
			if (event.delay !== false) {
				var next = player.gain(event.cards, target, event.visibleMove ? "give" : "giveAuto", "bySelf");
				event.done = next;
				//●本体 step5 会给获得事件补 gaintag，重写时漏了会导致带标记的获得牌丢标记
				if (event.gaintag && next && next.gaintag && typeof next.gaintag.addArray === "function") next.gaintag.addArray(event.gaintag);
			} else {
				var next = player.gain(event.cards, target, "bySelf");
				event.done = next;
				if (event.gaintag && next && next.gaintag && typeof next.gaintag.addArray === "function") next.gaintag.addArray(event.gaintag);
				target[event.visibleMove ? "$give" : "$giveAuto"](cards, player);
				if (event.visibleMove) next.visible = true;
			}
		} else target[event.visibleMove ? "$give" : "$giveAuto"](cards, player);
	};
}

export function discardPlayerCard() {
	lib.element.content.discardPlayerCard = function () {
		"step 0";
		if (event.directresult) {
			event.result = {
				buttons: [],
				cards: event.directresult.slice(0),
				links: event.directresult.slice(0),
				targets: [],
				confirm: "ok",
				bool: true,
			};
			event.cards = event.directresult.slice(0);
			event.goto(2);
			return;
		}
		if (!event.dialog) {
			event.dialog = ui.create.dialog("hidden");
			event.dialog.classList.add("noupdate");
			event.dialog.id = "shunshouDialog";
		} else if (!event.isMine()) {
			event.dialog.style.display = "none";
		}
		event.dialog.classList.remove("ss-has-confirm");
		ui.create._ssFixClick(event.dialog);
		const shunshouTitle = ui.create.div(".shunshouTitle");
		//●统一走 window.ssFrameTitle：优先 lib.translate（英文技能名也照用），查不到再剥前后缀
		let _titleText = (window.ssTitleFor ? window.ssTitleFor(event, "弃牌", "discard") : null) || "弃牌";
		shunshouTitle.innerHTML = _titleText + '<img src=' + lib.assetURL + 'extension/自用美化/image/arrow.png' + ' style=width:30px;height:25px;margin-bottom:5px;left:2px;margin-right:-30px;/>';
		event.dialog.appendChild(shunshouTitle);
		var _ssDlg = event.dialog;
		if (window.__ssAutoConfirmOn) window.__ssAutoConfirmOn(_ssDlg);
		var _ssArrow = shunshouTitle.querySelector("img");
		if (_ssArrow) {
			_ssArrow.classList.add("ss-arrow");
			_ssArrow.style.width = "46px";
			_ssArrow.style.height = "38px";
			_ssArrow.style.marginBottom = "0px";
			_ssArrow.style.position = "relative";
			_ssArrow.style.top = "7px";
			_ssArrow.style.cursor = "pointer";
			_ssArrow.addEventListener("click", function (e) {
				e.stopPropagation();
				_ssDlg.classList.toggle("folded");
			});
		}
		var directh = !lib.config.unauto_choose && !event.complexSelect;
		event.join_h = function () {
			var hs = target.getDiscardableCards(player, "h");
			var hArea = ui.create.div(".hArea", event.dialog);
			var hTitle = ui.create.div(".hTitle", event.dialog);
			hTitle.innerHTML = "手牌";
			if (event.position && event.position.includes("h")) {
				if (hs.length) {
					hs.randomSort();
					if (event.visible || target.isUnderControl(true) || player.hasSkillTag("viewHandcard", null, target, true)) {
						event.dialog.add(hs, "", "", hArea);
						directh = false;
					} else {
						event.dialog.add([hs, "blank"], "", "", hArea);
					}
				}
			}
		};
		event.join_e = function () {
			var es = target.getDiscardableCards(player, "e");
			try {
				if (typeof event.filterButton === "function" && event.filterButton !== lib.filter.all) {
					es = es.filter(function (card) {
						//●本体 filterButton 的入参是 button（牌按钮），不是牌本身；传牌会读到 button.link = undefined 而失效
						try { return event.filterButton({ link: card }, player, event) !== false; } catch (e) { return true; }
					});
				}
			} catch (e) {}
			var eArea = ui.create.div(".eArea", event.dialog),
				eTitle = ui.create.div(".eTitle", event.dialog);
			eTitle.innerHTML = "装备牌";
			window._ssEquipRow(target, event.dialog, eArea, es, event);
			if (es.length) {
				directh = false;
			}
		};
		event.join_j = function () {
			var js = target.getDiscardableCards(player, "j");
			var jArea = ui.create.div(".jArea", event.dialog),
				jTitle = ui.create.div(".jTitle", event.dialog);
			jTitle.innerHTML = "延时锦囊牌";
			window._ssJudgeRow(target, event.dialog, jArea, js, event);
			if (js.length) {
				directh = false;
			}
		};
		let pst = "";
		if (event.position.indexOf("h") !== -1) {
			event.join_h();
			pst += "h";
		}
		if (event.position.indexOf("e") !== -1) {
			event.join_e();
			pst += "e";
		}
		if (event.position.indexOf("j") !== -1) {
			event.join_j();
			pst += "j";
		}
		if (pst !== "hej") event.dialog.dataset.pst = pst;
		setTimeout(_ssFitHand, 30);
		setTimeout(function () {
			var _ha = event.dialog.querySelector(".hArea");
			if (_ha && window.MutationObserver && !_ha._ssObs) {
				_ha._ssObs = new MutationObserver(_ssFitHand);
				_ha._ssObs.observe(_ha, { childList: true });
			}
		}, 30);
		if (!event.dialog._ssFitWrapped) {
			var _ssOrigOpen = event.dialog.open;
			event.dialog.open = function () {
				var _r = _ssOrigOpen.apply(event.dialog, arguments);
				if (window.requestAnimationFrame) {
					requestAnimationFrame(function () { requestAnimationFrame(_ssFitHand); });
				} else {
					setTimeout(_ssFitHand, 30);
				}
				try {
					var _ha = event.dialog.querySelector(".hArea");
					var _btns = _ha && _ha.querySelector(".buttons");
					if (_btns && !_btns._ssObs) {
						_btns._ssObs = new MutationObserver(function () {
							if (window.requestAnimationFrame) requestAnimationFrame(_ssFitHand);
							else setTimeout(_ssFitHand, 30);
						});
						_btns._ssObs.observe(_btns, { childList: true });
					}
				} catch (_e) {}
				return _r;
			};
			event.dialog._ssFitWrapped = true;
		}
		function _ssFitHand() {
			var _dlg = event.dialog;
			//●同步十周年UI卡牌尺寸到 --ss-cw/--ss-ch，让手牌区/卡槽跟着卡牌大小走
			try {
				window.__ssSyncCardVarsSoon(_dlg);
			} catch (_e) {}
			var _ha = _dlg.querySelector(".hArea");
			if (!_ha) return;
			var _btns = _ha.querySelector(".buttons") || _ha;
			if (!_btns) return;
			var _cards = [];
			for (var _i = 0; _i < _btns.children.length; _i++) {
				var _c = _btns.children[_i];
				if (_c && _c.classList && (_c.classList.contains("card") || _c.classList.contains("button"))) _cards.push(_c);
			}
			var _n = _cards.length;
			if (_n < 1) return;
			var _haCs = window.getComputedStyle ? getComputedStyle(_ha) : null;
			//●手牌区可用宽度改为「扣掉左右 padding」，并去掉原来额外多扣的 2px：
			//  配合 CSS 的 padding-right:0，卡牌可铺满到卡槽右边缘，不再比卡槽短一截
			var _areaW = _ha.clientWidth -
				(_haCs ? (parseFloat(_haCs.paddingLeft) || 0) : 0) -
				(_haCs ? (parseFloat(_haCs.paddingRight) || 0) : 0);
			if (_areaW <= 0) return;
			var _cw = _cards[0].offsetWidth || 80;
			var _gap = 0;
			try {
				var _bcs = window.getComputedStyle ? getComputedStyle(_btns) : null;
				if (_bcs) _gap = parseFloat(_bcs.columnGap) || parseFloat(_bcs.gap) || 0;
			} catch (_e) {}
			var _m;
			if (_n === 1) _m = 0;
			else {
				//●折叠阈值：整排宽度超过「window.__ssHandFoldCards（默认 10）张牌的自然总宽」才折叠，否则保持自然间距
				var _foldN = window.__ssHandFoldCards || 10;
				var _foldW = _foldN * _cw + (_foldN - 1) * (_gap + 1);
				if (_n * _cw + (_n - 1) * (_gap + 1) <= _foldW) {
					for (var _k = 0; _k < _cards.length; _k++) {
						_cards[_k].style.removeProperty("margin-left");
						_cards[_k].style.removeProperty("margin-right");
					}
					return;
				}
				_m = (_foldW - _n * _cw) / (_n - 1) - _gap;
				//●折叠下限：每张牌至少保留自身宽度的 window.__ssHandMinRatio（默认 0.09），超出就按这个最小间距折叠，不再无限压缩
				var _minM = -_cw * (1 - (window.__ssHandMinRatio || 0.09)) - _gap;
				if (_m < _minM) _m = _minM;
			}
			for (var _j = 0; _j < _cards.length; _j++) {
				_cards[_j].style.setProperty("margin-left", _j === 0 ? "0px" : (_m + "px"), "important");
				_cards[_j].style.setProperty("margin-right", "0px", "important");
			}
		}
		var _verb = event.name === "gainPlayerCard" ? "获得" : "弃置";
		var _skillId = null;
		var _skillName = "牌";
		for (var _n = 1; _n <= 10; _n++) {
			var _par = null;
			try { _par = this.getParent(_n); } catch (_e) { break; }
			if (!_par) break;
			var _sid = typeof _par.skill === "string" && _par.skill ? _par.skill : _par.name;
			if (!_sid) break;
			var _cn = get.translation(_sid);
			if (_cn && /[\u4E00-\u9FA5]/.test(_cn)) { _skillId = _sid; _skillName = _cn; break; }
		}
		var _sel = get.select(event.selectButton);
		var _max = _sel[1] === Infinity ? 99 : _sel[1];
		var _numStr;
		if (_sel[0] === _sel[1]) _numStr = _sel[0] + "张";
		else if (_sel[1] === Infinity) _numStr = "至多" + _sel[0] + "张";
		else _numStr = _sel[0] + "至" + _sel[1] + "张";
		var _noun = event.ssNoun || (pst === "h" ? "手牌" : "牌");
		var _isCardSkill = _skillId === "guohe" || _skillId === "shunshou";
		var _head = !/阶段/.test(_skillName) && /[\u4E00-\u9FA5]/.test(_skillName)
			? "你" + (_isCardSkill ? "使用" : "发动") + "了<span class='card-blue'>" + _skillName + "</span>，"
			: "";
		var _ssHint = ui.create.div(".shunshouHint", event.dialog);
		_ssHint.innerHTML = _head + "请" + _verb + "<span class='card-blue'>" + get.translation(target) + "</span>的" + _numStr + _noun;
		if (event.dialog.buttons.length === 0) {
			//●本体在此分支会写入 result，调用方 await forResult() 后读 result.bool，缺了会 TypeError
			event.result = { bool: false };
			event.dialog.close();
			event.finish();
			return;
		}
		var cs = target.getCards(event.position);
		var select = get.select(event.selectButton);
		//●与本体一致：只有 forced 且没有自定义 filterOk/selectButton/filterButton 时才能"直接全取"
		var directFilter = event.forced && typeof event.filterOk != "function" && typeof event.selectButton != "function" && event.filterButton == lib.filter.all;
		if (directFilter && select[0] >= cs.length) {
			event.result = {
				bool: true,
				buttons: event.dialog.buttons,
				links: cs,
			};
		} else if (directFilter && directh && !event.isOnline() && select[0] === select[1]) {
			event.result = {
				bool: true,
				buttons: event.dialog.buttons.randomGets(select[0]),
				links: [],
			};
			for (var i = 0; i < event.result.buttons.length; i++) {
				event.result.links[i] = event.result.buttons[i].link;
			}
		} else {
			if (event.isMine()) {
				if (!event.forced) {
					var _pn = event.parent && event.parent.name;
					if (typeof _pn !== "string" || !lib.translate[_pn]) {
						var _c0 = event.parent && event.parent.skill;
						var _c1 = typeof _pn === "string" ? _pn : "";
						if (_c1.startsWith("pre_")) _c1 = _c1.slice(4);
						if (_c1.endsWith("_backup")) _c1 = _c1.slice(0, -7);
						if (_c1.endsWith("_cost")) _c1 = _c1.slice(0, -5);
						if (typeof _c0 === "string" && lib.translate[_c0]) _pn = _c0;
						else if (_c1 && lib.translate[_c1]) _pn = _c1;
						else if (typeof _c0 === "string" && _c0) _pn = _c0;
						else if (_c1) _pn = _c1;
					}
					var str = "是否发动【" + get.translation(_pn) + "】弃置" + get.translation(target);
					var range = get.select(event.selectButton);
					if (range[0] === range[1]) str += get.cnNumber(range[0]);
					else if (range[1] === Infinity) str += "至少" + get.cnNumber(range[0]);
					else str += get.cnNumber(range[0]) + "至" + get.cnNumber(range[1]);
					str += "张牌";
					game.me.chooseBool(str);
				} else {
					var range = get.select(event.selectButton);
					if (range[0] === range[1] && range[0] === 1) event.auto = true;
					else {
						event.newconfirm1 = true;
						ui.create._ssConfirm(event.dialog, event);
					}
					event.dialog.open();
					game.check();
					game.pause();
				}
			} else if (event.isOnline()) {
				event.send();
			} else {
				event.result = "ai";
			}
		}
		"step 1";
		if (event.result === "ai") {
			game.check();
			if ((ai.basic.chooseButton(event.ai) || forced) && (!event.filterOk || event.filterOk())) ui.click.ok();
			else ui.click.cancel();
		} else if (result && result.bool) {
			event.forced = true;
			var range = get.select(event.selectButton);
			if (range[0] === range[1] && range[0] === 1) event.auto = true;
			else {
				event.newconfirm1 = true;
				ui.create._ssConfirm(event.dialog, event);
			}
			event.dialog.open();
			game.check();
			game.pause();
		} else if (result && result.bool === false) {
			event.finish();
			return;
		}
		"step 2";
		if (typeof game.uncheck === "function") {
			try { game.uncheck(); } catch (e) {}
		}
		if (ui && ui._temp_vituralCard) {
			for (var _vid in ui._temp_vituralCard) {
				try {
					var _vc = ui._temp_vituralCard[_vid];
					if (_vc && _vc.delete) _vc.delete(200);
					else if (_vc && _vc.remove) _vc.remove();
				} catch (e) {}
			}
			ui._temp_vituralCard = {};
		}
		//●directresult 路径直接 goto(2)，此时并没有创建 dialog，必须判空再关
		if (event.dialog) event.dialog.close();
		"step 3";
		event.resume();
		if (event.result.bool && event.result.links && !game.online) {
			if (event.logSkill) {
				if (typeof event.logSkill === "string") {
					player.logSkill(event.logSkill);
				} else if (Array.isArray(event.logSkill)) {
					player.logSkill.apply(player, event.logSkill);
				}
			}
			var cards = [];
			for (var i = 0; i < event.result.links.length; i++) {
				cards.push(event.result.links[i]);
			}
			event.result.cards = event.result.links.slice(0);
			event.cards = cards;
			event.trigger("rewriteDiscardResult");
		}
		"step 4";
		if (event.boolline) {
			player.line(target, "green");
		}
		if (!event.chooseonly) {
			var next = target.discard(event.cards);
			if (player !== target) next.notBySelf = true;
			next.discarder = player;
			event.done = next;
			if (event.delay === false) {
				next.set("delay", false);
			}
		}
	};
}

function setupAutoScale() {
	const apply = function () {
		try {
			document.documentElement.style.setProperty("--ss-zoom", String(typeof K === "number" ? K : 1.1));
		} catch (e) {}
	};
	apply();
	window.__ssApplyZoom = apply;
}

export function shunshouUI() {
	initShunshouCss();
	setupAutoScale();
	moveBoxUI();
	patchDialogAdd();
	patchConfirm();
	gainPlayerCard();
	discardPlayerCard();
	placeCardUI();
	document.body.classList.add("ss-no-shousha-ui");
	if (lib.config.touchscreen || ("ontouchstart" in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 900) {
		document.body.classList.add("ss-touch");
	}
}

const SS_PLACE_SKILL_CACHE = {};

export function placeCardUI() {
	if (window._ssPlaceCardPatched) return;
	const ORIG = lib.element.content.choosePlayerCard;
	if (!ORIG || !ORIG[0]) return;
	window._ssPlaceCardPatched = true;

	const style = document.createElement("style");
	style.id = "ss-place-card-style";
	style.innerHTML = `
#shunshouDialog.ss-place-card .ss-confirm {
	left: 0 !important;
	right: 0 !important;
	top: auto !important;
	bottom: 52px !important;/*●*/
	margin: -8px 0 !important;
	height: 32px !important;
	display: block !important;
}
#shunshouDialog.ss-place-card .ss-confirm-ok,
#shunshouDialog.ss-place-card .ss-confirm-cancel {
	position: absolute !important;
	top: 0 !important;
}
#shunshouDialog.ss-place-card .ss-confirm-ok {
	left: 38.4% !important;
}
#shunshouDialog.ss-place-card .ss-confirm-cancel {
	left: 54% !important;
}
#shunshouDialog.ss-place-card.folded .ss-confirm {
	display: none !important;
}
`;
	document.head.appendChild(style);

	const findSkill = function (event) {
		let e = event;
		let depth = 0;
		while (e && depth < 15) {
			if (typeof e.skill === "string" && e.skill) return e.skill;
			e = e.parent;
			depth++;
		}
		return null;
	};

	const isPlaceSkill = function (skill) {
		if (!skill || typeof skill !== "string") return false;
		if (SS_PLACE_SKILL_CACHE[skill] != null) return SS_PLACE_SKILL_CACHE[skill];
		let result = false;
		try {
			let info = lib.skill[skill];
			let depth = 0;
			while (info && depth < 4) {
				const fns = [info.content, info.cost, info.precontent];
				for (let i = 0; i < fns.length; i++) {
					if (typeof fns[i] === "function" && String(fns[i]).indexOf("addToExpansion") >= 0) {
						result = true;
						break;
					}
				}
				if (result) break;
				let next = null;
				if (typeof info.sourceSkill === "string" && lib.skill[info.sourceSkill]) next = info.sourceSkill;
				else if (typeof info.audio === "string" && lib.skill[info.audio]) next = info.audio;
				if (!next || next === skill) break;
				info = lib.skill[next];
				depth++;
			}
		} catch (e) {}
		SS_PLACE_SKILL_CACHE[skill] = result;
		return result;
	};

	const skin = async function (event, trigger, player) {
		const { target } = event;
		try {
			document.querySelectorAll("#shunshouDialog").forEach(function (el) {
				try {
					el.remove();
				} catch (e) {}
			});
		} catch (e) {}
		event.dialog = ui.create.dialog("hidden");
		event.dialog.classList.add("noupdate");
		event.dialog.classList.add("ss-place-card");
		const dialog = event.dialog;
		if (window.__ssAutoConfirmSuppress) window.__ssAutoConfirmSuppress(dialog);
		else if (window.__ssAutoConfirmOn) window.__ssAutoConfirmOn(dialog);
		dialog.id = "shunshouDialog";
		ui.create._ssFixClick(dialog);

		const select = get.select(event.selectButton);
		if (event.prompt == undefined) {
			let str = "请选择" + get.translation(target) + "的";
			if (select[0] == select[1]) {
				str += get.cnNumber(select[0]);
			} else if (select[1] == Infinity) {
				str += "至少" + get.cnNumber(select[0]);
			} else {
				str += get.cnNumber(select[0]) + "至" + get.cnNumber(select[1]);
			}
			str += "张";
			if (event.position == "h" || event.position == undefined) {
				str += "手";
			}
			if (event.position == "e") {
				str += "装备";
			}
			str += "牌";
			event.prompt = str;
		}

		//●标题优先走统一解析：lib.translate 有值就用（英文技能名也照用），查不到再剥前后缀
		const skillName = (window.ssTitleFor ? window.ssTitleFor(event, "", "choose") : "") || "";
		const title = ui.create.div(".shunshouTitle", dialog);
		title.innerHTML =
			(skillName || "选牌") +
			'<img src="' + lib.assetURL + 'extension/自用美化/image/arrow.png" class="ss-arrow" style="width:46px;height:38px;margin-bottom:0px;position:relative;top:7px;cursor:pointer;margin-right:-46px;"/>';
		const arrow = title.querySelector("img");
		if (arrow) {
			arrow.addEventListener("click", function (e) {
				e.stopPropagation();
				dialog.classList.toggle("folded");
				//●折叠/展开后重新按内容实测高度排布底图、确认条与进度条
				_placeBoxFit();
			});
		}
		let numStr;
		if (select[0] == select[1]) {
			numStr = get.cnNumber(select[0]);
		} else if (select[1] == Infinity) {
			numStr = "至少" + get.cnNumber(select[0]);
		} else {
			numStr = get.cnNumber(select[0]) + "至" + get.cnNumber(select[1]);
		}
		const hint = ui.create.div(".shunshouHint", dialog);
		let _act = "";
		try {
			const _p = String(event.prompt || "");
			const _nm = String(event.name || "");
			if (_nm === "choosePlayerCard") {
				if (/展示/.test(_p)) _act = "，<span class='card-blue'>展示</span>";
			} else if (/弃置/.test(_p)) _act = "，<span class='card-blue'>弃置</span>";
			else if (/获得/.test(_p)) _act = "，<span class='card-blue'>获得</span>";
			else if (/置于|放置在/.test(_p)) _act = "，<span class='card-blue'>置于其武将牌上</span>";
		} catch (e) {}
		hint.innerHTML =
			(skillName ? "你发动了<span class='card-blue'>" + skillName + "</span>，" : "") +
			"请选择<span class='card-blue'>" + get.translation(target) + "</span>的" +
			numStr +
			"张牌" + _act;

		let expand_length = 0;
		const _ssSelectArea = function (area) {
			try {
				if (!area || !ui.selected || !ui.selected.buttons) return;
				const _sel = ui.selected.buttons;
				const _nodes = area.querySelectorAll(".button, .card");
				let _on = false;
				for (let _i = 0; _i < _nodes.length; _i++) {
					if (_nodes[_i].classList.contains("selected")) {
						_on = true;
						break;
					}
				}
				if (_on) {
					for (let _i = 0; _i < _nodes.length; _i++) {
						const _n = _nodes[_i];
						if (!_n.classList.contains("selected")) continue;
						_n.classList.remove("selected");
						if (typeof _sel.remove === "function") _sel.remove(_n);
						else if (_sel.indexOf(_n) >= 0) _sel.splice(_sel.indexOf(_n), 1);
					}
				} else {
					const _max = get.select(event.selectButton)[1];
					if (_sel.length < _max) {
						for (let _i = 0; _i < _nodes.length; _i++) {
							if (_sel.length >= _max) break;
							const _n = _nodes[_i];
							if (_n.classList.contains("selected")) continue;
							if (!_n.classList.contains("selectable")) continue;
							_n.classList.add("selected");
							if (typeof _sel.add === "function") _sel.add(_n);
							else _sel.push(_n);
						}
					}
				}
				if (event.custom && event.custom.add && typeof event.custom.add.button === "function") event.custom.add.button();
				const _ac = lib.config.auto_confirm;
				lib.config.auto_confirm = false;
				try {
					game.check();
				} finally {
					lib.config.auto_confirm = _ac;
				}
				if (ui.create._ssConfirmSync) ui.create._ssConfirmSync(dialog, event);
			} catch (e) {}
		};
		const cs = target.getCards(event.position);
		const directFilter = event.forced && typeof event.filterOk != "function" && typeof event.selectButton != "function" && event.filterButton == lib.filter.all;
		let directh = !lib.config.unauto_choose && !event.isOnline() && select[0] == select[1] && (!event.complexSelect || select[1] === 1);

		for (const position of event.position) {
			if (position == "h") {
				const hs = target.getCards("h");
				if (hs.length) {
					expand_length += Math.ceil(hs.length / 6);
					const hArea = ui.create.div(".hArea", dialog);
					const hTitle = ui.create.div(".hTitle", dialog);
					hTitle.innerHTML = "手牌";
					hTitle.style.cursor = "pointer";
					hTitle.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
						e.stopPropagation();
						if (_status.clicked) _status.clicked = false;
						if (_status.clicked2) _status.clicked2 = false;
						hTitle.classList.remove("ss-tap");
						void hTitle.offsetWidth;
						hTitle.classList.add("ss-tap");
						_ssSelectArea(hArea);
					});
					hs.randomSort();
					if (event.visible || target.isUnderControl(true) || player.hasSkillTag("viewHandcard", null, target, true)) {
						dialog.add(hs, "", "", hArea);
						directh = false;
					} else {
						const shown = hs.filter(card => get.is.shownCard(card));
						if (shown.length) {
							const hidden = hs.filter(card => !shown.includes(card));
							const buttons = ui.create.div(".buttons", dialog.content);
							dialog.buttons = dialog.buttons.concat(ui.create.buttons(shown, "card", buttons));
							dialog.buttons = dialog.buttons.concat(ui.create.buttons(hidden, "blank", buttons));
							hArea.appendChild(buttons);
							if (dialog.forcebutton !== false) {
								dialog.forcebutton = true;
							}
							if (dialog.buttons.length > 3) {
								dialog.classList.remove("forcebutton-auto");
							} else if (!dialog.noforcebutton) {
								dialog.classList.add("forcebutton-auto");
							}
							directh = false;
						} else {
							dialog.add([hs, "blank"], "", "", hArea);
						}
					}
				}
			} else if (position == "e") {
				const es = target.getCards("e");
				expand_length += 1;
				const eArea = ui.create.div(".eArea", dialog);
				const eTitle = ui.create.div(".eTitle", dialog);
				eTitle.innerHTML = "装备牌";
				eTitle.style.cursor = "pointer";
				eTitle.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
					e.stopPropagation();
					if (_status.clicked) _status.clicked = false;
					if (_status.clicked2) _status.clicked2 = false;
					eTitle.classList.remove("ss-tap");
					void eTitle.offsetWidth;
					eTitle.classList.add("ss-tap");
					_ssSelectArea(eArea);
				});
				_ssEquipRow(target, dialog, eArea, es, event);
				if (es.length) {
					directh = false;
				}
			} else if (position == "j") {
				const js = target.getCards("j");
				expand_length += 1;
				const jArea = ui.create.div(".jArea", dialog);
				const jTitle = ui.create.div(".jTitle", dialog);
				jTitle.innerHTML = "延时锦囊牌";
				_ssJudgeRow(target, dialog, jArea, js, event);
				if (js.length) {
					directh = false;
				}
			}
		}
		let pst = "";
		if (event.position.indexOf("h") !== -1) pst += "h";
		if (event.position.indexOf("e") !== -1) pst += "e";
		if (event.position.indexOf("j") !== -1) pst += "j";
		if (pst !== "hej") dialog.dataset.pst = pst;

			//●choosePlayerCard 放置牌框：底图高度、确认条/进度条/提示文字全部按框内元素实测位置排布
			//  （参考观星框 deckMoveUI 的 fit() 思路），不再依赖 CSS 里写死的 calc 高度；
			//  折叠时窗口只保留 78px 阴影条，进度条贴阴影条底部
			const _placeBoxFit = function () {
				try {
					if (!document.body.contains(dialog)) return;
					const folded = dialog.classList.contains("folded");
					let sc = 1;
					try {
						const dr0 = dialog.getBoundingClientRect();
						if (dialog.offsetWidth && dr0.width > 8) sc = dr0.width / dialog.offsetWidth;
					} catch (e0) {}
					if (!isFinite(sc) || sc <= 0) sc = 1;
					const timer = dialog.querySelector(".ss-timer");
					const confirm = dialog.querySelector(".ss-confirm");
					const hint = dialog.querySelector(".shunshouHint");
					if (folded) {
						dialog.style.setProperty("height", "78px", "important");
						dialog.style.setProperty("min-height", "78px", "important");
						if (timer) {
							timer.style.setProperty("top", "auto", "important");
							timer.style.setProperty("bottom", "6px", "important");
						}
						if (confirm) confirm.style.setProperty("display", "none", "important");
						if (hint) hint.style.setProperty("display", "none", "important");
						return;
					}
					//●框内元素的实际底边（屏幕坐标按缩放比换算回 CSS px）
					const dr = dialog.getBoundingClientRect();
					let bottom = 0;
					[".hArea", ".eArea", ".jArea"].forEach(function (sel) {
						const el = dialog.querySelector(sel);
						if (!el || !el.offsetHeight) return;
						const b = (el.getBoundingClientRect().bottom - dr.top) / sc;
						if (b > bottom) bottom = b;
					});
					if (bottom <= 0) {
						const t = dialog.querySelector(".shunshouTitle");
						if (t) bottom = (t.getBoundingClientRect().bottom - dr.top) / sc;
					}
					if (bottom <= 0) bottom = 170;
					bottom = Math.round(bottom);
					//●确认条紧贴内容下方 8px，进度条、提示文字依次往下排，底图高度随最后一项收口
					const barTop = bottom + 8;
					if (confirm) {
						confirm.style.setProperty("display", "flex", "important");
						confirm.style.setProperty("top", barTop + "px", "important");
						confirm.style.setProperty("bottom", "auto", "important");
						confirm.style.setProperty("margin", "0", "important");
						confirm.style.setProperty("height", "42px", "important");
					}
					const tmTop = barTop + 42 + 8;
					if (timer) {
						timer.style.setProperty("top", tmTop + "px", "important");
						timer.style.setProperty("bottom", "auto", "important");
					}
					const htTop = tmTop + 8 + 8;
					let hintH = 0;
					if (hint) {
							hint.style.setProperty("display", "block", "important");
							hint.style.setProperty("top", htTop + "px", "important");
							hint.style.setProperty("bottom", "auto", "important");
							hintH = hint.offsetHeight || 0;
					}
					const fullH = htTop + hintH + 6;
					dialog.style.setProperty("height", fullH + "px", "important");
					dialog.style.setProperty("min-height", fullH + "px", "important");
				} catch (e1) {}
			};
		if (dialog.buttons.length == 0) {
			event.finish();
			return;
		}
		if (directFilter && select[0] >= cs.length) {
			event.result = {
				bool: true,
				buttons: dialog.buttons,
				links: cs,
			};
		} else if (directFilter && directh) {
			event.result = {
				bool: true,
				buttons: dialog.buttons.randomGets(select[0]),
				links: [],
			};
			for (const button of event.result.buttons) {
				event.result.links?.push(button.link);
			}
		} else if (event.isMine()) {
			if (event.hsskill && !event.forced && _status.prehidden_skills.includes(event.hsskill)) {
				ui.click.cancel();
				return;
			}
			event.newconfirm1 = true;
			ui.create._ssConfirm(dialog, event);
			dialog.open();
			ui.create.buttonChooseAll();
			game.check();
			//●game.check 里才会补入 .ss-timer，之后按内容实测排版
			_placeBoxFit();
			setTimeout(_placeBoxFit, 30);
			setTimeout(_placeBoxFit, 200);
			setTimeout(_placeBoxFit, 500);
			requestAnimationFrame(function () { requestAnimationFrame(_placeBoxFit); });
			game.pause();
			if (expand_length > 2) {
				ui.arena.classList.add("choose-player-card");
				dialog.classList.add("fullheight");
			}
			const _placeFit = function () {
				try {
					//●同步十周年UI卡牌尺寸到 --ss-cw/--ss-ch，让手牌区/卡槽跟着卡牌大小走
					try {
						window.__ssSyncCardVarsSoon(dialog);
					} catch (_e) {}
					const _ha = dialog.querySelector(".hArea");
					if (!_ha) return;
					const _btns = _ha.querySelector(".buttons") || _ha;
					if (!_btns) return;
					const _cards = [];
					for (let _i = 0; _i < _btns.children.length; _i++) {
						const _c = _btns.children[_i];
						if (_c && _c.classList &&
							(_c.classList.contains("card") || _c.classList.contains("button"))) {
							_cards.push(_c);
						}
					}
					const _n = _cards.length;
					if (_n < 1) return;
					const _haCs = window.getComputedStyle ? getComputedStyle(_ha) : null;
					//●同 _ssFitHand：可用宽度扣左右 padding、不再额外多扣 2px，卡牌可铺满卡槽
					const _areaW = _ha.clientWidth -
						(_haCs ? (parseFloat(_haCs.paddingLeft) || 0) : 0) -
						(_haCs ? (parseFloat(_haCs.paddingRight) || 0) : 0);
					if (_areaW <= 0) return;
					const _cw = _cards[0].offsetWidth || 80;
					let _gap = 0;
					try {
						const _bcs = window.getComputedStyle ? getComputedStyle(_btns) : null;
						if (_bcs) _gap = parseFloat(_bcs.columnGap) || parseFloat(_bcs.gap) || 0;
					} catch (_e) {}
					let _m;
					if (_n === 1) _m = 0;
					else {
						//●折叠阈值：整排宽度超过「window.__ssHandFoldCards（默认 10）张牌的自然总宽」才折叠，否则保持自然间距
						var _foldN = window.__ssHandFoldCards || 10;
						var _foldW = _foldN * _cw + (_foldN - 1) * (_gap + 1);
						if (_n * _cw + (_n - 1) * (_gap + 1) <= _foldW) {
							for (let _k = 0; _k < _cards.length; _k++) {
								_cards[_k].style.removeProperty("margin-left");
								_cards[_k].style.removeProperty("margin-right");
							}
							return;
						}
						_m = (_foldW - _n * _cw) / (_n - 1) - _gap;
						//●折叠下限：每张牌至少保留自身宽度的 window.__ssHandMinRatio（默认 0.09），超出就按这个最小间距折叠，不再无限压缩
						var _minM = -_cw * (1 - (window.__ssHandMinRatio || 0.09)) - _gap;
						if (_m < _minM) _m = _minM;
					}
					for (let _j = 0; _j < _cards.length; _j++) {
						_cards[_j].style.setProperty("margin-left",
							_j === 0 ? "0px" : (_m + "px"), "important");
						_cards[_j].style.setProperty("margin-right", "0px", "important");
					}
				} catch (e) {}
			};
			setTimeout(_placeFit, 30);
			requestAnimationFrame(function () {
				requestAnimationFrame(function () { _placeFit(); });
			});
			setTimeout(function () {
				try {
					const _ha2 = dialog.querySelector(".hArea");
					if (_ha2 && window.MutationObserver && !_ha2._ssObsPlace) {
						_ha2._ssObsPlace = new MutationObserver(function () { _placeFit(); _placeBoxFit(); });
						_ha2._ssObsPlace.observe(_ha2, { childList: true, subtree: true });
					}
				} catch (e) {}
			}, 60);
		} else if (event.isOnline()) {
			event.send();
		} else {
			event.result = "ai";
		}
	};

	window.__ssPlaceSkin = skin;
	window.__ssPlaceORIG = ORIG;
	lib.element.content.choosePlayerCard = [
		async function (event, trigger, player) {
			try {
				if (event.isMine() && event.target && event.position && window.__ssPlaceSkin) {
					return window.__ssPlaceSkin(event, trigger, player);
				}
			} catch (e) {}
			return window.__ssPlaceORIG[0].call(this, event, trigger, player);
		},
		ORIG[1],
	];
}


const EXT = "自用美化";
const IMG = lib.assetURL + "extension/" + EXT + "/image/";
const EQUIP_LABELS = ["武器牌", "防具牌", "+1马", "-1马", "宝物牌"];
const EQUIP_SLOT_NAMES = ["武器栏", "防具栏", "+1马栏", "-1马栏", "宝物栏"];
const JUDGE_LABEL = "单张牌<br>延时锦囊";
const K = 1.1;
const SZ = function (n) {
	return Math.round(n * K) + "px";
};
//●数值版本（不带 px）：参与加减乘除时只能用这个，否则字符串相加会得到 NaN
const SZN = function (n) {
	return Math.round(n * K);
};
const SLOT_W = Math.round(84 * K);
const SLOT_H = Math.round(116 * K);
const BOX_H = Math.round(396 * K);
const FOLD_H = Math.round(78 * K);

let installed = false;
let active = false;
let hostEl = null;
let pendingName = "移动牌";
let lastTargetEvent = null;
let pendingT0 = null;
let pendingT1 = null;

function enabled() {
	try {
		return lib.config["extension_" + EXT + "_moveBox"] !== false;
	} catch (e) {
		return false;
	}
}

//●是否已开启托管：无名杀 ui.click.auto 用 _status.auto 标记托管，event.isMine() 也靠它判断
function inAutoControl() {
	try {
		if (typeof _status !== "undefined" && _status && _status.auto) return true;
	} catch (e) {}
	try {
		if (ui && ui.auto && ui.auto.classList && ui.auto.classList.contains("glow")) return true;
	} catch (e) {}
	try {
		if (ui && ui.arena && ui.arena.classList && ui.arena.classList.contains("auto")) return true;
	} catch (e) {}
	return false;
}

function captureSkillName(event) {
	let name = "";
	try {
		if (event && typeof event.getParent === "function") {
			const p = event.getParent();
			if (p && p.name) name = p.name;
		}
	} catch (e) {}
	if (!name) {
		try {
			const evt = _status.event;
			if (evt && typeof evt.getParent === "function") {
				const p = evt.getParent();
				if (p && p.name) name = p.name;
			}
		} catch (e) {}
	}
	if (name) {
		try {
			pendingName = get.translation(name);
		} catch (e) {
			pendingName = name;
		}
	}
	//●移动牌框同样需要技能/卡牌名：事件链取不到时走 ssTitleFor（含联机队列兜底）
	try {
		var _mbT = window.ssTitleFor ? window.ssTitleFor(_status.event, null) : null;
		if (_mbT) pendingName = _mbT;
	} catch (e) {}
}

function setCss(node, obj) {
	if (!node || !node.style) return;
	for (const k in obj) {
		try {
			node.style.setProperty(k, obj[k], "important");
		} catch (e) {}
	}
}

function el(tag, css, parent) {
	let node = null;
	try {
		node = document.createElement(tag);
	} catch (e) {
		return null;
	}
	if (css) node.style.cssText = css;
	if (parent) parent.appendChild(node);
	return node;
}

function isCardPick(dialog) {
	if (!Array.isArray(dialog)) return false;
	for (let i = 0; i < dialog.length; i++) {
		if (Array.isArray(dialog[i]) && Array.isArray(dialog[i][0])) return true;
	}
	return false;
}

function closeUI() {
	if (hostEl) {
		try {
			hostEl.remove();
		} catch (e) {}
		hostEl = null;
	}
}

function flyTo(node, toSlot, ms, done) {
	if (!node || !toSlot) return;
	let dx = 0;
	let dy = 0;
	try {
		const r1 = node.getBoundingClientRect();
		const r2 = toSlot.getBoundingClientRect();
		//●卡牌带 CSS zoom（0.7）时，left/top 的位移也会被 zoom 再缩放一次，这里先除回去
		let _z = 1;
		try {
			_z = parseFloat(getComputedStyle(node).zoom) || 1;
		} catch (eZ) {}
		dx = Math.round((r2.left - r1.left) / _z);
		dy = Math.round((r2.top - r1.top) / _z);
	} catch (e) {}
	//●位移用 left/top 做，绝对不要给卡牌加 transform：
	//  旧内核 WebView 里 “zoom + transform” 会让卡牌在动画后丢掉 0.7 的缩放，
	//  表现就是点击移动后卡牌突然变大（约 1/0.7 ≈ 43%）。尺寸全部交给 CSS，这里只动位置。
	try {
		node.style.setProperty("transition", "left " + ms + "ms ease, top " + ms + "ms ease", "important");
		node.style.setProperty("left", dx + "px", "important");
		node.style.setProperty("top", dy + "px", "important");
		node.style.setProperty("z-index", "999", "important");
	} catch (eA) {}
	setTimeout(function () {
		try {
			//●先关过渡再归位，避免十周年UI的 .card{transition:all} 把归位过程也做成动画
			node.style.setProperty("transition", "none", "important");
			node.style.setProperty("left", "0", "important");
			node.style.setProperty("top", "0", "important");
			node.style.setProperty("z-index", "2", "important");
		} catch (eC) {}
		try {
			toSlot.appendChild(node);
		} catch (e) {}
		try {
			void node.offsetWidth;
			node.style.removeProperty("transition");
			node.style.setProperty("left", "0", "important");
			node.style.setProperty("top", "0", "important");
		} catch (eD) {}
		if (done) done();
	}, ms + 30);
}

const MC_W = "var(--ss-mc-w, " + SLOT_W + "px)";
const MC_H = "var(--ss-mc-h, " + SLOT_H + "px)";

const CSS_SLOT =
	"display:inline-flex !important;align-items:center !important;justify-content:center !important;" +
	"vertical-align:middle !important;position:relative !important;box-sizing:border-box !important;" +
	/*●卡槽尺寸统一用“所有卡牌中最大的实测尺寸”；卡牌绝对定位、不参与父级 flex 计算，
	   点击换槽时尺寸不会被重新计算，卡牌不会突然变大或变小*/
	"width:calc(" + MC_W + " + 2px) !important;height:calc(" + MC_H + " + 2px) !important;" +
	"margin:0 " + SZ(5) + " 0 0 !important;" +
	"background-color:#4e413b !important;border-radius:5px !important;opacity:1 !important;" +
	"font-family:shousha,xinwei !important;font-size:" + SZ(20) + " !important;" +
	/*●clamp() 在部分旧内核 WebView 不生效，先给固定字号兜底，再叠加随卡槽高度缩放的字号*/
	"font-size:clamp(12px, calc(" + MC_H + " * 0.17), " + SZN(20) + "px) !important;color:#605f5d !important;" +
	"text-align:center !important;line-height:1.25 !important;white-space:normal !important;" +
	"text-shadow:0 0 2px #453325 !important;";

const CSS_TEXT =
	"position:absolute !important;left:0 !important;right:0 !important;top:0 !important;bottom:0 !important;" +
	"display:flex !important;align-items:center !important;justify-content:center !important;" +
	"text-align:center !important;line-height:1.25 !important;white-space:normal !important;pointer-events:none !important;";

/*●卡牌绝对定位、尺寸由本体卡牌样式（含缩放）决定：
   换槽只改变父节点，不参与 flex 布局，因此点击前后大小完全一致*/
const CSS_CARD_OBJ = {
	position: "absolute",
	left: "0",
	top: "0",
	margin: "0",
	"z-index": "2",
};

const CSS_NAME =
	"display:inline-flex !important;vertical-align:middle !important;position:relative !important;" +
	/*●左侧竖标签高度同样跟随卡槽（实测卡牌高度），不再写死 112px*/
	"width:" + SZ(34) + " !important;height:calc(" + MC_H + " + 6px) !important;margin:0 " + SZ(10) + " 0 0 !important;" +
	"background-image:url('" + IMG + "cebian.png') !important;background-size:100% 100% !important;" +
	"background-repeat:no-repeat !important;writing-mode:vertical-rl !important;" +
	"-webkit-writing-mode:vertical-rl !important;text-orientation:upright !important;" +
	"-webkit-text-orientation:upright !important;align-items:center !important;" +
	"justify-content:center !important;text-align:center !important;letter-spacing:2px !important;" +
	"white-space:nowrap !important;overflow:visible !important;" +
	"font-family:shousha,xinwei !important;font-size:" + SZ(20) + " !important;" +
	/*●同上：先固定字号兜底，clamp() 生效时再按卡槽高度缩放，避免 font-size:0 继承导致文字消失*/
	"font-size:clamp(12px, calc(" + MC_H + " * 0.17), " + SZN(20) + "px) !important;color:#eddac3 !important;" +
	"line-height:1 !important;padding:0 !important;" +
	"text-shadow:0 0 2px #453325,0 0 3px #453325,0 0 4px #453325 !important;";

const CSS_ROW =
	"position:relative !important;display:block !important;width:100% !important;height:calc(" + MC_H + " + 14px) !important;" +
	"text-align:center !important;white-space:nowrap !important;";

const CSS_SEC = "display:inline-block !important;vertical-align:middle !important;position:static !important;white-space:nowrap !important;";

function _ssScrollSec(node, count) {
	if (!node) return;
	setCss(node, {
		/*●可视宽度按实测卡槽宽度算：卡槽宽 = 卡牌宽 + 2px，槽间距 = SZ(5)，总步长 = 卡牌宽 + 2 + SZ(5)*/
		width: "calc(" + count + " * (" + MC_W + " + " + (2 + SZN(5)) + "px))",
		"overflow-x": "auto",
		"overflow-y": "hidden",
		"-webkit-overflow-scrolling": "touch",
		"scrollbar-width": "none",
		"-ms-overflow-style": "none",
	});
	node.classList.add("ss-scroll-x");
}

const CSS_GAP = "display:inline-block !important;vertical-align:middle !important;position:relative !important;width:" + SZ(66) + " !important;height:" + SZ(10) + " !important;";

function buildUI(args, opt) {
	opt = opt || {};
	return new Promise(function (resolve) {
		closeUI();
		initShunshouCss();

		let done = false;
		let autoTimer = null;
		let restoreSwitch = null;
		const finish = function (result) {
			if (done) return;
			done = true;
			if (autoTimer) {
				try { clearInterval(autoTimer); } catch (e) {}
				autoTimer = null;
			}
			if (restoreSwitch) {
				try { restoreSwitch(); } catch (e) {}
				restoreSwitch = null;
			}
			closeUI();
			resolve(result);
		};

		setTimeout(function () {
			let targets = null;
			if (pendingT0 && pendingT1) targets = [pendingT0, pendingT1];
			if (!targets) {
				const t = (lastTargetEvent && lastTargetEvent.targets) || null;
				if (t && t.length >= 2) targets = [t[0], t[1]];
			}
			const p1 = (targets && targets[0]) || null;
			const p2 = (targets && targets[1]) || null;

			const pickable = [];
			(args || []).forEach(function (a) {
				if (Array.isArray(a) && Array.isArray(a[0])) {
					for (let i = 0; i < a[0].length; i++) pickable.push(a[0][i]);
				}
			});
			//●本体可能通过 filterButton(button) 限制可选的牌；入参是牌按钮，这里用 { link: card } 兼容
			const _fb = opt.sets && opt.sets.filterButton;
			if (typeof _fb === "function" && _fb !== lib.filter.all) {
				const _kept = pickable.filter(function (card) {
					try { return _fb({ link: card }, opt.event) !== false; } catch (e) { return true; }
				});
				if (_kept.length) {
					pickable.length = 0;
					for (let i = 0; i < _kept.length; i++) pickable.push(_kept[i]);
				}
			}

			//●托管接管：moveCard 被整套自绘 UI 替换后，本体不会 pause/countChoose，也没有
			//  switchToAuto 可调，切托管时 AI 无法接管、_status.event 永远等不到 forResult 的
			//  结果（表现为卡在这个移动牌框）。这里补两重入口：
			//  1) 给 moveCard 事件挂 switchToAuto，ui.click.auto 会直接调用；
			//  2) 定时检测 _status.auto，兜底（有的托管按钮只改 _status.auto 不走 ui.click.auto）。
			//  两者都按 moveCard 传入的 ai 值挑一张可行牌，返回合法的 {bool,links}。
			const pickForAI = function () {
				if (!pickable.length) return null;
				const aiFn = opt.ai;
				if (typeof aiFn !== "function") return pickable[0];
				const evt = _status && _status.event ? _status.event : null;
				let restore = null;
				//●moveCard 的 ai 依赖 _status.event.targets0/targets1，临时补上再恢复
				if (evt && typeof evt === "object") {
					try {
						const had0 = "targets0" in evt;
						const old0 = evt.targets0;
						const had1 = "targets1" in evt;
						const old1 = evt.targets1;
						evt.targets0 = p1;
						evt.targets1 = p2;
						restore = function () {
							try {
								if (had0) evt.targets0 = old0;
								else delete evt.targets0;
								if (had1) evt.targets1 = old1;
								else delete evt.targets1;
							} catch (e) {}
						};
					} catch (e) {}
				}
				try {
					let best = null;
					let bestVal = -Infinity;
					for (let i = 0; i < pickable.length; i++) {
						let val = NaN;
						try {
							val = aiFn({ link: pickable[i] });
						} catch (e) {
							val = NaN;
						}
						if (typeof val !== "number" || isNaN(val)) continue;
						if (val > bestVal) {
							bestVal = val;
							best = pickable[i];
						}
					}
					if (best) return best;
				} finally {
					if (restore) restore();
				}
				return pickable[0];
			};
			const finishForAI = function () {
				if (done) return;
				const card = pickForAI();
				finish(card ? { bool: true, links: [card] } : { bool: false });
			};
			if (opt.event && typeof opt.event === "object") {
				try {
					const evt = opt.event;
					const had = "switchToAuto" in evt;
					const old = evt.switchToAuto;
					evt.switchToAuto = finishForAI;
					restoreSwitch = function () {
						try {
							if (had) evt.switchToAuto = old;
							else delete evt.switchToAuto;
						} catch (e) {}
					};
				} catch (e) {}
			}
			if (inAutoControl()) {
				finishForAI();
				return;
			}

			const host = el(
				"div",
				"position:absolute !important;left:50% !important;top:50% !important;" +
					"transform:translate(-50%,-50%) !important;" +
					"-webkit-transform:translate(-50%,-50%) !important;" +
					"transition:height 0.3s ease !important;" +
					"width:" + SZ(1303) + " !important;height:" + BOX_H + "px !important;z-index:9999 !important;" +
					"background-image:url('" + IMG + "scdialog.png') !important;background-size:100% 100% !important;" +
					"background-position:top center !important;background-repeat:no-repeat !important;" +
					"display:block !important;text-align:center !important;overflow:visible !important;" +
					"animation:none !important;-webkit-animation:none !important;" +
					"margin:0 !important;padding:0 !important;",
				ui.window || document.body
			);
			if (!host) return;
			host.id = "shunshouDialog";
			host.classList.add("ss-move");
			hostEl = host;

			const title = el(
				"div",
				"position:absolute !important;left:0 !important;right:0 !important;top:2px !important;" +
					"height:46px !important;overflow:visible !important;font-size:" + SZ(36) + " !important;",
				host
			);
			title.classList.add("shunshouTitle");
			title.textContent = pendingName || "移动牌";
			const arrow = el(
				"img",
				"width:46px !important;height:38px !important;position:relative !important;top:7px !important;" +
					"margin-left:2px !important;margin-right:-46px !important;cursor:pointer !important;",
				title
			);
			if (arrow) arrow.src = IMG + "arrow.png";

			const body = el(
				"div",
				"position:absolute !important;left:0 !important;right:0 !important;top:" + SZ(54) + " !important;" +
					//●高度交给内容（两行卡槽）自动撑开，窗口高度随后按实测卡牌尺寸重算
					"height:auto !important;display:block !important;text-align:center !important;" +
					"white-space:nowrap !important;",
				host
			);

			const hint = el(
				"div",
				"position:absolute !important;left:0 !important;right:0 !important;bottom:0 !important;" +
					"text-align:center !important;white-space:nowrap !important;font-size:" + SZ(14) + " !important;" +
					"font-family:shousha,xinwei !important;font-weight:bold !important;line-height:1.25 !important;" +
					"color:#ffffff !important;pointer-events:none !important;z-index:9 !important;" +
					"text-shadow:0 0 3px #000,0 0 6px #000,0 1px 0 #000,0 -1px 0 #000,1px 0 0 #000,-1px 0 0 #000 !important;",
				host
			);
			hint.classList.add("shunshouHint");
			hint.innerHTML =
				(pendingName ? "你发动了<span class='card-blue'>" + pendingName + "</span>，" : "") + "请选择要移动的一张牌";
			try {
				const blue = hint.querySelector(".card-blue");
				if (blue) setCss(blue, { color: "#8fd6ff" });
			} catch (e) {}

			let selected = null;
			let movedInfo = null;
			let flying = false;
			let fullH = BOX_H;
			const slotList = [];
			const rowsSlots = [];
			let okBtn = null;
			let bar = null;
			let timer = null;

			const refresh = function () {
				if (!okBtn) return;
				if (selected) okBtn.classList.remove("unclickable");
				else okBtn.classList.add("unclickable");
			};

			const backHome = function (after) {
				if (!movedInfo) {
					if (after) after();
					return;
				}
				const m = movedInfo;
				movedInfo = null;
				flyTo(m.node, m.origin, 380, after);
			};

				const findDest = function (dst, src) {
					if (!dst || !dst.length) return null;
					const key = src && src._ssKey;
					if (key) {
						for (let i = 0; i < dst.length; i++) {
							if (dst[i]._ssKey === key) return dst[i]._ssDisabled ? null : dst[i];
						}
					}
					const base = src && src._ssBaseKey;
					if (base) {
						for (let i = 0; i < dst.length; i++) {
							if (dst[i]._ssKey === base) return dst[i]._ssDisabled ? null : dst[i];
						}
					}
					const section = src && src._ssSection;
					if (section) {
						for (let i = dst.length - 1; i >= 0; i--) {
							if (!dst[i]._ssDisabled && dst[i]._ssSection === section) return dst[i];
						}
					}
					for (let i = dst.length - 1; i >= 0; i--) {
						if (!dst[i]._ssDisabled) return dst[i];
					}
					return null;
				};

				const putCard = function (slot, card, editable, rowIndex, slotIndex) {
				if (!card) return;
				let node = null;
				try {
					node = card.copy();
				} catch (e) {}
				if (!node) return;
				//●copy() 出来的卡牌没有本体事件监听，补挂长按介绍（本体显示卡牌的效果）
				try {
					if (!node._longpresscallback && typeof lib.setIntro === "function") lib.setIntro(node);
				} catch (eL) {}
				setCss(node, CSS_CARD_OBJ);
				try {
					slot.appendChild(node);
				} catch (e) {}
				if (!editable || pickable.indexOf(card) < 0) {
					return;
				}
				setCss(node, {
					cursor: "pointer",
				});
				node.addEventListener("click", function (e) {
					e.stopPropagation();
					if (flying) return;
					const dst = rowsSlots[rowIndex === 0 ? 1 : 0];
					const toSlot = findDest(dst, slot);
					if (!toSlot) return;
					if (selected === card) {
						selected = null;
						flying = true;
						backHome(function () {
							flying = false;
							refresh();
						});
						return;
					}
					if (movedInfo) {
						const prev = movedInfo;
						movedInfo = { node: node, origin: slot };
						flying = true;
						flyTo(prev.node, prev.origin, 380, null);
						selected = card;
						flyTo(node, toSlot, 380, function () {
							flying = false;
							refresh();
						});
						return;
					}
					selected = card;
					movedInfo = { node: node, origin: slot };
					flying = true;
					flyTo(node, toSlot, 380, function () {
						flying = false;
						refresh();
					});
				});
				slotList.push({ node: node, card: card });
			};

			const getJudgeInfo = function (target) {
				try {
					return (target ? target.getCards("j") : []).slice(0);
				} catch (e) {
					return [];
				}
			};
			const judgeCardName = function (card) {
				let nm = "";
				try {
					nm = get.name(card);
				} catch (e) {
					nm = card && card.name;
				}
				return nm || "";
			};
			const collectJudgeNames = function (lists) {
				const names = [];
				lists.forEach(function (list) {
					list.forEach(function (card) {
						const nm = judgeCardName(card);
						if (nm && names.indexOf(nm) < 0) names.push(nm);
					});
				});
				return names;
			};
			const js1 = getJudgeInfo(p1);
			const js2 = getJudgeInfo(p2);
			const allJudgeNames = collectJudgeNames([js1, js2]);

			const makeRow = function (target, editable, rowIndex, judgeCards) {
				const row = el("div", CSS_ROW, body);
				const nameEl = el("div", CSS_NAME, row);
				if (nameEl) {
					nameEl.classList.add("ss-mc-name");
					nameEl.textContent = target ? get.translation(target) : "?";
				}

				const slots = [];
				const sec = el("div", CSS_SEC, row);
				_ssScrollSec(sec, 5);
				const equipGroups = [[], [], [], [], []];
				const shownEquips = [];
				for (let x = 1; x <= 5; x++) {
					let list = [];
					try {
						list = (target && target.getEquips(x)) || [];
					} catch (e) {
						list = [];
					}
					equipGroups[x - 1] = list;
					list.forEach(function (c) {
						shownEquips.push(c);
					});
				}
				let equipOthers = [];
				try {
					equipOthers = (target ? target.getCards("e") : []).filter(function (c) {
						return shownEquips.indexOf(c) < 0;
					});
				} catch (e) {
					equipOthers = [];
				}
				for (let x = 0; x < 5; x++) {
					let enabled = true;
					try {
						enabled = target ? target.hasEnabledSlot(x + 1) : true;
					} catch (e) {}
					const list = equipGroups[x];
					const total = Math.max(1, list.length);
					for (let i = 0; i < total; i++) {
						const slot = el("div", CSS_SLOT, sec);
						if (slot) slot.classList.add("ss-mc-slot");
						if (!slot) continue;
						if (!enabled) {
							slot.classList.add("ss-slot-disabled");
							slot._ssDisabled = true;
						}
						if (i === 0) {
							const txt = el("div", CSS_TEXT, slot);
							if (txt) txt.innerHTML = enabled ? EQUIP_LABELS[x] : EQUIP_SLOT_NAMES[x] + "<br>已废除";
						}
						slot._ssKey = "e" + (x + 1) + (i ? "_" + i : "");
						slot._ssBaseKey = "e" + (x + 1);
						slot._ssSection = "e";
						slots.push(slot);
						putCard(slot, list[i] || null, editable, rowIndex, slots.length - 1);
					}
				}
				for (let i = 0; i < equipOthers.length; i++) {
					const slot = el("div", CSS_SLOT, sec);
					if (!slot) continue;
					slot.classList.add("ss-mc-slot");
					slot._ssKey = "e_other_" + i;
					slot._ssSection = "e";
					slots.push(slot);
					putCard(slot, equipOthers[i], editable, rowIndex, slots.length - 1);
				}

				el("div", CSS_GAP, row);

				const sec2 = el("div", CSS_SEC, row);
				_ssScrollSec(sec2, 3);
				const ownJudgeNames = [];
				judgeCards.forEach(function (card) {
					const nm = judgeCardName(card);
					if (nm && ownJudgeNames.indexOf(nm) < 0) ownJudgeNames.push(nm);
				});
				const judgeSlotNames = ownJudgeNames.slice(0);
				allJudgeNames.forEach(function (nm) {
					if (ownJudgeNames.indexOf(nm) < 0) judgeSlotNames.push(nm);
				});
				while (judgeSlotNames.length < 3) judgeSlotNames.push("");
				for (let x = 0; x < judgeSlotNames.length; x++) {
					const nm = judgeSlotNames[x];
					const slot = el("div", CSS_SLOT, sec2);
					if (!slot) continue;
					slot.classList.add("ss-mc-slot");
					const txt2 = el("div", CSS_TEXT, slot);
					if (txt2) txt2.innerHTML = JUDGE_LABEL;
					slot._ssKey = nm ? "j_" + nm : "j_empty" + x;
					slot._ssSection = "j";
					slots.push(slot);
					let jcard = null;
					if (nm) {
						for (let k = 0; k < judgeCards.length; k++) {
							if (judgeCardName(judgeCards[k]) === nm) {
								jcard = judgeCards[k];
								break;
							}
						}
					}
					putCard(slot, jcard, editable, rowIndex, slots.length - 1);
				}
				rowsSlots[rowIndex] = slots;
			};

			makeRow(p1, true, 0, js1);
			makeRow(p2, false, 1, js2);

			//●按实测卡牌尺寸重算卡槽/标签/窗口高度：卡牌保持自身大小（0.7 缩放），由卡槽反过来适应卡牌
			const syncMoveSize = function () {
				try {
					if (!host || !document.body.contains(host)) return;
					let w = SLOT_W;
					let h = SLOT_H;
					let sc = 1;
					try {
						const hr = host.getBoundingClientRect();
						if (host.offsetWidth && hr.width) sc = hr.width / host.offsetWidth;
						if (!sc || !isFinite(sc)) sc = 1;
					} catch (eS) {}
					//●取所有卡牌里的最大尺寸作为卡槽基准：卡牌换槽只是移动节点，基准不变，
					//  不会因为“第一张卡”变了而在点击后把整框卡槽/标签再撑大一点
					let mw = 0;
					let mh = 0;
					const cards = body.querySelectorAll(".card");
					for (let i = 0; i < cards.length; i++) {
						let r = null;
						try {
							r = cards[i].getBoundingClientRect();
						} catch (eR) {
							r = null;
						}
						if (r && r.width > 2 && r.height > 2) {
							if (r.width / sc > mw) mw = r.width / sc;
							if (r.height / sc > mh) mh = r.height / sc;
						}
					}
					if (mw > 0 && mh > 0) {
						w = Math.round(mw);
						h = Math.round(mh);
					}
					//●异常尺寸（未渲染/量到别的元素）时回退到默认值，避免卡槽和标签被压成 0 高
					if (!isFinite(w) || w < 40 || w > 400) w = SLOT_W;
					if (!isFinite(h) || h < 40 || h > 400) h = SLOT_H;
					host.style.setProperty("--ss-mc-w", w + "px");
					host.style.setProperty("--ss-mc-h", h + "px");
					//●标签和字号再用实测像素直接写一遍，不依赖旧内核是否支持 calc()/clamp()
					const fs = Math.max(12, Math.min(SZN(20), Math.round(h * 0.19)));
					const nameEls = body.querySelectorAll(".ss-mc-name");
					for (let i = 0; i < nameEls.length; i++) {
						nameEls[i].style.setProperty("height", h + 6 + "px", "important");
						nameEls[i].style.setProperty("font-size", fs + "px", "important");
					}
					const slotEls = body.querySelectorAll(".ss-mc-slot");
					for (let i = 0; i < slotEls.length; i++) {
						slotEls[i].style.setProperty("width", w + 2 + "px", "important");
						slotEls[i].style.setProperty("height", h + 2 + "px", "important");
						slotEls[i].style.setProperty("font-size", fs + "px", "important");
					}
					//●按钮栏、进度条、提示文字都由卡槽实测高度推算，
					//  卡槽变矮后三者一起上移，不再依赖 dialog 的固定底边
					//按钮栏 top = 标题 54 + 两行 (h+14) + 8
					//进度条 = 按钮栏下方 + 8
					//提示文字 = 进度条下方 + 4
					//对话框高度 = 提示文字下方 + 20
					const barTop = SZN(54) + 2 * (h + 14) + SZN(2);
					const timerTop = barTop + SZN(48) + SZN(0);
					const hintTop = timerTop + SZN(8) + SZN(7);
					fullH = hintTop + SZN(22);
					if (!host.classList.contains("folded")) {
						host.style.setProperty("height", fullH + "px", "important");
					}
					if (bar) {
						bar.style.setProperty("top", barTop + "px", "important");
						bar.style.setProperty("bottom", "auto", "important");
					}
					if (timer) {
						if (host.classList.contains("folded")) {
							//●折叠态进度条贴框底，跟着统一折叠位置一起移动
							timer.style.setProperty("top", "auto", "important");
							timer.style.setProperty("bottom", SZ(20), "important");
						} else {
							timer.style.setProperty("top", timerTop + "px", "important");
							timer.style.setProperty("bottom", "auto", "important");
						}
					}
					if (hint) {
						hint.style.setProperty("top", hintTop + "px", "important");
						hint.style.setProperty("bottom", "auto", "important");
					}
				} catch (e) {}
			};
			[0, 60, 260, 600, 1200].forEach(function (_t) {
				setTimeout(syncMoveSize, _t);
			});

			timer = el(
				"div",
				"position:absolute !important;left:31% !important;right:31% !important;bottom:" + SZ(20) + " !important;" +
					"height:" + SZ(8) + " !important;border-radius:1000px !important;background:rgba(0,0,0,0.4) !important;" +
					"box-shadow:0 0 9px #2e2b27 inset,0 0 2.1px #FFFFD5 !important;border:1.2px solid #000 !important;" +
					"overflow:hidden !important;z-index:6 !important;pointer-events:none !important;",
				host
			);
			const timerFill = el(
				"div",
				"position:absolute !important;left:0 !important;top:0 !important;bottom:0 !important;" +
					"width:100% !important;background-image:linear-gradient(#fccc54 15%,#d01424 30%,#cc6953 90%) !important;",
				timer
			);
			try {
				let _dur = ssProgressSeconds();
				if (_dur > 0 && timerFill) {
					timerFill.style.transition = "none";
					timerFill.style.width = "100%";
					void timerFill.offsetWidth;
					timerFill.style.transition = "width " + _dur + "s linear";
					timerFill.style.width = "0%";
				}
			} catch (e) {}

			bar = el(
				"div",
				"position:absolute !important;left:0 !important;right:0 !important;bottom:" + SZ(36) + " !important;" +
					"height:" + SZ(52) + " !important;display:block !important;text-align:center !important;" +
					"white-space:nowrap !important;font-size:0 !important;pointer-events:auto !important;",
				host
			);
			const mkBtn = function (img, cls) {
				const b = el(
					"div",
					"display:inline-block !important;position:relative !important;width:" + SZ(132) + " !important;" +
						"height:" + SZ(52) + " !important;margin:0 " + SZ(46) + " !important;vertical-align:middle !important;" +
						"cursor:pointer !important;background-repeat:no-repeat !important;" +
						"background-position:center !important;background-size:100% 100% !important;" +
						"background-image:url('" + img + "') !important;",
					bar
				);
				if (b && cls) b.classList.add(cls);
				return b;
			};
			okBtn = mkBtn(IMG + "confirmButton.png", "ss-confirm-ok");
			const cancel = mkBtn(IMG + "cancel.png", "ss-confirm-cancel");
			okBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				if (!selected) return;
				finish({ bool: true, links: [selected] });
			});
			cancel.addEventListener("click", function (e) {
				e.stopPropagation();
				finish({ bool: false });
			});
			refresh();

			//●兜底轮询：部分托管按钮只改 _status.auto、不调用 ui.click.auto，这里定时检查
			autoTimer = setInterval(function () {
				if (done) return;
				if (inAutoControl()) finishForAI();
			}, 150);

			if (arrow) {
				arrow.addEventListener("click", function (e) {
					e.stopPropagation();
					const folded = !host.classList.contains("folded");
					if (folded) host.classList.add("folded");
					else host.classList.remove("folded");
					setCss(host, {
						height: (folded ? FOLD_H : fullH) + "px",
						//●折叠态统一位置：由 extension.js 的 --ss-fold-top 控制；只保留水平居中，避免 translateY 再改变高低
						top: folded ? "var(--ss-fold-top)" : "50%",
						transform: folded ? "translateX(-50%)" : "translate(-50%,-50%)",
						"-webkit-transform": folded ? "translateX(-50%)" : "translate(-50%,-50%)",
						"background-size": folded ? "100% auto" : "100% 100%",
						"background-position": "top center",
					});
					setCss(body, {
						display: folded ? "none" : "block",
					});
					setCss(hint, {
						display: folded ? "none" : "block",
					});
					setCss(bar, {
						display: folded ? "none" : "block",
					});
					try {
						if (folded) {
							//●折叠态进度条贴框底，跟着统一折叠位置一起移动
							timer.style.setProperty("top", "auto", "important");
							timer.style.setProperty("bottom", SZ(10), "important");
						} else {
							//●展开后重新按卡槽实际尺寸摆回进度条/按钮栏
							syncMoveSize();
						}
					} catch (e2) {}
				});
			}
		}, 0);
	});
}

function hookMoveCard() {
	try {
		const content = lib.element && lib.element.content;
		if (!content || typeof content.moveCard !== "function") return;
		const cur = content.moveCard;
		if (cur.__cfMoveBoxWrapped) return;
		const wrapped = async function (event, trigger, player) {
			if (!enabled() || active) return cur.apply(this, arguments);
			try {
				if (!event.isMine || !event.isMine()) return cur.apply(this, arguments);
			} catch (e) {
				return cur.apply(this, arguments);
			}
			captureSkillName(event);
			active = true;
			lastTargetEvent = null;
			pendingT0 = null;
			pendingT1 = null;
			const origChooseTarget = player.chooseTarget;
			const origChooseButton = player.chooseButton;
			//●实例本来可能有同名方法（不是原型上的），恢复时要还原它；否则删掉临时覆盖暴露原型
			const hadOwnTarget = Object.prototype.hasOwnProperty.call(player, "chooseTarget");
			const hadOwnButton = Object.prototype.hasOwnProperty.call(player, "chooseButton");

			player.chooseTarget = function () {
				const evt = origChooseTarget.apply(this, arguments);
				lastTargetEvent = evt;
				try {
					const origFR = evt.forResult;
					if (typeof origFR === "function") {
						evt.forResult = function () {
							const p = origFR.apply(this, arguments);
							return Promise.resolve(p).then(function (r) {
								if (r && r.targets && r.targets.length >= 2) lastTargetEvent = r;
								return r;
							});
						};
					}
				} catch (e) {}
				return evt;
			};

			player.chooseButton = function (dialog, forced, ai) {
				try {
					if (isCardPick(dialog)) {
						//●本体 moveCard 拿到 chooseButton 后会链式 set 很多参数（target/nojudge/targets0/targets1/filter/canReplace/custom），
						//  这里只保留 targets0/targets1/ai 会让自定义限制和确认按钮失效，改成全部记录下来并按需使用
						const opt = { ai: typeof ai === "function" ? ai : null, event: event, sets: {} };
						const uiPromise = buildUI(dialog, opt);
						return {
							set: function (k, v) {
								try {
									opt.sets[k] = v;
									if ((k === "targets0" || k === "target") && v) pendingT0 = v;
									if (k === "targets1" && v) pendingT1 = v;
									if (k === "ai" && v) opt.ai = v;
								} catch (e) {}
								return this;
							},
							forResult: function () {
								return uiPromise;
							},
							then: function (a, b) {
								return uiPromise.then(a, b);
							},
						};
					}
				} catch (e) {}
				return origChooseButton.apply(this, arguments);
			};

			try {
				return await cur.apply(this, arguments);
			} finally {
				active = false;
				lastTargetEvent = null;
				pendingT0 = null;
				pendingT1 = null;
				try {
					if (hadOwnTarget) player.chooseTarget = origChooseTarget;
					else delete player.chooseTarget;
				} catch (e) {
					player.chooseTarget = origChooseTarget;
				}
				try {
					if (hadOwnButton) player.chooseButton = origChooseButton;
					else delete player.chooseButton;
				} catch (e) {
					player.chooseButton = origChooseButton;
				}
				closeUI();
			}
		};
		wrapped.__cfMoveBoxWrapped = true;
		content.moveCard = wrapped;
		content.cfMoveBoxOrig = content.cfMoveBoxOrig || cur;
	} catch (e) {}
}

/*●联机 moved 框兜底（参考拆顺框）
 * 房主没装本扩展时，房主的 moveCard 会先在客机弹出 chooseTarget（选两个目标），
 * 再弹出 chooseButton（选要移动的装备/判定牌）。客机不会执行 content.moveCard，
 * 所以 content.moveCard 里的自绘框不会出现。
 * 这里在 game.check 之后识别这个 chooseButton：隐藏本体框/确认条/进度条，
 * 直接用它的 dialog 内容 + targets0/targets1 画自绘 moved 框；确认后再回点本体按钮。
 */
function isOnlineClient() {
	try {
		if (!_status.connectMode) return false;
		if (game.servermode) return false;
		return true;
	} catch (e) {}
	return false;
}

function isMoveCardChooseButton(evt) {
	if (!evt || evt.name !== "chooseButton") return false;
	if (!evt.targets0 || !evt.targets1) return false;
	var args = evt.createDialog;
	if (!Array.isArray(args)) return false;
	for (var i = 0; i < args.length; i++) {
		var a = args[i];
		// moveCard 的选牌对话框一定是 [装备/判定牌数组, "vcard"] 这种形式
		if (Array.isArray(a) && a[1] === "vcard") return true;
	}
	return false;
}

function skinOnlineMoveChoose(evt) {
	if (!enabled() || !isOnlineClient()) return;
	if (!isMoveCardChooseButton(evt)) return;
	var dlg = evt.dialog;
	//●已经在用自绘框：本体确认条可能被 game.check 重建，这里继续压住
	if (dlg && dlg.__ssMoveProxy) {
		try {
			if (window.__ssMoveHide) window.__ssMoveHide();
		} catch (e) {}
		return;
	}
	if (!dlg || !document.body.contains(dlg)) return;
	if (evt.result) return;
	var p1 = evt.targets0,
		p2 = evt.targets1;
	if (!p1 || !p2 || p1 === p2) return;
	dlg.__ssMoveProxy = true;

	var savedConfirm = "",
		hidConfirm = false;
	var tut = null;
	var hideNative = function () {
		try {
			if (document.body.contains(dlg)) dlg.style.setProperty("display", "none", "important");
			if (ui.confirm) {
				if (!hidConfirm) {
					savedConfirm = ui.confirm.style.display || "";
					hidConfirm = true;
				}
				ui.confirm.style.setProperty("display", "none", "important");
			}
			tut = document.getElementById("jindutiaopl");
			if (tut) tut.style.setProperty("display", "none", "important");
		} catch (e) {}
	};
	var iv = null;
	var aliveIv = null;
	var restoreNative = function () {
		try {
			if (iv) clearInterval(iv);
		} catch (e) {}
		//●自绘框存活检查也要在这里停掉，否则 Promise 先结束时会留下一个永远跑的空轮询
		try {
			if (aliveIv) clearInterval(aliveIv);
			aliveIv = null;
		} catch (e) {}
		try {
			dlg.style.removeProperty("display");
		} catch (e) {}
		try {
			if (hidConfirm && ui.confirm) {
				if (savedConfirm) ui.confirm.style.setProperty("display", savedConfirm);
				else ui.confirm.style.removeProperty("display");
			}
		} catch (e) {}
		if (tut) {
			try {
				tut.style.removeProperty("display");
			} catch (e) {}
		}
		window.__ssMoveHide = null;
	};
	hideNative();
	window.__ssMoveHide = hideNative;
	iv = setInterval(hideNative, 200);

	var prevName = pendingName;
	pendingT0 = p1;
	pendingT1 = p2;
	lastTargetEvent = null;
	captureSkillName(evt);
	var uiPromise = null;
	try {
		uiPromise = buildUI(evt.createDialog, {
			ai: typeof evt.ai == "function" ? evt.ai : null,
			event: evt,
			sets: {
				filterButton: evt.filterButton,
				filter: evt.filter,
				canReplace: evt.canReplace,
				custom: evt.custom,
			},
		});
	} catch (e) {
		restoreNative();
		return;
	}
	//●自绘框没建出来时放开本体框，避免客机一直空白
	aliveIv = setInterval(function () {
		if (document.getElementById("shunshouDialog")) {
			clearInterval(aliveIv);
			aliveIv = null;
			return;
		}
		//●这里必须真正 clearInterval：只把 aliveIv 置空会丢掉定时器 ID，轮询就永远停不下来了
		clearInterval(aliveIv);
		aliveIv = null;
		restoreNative();
	}, 400);
	Promise.resolve(uiPromise).then(function (res) {
		restoreNative();
		if (prevName) pendingName = prevName;
		var picked = null;
		try {
			if (res && res.bool && res.links && res.links.length) picked = res.links[0];
		} catch (e) {}
		var btn = null;
		if (picked) {
			var buttons = dlg.buttons || [];
			for (var k = 0; k < buttons.length; k++) {
				var b = buttons[k];
				if (b && b.link === picked) {
					btn = b;
					break;
				}
			}
		}
		if (!btn) {
			ui.click.cancel();
			return;
		}
		//●直接把原生按钮塞进 ui.selected，再走本体 ok；
		//  不走 ui.click.button：它内部用 this.classList、还会受 custom.replace.button / _status 标志影响，
		//  客机上容易提前 return，导致 ok 时选择为空、结果变成取消（牌不动）
		try {
			btn.classList.add("selectable");
			btn.classList.add("selected");
			var sel = ui.selected.buttons;
			for (var si = sel.length - 1; si >= 0; si--) {
				if (sel[si] && sel[si].link !== picked) {
					sel[si].classList.remove("selected");
					sel.splice(si, 1);
				}
			}
			var hasBtn = false;
			for (var sj = 0; sj < sel.length; sj++) {
				if (sel[sj] === btn) hasBtn = true;
			}
			if (!hasBtn) sel.push(btn);
		} catch (e) {}
		var okDone = false;
		try {
			ui.click.ok();
			//●ok 可能被 custom.replace.confirm 截走而没真正写结果，这里校验一下再决定是否兜底
			okDone = !!(evt.result && (evt.result.confirm === "ok" || evt.result.bool === true));
		} catch (e) {}
		//●ok 没成功（比如本体在客机上拦下了）就直接写结果并继续，至少保证牌能移动
		if (!okDone) {
			try {
				//●必须写回当前这个选择事件本身；_status.event 有可能已被后续 check 换掉
				var ev2 = evt || _status.event;
				ev2.result = {
					confirm: "ok",
					bool: true,
					buttons: [btn],
					links: [picked],
					cards: [],
					targets: [],
				};
				game.uncheck();
				game.resume();
			} catch (e) {}
		}
	});
}

function hookMoveOnlineCheck() {
	if (window.__ssMoveOnlineCheck) return;
	window.__ssMoveOnlineCheck = function (evt) {
		try {
			skinOnlineMoveChoose(evt);
		} catch (e) {}
	};
}

function moveBoxUI() {
	if (!enabled()) return;
	if (installed) return;
	installed = true;
	hookMoveCard();
	hookMoveOnlineCheck();
	setTimeout(hookMoveCard, 2000);
	setTimeout(hookMoveCard, 6000);
	setTimeout(hookMoveCard, 12000);
}
