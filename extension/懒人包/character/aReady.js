import { lib, game, ui, get, ai, _status } from "../../../noname.js";

export const aReady = function() {
    const dynamicTranslates = {
    mbjieyuan(player) {
        const beishui = player?.getStorage("mbjieyuan_beishui", false);
        const removed = player?.getStorage("mbjieyuan_removed", "");
        if (beishui) {
            if (removed === "damageSource") {
                return "锁定技，你受到伤害时，你可以选择一项：1、弃置一张红色牌，令此伤害-2；2、从牌堆中获得两张红色牌。";
            } else if (removed === "damage") {
                return "锁定技，你造成伤害时，你可以选择一项：1、弃置一张黑色牌，令此伤害+2；2、从牌堆中获得两张黑色牌。";
            }
        }
        return "你造成伤害时，你可以选择一项：1、弃置一张黑色牌，令此伤害+1；2、从牌堆中获得一张黑色牌。<br>你受到伤害时，你可以选择一项：1、弃置一张红色牌，令此伤害-1；2、从牌堆中获得一张红色牌。<br>背水：删除另一个时机的效果，将伤害的增减、获得牌的数量改为2，然后失去背水选项。";
    },
    };

			for (const key in dynamicTranslates) {
				lib.dynamicTranslate[key] = dynamicTranslates[key];
			}
			if (lib.rank) {
				const rankMap = {
					s: ["灵雎"],
					ap: [],
					a: [],
					am: [],
					b: [],
					c: [],
				};
				const rarityMap = {
					legend: ["灵雎"],
					epic: [],
					rare: [],
					junk: [],
				};
				for (const [rankKey, names] of Object.entries(rankMap)) {
					for (const name of names) {
						if (!lib.rank[rankKey]?.includes(name)) {
							lib.rank[rankKey].push(name);
						}
					}
				}
				if (lib.rank.rarity) {
					for (const [key, names] of Object.entries(rarityMap)) {
						for (const name of names) {
							if (!lib.rank.rarity[key]?.includes(name)) {
								lib.rank.rarity[key].push(name);
							}
						}
					}
				}
			}
};

export default aReady;