"use strict";

/**
 * @fileoverview 技能特效模块，处理技能发动时的视觉效果
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { CONFIG, GENERAL_NAME_STYLE } from "./config.js";
import { isPlayer, getName, toKebab, getDefaultAvatar } from "./utils.js";
import { getOutcropStyle, getOutcropImagePath, checkImageExists } from "../ui/outcropAvatar.js";

/**
 * 播放技能特效
 * @param {Object} player - 玩家对象
 * @param {string} skillName - 技能名称
 * @param {string} [vice] - 是否为副将，值为"vice"表示副将
 * @returns {void}
 */
//●觉醒技特效，全部修改
export function playSkillEffect(player, skillName, vice) {
	if(lib.config.extension_十周年UI_juexingji && (lib.config.extension_十周年UI_newDecadeStyle=='off' || lib.config.extension_十周年UI_newDecadeStyle=='othersOff' || lib.config.extension_十周年UI_newDecadeStyle == 'onlineUI' || lib.config.extension_十周年UI_newDecadeStyle == 'babysha')){
	// 辅助函数：获取武将所有技能
	function getSkills(name) {
		var skills = get.character(name, 3);
		var viewSkill = [];
		for (var skill of skills) {
			var info = get.info(skill);
			console.log("info", info);
			if (!info || info.nopop || !get.translation(skill + "_info")) {
				continue;
			}
			viewSkill.add(skill);
			if (info.derivation) {
				if (typeof info.derivation === "string") {
					viewSkill.add(info.derivation);
				} else {
					for (var s of info.derivation) {
						viewSkill.add(s);
					}
				}
			}
		}
		return viewSkill;
	}

	// 辅助函数：获取技能类型
	function getSkillType(skillName) {
		if (!skillName) {
			return "xiandingji";
		}
		var skillType = "";
		if (get.info(skillName).juexingji) {
			skillType = "juexingji";
		} else if (get.info(skillName).limited) {
			skillType = "xiandingji";
		} else if (get.info(skillName).dutySkill) {
			skillType = "shimingji";
		}
		return skillType;
	}

	// 辅助函数：获取技能对应的id
	function getName(player, oskill) {
		let target = player.skills.findIndex(skill => get.translation(skill) == oskill);
		if (target == -1) {
			var viewSkill = getSkills(player.name);
			if (player.name2) {
				viewSkill = viewSkill.concat(getSkills(player.name2));
			}
			target = viewSkill.findIndex(skill => get.translation(skill) == oskill);
			return target == -1 ? false : viewSkill[target];
		}
		let skill = player.skills[target];
		return skill;
	}

	// 根据配置选择不同的效果
	//●修复: 觉醒/限定/使命特效期间临时抬高骨骼画布(#decadeUI-canvas)到201, 与武将图202/技能名203贴合, 播完还原, 避免与询问弹窗夹层(仅特效时段生效, 不全局抬高)
	var _cs = (typeof decadeUI != "undefined" && decadeUI.animation) ? decadeUI.animation.canvas : undefined;
	var _csZ = _cs ? _cs.style.zIndex : "";
	if (_cs) _cs.style.zIndex = "201";
	if (lib.config.extension_十周年UI_newDecadeStyle == 'othersOff') {
		executeShoushaEffect(player, skillName, vice);
	} else if (lib.config.extension_十周年UI_newDecadeStyle == 'off') {
		executeMobileEffect(player, skillName, vice);
	} else if (lib.config.extension_十周年UI_newDecadeStyle == 'onlineUI' || lib.config.extension_十周年UI_newDecadeStyle == 'babysha') {
		executeOlEffect(player, skillName, vice);
	}
	if (_cs) {
		setTimeout(function () { _cs.style.zIndex = _csZ; }, 3500);
	}

	//一将，旧手杀效果实现
	function executeShoushaEffect(player, skillName, vice) {
		var name = getName(player, skillName);
		if (get.itemtype(player) != "player") return console.error("player");
		var skillType = getSkillType(name);

		if ("juexingji" == skillType) {
			decadeUI.animation.playSpine({ name: "juexingji/juexingji1/juexingji" }, { scale: 0.8 });
			var avatar_wenzhi = ui.create.div(".juexingjinengming .wmmh-skill-common-jinengming", ui.arena);
		} else if ("xiandingji" == skillType) {
			decadeUI.animation.playSpine({ name: "juexingji/juexingji1/xiandingji" }, { scale: 0.8 });
			var avatar_wenzhi = ui.create.div(".xiandingwujiangtu .wmmh-skill-common-jinengming", ui.arena);
		} else if ("shimingji" == skillType) {
			decadeUI.animation.playSpine({ name: "juexingji/juexingji1/shimingji" }, { scale: 0.8 });
			var avatar_wenzhi = ui.create.div(".shimingwujiangtu .wmmh-skill-common-jinengming", ui.arena);
		} else {
			decadeUI.animation.playSpine({ name: "juexingji/juexingji1/juexingji" }, { scale: 0.8 });
			var avatar_wenzhi = ui.create.div(".xiandingwujiangtu .wmmh-skill-common-jinengming", ui.arena);
		}

		var avatar = ui.create.div(".juexingwujiangtu", ui.arena);
		if (vice == "vice") {
			avatar.style.backgroundImage = player.node.avatar2.style.backgroundImage;
		} else {
			avatar.style.backgroundImage = player.node.avatar.style.backgroundImage;
		}
		avatar_wenzhi.innerHTML = skillName;
	}

	//手杀效果实现
	function executeMobileEffect(player, skillName, vice) {
		var name = getName(player, skillName);
		let lutouType = lib.config["extension_十周年UI_outcropSkin"]
		console.log("lutouType", lutouType);

		if (get.itemtype(player) != "player") return console.error("player");
		var skillType = getSkillType(name);

		if (skillType == "juexingji") {
			let className = ".juexingwujiangtu .juexingwujiangtu2";
			if (lutouType == "shousha") {
				className += " .juexingwujiangtu-shousha";
			} else if (lutouType == "shizhounian") {
				className += " .juexingwujiangtu-shizhounian";
			}
			decadeUI.animation.playSpine({ name: "juexingji/juexingji2/jxxd", action: "animation1", speed: 1.2 }, { scale: 1.1 , "x":[0, 0.544] });
			var avatar = ui.create.div(className, ui.arena);
			var avatar_wenzhi = ui.create.div(".juexingjinengming .wmmh-skill-common-jinengming .wmmh-skill-common-jinengming2", ui.arena);
		} else {
			let className = ".juexingwujiangtu";
			if (lutouType == "shousha") {
				className += " .xiandingshimingji-shousha";
			} else if (lutouType == "shizhounian") {
				className += " .xiandingshimingji-shizhounian";
			}
			decadeUI.animation.playSpine({ name: "juexingji/juexingji2/jxxd", action: "animation2", speed: 1.2 }, { scale: 1.1 , "x":[0, 0.544] });
			var avatar = ui.create.div(className, ui.arena);
			if (skillType == "xiandingji") {
				var avatar_wenzhi = ui.create.div(".xiandingwujiangtu .wmmh-skill-common-jinengming", ui.arena);
			} else {
				var avatar_wenzhi = ui.create.div(".shimingwujiangtu .wmmh-skill-common-jinengming", ui.arena);
			}
		}

		let target = vice == "vice" ? player.node.avatar2 : player.node.avatar;
		avatar.style.backgroundImage = target.style.backgroundImage;
		let reac = player.getBoundingClientRect();
		avatar.style.left = reac.left + "px";
		avatar.style.top = reac.top + "px";

		avatar_wenzhi.innerHTML = skillName;

	}

	//online，babysha效果实现
	function executeOlEffect(player, skillName, vice) {
		var name = getName(player, skillName);
		if (get.itemtype(player) != "player") return console.error("player");
		var skillType = getSkillType(name);

		if ("juexingji" == skillType) {
			game.playAudio("../extension/十周年UI/audio/juexing.mp3");
			decadeUI.animation.playSpine({ name: "juexingji/juexingji3/oljuexingji", speed: 0.78 });
			ui.create.div(".juexingicon .wmmh-skill-common-icon", ui.arena);
		} else if ("xiandingji" == skillType) {
			game.playAudio("../extension/十周年UI/audio/xianding.mp3");
			decadeUI.animation.playSpine({ name: "juexingji/juexingji3/olxiandingji", speed: 0.78 });
			ui.create.div(".xiandingicon .wmmh-skill-common-icon", ui.arena);
		} else if ("shimingji" == skillType) {
			game.playAudio("../extension/十周年UI/audio/shiming.mp3");
			decadeUI.animation.playSpine({ name: "juexingji/juexingji3/olshimingji", speed: 0.78 });
			ui.create.div(".shimingicon .wmmh-skill-common-icon", ui.arena);
		} else {
			game.playAudio("../extension/十周年UI/audio/juexing.mp3");
			decadeUI.animation.playSpine({ name: "juexingji/juexingji3/oljuexingji", speed: 0.78 });
			ui.create.div(".xiandingicon .wmmh-skill-common-icon", ui.arena);
		}

		var avatar_wenzhi = ui.create.div(".wmmh-skill-common-jinengming", ui.arena);
		var skillName1 = "\n ";
		var skillName2 = skillName.substring(0, 1);
		var skillName3 = skillName.substring(1);
		var skillName4 = skillName2.concat(skillName1);
		var skillName5 = skillName4.concat(skillName3);
		avatar_wenzhi.innerHTML = skillName5;

		var avatar = ui.create.div(".juexingwujiangtu", ui.arena);
		if (vice == "vice") {
			avatar.style.backgroundImage = player.node.avatar2.style.backgroundImage;
		} else {
			avatar.style.backgroundImage = player.node.avatar.style.backgroundImage;
		}
	}

	} else {

	if (!isPlayer(player)) return;

	const anim = decadeUI.animation;
	const asset = anim.spine.assets.effect_xianding;

	if (!asset) {
		console.error("[effect_xianding]特效未加载");
		return;
	}
	if (!asset.ready) anim.prepSpine("effect_xianding");

	const isVice = vice === "vice";
	const camp = player.group;
	const playerName = getName(player, isVice);
	const characterName = isVice ? player.name2 : player.name;

	loadSkillAssets(characterName, camp, player, skillName, playerName);

	}

}

