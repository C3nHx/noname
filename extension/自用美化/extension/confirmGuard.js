const PHASE_EVENTS = /^(chooseToUse|chooseToRespond|chooseCard|chooseTarget|chooseCardTarget|chooseToCompare|phase|useCard)$/;

let depth = 0;
let healLast = 0;
/*
 *●本文件其余逻辑沿用 window 全局写法（历史上一直如此），但无名杀正式客户端并不挂载
 *  window.game/ui/lib/get/_status（只有开发者模式才挂），所以这里新增的“结束回合”守卫
 *  不能依赖全局，改由 extension.js 把模块实例注入进来。
 */
let ssDeps = null;

/* 作用：安全触发 game.check。
 * 仅当 _status.event 存在且 position 不是字符串时才执行，避免在选牌/排版阶段重入；
 * 任何异常都吞掉，保证守卫逻辑不会反过来打断游戏流程。 */
function safeCheck() {
	try {
		const ev = typeof _status !== "undefined" && _status ? _status.event : null;
		if (ev && ev.position && typeof ev.position !== "string") return;
	} catch (e) {
		return;
	}
	try {
		game.check();
	} catch (e) {}
}

/* 作用：判断节点是否为五谷丰登框（ss-wugu）。
 * 五谷框允许和其他弹框同时存在，确认条守护不能把它当成残留弹框去隐藏或压制。 */
function isWugu(el) {
	try {
		return !!(el && el.classList && el.classList.contains("ss-wugu"));
	} catch (e) {
		return false;
	}
}

/*
 * 结束回合控件校正：
 * 本体“结束回合”按钮只在 chooseToUse 阶段且是我方事件时才有效，但它的点击回调读的是
 * 点击那一刻的 _status.event，所以残留的旧按钮会把“别人正在进行的出牌阶段”取消掉
 * （联机表现为主机点一下，客机回合就结束并卡住）。
 * 这里以事件归属为准：
 *  - 当前事件不是本机的出牌阶段 → 隐藏/关闭残留按钮，并拦截它的点击
 *  - 不是本机出牌阶段时，把十周年UI改写的“结束出牌/回合结束”恢复成“取消”
 */
/* 作用：判断当前 _status.event 是否属于本机的出牌阶段（chooseToUse + type=phase）。
 * 只有这个场景才允许“结束回合/结束出牌”控件生效，其余情况都要收起来。 */
function isOwnPhaseEvent() {
	try {
		if (!ssDeps || !ssDeps.game || !ssDeps._status) return false;
		const game = ssDeps.game;
		const st = ssDeps._status;
		const ev = st.event;
		if (!ev || ev.name !== "chooseToUse" || ev.type !== "phase") return false;
		if (ev.player && game.me) return ev.player === game.me;
		return st.currentPhase === game.me;
	} catch (e) {
		return false;
	}
}

/*
 * 联机里“别人的出牌阶段”正在本机事件栈上运行时（_status.event 是对方那局 chooseToUse/phase），
 * 本机残留的确认条、结束回合按钮都读同一个 _status.event，点一下就把别人的回合取消掉。
 * 只在这个精确场景拦截，避免影响五谷同时选牌、自己响应闪/无懈等正常确认。
 */
/* 作用：判断联机时当前事件栈顶是否是“别人的出牌阶段”。
 * 用于区分正常响应/自己选牌与误操作他人回合，只对后者做拦截。 */
function isForeignPhase() {
	try {
		if (!ssDeps || !ssDeps.game || !ssDeps._status) return false;
		const st = ssDeps._status;
		if (!st.connectMode) return false;
		const ev = st.event;
		if (!ev || ev.name !== "chooseToUse" || ev.type !== "phase") return false;
		return !!(ev.player && ssDeps.game.me && ev.player !== ssDeps.game.me);
	} catch (e) {
		return false;
	}
}

/*
 * 联机里别人的出牌阶段在本机事件栈上时，本机残留的 .selectable / .selected 手牌还能点。
 * 点一下就会走 chooseToUse 的选牌逻辑（弹选目标提示），选中的牌留在 ui.selected.cards，
 * 等自己回合开始时被当成“已经选好的牌”一次性全部打出去。
 * 当前事件不属于本机时，把本机的选牌状态整体归零。
 */
/* 作用：把本机的选牌状态整体归零（ui.selected 的 cards/buttons/targets、节点 selected/selectable、arena.selecting）。
 * keepSelectable=true 时只清“已选中”保留“可点击”，用于刚进入自己回合时防止旧选牌被直接打出。 */
