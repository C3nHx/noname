/**
 * @fileoverview Player状态管理覆写模块
 * @description 处理玩家核心状态相关的覆写，包括身份、座位、体力、初始化等
 * @module overrides/player/state
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { getBasePlayerMethods } from "./base.js";

/**
 * 觉醒技能覆写
 * @description 在原有觉醒逻辑基础上，更新技能控制UI和处理使命技失效状态
 * @param {string} skill - 技能名
 * @returns {*} 原方法返回值
 * @this {Object} 玩家对象
 */
export function playerAwakenSkill(skill) {
	const base = getBasePlayerMethods();
	const result = base.awakenSkill.apply(this, arguments);

	ui.updateSkillControl?.(this);

	// 使命技觉醒后设置失效状态
	if (get.info(skill)?.dutySkill) {
		const that = this;
		game.expandSkills([skill]).forEach(subSkill => {
			that.setSkillState(subSkill, "shixiao");
		});
	}

	// 检查是否为使命技失败
	const parentSkill = _status.event.getParent()?.skill;
	if (parentSkill?.endsWith("_fail") && parentSkill.slice(0, -5) === skill) {
		this.setSkillState(skill, "fail");
	}

	return result;
}

/**
 * 设置身份覆写
 * @description 根据游戏模式设置玩家身份显示
 * @param {string} [identity] - 身份标识，不传则使用当前身份
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerSetIdentity(identity) {
	identity = identity || this.identity;
	this.node.identity.dataset.color = identity;

	// 国战模式特殊处理
	if (get.mode() === "guozhan") {
		if (identity === "ye" && get.is.jun(this)) {
			this.identity = identity = lib.character[this.name1][1];
		}
		this.group = identity;
		this.node.identity.firstChild.innerHTML = get.translation(identity);
		return this;
	}

	if (get.is.jun(this)) {
		this.node.identity.firstChild.innerHTML = "君";
	} else {
		this.node.identity.firstChild.innerHTML = get.translation(identity);
	}

	return this;
}

/**
 * 获取状态覆写
 * @description 在原有状态基础上添加座位号信息
 * @returns {Object} 包含座位号的状态对象
 * @this {Object} 玩家对象
 */
export function playerGetState() {
	const base = getBasePlayerMethods();
	const state = base.getState.apply(this, arguments);
	state.seat = this.seat;
	return state;
}

/**
 * 设置模式状态覆写
 * @description 同步座位号显示
 * @param {Object} info - 状态信息对象
 * @param {number} [info.seat] - 座位号
 * @returns {*} 原方法返回值
 * @this {Object} 玩家对象
 */
