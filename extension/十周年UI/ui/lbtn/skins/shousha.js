/**
 * 手杀风格lbtn插件
 * 特点：聊天系统、身份显示、手杀风格菜单、自动牌序
 * @version 2.0
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";
import { initChatSystem } from "../chatSystem.js";

export function createShoushaLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	// 手牌排序函数
	const sortHandCards = () => {
		if (!game.me || game.me.hasSkillTag("noSortCard")) return;
		const cards = game.me.getCards("hs");
		const sort2 = (a, b) => {
			const order = { basic: 0, trick: 1, delay: 1, equip: 2 };
			const ta = get.type(a);
			const tb = get.type(b);
			const ca = order[ta] === undefined ? 99 : order[ta];
			const cb = order[tb] === undefined ? 99 : order[tb];
			if (ca !== cb) return ca - cb;
			if (a.name !== b.name) return lib.sort.card(a.name, b.name);
			if (a.suit !== b.suit) return lib.suit.indexOf(a.suit) - lib.suit.indexOf(b.suit);
			return a.number - b.number;
		};
		if (cards.length > 1) {
			cards.sort(sort2);
			cards.forEach((card, j) => {
				game.me.node.handcards1.insertBefore(cards[j], game.me.node.handcards1.firstChild);
			});
			if (typeof decadeUI !== "undefined") decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
		}
	};

	// 开启自动牌序
	const startAutoPaixu = () => {
		if (!game.me || game.me.hasSkillTag("noSortCard")) return;
		const container = game.me.node?.handcards1;
		if (!container) return;

		if (ui._autoPaixuObserver) {
			try {
				ui._autoPaixuObserver.disconnect();
			} catch (e) { }
		}

		ui._autoPaixuDebounce = null;
		ui._autoPaixuSorting = false;
		ui._autoPaixuEnabled = true;
		ui._autoPaixuContainer = container;
		ui._autoPaixuLastCount = container.childNodes.length || 0;

		ui._autoPaixuObserver = new MutationObserver(() => {
			if (ui._autoPaixuSorting) return;
			if (ui._autoPaixuDebounce) clearTimeout(ui._autoPaixuDebounce);
			ui._autoPaixuDebounce = setTimeout(() => {
				if (!game.me?.node?.handcards1) return;
				const curCount = game.me.node.handcards1.childNodes.length || 0;
				if (ui._autoPaixuLastCount !== null && curCount < ui._autoPaixuLastCount) {
					ui._autoPaixuLastCount = curCount;
					return;
				}
				const cards = game.me.getCards("hs");
				const sort2 = (a, b) => {
					const order = { basic: 0, trick: 1, delay: 1, equip: 2 };
					const ta = get.type(a);
					const tb = get.type(b);
					const ca = order[ta] === undefined ? 99 : order[ta];
					const cb = order[tb] === undefined ? 99 : order[tb];
					if (ca !== cb) return ca - cb;
					if (a.name !== b.name) return lib.sort.card(a.name, b.name);
					if (a.suit !== b.suit) return lib.suit.indexOf(a.suit) - lib.suit.indexOf(b.suit);
					return a.number - b.number;
				};
				if (cards.length > 1) {
					ui._autoPaixuSorting = true;
					const sorted = cards.slice().sort(sort2);
					const cont = game.me.node.handcards1;
					let unchanged = true;
					for (let idx = 0; idx < sorted.length; idx++) {
						if (cont.childNodes[idx] !== sorted[idx]) {
							unchanged = false;
							break;
						}
					}
					if (!unchanged) {
						for (let k = 0; k < sorted.length; k++) {
							const nodeExpect = sorted[k];
							if (cont.childNodes[k] !== nodeExpect) {
								cont.insertBefore(nodeExpect, cont.childNodes[k] || null);
							}
						}
					}
					if (typeof decadeUI !== "undefined") {
						decadeUI.queueNextFrameTick(() => {
							decadeUI.layoutHand();
							setTimeout(() => {
								ui._autoPaixuSorting = false;
							}, 0);
						}, decadeUI);
					} else {
						ui._autoPaixuSorting = false;
					}
					ui._autoPaixuLastCount = game.me.node.handcards1.childNodes.length || 0;
					ui._autoPaixuSuppressOnce = true;
				}
			}, 180);
		});

		ui._autoPaixuObserver.observe(container, { childList: true, subtree: true });

		if (ui._autoPaixuKeeper) {
			try {
				clearInterval(ui._autoPaixuKeeper);
			} catch (e) { }
		}
		ui._autoPaixuKeeper = setInterval(() => {
			if (!ui._autoPaixuEnabled || !game.me?.node) return;
			const cur = game.me.node.handcards1;
			if (!cur) return;
			if (cur !== ui._autoPaixuContainer) {
				ui._autoPaixuContainer = cur;
				ui._autoPaixuLastCount = cur.childNodes.length || 0;
				try {
					ui._autoPaixuObserver.disconnect();
				} catch (e) { }
				ui._autoPaixuObserver.observe(cur, { childList: true, subtree: true });
			}
			const nowCount = cur.childNodes.length || 0;
			if (nowCount !== ui._autoPaixuLastCount) {
				const prev = ui._autoPaixuLastCount;
				ui._autoPaixuLastCount = nowCount;
				if (nowCount > prev && !ui._autoPaixuSorting) {
					if (ui._autoPaixuSuppressOnce) {
						ui._autoPaixuSuppressOnce = false;
					} else {
						setTimeout(sortHandCards, 120);
					}
				}
			}
		}, 600);

		sortHandCards();
	};

	// 关闭自动牌序
	const stopAutoPaixu = () => {
		if (ui._autoPaixuObserver) {
			try {
				ui._autoPaixuObserver.disconnect();
			} catch (e) { }
			ui._autoPaixuObserver = null;
		}
		if (ui._autoPaixuDebounce) {
			clearTimeout(ui._autoPaixuDebounce);
			ui._autoPaixuDebounce = null;
		}
		if (ui._autoPaixuKeeper) {
			try {
				clearInterval(ui._autoPaixuKeeper);
			} catch (e) { }
			ui._autoPaixuKeeper = null;
		}
		ui._autoPaixuSorting = false;
		ui._autoPaixuEnabled = false;
	};

	//●牌堆统计-记牌器
// 联机修复：房主端定时广播牌堆数据，客机缓存后随时可查看
window._paiduiCache = { drawPile: [], discardPile: [] };

const showPaidui = async function () {
  function getPureData(elem) {
    try {
      return Array.from(elem.children).map(card => ({
        number: get.number(card),
        suit: get.suit(card),
        color: get.color(card),
        nature: get.nature(card),
        type: get.type(card),
        name: get.name(card)
      }));
    } catch (e) {
      return [];
    }
  }
  if (!_status.gameStarted) return;
  game.pause2();
  //● 联机时客机使用缓存数据，房主使用实时 DOM 数据
  let drawPile, discardPile;
  if (_status.connectMode && game.online) {
    drawPile = window._paiduiCache.drawPile;
    discardPile = window._paiduiCache.discardPile;
  } else {
    drawPile = getPureData(ui.cardPile);
    discardPile = getPureData(ui.discardPile);
  }
  let popupContainer = ui.create.div(".popupContainer.deckMonitor", ui.window, function () {
    this.delete(400);
    game.resume2();
  });
  let container = ui.create.div(".deckMonitor", popupContainer, function (e) {
    e.stopPropagation();
  });
  let flag = true;
  let titleContainer = ui.create.div(".title", container, function (e) {
    if (flag) {
      statistic(discardPile, "弃牌牌堆");
    } else {
      statistic(drawPile, "摸牌牌堆");
    }
    flag = !flag;
  });
  let contentContainer = ui.create.div(".contentContainer", container);
  statistic(drawPile, "摸牌牌堆");
  function statistic(cards, title) {
    if (!cards) cards = [];
    titleContainer.innerHTML = `${title}【${cards.length}张】 <span>(点击切换)</span>`;
    contentContainer.innerHTML = "";
    renderNumberColumn();
    renderSuitColumn();
    renderTypeColumns();
    function renderNumberColumn() {
      let numberResult = Object.groupBy(cards, (card) => card.number);
      for (let i = 1; i <= 13; i++) {
        if (!numberResult[i]) numberResult[i] = [];
      }
      createColumnContainer(numberResult, "点数", cards.length);
    }
    function renderSuitColumn() {
      let suitResult = Object.groupBy(cards, (card) => card.suit);
      Object.assign(suitResult, Object.groupBy(cards, (card) => {
        if (card.suit == "spade" && card.number <= 9 && card.number >= 2) {
          return "♠2-9";
        }
      }));
      delete suitResult[undefined];
      for (let suit of lib.suit) {
        if (!suitResult[suit]) suitResult[suit] = [];
      }
      createColumnContainer(suitResult, "花色", cards.length);
    }
    function renderTypeColumns() {
      let typeResult = Object.groupBy(cards, (card) => card.type);
      typeResult.basic ??= [];
      typeResult.trick ??= [];
      typeResult.equip ??= [];
      typeResult.delay ??= [];
      for (let key of Object.keys(typeResult).sort((a, b) => {
        let arr = ["basic", "trick", "equip", "delay", "jiqi", "spell", "zhenfa", "food", "jiguan", "land"];
        return arr.indexOf(a) - arr.indexOf(b);
      })) {
        let result = Object.groupBy(typeResult[key], (card) => card.name);
        if (key == "basic") {
          Object.assign(result, Object.groupBy(typeResult[key], (card) => {
            if (card.name !== "sha") return;
            return get.translation(card.color) + "杀";
          }));
          Object.assign(result, Object.groupBy(typeResult[key], (card) => {
            if (card.name !== "sha") return;
            let perfix = get.translation(card.nature);
            if (perfix == "") perfix = "普通";
            return perfix + "杀";
          }));
          delete result[undefined];
        }
        createColumnContainer(result, get.translation(key), typeResult[key].length);
      }
    }
    function createColumnContainer(result, title, count) {
      let column = ui.create.div(".columnContainer", contentContainer);
      let subtitle = ui.create.div(".subtitle", column);
      subtitle.textContent = `${title}(${count})`;
      let itemContainer = ui.create.div(".itemContainer", column);
      for (let key in result) {
        let item = ui.create.div(".item", itemContainer);
        let tip = ui.create.div(".tip", item);
        tip.innerHTML = handleColor(result[key].reduce((a, c) => {
          return a + `${get.translation(c.suit)}${c.number} `;
        }, ""));
        item.addEventListener("mouseenter", function (e) {
          if (tip.innerHTML == "") return;
          tip.style.display = "block";
          let rect = item.getBoundingClientRect();
          if (rect.top < window.innerHeight / 2) {
            tip.style.top = "110%";
            tip.style.bottom = "";
          } else {
            tip.style.bottom = "110%";
            tip.style.top = "";
          }
        });
        item.addEventListener("mouseleave", function (e) {
          tip.style.display = "none";
        });
        let itemName = ui.create.div(".itemName", item);
        let itemCount = ui.create.div(".itemCount", item);
        itemName.innerHTML = handleColor(get.translation(key));
        itemCount.textContent = `×${result[key].length}`;
      }
      function handleColor(str) {
        if (!str) return "";
        str = str.replace(/[♦♥]/g, '<span style="color:red">$&</span>');
        str = str.replace(/[♣♠]/g, '<span style="color:black">$&</span>');
        return str;
      }
    }
  }
};

//● 联机修复：客机收到后缓存到 window._paiduiCache，点击记牌器时使用缓存渲染
if (typeof _status !== 'undefined' && _status.connectMode && !game.online) {
  var _paiduiLastDraw = -1, _paiduiLastDiscard = -1;
  if (window._paiduiTimer) clearInterval(window._paiduiTimer);
  window._paiduiTimer = setInterval(function () {
    if (!_status.gameStarted || game.online) return;
    var drawLen = 0, discardLen = 0;
    try { drawLen = ui.cardPile.children.length; } catch (e) {}
    try { discardLen = ui.discardPile.children.length; } catch (e) {}
    //● 数量未变化则跳过广播，减少网络开销
    if (drawLen === _paiduiLastDraw && discardLen === _paiduiLastDiscard) return;
    _paiduiLastDraw = drawLen;
    _paiduiLastDiscard = discardLen;
    var drawData = [], discardData = [];
    try {
      drawData = Array.from(ui.cardPile.children).map(function (card) {
        return {
          number: get.number(card),
          suit: get.suit(card),
          color: get.color(card),
          nature: get.nature(card),
          type: get.type(card),
          name: get.name(card)
        };
      });
    } catch (e) {}
    try {
      discardData = Array.from(ui.discardPile.children).map(function (card) {
        return {
          number: get.number(card),
          suit: get.suit(card),
          color: get.color(card),
          nature: get.nature(card),
          type: get.type(card),
          name: get.name(card)
        };
      });
    } catch (e) {}
    game.broadcastAll(function (drawArr, discardArr) {
      if (window._paiduiCache) {
        window._paiduiCache.drawPile = drawArr;
        window._paiduiCache.discardPile = discardArr;
      }
    }, drawData, discardData);
  }, 1000);
}


	// 距离显示相关变量
	let _lastMe = null;
	let _distanceUpdateInterval = null;

	// 显示距离
	const showDistanceDisplay = () => {
		if (!lib.config.right_range) return;/*●*/
		closeDistanceDisplay();
		_lastMe = game.me;
		if (game.players?.length > 0) {
			game.players.forEach(player => {
				if (player !== game.me) {
					const distance = get.distance(game.me, player);
					const distanceText = distance === Infinity ? "∞" : distance.toString();
					const distanceDisplay = ui.create.div(".distance-display", `(距离:${distanceText})`, player);
					player._distanceDisplay = distanceDisplay;
				}
			});
		}
		if (_distanceUpdateInterval) clearInterval(_distanceUpdateInterval);
		_distanceUpdateInterval = setInterval(updateDistanceDisplay, 1000);
	};

	// 更新距离显示
	const updateDistanceDisplay = () => {
		if (_lastMe !== game.me) {
			_lastMe = game.me;
			closeDistanceDisplay();
			showDistanceDisplay();
			return;
		}
		game.players.forEach(player => {
			if (player !== game.me && player._distanceDisplay) {
				const distance = get.distance(game.me, player);
				const distanceText = distance === Infinity ? "∞" : distance.toString();
				player._distanceDisplay.innerHTML = `(距离:${distanceText})`;
			}
		});
	};

	// 关闭距离显示
	const closeDistanceDisplay = () => {
		game.players?.forEach(player => {
			if (player._distanceDisplay) {
				player._distanceDisplay.remove();
				player._distanceDisplay = null;
			}
		});
		if (_distanceUpdateInterval) {
			clearInterval(_distanceUpdateInterval);
			_distanceUpdateInterval = null;
		}
	};

	return {
		...base,
		skinName: "shousha",

		// 点击处理器
		click: {
			...base.click,
			paixu: sortHandCards,
			startAutoPaixu,
			stopAutoPaixu,
			paidui: showPaidui,
		},

		content(next) {
			// 技能更新触发器
			lib.skill._uicardupdate = {
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				unique: true,
				popup: false,
				silent: true,
				noLose: true,
				noGain: true,
				noDeprive: true,
				priority: -Infinity,
				filter: (event, player) => !!player,
				async content() {
					const me = _status.event?.player || game.me;
					ui.updateSkillControl?.(me, true);
				},
			};
		},

		precontent() {
			initChatSystem(lib, game, ui, get);
			this.initArenaReady();
			base.initBaseRewrites.call(this);

			// 游戏开始时显示距离
			if (lib.announce?.subscribe) {
				lib.announce.subscribe("gameStart", () => { setTimeout(showDistanceDisplay, 100); if (_status.connectMode && get.mode() == 'doudizhu') setTimeout(() => { this.initRoundUpdate() }, 200) });/*●*/
			} else {
				// 兼容旧版本：使用lib.arenaReady
				lib.arenaReady.push(() => {
					// 等待游戏开始后显示距离
					const checkAndShow = () => {
						if (_status.gameStarted && game.players?.length > 0) {
							setTimeout(showDistanceDisplay, 100);
						} else {
							setTimeout(checkAndShow, 500);
						}
					};
					checkAndShow();
				});
			}
		},

		// 覆盖确认对话框重写
		initConfirmRewrite() {
			const self = this;
			ui.create.confirm = (str, func) => {
				if (ui.confirm?.classList.contains("closing")) {
					ui.confirm.remove();
					ui.controls.remove(ui.confirm);
					ui.confirm = null;
				}

				if (!ui.confirm) {
					ui.confirm = self.create.confirm();
				}

				ui.confirm.node.ok.classList.add("disabled");
				ui.confirm.node.cancel.classList.add("disabled");

				if (_status.event.endButton) {
					ui.confirm.node.cancel.classList.remove("disabled");
				}

				if (str) {
					if (str.includes("o")) ui.confirm.node.ok.classList.remove("disabled");
					if (str.includes("c")) ui.confirm.node.cancel.classList.remove("disabled");
					ui.confirm.str = str;
				}

				if (func) {
					ui.confirm.custom = func;
				} else {
					ui.confirm.custom = (link, target) => {
						if (link === "ok") ui.click.ok(target);
						else if (link === "cancel") ui.click.cancel(target);
						else target.custom?.(link);
					};
				}
				ui.updatec();
				ui.confirm.update?.();
			};
		},

		// ●Arena准备完成后初始化
		initArenaReady() {
			const self = this;
			lib.arenaReady.push(() => {
				self.initRoundUpdate();
				// 聊天按钮
				self.createChatButton();
				// 身份显示
				if (self.supportedModes.includes(lib.config.mode)) self.initIdentityShow();
				if (_status.connectMode) self.createConnectButton();
				// 右上角菜单
				self.createMenuButton();
				// 左上角身份提示
				if (!["chess", "tafang"].includes(lib.config.mode)) self.createIdentityTip();
                if (lib.config.extension_十周年UI_equipments && !lib.config.extension_十周年UI_aloneEquip && lib.config.extension_十周年UI_newDecadeStyle == "off") window.zqEquipCss?.();
			});
		},

		// 创建聊天按钮
		createChatButton() {
			const self = this;
			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}uibutton/liaotian.png`;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			btn.style.cssText = `display:block;--w:135px;--h:calc(var(--w)*1019/1400);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 97px);${isRight ? "right" : "left"}:calc(100% - 129px);background-color:transparent;z-index:3;${isRight ? "" : "transform:scaleX(-1);"}`;/*●*/
			const clickArea = ui.create.node("div");
			// 计算透明区域的样式
			if (isRight) {
				clickArea.style.cssText = `
            position: absolute;
            top: calc(100% - 100px);
            right: calc(100% - 118px);
            width: 90px;
            height: 80.4px;
            cursor: pointer;
            z-index: 4;
        `;
			} else {
				clickArea.style.cssText = `
            position: absolute;
            top: calc(100% - 100px);
            left: calc(100% - 118px);
            width: 81px;
            height: 56.1px;
            cursor: pointer;
            z-index: 4;
            transform: scaleX(-1);
        `;
			}
			clickArea.onclick = () => {
				if (lib.config["extension_说话_enable"]) {
					game.showChatWordBackground?.();
				} else {
					game.showChatWordBackgroundX?.();
				}
			};
			document.body.appendChild(btn);
			document.body.appendChild(clickArea);
		},

		// 创建联机内按钮
		createConnectButton() {
			const paixu = ui.create.node("img");
			paixu.src = `${lib.assetURL}${assetPath}uibutton/btn-paixu.png`;
			paixu.style.cssText = "display: block;position: absolute;top: calc(100% - 197px);right: calc(100% - 111px);--w: 70px;--h: calc(var(--w) * 55/68);width: var(--w);height: var(--h);background-color: transparent;z-index:1";/*●*/
			paixu.onclick = () => {
				if (!game.me || game.me.hasSkillTag("noSortCard")) return;
				var cards = game.me.getCards("hs");
				var sort2 = function (b, a) {
					if (a.name != b.name) return lib.sort.card(a.name, b.name);
					else if (a.suit != b.suit) return lib.suit.indexOf(a) - lib.suit.indexOf(b);
					else return a.number - b.number;
				};
				if (cards.length > 1) {
					cards.sort(sort2);
					cards.forEach(function (i, j) {
						game.me.node.handcards1.insertBefore(cards[j], game.me.node.handcards1.firstChild);
					});
					decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
				}
			};
			document.body.appendChild(paixu);
			const jilu = ui.create.node("img");
			jilu.src = `${lib.assetURL}${assetPath}uibutton/btn-jilu.png`;
			jilu.style.cssText = "display: block;position: absolute;top: calc(100% - 142px);right: calc(100% - 111px);--w: 70px;--h: calc(var(--w) * 55/68);width: var(--w);height: var(--h);background-color: transparent;z-index:1";/*●*/
			jilu.onclick = ui.click.pause;
			document.body.appendChild(jilu);
		},


		// 获取当前游戏模式
		getCurrentMode() {
			if (lib.configOL.doudizhu_mode || lib.config.mode === "doudizhu") return "doudizhu";
			if (lib.configOL.single_mode || lib.config.mode === "single") return "single";
			if (lib.configOL.boss_mode || lib.config.mode === "boss") return "boss";
			if (lib.configOL.guozhan_mode || lib.config.mode === "guozhan") return "guozhan";
			if (lib.configOL.versus_mode || lib.config.mode === "versus") return "versus";
			return "identity";
		},

		// 获取模式胜利条件翻译
		getModeWinTranslations(mode, versusMode) {
			const baseIdentityMap = {
				rZhu: "击败冷方主公<br>与所有野心家",
				rZhong: "保护暖方主公<br>击败冷方主公<br>与所有野心家",
				rYe: "联合冷方野心家<br>击败其他角色",
				rNei: "协助冷方主公<br>击败暖方主公<br>与所有野心家",
				bZhu: "击败暖方主公<br>与所有野心家",
				bZhong: "保护冷方主公<br>击败暖方主公<br>与所有野心家",
				bYe: "联合暖方野心家<br>击败其他角色",
				bNei: "协助暖方主公<br>击败冷方主公<br>与所有野心家",
				zhu: "推测场上身份<br>击败反贼内奸",
				zhong: "保护主公<br>取得最后胜利",
				fan: "找出反贼队友<br>全力击败主公",
				nei: "找出反贼忠臣<br>最后击败主公",
				mingzhong: "保护主公<br>取得最后胜利",
				commoner: "苟住<br>有一方获胜你就胜利",
				undefined: "击败所有敌方",
			};

			const modeHandlers = {
				single: {
					zhu: "击败对手",
					fan: "击败对手",
					undefined: "未选择阵营",
				},
				boss: {
					zhu: "击败盟军",
					cai: "击败神祇",
					undefined: "未选择阵营",
				},
				guozhan: () => {
					let config = {
						undefined: "未选择势力",
						unknown: "保持隐蔽",
						ye: "&nbsp;&nbsp;&nbsp;&nbsp;击败场上<br>所有其他角色",
						key: "&nbsp;&nbsp;&nbsp;&nbsp;击败所有<br>非键势力角色",
					};
					for (let i = 0; i < lib.group.length; i++) {
						config[lib.group[i]] = "&nbsp;&nbsp;&nbsp;&nbsp;击败所有<br>非" + get.translation(lib.group[i]) + "势力角色";
					}
					return config;
				},
				versus: () => {
					if (_status.connectMode) versusMode = lib.configOL.versus_mode;
					if (versusMode === "standard") return {};
					if (versusMode === "two" || versusMode === "three" || versusMode === "four" || versusMode === "2v2" || versusMode === "3v3" || versusMode === "4v4") {
						return {
							zhu: "击败对方主帅",
							zhong: "击败对方主帅",
							ezhu: "击败对方主帅",
							ezhong: "击败对方主帅",
							undefined: (get.config("replace_character_two") ? "击败所有敌方" : "协同队友<br>击败所有敌人")
						};
					}
					if (versusMode === "jiange") {
						return {
							wei: "击败所有<br>蜀势力角色",
							shu: "击败所有<br>魏势力角色",
						};
					}
					if (versusMode === "siguo") {
						let config = {};
						for (let i = 0; i < lib.group.length; i++) {
							config[lib.group[i]] = "获得龙船或击败<br>非" + get.translation(lib.group[i]) + "势力角色";
						}
						return config;
					}
					return {
						zhu: "击败对方主帅",
						zhong: "击败对方主帅",
						ezhu: "击败对方主帅",
						ezhong: "击败对方主帅",
					};
				},
				doudizhu: {
					zhu: "击败所有农民",
					fan: "击败地主",
					undefined: "未选择阵营"
				},
				identity: baseIdentityMap
			};

			const handler = modeHandlers[mode];
			return typeof handler === "function" ? handler() : handler || baseIdentityMap;
		},

		// 更新身份显示
		updateIdentityShow() {
			const IDENTITY_CONSTANTS = {
				// 国战身份配置
				GUOZHAN_IDENTITIES: [
					{ key: "unknown", color: "#FFFFDE" },
					{ key: "wei", color: "#0075FF" },
					{ key: "shu", color: "#ff0000" },
					{ key: "wu", color: "#00ff00" },
					{ key: "qun", color: "#ffff00" },
					{ key: "jin", color: "#9e00ff" },
					{ key: "ye", color: "#9e00ff" },
					{ key: "key", color: "#9e00ff" },
				],
				// 标准身份配置
				IDENTITY_INFO: {
					zhu: {
						color: "#AE5F35",
						aliases: ["zhu", "rZhu", "bZhu"]
					},
					zhong: {
						color: "#E9D765",
						aliases: ["zhong", "rZhong", "bZhong", "mingzhong"]
					},
					fan: {
						color: "#87A671",
						aliases: ["fan", "rYe", "bYe"]
					},
					nei: {
						color: "#9581C4",
						aliases: ["nei", "rNei", "bNei"]
					},
					commoner: {
						color: "#808080",
						aliases: ["commoner"]
					},
				},
				// 斗地主身份配置
				DOUDIZHU_COLORS: {
					zhu: "#ae5f35",
					fan: "#87a671"
				},
				// 对决模式身份配置
				VERSUS_COLORS: {
					enemy: "#87a671", // 虎
					friend: "#E9D765" // 龙
				}
			};

			const identityShow = game.ui_identityShow;
			const identityShowx = game.ui_identityShowx;

			// 获取当前游戏模式
			const currentMode = this.getCurrentMode();
			let str = "";

			if (currentMode === "guozhan" ||
				(lib.config.mode === "versus" && get.config("versus_mode") === "siguo") ||
				(lib.config.mode === "versus" && get.config("versus_mode") === "jiange")) {

				const identities = IDENTITY_CONSTANTS.GUOZHAN_IDENTITIES;
				identities.forEach(({ key, color }) => {
					const count = game.countPlayer(current => current.identity === key);
					if (count > 0) str += `<font color="${color}">${get.translation(key)}</font> x ${count}  `;
				});

			} else if (currentMode === "doudizhu") {
				const zhu = game.countPlayer(current => current.identity === "zhu");
				const fan = game.countPlayer(current => current.identity === "fan");
				str += `<font color="${IDENTITY_CONSTANTS.DOUDIZHU_COLORS.zhu}">地</font> x ${zhu}  `;
				str += `<font color="${IDENTITY_CONSTANTS.DOUDIZHU_COLORS.fan}">农</font> x ${fan}  `;

			} else if (lib.config.mode === "versus" &&
				(get.config("versus_mode") === "two" ||
					lib.configOL.versus_mode === "2v2" ||
					lib.configOL.versus_mode === "3v3" ||
					lib.configOL.versus_mode === "4v4")) {

				const enemy = game.countPlayer(current => current.isEnemyOf(game.me));
				const friend = game.countPlayer(current => current.isFriendOf(game.me));
				str += `<font color="${IDENTITY_CONSTANTS.VERSUS_COLORS.enemy}">虎</font> x ${enemy}  `;
				str += `<font color="${IDENTITY_CONSTANTS.VERSUS_COLORS.friend}">龙</font> x ${friend}  `;

			} else {
				let identityInfo = IDENTITY_CONSTANTS.IDENTITY_INFO;
				for (let [key, info] of Object.entries(identityInfo)) {
					let count = game.countPlayer(current => info.aliases.includes(current.identity));
					if (count > 0) str += `<font color="${info.color}">${get.translation(key)}</font> x ${count}  `;
				};
			};

			// 设置胜利条件翻译
			if (currentMode) {
				const versusMode = get.config("versus_mode");
				const winTranslations = this.getModeWinTranslations(currentMode, versusMode);

				Object.keys(winTranslations).forEach(key => {
					lib.translate[`${key}_win_option`] = winTranslations[key];
				});
			}

			// 添加当前玩家的胜利条件
			if (game.me) {
				const identityKey = game.me.identity || "undefined";
				str += "<br>" + get.translation(`${identityKey}_win_option`);
			}

			// 更新显示
			identityShow.innerHTML = `<span style="font-family:shousha; font-size: 17.0px;font-weight:500;text-align: right; line-height: 20px; color: #C1AD92;text-shadow:none;">${str}</span>`;
			identityShowx.innerHTML = `<span style="font-family:shousha; font-size: 17.0px;font-weight:500;text-align: right; line-height: 20px; color: #2D241B; -webkit-text-stroke: 2.7px #322B20;text-shadow:none;">${str}</span>`;
		},

		// 初始化身份显示
		initIdentityShow() {
			const self = this;

			if (game.ui_identityShow === undefined) {
				game.ui_identityShow = ui.create.div(".identityShow", "身份加载中......", ui.window);
				game.ui_identityShow.style.top = "13px";
				game.ui_identityShow.style.left = "80px";
				game.ui_identityShow.style["z-index"] = 4;
			};

			if (game.ui_identityShowx === undefined) {
				game.ui_identityShowx = ui.create.div(".identityShow", "身份加载中......", ui.window);
				game.ui_identityShowx.style.top = "13px";
				game.ui_identityShowx.style.left = "80px";
				game.ui_identityShowx.style["z-index"] = 3;
			};

			// 设置更新函数
			game.ui_identityShow_update = () => self.updateIdentityShow();

			// 立即更新一次
			this.updateIdentityShow();

			// 设置定时更新（可选）
			setInterval(() => {
				if (game.ui_identityShow_update) {
					game.ui_identityShow_update();
				}
			}, 1000);
		},


		// 创建菜单按钮
		createMenuButton() {
			const self = this;
			const headImg = ui.create.node("img");
			headImg.src = `${lib.assetURL}${assetPath}shousha/button.png`;
			headImg.style.cssText = "display:block;--w:130px;--h:calc(var(--w)*1080/1434);width:var(--w);height:var(--h);position:absolute;bottom:calc(100% - 98px);left:calc(100% - 126.2px);background-color:transparent;z-index:1;";/*●*/
			document.body.appendChild(headImg);

			const head = ui.create.node("div");
			head.style.cssText = "display: block;width: 134px;height: 103px;position: absolute;top: 0px;right: -8px;background-color: transparent;z-index:1";
			head.onclick = () => self.showMenu();
			document.body.appendChild(head);
		},

		// 显示菜单
		showMenu() {
			const self = this;
			game.playAudio(`../${assetPath}shousha/label.mp3`);

			const container = ui.create.div(".popup-container", { background: "rgb(0,0,0,0)" }, ui.window);
			container.addEventListener("click", e => {
				game.playAudio(`../${assetPath}shousha/caidan.mp3`);
				e.stopPropagation();
				container.delete(200);
			});

			ui.create.div(".yemian", container);

			/*●*/
			const buttons = [
				{ cls: ".shezhi", 
					action: () => {
						ui.click.configMenu?.();
						ui.system1.classList.remove("shown");
						ui.system2.classList.remove("shown");
					},
				},
				{ cls: ".tuichu", action: () => window.location.reload() },
				{ cls: ".taopao", action: () => game.reload() },
				{ cls: ".touxiang",
					action: () => {
					    if (_status.connectMode) game.reload(); else game.over();
					}
				},
				{ cls: ".tuoguan", action: () => ui.click.auto() },
				/*{ cls: ".beijing",
					action: () => {
						self.openBackgroundSelector(`../${assetPath}shousha/caidan.mp3`);
					}
				}*/
			];

			buttons.forEach(({ cls, action }) => {
				const btn = ui.create.div(cls, container);
				btn.addEventListener("click", (e) => {
					e.stopPropagation();
					game.playAudio(`../${assetPath}shousha/xuanzhe.mp3`);
					container.delete(200);/*●*/
					action();
				});
			});
		},

		// ●创建身份提示
		createIdentityTip() {
			const self = this;
			const tip = ui.create.node("img");
			ui._sbshenfentip_lulu = tip;/*●鹿鹿修改 身份提示图标*/
			tip.src = `${lib.assetURL}${assetPath}uibutton/shenfen.png`;
			tip.style.cssText = "display:block;--w:400px;--h:calc(var(--w)*279/2139);width:var(--w);height:var(--h);position:absolute;top:-1px;left:-45px;background-color:transparent;z-index:1;";
			// 创建一个透明的覆盖层限制点击范围
			const clickArea = ui.create.node("div");
			clickArea.style.cssText = "position:absolute;top:10px;left:38px;width:40px;height:40px;background-color:rgba(0,0,0,0);z-index:2;cursor:pointer;";
			// 监听透明区域的点击事件
			clickArea.onclick = (e) => {
				// 判断点击是否在图片范围内
				if (e.clientX >= tip.offsetLeft && e.clientX <= tip.offsetLeft + tip.offsetWidth &&
					e.clientY >= tip.offsetTop && e.clientY <= tip.offsetTop + tip.offsetHeight) {
					//联机
					game.playAudio(`../${assetPath}shousha/label.mp3`);
					//if (_status.connectMode) lib.setPopped(clickArea, ui.click.chat, 220);
					//else {
					    game.closePopped();
					    ui.system1.classList.add("shown");
					    ui.system2.classList.add("shown");
					    game.closeMenu();
					    ui.click.shortcut();
					//}
					return;

					const container = ui.create.div(".popup-container", ui.window);
					const mode = lib.config.mode;
					if (mode === "identity") {
						const cls = self.identityTips[game.me?.identity];
						if (cls) ui.create.div(cls.replace("Tip", "sfrw"), container);
					} else if (mode === "doudizhu") {
						const cls = self.doudizhuTips[game.me?.identity];
						if (cls) ui.create.div(cls.replace("Tip", "sfrw"), container);
					} else if (mode === "versus") {
						ui.create.div(".sfrwhu", container);
					} else if (mode === "guozhan") {
						const cls = self.groupTips[game.me?.group] || ".sfrwundefined";
						ui.create.div(cls.replace("Tip", "sfrw"), container);
					}
					container.addEventListener("click", () => {
						game.playAudio(`../${assetPath}shousha/caidan.mp3`);
						container.delete(200);
					});
				}
			};
			document.body.appendChild(tip);
			document.body.appendChild(clickArea);
		},

		// ●初始化轮次更新
		initRoundUpdate() {
			const originUpdateRoundNumber = game.updateRoundNumber;
			game.updateRoundNumber = function () {
				originUpdateRoundNumber.apply(this, arguments);
				let cardNumber = ui.cardPile.childNodes.length || 0;
				let roundNumber = Math.max(1, game.roundNumber || 1);
				if (ui.cardRoundTime) {
					game.broadcastAll(function (cardNumber, roundNumber) {
						if (window.decadeUI && ui.cardRoundTime) ui.cardRoundTime.updateRoundCard(cardNumber, roundNumber);
					}, cardNumber, roundNumber);
				}
			};
		},
		create: {
			control() { },

			confirm() {
				// shousha 样式按钮图片已包含文字，不需要创建文字
				const confirm = ui.create.control("<span></span>", "cancel");
				confirm.classList.add("lbtn-confirm");
				confirm.node = {
					ok: confirm.firstChild,
					cancel: confirm.lastChild,
				};

				if (_status.event.endButton) _status.event.endButton.close();

				confirm.node.ok.link = "ok";
				confirm.node.ok.classList.add("primary");
				confirm.node.cancel.classList.add("primary2");
				confirm.node.cancel.innerHTML = `<img draggable='false' src=${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/QX.png>`
				confirm.custom = (link, target) => {
					if (link === "ok") ui.click.ok(target);
					else if (link === "cancel") ui.click.cancel(target);
				};

				app.reWriteFunction(confirm, {
					close: [
						function () {
							this.classList.add("closing");
						},
					],
				});

				Object.values(confirm.node).forEach(node => {
					node.classList.add("disabled");
					node.removeEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
					node.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
						e.stopPropagation();
						if (this.classList.contains("disabled")) {
							if (this.link === "cancel" && this.dataset.type === "endButton" && _status.event.endButton) {
								_status.event.endButton.custom();
								ui.confirm.close();
							}
							return;
						}
						if (this.parentNode.custom) {
							this.parentNode.custom(this.link, this);
						}
					});
				});

				//●（已停用）原来的负 margin + translateX 补丁会把按钮的 offsetLeft 变成负值，
				//  干扰确认栏居中算法，改由 uiUpdatec 统一处理
				// if (lib.device === "android" || lib.device === "ios") {
				//     const observer = new MutationObserver(() => {
				//         const controlContainer = document.getElementById('dui-controls');
				//         if (!controlContainer) return;
				//         const allControls = Array.from(controlContainer.querySelectorAll('.control'));
				//         const allButtons = allControls.filter(btn => btn.textContent.trim() === "全选" || btn.textContent.trim() === "AI代选");
				//         const aiChooseButtons = allControls.filter(btn => btn.textContent.trim() === "AI代选");
				//         allButtons.forEach(btn => {
				//             btn.style.setProperty("position", "relative", "important");
				//             btn.style.setProperty("margin", "-6px -150px 0px 6px", "important");
				//             btn.style.setProperty("transform", "translateX(-60%) scaleX(0.9)", "important");
				//             btn.style.setProperty("transform-origin", "left center", "important");
				//         });
				//         aiChooseButtons.forEach(btn => {
				//             btn.style.setProperty("left", "10%", "important");
				//             btn.style.setProperty("right", "auto", "important");
				//         });
				//     });
				//     observer.observe(document.body, { childList: true, subtree: true });
				// }

				// shousha 样式只显示重铸按钮，其他gskills由skill插件处理
				if (ui.skills2?.skills?.length) {
					// 只过滤出重铸按钮
					const recastingSkills = ui.skills2.skills.filter(skill => skill === "_recasting");
					if (recastingSkills.length) {
						confirm.skills2 = recastingSkills.map(skill => {
							const item = document.createElement("div");
							item.link = skill;
							// 重铸按钮使用特殊图片和class
							item.classList.add("recasting-btn");
							item.innerHTML = `<img draggable='false' src='${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/CZ.png'>`;
							item.style.backgroundImage = `url('${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/game_btn_bg2.png')`;
							item.style.transform = "scale(0.75)";
							item.style.setProperty("padding", "25px 10px", "important");
                            /*●*/
//                            if (lib.device === "android" || lib.device === "ios") {
//                                item.style.setProperty("margin", "0px -186px 0px -6px", "important");
//                            } else {
//                                item.style.setProperty("margin", "0px -6px 0px -6px", "important");
//                            }
                            
							item.dataset.type = "skill2";
							item.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
								if (_status.event?.skill === "_recasting") return;
								e.stopPropagation();
								ui.click.skill(this.link);
								ui.updateSkillControl?.(game.me, true);
							});
							return item;
						});
						confirm.skills2.forEach(item => confirm.insertBefore(item, confirm.firstChild));
					}
				}

				confirm.update = () => {
					// 限定技专属按钮
					const isLimitedSkill = () => {
						if (_status.event?.skill && get.info(_status.event.skill)?.limited && _status.event.player === game.me) return true;
						if (_status.event?.getParent?.(2)?.skill && get.info(_status.event.getParent(2).skill)?.limited && _status.event.getParent(2).player === game.me) return true;
						if (_status.event?.getParent?.()?.skill && get.info(_status.event.getParent().skill)?.limited && _status.event.getParent().player === game.me) return true;
						return false;
					};
					if (isLimitedSkill() && !confirm.node.ok.classList.contains("xiandingji")) {
						confirm.node.ok.classList.add("xiandingji");
					}
					if (!isLimitedSkill() && confirm.node.ok.classList.contains("xiandingji")) {
						confirm.node.ok.classList.remove("xiandingji");
					}

					// gskills 显示/隐藏
					if (confirm.skills2) {
						if (_status.event.skill && _status.event.skill !== confirm.dataset.skill) {
							confirm.dataset.skill = _status.event.skill;
							confirm.skills2.forEach(item => item.remove());
							ui.updatec();
						} else if (!_status.event.skill && confirm.dataset.skill) {
							delete confirm.dataset.skill;
							confirm.skills2.forEach(item => confirm.insertBefore(item, confirm.firstChild));
							ui.updatec();
						}
					}
					ui.updateSkillControl?.(game.me, true);
				};

				return confirm;
			},

			cardRoundTime() {
				const node = ui.create.div(".cardRoundNumber", ui.arena).hide();
				node.node = {
					cardPileNumber: ui.create.div(".cardPileNumber", node, showPaidui),
					roundNumber: ui.create.div(".roundNumber", node),
					time: ui.create.div(".time", node),
				};
				//●修改
				document.body.appendChild(node);
				node.updateRoundCard = function (cardNumber, roundNumber) {
					cardNumber = cardNumber || ui.cardPile.childNodes.length || 0;
					roundNumber = roundNumber || Math.max(1, game.roundNumber || 1);
					this.node.roundNumber.innerHTML = `<span>第${roundNumber}轮</span>`;
					this.setNumberAnimation(cardNumber);
					this.show();
					game.addVideo("updateCardRoundTime", null, {
						cardNumber: cardNumber,
						roundNumber: roundNumber,
					});
				};

				node.setNumberAnimation = function (num, step) {
					const item = this.node.cardPileNumber;
					clearTimeout(item.interval);
					if (!item._num) {
						item.innerHTML = `<span>${num}</span>`;
						item._num = num;
					} else if (item._num !== num) {
						if (!step) step = 500 / Math.abs(item._num - num);
						item._num += item._num > num ? -1 : 1;
						item.innerHTML = `<span>${item._num}</span>`;
						if (item._num !== num) {
							item.interval = setTimeout(() => this.setNumberAnimation(num, step), step);
						}
					}
				};

				// 计时器
				ui.time4 = node.node.time;
				ui.time4.starttime = get.utc();
				ui.time4.interval = setInterval(() => {
					const num = Math.round((get.utc() - ui.time4.starttime) / 1000);
					const pad = n => (n < 10 ? `0${n}` : n);
					if (num >= 3600) {
						const h = Math.floor(num / 3600);
						const m = Math.floor((num - h * 3600) / 60);
						const s = num - h * 3600 - m * 60;
						ui.time4.innerHTML = `<span>${pad(h)}:${pad(m)}:${pad(s)}</span>`;
					} else {
						const m = Math.floor(num / 60);
						const s = num - m * 60;
						ui.time4.innerHTML = `<span>${pad(m)}:${pad(s)}</span>`;
					}
				}, 1000);

				game.addVideo("createCardRoundTime");
				return node;
			},

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

				// 设置按钮
				ui.create.div(".settingButton", ui.arena);

				// 功能按钮容器
				const controls = ui.create.div(".lbtn-controls", ui.arena);
				ui.create.div(".lbtn-control", controls, "   ");
				ui.create.div(".lbtn-control", controls, "   ");

				// 自动牌序按钮
				const paixuauto = ui.create.div(isRight ? ".lbtn-paixu" : ".lbtn-paixu1", ui.arena);
				paixuauto.onclick = () => {
					if (window.paixuxx === undefined || window.paixuxx === false) {
						startAutoPaixu();
						paixuauto.setBackgroundImage(`${assetPath}shousha/zidongpaixu.png`);
						window.paixuxx = true;
					} else {
						stopAutoPaixu();
						paixuauto.setBackgroundImage(`${assetPath}shousha/btn-paixu.png`);
						window.paixuxx = false;
					}
				};

				// 记录按钮
				ui.create.div(isRight ? ".latn-jilu" : ".latn-jilu1", ui.arena, ui.click.pause);

				// 托管按钮
				ui.create.div(".tuoguanButton", ui.arena, ui.click.auto);

				// 手牌数量
				const className = isRight ? ".handcardNumber" : ".handcardNumber1";
				const node = ui.create.div(className, document.body).hide();
				node.node = {
					cardPicture: ui.create.div(isRight ? ".cardPicture" : ".cardPicture1", node),
					cardNumber: ui.create.div(isRight ? ".cardNumber" : ".cardNumber1", node),
				};

				/*●*/
				node.updateCardnumber = function () {
					if (!game.me) return;
					const current = game.me.countCards("h") || 0;
					let limit = game.me.getHandcardLimit() || 0;
					let color = "white";
					if (current > limit) color = "white";
					if (limit == Infinity) limit = "∞";
					if (limit > game.me.hp) color = "#20c520";
					if (limit < game.me.hp) color = "#ff1813";
					if (limit == game.me.hp) color = "#ffe9cd";
					this.node.cardNumber.innerHTML = `<font size="5.5">${current}</font><font size="5" face="xinwei">/<font color="${color}" size="4" face="shousha">${limit}</font>`;
					this.show();
					game.addVideo("updateCardnumber", null, { cardNumber: limit });
				};

				node.node.cardNumber.interval = setInterval(() => ui.handcardNumber?.updateCardnumber(), 1000);
				game.addVideo("createhandcardNumber");
				return node;
			},
		},
	};
}