function sweepLocalSelection(keepSelectable) {
	try {
		if (!ssDeps) return;
		const ui = ssDeps.ui;
		if (!ui) return;
		let dirty = false;
		const sel = ui.selected;
		if (sel) {
			if (sel.cards && sel.cards.length) {
				sel.cards.length = 0;
				dirty = true;
			}
			if (sel.buttons && sel.buttons.length) {
				sel.buttons.length = 0;
				dirty = true;
			}
			if (sel.targets && sel.targets.length) {
				sel.targets.length = 0;
				dirty = true;
			}
		}
		const nodes = keepSelectable
			? document.querySelectorAll(".card.selected, .player.selected")
			: document.querySelectorAll(".card.selected, .card.selectable, .player.selected, .player.selectable");
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i];
			n.classList.remove("selected");
			if (!keepSelectable) n.classList.remove("selectable");
			if (typeof n.updateTransform === "function") {
				try {
					n.updateTransform(false);
				} catch (e0) {}
			}
			dirty = true;
		}
		try {
			if (ui.arena && ui.arena.classList.contains("selecting")) {
				ui.arena.classList.remove("selecting");
				dirty = true;
			}
		} catch (e1) {}
		if (dirty) {
			try {
				if (typeof ui.updatec === "function") ui.updatec();
			} catch (e2) {}
		}
	} catch (e) {}
}

let ssForeignPhaseSince = 0;
let ssLastPhase = null;

/*
 * 当前是否处于拼点流程（chooseToCompare 或 type="compare" 的选牌事件）。
 * 联机时这个流程会在每个客户端的事件栈上跑，拼点选牌确认后，
 * 本机手牌仍然带着 .selectable，点一下就会被塞进 ui.selected.cards。
 */
/* 作用：从当前事件沿 parent 向上最多 20 层，找出拼点相关事件（type=compare 或 chooseToCompare）。
 * 只在联机模式返回，非拼点流程返回 null；供选牌/点击守卫判断是否处于拼点。 */
function compareFlowEvent() {
	try {
		if (!ssDeps || !ssDeps._status) return null;
		if (!ssDeps._status.connectMode) return null;
		const st = ssDeps._status;
		let ev = st.event;
		for (let i = 0; i < 20 && ev; i++) {
			if (ev.type === "compare" || ev.name === "chooseToCompare") return ev;
			ev = ev.parent;
		}
	} catch (e) {}
	return null;
}

//●本机此刻是否还在选拼点牌（顶层就是本机的选牌事件且还没出结果）
/* 作用：判断本机此刻是否还在选拼点牌（顶层是本机未出结果的 chooseCard/chooseButton/chooseCardOL）。
 * 选牌期间手牌必须保持可点，选完之后才统一取消 selectable。 */
function localCompareChoosing() {
	try {
		const st = ssDeps && ssDeps._status;
		const game = ssDeps && ssDeps.game;
		if (!st || !game || !game.me) return false;
		const ev = st.event;
		if (!ev || ev.player !== game.me) return false;
		if (ev.result !== undefined) return false;
		return ev.name === "chooseCard" || ev.name === "chooseButton" || ev.name === "chooseCardOL";
	} catch (e) {
		return false;
	}
}

//●拼点选牌结束后，本机手牌不该再处于可点击状态
/* 作用：拼点选牌结束后，移除全部 .card.selectable 并刷新 UI。
 * 防止确认后的手牌还能点一下就被塞进 ui.selected.cards，带到下一个事件里。 */
function stripCompareSelectable() {
	try {
		const ui = ssDeps && ssDeps.ui;
		if (!ui) return;
		const nodes = document.querySelectorAll(".card.selectable");
		if (!nodes.length) return;
		for (let i = 0; i < nodes.length; i++) {
			nodes[i].classList.remove("selectable");
		}
		try {
			if (typeof ui.updatec === "function") ui.updatec();
		} catch (e1) {}
	} catch (e) {}
}

/* 作用：结束回合控件与确认条的总校正入口（250ms 轮询/DOM 变化/确认条同步都会调用）。
 * 依次处理：进入自己回合时清旧选牌 → 拼点选完取消手牌可点 → 非本机阶段隐藏/关闭“结束回合”
 * → 别人的出牌阶段持续 500ms 后收掉本机确认条 → 非出牌阶段把“结束出牌/回合结束”文字恢复为“取消”。 */
