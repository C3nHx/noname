/// <reference path="./typings/index.d.ts" />
/// <reference path="./typings/highlight.d.ts" />
import { lib, game, ui, get, ai, _status } from "../../noname.js";

const modes = Object.keys(lib.mode).filter((mode) => {
	// 强制加载versus模式
	if (mode === "versus") {
		return true;
	}
	return !["connect", get.mode()].includes(mode);
});

/**
 * @template { string } T
 * @param { T } mode
 * @returns { Promise<{ mode: T, data: { card: SMap<any>, characterPack: SMap<Character>, skill: SMap<Skill>,  translate: SMap<string> } }> }
 */
export const loadModeAsync = function (mode) {
	return new Promise(resolve => {
		const defaultResolve = () => {
			resolve({
				mode,
				data: {
					card: {},
					characterPack: {},
					skill: {},
					translate: {},
				},
			});
		};
		try {
			game.loadModeAsync(mode, data => {
				const characterPack = data.characterPack ?? {};
				const translate = data.translate ?? {};

				if (mode == "versus") {
					if (!characterPack.mode_versus) {
						characterPack.mode_versus = {};
					}
					// 添加剑阁武将
					if (get.is.object(data.jiangeboss)) {
						Object.assign(characterPack.mode_versus, data.jiangeboss);
					}
					// 添加四国武将和卡牌
					Object.assign(characterPack.mode_versus, {
						tangzi: {
							sex: "male",
							group: ["wei", "wu"].randomGet(),
							hp: 4,
							skills: ["xingzhao"],
							dieAudios: ["xf_tangzi"],
						},
						liuqi: {
							sex: "male",
							group: ["shu", "qun"].randomGet(),
							hp: 3,
							skills: ["wenji", "tunjiang"],
							dieAudios: ["sp_liuqi"],
						},
					});
					lib.cardPack.mode_versus = ["zong", "xionghuangjiu", "tongzhougongji", "lizhengshangyou"];
					// 修改武将包名
					translate.mode_versus_character_config = "对决武将";
				}

				for (const [pack, obj] of Object.entries(characterPack)) {
					for (const [characterName, characterData] of Object.entries(
						obj
					)) {
						if (Array.isArray(characterData) || get.is.object(characterData)) {
							if (lib.element.Character) {
								obj[characterName] = new lib.element.Character(
									characterData
								);
								if (!obj[characterName].img && ["boss", "versus", "tafang", "chess", "stone"].includes(mode)) {
									obj[characterName].trashBin.push(
										`mode:${mode}`
									);
								}
							}
							else if (get.is.object(characterData)) {
								console.warn(`object格式的武将信息必须在支持lib.element.Character类的情况才能解析！
									武将id: ${characterName}解析失败`, obj[characterName]);
								delete obj[characterName];
								continue;
							}
						}
						else {
							console.warn(`武将id: ${characterName}解析失败`, obj[characterName]);
							delete obj[characterName];
							continue;
						}
						if (mode == "guozhan") {
							if (
								!lib.translate[characterName] &&
								!translate[characterName]
							) {
								translate[characterName] =
									lib.translate[characterName.slice(3)];
							}
						}
					}
				}

				resolve({
					mode,
					data: {
						card: data.card ?? {},
						characterPack,
						skill: data.skill ?? {},
						translate,
					},
				});
			}, defaultResolve);
			setTimeout(defaultResolve, 5000);
		} catch {
			defaultResolve();
		}
	});
};

async function loadModesSequentially(modes) {
	const results = [];

	for (const mode of modes) {
		const result = await loadModeAsync(mode);
		results.push(result);
	}

	return results;
}

export const getOtherModeData = async () => {
	return loadModesSequentially(modes);
	// return Promise.all(modes.map(mode => loadModeAsync(mode)));
};