/**
 * 加载技能特效资源
 * @param {string} characterName - 武将名称
 * @param {string} camp - 势力
 * @param {Object} player - 玩家对象
 * @param {string} skillName - 技能名称
 * @param {string} playerName - 显示名称
 * @returns {Promise<void>}
 */
async function loadSkillAssets(characterName, camp, player, skillName, playerName) {
	try {
		const imgPath = await getCharacterImagePath(characterName);
		const [charImg, bgImg] = await Promise.all([loadImage(imgPath, player, characterName), loadBgImage(camp)]);
		renderSkillEffect(charImg, bgImg, camp, skillName, playerName);
	} catch (err) {
		console.error("技能特效加载失败:", err);
	}
}

/**
 * 获取武将图片顺序
 * @param {string} name - 武将名称
 * @returns {Promise<string|null>} 图片路径
 */
async function getCharacterImagePath(name) {
	if (!name) return null;

	const nameinfo = get.character(name);
	const mode = get.mode();

	// 处理国战模式武将名
	let realName = name;
	if (lib.characterPack[`mode_${mode}`]?.[name]) {
		if (mode === "guozhan") {
			realName = name.startsWith("gz_shibing") ? name.slice(3, 11) : name.slice(3);
		}
	}

	// 使用皮肤
	if (lib.config.skin[realName]) {
		return lib.config.skin[realName][1];
	}

	// 检查武将自定义图片
	if (nameinfo?.img) {
		return nameinfo.img;
	}

	// 检查trashBin中的图片配置
	if (nameinfo?.trashBin) {
		for (const value of nameinfo.trashBin) {
			if (value.startsWith("img:")) return value.slice(4);
			if (value.startsWith("ext:")) return value.replace(/^ext:/, "extension/");
		}
	}

	// 优先扩展lihui立绘目录
	const lihuiPath = `${lib.assetURL}extension/十周年UI/image/character/lihui/${realName}.jpg`;
	if (await checkImageExists(lihuiPath)) {
		return lihuiPath;
	}

	// 其次露头图
	const outcropStyle = getOutcropStyle();
	if (outcropStyle !== "off") {
		const outcropPath = getOutcropImagePath(realName, outcropStyle);
		if (outcropPath && (await checkImageExists(outcropPath))) {
			return outcropPath;
		}
	}

	// 最后都没有扔给本体处理
	return `${lib.assetURL}image/character/${realName}.jpg`;
}