function fixStalePhaseControls() {
	try {
		if (!ssDeps || !ssDeps.game) return;
		const game = ssDeps.game;
		const st = ssDeps._status;
		const me = game.me;
		const cp = st ? st.currentPhase : null;
		const own = isOwnPhaseEvent();
		//●刚进入自己的回合：上一轮遗留在 ui.selected.cards 里的牌会被当成已选好，
		//  一起手就会被打出去。这里只清选中态，保留 .selectable，不影响正常出牌
		if (st) {
			const cpNow = st.currentPhase;
			if (cpNow && cpNow !== ssLastPhase) {
				ssLastPhase = cpNow;
				if (cpNow === me && ssDeps.ui && ssDeps.ui.selected && ssDeps.ui.selected.cards && ssDeps.ui.selected.cards.length) {
					sweepLocalSelection(true);
				}
			}
		}
		//●拼点流程里，本机已经选完拼点牌后，其他手牌立刻取消可点击状态
		if (compareFlowEvent() && !localCompareChoosing()) {
			stripCompareSelectable();
		}
		//●优先只在控制条里找：.stayleft 控件本来就挂在 ui.control 下，
		//  这样每次轮询只扫一个小容器，不再全文档扫描
		const _ctl = ssDeps.ui && ssDeps.ui.control;
		const list = _ctl && _ctl.querySelectorAll ? _ctl.querySelectorAll(".stayleft") : document.querySelectorAll(".stayleft");
		for (let i = 0; i < list.length; i++) {
			const el = list[i];
			if (String(el.textContent || "").trim() !== "结束回合") continue;
			if (own) {
				//●回到自己的出牌阶段：只恢复我们自己隐藏过的，不碰别人主动隐藏的
				if (el.__ssStaleHidden) {
					el.__ssStaleHidden = false;
					try {
						el.style.removeProperty("display");
						el.style.removeProperty("pointer-events");
					} catch (e0) {}
				}
				continue;
			}
			//●不是自己的回合：直接关掉，避免留下可点击的残留
			if (me && cp && cp !== me) {
				try {
					if (typeof el.close === "function") {
						el.close();
						continue;
					}
				} catch (e1) {}
			}
			try {
				el.__ssStaleHidden = true;
				el.style.setProperty("display", "none", "important");
				el.style.setProperty("pointer-events", "none", "important");
			} catch (e2) {}
		}
		if (own) {
			ssForeignPhaseSince = 0;
			return;
		}
		const cf = ssDeps.ui ? ssDeps.ui.confirm : null;
		//●持续 500ms 都确认是别人的出牌阶段才处理，避免事件切换的瞬间误清掉本机正在进行的选牌
		const ssNow = Date.now();
		if (isForeignPhase()) {
			if (!ssForeignPhaseSince) ssForeignPhaseSince = ssNow;
		} else {
			ssForeignPhaseSince = 0;
		}
		if (ssForeignPhaseSince && ssNow - ssForeignPhaseSince >= 500) {
			//●确认条属于别人的出牌阶段：整条收掉，避免误点把别人的回合取消
			try {
				if (cf && cf.childNodes && cf.childNodes.length) {
					if (typeof cf.close === "function") cf.close();
					else if (cf.remove) cf.remove();
				}
			} catch (e4) {}
			sweepLocalSelection();
			return;
		}
		//●取消按钮文本只属于“出牌阶段”；其余事件（拼点选牌等）恢复成默认的“取消”
		if (!cf || !cf.childNodes) return;
		for (let i = 0; i < cf.childNodes.length; i++) {
			const btn = cf.childNodes[i];
			if (!btn || btn.link !== "cancel") continue;
			const txt = String(btn.textContent || "").trim();
			let isPhaseText = txt === "结束出牌" || txt === "回合结束" || txt === "结束回合";
			if (!isPhaseText && btn.querySelector) {
				try {
					isPhaseText = !!btn.querySelector('img[src*="jscp"],img[src*="QX.png"]');
				} catch (e3) {}
			}
			if (isPhaseText) btn.innerHTML = "取消";
		}
	} catch (e) {}
}

/*
 * 点击拦截：本体绑定的是 touchend（触屏）/ click，这里在 document 捕获阶段先拦。
 * 只要当前不是本机的出牌阶段事件，任何“结束回合”控件的点击都直接作废，
 * 无论是残留节点还是别人回合里冒出来的，都不会再取消正在进行的阶段。
 */
/* 作用：在 document 捕获阶段拦截 click/touchend。
 * 非本机出牌阶段时，直接作废对手牌、确认条（确定/取消）和“结束回合”控件的点击，
 * 避免残留控件取消别人的回合或把选中状态带进自己回合；服务端页面不安装。 */