/*●*/
export function playerSetModeState(info) {
	if (info?.seat && this.node?.seat) this.node.seat.innerHTML = get.cnNumber(info.seat, true);
	if (typeof window !== "undefined" && window.decadeUI) {
		if (!ui.cardRoundTime || typeof ui.cardRoundTime.updateRoundCard !== "function") {
			ui.cardRoundTime = Object.assign(ui.cardRoundTime || {}, {
				updateRoundCard: function () {},
			});
		}
	}
	if ((game.online || _status.connectMode) && this.playerid) {
		const myOnlineId = game.onlineID;
		if (myOnlineId && this.playerid === myOnlineId && game.me !== this) {
			game.me = this;
		}
	}

	const base = getBasePlayerMethods();
	if (typeof base === "function") return base.setModeState.apply(this, arguments);
	else {
        if (lib.config.extension_十周年UI_equipments && !lib.config.extension_十周年UI_aloneEquip && lib.config.extension_十周年UI_newDecadeStyle == "off") window.zqEquipCss?.(); if (lib.config.die_move == "off") lib.element.player.$dieflip = function(){};

	if (!this.node) this.node = {};
	if (info && this.node) {
		if (info.name1 != null) {
			this.name1 = info.name1;
			if (info.unseen == null) this.classList.remove("unseen");
		}
		if (info.name != null) this.name = info.name;
		if (info.name2 != null) {
			this.name2 = info.name2;
			if (info.unseen2 == null) this.classList.remove("unseen2");
		}
		if (info.group != null) this.group = info.group;
		if (info.sex != null) this.sex = info.sex;
		if (info.hp != null) this.hp = info.hp;
		if (info.maxHp != null) this.maxHp = info.maxHp;
		if (info.hujia != null) this.hujia = info.hujia;
		if (info.identity != null) this.identity = info.identity;
		if (info.nickname != null) this.nickname = info.nickname;
		if (info.playerid != null) this.playerid = info.playerid;
		if (info.seat != null) this.seat = info.seat;
		if (info.side != null) this.side = info.side;
		if (info.tempname != null) this.tempname = info.tempname;
		else if (!this.tempname) this.tempname = [];

		if (!this.skin) this.skin = {};
		if (this.name1 && !this.skin.name) this.skin.name = this.name1;
		if (this.name2) this.skin.name2 = this.name2;
		else if (this.skin.name2 && !this.name2) delete this.skin.name2;

		if (info.dead != null) this.classList.toggle("dead", info.dead);
		if (info.linked != null) {
			this.classList.toggle("linked", info.linked);
			if (this.node.chain) {
				this.node.chain[info.linked ? "show" : "hide"]();
			}
		}
		if (info.turnedover != null) this.classList.toggle("turnedover", info.turnedover);
		if (info.out != null) this.classList.toggle("out", info.out);
		if (info.unseen != null) this.classList.toggle("unseen", info.unseen);
		if (info.unseen2 != null) this.classList.toggle("unseen2", info.unseen2);

		const isUnseen = this.classList.contains("unseen");
		const isUnseen2 = this.classList.contains("unseen2");
		const isOnline = game.online || _status.connectMode;
		const isReconnectMe = isOnline && this.playerid && game.onlineID && this.playerid === game.onlineID;
		const isMe = !isOnline ? (game.me === this) : isReconnectMe;
		const isPublicIdentity = get.mode() === "identity" && (this.identity === "zhu" || this.isZhu);
		const isHiddenIdentity = !isMe && !isPublicIdentity && (info.identityShown === false || isUnseen || isUnseen2);
		const name1Visible = isMe || !isUnseen;
		const name2Visible = isMe || !isUnseen2;

		const nodesToShow = [
			"avatar", "avatar2", "name", "name2", "count", "hp",
			"identity", "equips", "judges", "marks", "chain",
			"turnedover", "framebg", "nameol",
		];
		nodesToShow.forEach(key => {
			if (this.node[key] && typeof this.node[key].show === "function") {
				this.node[key].show();
			}
		});
		if (this.node.intro) {
			if (name1Visible || name2Visible) {
				this.node.intro.show();
			} else {
				this.node.intro.hide();
			}
		}

		if (this.node.name && this.name1) {
			if (name1Visible) {
				this.node.name.innerHTML = get.slimNameHorizontal?.(this.name1) || get.slimName(this.name1);
				this.node.name.dataset.nature = get.groupnature(this.group);
			} else {
				this.node.name.innerHTML = "";
				this.node.name.removeAttribute("data-nature");
			}
		}
		if (this.node.name2 && this.name2) {
			if (name2Visible) {
				this.node.name2.innerHTML = get.slimNameHorizontal?.(this.name2) || get.slimName(this.name2);
			} else {
				this.node.name2.innerHTML = "";
			}
		}
		if (this.node.nameol && this.nickname) {
			this.node.nameol.innerHTML = this.nickname.slice(0, 12);
		}

		if (this.node.identity) {
			const identityNode = this.node.identity.firstChild || this.node.identity;
			if (isHiddenIdentity) {
				identityNode.innerHTML = "猜";
				this.node.identity.dataset.color = "unknown";
			} else {
				if (get.is.jun(this)) {
					identityNode.innerHTML = "君";
				} else if (this.identity || info.identity) {
					identityNode.innerHTML = get.translation(info.identity || this.identity);
				} else if (this.side === true) {
					identityNode.innerHTML = "友";
				} else if (this.side === false) {
					identityNode.innerHTML = "敌";
				}
				if (info.identity || this.identity) {
					this.node.identity.dataset.color = info.identity || this.identity;
				} else if (info.side != null || this.side != null) {
					this.node.identity.dataset.color = this.side === true ? "friend" : this.side === false ? "enemy" : "";
				}
			}
		}

		if (this.node.avatar && this.name1) {
			if (name1Visible) {
				this.node.avatar.setBackground(this.name1, "character");
			} else {
				this.node.avatar.style.backgroundImage = "";
			}
			this.node.avatar.show();
		}
		if (this.node.avatar2 && this.name2) {
			if (name2Visible) {
				this.node.avatar2.setBackground(this.name2, "character");
			} else {
				this.node.avatar2.style.backgroundImage = "";
			}
			this.node.avatar2.show();
			this.doubleAvatar = true;
		} else if (this.node.avatar2) {
			this.node.avatar2.hide();
			this.doubleAvatar = false;
		}

		this.skills = this.skills || [];
		this.hiddenSkills = this.hiddenSkills || [];
		this.disabledSkills = this.disabledSkills || {};
		this.tempSkills = this.tempSkills || {};
		this.storage = this.storage || {};
		this.marks = this.marks || {};
		if (this.name1 && this.skills.length === 0 && !isUnseen) {
			const charSkills = get.character(this.name1, 3);
			if (charSkills && charSkills.length) this.skills = charSkills.slice();
			if (this.name2 && this.name2 !== this.name1 && !isUnseen2) {
				const char2Skills = get.character(this.name2, 3);
				if (char2Skills) {
					char2Skills.forEach(s => {
						if (!this.skills.includes(s)) this.skills.push(s);
					});
				}
			}
		}
		if (this.skills.length) {
			this.skills.forEach(skill => {
				const info = get.info(skill);
				if (info && (info.limited || info.zhuanhuanji || info.zhuanhuanji2 || info.mark || info.intro?.mark)) {
					if (!this.marks[skill]) this.markSkill(skill);
				}
			});
		}
		if (typeof this.updateMarks === "function") this.updateMarks();

		if (game.me === this) {
			if (ui.equipSolts && lib.config.extension_十周年UI_aloneEquip) {
				ui.equipSolts.me = this;
				ui.equipSolts.equips = this.node.equips;
				if (this.node.equips && this.node.equips.parentNode !== ui.equipSolts) {
					ui.equipSolts.appendChild(this.node.equips);
				}
			}
			if (ui.handcards1Container && this.node.handcards1 && this.node.handcards1.parentNode !== ui.handcards1Container) {
				ui.handcards1Container.appendChild(this.node.handcards1);
				ui.handcards1 = this.node.handcards1;
			}
			if (ui.handcards2Container && this.node.handcards2 && this.node.handcards2.parentNode !== ui.handcards2Container) {
				ui.handcards2Container.appendChild(this.node.handcards2);
				ui.handcards2 = this.node.handcards2;
			}
		}

		if (game.online && this.playerid && game.me !== this) {
			const myOnlineId = game.onlineID;
			if (myOnlineId && this.playerid === myOnlineId) {
				game.me = this;
			}
		}

		if (typeof this.update === "function") this.update();
		if (_status.video && typeof this.$update === "function") this.$update();
		if (typeof ui.updatej === "function") ui.updatej(this);
	}

	if (window.decadeUI) {
		if (window.decadeUI.layout) window.decadeUI.layout.resize();
		window.dispatchEvent(new Event("resize"));
	}

	if ((game.online || _status.connectMode) && typeof ui.update === "function") {
		ui.update();
	}

	if (this.node.chain) {
		if (this.classList.contains("linked") || this.classList.contains("linked2")) {
			this.node.chain.show();
			this.style.setProperty("transform", "rotate(0deg)", "important");
		} else {
			this.node.chain.hide();
		}
	}

	return this;
	/*else if (lib.config.extension_十周年UI_enable) {
		game.saveConfig("extension_十周年UI_enable", false);
		game.saveConfig("szn_ui_connect", true);
		alert('【十周年UI】扩展会导致重连失败，已关闭该扩展，请重试！');
		return game.reload();
	}*/
    }
}

