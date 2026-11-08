export function createSkinSwitchCore(lib, game, ui, get) {
    return {
        name: "皮肤切换",
        version: 1.11,
        url: lib.assetURL + "extension/皮肤切换/",
        path: 'extension/皮肤切换',
        dcdPath: 'extension/十周年UI',
        dcdUrl: lib.assetURL + "extension/十周年UI",
        qhlyUrl: lib.assetURL + "extension/千幻聆音",
        configKey: {
            'bakeup': 'extension_皮肤切换_bakeup',
            'dynamicSkin': 'extension_皮肤切换_dynamicSkin',
            'showEditMenu': 'extension_皮肤切换_showEditMenu',
            'showPreviewDynamicMenu': 'extension_皮肤切换_showPreviewDynamicMenu',
            'hideHuanFu': 'extension_皮肤切换_hideHuanFu',
            'useDynamic': 'extension_皮肤切换_useDynamic',
            'isAttackFlipX': 'extension_皮肤切换_isAttackFlipX',
            'cugDynamicBg': 'extension_皮肤切换_cugDynamicBg',
            'lastPreviewPath': 'extension_皮肤切换_lastPreviewPath',
            'savedPositions': 'extension_皮肤切换_savedPositions',
            'attackEffect': 'extension_皮肤切换_attackEffect',
            'showTopArc': 'extension_皮肤切换_showTopArc',
            'allowNonCurrentPhaseAttack': 'extension_皮肤切换_allowNonCurrentPhaseAttack',
        },
        decadeKey: {
            'dynamicSkin': 'extension_十周年UI_dynamicSkin',
            'newDecadeStyle': 'extension_十周年UI_newDecadeStyle',
            'enable': 'extension_十周年UI_enable',
        },
        'huanfu': {
            'name': "../../../皮肤切换/images/huanfu/huanfu",
            loop: false,
            scale: 0.5,
            speed: 1.5
        },
        game_hasExtension: function (str) {
            if (!str || typeof str != 'string') return false;
            if (lib.config && lib.config.extensions) {
                for (var i of lib.config.extensions) {
                    if (i.indexOf(str) == 0) {
                        if (lib.config['extension_' + i + '_enable']) return true;
                    }
                }
            }
            return false;
        },
        bodySize: function () {
            let size = {}
            let body = document.body
            size.updated = true
            size.height = body.clientHeight
            size.width = body.clientWidth
            return size;
        },
        qhly_checkFileExist: function (path, callback) {
            //●电脑端纯浏览器无 lib.node.fs，有 node fs 走读盘, 否则浏览器 HEAD 探测 lib.assetURL+path。
            try {
                if (lib.node && lib.node.fs && typeof lib.node.fs.existsSync === 'function') {
                    game.checkFile(path, (result) => callback(result === 0 || result === 1));
                    return;
                }
            } catch (e) {}
            try {
                var url = lib.assetURL + (path && path.charAt(0) === '/' ? path.slice(1) : path);
                var xhr = new XMLHttpRequest();
                xhr.open('HEAD', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) callback(xhr.status >= 200 && xhr.status < 400);
                };
                xhr.onerror = function () { callback(false); };
                xhr.send();
            } catch (e2) {
                callback(false);
            }
        },
        checkFilesExistAndReturnOne: function (paths, callback) {
            let tryCheck = (index) => {
                if (index >= paths.length) return callback(null)
                this.qhly_checkFileExist(paths[index], (exists) => {
                    if (exists) return callback(paths[index])
                    tryCheck(index + 1)
                })
            }
            tryCheck(0)
        },
        isMobile: function () {
            return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|OperaMini/i.test(navigator.userAgent));
        },
        getCoordinate: function (domNode, subtr) {
            if (!domNode && !decadeUI) return false;
            var rect = domNode.getBoundingClientRect();
            return {
                x: rect.left,
                y: decadeUI.get.bodySize().height - (subtr ? rect.bottom : 0),
                width: rect.width,
                height: rect.height,
                bodyWidth: decadeUI.get.bodySize().width,
                bodyHeight: decadeUI.get.bodySize().height,
            };
        },
        getDirection: function (dom, sl) {
            var width = document.body.clientWidth / 2;
            var pos = this.getCoordinate(dom, true);
            var isLeft = pos.x >= width ? false : true;
            if (sl) {
                if (isLeft) {
                    return { x: [0, 1.2], y: [0, 0], isLeft: isLeft };
                } else return { x: [0, -0.1], y: [0, 0], isLeft: isLeft };
            } else {
                if (isLeft) {
                    return { x: [0, 0.4], y: [0, 0.5], isLeft: isLeft };
                } else return { x: [0, 0.63], y: [0, 0.5], isLeft: isLeft };
            }
        },
        addProgress: function (obj, value, total) {
            var progress = Math.floor(value / total * 100);
            obj.style.backgroundSize = progress + "% 100%";
        },
        getDynamicSkin: function (skinName, playerName) {
            if (!playerName) return false;
            var dskins = decadeUI.dynamicSkin;
            var skins = dskins[playerName];
            if (skins) {
                if (skinName) return skins[skinName];
                else {
                    let ps
                    if (lib.config[this.configKey.dynamicSkin]) {
                        ps = lib.config[this.configKey.dynamicSkin][playerName]
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
        },
        createYH: function (group) {
            var yh = document.createElement("img");
            yh.src = this.url + "/images/border/" + group + ".png";
            yh.classList.add("skinYh");
            yh.style.display = "block";
            yh.style.position = "absolute";
            yh.style.top = "-22px";
            yh.style.height = "50px";
            yh.style.width = "131.1px";
            yh.style.zIndex = "61";
            yh.onerror = function () {
                this.src = this.url + "/images/border/weizhi.png";
                console.log("势力图标加载失败，使用默认图标");
            }.bind(this);

            if (typeof window.showTopArc !== 'undefined' && !window.showTopArc) {
                yh.style.display = "none";
            }

            return yh;
        },
        continuousClick: function (dom, func) {
            const downEvent = lib.config.touchscreen ? 'touchstart' : 'mousedown'
            const upEvent = lib.config.touchscreen ? 'touchend' : 'mouseup'
            const cancelEvent = lib.config.touchscreen ? 'touchcancel' : 'mouseleave'

            let downFunc = function (e) {
                let t = setInterval((e) => { func(e, ++downFunc._times) }, 120)
                clearInterval(downFunc.timer)
                downFunc.timer = t
                downFunc._times = 0
                func(e, ++downFunc._times)
            }
            let holdUp = function () {
                clearInterval(downFunc.timer);
                downFunc._times = 0
            }

            dom.addEventListener(downEvent, downFunc)
            dom.addEventListener(upEvent, holdUp)
            dom.addEventListener(cancelEvent, holdUp)
        }
    };
}