function installEndPhaseClickGuard() {
	try {
		if (window.__ssEndPhaseGuardInstalled) return;
		if (typeof document === "undefined" || !document.addEventListener) return;
		if (window.isNonameServer) return;
		window.__ssEndPhaseGuardInstalled = true;
		/* 作用：点击/触摸拦截的实际处理函数。
		 * 依次拦截：拼点选完后的手牌、别人出牌阶段的手牌与确认条、非本机阶段的“结束回合”控件；
		 * 命中后终止事件传播并隐藏控件，其余点击原样放行。 */
		const guard = function (e) {
			try {
				const t = e && e.target;
				if (!t) return;
				const ui = ssDeps ? ssDeps.ui : null;
				/* 作用：终止当前点击/触摸事件的继续传播与默认行为，让残留控件彻底失效。 */
				const block = function () {
					if (e.stopImmediatePropagation) e.stopImmediatePropagation();
					if (e.stopPropagation) e.stopPropagation();
					if (e.cancelable && e.preventDefault) e.preventDefault();
				};
				//●拼点流程中已选完拼点牌：其他手牌一律不可点
				if (compareFlowEvent() && !localCompareChoosing()) {
					const cc = t.closest ? t.closest(".card") : null;
					if (cc) {
						block();
						return;
					}
				}
				//●别人的出牌阶段：本机手牌一律不可点，防止选中状态混进自己下一回合
				if (isForeignPhase()) {
					const cardEl = t.closest ? t.closest(".card") : null;
					if (cardEl) {
						block();
						return;
					}
				}
				//●别人的出牌阶段：确认条（确定/取消）点了同样会取消对方回合
				const cf = ui ? ui.confirm : null;
				if (cf && typeof cf.contains === "function" && cf.contains(t) && isForeignPhase()) {
					block();
					return;
				}
				//●结束回合控件：找不到 stayleft/control 类名时，按“文字正好是结束回合”向上找三层兜底
				let ctl = null;
				if (t.closest) ctl = t.closest(".stayleft") || t.closest(".control");
				if (!ctl) {
					let n = t;
					for (let d = 0; d < 3 && n; d++) {
						if (String(n.textContent || "").trim() === "结束回合") {
							ctl = n;
							break;
						}
						n = n.parentElement;
					}
				}
				if (!ctl) return;
				if (String(ctl.textContent || "").trim() !== "结束回合") return;
				if (isOwnPhaseEvent()) return;
				block();
				try {
					ctl.__ssStaleHidden = true;
					ctl.style.setProperty("display", "none", "important");
					ctl.style.setProperty("pointer-events", "none", "important");
				} catch (e0) {}
			} catch (e1) {}
		};
		document.addEventListener("click", guard, true);
		document.addEventListener("touchend", guard, true);
	} catch (e) {}
}

/*
 * 由 extension.js 注入模块实例后启动：点击拦截 + 250ms 轮询 + DOM 变化时校正。
 * 单独一个定时器，避免依赖 watchConfirmDialogs 内部那套（它依赖 window 全局，正式客户端里跑不动）。
 */
/* 作用：由 extension.js 注入 game/ui/_status 后启动整套守卫。
 * 安装点击拦截，并只保留一个 250ms 轮询（优先调用 watchConfirmDialogs 的 sync），
 * 再挂一个 body 的 childList 观察（100ms 去抖），最后立即执行一次校正；联机服务端模式直接跳过。 */
export function installEndPhaseGuard(deps) {
	try {
		if (deps && deps.game && deps.ui && deps._status) ssDeps = deps;
		if (!ssDeps) return;
		//●联机服务端页面没有控制条，也没必要装轮询
		if (ssDeps.game.servermode) return;
		installEndPhaseClickGuard();
		if (window.__ssEndPhaseFixTimer) return;
		//●只保留一个 250ms 定时器：确认条守护（__ssConfirmWatchSync）内部已会调用
		//  fixStalePhaseControls，装了它就只跑 sync，避免两个定时器重复扫描 DOM。
		window.__ssEndPhaseFixTimer = setInterval(function () {
			try {
				if (typeof window.__ssConfirmWatchSync === "function") window.__ssConfirmWatchSync();
				else fixStalePhaseControls();
			} catch (e) {}
		}, 250);
		//●DOM 变化不再直接扫描，统一 100ms 去抖后再走 sync：弹框开合会连续触发多次，
		//  去抖能避免同一帧里重复扫描 + 强制布局。
		let pendFix = false;
		const scheduleFix = function () {
			if (pendFix) return;
			pendFix = true;
			setTimeout(function () {
				pendFix = false;
				try {
					if (typeof window.__ssConfirmWatchSync === "function") window.__ssConfirmWatchSync();
					else fixStalePhaseControls();
				} catch (e) {}
			}, 100);
		};
		try {
			const root = document.body || document.documentElement;
			if (root) new MutationObserver(scheduleFix).observe(root, { childList: true });
		} catch (e) {}
		fixStalePhaseControls();
	} catch (e) {}
}