/**
 * 设置座位号覆写
 * @description 同步更新座位号显示到所有客户端
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerSetSeatNum() {
	const base = getBasePlayerMethods();
	base.setSeatNum.apply(this, arguments);
	this.seat = this.getSeatNum();

	game.broadcastAll(player => {
		const seat = player.getSeatNum?.() ?? player.seat;
		if (player.node.seat) {
			player.node.seat.innerHTML = get.cnNumber(seat, true);
		}
	}, this);
}

/**
 * 玩家$uninit覆写
 * @description 清理玩家UI状态，包括前缀标记、动态皮肤、阵营显示等
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerUninit() {
	if (window.decadeModule?.prefixMark) {
		window.decadeModule.prefixMark.clearPrefixMarks(this);
	}

	this.stopDynamic();
	this.doubleAvatar = false;

	delete this.node.campWrap.dataset.camp;
	const campName = this.node.campWrap.node.campName;
	while (campName.firstChild) {
		campName.removeChild(campName.lastChild);
	}
	campName.style.removeProperty("background-image");

	const hujiat = this.node.hpWrap.querySelector(".hujia");
	if (hujiat) hujiat.remove();

	this.node.showCards?.hide();

	const base = getBasePlayerMethods();
	base.$uninit.apply(this, arguments);

	return this;
}

/**
 * 玩家$reinit覆写
 * @description 重新初始化玩家UI，包括前缀标记和名称分隔符
 * @param {string} from - 原武将名
 * @param {string} to - 目标武将名
 * @param {number} [maxHp] - 最大体力值
 * @param {boolean} [online] - 是否为联机模式
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerReinit(from, to, maxHp, online) {
	const base = getBasePlayerMethods();
	base.$reinit.apply(this, arguments);

	const character1 = this.name1 || this.name;

	if (window.decadeModule?.prefixMark) {
		window.decadeModule.prefixMark.clearPrefixMarks(this);
		if (character1) {
			window.decadeModule.prefixMark.showPrefixMark(character1, this);
		}
		if (this.doubleAvatar && this.name2) {
			window.decadeModule.prefixMark.showPrefixMark(this.name2, this);
		}
	}

	if (this.node.name && character1) {
		this.node.name.innerHTML = get.slimNameHorizontal?.(character1) || get.slimName(character1);
	}
	if (this.doubleAvatar && this.node.name2 && this.name2) {
		this.node.name2.innerHTML = get.slimNameHorizontal?.(this.name2) || get.slimName(this.name2);
	}

	return this;
}

/**
 * 重新初始化武将覆写
 * @description 变更武将时停止并重新应用动态皮肤
 * @param {string} from - 原武将名
 * @param {string} to - 目标武将名
 * @param {boolean} [log] - 是否记录日志
 * @returns {Promise<*>} 异步返回原方法结果
 * @this {Object} 玩家对象
 */
