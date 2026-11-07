export function createSkinUtilsMethods(lib, get, skinSwitch) {
    return {
        skinSwitchCheckYH: function (player, forces) {
            if (lib.config['extension_十周年UI_newDecadeStyle'] == "on") return;
            if (!player || get.itemtype(player) != 'player') return;

            if (typeof window.showTopArc !== 'undefined' && !window.showTopArc) {
                let skinYh = player.getElementsByClassName("skinYh");
                if (skinYh.length > 0) {
                    player.removeChild(skinYh[0]);
                }
                return;
            }
            let group = forces || player.group || 'weizhi';
            let isYh = false;
            if (player.dynamic) {
                if (player.dynamic.primary && !player.isUnseen(0)) isYh = true;
                if (player.dynamic.deputy && !player.isUnseen(1)) isYh = true;
            }

            let skinYh = player.getElementsByClassName("skinYh");
            if (isYh && skinYh.length == 0) {
                let yh = skinSwitch.createYH(group);
                player.appendChild(yh);
            }
            else if (!isYh && skinYh.length > 0) {
                player.removeChild(skinYh[0]);
            }
            else if (isYh && skinYh.length > 0) {
                let yh = skinYh[0];
                let srcPath = yh.src || '';
                let splits = srcPath.split('/');
                let sub = splits[splits.length - 1];
                let curGroup = sub.split('.')[0];

                if (curGroup !== group) {
                    skinYh[0].remove();
                    let newYh = skinSwitch.createYH(group);
                    player.appendChild(newYh);
                }
            }
        },
        getDynamicSkin: function (skinName, playerName) {
            if (!playerName) return false;
            var dskins = decadeUI.dynamicSkin;
            var skins = dskins[playerName];
            if (skins) {
                if (skinName) return skins[skinName];
                else {
                    let ps
                    if (lib.config[skinSwitch.configKey.dynamicSkin]) {
                        ps = lib.config[skinSwitch.configKey.dynamicSkin][playerName]
                    }
                    if (ps) return skins[ps];
                    else return skins[Object.keys(skins)[0]]
                }
            } else return false;
        },
        actionFilter: function (actions, action) {
            var res = false;
            for (var actionKey of actions) {
                if (actionKey == action) {
                    return res = true;
                }
            }
            return res;
        }
    };
}