/* 作用：检查 window.__ssConfirmWatchIds 里是否至少有一个弹框真实可见（排除五谷框）。
 * 用于判断“确认条是否还被某个弹框占用”，决定能否释放/清理 noconfirm。 */
function watchedOpen() {
	try {
		const ids = window.__ssConfirmWatchIds || [];
		for (let i = 0; i < ids.length; i++) {
			const el = document.getElementById(ids[i]);
			if (isWugu(el)) continue;
			if (el && el.isConnected && getComputedStyle(el).display !== "none" && el.getClientRects().length) return true;
		}
	} catch (e) {}
	return false;
}

/* 作用：清除被污染的 event.noconfirm。
 * 当前事件是需要确认条的阶段事件、但监视弹框都不在时，删除 noconfirm 并补一次 game.check，
 * 防止本体以为已经确认过而不再弹确认条。 */
function clearPollutedNoConfirm() {
	try {
		const ev = typeof _status !== "undefined" ? _status.event : null;
		if (!ev || !ev.noconfirm) return;
		if (!PHASE_EVENTS.test(String(ev.name || ""))) return;
		if (watchedOpen()) return;
		delete ev.noconfirm;
		try {
			safeCheck();
		} catch (e) {}
	} catch (e) {}
}

/* 作用：兜底修复“事件已暂停但没有确认条/控件”的卡死。
 * 700ms 节流，确认 ui.control 为空且 ui.confirm 不可见时补一次 game.check，把确认条重新唤出。 */
function healMissingConfirm() {
	try {
		const now = Date.now();
		if (now - healLast < 700) return;
		const st = typeof _status !== "undefined" ? _status : null;
		if (!st || !st.paused || st.paused2) return;
		if (!PHASE_EVENTS.test(String((st.event && st.event.name) || ""))) return;
		if (watchedOpen()) return;
		let kids = 0;
		try {
			kids = ui && ui.control && ui.control.childNodes ? ui.control.childNodes.length : 0;
		} catch (e) {}
		let barOk = false;
		try {
			const cf = ui && ui.confirm;
			barOk = !!(cf && cf.isConnected && cf.getClientRects().length);
		} catch (e) {}
		if (kids > 0 && barOk) return;
		healLast = now;
		try {
			safeCheck();
		} catch (e) {}
	} catch (e) {}
}

/* 作用：压住本体确认条。
 * 替换 game.Check.confirm（保留 imchoosing 设置，托管切换依赖它；无懈可击询问例外走原逻辑），
 * 给 body 加 ss-confirm-hold 隐藏“结束回合”控件，并累加 depth 记录嵌套层数。 */
export function holdConfirm() {
	try {
		if (game.Check && typeof game.Check.confirm === "function") {
			if (!window.__ssConfirmOrig) window.__ssConfirmOrig = game.Check.confirm;
			//●不能整个置空：Check.confirm 里会调用 game.countChoose() 设置 _status.imchoosing，
			//  托管切换依赖它（ui.click.auto 只在 imchoosing && paused 时才 redo 当前事件）。
			//  置空后自定义弹框里开启托管，AI 永远不会接管，表现为卡在选牌页面。
			/* 作用：替换后的本体确认条逻辑。
			 * 无懈可击询问（chooseToUse + type=wuxie）必须交还原函数，否则事件可能无 result 结束；
			 * 其余情况只设置 _status.imchoosing=true，不再弹本体确认条（由扩展自定义确认条接管）。 */
			game.Check.confirm = function (event) {
				//●无懈可击的询问（chooseToUse.type === "wuxie"）必须保留本体确认条：
				//  被我们压掉后玩家没有正常的“确定/取消”入口，chooseToUse 可能以无 result 结束，
				//  随后 _wuxie 读 result.bool 就会报 Cannot read properties of undefined
				try {
					const ev = event || (typeof _status !== "undefined" ? _status.event : null);
					if (ev && ev.name === "chooseToUse" && ev.type === "wuxie" && window.__ssConfirmOrig) {
						return window.__ssConfirmOrig.apply(this, arguments);
					}
				} catch (e) {}
				try {
					const st = typeof _status !== "undefined" ? _status : window._status;
					if (st) st.imchoosing = true;
				} catch (e) {}
			};
		}
		window.__ssConfirmLastHeldAt = Date.now();
		try {
			if (!document.getElementById("ss-confirm-hold-css")) {
				const st = document.createElement("style");
				st.id = "ss-confirm-hold-css";
				st.textContent = "body.ss-confirm-hold .control.stayleft{display:none!important;}";
				(document.head || document.body).appendChild(st);
			}
			document.body.classList.add("ss-confirm-hold");
		} catch (e) {}
		depth++;
	} catch (e) {}
}