export async function playerReinitCharacter(from, to, log) {
	this.stopDynamic();

	const base = getBasePlayerMethods();
	const result = base.reinitCharacter.apply(this, arguments);
	await Promise.resolve(result);

	this._decadeUIApplyDynamicSkin();
	return result;
}

/**
 * 玩家$update覆写
 * @description 更新玩家UI显示，包括护甲、体力条、手牌数等
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerUpdate() {
	const base = getBasePlayerMethods();
	base.$update.apply(this, arguments);

	updateHujiaDisplay(this);
	updateHpDisplay(this);
	updateHandcardCount(this);

	this.decadeUI_updateShowCards();

	return this;
}

/**
 * 更新护甲显示
 * @param {Object} player - 玩家对象
 * @returns {void}
 * @private
 */
function updateHujiaDisplay(player) {
	let hujiat = player.node.hpWrap.querySelector(".hujia");

	if (player.hujia > 0) {
		if (!hujiat) {
			hujiat = ui.create.div(".hujia");
			player.node.hpWrap.appendChild(hujiat);
		}
		hujiat.innerText = player.hujia === Infinity ? "∞" : player.hujia;
	} else if (hujiat) {
		hujiat.remove();
	}
}

/**
 * 更新体力条显示
 * @param {Object} player - 玩家对象
 * @returns {void}
 * @private
 */
function updateHpDisplay(player) {
	const hidden = player.classList.contains("unseen_show") || player.classList.contains("unseen2_show");
	const hp = player.hp;
	const hpMax = hidden ? 1 : player.maxHp;
	const hpNode = player.node.hp;
	const useTextStyle = hpMax > 5 || (player.hujia && hpMax > 3);

	if (!player.storage.nohp && useTextStyle) {
		const hpText = isNaN(hp) ? "×" : hp === Infinity ? "∞" : hp;
		const maxText = isNaN(hpMax) ? "×" : hpMax === Infinity ? "∞" : hpMax;
		hpNode.innerHTML = `${hpText}<br>/<br>${maxText}<div></div>`;

		if (hp === 0) {
			hpNode.lastChild.classList.add("lost");
		}
		hpNode.classList.add("textstyle");
	}

	player.dataset.maxHp = useTextStyle ? 4 : hpMax;
}

/**
 * 更新手牌数显示
 * @param {Object} player - 玩家对象
 * @returns {void}
 * @private
 */
function updateHandcardCount(player) {
	const count = player.countCards("h");

	if (player === game.me) {
		const style = lib.config.extension_十周年UI_newDecadeStyle;
		const showLimit = ["onlineUI", "babysha", "codename"].includes(style);

		player.node.count.innerHTML = showLimit ? `${count}/${player.getHandcardLimit()}` : count;
	} else if (count >= 10) {
		player.node.count.innerHTML = count;
	}
}
