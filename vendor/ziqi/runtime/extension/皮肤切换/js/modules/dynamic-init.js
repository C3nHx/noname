import { modifyDecadeUIContent } from '../weiweixiaoxi.js';
export function dynamicInit(lib, skinSwitch) {
    if (!lib.config[skinSwitch.configKey.useDynamic]) {
        return
    }
    if (!lib.config[skinSwitch.decadeKey.enable] && !lib.config[skinSwitch.decadeKey.dynamicSkin]) {
        // ●修复(2026-09-02): 客机端不再要求必须开启"十周年UI"相关配置才初始化动皮特效;
        //   只要本机已启用千幻聆音(modern动皮引擎)即继续。此前房主关闭全部扩展后,
        //   extension_十周年UI_* 配置随之失效, 客机整段特效管线(含logv拦截)被跳过, 只剩待机动皮、无任何攻击等特效。
        if (!(skinSwitch.game_hasExtension && skinSwitch.game_hasExtension('千幻聆音'))) {
            console.log('必须安装启用十周年UI与十周年动皮')
            return
        }
    }
    
    function updateDecadeDynamicSkin() {
        console.log('=== updateDecadeDynamicSkin 开始执行 ===');
        if (!skinSwitch.saveSkinParams) {
            console.log('saveSkinParams不存在，跳过应用');
            return;
        }
        console.log('当前saveSkinParams:', skinSwitch.saveSkinParams);

        for (let k in skinSwitch.saveSkinParams) {
            console.log(`处理角色: ${k}`);
            for (let m in skinSwitch.saveSkinParams[k]) {
                console.log(`  处理皮肤: ${m}`);
                if (decadeUI.dynamicSkin[k] && decadeUI.dynamicSkin[k][m]) {
                    console.log(`    找到对应的dynamicSkin配置`);
                    console.log(`    保存的参数:`, skinSwitch.saveSkinParams[k][m]);
                    let gongji = decadeUI.dynamicSkin[k][m].gongji
                    if (skinSwitch.saveSkinParams[k][m].gongji) {
                        if (typeof gongji === 'string') {
                            gongji = {
                                action: gongji
                            }
                        } else if (gongji === true) {
                            gongji = {}
                        } else if (typeof gongji !== 'object') {
                            gongji = {}
                        }
                        if (gongji) {
                            gongji = Object.assign(gongji, skinSwitch.saveSkinParams[k][m].gongji)
                        }
                    }
                    for (let assignK of ['x', 'y', 'scale', 'angle', 'daijiteshu', 'daijishan']) {
                        if (skinSwitch.saveSkinParams[k][m][assignK] != null) {
                            console.log(`      应用${assignK}参数:`, skinSwitch.saveSkinParams[k][m][assignK]);
                            decadeUI.dynamicSkin[k][m][assignK] = skinSwitch.saveSkinParams[k][m][assignK];
                            console.log(`      应用后的值:`, decadeUI.dynamicSkin[k][m][assignK]);
                        }
                    }
                    if (decadeUI.dynamicSkin[k][m].beijing && skinSwitch.saveSkinParams[k][m].beijing) {
                        decadeUI.dynamicSkin[k][m].beijing = Object.assign(decadeUI.dynamicSkin[k][m].beijing, skinSwitch.saveSkinParams[k][m].beijing)
                    }
                    if (decadeUI.dynamicSkin[k][m].qianjing && skinSwitch.saveSkinParams[k][m].qianjing) {
                        decadeUI.dynamicSkin[k][m].qianjing = Object.assign(decadeUI.dynamicSkin[k][m].qianjing, skinSwitch.saveSkinParams[k][m].qianjing)
                    }
                    if (gongji) {
                        decadeUI.dynamicSkin[k][m].gongji = gongji
                    }
                    if (skinSwitch.saveSkinParams[k][m].qhlx) {
                        decadeUI.dynamicSkin[k][m].qhlx = skinSwitch.saveSkinParams[k][m].qhlx
                    }
                    if (decadeUI.dynamicSkin[k][m].chuchang && skinSwitch.saveSkinParams[k][m].chuchang) {
                        decadeUI.dynamicSkin[k][m].chuchang = Object.assign(decadeUI.dynamicSkin[k][m].chuchang, skinSwitch.saveSkinParams[k][m].chuchang)
                    }
                    if (skinSwitch.saveSkinParams[k][m].teshu != null) {
                        if (typeof skinSwitch.saveSkinParams[k][m].teshu === 'string') {
                            decadeUI.dynamicSkin[k][m].teshu = skinSwitch.saveSkinParams[k][m].teshu
                        } else if (decadeUI.dynamicSkin[k][m].teshu && typeof decadeUI.dynamicSkin[k][m].teshu === 'object' && typeof skinSwitch.saveSkinParams[k][m].teshu === 'object') {
                            decadeUI.dynamicSkin[k][m].teshu = Object.assign(decadeUI.dynamicSkin[k][m].teshu, skinSwitch.saveSkinParams[k][m].teshu)
                        } else if (typeof skinSwitch.saveSkinParams[k][m].teshu === 'object') {
                            decadeUI.dynamicSkin[k][m].teshu = skinSwitch.saveSkinParams[k][m].teshu
                        }
                    }
                    if (decadeUI.dynamicSkin[k][m].hudong && skinSwitch.saveSkinParams[k][m].hudong) {
                        decadeUI.dynamicSkin[k][m].hudong = Object.assign(decadeUI.dynamicSkin[k][m].hudong, skinSwitch.saveSkinParams[k][m].hudong)
                    }
                    if (skinSwitch.saveSkinParams[k][m].play2 != null) {
                        decadeUI.dynamicSkin[k][m].play2 = skinSwitch.saveSkinParams[k][m].play2
                    }
                    if (skinSwitch.saveSkinParams[k][m].shan != null) {
                        decadeUI.dynamicSkin[k][m].shan = skinSwitch.saveSkinParams[k][m].shan
                    }
                    if (skinSwitch.saveSkinParams[k][m].daijiteshu != null) {
                        decadeUI.dynamicSkin[k][m].daijiteshu = skinSwitch.saveSkinParams[k][m].daijiteshu
                    }
                    if (skinSwitch.saveSkinParams[k][m].daijishan != null) {
                        decadeUI.dynamicSkin[k][m].daijishan = skinSwitch.saveSkinParams[k][m].daijishan
                    }
                }
            }
        }
        for (let k in decadeUI.dynamicSkin) {
            for (let skinName in decadeUI.dynamicSkin[k]) {
                try {
                    decadeUI.dynamicSkin[k][skinName].skinName = skinName
                } catch (e) {
                    let str = "";
                    str += k + ":" + skinName + "\n";
                    str += JSON.stringify(decadeUI.dynamicSkin[k][skinName]);
                    alert(str);
                }
            }
        }
        console.log('=== updateDecadeDynamicSkin 执行完成 ===');
    }
    
    function overrides(dest, src) {
        if (!src) return
        for (let key in src) {
            dest[key] = src[key];
        }
    }
    
    skinSwitch.updateDecadeDynamicSkin = updateDecadeDynamicSkin;

    skinSwitch.waitUntil(() => {
        return window.decadeUI && window.decadeModule && decadeUI.dynamicSkin
    }, () => {
        updateDecadeDynamicSkin()
    })

    skinSwitch.waitUntil(() => {
        return window.duilib && window.newDuilib
    }, () => {
        window.duilib = newDuilib
    })
    modifyDecadeUIContent(lib, skinSwitch)
}