/* 作用：强制隐藏监视列表里仍然可见的弹框（五谷框除外）。
 * 用于释放确认条时清掉没来得及关闭的残留窗口。 */
function hideWatchedDialogs() {
	try {
		const ids = window.__ssConfirmWatchIds || [];
		for (let i = 0; i < ids.length; i++) {
			const el = document.getElementById(ids[i]);
			if (!el || !el.isConnected) continue;
			if (isWugu(el)) continue;
			const cs = getComputedStyle(el);
			if (!cs || cs.display === "none" || !el.getClientRects().length) continue;
			el.style.setProperty("display", "none", "important");
		}
	} catch (e) {}
}

/* 作用：临时关闭确认条及其所有子元素的 transition/animation。
 * 避免重置确认条时出现整条闪烁或位移。 */
function killConfirmTransition() {
	try {
		const el = typeof ui !== "undefined" && ui.confirm ? ui.confirm : null;
		if (!el) return;
		el.style.setProperty("transition", "none", "important");
		el.style.setProperty("animation", "none", "important");
		const kids = el.querySelectorAll ? el.querySelectorAll("*") : [];
		for (let i = 0; i < kids.length; i++) {
			try {
				kids[i].style.setProperty("transition", "none", "important");
				kids[i].style.setProperty("animation", "none", "important");
			} catch (e) {}
		}
	} catch (e) {}
}

/* 作用：320ms 后恢复确认条及子元素的 transition/animation。
 * 与 killConfirmTransition 配对，等布局稳定后再交还动画。 */
function releaseConfirmTransition() {
	try {
		setTimeout(function () {
			const el = typeof ui !== "undefined" && ui.confirm ? ui.confirm : null;
			if (!el) return;
			el.style.removeProperty("transition");
			el.style.removeProperty("animation");
			const kids = el.querySelectorAll ? el.querySelectorAll("*") : [];
			for (let i = 0; i < kids.length; i++) {
				try {
					kids[i].style.removeProperty("transition");
					kids[i].style.removeProperty("animation");
				} catch (e) {}
			}
		}, 320);
	} catch (e) {}
}

/* 作用：释放一次 holdConfirm。
 * depth 降到 0 时才真正恢复 game.Check.confirm、移除 ss-confirm-hold、隐藏残留弹框并 safeCheck；
 * defer=true 表示只标记 __ssConfirmPending，等事件真正结束后再由 resume 流程统一恢复。 */
export function releaseConfirm(defer) {
	try {
		depth = Math.max(0, depth - 1);
		if (depth > 0) return;
		try {
			document.body.classList.remove("ss-confirm-hold");
		} catch (e) {}
		if (window.__ssConfirmOrig) {
			game.Check.confirm = window.__ssConfirmOrig;
			window.__ssConfirmOrig = null;
		}
		if (defer) {
			window.__ssConfirmPending = true;
			return;
		}
		hideWatchedDialogs();
		killConfirmTransition();
		safeCheck();
		releaseConfirmTransition();
	} catch (e) {}
}

/* 作用：只执行一次的初始化，包装 game.resume/resume2/resume3。
 * 每次恢复事件后清 __ssConfirmPending；若当前没有嵌套压制，则还原确认条、safeCheck 并清理 noconfirm，
 * 保证弹框关闭后确认条能回到正常状态。 */
export function initConfirmGuard() {
	if (window.__ssResumeHooked) return;
	window.__ssResumeHooked = true;
	try {
		/* 作用：包装 game.resume/resume2/resume3 中的某一个。
		 * 恢复事件后清 pending；异步检查若 depth 已为 0，则还原确认条、safeCheck 并清理 noconfirm。 */
		const _wrapResume = function (name) {
			try {
				const fn = game[name];
				if (typeof fn !== "function" || fn.__ssResumeWrapped) return;
				const wrapped = function () {
					const r = fn.apply(this, arguments);
					window.__ssConfirmPending = false;
					setTimeout(function () {
						try {
							if (depth === 0) {
								if (window.__ssConfirmOrig) {
									game.Check.confirm = window.__ssConfirmOrig;
									window.__ssConfirmOrig = null;
								}
								safeCheck();
								clearPollutedNoConfirm();
							}
						} catch (e) {}
					}, 0);
					return r;
				};
				wrapped.__ssResumeWrapped = true;
				game[name] = wrapped;
			} catch (e) {}
		};
		["resume", "resume2", "resume3"].forEach(_wrapResume);
	} catch (e) {}
}