/**
 * 加载角色图片
 * @param {string} src - 图片路径
 * @param {Object} player - 玩家对象(用于获取备用图片)
 * @param {string} characterName - 武将名称
 * @returns {Promise<HTMLImageElement>} 加载完成的图片元素
 */
function loadImage(src, player, characterName) {
	return new Promise((resolve, reject) => {
		if (!src) {
			reject(new Error("图片路径为空"));
			return;
		}

		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = async () => {
			const fallback = await getFallbackSrc(src, player, characterName);
			if (fallback && fallback !== src) {
				img.onload = () => resolve(img);
				img.onerror = () => reject(new Error("图片加载失败"));
				img.src = fallback;
			} else {
				reject(new Error("图片加载失败"));
			}
		};
		img.src = src.startsWith("http") || src.startsWith("data:") ? src : `${lib.assetURL}${src.replace(lib.assetURL, "")}`;
	});
}

/**
 * 获取备用图片路径
 * @param {string} src - 原图片路径
 * @param {Object} player - 玩家对象
 * @param {string} characterName - 武将名称
 * @returns {Promise<string>} 备用图片路径
 */
async function getFallbackSrc(src, player, characterName) {
	return getDefaultAvatar(player);
}

/**
 * 加载势力背景图
 * @param {string} camp - 势力名称
 * @returns {Promise<HTMLImageElement>} 加载完成的背景图片
 */
