//可以自改与转发保留我的署名就行 禁止倒卖
import { lib, game, ui, _status } from "../../noname.js";
import { config } from "./config/index.js";
import { shoushaUI } from "./extension/shoushaUI.js";
import { shunshouUI } from "./extension/shunshou.js";
import { recastDirect } from "./extension/recastDirect.js";
import { pandingUI } from "./extension/panding.js";
import { paixuBtn } from "./extension/paixuBtn.js";
import { wuguUI } from "./extension/wugu.js";
import { pindianUI } from "./extension/pindian.js";
import { ssNumberPick } from "./extension/ssNumberPick.js";
import { poxiUI } from "./extension/poxiUI.js";
import { deckMoveUI } from "./extension/deckMoveUI.js";
import { watchConfirmDialogs, installEndPhaseGuard } from "./extension/confirmGuard.js";
import { aiShunshou } from "./extension/aiShunshou.js";
import { installSwipeGuard } from "./extension/swipeGuard.js";

//●扩展内所有 ws.onmessage 相关逻辑统一在这里：只包一次、只 JSON.parse 一次，各模块用 ssWsAdd 注册处理函数
(function () {
	if (window.__ssWsHub) return;
	var handlers = [];
	var retry = null;
	function parse(ev) {
		try {
			if (!(game.online && !game.servermode && _status && _status.connectMode)) return null;
			var d = ev && ev.data;
			if (typeof d !== "string" || d.indexOf("\"exec\"") < 0 || d.indexOf("_noname_func:") < 0) return null;
			var parsed = JSON.parse(d);
			if (!Array.isArray(parsed) || parsed[0] !== "exec" || typeof parsed[1] !== "string" || parsed[1].slice(0, 13) !== "_noname_func:") return null;
			var src = parsed[1].slice(13);
			var args = [];
			for (var i = 2; i < parsed.length; i++) args.push(get.parsedResult(parsed[i]));
			return { src: src, args: args };
		} catch (e) { return null; }
	}
	function install() {
		try {
			var ws = lib && lib.element && lib.element.ws;
			if (!ws || typeof ws.onmessage !== "function") return false;
			if (ws.__ssWsHubWrapped) return true;
			var orig = ws.onmessage;
			ws.onmessage = function (ev) {
				var info = null;
				try { info = parse(ev); } catch (e) {}
				var result = orig.apply(this, arguments);
				if (info) {
					for (var i = 0; i < handlers.length; i++) {
						try { handlers[i](info.src, info.args); } catch (e) {}
					}
				}
				return result;
			};
			ws.__ssWsHubWrapped = true;
			try { if (game.ws) game.ws.onmessage = ws.onmessage; } catch (e) {}
			try { if (retry) { clearInterval(retry); retry = null; } } catch (e) {}
			return true;
		} catch (e) { return false; }
	}
	function add(fn) {
		if (typeof fn !== "function") return;
		if (handlers.indexOf(fn) < 0) handlers.push(fn);
		if (!install() && !retry) retry = setInterval(function () { if (install()) { clearInterval(retry); retry = null; } }, 400);
	}
	window.ssWsAdd = add;
	window.__ssWsHub = { add: add, install: install };
	if (!install() && !retry) retry = setInterval(function () { if (install()) { clearInterval(retry); retry = null; } }, 400);
})();

