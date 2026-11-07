import { initChromeFix } from './js/utils/chrome-fix.js';
import { dynamicInit } from './js/modules/dynamic-init.js';
import { l2dInit } from './js/modules/l2d-init.js';
import { createSkinSwitchCore } from './js/core/skin-switch-core.js';
import { createFileManagerMethods } from './js/modules/file-manager.js';
import { createSkinUtilsMethods } from './js/modules/skin-utils.js';
import { createWaitUtils } from './js/utils/wait-utils.js';
import { createDragUtils } from './js/utils/drag-utils.js';
import { createTouchUtils } from './js/utils/touch-utils.js';
import { createDomHelpers } from './js/utils/dom-helpers.js';
import { createRendererMessage } from './js/modules/renderer-message.js';
import { createPostMsgApi } from './js/modules/post-msg-api.js';
import { createChukuangWorkerApi } from './js/modules/chukuang-worker-api.js';
import { createDynamicMethods } from './js/modules/dynamic.js';
import { createQhlyOpenSmallMethods } from './js/modules/qhly-open-small.js';
import { createPreviewDynamicMethods } from './js/modules/preview-dynamic.js';
import { createEditBoxInitMethods } from './js/modules/edit-box-init.js';
import { createFileCheckUtils } from './js/utils/file-check-utils.js';
import { createCoordinateUtils } from './js/utils/coordinate-utils.js';
import { createAudioManagerMethods } from './js/modules/audio-manager.js';
import { createPlayerInitMethods } from './js/modules/player-init.js';
import { createEffectsConfig } from './js/modules/effects-config.js';
import { createExtensionConfig } from './js/config/extension-config.js';
import { createExtensionPackage } from './js/config/extension-package.js';
game.import("extension", function (lib, game, ui, get, ai, _status) {
    window.skinSwitch = createSkinSwitchCore(lib, game, ui, get);
    const skinSwitch = window.skinSwitch;
    return {
        name: "皮肤切换",
        content: function (config, pack) {
            /*●原因：联机(connect)模式下 game.js 会跳过扩展的 content 函数，本扩展初始化已移至 precontent 执行*/
            initChromeFix();
        },
        precontent: function () {
            /*●*/
		    delete lib.extensionMenu['extension_皮肤切换'].edit;
            if(!(lib.config.extensions.includes('千幻聆音')&&lib.config['extension_千幻聆音_enable'])){
                game.saveConfig("extension_皮肤切换_enable",false);
                //game.saveConfig("extension_十周年UI_dynamicSkin",false);
                alert('您未开启【千幻聆音】扩展，为避免游戏报错，已自动关闭【皮肤切换】扩展。');
                setTimeout(() => game.reload(), 100);
            }
            lib.init.js(lib.assetURL + 'extension/皮肤切换/settings.js', null, function () {
                if (typeof showTopArc !== 'undefined') {
                    window.showTopArc = showTopArc;
                } else {
                    window.showTopArc = true;
                }
                if (lib.config[skinSwitch.configKey.showTopArc] !== undefined) {
                    window.showTopArc = lib.config[skinSwitch.configKey.showTopArc];
                }
            });
            Object.assign(window.skinSwitch, 
                createFileManagerMethods(lib, game, ui, skinSwitch),
                createSkinUtilsMethods(lib, get, skinSwitch),
                createWaitUtils(),
                createDragUtils(lib),
                createTouchUtils(lib, ui, _status),
                createDomHelpers(),
                createRendererMessage(),
                createPostMsgApi(lib, game, _status),
                createChukuangWorkerApi(lib, ui, game, _status),
                createDynamicMethods(lib, game, ui, skinSwitch),
                createQhlyOpenSmallMethods(lib, game, ui, _status, skinSwitch),
                createPreviewDynamicMethods(lib, game, ui, skinSwitch),
                createEditBoxInitMethods(lib, game, ui, get, _status, skinSwitch),
                createFileCheckUtils(game, skinSwitch),
                createCoordinateUtils(skinSwitch),
                createAudioManagerMethods(game, skinSwitch),
                createPlayerInitMethods(lib, game, get, skinSwitch),
                createEffectsConfig(),
                {
                selectSkinData: {
                    temp: "",
                    value: "",
                },
                filterSkills: [
                    'zhangba_skill', 'guding_skill',
                    'zhuque_skill', 'hanbing_skill',
                    'guanshi_skill', 'cixiong_skill',
                    'fangtian_skill', 'qilin_skill',
                    'qinggang_skill', 'zhuge_skill',
                    'bagua_skill', 'bahu',
                ],
            });
            skinSwitch.lib = lib
            skinSwitch.game = game
            skinSwitch.ui = ui
            skinSwitch.get = get

            skinSwitch.dynamic.selectSkin.cd = true;

            const cssFiles = [
                { path: skinSwitch.url + "style", name: "base" },
                { path: skinSwitch.url + "style", name: "edit" },
                { path: skinSwitch.url + "component", name: "iconfont" },
                { path: skinSwitch.url + "component", name: "message" },
                { path: skinSwitch.url + "style", name: "light-modal" }
            ];
            cssFiles.forEach(file => lib.init.css(file.path, file.name));
            if (lib.config[skinSwitch.configKey.useDynamic]) {
                lib.init.css(skinSwitch.url + "style", "dynamic");
            }

            lib.init.js(skinSwitch.url, 'saveSkinParams', function () {
                if (typeof window.skinSwitchLoadParams === 'function') {
                    window.skinSwitchLoadParams(lib, game, ui, get, ai, _status);
                }
            }, function () {
                skinSwitch.saveSkinParams = {}
            });
            lib.init.js(skinSwitch.url, 'animation')
            lib.init.js(skinSwitch.url + 'component', 'any-touch.umd.min')
            const loadSpineFiles = (files, index = 0) => {
                if (index >= files.length) return;
                const file = files[index];
                lib.init.js(file.path, file.name, () => {
                    loadSpineFiles(files, index + 1);
                });
            };
            skinSwitch.waitUntil(() => window.spine, () => {
                const spineFiles = [
                    { path: skinSwitch.url, name: 'spine' },
                    { path: skinSwitch.url + 'spine-lib', name: 'spine_4_0_64' },
                    { path: skinSwitch.url + 'spine-lib', name: 'spine_3_8' },
                    { path: skinSwitch.url + 'spine-lib', name: 'spine_4_1' },
                    { path: skinSwitch.url + 'spine-lib', name: 'spine_4_2' },
                    { path: skinSwitch.url, name: 'animations' },
                    { path: skinSwitch.url + 'spine-lib', name: 'spine_3_5_35' },
                    { path: skinSwitch.url + 'spine-lib', name: 'spine_3_7' }
                ];
                loadSpineFiles(spineFiles, 0);
            })
            lib.init.js(skinSwitch.url, 'effects', function () {
                for (let k in pfqhSkillEffect) {
                    for (let i = 0; i < pfqhSkillEffect[k].length; i++) {
                        lib.skill[`__pfqh_${k}_${i}`] = pfqhSkillEffect[k][i]
                    }
                }
            })
            lib.arenaReady.push(function () {
                const showWarning = (text) => {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: text,
                        duration: 1500,
                        closeable: false
                    });
                };

                const initEditMenu = () => {
                    if (!lib.config[skinSwitch.configKey.showEditMenu]) return;
                    ui.create.system('编辑动皮参数', function () {
                        setTimeout(function () {
                            if (!lib.config[skinSwitch.configKey.useDynamic]) {
                                showWarning('请先打开动皮功能');
                                return;
                            }
                            if (!game.me) return;
                            const player = game.me;
                            if (!player.dynamic || !player.dynamic.primary) {
                                showWarning('只能当前角色是动皮才可编辑参数');
                                return;
                            }
                            if (get.mode() === 'guozhan' || player.name2 !== undefined) {
                                showWarning('只能在单将模式下编辑参数');
                                return;
                            }
                            window.dynamicEditBox = skinSwitch.editBoxShowOrHide();
                        }, 100);
                    }, true);
                };
                lib.init.js(skinSwitch.url, 'pfqhUtils', function () {
                    initEditMenu();
                    if (lib.config[skinSwitch.configKey.showPreviewDynamicMenu]) {
                        ui.create.system('预览spine', () => skinSwitch.previewDynamic(), true);
                    }
                }, function (err) {
                    console.log(err);
                });

                const msgContainer = ui.create.div(document.getElementById('arena'));
                msgContainer.id = 'message-container';
                lib.init.js(skinSwitch.url + 'component', 'message', () => {
                    window.skinSwitchMessage = new SkinSwitchMessage();
                });
            })

            /*●联机兼容*/
            const adjustBoxStyle = document.createElement('link')
            adjustBoxStyle.rel = 'stylesheet'
            adjustBoxStyle.href = lib.assetURL + 'extension/皮肤切换/style/adjustBox.css'
            document.head.appendChild(adjustBoxStyle)
            dynamicInit(lib, skinSwitch)
            l2dInit(skinSwitch)

        },
        config: createExtensionConfig(lib, game, skinSwitch),
        help: {},
        package: createExtensionPackage(),
        files: { "character": [], "card": [], "skill": [] }
    }
})