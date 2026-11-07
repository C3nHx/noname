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

export function wuguUI() {
	if (!lib.card || !lib.card.wugu) return;
	if (lib.card.wugu.__ssWugu) return;
	lib.card.wugu.__ssWugu = true;

	function ssWuguLayout(dialog) {
		//●卡牌尺寸不再由本扩展缩放：原来的 buttons zoom 0.8 已移除，尺寸交给 extension.js 的统一样式
		if (!dialog || !dialog.isConnected) return;
		try {
			const folded = dialog.classList.contains("folded");
			try {
				if (!dialog.classList.contains("folded")) {
					const _dr = dialog.getBoundingClientRect();
					let _k = 1;
					try {
						const _dw = _dr.width;
						const _dwo = dialog.offsetWidth || 0;
						if (_dw > 8 && _dwo > 8) _k = _dw / _dwo;
						if (!isFinite(_k) || _k <= 0) _k = 1;
					} catch (e) { _k = 1; }
					let _inner = 0;
					try {
						const _ct = dialog.querySelector(".content");
						if (_ct) {
							const _b0 = (_ct.getBoundingClientRect().bottom - _dr.top) / _k;
							if (_b0 > 0) _inner = _b0;
						}
					} catch (e) {}
					const _btnsEl = dialog.querySelector(".content .buttons") || dialog.querySelector(".buttons");
					if (_inner <= 0 && _btnsEl) {
						_btnsEl.querySelectorAll(".button").forEach(function (el) {
							if (!el.offsetHeight) return;
							const _b = (el.getBoundingClientRect().bottom - _dr.top) / _k;
							if (_b > _inner) _inner = _b;
						});
						if (_inner <= 0) {
							const _b2 = (_btnsEl.getBoundingClientRect().bottom - _dr.top) / _k;
							if (_b2 > 0) _inner = _b2;
						}
					}
					const _g10 = typeof ssSY === "function" ? ssSY(10) : 10;
					const _g50 = typeof ssSY === "function" ? ssSY(50) : 50;
					const _g202 = typeof ssSY === "function" ? ssSY(202) : 202;
					const _g138 = typeof ssSY === "function" ? ssSY(138) : 138;
					const _cur = dialog._ssTopTm || 0;
					const _seemsBad = !_cur || Math.abs(_cur - _g138) <= 2 || _inner > _cur + 30 || Math.abs(_inner - _cur) > 15;
					if (_inner > 0 && _seemsBad) {
						const _want = Math.round(_inner + _g10);
						if (Math.abs(_cur - _want) > 4) {
							dialog._ssTopTm = _want;
							const _bh = Math.max(Math.round(_want + _g50), _g202);
							dialog.style.setProperty("height", _bh + "px", "important");
							dialog.style.setProperty("min-height", _bh + "px", "important");
						}
					}
				}
			} catch (e) {}
			const _gap = typeof ssSY === "function" ? ssSY(10) : 10;
			const tm = dialog._ssTopTm || 0;
			const timer = dialog.querySelector(".ss-timer");
			if (timer) {
				if (folded || !tm) {
					timer.style.setProperty("top", "auto", "important");
					timer.style.setProperty("bottom", folded ? "6px" : "34px", "important");
				} else {
					timer.style.setProperty("bottom", "auto", "important");
					timer.style.setProperty("top", tm + "px", "important");
				}
			}
			const hint = dialog.querySelector(".ss-wugu-hint");
			if (hint) {
				if (folded) {
					hint.style.setProperty("display", "none", "important");
				} else {
					hint.style.removeProperty("display");
					if (tm) {
						hint.style.setProperty("bottom", "auto", "important");
						hint.style.setProperty("top", tm + _gap + "px", "important");
					}
				}
			}
			try {
				const _ev2 = _status.event;
				if (_ev2 && _ev2.name === "chooseButton" && _ev2.player && dialog.__ssWugu) {
					ssWuguTurn(dialog, _ev2.player);
				}
			} catch (e) {}
		} catch (e) {}
	}

	function ssWuguTimer(dialog) {
		if (!dialog) return;
		try {
			const timer = dialog.querySelector(".ss-timer");
			if (!timer) return;
			const f = timer.firstElementChild;
			if (!f) return;
			let dur = ssProgressSeconds();
			dur = dur * 1000;
			timer.__ssRunning = true;
			if (timer.__ssIv) {
				clearInterval(timer.__ssIv);
				timer.__ssIv = null;
			}
			const t0 = Date.now();
			f.style.transition = "none";
			f.style.width = "100%";
			timer.__ssIv = setInterval(function () {
				try {
					if (!dialog.isConnected) {
						clearInterval(timer.__ssIv);
						timer.__ssIv = null;
						return;
					}
					const left = Math.max(0, 1 - (Date.now() - t0) / dur);
					f.style.width = Math.round(left * 100) + "%";
					if (left <= 0) {
						clearInterval(timer.__ssIv);
						timer.__ssIv = null;
					}
				} catch (e) {
					try {
						clearInterval(timer.__ssIv);
					} catch (e2) {}
					timer.__ssIv = null;
				}
			}, 50);
		} catch (e) {}
	}

	function ssWuguTurn(dialog, target) {
		if (!dialog || !target) return;
		try {
			const hint = dialog.querySelector(".ss-wugu-hint");
			if (!hint) return;
			const av = hint.querySelector(".ss-wugu-avatar");
			const tx = hint.querySelector(".ss-wugu-turntext");
			if (av) {
				try {
					if (target.isMine && target.isMine()) {
						av.style.setProperty("display", "none", "important");
					} else {
						av.style.removeProperty("display");
						av.style.backgroundImage = target.isUnseen(0)
							? target.isUnseen(1)
								? "linear-gradient(0deg, #000000, #000000)"
								: target.node.avatar2.style.backgroundImage
							: target.node.avatar.style.backgroundImage;
					}
				} catch (e) {}
			}
			if (tx) tx.innerHTML = (target.isMine() ? "你" : get.translation(target)) + "正在选牌";
		} catch (e) {}
	}



	function ssDecorateWuguDialog(dialog) {
		if (!dialog) return;
		try {
			dialog.id = "shunshouDialog";
			dialog.classList.add("ss-wugu");
			dialog.__ssNoConfirm = true;
dialog.__ssWugu = true;
			//●五谷框整体大小：只改下面 window.__ssWuguCardZoom 一个数（1 = 十周年UI原生卡牌大小，原来偏小是 0.7）
			try {
				dialog.style.setProperty("--ss-card-zoom", String(window.__ssWuguCardZoom || 0.95), "important");/*★五谷*/
			} catch (e) {}
			//●五谷框中间卡牌区域在框内整体下移的距离：只改下面 window.__ssWuguCardsDown 一个数（单位：基准像素）
			//  卡牌大小不变，只改上下位置；12.2 为当前效果，改大卡牌更靠下，改小更靠上
			if (typeof window.__ssWuguCardsDown !== "number") window.__ssWuguCardsDown = 10;
			window.__ssWuguLayout = ssWuguLayout;
			if (!dialog.querySelector(".ss-wugu-hint")) {
				const hint = ui.create.div(".ss-wugu-hint", dialog);
				hint.innerHTML = '<div class="ss-wugu-avatar"></div><div class="ss-wugu-turntext">请选择一张牌获得</div>';
			}
			if (!dialog.querySelector(".wuguWuxieBox")) {
				const wBox = ui.create.div(".wuguWuxieBox", dialog);
				const wText = ui.create.div(".wuguWuxieText", "被失效：", wBox);
				wText.style.display = "none";
			}
			let timer = dialog.querySelector(".ss-timer");
			if (!timer) {
				timer = document.createElement("div");
				timer.className = "ss-timer";
				const fill = document.createElement("div");
				fill.className = "ss-timer-fill";
				timer.appendChild(fill);
				dialog.appendChild(timer);
			}
			if (!timer.__ssRunning) {
				timer.__ssRunning = true;
				try {
					const f = timer.firstElementChild;
					if (f) {
						f.style.transition = "none";
						f.style.width = "100%";
						void f.offsetWidth;
					}
				} catch (e) {}
			}
			if (window.__ssLookSkin) window.__ssLookSkin(dialog);
			[80, 350, 1100, 1700].forEach(function (t) {
				setTimeout(function () {
					try {
						if (window.__ssLookSkin) window.__ssLookSkin(dialog);
						ssWuguLayout(dialog);
					} catch (e) {}
				}, t);
			});
			if (!dialog._ssWuguArrowHook) {
				dialog._ssWuguArrowHook = true;
				dialog.addEventListener(
					"click",
					function (e) {
						const _t = e.target;
						if (_t && _t.closest && _t.closest(".ss-arrow")) {
							setTimeout(function () {
								ssWuguLayout(dialog);
							}, 30);
							setTimeout(function () {
								ssWuguLayout(dialog);
							}, 350);
						}
					},
					true
				);
			}
			if (!dialog._ssWuguAutoHook) {
				dialog._ssWuguAutoHook = true;
				dialog.addEventListener(
					"click",
					function () {
						setTimeout(function () {
							try {
								const ev = _status.event;
								if (!ev || ev.name !== "chooseButton" || !ev.isMine || !ev.isMine()) return;
								if (!ui.selected || !ui.selected.buttons || !ui.selected.buttons.length) return;
								if (ev !== _status.event) return;
								game.check();
								if (!ui.selected.buttons.length) return;
								const range = get.select(_status.event.selectButton || [1, 1]);
								if (ui.selected.buttons.length < (range[0] || 1)) return;
								ui.click.ok();
							} catch (e) {}
						}, 80);
					},
					true
				);
			}
		} catch (e) {}
	}

	lib.card.wugu.contentBefore = async function (event, trigger, player) {
		const card = event.card;
		const targets = event.targets;
		if (!targets.length) return;
		if (card.storage?.chooseDirection || get.is.versus()) {
			const result = await player.chooseControl("顺时针", "逆时针", (event2, player2) => {
				if (get.event().isVersus && player2.next.side === player2.side || get.attitude(player2, player2.next) > get.attitude(player2, player2.previous)) {
					return "逆时针";
				}
				return "顺时针";
			}).set("prompt", "选择" + get.translation(card) + "的结算方向").set("isVersus", get.is.versus()).forResult();
			if (result && result.control === "顺时针") {
				const evt = event.getParent();
				const sorter = _status.currentPhase || player;
				evt.fixedSeat = true;
				evt.targets.sortBySeat(sorter);
				evt.targets.reverse();
				if (evt.targets[evt.targets.length - 1] === sorter) {
					evt.targets.unshift(evt.targets.pop());
				}
			}
		}
		ui.clear();
		let cards = [];
		const nextEvents = [];
		if (get.itemtype(card.storage?.fixedShownCards) === "cards") {
			cards = card.storage.fixedShownCards.slice();
			const lose_list = [];
			const cards2 = [];
			cards.forEach((cardx) => {
				const owner = get.owner(cardx);
				if (owner) {
					const arr = lose_list.find((i) => i[0] === owner);
					if (arr) {
						arr[1].push(cardx);
					} else {
						lose_list.push([owner, [cardx]]);
					}
				} else {
					cards2.add(cardx);
				}
			});
			if (lose_list.length) {
				lose_list.forEach((list) => {
					list[0].$throw(list[1]);
					game.log(list[0], "将", list[1], "置于了处理区");
				});
				const loseEvent = game.loseAsync({
					lose_list,
					visible: true,
					relatedEvent: event.getParent()
				}).setContent("chooseToCompareLose");
				nextEvents.push(loseEvent);
			}
			if (cards2.length) {
				const orderingEvent = game.cardsGotoOrdering(cards2);
				orderingEvent.relatedEvent = event.getParent();
				nextEvents.push(orderingEvent);
			}
			nextEvents.push(game.delayex());
		} else {
			let num = event.targets?.length ?? game.countPlayer();
			if (typeof card.storage?.extraCardsNum === "number") {
				num += card.storage.extraCardsNum;
			}
			cards = get.cards(num);
			const orderingEvent = game.cardsGotoOrdering(cards);
			orderingEvent.relatedEvent = event.getParent();
			nextEvents.push(orderingEvent);
		}
		event.getParent().wuguShownCards = cards;
		const dialog = ui.create.dialog("五谷丰登", cards, true);
		try {
			dialog.buttons.forEach((button) => {
				button.setAttribute("sourceCard", "wugu");
			});
		} catch (e) {}
		ssDecorateWuguDialog(dialog);
		_status.dieClose.push(dialog);
		dialog.videoId = lib.status.videoId++;
		game.addVideo("cardDialog", null, ["五谷丰登", get.cardsInfo(cards), dialog.videoId]);
		event.getParent().preResult = dialog.videoId;
		game.broadcast(
			(cards2, id) => {
				const dialog2 = ui.create.dialog("五谷丰登", cards2, true);
				_status.dieClose.push(dialog2);
				dialog2.videoId = id;
			},
			cards,
			dialog.videoId
		);
		game.log(event.card, "亮出了", cards);
		for (const nextEvent of nextEvents) {
			await nextEvent;
		}
	};

	lib.card.wugu.updateWuxieCharacter = function (target) {
		if (!target) return;
		try {
			let dialog = null;
			for (const d of ui.dialogs) {
				if (d && d.__ssWugu && d.isConnected) {
					dialog = d;
					break;
				}
			}
			if (!dialog) dialog = document.querySelector("#shunshouDialog");
			if (!dialog) return;
			const box = dialog.querySelector(".wuguWuxieBox");
			if (!box) return;
			const tx = box.querySelector(".wuguWuxieText");
			if (tx) tx.style.display = "";
			const _key = target.playerid != null ? target.playerid : target.name || "";
			if (box.querySelector('.wuguWuxieSmallCharacter[data-sspid="' + _key + '"]')) return;
			const ch = ui.create.div(".wuguWuxieSmallCharacter", box);
			ch.setAttribute("data-sspid", _key);
			ui.create.div(".wuguWuxieChahao", ch);
			try {
				ch.style.backgroundImage =
					target.isUnseen && target.isUnseen(0)
						? target.isUnseen(1)
							? "linear-gradient(0deg, #000000, #000000)"
							: target.node.avatar2.style.backgroundImage
						: target.node.avatar.style.backgroundImage;
			} catch (e) {}
		} catch (e) {}
	};

	const _ssWuxieOrigContent = lib.card.wuxie && lib.card.wuxie.content;
	if (typeof _ssWuxieOrigContent === "function" && !lib.card.wuxie.__ssWuguWuxie) {
		lib.card.wuxie.__ssWuguWuxie = true;
		lib.card.wuxie.content = async function (event, trigger, player) {
			let _r;
			try {
				_r = await _ssWuxieOrigContent.call(this, event, trigger, player);
			} finally {
				try {
					const src = event.getParent(2) && event.getParent(2)._trigger;
					if (src && src.card && src.card.name === "wugu") {
						let tgt = null;
						try {
							tgt = event.getParent()._info_map && event.getParent()._info_map.target;
						} catch (e) {}
						if (!tgt) {
							try {
								tgt = event.target;
							} catch (e) {}
						}
						if (!tgt) {
							try {
								tgt = src.target;
							} catch (e) {}
						}
						if (tgt && lib.card.wugu.updateWuxieCharacter) lib.card.wugu.updateWuxieCharacter(tgt);
					}
				} catch (e) {}
			}
			return _r;
		};
	}

	lib.card.wugu.content = async function (event, trigger, player) {
		const { target } = event;
		const dialog = ui.dialogs.find((dialog2) => dialog2.videoId === event.preResult);
		if (!dialog || dialog.buttons.length === 0) return;
		try {
			const _par = event.getParent();
			if (_par && _par.targets && !_par.targets.includes(target)) {
				if (lib.card.wugu.updateWuxieCharacter) lib.card.wugu.updateWuxieCharacter(target);
				return;
			}
		} catch (e) {}
		if (ui.confirm) {
			try {
				ui.confirm.hide();
				ui.confirm._ssTmpHidden = true;
			} catch (e) {}
		}
		ssWuguTurn(dialog, target);
		ssWuguTimer(dialog);
		try {
		} catch (e) {}
		let result;
		let directButton;
		if (dialog.buttons.length > 1) {
			const next = target.chooseButton(true);
			next.set("auto", true);
			next.set("ai", (button2) => {
				const player2 = _status.event.player;
				const card2 = button2.link;
				let val = get.value(card2, player2);
				if (get.tag(card2, "recover")) {
					val += game.countPlayer((target2) => target2.hp < 2 && get.attitude(player2, target2) > 0 && lib.filter.cardSavable(card2, player2, target2));
					if (player2.hp <= 2 && game.checkMod(card2, player2, "unchanged", "cardEnabled2", player2)) {
						val *= 2;
					}
				}
				return val;
			});
			next.set("dialog", event.preResult);
			next.set("closeDialog", false);
			next.set("dialogdisplay", true);
			result = await next.forResult();
		} else {
			directButton = dialog.buttons[0];
		}
		let card;
		if (directButton) {
			card = directButton.link;
		} else {
			for (const button2 of dialog.buttons) {
				if (button2.link === result.links[0]) {
					card = button2.link;
					break;
				}
			}
			if (!card) {
				card = dialog.buttons[0].link;
			}
		}
		const button = dialog.buttons.find((button2) => button2.link === card);
		if (button) {
			try {
				button.style.transition = "transform 0.01s ease-in-out";
				button.style.transform = "scale(0.8)";
				const xtx = ui.create.div(".xtx", button);
				const xtxN = ui.create.div(".xtxName", xtx);
				xtxN.innerHTML = get.translation(target);
				xtx.style.backgroundImage = target.isUnseen(0)
					? target.isUnseen(1)
						? "linear-gradient(0deg, #000000, #000000)"
						: target.node.avatar2.style.backgroundImage
					: target.node.avatar.style.backgroundImage;
				ui.create.div(".huise", button);
			} catch (e) {}
			dialog.buttons.remove(button);
		}
		const capt = get.translation(target) + "选择了" + get.translation(button.link);
		let gainEvent;
		if (card) {
			gainEvent = target.gain(card, "visible");
			target.$gain2(card);
			game.broadcast(
				(card2, id, capt2) => {
					const dialog2 = get.idDialog(id);
					if (dialog2) {
						try {
							dialog2.content.firstChild.innerHTML = capt2;
						} catch (e) {}
						const button2 = dialog2.buttons.find((button3) => button3.link === card2);
						if (button2) dialog2.buttons.remove(button2);
					}
				},
				card,
				dialog.videoId,
				capt
			);
		}
		try {
			dialog.content.firstChild.innerHTML = capt;
		} catch (e) {}
		game.addVideo("dialogCapt", null, [dialog.videoId, capt]);
		game.log(target, "选择了", button.link);
		const delayEvent = game.delay();
		if (gainEvent) {
			await gainEvent;
		}
		await delayEvent;
	};

	lib.card.wugu.contentAfter = async function (event) {
		const dialog = ui.dialogs.find((dialog2) => dialog2.videoId === event.preResult);
		let remainedEvent;
		if (ui.confirm && ui.confirm._ssTmpHidden) {
			ui.confirm._ssTmpHidden = false;
			try {
				ui.confirm.show();
			} catch (e) {}
		}
		if (dialog) {
			dialog.close();
			_status.dieClose.remove(dialog);
			if (dialog.buttons.length) {
				event.remained = dialog.buttons.map((button) => button.link);
				remainedEvent = event.trigger("wuguRemained");
			}
		}
		game.broadcast((id) => {
			const dialog2 = get.idDialog(id);
			if (dialog2) {
				dialog2.close();
				_status.dieClose.remove(dialog2);
			}
		}, event.preResult);
		game.addVideo("cardDialog", null, event.preResult);
		if (remainedEvent) await remainedEvent;
		const cards = event.remained;
		if (get.itemtype(cards) == "cards" && cards.someInD()) {
			game.log(cards.filterInD(), "被置入了弃牌堆");
			await game.cardsDiscard(cards.filterInD());
		}
	};

	/*●联机客机上也要显示五谷框（不依赖房主装没装本扩展）：
	  五谷对话框本身是 content 用 game.broadcast 发给每个客机建的
	  （ui.create.dialog("五谷丰登", cards, true)，按钮也在客机本地建），客机只是没做装饰。
	  这里包一层 ui.create.dialog，但把装饰推迟到当前 tick 之后：
	  单机/房主自己那一侧紧接着（同一个 tick）就会显式调 ssDecorateWuguDialog 把 __ssWugu 置上，
	  回调执行时发现已装饰就直接跳过，本地行为与改动前完全一致；
	  只有客机（没人显式装饰）才会走到补装饰这一步。只换皮，不碰选择逻辑 */
	if (!ui.create.__ssWuguDialogHook) {
		ui.create.__ssWuguDialogHook = true;
		const ssOrigCreateDialog = ui.create.dialog;
		ui.create.dialog = function () {
			const dialog = ssOrigCreateDialog.apply(this, arguments);
			try {
				if (dialog && arguments.length >= 2) {
					const title = arguments[0];
					if (typeof title === "string" && title.indexOf("五谷") >= 0 && get.itemtype(arguments[1]) === "cards") {
						setTimeout(function () {
							try {
								if (dialog.__ssWugu) return;
								ssDecorateWuguDialog(dialog);
								try {
									dialog.buttons.forEach((button) => button.setAttribute("sourceCard", "wugu"));
								} catch (e) {}
							} catch (e) {}
						}, 0);
					}
				}
			} catch (e) {}
			return dialog;
		};
	}
}