/* 作用：包装自定义弹框的 delete/close。
 * 弹框第一次关闭时调用 releaseConfirm(true) 并标记 pending，避免在弹框内部关闭的瞬间就恢复确认条，
 * 等事件结算完再统一释放。 */
export function wrapDialog(dlg) {
	try {
		if (!dlg || dlg.__ssConfirmWrapped) return dlg;
		dlg.__ssConfirmWrapped = true;
		holdConfirm();
		/* 作用：弹框第一次关闭时触发释放。
		 * 用 __ssConfirmReleased 防止 delete/close 重复释放；这里只做延迟释放并标记 pending。 */
		const fire = function (self) {
			try {
				if (self.__ssConfirmReleased) return;
				self.__ssConfirmReleased = true;
				releaseConfirm(true);
				window.__ssConfirmPending = true;
			} catch (e) {}
		};
		const _del = dlg.delete;
		dlg.delete = function () {
			fire(this);
			return _del ? _del.apply(this, arguments) : undefined;
		};
		const _close = dlg.close;
		dlg.close = function () {
			fire(this);
			return _close ? _close.apply(this, arguments) : undefined;
		};
	} catch (e) {}
	return dlg;
}

/* 作用：注册需要监视的弹框 id 并启动确认条守护。
 * 维护“是否有弹框可见”的状态：可见则 holdConfirm，关闭/事件结束则 releaseConfirm 并清理残留，
 * 同时绑定确认条属性观察、body/arena/window 的 DOM 观察和 250ms 兜底轮询。 */