//●把日志里“牌名+花色点数”的文本还原成卡牌 id 的译名：直接用 card.name 对应的 lib.translate，不做字符串清洗
window.ssCardTitle = function (text) {
	if (!text || !lib.translate) return null;
	var map = window.__ssCardNameMap;
	if (!map) {
		map = {};
		try {
			for (var id in lib.card) {
				var tr = lib.translate[id];
				if (typeof tr === "string" && tr && !map[tr]) map[tr] = id;
			}
		} catch (e) {}
		window.__ssCardNameMap = map;
	}
	var best = null, bestLen = 0;
	for (var name in map) {
		if (name.length > bestLen && text.indexOf(name) >= 0) { best = name; bestLen = name.length; }
	}
	return best;
};
//●最近出现的技能/卡牌标题栈：客机取不到事件链时按“最近一次”消费，不依赖时间窗
window.ssRememberTitle = function (title, pid, isCard) {
	if (!title) return;
	var st = window.__ssTitleRecent || (window.__ssTitleRecent = []);
	var kp = pid == null ? null : pid;
	var last = st[st.length - 1];
	if (last && last.title === title && last.pid === kp) return;
	st.push({ title: title, pid: kp, card: !!isCard });
	if (st.length > 12) st.shift();
};
window.ssPopRecent = function (pid, wantCard) {
	var st = window.__ssTitleRecent || [];
	if (!st.length) return null;
	//●wantCard：true=只认卡牌类标题，false=只认技能类，null=不限（区分“过河拆桥”这类卡牌与技能）
	var pick = function (needPid, wantCard) {
		for (var i = st.length - 1; i >= 0; i--) {
			var it = st[i];
			if (needPid && it.pid !== pid) continue;
			if (wantCard !== null && wantCard !== undefined && !!it.card !== !!wantCard) continue;
			st.splice(i, 1);
			return it.title;
		}
		return null;
	};
	var t = pick(true, wantCard);
	if (!t) t = pick(false, wantCard);
	if (!t) t = pick(true, null);
	if (!t) t = pick(false, null);
	return t;
};
//●客机上把“使用了/打出了/发动了 XX”的日志当作最权威的标题来源：
//  日志能区分卡牌与技能，并且就在框出现之前到达，不会像事件链那样时有时无
window.ssWsAdd(function (src, args) {
	try {
		if (!src || src.indexOf("game.log") < 0) return;
		if (!args || typeof args[0] !== "string") return;
		var text = args[0].replace(/<[^>]*>/g, "").replace(/#/g, "");
		//●日志里的卡牌形如“使用了 过河拆桥【♠3】”，牌名在【】之前，用整段文本反查卡牌 id 的译名最稳
		var cardLog = /使用了|打出了|展示了/.test(text);
		var pureCard = window.ssCardTitle(text);
		if (cardLog && pureCard) { window.ssRememberTitle(pureCard, null, true); return; }
		var m = text.match(/(?:使用了|打出了|发动了|展示了)【(.{1,24}?)】/);
		var name = null, isCard = false;
		if (m) {
			name = m[1];
			isCard = /使用了|打出了|展示了/.test(m[0]);
		} else {
			m = text.match(/(?:使用了|打出了)(.{1,24}?)(?:[，。！]|$)/);
			if (m) { name = m[1]; isCard = true; }
			else {
				m = text.match(/发动了(.{1,24}?)(?:[，。！]|$)/);
				if (m) name = m[1];
			}
		}
		if (!name) return;
		//●日志把卡牌渲染成“名字+花色点数”，这里按牌名反查卡牌 id，直接取 lib.translate，得到纯卡名
		var pure = window.ssCardTitle(name);
		if (pure) { window.ssRememberTitle(pure, null, true); return; }
		name = name.replace(/【|】/g, "").trim();
		if (!name || name.length > 24 || name.indexOf("一张") >= 0 || name === "了" || name === "判定") return;
		window.ssRememberTitle(name, null, isCard);
	} catch (e) {}

});
game.import("extension", async function () {
	//●“结束回合”残留/误点守卫：显式注入模块实例（正式客户端没有 window.game/ui），扩展加载即生效
	try {
		installEndPhaseGuard({ lib, game, ui, _status });
	} catch (e) {}
	const baseUrl = `${lib.assetURL}extension/自用美化/`;
	const extensionInfo = await lib.init.promises.json(`${baseUrl}info.json`);
	const CONFIG = await config();
	const _ssPkg = {
		character: { character: {}, translate: {} },
		card: { card: {}, translate: {}, list: [] },
		skill: { skill: {}, translate: {} },
		intro: extensionInfo.intro,
		diskURL: "",
		forumURL: "",
		version: extensionInfo.version,
	};
	Object.defineProperty(_ssPkg, "author", {
    get() {
        const avatarUrl = baseUrl + "image/author/avatar_xinmu.jpg";
        const avatarUrl2 = baseUrl + "image/author/ziqi.png";
        const avatarMain = '<img src="' + avatarUrl + '" class="author-avatar ss-author-avatar" style="cursor:pointer;border-radius:50%;width:44px;height:44px;vertical-align:bottom;margin-right:6px;box-shadow:0 2px 6px rgba(0,0,0,0.35);">';
        const avatarInline = '<img src="' + avatarUrl2 + '" class="author-avatar ss-author-avatar" style="cursor:pointer;border-radius:50%;width:45px;height:45px;vertical-align:bottom;margin-right:6px;margin-bottom:0px;box-shadow:0 2px 6px rgba(0,0,0,0.35);">';
        return avatarMain + '<span class="ss-author-name">心慕&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + avatarInline + '子琪（魔改）</span>';
    },
    }
	);
	//●界面安装逻辑从 content 中抽出：单机由 content 调用，联机由 precontent 调用
	let ssUIInstalled = false;
	const installUI = function () {
		try { if (lib.extensionMenu && lib.extensionMenu['extension_自用美化']) delete lib.extensionMenu['extension_自用美化'].edit; } catch (e) {}
		function ssAgreement() {
			var t = String.fromCharCode(26080, 21517, 26432, 23436, 20840, 20813, 36153, 65292, 20498, 21334, 52, 20840, 23478), n = String.fromCharCode(25042, 20154, 21253);
			if (lib.config.zymh_shown || lib.config.extensions.includes(n)) return;
			try { alert(t); } catch (e) { return }
			game.saveConfig("zymh_shown",true);
		}
		try { ssAgreement(); } catch (e) {}
		//所有手杀框折叠后的统一顶部位置：只改下面这一处（改大→更靠下，改小→更靠上）
		try { document.documentElement.style.setProperty("--ss-fold-top", "calc(42vh - 39px)"); } catch (e) {} /*★折叠后，缩小上移*/
		try { installSwipeGuard(); } catch (e) {}

				//●所有美化框统一的标题解析：优先用 lib.translate（有值就用，英文技能名也照用）；
				try {
					if (!window.ssFrameTitle) {
						window.ssFrameTitle = function (evt, fallback) {
							var phases = ["出牌阶段", "摸牌阶段", "判定阶段", "弃牌阶段", "结束阶段", "准备阶段", "回合开始", "回合结束", "回合", "出牌", "摸牌", "弃牌", "结束", "准备"];
							var usable = function (str, key) {
								if (typeof str !== "string" || !str) return false;
								if (key && str === key) return false;
								if (str === "null" || str === "undefined") return false;
								if (/^(?:pre|equip|lose):/i.test(str)) return false;
								if (phases.indexOf(str) >= 0) return false;
								return true;
							};
							var variants = function (n) {
								var out = [n];
								var s = n;
								if (s.indexOf("pre_") === 0) s = s.slice(4);
								else if (s.indexOf("equip_") === 0) s = s.slice(6);
								else if (s.indexOf("lose_") === 0) s = s.slice(5);
								var cut = s.indexOf("_backup");
								if (cut < 0) cut = s.indexOf("_cost");
								if (cut < 0) cut = s.indexOf("_lose");
								if (cut > 0) s = s.slice(0, cut);
								if (s !== n) out.push(s);
								return out;
							};
							var resolveKey = function (key) {
								if (typeof key !== "string" || !key) return null;
								var list = variants(key);
								for (var i = 0; i < list.length; i++) {
									var tr = null;
									try { tr = lib.translate && lib.translate[list[i]]; } catch (e) {}
									if (usable(tr, list[i])) return tr;
								}
								if (/[^\x00-\x7f]/.test(key) && usable(key, key)) return key;
								return null;
							};
							if (evt) {
								//●卡牌类框（拆/顺/取/弃/移动/出牌）：直接用卡牌 id 的译名，纯牌名，天然不含花色点数
								try {
									if (typeof evt.name === "string" && /^(gainPlayerCard|discardPlayerCard|choosePlayerCard|moveCard|useCard)$/.test(evt.name)) {
										var _ci0 = evt.card || (Array.isArray(evt.cards) && evt.cards.length ? evt.cards[0] : null);
										if (_ci0 && typeof _ci0 === "object" && typeof _ci0.name === "string" && _ci0.name) {
											var _ct0 = lib.translate && lib.translate[_ci0.name];
											if (_ct0) return _ct0;
											if (/[^\x00-\x7f]/.test(_ci0.name)) return _ci0.name;
										}
									}
								} catch (e) {}
								//●客机：主机在事件创建时已经广播了标题（按 类型+玩家 分桶），优先取队首，稳定且不依赖事件链
								try {
									if (game.online && !game.servermode && window.ssPopTitle) {
										var _nm = evt.name || "";
										var _ty = _nm.indexOf("chooseToCompare") === 0 ? "compare" :
											_nm === "choosePlayerCard" ? "choose" :
											_nm === "gainPlayerCard" ? "gain" :
											_nm === "discardPlayerCard" ? "discard" :
											_nm === "judge" ? "judge" : null;
										var _pd = evt.player && evt.player.playerid != null ? evt.player.playerid : null;
										var _qt = _ty ? window.ssPopTitle(_ty, _pd) : null;
										if (_qt) return _qt;
									}
								} catch (e) {}

								//●带花色点数的 title（如“过河拆桥♠3”）不用，交给下面按 card.name 取
								if (typeof evt.title === "string" && evt.title && !/[♠♥♣♦♤♡♧♢]/.test(evt.title)) {
									var tt = resolveKey(evt.title);
									if (tt) return tt;
									if (/[^\x00-\x7f]/.test(evt.title) && usable(evt.title, evt.title)) return evt.title;
								}
							//●客机兜底：按“最近出现的技能/卡牌”取（不做时间窗），取一条即消费；放在事件链之前，避免链上取到旧技能
							try {
								if (game.online && !game.servermode && window.ssPopRecent) {
									var _rp = evt && evt.player && evt.player.playerid != null ? evt.player.playerid : null;
									var _want = null;
									try {
										if (evt && ((Array.isArray(evt.cards) && evt.cards.length) || evt.card)) _want = true;
										else if (evt && typeof evt.name === "string" && evt.name && lib.skill[evt.name]) _want = false;
									} catch (e) {}
									var _rq = window.ssPopRecent(_rp, _want);
									if (_rq) return _rq;
								}
							} catch (e) {}
							var e = evt;
							var depth = 0;
							while (e && depth < 20) {
								var skills = [];
								if (typeof e.skill === "string" && e.skill) skills.push(e.skill);
								else if (Array.isArray(e.skill)) skills = e.skill.slice();
								for (var si = 0; si < skills.length; si++) {
									var sk = skills[si];
									var real = sk;
									try { if (lib.skill[sk] && lib.skill[sk].sourceSkill) real = lib.skill[sk].sourceSkill; } catch (e0) {}
									var r1 = resolveKey(real);
									if (r1) return r1;
									if (real !== sk) {
											var r2 = resolveKey(sk);
											if (r2) return r2;
									}
								}
								//牌本身发起的拆/顺（过河拆桥、顺手牵羊等）：事件链上没有 title/skill，
								var _cardObj = e.card || (e.name === "useCard" && Array.isArray(e.cards) && e.cards.length ? e.cards[0] : null);
								if (_cardObj && typeof _cardObj.name === "string" && _cardObj.name) {
									var _cname = null;
									try { _cname = lib.translate && lib.translate[_cardObj.name]; } catch (e2) {}
									if (usable(_cname, _cardObj.name)) return _cname;
									if (/[^\x00-\x7f]/.test(_cardObj.name) && usable(_cardObj.name, _cardObj.name)) return _cardObj.name;
								}
								if (typeof e.name === "string" && e.name) {
									var names = variants(e.name);
									var isSkillEvent = false;
									for (var ni = 0; ni < names.length; ni++) {
											try { if (lib.skill[names[ni]]) { isSkillEvent = true; break; } } catch (e1) {}
									}
									if (isSkillEvent) {
											var r3 = resolveKey(e.name);
											if (r3) return r3;
									}
								}
								e = e.parent;
								depth++;
							}
							}
							return fallback == null ? null : fallback;
						};
					}
				} catch (e) {}

			//●美化框的卡牌/容器尺寸统一由 css/shunshou.css 管理（唯一来源），这里不再注入尺寸规则
			if (lib.config.extension_自用美化_confirmGlow !== false) {
				try {
					let _gs = document.getElementById("ss-global-css");
					if (!_gs) {
						_gs = document.createElement("style");
						_gs.id = "ss-global-css";
						document.head.appendChild(_gs);
					}
					_gs.textContent =
						".ss-confirm-ok:active,.ss-confirm-cancel:active," +
						".dialog-confirm-button-ok:active,.dialog-confirm-button-cancel:active," +
						".control.skill-sbkanpo:active," +
						".recasting-btn:active," +
						".combo-control .primary:active,.combo-control .primary2:active," +
						".lbtn-confirm .primary:active,.lbtn-confirm .primary2:active," +
						".newconfirm1 .primary:active,.newconfirm1 .primary2:active," +
						".lbtn-paixu:active,.lbtn-paixu1:active,.latn-jilu:active,.latn-jilu1:active," +
						".tuoguanButton:active,.cailanzi:active,[class*=cailanzi]:active," +
						"img[src*=cailanzi]:active,img[src*=liaotian]:active," +
						".compare-confirm:active,.compare-cancel:active" +
						"{filter:brightness(1.8) !important;-webkit-filter:brightness(1.8) !important;}" +
						".control:active" +
						"{filter:brightness(1.25) !important;-webkit-filter:brightness(1.25) !important;}" +
						".ss-confirm-ok,.ss-confirm-cancel,.dialog-confirm-button-ok,.dialog-confirm-button-cancel," +
						".control.skill-sbkanpo,.recasting-btn,.lbtn-paixu,.lbtn-paixu1,.latn-jilu,.latn-jilu1," +
						".tuoguanButton,.cailanzi,[class*=cailanzi],img[src*=cailanzi],img[src*=liaotian]," +
						".compare-confirm,.compare-cancel" +
						"{transition:none !important;-webkit-transition:none !important;}" +
						".ss-press{filter:brightness(1.8) !important;-webkit-filter:brightness(1.8) !important;" +
						"transition:none !important;-webkit-transition:none !important;}";
				} catch (e) {}
				if (!window._ssPressHook) {
					window._ssPressHook = true;
					const _ssPressSel =
						".ss-confirm-ok,.ss-confirm-cancel,.dialog-confirm-button-ok,.dialog-confirm-button-cancel," +
						".control.skill-sbkanpo,.recasting-btn,.combo-control .primary,.combo-control .primary2," +
						".lbtn-confirm .primary,.lbtn-confirm .primary2,.newconfirm1 .primary,.newconfirm1 .primary2," +
						".yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button,.lbtn-paixu,.lbtn-paixu1," +
						".latn-jilu,.latn-jilu1,.tuoguanButton,.cailanzi,[class*=cailanzi]," +
						"img[src*=cailanzi],img[src*=liaotian],.compare-confirm,.compare-cancel,.control";
					const _ssPressExtra = "#shunshouDialog .ss-confirm-ok,#shunshouDialog .ss-confirm-cancel";
					const _ssResolveHit = function (e) {
						try {
							const _t = e.target;
							if (_t && _t.closest) {
								const _m = _t.closest(_ssPressSel);
								if (_m) return _m;
							}
						} catch (err) {}
						try {
							const _x = e.clientX;
							const _y = e.clientY;
							if (typeof _x !== "number" || typeof _y !== "number" || (!_x && !_y)) return null;
							if (document.elementsFromPoint) {
								const _list = document.elementsFromPoint(_x, _y);
								for (let _i = 0; _i < _list.length; _i++) {
									const _m = _list[_i].closest && _list[_i].closest(_ssPressSel);
									if (_m) return _m;
								}
							}
							const _cands = document.querySelectorAll(_ssPressExtra);
							for (let _j = 0; _j < _cands.length; _j++) {
								const _r = _cands[_j].getBoundingClientRect();
								if (_r.width && _x >= _r.left && _x <= _r.right && _y >= _r.top && _y <= _r.bottom) {
									return _cands[_j];
								}
							}
						} catch (err) {}
						return null;
					};
					const _ssLightUp = function (el, on) {
						try {
							if (on) {
								if (el.classList.contains("unclickable")) return;
								el.classList.add("ss-press");
								const _lv = el.classList.contains("control") ? "1.25" : "1.8";
								el.style.setProperty("filter", "brightness(" + _lv + ")", "important");
								el.style.setProperty("-webkit-filter", "brightness(" + _lv + ")", "important");
							} else {
								el.classList.remove("ss-press");
								el.style.removeProperty("filter");
								el.style.removeProperty("-webkit-filter");
							}
						} catch (err) {}
					};
					const _ssPressOn = function (e) {
						try {
							const _el = _ssResolveHit(e);
							if (!_el) return;
							if (window._ssPressEl && window._ssPressEl !== _el) _ssLightUp(window._ssPressEl, false);
							window._ssPressToken = (window._ssPressToken || 0) + 1;
							_ssLightUp(_el, true);
							window._ssPressEl = _el;
						} catch (e) {}
					};
					const _ssPressOff = function () {
					try {
						const _el = window._ssPressEl;
						if (!_el) return;
						window._ssPressEl = null;
						window._ssPressToken = (window._ssPressToken || 0) + 1;
							const _tk = window._ssPressToken;
							setTimeout(function () {
								try {
									if (window._ssPressToken !== _tk) return;
									_ssLightUp(_el, false);
								} catch (e) {}
							}, 120);
						} catch (e) {}
					};
					["touchstart", "mousedown", "pointerdown"].forEach(function (t) {
						document.addEventListener(t, _ssPressOn, true);
					});
					["touchend", "touchcancel", "mouseup", "pointerup", "pointercancel"].forEach(function (t) {
						document.addEventListener(t, _ssPressOff, true);
					});
					window._ssPressVer = 3;
				}
				if (!window._ssGlowHook) {
					window._ssGlowHook = true;
					document.addEventListener(
						"click",
						function (e) {
							try {
								const _t = e.target;
								if (!_t || !_t.closest) return;
								const _el = _t.closest(
									".yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button,.ss-confirm-ok,.ss-confirm-cancel," +
										".dialog-confirm-button-ok,.dialog-confirm-button-cancel,.control.skill-sbkanpo,.recasting-btn," +
										".lbtn-paixu,.lbtn-paixu1,.latn-jilu,.latn-jilu1,.tuoguanButton,.cailanzi," +
										"[class*=cailanzi],img[src*=cailanzi],img[src*=liaotian]"
								);
								if (!_el) return;
								if (_el.closest(".lbtn-paixu,.lbtn-paixu1,.latn-jilu,.latn-jilu1")) {
									try {
										if (!window._ssBtnSound) window._ssBtnSound = new Audio(lib.assetURL + "extension/自用美化/audio/TinyButton.mp3");
										window._ssBtnSound.currentTime = 0;
										window._ssBtnSound.play();
									} catch (e) {}
								}
							} catch (e) {}
						},
						true
					);
				}
			}

			if (lib.config.extension_自用美化_shoushaUI) {
				shoushaUI();
			}
			if (lib.config.extension_自用美化_poxiUI !== false) {
				try {
					poxiUI();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 手杀魄袭框 加载失败：", err);
				}
			}
			if (lib.config.extension_自用美化_deckMoveUI !== false) {
				try {
					deckMoveUI();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 手杀观星框 加载失败：", err);
				}
			}
			try {
				watchConfirmDialogs(["shunshouDialog"]);
			} catch (e) {}
			if (lib.config.extension_自用美化_paixuBtn !== false) {
				try {
					paixuBtn();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 牌序按钮优化 加载失败：", err);
				}
			}
			if (lib.config.extension_自用美化_shunshou) {
				try {
					shunshouUI();
				} catch (err) {
					try {
						if (window.console && console.error) console.error("[自用美化] shunshouUI 加载失败：", err);
					} catch (e) {}
					lib.config.extension_自用美化_shunshou = false;
				}
			}
			if (lib.config.extension_自用美化_aiShunshou) {
				try {
					aiShunshou();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 拆顺AI随机 加载失败：", err);
				}
			}
			if (lib.config.extension_自用美化_directRecast) {
				try {
					recastDirect();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 铁索连环直接重铸 加载失败：", err);
				}
			}
			if (lib.config.extension_自用美化_panding !== false) {
				try {
					pandingUI();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 手杀判定框 加载失败：", err);
				}
			}
			if (lib.config.extension_自用美化_wuguUI !== false) {
				try {
					wuguUI();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 五谷丰登界面 加载失败：", err);
				}
			}
			if (lib.config.extension_自用美化_pindian !== false) {
				try {
					pindianUI();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 拼点框 加载失败：", err);
				}
			}
			if (lib.config.extension_自用美化_numberPick !== false) {
				try {
					ssNumberPick();
				} catch (err) {
					if (window.console && console.error) console.error("[自用美化] 手杀数字选择 加载失败：", err);
				}
			}
		ssUIInstalled = true;
	};

	/*●在 lib.init 早期（卡牌数据还没加载）被 import ，precontent 执行时 lib.card 还是空的。wuguUI() 开头有 `if (!lib.card || !lib.card.wugu) return;`， 早装会直接 return 且不会重试（__ssWugu 没被置上），而 content 又因为 ssUIInstalled 跳过 */
	const ssBaseReady = function () {
		try {
			return !!(lib.card && lib.card.wugu);
		} catch (e) {
			return false;
		}
	};
	const tryInstallUI = function () {
		if (ssUIInstalled) return true;
		if (!ssBaseReady()) return false;
		installUI();
		return true;
	};
	const ssInstallWhenReady = function () {
		if (tryInstallUI()) return;
		let ssTry = 0;
		const ssIv = setInterval(function () {
			if (tryInstallUI() || ++ssTry > 200) clearInterval(ssIv);
		}, 50);
	};
	//●服务端没有界面（联机时客户端不执行 content，界面由 precontent 负责），这里不装
	const ssIsServerSide = function () {
		try {
			if (game.servermode) return true;
			if (typeof document === "undefined") return true;
		} catch (e) {
			return true;
		}
		return false;
	};

	return {
		name: "自用美化",
		arenaReady() {},
		precontent(config) {
			if (!(config && config.onlineMode)) return;
			if (ssIsServerSide()) return;
			ssInstallWhenReady();
		},
		content(config, pack) {
			if (ssIsServerSide()) return;
			ssInstallWhenReady();
		},
		config: CONFIG,
				help: {},
		package: _ssPkg,
		files: { character: [], card: [], skill: [], audio: [] },
	};
});