function loadBgImage(camp) {
	return new Promise(resolve => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => {
			img.onload = () => resolve(img);
			img.src = `${decadeUIPath}image/ui/misc/bg_xianding_qun.png`;
		};
		img.src = `${decadeUIPath}image/ui/misc/bg_xianding_${camp}.png`;
	});
}

/**
 * 渲染技能特效
 * @param {HTMLImageElement} charImg - 武将图片
 * @param {HTMLImageElement} bgImg - 背景图片
 * @param {string} camp - 势力
 * @param {string} skillName - 技能名称
 * @param {string} playerName - 玩家显示名
 * @returns {void}
 */
function renderSkillEffect(charImg, bgImg, camp, skillName, playerName) {
	const anim = decadeUI.animation;
	const sprite = anim.playSpine("effect_xianding");

	if (!sprite?.skeleton) {
		console.error("Spine动画加载失败");
		return;
	}

	const skeleton = sprite.skeleton;

	// 设置势力背景
	setAttachment(skeleton, "shilidipan", bgImg, anim, camp);

	// 设置武将图片
	setGeneralAttachment(skeleton, charImg, anim);

	// 计算缩放
	const size = skeleton.bounds.size;
	sprite.scale = Math.max(anim.canvas.width / size.x, anim.canvas.height / size.y);

	// 创建UI元素
	createSkillUI(skillName, playerName, sprite.scale);
}

/**
 * 设置Spine附件(带缓存)
 * @param {Object} skeleton - Spine骨骼对象
 * @param {string} slotName - 插槽名称
 * @param {HTMLImageElement} img - 图片元素
 * @param {Object} anim - 动画对象
 * @param {string} cacheKey - 缓存键
 * @returns {void}
 */
function setAttachment(skeleton, slotName, img, anim, cacheKey) {
	const slot = skeleton.findSlot(slotName);
	const attachment = slot.getAttachment();

	if (attachment.camp === cacheKey) return;

	attachment.cached = attachment.cached || {};
	if (!attachment.cached[cacheKey]) {
		attachment.cached[cacheKey] = anim.createTextureRegion(img);
	}

	const region = attachment.cached[cacheKey];
	attachment.width = region.width;
	attachment.height = region.height;
	attachment.setRegion(region);
	attachment.updateOffset();
	attachment.camp = cacheKey;
}

/**
 * 设置武将附件
 * @param {Object} skeleton - Spine骨骼对象
 * @param {HTMLImageElement} img - 武将图片
 * @param {Object} anim - 动画对象
 * @returns {void}
 */
function setGeneralAttachment(skeleton, img, anim) {
	const slot = skeleton.findSlot("wujiang");
	const attachment = slot.getAttachment();
	const region = anim.createTextureRegion(img);

	const scale = Math.min(CONFIG.SKILL_MAX_W / region.width, CONFIG.SKILL_MAX_H / region.height);

	attachment.width = region.width * scale;
	attachment.height = region.height * scale;
	attachment.setRegion(region);
	attachment.updateOffset();
}

/**
 * 创建技能UI元素
 * @param {string} skillName - 技能名称
 * @param {string} playerName - 玩家显示名
 * @param {number} spriteScale - 精灵缩放比例
 * @returns {void}
 */
function createSkillUI(skillName, playerName, spriteScale) {
	// 技能名
	const skillEl = decadeUI.element.create("skill-name");
	skillEl.innerHTML = skillName;
	skillEl.style.top = `calc(50% + ${CONFIG.SKILL_NAME_Y * spriteScale}px)`;

	// 武将名
	const nameEl = decadeUI.element.create("general-name");
	nameEl.innerHTML = playerName;

	const styles = {
		...GENERAL_NAME_STYLE,
		right: `calc(50% - ${CONFIG.GENERAL_X * spriteScale}px)`,
		top: `calc(50% - ${CONFIG.GENERAL_Y * spriteScale}px)`,
	};

	nameEl.style.cssText = Object.entries(styles)
		.map(([k, v]) => `${toKebab(k)}: ${v}`)
		.join("; ");

	ui.arena.appendChild(skillEl);
	ui.arena.appendChild(nameEl);

	skillEl.removeSelf(CONFIG.EFFECT_DURATION);
	nameEl.removeSelf(CONFIG.EFFECT_DURATION);
}