export function watchConfirmDialogs(ids) {
	try {
		if (!Array.isArray(ids)) ids = [ids];
		const store = (window.__ssConfirmWatchIds = window.__ssConfirmWatchIds || []);
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			if (id && store.indexOf(id) < 0) store.push(id);
		}
		initConfirmGuard();
		if (window.__ssConfirmWatchOn) {
			if (typeof window.__ssConfirmWatchSync === "function") window.__ssConfirmWatchSync();
			return;
		}
		window.__ssConfirmWatchOn = true;
		window.__ssConfirmWatchHeld = false;
		/* 作用：判断节点是否真实可见。
		 * 排除未连接、display:none、visibility:hidden、removing/folded-off 以及没有布局盒子的节点。 */
		const visible = function (el) {
			try {
				if (!el || !el.isConnected) return false;
				const cs = getComputedStyle(el);
				if (!cs || cs.display === "none" || cs.visibility === "hidden") return false;
				if (el.classList && (el.classList.contains("removing") || el.classList.contains("folded-off"))) return false;
				return el.getClientRects().length > 0;
			} catch (e) {
				return false;
			}
		};
		/* 作用：遍历监视列表，任意一个弹框真实可见就返回 true（五谷框忽略）。 */
		const anyIdOpen = function () {
			try {
				for (let i = 0; i < store.length; i++) {
					const el = document.getElementById(store[i]);
					if (isWugu(el)) continue;
					if (visible(el)) return true;
				}
			} catch (e) {}
			return false;
		};
		/* 作用：对外统一查询入口，当前等价于 anyIdOpen，保留以便以后扩展其他弹框来源。 */
		const anyOpen = function () {
			return anyIdOpen();
		};
		/* 作用：事件已经结束时，把监视列表里还显示着的弹框强制 display:none，清掉残留。 */
		const killLingering = function () {
			try {
				for (let i = 0; i < store.length; i++) {
					const el = document.getElementById(store[i]);
					if (!el || !el.isConnected) continue;
					const cs = getComputedStyle(el);
					if (!cs || cs.display === "none" || !el.getClientRects().length) continue;
					el.style.setProperty("display", "none", "important");
				}
			} catch (e) {}
		};
		/* 作用：判断当前顶层事件是否仍是需要确认条的阶段事件（PHASE_EVENTS 匹配）。
		 * 匹配到就说明弹框不该继续占用确认条，需要执行 killLingering + release。 */
		const eventOver = function () {
			try {
				const st = typeof _status !== "undefined" ? _status : null;
				if (!st || !st.event) return false;
				return PHASE_EVENTS.test(String(st.event.name || ""));
			} catch (e) {
				return false;
			}
		};
		/* 作用：判断是否由十周年UI接管控制条（dui-controls 或 arena.decadeUI）。
		 * 只有接管时才隐藏文本形式的“结束回合”，否则会把本体唯一按钮也藏掉。 */
		const tenYearUI = function () {
			try {
				if (typeof ui === "undefined" || !ui) return false;
				if (ui.control && ui.control.id === "dui-controls") return true;
				return !!(ui.arena && ui.arena.classList.contains("decadeUI"));
			} catch (e) {
				return false;
			}
		};
		/* 作用：十周年UI下隐藏控制条里文字为“结束回合”的残留节点，并禁止其点击。
		 * 用 __ssEndPhaseHidden 去重，避免每次 sync 重复设置。 */
		const hideEndPhase = function () {
			try {
				//●只有十周年UI接管控制条时才需要隐藏本体按钮文本形式的“结束回合”；
				//  关闭十周年UI后，本体唯一的结束回合按钮就是它，不能再隐藏，否则按钮直接消失
				if (!tenYearUI()) return;
				//●同样只在控制条里找，避免十周年UI下每 250ms 全文档扫描一次
				const _ctl2 = ssDeps.ui && ssDeps.ui.control;
				const list = _ctl2 && _ctl2.querySelectorAll ? _ctl2.querySelectorAll(".control.stayleft") : document.querySelectorAll(".control.stayleft");
				for (let i = 0; i < list.length; i++) {
					const el = list[i];
					if (el.__ssEndPhaseHidden) continue;
					if (String(el.textContent || "").trim() !== "结束回合") continue;
					el.__ssEndPhaseHidden = true;
					el.style.setProperty("display", "none", "important");
					el.style.setProperty("pointer-events", "none", "important");
				}
			} catch (e) {}
		};
		/* 作用：给每个被监视弹框挂一次 class/style 属性观察。
		 * 弹框显隐通常只改这两个属性，观察后用 100ms 去抖触发 sync，不必等 250ms 轮询。 */
		const watchAttrs = function () {
			try {
				for (let i = 0; i < store.length; i++) {
					const el = document.getElementById(store[i]);
					if (!el || el.__ssAttrWatched) continue;
					el.__ssAttrWatched = true;
					new MutationObserver(scheduleSync).observe(el, { attributes: true, attributeFilter: ["class", "style"] });
				}
			} catch (e) {}
		};
		/* 作用：确认条守护的总调度，也是 250ms 轮询和所有 MutationObserver 的回调。
		 * 先校正结束回合控件、隐藏残留并补绑属性观察；
		 * 若弹框仍可见但事件已经结束 → 强制关闭残留并释放；
		 * 若弹框可见 → hold；不可见 → release 并清理被污染的 noconfirm。 */
		const sync = function () {
			try {
				fixStalePhaseControls();
				hideEndPhase();
				watchAttrs();
				const open = anyOpen();
				if (anyIdOpen() && eventOver()) {
					killLingering();
					if (window.__ssConfirmWatchHeld) {
						window.__ssConfirmWatchHeld = false;
						releaseConfirm();
					}
					return;
				}
				if (open) {
					if (!window.__ssConfirmWatchHeld) {
						window.__ssConfirmWatchHeld = true;
						holdConfirm();
					}
				} else {
					if (window.__ssConfirmWatchHeld) {
						window.__ssConfirmWatchHeld = false;
						releaseConfirm();
					}
					clearPollutedNoConfirm();
				}
			} catch (e) {}
		};
		window.__ssConfirmWatchSync = sync;
		/* 作用：所有观察器统一走 100ms 去抖，避免一次弹框开合连发多次 sync（重复扫描 + 强制布局）。 */
		let syncPend = false;
		const scheduleSync = function () {
			if (syncPend) return;
			syncPend = true;
			setTimeout(function () {
				syncPend = false;
				try {
					sync();
				} catch (e) {}
			}, 100);
		};
		/* 作用：给指定容器挂 childList 观察（每个容器只挂一次），子节点变化时调用 sync。 */
		const bind = function (root) {
			try {
				if (!root || root.__ssConfirmWatchBound) return;
				new MutationObserver(scheduleSync).observe(root, { childList: true });
				root.__ssConfirmWatchBound = true;
			} catch (e) {}
		};
		/* 作用：绑定 body、#arena、ui.window 三处 DOM 观察，并立即 sync 一次完成初始校正。 */
		const start = function () {
			bind(document.body);
			bind(document.getElementById("arena"));
			if (typeof ui !== "undefined") bind(ui.window);
			sync();
		};
		start();
		try {
			if (lib.arenaReady && typeof lib.arenaReady.push === "function") lib.arenaReady.push(start);
		} catch (e) {}
		//●结束回合守卫已经提供一个 250ms 定时器（其回调会调用本处的 sync）；
		//  只有它没装成（例如服务端模式）时才自己补一个，避免两条 250ms 轮询重复扫描。
		if (!window.__ssEndPhaseFixTimer) window.__ssConfirmWatchTimer = setInterval(sync, 250);
	} catch (e) {}
}
