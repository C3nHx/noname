import { lib, game, ui, get, ai, _status } from "../../../noname.js";

export const packs = (lib.version == '1.11.4.1') ? {
			character: {
				character: {
                    mb_lingju: ["female","qun",3,["mbjieyuan","mbfenxin"],["ext:懒人包/character/mb_lingju.jpg","die:ext:懒人包/character/audio/die/mb_lingju.mp3"]],
				},
                characterSort: {
                    '懒人包': {
                        'newCharacter': ['mb_lingju'],
                    },
                },
				translate: {
                    mb_lingju:"灵雎",
                    mb_lingju_ab:"灵雎",
                    newCharacter:"作者：子右",
				},
				characterTitle: {
					mb_lingju: "情随梦逝",	//手杀灵雎似乎没有称号
				},
			},
			card: {
				card: {},
				translate: {},
				list: [],
			},
			skill: {
				skill: {
					mbjieyuan: {
                        audio: "ext:懒人包/character/audio/skill:2",
						trigger: {
							source: "damageBegin1",
							player: "damageBegin3",
						},
						filter(event, player, name) {
							const beishui = player.getStorage("mbjieyuan_beishui", false);
							const removed = player.getStorage("mbjieyuan_removed", "");
							if (beishui) {
								if (name === "damageBegin1" && removed === "damageSource") return false;
								if (name === "damageBegin3" && removed === "damage") return false;
							}
							if (name === "damageBegin1") {
								return event.source === player && event.num > 0;
							}
							if (name === "damageBegin3") {
								return event.player === player && event.num > 0;
							}
							return false;
						},
						async cost(event, trigger, player) {
							const name = event.triggername;
							const beishui = player.getStorage("mbjieyuan_beishui", false);
							const removed = player.getStorage("mbjieyuan_removed", "");
							const isSource = name === "damageBegin1";
							const color = isSource ? "black" : "red";
							const colorText = isSource ? "黑" : "红";
							const discardNum = 1;
							const effectNum = beishui ? 2 : 1;
							const canDiscard = player.countCards("he", card => get.color(card) === color) >= discardNum;
							const target = isSource ? trigger.player : trigger.source;
							const promptText = isSource ? "是否对" + get.translation(target) + "发动【竭缘】？" : "是否发动【竭缘】？";
							const choices = [];
							const choiceList = [];
							if (canDiscard) {
								choices.push("弃" + colorText + "牌伤害" + (isSource ? "+" : "-") + effectNum);
								choiceList.push("弃置一张" + (isSource ? "黑色" : "红色") + "牌，令此伤害" + (isSource ? "+" : "-") + effectNum);
							}
							choices.push("获得" + colorText + "牌");
							choiceList.push("从牌堆中获得" + get.cnNumber(effectNum) + "张" + (isSource ? "黑色" : "红色") + "牌");
							if (!beishui && !removed) {
								choices.push("背水");
								const beishuiDesc = isSource ? "删除受到伤害时的效果" : "删除造成伤害时的效果";
								choiceList.push("背水！" + beishuiDesc + "，升级技能");
							}
							choices.push("取消");
							const { control } = await player
								.chooseControl(choices)
								.set("choiceList", choiceList)
								.set("prompt", promptText)
								.set("ai", () => {
									if (canDiscard) return 0;
									return 1;
								})
								.forResult();
							event.result = {
								bool: control !== "取消",
								cost_data: control,
							};
						},
						async content(event, trigger, player) {
							const control = event.cost_data;
							const name = event.triggername;
							const beishui = player.getStorage("mbjieyuan_beishui", false);
							const isSource = name === "damageBegin1";
							const color = isSource ? "black" : "red";
							const colorText = isSource ? "黑" : "红";
							const discardNum = 1;
							const effectNum = beishui ? 2 : 1;
							const canDiscard = player.countCards("he", card => get.color(card) === color) >= discardNum;
							const isOption1 = control.startsWith("弃" + colorText + "牌");
							const isOption2 = control.startsWith("获得" + colorText + "牌");
							const isBeishui = control === "背水";
							if (isOption1 || isBeishui) {
								if (canDiscard) {
									const result = await player.chooseCard("he", true, "请选择一张" + (isSource ? "黑色" : "红色") + "牌弃置", card => get.color(card) === color).forResult();
									if (result.bool && result.cards?.length > 0) {
										await player.discard(result.cards);
										if (isSource) {
											trigger.num += effectNum;
											game.log(player, "发动了【竭缘】，弃置了1张黑色牌，伤害+" + effectNum);
										} else {
											trigger.num -= effectNum;
											game.log(player, "发动了【竭缘】，弃置了1张红色牌，伤害-" + effectNum);
										}
									}
								}
							}
							if (isOption2 || isBeishui) {
								const pileCards = Array.from(ui.cardPile.childNodes);
								const colorCards = pileCards.filter(card => get.color(card) === color);
								const toGain = colorCards.slice(0, effectNum);
								if (toGain.length > 0) {
									await player.gain(toGain, "gain2");
									game.log(player, "发动了【竭缘】，获得了" + effectNum + "张" + (isSource ? "黑色" : "红色") + "牌");
								}
							}
							if (isBeishui) {
								player.setStorage("mbjieyuan_beishui", true);
								const otherTrigger = isSource ? "damage" : "damageSource";
								player.setStorage("mbjieyuan_removed", otherTrigger);
								game.log(player, "发动了【竭缘】背水，删除了" + (isSource ? "受到伤害" : "造成伤害") + "时的效果");
							}
						},
						ai: {
							threaten: 1.5,
						},
					},
					mbfenxin: {
                        audio: "ext:懒人包/character/audio/skill:2",
						trigger: {
							source: "dieBegin",
						},
						filter(event, player) {
							const validIdentities = ["zhong", "fan", "nei", "zhu", "dizhu", "nongmin"];
							return validIdentities.includes(event.player.identity) && validIdentities.includes(player.identity);
						},
						async cost(event, trigger, player) {
							const target = trigger.player;
							const validSkills = target.getStockSkills(true, true).filter(skill => {
								const info = get.info(skill);
								if (!info) return false;
								if (info.charlotte) return false;
								if (info.limited) return false;
								if (info.juexingji) return false;
								if (info.zhuSkill) return false;
								if (info.dutySkill) return false;
								if (info.persevereSkill) return false;
								return true;
							});
							const isIdentityMode = _status.mode === "normal";
							const canSwap = isIdentityMode && !player.identityShown && !target.identityShown;
							const choices = [];
							const choiceList = [];
							choices.push("获得" + get.translation(target) + "的技能");
							choiceList.push("获得" + get.translation(target) + "的所有技能（限定技、觉醒技、使命技、主公技、持恒技除外）");
							if (canSwap) {
								choices.push("交换身份牌");
								choiceList.push("与其交换身份牌");
							}
							choices.push("取消");
							const result = await player.chooseControl(choices)
								.set("choiceList", choiceList)
								.set("prompt", get.prompt("mbfenxin", target))
								.set("ai", () => {
									if (validSkills.length > 0) return 0;
									if (canSwap) return 1;
									return "取消";
								})
								.forResult();
							event.result = {
								bool: result.control !== "取消",
								cost_data: result.control,
								targets: [target],
							};
						},
						logTarget: "player",
						async content(event, trigger, player) {
							const choice = event.cost_data;
							const target = trigger.player;
							if (choice === "获得" + get.translation(target) + "的技能") {
								if (player.identity !== target.identity) {
									const validSkills = target.getStockSkills(true, true).filter(skill => {
										const info = get.info(skill);
										if (!info) return false;
										if (info.charlotte) return false;
										if (info.limited) return false;
										if (info.juexingji) return false;
										if (info.zhuSkill) return false;
										if (info.dutySkill) return false;
										if (info.persevereSkill) return false;
										return true;
									});
									if (validSkills.length > 0) {
										await player.addSkills(validSkills);
										game.log(player, "获得了", target, "的所有技能：", validSkills.map(s => `#g【${get.translation(s)}】`).join("、"));
									}
								} else {
									game.log(player, "与", target, "身份相同，无法获得技能");
								}
							} else if (choice === "交换身份牌") {
								game.broadcastAll(
									function(player3, target2, shown) {
										const identity = player3.identity;
										player3.identity = target2.identity;
										if (shown || player3 === game.me) {
											player3.setIdentity();
										}
										target2.identity = identity;
									},
									player,
									target,
									target.identityShown
								);
								player.line(target, "green");
								game.log(player, "与", target, "交换了身份牌");
							}
						},
					},
				},
				translate: {
					mbjieyuan: "竭缘",
					mbjieyuan_info: "你造成伤害时，你可以选择一项：1、弃置一张黑色牌，令此伤害+1；2、从牌堆中获得一张黑色牌。<br>你受到伤害时，你可以选择一项：1、弃置一张红色牌，令此伤害-1；2、从牌堆中获得一张红色牌。<br>背水：删除另一个时机的效果，将伤害的增减、获得牌的数量改为2，然后失去背水选项。",
					mbfenxin: "焚心",
					mbfenxin_info: "被你杀死的角色亮出其身份牌前，你可选择一项：1、其亮出身份牌后，若与你身份不同，你获得其武将牌上所有技能（限定技、觉醒技、使命技、主公技、持恒技除外）；2、与其交换身份牌（你的身份牌非明置时方可选择）。",
				},
			},
} : {}