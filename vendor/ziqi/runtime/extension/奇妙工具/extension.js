import { lib, game, ui, get, ai, _status, Library, Game, UI, status, Get } from "../../noname.js";
game.import("extension", function () {
	return {
		name: "奇妙工具",
		editable: false,
		connect: false,
		content: function (config, pack) { },
		precontent: function () {
			lib.hooks.checkBegin.add("select_all_handCards", () => {
				const event = get.event();
				if(_status.connectMode || !game.getExtensionConfig("奇妙工具", "select_all_handCards")) return;
				if (!(event.skill || event.name == "chooseCard")) {
					ui.select_all_handCards?.remove();
					delete ui.select_all_handCards;
				}
				if (event.selectCard && event.selectCard[1] != Infinity) return;
				if ((event.skill || event.name == "chooseCard") && !ui.select_all_handCards) {
					ui.select_all_handCards = ui.create.control("全选手牌", function () {
						var player = game.me;
						var cards = player.getCards("h");
						cards.forEach(function (card) {
							if (!card.classList.contains("selected")) {
								ui.click.card.call(card);
							}
						});
						if (_status.event.custom && _status.event.custom.add.card) {
							_status.event.custom.add.card();
						}
						for (var i = 0; i < ui.selected.cards.length; i++) {
							ui.selected.cards[i].updateTransform(true);
						}
					});
				}
			});
			lib.hooks.uncheckBegin.add("select_all_handCards", () => {
				const event = get.event();
				if (event.result?.bool) {
					ui.select_all_handCards?.remove();
					delete ui.select_all_handCards;
				}
			});
			game.getSkillOwner = function (skill) {
				let character = {};
				let list = [];
				for (const i of Object.keys(lib.characterPack)) {
					Object.assign(character, lib.characterPack[i]);
				}
				for (const key of Object.keys(character)) {
					if (character[key].skills.includes(skill)) {
						list.push(key);
					}
				}
				return list;
			};
			Object.assign(lib.skill, {
				_qmgj_addSkills: {
					enable: "phaseUse",
					filter: function () {
						return !_status.connectMode && game.getExtensionConfig("奇妙工具", "addSkills");
					},
					initList: function () {
						var list,
							skills = [];
						var banned = [];
						for (const key of Object.keys(lib.skill)) {
							if (!lib.translate[`${key}_info`]) {
								continue;
							}
							skills.add(key);
						}
						_status.qmgj_addSkills_list = skills;
					},
					content: async function (event, trigger, player) {
						var next = game.createEvent("inputText", false);
						next.player = player;
						next.setContent(function () {
							var dialog = ui.create.dialog(false);
							let Searcher = ui.create.div(".searcher.caption");
							let input = document.createElement("input");
							input.style.textAlign = "center";
							input.style.border = "solid 2px #294510";
							input.style.borderRadius = "6px";
							input.style.fontWeight = "bold";
							input.style.fontSize = "21px";
							input.placeholder = "支持正则搜索";
							Searcher.appendChild(input);
							dialog.add(Searcher);
							var clickOK = function () {
								dialog.remove();
								if (!event.result) {
									event.result = {};
								}
								if (input.value != "") {
									event.result.value = input.value;
								} else {
									event.result.value = "Warning";
								}
								game.resume();
							};
							if (!event.isMine()) {
								var map = ["void"];
								input.value = map.randomGet();
								clickOK();
							} else {
								dialog.open();
								game.pause();
								var button = ui.create.control("确定", function () {
									button.remove();
									clickOK();
								});
							}
							input.addEventListener("keydown", (e) => {
								if (e.key == "Enter") {
									button.remove();
									clickOK();
								}
								e.stopPropagation();
							});
						});
						var OriginalClick = ui.auto.click;
						var OriginalPause = ui.click.pause;
						ui.auto.click = new Function();
						ui.click.pause = new Function();
						var result = await next.forResult();
						ui.auto.click = OriginalClick;
						ui.click.pause = OriginalPause;
						if (!_status.qmgj_addSkills_list) {
							lib.skill._qmgj_addSkills.initList();
						}
						let character = {};
						let filterCharacter = {};
						for (const i of Object.keys(lib.characterPack)) {
							Object.assign(character, lib.characterPack[i]);
						}
						for (const current of Object.keys(character)) {
							if (
								new RegExp(result.value, "g").test(
									get.translation(current)
								)
							) {
								filterCharacter[current] = character[current];
							}
						}
						var mapSkill = [];
						for (const iterator of Object.keys(filterCharacter)) {
							mapSkill.addArray(filterCharacter[iterator].skills);
						}
						let target = player;
						if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "SelectGiveCharacter")) {
							var next = target.chooseTarget("选择技能的给予目标", true);
							var resultx = await next.forResult();
							target = resultx.targets[0];
						}
						var skills = _status.qmgj_addSkills_list.filter((key) => {
							try {
								var reg = new RegExp(result.value, "g");
								var bool =
									reg.test(key) ||
									reg.test(lib.translate[key]) ||
									reg.test(lib.translate[`${key}_info`]) ||
									mapSkill.includes(key);
								return bool;
							} catch (error) {
								return false;
							}
						});
						var list = skills.filter(function (i) {
							return !target.hasSkill(i, null, null, false);
						});
						if (!list.length) {
							player.chat("看来没有那种技能呢……");
							return;
						}
						var dialog = ui.create.dialog("forcebutton");
						for (const skill of list) {
							var text = game
								.getSkillOwner(skill)
								.map((c) => get.translation(c));
							if (!text.length) {
								text = ["无"];
							}
							dialog.addText(`技能拥有者:${text}`);
							dialog.add([
								[
									[
										skill,
										'<div class="popup pointerdiv" style="width:80%;display:inline-block"><div class="skill">【' +
										get.translation(skill) +
										"】</div><div>" +
										lib.translate[skill + "_info"] +
										"</div></div>",
									],
								],
								"textbutton",
							]);
							dialog.addText("<br>");
						}
						var next = player.chooseButton(dialog, [1, Infinity]);
						next.set("ai", function (button) {
							return Math.random();
						});
						var result2 = await next.forResult();
						if (result2.bool) {
							await target.addSkills(result2.links);
						}
					},
				},
				_qmgj_autoswap: {
					firstDo: true,
					trigger: {
						player: [
							"playercontrol",
							"chooseToUseBegin",
							"chooseToRespondBegin",
							"chooseToDiscardBegin",
							"chooseToCompareBegin",
							"chooseToCompareMultipleBegin",
							"chooseToCompareMeanwhileBegin",
							"chooseButtonBegin",
							"chooseCardBegin",
							"chooseTargetBegin",
							"chooseCardTargetBegin",
							"chooseButtonTargetBegin",
							"chooseControlBegin",
							"chooseBoolBegin",
							"choosePlayerCardBegin",
							"discardPlayerCardBegin",
							"gainPlayerCardBegin",
							"chooseToMoveBegin",
							"chooseToPlayBeatmapBegin",
							"chooseToGiveBegin",
							"chooseToGuanxingBegin",
							"chooseNumbersBegin",
							"chooseToDebateBegin",
							"chooseToDuibenBegin",
							"chooseToPSSBegin",
							"chooseSkillBegin",
							"discoverCardBegin",
							"chooseAnyOLBegin",
							"chooseToEnableBegin",
							"chooseToDisableBegin",
							"chooseDrawRecoverBegin",
							"viewCardsBegin",
							"moveCardBegin",
						],
					},
					forced: true,
					priority: 100,
					forceDie: true,
					popup: false,
					filter: function (event, player) {
						if (_status.connectMode || !game.getExtensionConfig("奇妙工具", "autoSwap"))
							return false;
						if (event.autochoose && event.autochoose()) return false;
						if (lib.filter.wuxieSwap(event)) return false;
						if (_status.auto || player.isUnderControl(true))
							return false;
						if (player.isDead() || player.isOut() || player.removed || player === game.me)
							return false;
						if (player._trueMe) return false;
						if (game.me && game.me._trueMe) return false;

						var current = _status.event;
						if (current && current.player && current.player !== player &&
							!current.finished && !current._neutralized &&
							["chooseToUse", "chooseToRespond", "chooseToDiscard", "chooseCard",
								"chooseTarget", "chooseButton", "chooseControl", "chooseBool",
								"choosePlayerCard", "discardPlayerCard", "gainPlayerCard",
								"chooseToMove", "chooseToGuanxing", "chooseNumbers",
								"chooseToDebate", "chooseToDuiben", "chooseToPSS",
								"chooseSkill", "discoverCard", "chooseAnyOL",
								"chooseToEnable", "chooseToDisable", "chooseDrawRecover",
								"viewCards", "moveCard", "chooseCardTarget", "chooseButtonTarget",
								"chooseToCompare", "chooseToCompareMultiple", "chooseToCompareMeanwhile",
								"chooseToPlayBeatmap", "chooseToGive"].includes(current.name)) {
							var setting = game.getExtensionConfig("奇妙工具", "autoSwapSetting");
							var shouldControlCurrent = false;
							if (setting == "all") {
								shouldControlCurrent = true;
							} else if (setting == "onlyRealFriend") {
								shouldControlCurrent = current.player.isFriendsOf(game.me);
							} else if (setting == "onlyFriend") {
								shouldControlCurrent = get.attitude(game.me, current.player) > 0;
							}
							if (shouldControlCurrent) return false;
						}
						var setting = game.getExtensionConfig("奇妙工具", "autoSwapSetting");
						if (setting == "all") {
							return true;
						}
						if (setting == "onlyRealFriend" && player.isFriendsOf(game.me)) {
							return true;
						}
						if (setting == "onlyFriend" && get.attitude(game.me, player) > 0) {
							return true;
						}
						return false;
					},
					content: async function (event, trigger, player) {
						if (player._trueMe) return;
						if (game.me !== player) {
							try {
								game.swapPlayerAuto(player);
								if (typeof ui.updatehl === "function") ui.updatehl();
								player.update();
							} catch (e) {
								console.error("[奇妙工具] 自动切换视角失败:", e);
							}
						}
					},
				},
				_qmgj_luckyCards: {
					trigger: {
						global: "gameDrawAfter",
					},
					filter: function (event, player) {
						if (_status.connectMode || !game.getExtensionConfig("奇妙工具", "luckyCards"))
							return false;
						return player == game.me;
					},
					direct: true,
					content: async function (event, trigger, player) {
						while (true) {
							var targetResult = await player.chooseTarget("定向手气卡：选择一名角色调整其手牌").forResult();
							if (!targetResult.bool) return;
							var target = targetResult.targets[0];
							while (true) {
								var handCards = target.getCards("h");
								if (handCards.length === 0) {
									player.chat("该角色没有手牌");
									break;
								}
								var handDialog = ui.create.dialog(
									"定向手气卡：" + get.translation(target) + "的手牌",
									[handCards, "vcard"]
								);
								var caption = ui.create.div(".caption", "<div style='text-align:center'>选择一张或多张手牌进行替换</div>");
								handDialog.content.insertBefore(caption, handDialog.content.firstChild);
								var handResult = await player.chooseButton(handDialog, [1, Infinity]).forResult();
								if (!handResult.bool) break;
								var selectedOldCards = handResult.links;
								var remainingCards = selectedOldCards.slice();
								while (remainingCards.length > 0) {
									var cardNames = remainingCards.map(c => get.translation(c.name)).join("、");
									var dialog = ui.create.dialog("定向手气卡：为" + cardNames + "选择替换的牌");
									var searchDiv = ui.create.div(".caption");
									searchDiv.style.display = "block";
									searchDiv.style.textAlign = "center";
									searchDiv.style.marginBottom = "10px";
									var select = ui.create.node('select', searchDiv);
									var options = [
										{ text: '牌名', value: 'name', defaultSelected: true },
										{ text: '类型', value: 'type', defaultSelected: false },
										{ text: 'ID', value: 'id', defaultSelected: false }
									];
									options.forEach(opt => {
										var option = new Option(opt.text, opt.value, opt.defaultSelected);
										option.selected = opt.defaultSelected;
										select.appendChild(option);
									});
									var input = ui.create.node('input', searchDiv);
									input.style.width = "200px";
									input.style.textAlign = "center";
									input.style.border = "solid 2px #294510";
									input.style.borderRadius = "6px";
									input.style.fontWeight = "bold";
									input.style.fontSize = "21px";
									input.style.marginRight = "5px";
									input.style.padding = "4px";
									select.onchange = function () {
										var placeholders = {
											'name': '按牌名搜索',
											'type': '按类型搜索',
											'id': '按ID搜索'
										};
										input.placeholder = placeholders[this.value];
										input.value = '';
										dialog.querySelectorAll(".button").forEach(btn => btn.classList.remove("nodisplay"));
									};
									input.placeholder = '按牌名搜索';
									dialog.content.insertBefore(searchDiv, dialog.content.firstChild);
									var cardPile = Array.from(ui.cardPile.childNodes);
									var nameNatureSet = new Map();
									var nameNatureCards = new Map();
									for (var card of cardPile) {
										if (!card.name) continue;
										var nature = card.nature || null;
										if (!nameNatureSet.has(card.name)) {
											nameNatureSet.set(card.name, new Set());
										}
										nameNatureSet.get(card.name).add(nature);
										var key = card.name + "|" + nature;
										if (!nameNatureCards.has(key)) {
											nameNatureCards.set(key, []);
										}
										nameNatureCards.get(key).push(card);
									}
									var list = [];
									for (var [name, natures] of nameNatureSet) {
										var natureArray = Array.from(natures);
										var isUnique = natureArray.length === 1;
										var type = get.type(name);
										for (var nature of natureArray) {
											var key = name + "|" + nature;
											var cards = nameNatureCards.get(key) || [];
											if (!isUnique && cards.length === 0) {
												continue;
											}
											list.push([type, "", name, nature]);
										}
									}
									var getSortOrder = function (item) {
										var type = item[0];
										var name = item[2];
										var info = lib.card[name];
										if (type === 'basic') return 0;
										if (type === 'trick') {
											if (info && info.subtype === 'delay') return 2;
											return 1;
										}
										if (type === 'delay') return 2;
										if (type === 'equip') {
											var subtype = info && info.subtype;
											if (subtype === 'equip1') return 3;
											if (subtype === 'equip2') return 4;
											if (subtype === 'equip3') return 5;
											if (subtype === 'equip4') return 6;
											if (subtype === 'equip5') return 7;
											return 8;
										}
										return 9;
									};
									list.sort((a, b) => {
										var orderA = getSortOrder(a);
										var orderB = getSortOrder(b);
										if (orderA !== orderB) {
											return orderA - orderB;
										}
										var nameA = get.translation(a[2]);
										var nameB = get.translation(b[2]);
										return nameA.localeCompare(nameB);
									});
									dialog.add([list, "vcard"]);
									var next = player.chooseButton(dialog);
									next.set("filterButton", function (button) {
										var name = button.link[2];
										var nature = button.link[3] || null;
										var currentNatureSet = new Set();
										for (var c of cardPile) {
											if (c.name === name) {
												currentNatureSet.add(c.nature || null);
											}
										}
										var isUnique = currentNatureSet.size === 1;
										var key = name + "|" + nature;
										if (isUnique) {
											for (var [k, cards] of nameNatureCards) {
												if (k.startsWith(name + "|") && cards.length > 0) {
													return true;
												}
											}
											return false;
										} else {
											var cards = nameNatureCards.get(key);
											return cards && cards.length > 0;
										}
									});
									var toggleButtons = function () {
										var mode = select.value;
										var value = this.value.toLowerCase();
										var buttons = dialog.querySelectorAll(".button");
										buttons.forEach(btn => {
											var link = btn.link;
											var searchable = '';
											if (mode === 'name') {
												searchable = get.translation(link[2]).toLowerCase();
											} else if (mode === 'type') {
												searchable = get.translation(link[0]).toLowerCase();
											} else if (mode === 'id') {
												searchable = link[2].toLowerCase();
											}
											if (value === '') {
												btn.classList.remove('nodisplay');
											} else {
												btn.classList.toggle('nodisplay', !searchable.includes(value));
											}
										});
									};
									input.onkeydown = function (e) {
										e && e.stopPropagation();
										if (e.keyCode === 13) {
											this.blur();
											this.oninput(e);
										}
									};
									input.oninput = function(e) {
										toggleButtons.call(this);
										e && e.stopPropagation();
									};
									var result = await next.forResult();
									if (!result.bool) {
										remainingCards.shift();
										continue;
									}
									var choice = result.links[0];
									var name = choice[2];
									var nature = choice[3] || null;
									var availableCards = [];
									var currentNatureSet = new Set();
									for (var c of cardPile) {
										if (c.name === name) {
											currentNatureSet.add(c.nature || null);
										}
									}
									var isUnique = currentNatureSet.size === 1;
									if (isUnique) {
										for (var c of cardPile) {
											if (c.name === name) {
												availableCards.push(c);
											}
										}
									} else {
										for (var c of cardPile) {
											if (c.name === name && (c.nature || null) === nature) {
												availableCards.push(c);
											}
										}
									}
									var suitOrder = { spade: 0, club: 1, heart: 2, diamond: 3 };
									availableCards.sort(function(a, b) {
										var aSuit = suitOrder[a.suit] !== undefined ? suitOrder[a.suit] : 99;
										var bSuit = suitOrder[b.suit] !== undefined ? suitOrder[b.suit] : 99;
										if (aSuit !== bSuit) return aSuit - bSuit;
										return a.number - b.number;
									});
									if (availableCards.length === 0) {
										remainingCards.shift();
										continue;
									}
									var cardResult = await player.chooseCardButton(
										"选择具体卡牌（还可选" + remainingCards.length + "张）", 
										availableCards, 
										[1, remainingCards.length]
									).forResult();
									if (!cardResult.bool) {
										remainingCards.shift();
										continue;
									}
									var selectedNewCards = cardResult.links;
									for (var i = 0; i < selectedNewCards.length; i++) {
										if (remainingCards.length > 0) {
											remainingCards.shift().discard(false);
										}
									}
									await game.cardsGotoOrdering(selectedNewCards);
									await target.gain(selectedNewCards, "draw");
									if (remainingCards.length === 0) break;
								}
							}
						}
					},
				},
				_qmgj_createCard: {
					enable: ["phaseUse"],
					log: false,
					lose: false,
					discard: false,
					filter: function (event, player) {
						if (_status.connectMode || !game.getExtensionConfig("奇妙工具", "createCard"))
							return false;
						return true;
					},
					async content(event, trigger, player) {
						let suit = lib.suit.slice();
						let cardname = [];
						let cards = [];
						let number = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
						for (const key in lib.cardPack) {
							if (Object.prototype.hasOwnProperty.call(lib.cardPack, key)) {
								const list = lib.cardPack[key];
								cardname.addArray(list);
							}
						}
						for (const name of cardname) {
							if (name != "sha") {
								cards.push(["", "", name]);
							} else {
								cards.push(["", "", name]);
								for (const nature of lib.linked) {
									cards.push(["", "", name, nature]);
								}
							}
						}
						let dialog = ui.create.dialog();
						let Searcher = ui.create.div(".searcher.caption");
						let input = document.createElement("input");
						input.style.textAlign = "center";
						input.style.border = "solid 2px #294510";
						input.style.borderRadius = "6px";
						input.style.fontWeight = "bold";
						input.style.fontSize = "21px";
						input.placeholder = "支持正则搜索";
						Searcher.appendChild(input);
						dialog.add(Searcher);
						var clickOK = function () {
							dialog.querySelectorAll("div.card.button").forEach(card => {
								let reg = new RegExp(input.value, "g");
								if (reg.test(get.translation(card.name))) {
									card.classList.remove("nodisplay");
								} else {
									card.classList.add("nodisplay");
								};
							});
						};
						input.addEventListener("keydown", (e) => {
							if (e.key == "Enter") {
								clickOK();
							}
							e.stopPropagation();
						});
						let alphabetButtons = ui.create.div();
						for (let i = 0; i < 26; i++) {
							let alphabet = String.fromCharCode(65 + i);
							let alphabetButton = ui.create.button(alphabet, "tdnodes", null, true);
							alphabetButton.classList.add("filterButton");
							alphabetButton.listen(function () {
								dialog.querySelectorAll("div.filterButton").forEach(button => {
									button.classList.remove("glow");
								});
								this.classList.add("glow");
								dialog.querySelectorAll("div.card.button").forEach(card => {
									let firstCharacter = card.name[0];
									if (alphabet == firstCharacter.toUpperCase()) {
										card.classList.remove("nodisplay");
									} else {
										card.classList.add("nodisplay");
									};
								});
							});
							alphabetButtons.appendChild(alphabetButton);
						};
						dialog.add(alphabetButtons);
						let typeButtons = ui.create.div();
						cardname.map(c => get.type(c)).unique().forEach(type => {
							let typeButton = ui.create.button([type, get.translation(type)], "tdnodes", null, true);
							typeButton.classList.add("filterButton");
							typeButton.listen(function () {
								dialog.querySelectorAll("div.filterButton").forEach(button => {
									button.classList.remove("glow");
								});
								this.classList.add("glow");
								dialog.querySelectorAll("div.card.button").forEach(card => {
									let cardType = get.type(card);
									if (cardType == type) {
										card.classList.remove("nodisplay");
									} else {
										card.classList.add("nodisplay");
									};
								});
							});
							typeButtons.appendChild(typeButton);
						});
						dialog.add(typeButtons);
						let Counter = ui.create.div();
						let number_input = document.createElement("input");
						number_input.classList.add("card_creator_number_input");
						number_input.type = "number";
						number_input.min = 1;
						number_input.value = 1;
						number_input.style.textAlign = "center";
						number_input.style.border = "solid 2px #294510";
						number_input.placeholder = "请输入阿拉伯数字";
						dialog.addText("创造牌数");
						Counter.appendChild(number_input);
						dialog.add(Counter);
						dialog.add([
							suit.map(c => [c, get.translation(c)]),
							"tdnodes",
						]);
						dialog.add([
							number,
							"tdnodes"
						]);
						dialog.add([
							cards,
							"vcard"
						]);
						var next = player.chooseButton(dialog, 3);
						next.set("filterButton", function (button) {
							if (button.classList.contains("card") && ui.selected.buttons.some(c => c.classList.contains("card"))) {
								return false;
							}
							if (typeof button.link == "number" && ui.selected.buttons.some(c => typeof c.link == "number")) {
								return false;
							}
							if (suit.includes(button.link) && ui.selected.buttons.some(c => suit.includes(c.link))) {
								return false;
							}
							return true;
						});
						let result = await next.forResult();
						var target = player;
						let value = document.querySelector(".card_creator_number_input").value;
						if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "SelectGiveCharacter")) {
							var next = target.chooseTarget("选择此牌的给予目标", true);
							var resultx = await next.forResult();
							target = resultx.targets[0];
						}
						if (result.bool) {
							let suitx = result.links.find(c => suit.includes(c));
							let numberx = result.links.find(c => typeof c == "number");
							let cardx = result.links.find(c => Array.isArray(c));
							player.logSkill("_qmgj_createCard");
							let createCard = [];
							if (!value) {
								value = 1;
							}
							for(let i = 0;i<value;i++){
								createCard.push(game.createCard(cardx[2], suitx, numberx, cardx[3]));
							}
							await target.gain(createCard);
						}
					},
				},
				_qmgj_viewHandCards: {
					charlotte: true,
					ai: {
						viewHandcard: true,
						skillTagFilter: function (player, tag, arg) {
							if (_status.connectMode || !game.getExtensionConfig("奇妙工具", "viewHandCards")) {
								return false;
							}
							if (_status.connectMode || (game.getExtensionConfig("奇妙工具", "viewHandCardsSetting") == "onlyRealFriend" && !player.isFriendsOf(arg))) {
								return false;
							}
							if (!_status.connectMode && (game.getExtensionConfig("奇妙工具", "viewHandCardsSetting") == "onlyFriend" && get.attitude(arg, player) <= 0)) {
								return true;
							}
							if (player == arg) return false;
						},
					},
				},
			});
			Object.assign(lib.translate, {
				_qmgj_addSkills: "添加技能",
				_qmgj_createCard: "创造卡牌",
				none_sex: "无性",
			})
			lib.announce.subscribe("Noname.Game.Event.GameStart", function () {
				if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "addSkills")) {
					var control = ui.create.system(
						"添加技能",
						function () {
							if (game.me.isPhaseUsing()) {
								return;
							}
							var next = game.createEvent("addSkills");
							next.player = game.me;
							next.setContent(lib.skill._qmgj_addSkills.content);
						},
						true,
						true
					);
				}
				if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "createCard")) {
					var control = ui.create.system(
						"创造卡牌",
						function () {
							if (game.me.isPhaseUsing()) {
								return;
							}
							var next = game.createEvent("createCard");
							next.player = game.me;
							next.setContent(lib.skill._qmgj_createCard.content);
						},
						true,
						true
					);
				}

				if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "replaceCharacter")) {
					var next = game.createEvent("qmgj_replaceCharacter", false);/*●*/
					next.player = game.me;
					next.setContent(async function (event, trigger, player) {
						let confirm = await player.chooseBool('是否发动【AI换将】技能？', '选择一名角色替换其武将牌').set('ai', function () { return 0 }).forResult(); if (!confirm.bool) return; /*●*/
						while (true) {
							var result = await player
								.chooseTarget("AI换将：选择一名角色替换其武将牌，可变更单/双将")/*●*/
								.set("ai", function () {
									return false;
								})
								.forResult();
							if (!result?.bool) break;/*●*/
							var dialog = ui.create.characterDialog("heightset");
							dialog.style.top = "10vh"; dialog.style.minHeight = "532px";/*●*/
							var createSearchInput = function (dialog) {
								var div = ui.create.div(dialog.content, 1, {
									display: 'block',
									textAlign: 'center',
									marginBottom: '10px'
								});
								var input = ui.create.node('input', div);
								var select = ui.create.node('select', div);
								var options = [{
									text: '武将id',
									value: 'id',
									defaultSelected: false,
								}, {
									text: '武将名称',
									value: 'name',
									defaultSelected: true,
								}];
								options.forEach(value => {
									var option = new Option(value.text, value.value, value.defaultSelected);
									option.selected = value.defaultSelected;
									select.appendChild(option);
								});
								select.onchange = function () {
									input.placeholder = this.value === 'id' ? '按武将ID搜索' : '按武将名称搜索';
								};
								input.placeholder = '按武将名称搜索';
								input.style.textAlign = 'center';
								input.style.border = 'solid 2px #294510';
								input.style.borderRadius = '6px';
								input.style.fontWeight = 'bold';
								input.style.fontSize = '13px'; input.style.height = "13px"; input.style.lineHeight = "13px";/*●*/
								input.style.marginRight = '5px';
								input.style.padding = '4px';
								var toggleButtons = function () {
									var mode = select.value;
									var inputValue = this.value;
									var buttons = Array.from(dialog.querySelectorAll('.button'));
									buttons.forEach(value => {
										var link = value.link;
										var buttonName = link;
										if (mode === 'name') buttonName = get.translation(link);
										if (this.value === '') return value.classList.remove('nodisplay');
										value.classList.toggle('nodisplay', buttonName.indexOf(inputValue) === -1);
									});
									return true;
									};
								input.onkeydown = function (event) {
									event && event.stopPropagation();
									if (event.keyCode === 13) this.oninput(event);
								};
								input.oninput = event => toggleButtons.call(input) && event.stopPropagation();
								dialog.searchInput = input;
								dialog.select = select;
							};
							if (lib.config.extension_十周年UI_enable && lib.config.extension_十周年UI_mx_decade_characterDialog == "offDialog") createSearchInput(dialog);/*●*/
							var select = [1, 2];
							var result2 = await player
								.chooseButton(dialog, select)
								.forResult();
							if (result2.bool) {
								var target = result.targets[0];
								var newPairs = [result2.links[0], result2.links[1]];
								/*●*/
								if (target.name && lib.character[target.name]){
									var skillt = lib.character[target.name][3] || [];
									if (target.name2) skillt = skillt.concat(lib.character[target.name2][3]);
									if (skillt && skillt.length) target.removeSkill(skillt);
									var skills = target.skills.filter(function (i) {
										return !skillt.includes(i);
									});
								}

								lib.element.player.uninit.apply(target);
								lib.element.player.init.apply(target, newPairs);
								game.broadcast(function (player, newPairs) {
									lib.element.player.uninit.apply(player);
									lib.element.player.init.apply(player, newPairs);
								}, target, newPairs);
							/*●*/
							game.addRecentCharacter(newPairs[0]);
							if (newPairs.length > 1) game.addRecentCharacter(newPairs[1]);
							var maxhp = false;
							if (_status.mode == 'zhong' && target.identity && target.identity == 'mingzhong') maxhp = true;
							if ((['normal', 'purple'].includes(_status.mode) && game.players.length > 4) || get.mode() == 'doudizhu') {
							    if ((game.zhu && target == game.zhu) || (game.rZhu && target == game.rZhu) || (game.bZhu && target == game.bZhu)) maxhp = true;
							}
							if (maxhp) {
                                target.hp++;
                                target.maxHp++;
                                target.update();
							}
							if (skills && skills.length) target.addSkill(skills);
							const groups = get.selectGroup(newPairs[0]);
							if (groups?.length) {
				                const groupResult = await game.me.chooseButton(["请选择武将的势力", [groups.map((group) => ["", "", `group_${group}`]), "vcard"]], true).set("direct", true).forResult();
				                if (groupResult.links?.length) target.group = groupResult.links[0][2].slice(6);
				            }
							if (get.mode() == 'guozhan'){
								target.trueIdentity = target.group;
                                target.sex = 'unknown';
                                target.group = 'unknown';
                                target._group = 'unknown';
                                target.identity = 'unknown';
                                //target.node.name.show(); target.node.name2.show();
								if (target.classList) { target.classList.add('unseen'); target.classList.add('unseen2'); }
                                if (target != game.me) {
                                    target.node.identity.firstChild.innerHTML = '猜';
                                    target.node.identity.dataset.color = 'unknown';
                                    target.node.identity.classList.add('guessing');
                                }
                                target.hiddenSkills = lib.character[target.name1][3].slice(0);
                                var hiddenSkills2 = lib.character[target.name2][3];
                                for (var j = 0; j < hiddenSkills2.length; j++) {
                                    target.hiddenSkills.add(hiddenSkills2[j]);
                                }
                                for (var j = 0; j < target.hiddenSkills.length; j++) {
                                    if (!lib.skill[target.hiddenSkills[j]]) target.hiddenSkills.splice(j--, 1);
                                }
                                for (var j = 0; j < target.hiddenSkills.length; j++) {
                                    target.addSkillTrigger(target.hiddenSkills[j], true);
                                }
							}
							}
						}
					});
				}

			if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "swapSeat")) {
				var next = game.createEvent("swapSeat", false);
				next.player = game.me;
				next.setContent(async function (event, trigger, player) {
					while (true) {
						var result = await player
							.chooseTarget("AI换座：选择两名角色交换其座次<br>（注：无法变更一号位的真实座次以及优先行动权哦喵）", [2, 2])
							.set("ai", function () {
								return false;
							})
							.forResult();
						if (!result.bool) break;
						var target1 = result.targets[0];
						var target2 = result.targets[1];
						var toSwapList = [[target1, target2]];
						game.broadcastAll(function (list) {
							for (var i = 0; i < list.length; i++) {
								var p1 = game.findPlayer(function (current) {
									return current.playerid == list[i][0].playerid;
								});
								var p2 = game.findPlayer(function (current) {
									return current.playerid == list[i][1].playerid;
								});
								if (p1 && p2) {
									game.swapSeat(p1, p2, false);
								}
							}
						}, toSwapList);
						await game.delay();
					}
				});
			}
				if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "setIdentity")) {
					var next = game.createEvent("setIdentity", false);
					next.player = game.me;
					next.setContent(async function (event, trigger, player) {
						while (true) {
							var list = [];
							switch (get.mode()) {
								case "identity":
									var identityList = lib.config.mode_config.identity.identity;
									if (Array.isArray(identityList) && identityList.length > 0) {
										var lastRound = identityList[identityList.length - 1];
										if (Array.isArray(lastRound)) {
											list = lastRound.slice();
										}
									}
									break;
								default:
									break;
							}
							list.unique();
							if (!list.length) {
								break;
							}
							var result = await player
								.chooseTarget("设置身份：选择一名角色设置其身份")
								.set("ai", function(){
									return false;
								})
								.forResult();
							if (result.bool) {
								var target = result.targets[0];
								var result2 = await player
									.chooseControl(list.concat("cancel2"))
									.set("prompt", "设置身份：为 " + get.translation(target) + " 选择身份")
									.forResult();
								if (result2.control != "cancel2") {
									game.broadcastAll(
										function (identity, target, shown) {
											target.identity = identity;
											if (shown || target == game.me) {
												target.setIdentity();
											}
										},
										result2.control,
										target,
										target.identityShown
									);
								}
							} else {
								break;
							}
						}
					});
				}
				if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "changeGroup")) {
					var next = game.createEvent("changeGroup", false);
					next.player = game.me;
					next.setContent(async function (event, trigger, player) {
						while (true) {
							var result = await player
								.chooseTarget("设置势力：选择一名角色设置其势力")
								.set("ai", function () {
									return false;
								})
								.forResult();
							if (result.bool) {
								var result2 = await player.chooseControl(lib.group, "cancel2")
									.forResult();
								if (result2.control != "cancel2") {
									result.targets[0].changeGroup(result2.control);
								}
							} else {
								break;
							}
						}
					});
				}
				if (!_status.connectMode && game.getExtensionConfig("奇妙工具", "changeSex")) {
					var next = game.createEvent("changeSex", false);
					next.player = game.me;
					next.setContent(async function (event, trigger, player) {
						while (true) {
							var result = await player
								.chooseTarget("设置性别：选择一名角色设置其性别")
								.set("ai", function () {
									return false;
								})
								.forResult();
							if (result.bool) {
								var result2 = await player.chooseControl(["male", "female", "none_sex", "double"], "cancel2")
									.forResult();
								if (result2.control != "cancel2") {
									const target = result.targets[0];
									let sex = result2.control;
									if (result2.control == "none_sex") {
										sex = "none";
									}
									game.broadcastAll(function (target, sex) {
										target.sex = sex;
										target.update();
									}, target, sex);
								}
							} else {
								break;
							}
						}
					});
				}
			});
			/*●lib.arenaReady.push(() => {
				let button = ui.create.system("自娱自乐", function () {
					var bool = this.classList.toggle("glow");
					game.saveConfig("extension_奇妙工具_autoSwap", bool);
				}, true);
				button.classList.toggle("glow", Boolean(!_status.connectMode && game.getExtensionConfig("奇妙工具", "autoSwap")));
			});*/
			var config = game.getExtensionConfig("奇妙工具", "maximumNumberOfPlayers");
			if (!_status.connectMode) _status.maximumNumberOfPlayers = config;
		},
		config: {
			/*select_all_handCards: {
				name: "全选手牌",
				init: true,
				intro: "开启后，某些技能（如制衡）会出现一个“全选手牌”按钮。",
			},*/
			luckyCards: {
				name: "定向手气卡",
				init: false,
				intro: "开启后可以为场上任意角色定向指定手气卡",
			},
			replaceCharacter: {
				name: "AI换将",
				init: true,
				intro: "开启后在游戏开始时可以为场上任意角色变更武将",
			},
			swapSeat: {
				name: "AI换座",
				init: false,
				intro: "开启后在游戏开始时可以调整场上除一号位外其他任意角色的座次",
			},
			setIdentity: {
				name: "设置身份",
				init: false,
				intro: "开启后在游戏开始时可以为场上任意角色设置身份",
			},
			changeGroup: {
				name: "设置势力",
				init: false,
				intro: "开启后在游戏开始时可以为场上任意角色设置势力",
			},
			changeSex: {
				name: "设置性别",
				init: false,
				intro: "开启后在游戏开始时可以为场上任意角色设置性别（真的有意义么）",
			},
			addSkills: {
				name: "添加技能",
				init: false,
				intro: "开启后可以在游戏进行时给自己加技能",
			},
			createCard: {
				name: "卡牌创造",
				init: false,
				intro: "开启后可以创造卡牌",
			},
			SelectGiveCharacter: {
				name: "选择目标",
				init: false,
				intro: "开启后添加技能和卡牌创造可以选择给予目标",
			},
			viewHandCards: {
				name: "金睛火眼",
				init: false,
				intro: "开启后立即生效，可观看对应目标的手牌。",
			},
			viewHandCardsSetting: {
				name: "金睛火眼设置",
				init: "all",
				item: {
					"all": "我全都要看",
					"onlyFriend": "只看队友",
					"onlyRealFriend": "只看真实队友",
				},
				intro: "选择查看场上目标角色的范围",
			},
			autoSwap: {
				name: "自娱自乐",
				init: false,
				intro: "开启后立即生效，接管场上对应角色的操作。",
			},
			autoSwapSetting: {
				name: "自娱自乐设置",
				init: "onlyRealFriend",
				item: {
					"all": "全部都操控",
					"onlyFriend": "仅限队友",
					"onlyRealFriend": "仅限真实队友",
				},
				intro: "选择操作场上目标角色的范围",
			},
			maximumNumberOfPlayers: {
				name: "身份场人数上限",
				init: 10,
				item: {
					10: "10名玩家",
					11: "11名玩家",
					12: "12名玩家",
					13: "13名玩家",
					14: "14名玩家",
					15: "15名玩家",
					16: "16名玩家",
					17: "17名玩家",
					100: "100名玩家",
				},
				intro: "设置身份场的玩家数上限（警告：过多的玩家同框会导致UI显示错误及极高的性能消耗）",
			},
		},
		help: {},
		package: {
			character: {
				character: {},
				translate: {},
			},
			card: {
				card: {},
				translate: {},
				list: [],
			},
			skill: {
				skill: {},
				translate: {},
			},
			intro: "一个用于优化游戏体验的小工具扩展(联机禁用)",
			author: "眯咪狗（子琪懒人包版）",
			diskURL: "",
			forumURL: "",
			version: "3.5",
		},
		files: { character: [], card: [], skill: [], audio: [] },
	};
});
