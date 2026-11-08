// qhly_open_small 模块 - 千幻聆音小窗皮肤切换功能
export function createQhlyOpenSmallMethods(lib, game, ui, _status, skinSwitch) {
    return {
        qhly_open_small: function (name, player, isPrimary) {
            if (_status.qhly_open) return;
            _status.qhly_open = true;
            let background = ui.create.div('.pfqh-qh-skinchange-background', document.body);
            let backgroundBack = ui.create.div('.pfqh-qh-skinchange-background', background);
            let dialog = ui.create.div('.pfqh-qh-skinchange-dialog', background);
            let dragHandle = ui.create.div('.skin-drag-handle', dialog);
            dragHandle.title = '拖拽移动千幻小窗';
            let exit = ui.create.div('.pfqh-qh-skinchange-exit', dialog);
            let cover = ui.create.div('.pfqh-qh-skinchange-cover', dialog);
            let content = ui.create.div('.pfqh-qh-skinchange-area', cover);
            let enlarge = ui.create.div('.pfqh-qh-skinchange-enlarge', dialog);
            let swipe_up = lib.config.swipe_up;
            lib.config.swipe_up = '';
            let swipe_down = lib.config.swipe_down;
            lib.config.swipe_down = '';
            let swipe_left = lib.config.swipe_left;
            lib.config.swipe_left = '';
            let swipe_right = lib.config.swipe_right;
            lib.config.swipe_right = '';
            let exitListener = function () {
                lib.config.swipe_up = swipe_up;
                lib.config.swipe_down = swipe_down;
                lib.config.swipe_left = swipe_left;
                lib.config.swipe_right = swipe_right;

                // 关闭所有动画
                am.stopSpineAll()
                // for (let k in am.animations) {
                //     if (am.animations[k]) {
                //         am.animations[k].nodes = []
                //         let webglExt = am.animations[k].gl.getExtension('WEBGL_lose_context')
                //         if (webglExt) {
                //             webglExt.loseContext()
                //         }
                //     }
                // }

                if (!_status.qhly_open) return;
                background.delete();
                delete _status.qhly_open;
            }

            // 创建canvas
            let d = ui.create.div('.pfqh-small-dynamic-skin-wrap', cover)
            // 缓存小窗的加载资源
            if (!skinSwitch.smallWindowAm) {
                let skinCanvas = document.createElement('canvas')
                skinSwitch.smallWindowAm = new AnimationManager(lib.assetURL + 'extension/十周年UI/assets/dynamic/', skinCanvas, 33321, { offscreen: false })
                skinCanvas.style.height = '100%'
                skinCanvas.style.width = '100%'
            }
            let am = skinSwitch.smallWindowAm
            let skinCanvas = am.canvas
            d.appendChild(skinCanvas)
            let coverSize = cover.getBoundingClientRect()
            am.updateSpineAll({ width: coverSize.width, height: coverSize.height, dpr: Math.max(self.devicePixelRatio * (self.documentZoom ? self.documentZoom : 1), 1) })

            let viewState = {
                offset: 0,
                skinTotalWidth: 500,
                skinPerWidth: 120,
                skinPerHeight: 200,  // 默认露头
                jingdongWidth: 100,
                jingdongHeight: 44,
                skinGap: 10,
                skins: [],
                skinViews: [],
                visibleWidth: function () {
                    var rect = cover.getBoundingClientRect();
                    return rect.width;
                },
                content: content,
                refresh: function () {
                    this.content.style.width = Math.round(this.skinTotalWidth) + 'px';
                    this.content.style.left = Math.round(this.offset) + "px";
                },
                refreshSkins: function () {
                    for (let i = 0; i < this.skinViews.length; i++) {
                        let skinView = this.skinViews[i];
                        let skin = this.skins[i];

                        if (skinSwitch.game_hasExtension('千幻聆音')) {
                            if (game.qhly_skinIs(name, skin)) {
                                skinView.belowText.style.textShadow = '.2rem 0rem .5rem red,-.2rem 0rem .5rem red,0rem .2rem .5rem red,0rem -.2rem .5rem red';
                            } else {
                                skinView.belowText.style.textShadow = '.2rem 0rem .5rem blue,-.2rem 0rem .5rem blue,0rem .2rem .5rem blue,0rem -.2rem .5rem blue';
                            }
                        } else {
                            if (skin === currentSelect) {
                                skinView.belowText.style.textShadow = '.2rem 0rem .5rem red,-.2rem 0rem .5rem red,0rem .2rem .5rem red,0rem -.2rem .5rem red';
                            } else {
                                skinView.belowText.style.textShadow = '.2rem 0rem .5rem blue,-.2rem 0rem .5rem blue,0rem .2rem .5rem blue,0rem -.2rem .5rem blue';
                            }
                        }
                    }
                },
                handleMouseDown: function (x, y) {
                    if (this.skinTotalWidth <= this.visibleWidth()) {
                        return;
                    }
                    this.mouseDownX = x;
                    this.mouseDownY = y;
                    this.isTouching = true;
                    this.cancelClick = false;
                },
                handleMouseMove: function (x, y) {
                    if (this.isTouching) {
                        var slideX = x - this.mouseDownX;
                        this.tempoffset = this.offset + slideX;
                        if (this.tempoffset > 0) {
                            this.tempoffset = 0;
                        } else if (this.skinTotalWidth - this.visibleWidth() < -this.tempoffset) {
                            this.tempoffset = -(this.skinTotalWidth - this.visibleWidth());
                        }
                        this.content.style.left = Math.round(this.tempoffset) + "px";
                        return true;
                    }
                },
                handleMouseUp: function (x, y) {
                    if (this.isTouching) {
                        this.isTouching = false;
                        if (x && y) {
                            var slideX = x - this.mouseDownX;
                            this.tempoffset = this.offset + slideX;
                            if (this.tempoffset > 0) {
                                this.tempoffset = 0;
                            } else if (this.skinTotalWidth - this.visibleWidth() < -this.tempoffset) {
                                this.tempoffset = -(this.skinTotalWidth - this.visibleWidth());
                            }
                        }
                        this.cancelClick = Math.abs(this.offset - this.tempoffset) > 50;
                        this.content.style.left = Math.round(this.tempoffset) + "px";
                        this.offset = this.tempoffset;
                    } else {
                        this.cancelClick = false;
                    }
                    this.previousX = this.mouseDownX;
                    this.previousY = this.mouseDownY;
                    delete this.mouseDownX;
                    delete this.mouseDownY;
                }
            };
            if (lib.config.touchscreen) {
                content.addEventListener('touchstart', function (event) {
                    if (event.touches && event.touches.length) {
                        viewState.handleMouseDown(event.touches[0].clientX, event.touches[0].clientY);
                    }
                });
                content.addEventListener('touchend', function (event) {
                    viewState.handleMouseUp();
                });
                content.addEventListener('touchcancel', function (event) {
                    viewState.handleMouseUp();
                });
                content.addEventListener('touchmove', function (event) {
                    if (event.touches && event.touches.length)
                        viewState.handleMouseMove(event.touches[0].clientX, event.touches[0].clientY);
                });
            } else {
                content.addEventListener('mousewheel', function (event) {
                    viewState.handleMouseDown(event.clientX, event.clientY);
                    if (event.wheelDelta > 0) {
                        viewState.handleMouseMove(event.clientX - 30, event.clientY);
                        viewState.handleMouseUp(event.clientX - 30, event.clientY);
                    } else {
                        viewState.handleMouseMove(event.clientX + 30, event.clientY);
                        viewState.handleMouseUp(event.clientX + 30, event.clientY);
                    }
                });
                content.addEventListener('mousedown', function (event) {
                    viewState.handleMouseDown(event.clientX, event.clientY);
                });
                content.addEventListener('mouseup', function (event) {
                    viewState.handleMouseUp(event.clientX, event.clientY);
                });
                content.addEventListener('mouseleave', function (event) {
                    viewState.handleMouseUp(event.clientX, event.clientY);
                });
                content.addEventListener('mousemove', function (event) {
                    viewState.handleMouseMove(event.clientX, event.clientY);
                });
            }

            // 首先所有动皮
            const dskins = decadeUI.dynamicSkin;
            const skins = dskins[name];
            let keys = skins && Object.keys(skins) || []
            let dynamicSkinKey = skinSwitch.configKey.dynamicSkin
            let build_id = 0
            let beijing_id = 888888
            let qianjing_id = 999999

            let skinInfoMap = { '__default': { skinName: null } }

            let currentSelect = null // 当前选择的动皮名称
            if (lib.config[dynamicSkinKey]) {
                let ps = lib.config[dynamicSkinKey][name];
                if (ps !== 'none') currentSelect = ps + '.jpg'
            }
            // 没有包含千幻, 暂时不设置静皮, 静皮用小杀代替, 以后可能用系统默认皮肤代替
            keys.map(name => {
                skinInfoMap[name] = {
                    staticImg: "url(" + skinSwitch.url + "/images/character/小杀.png)",
                    dynamic: true,
                    dynamicState: true,  // 当前是否处于动皮小窗状态
                    imgName: name + '.jpg',  // 默认的图片设置
                    skinName: skins[name].skinName || name,
                    isDefault: true,
                }
                // 检测动皮目录下是否有使用
                let skinPath = skins[name].name
                let lastIdx = skinPath.lastIndexOf('/')
                let foldPath
                if (lastIdx === -1) {
                    foldPath = ''
                } else {
                    foldPath = skinPath.slice(0, lastIdx)
                }
                let path = skinSwitch.dcdPath + '/assets/dynamic/' + foldPath + '/' + skins[name].skinName + '.jpg'
                // 如果该皮肤存在, 那么设置该皮肤为静态皮肤
                skinSwitch.qhly_checkFileExist(path, exists => {
                    if (exists) {
                        skinInfoMap[name].staticImg = 'url("' + lib.assetURL + path + '")'
                    }
                })
            })

            let updateSkinInfo = staticImgs => {
                if (!staticImgs) staticImgs = []
                // 将动皮放上.
                let skinSet = new Set()
                staticImgs.map(img => {
                    let imgKey = img.substring(0, img.lastIndexOf("."))
                    if (skinSet.has(imgKey)) return
                    skinSet.add(imgKey)
                    if (imgKey in skinInfoMap) {
                        skinInfoMap[imgKey].imgName = img  // 更新一下图片背景
                        skinInfoMap[imgKey].isDefault = false
                    } else {
                        skinInfoMap[imgKey] = {
                            // staticImg: "url(" + skinSwitch.url + "/images/character/小杀.png)",
                            dynamic: false,
                            imgName: img,  // 这个是用于千幻这种的
                            skinName: imgKey
                        }
                    }
                })
            }

            let playDynamic = (skinView, skinParams) => {
                let sprite = Object.assign({}, skinParams)
                sprite.loop = true
                sprite.viewportNode = skinView
                sprite.id = build_id++
                if (sprite.beijing) {
                    sprite.beijing = Object.assign({}, sprite.beijing)
                    sprite.beijing.viewportNode = skinView
                }
                if (sprite.qianjing) {
                    sprite.qianjing = Object.assign({}, sprite.qianjing)
                    sprite.qianjing.viewportNode = skinView
                }

                sprite.player = sprite;
                skinView.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + sprite.background + '")'

                let dynamic = am.getAnimation(sprite.player.version)
                let beijingDynamic
                if (sprite.player && sprite.player.beijing != null) {
                    beijingDynamic = am.getAnimation(sprite.player.beijing.version || sprite.player.version)
                }
                let qianjingDynamic
                if (sprite.player && sprite.player.qianjing != null) {
                    qianjingDynamic = am.getAnimation(sprite.player.qianjing.version || sprite.player.version)
                }

                let loadDaiJi = () => {
                    if (!dynamic.hasSpine(sprite.name)) {
                        dynamic.loadSpine(sprite.name, sprite.player.json ? 'json' : 'skel', () => {
                            // 加载后播放背景和待机
                            if (sprite.player.beijing) {
                                runBeijing()
                            } else {
                                run1()
                            }

                            if (sprite.player.qianjing) {
                                runqianjing()
                            } else {
                                run2()
                            }
                        })
                    } else {
                        if (sprite.player.beijing) {
                            runBeijing()
                        }
                        if (sprite.player.qianjing) {
                            runqianjing()
                        } else {
                            run1()
                            run2()
                        }
                    }

                }
                let loadBeiJingDaiJi = () => {
                    if (!beijingDynamic.hasSpine(sprite.player.beijing.name)) {
                        beijingDynamic.loadSpine(sprite.player.beijing.name, sprite.player.beijing.json ? 'json' : 'skel', () => {
                            // 加载后播放背景和待机
                            loadDaiJi()
                        })
                    } else {
                        loadDaiJi()
                    }
                }
                let run1 = function (beijingNode) {
                    let t = dynamic.playSpine(sprite)
                    t.opacity = 0
                    t.beijingNode = beijingNode

                    let skins = t.skeleton.data.skins
                    if (sprite.player.skin) {
                        let skinFound = false;
                        for (let i = 0; i < skins.length; i++) {
                            if (skins[i].name === sprite.player.skin) {
                                // 设置skin
                                try {
                                    t.skeleton.setSkinByName(skins[i].name);
                                    t.skeleton.setSlotsToSetupPose();
                                    skinFound = true;
                                } catch (e) {
                                    console.warn('Failed to set skin:', skins[i].name, e);
                                }
                                break;
                            }
                        }
                        // 如果指定的皮肤不存在，尝试使用默认皮肤或第一个可用皮肤
                        if (!skinFound && skins.length > 0) {
                            try {
                                // 优先尝试使用默认皮肤
                                if (t.skeleton.data.defaultSkin) {
                                    t.skeleton.setSkin(t.skeleton.data.defaultSkin);
                                } else {
                                    // 如果没有默认皮肤，使用第一个可用皮肤
                                    t.skeleton.setSkinByName(skins[0].name);
                                }
                                t.skeleton.setSlotsToSetupPose();
                            } catch (e) {
                                console.warn('Failed to set fallback skin:', e);
                            }
                        }
                    }

                    let labels = getAllActionLabels(t)
                    let jinchangLabel = 'ChuChang'  // 默认的进场标签
                    if (t.player.ss_jinchang) {
                        jinchangLabel = t.player.ss_jinchang
                    }
                    if (labels.includes(jinchangLabel)) {
                        // 清空原来的state状态, 添加出场
                        t.skeleton.state.setEmptyAnimation(0, 0);
                        t.skeleton.state.setAnimation(0, jinchangLabel, false, 0);
                        if (t.player.action && t.player.action !== jinchangLabel) {
                            t.skeleton.state.addAnimation(0, t.player.action, true, -0.01);
                            t.action = t.player.action
                        } else {
                            for (let defaultDaiJi of ['DaiJi', 'play']) {
                                let da = getLabelIgnoreCase(t, defaultDaiJi)
                                if (da) {
                                    t.skeleton.state.addAnimation(0, da, true, -0.01);
                                    t.player.action = da
                                    t.action = da
                                }
                            }
                        }
                    }

                    let daijiActioh = t.action || t.skeleton.defaultAction
                    let setAnimation = () => {
                        // 如果包含Teshu或者play2. 那么接着播放这两个标签
                        for (let lab of ['TeShu', 'play2']) {
                            if (labels.includes(lab) && lab !== daijiActioh) {
                                t.skeleton.state.addAnimation(0, lab, false, 0).listener = {
                                    complete: function (trackIndex) {
                                        t.skeleton.state.addAnimation(0, daijiActioh, true, 0)
                                        setAnimation()
                                    }
                                }
                                break
                            }

                        }
                    }
                    setAnimation()

                    // 重置一下背景和待机的时间
                    if (beijingNode) {
                        beijingNode.skeleton.state.tracks[0].trackTime = 0;
                        t.skeleton.state.tracks[0].trackTime = 0;
                        beijingNode.opacity = 1;
                    }
                    if (qianjingNode) {
                        qianjingNode.skeleton.state.tracks[0].trackTime = 0;
                        t.skeleton.state.tracks[0].trackTime = 0;
                        qianjingNode.opacity = 1;
                    }
                    sortNodes();
                    t.opacity = 1;

                    // 保存当前view的node节点
                    skinView.node = t
                }

                // 获取骨骼的所有action标签
                let getAllActionLabels = node => {
                    // 获取所有actions
                    let animations = node.skeleton.data.animations;
                    let res = []
                    for (let ani of animations) {
                        res.push(ani.name)
                    }
                    return res
                }

                // 获取标签, 忽略大小写
                let getLabelIgnoreCase = (node, label) => {
                    if (!label) return ''
                    let animations = node.skeleton.data.animations;
                    let lowerCaseLabel = label.toLowerCase()
                    for (let ani of animations) {
                        if (ani.name.toLowerCase() === lowerCaseLabel) {
                            return ani.name
                        }
                    }
                    return ''
                }

                let runBeijing = () => {
                    sprite.player.beijing.loop = true
                    sprite.player.beijing.id = beijing_id++
                    if (sprite.player.beijing.alpha == null)
                        sprite.player.beijing.alpha = sprite.player.alpha

                    // 如果是双将的话, 复制裁剪.
                    if (!sprite.player.beijing.clip && sprite.clip) {
                        sprite.player.beijing.clip = sprite.clip
                    }
                    let node
                    try {
                        node = beijingDynamic.playSpine(sprite.player.beijing)
                        node.isbeijing = true
                    } catch (e) {
                        console.error(e)
                    }

                    // 获取所有actions
                    let chuChangLabel = ''
                    let labels = getAllActionLabels(node)
                    for (let label of labels) {
                        let lowerLabel = label.toLowerCase()
                        if (lowerLabel === 'chuchang') {
                            chuChangLabel = label
                            break
                        }
                    }
                    // 查找背景是否也有出场标签
                    if (chuChangLabel) {
                        node.skeleton.state.setAnimation(0, chuChangLabel, false, 0);
                        // 获取所有actions

                        for (let label of labels) {
                            let lowerLabel = label.toLowerCase()
                            for (let daijiName of ['DaiJi', 'BeiJing', 'play']) {
                                if (daijiName.toLowerCase() === lowerLabel) {
                                    node.skeleton.state.addAnimation(0, label, true, -0.01);
                                    node.action = label
                                    break
                                }
                            }
                        }
                    }
                    // 检查当前节点是否存在位于背景层下的node, 提上来
                    sortNodes()
                    run1(node)
                }
                let runqianjing = () => {
                    sprite.player.qianjing.loop = true
                    sprite.player.qianjing.id = qianjing_id++
                    if (sprite.player.qianjing.alpha == null)
                        sprite.player.qianjing.alpha = sprite.player.alpha

                    // 如果是双将的话, 复制裁剪.
                    if (!sprite.player.qianjing.clip && sprite.clip) {
                        sprite.player.qianjing.clip = sprite.clip
                    }
                    let node
                    try {
                        node = qianjingDynamic.playSpine(sprite.player.qianjing)
                        node.isqianjing = true
                    } catch (e) {
                        console.error(e)
                    }

                    // 获取所有actions
                    let chuChangLabel = ''
                    let labels = getAllActionLabels(node)
                    for (let label of labels) {
                        let lowerLabel = label.toLowerCase()
                        if (lowerLabel === 'chuchang') {
                            chuChangLabel = label
                            break
                        }
                    }
                    // 查找背景是否也有出场标签
                    if (chuChangLabel) {
                        node.skeleton.state.setAnimation(0, chuChangLabel, false, 0);
                        // 获取所有actions

                        for (let label of labels) {
                            let lowerLabel = label.toLowerCase()
                            for (let daijiName of ['DaiJi', 'Chuchang', 'play']) {
                                if (daijiName.toLowerCase() === lowerLabel) {
                                    node.skeleton.state.addAnimation(0, label, true, -0.01);
                                    node.action = label
                                    break
                                }
                            }
                        }
                    }
                    // 检查当前节点是否存在位于背景层下的node, 提上来
                    sortNodes()
                    run2(node)
                }

                let run2 = function (qianjingNode) {
                    // run2 函数用于处理前景层
                    if (qianjingNode) {
                        qianjingNode.skeleton.state.tracks[0].trackTime = 0;
                    }
                }

                let sortNodes = () => {
                    dynamic.nodes.sort((a, b) => {
                        return b.id - a.id
                    })
                }
                if (sprite.beijing) {
                    loadBeiJingDaiJi()
                } else {
                    loadDaiJi()
                }
            }

            let setStaticSkin = () => {
                // 设置静皮
                let bool1 = isPrimary, bool2 = !isPrimary
                if (player && player.dynamic) {
                    player.stopDynamic(bool1, bool2)
                    let obj = player.getElementsByClassName((bool1 ? 'primary' : 'deputy') + "-avatar")[0]
                    if (obj) {
                        obj.style.opacity = 1
                    }
                }
                // 选择静皮还原
                let dynamicSkinKey = skinSwitch.configKey.dynamicSkin
                if (!lib.config[dynamicSkinKey]) lib.config[dynamicSkinKey] = {}
                lib.config[dynamicSkinKey][name] = 'none'
                game.saveConfig(dynamicSkinKey, lib.config[dynamicSkinKey]);
                // 去除静皮的class
                player.classList.remove(!bool1 ? 'd-skin2' : 'd-skin')
            }

            let initSkinViews = () => {
                // 去除了千幻自带的排序功能.
                let skinKeys = Object.keys(skinInfoMap)
                // viewState.skins = skinList;
                viewState.skinTotalWidth = (viewState.skinPerWidth + viewState.skinGap) * skinKeys.length - viewState.skinGap;
                for (let i = 0; i < skinKeys.length; i++) {
                    let skinKey = skinKeys[i]

                    let skinInfo = skinInfoMap[skinKey]
                    let skin = skinInfo.imgName
                    if (i === 0) {
                        viewState.skins.push(null)
                        skin = null
                    } else {
                        viewState.skins.push(skin)
                    }

                    let skinView = ui.create.div('.pfqh-qh-skinchange-skin', content);
                    viewState.skinViews.push(skinView);
                    skinView.style.left = Math.round((viewState.skinPerWidth + viewState.skinGap) * i) + "px";
                    skinView.style.width = Math.round(viewState.skinPerWidth) + "px";
                    skinView.style.height = Math.round(viewState.skinPerHeight) + "px";
                    skinView.classList.add('qh-not-replace');
                    skinView.belowText = ui.create.div('.pfqh-qh-skinchange-skin-text', skinView);
                    if (i !== skinKeys.length - 1) {
                        let border = ui.create.div('.pfqh-qh-skinchange-border', content);
                        border.style.width = Math.round(viewState.skinGap) + "px";
                        border.style.left = Math.round((viewState.skinPerWidth + viewState.skinGap) * i + viewState.skinPerWidth) + "px";
                    }
                    let skinSprite
                    // 只有包含千幻聆音扩展才支持设置静皮
                    if (skinInfo.dynamic) {
                        skinSprite = Object.assign({}, skins[skinKey])
                        // 是否显示动皮
                        if (lib.config[skinSwitch.configKey.previewSkinsDynamic]) {
                            skinView.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skinSprite.background + '")';
                            playDynamic(skinView, skinSprite)
                        } else {
                            // 显示静皮
                            skinView.style.backgroundImage = skinInfo.staticImg
                        }

                    }
                    if (skinSwitch.game_hasExtension('千幻聆音')) {
                        // 添加上静动素材图片
                        let jingdong
                        if (skinInfo.dynamic) {
                            let isDynamic = skinInfo.dynamicState;
                            jingdong = ui.create.div(isDynamic ? '.pfqh-skin-dong' : '.pfqh-skin-jing', skinView)
                            jingdong.isDynamic = isDynamic
                            jingdong.listen((e) => {
                                if (!jingdong.isDynamic) {
                                    jingdong.classList.add('pfqh-skin-dong')
                                    jingdong.classList.remove('pfqh-skin-jing')
                                    jingdong.isDynamic = true
                                    skinSwitch.dynamic.selectSkinV3(skinKey, player, isPrimary)
                                    game.qhly_setCurrentSkin(name, skin, function () {
                                        viewState.refreshSkins();
                                    }, true)
                                    if (!skinView.node) {
                                        skinView.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skinSprite.background + '")';
                                        playDynamic(skinView, skinSprite)
                                    }

                                    // 背景修改
                                    if (skinSprite.background) {
                                        skinView.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skinSprite.background + '")';
                                    } else {
                                        skinView.style.backgroundImage = null;
                                    }
                                } else {
                                    jingdong.classList.remove('pfqh-skin-dong')
                                    jingdong.classList.add('pfqh-skin-jing')
                                    jingdong.isDynamic = false
                                    // 设置动皮对应的静皮
                                    if (viewState.cancelClick) return;
                                    game.qhly_playQhlyAudio('qhly_voc_fanshu', null, true);

                                    // 设置当前皮肤的背景和语音, 调用千幻聆音
                                    // 恢复原来的静态背景
                                    if (!skinInfo.isDefault) {
                                        let file = game.qhly_getSkinFile(name, skin);
                                        skinView.qhly_origin_setBackgroundImage(file);
                                        game.qhly_setCurrentSkin(name, skin, function () {
                                            viewState.refreshSkins();
                                        }, true)
                                    } else {
                                        skinView.style.backgroundImage = skinInfo.staticImg
                                    }
                                    // 停止播放动画.
                                    if (skinView.node) {
                                        am.getAnimation(skinView.node.version).stopSpine(skinView.node)
                                        if (skinView.node.beijingNode) {
                                            am.getAnimation(skinView.node.beijingNode.version).stopSpine(skinView.node.beijingNode)
                                        }
                                        if (skinView.node.qianjingNode) {
                                            am.getAnimation(skinView.node.qianjingNode.version).stopSpine(skinView.node.qianjingNode)
                                        }
                                        skinView.node = null;
                                    }
                                    setStaticSkin()
                                }
                                e.stopPropagation();
                            })
                        }
                        if (skin) {
                            // 这里不使用千幻皮肤名称了, 直接使用图片的名称
                            skinView.belowText.innerHTML = skinInfo.skinName
                        } else {
                            skinView.belowText.innerHTML = "初始皮肤";
                        }
                        if (game.qhly_skinIs(name, skin)) {
                            skinView.belowText.style.textShadow = '.2rem 0rem .5rem red,-.2rem 0rem .5rem red,0rem .2rem .5rem red,0rem -.2rem .5rem red';
                        } else {
                            skinView.belowText.style.textShadow = '.2rem 0rem .5rem blue,-.2rem 0rem .5rem blue,0rem .2rem .5rem blue,0rem -.2rem .5rem blue';
                        }
                        (function (name, skin, view) {
                            view.listen(function () {
                                if (viewState.cancelClick) return;
                                if (skin !== '__default_dynamic' && game.qhly_skinIs(name, skin)) return;
                                game.qhly_playQhlyAudio('qhly_voc_fanshu', null, true);
                                if (jingdong && jingdong.isDynamic) {
                                    skinSwitch.dynamic.selectSkinV3(skinKey, player, isPrimary)
                                    game.qhly_setCurrentSkin(name, skin, function () {
                                        viewState.refreshSkins();
                                    }, true);
                                } else {
                                    game.qhly_setCurrentSkin(name, skin, function () {
                                        viewState.refreshSkins();
                                    }, true);
                                    setStaticSkin()
                                }
                            })
                        })(name, skin, skinView);
                        if (skin) {
                            if (!skinInfo.dynamic || !lib.config[skinSwitch.configKey.previewSkinsDynamic]) {
                                if (skinInfo.isDefault) {
                                    skinView.style.backgroundImage = skinInfo.staticImg
                                } else {
                                    let file = game.qhly_getSkinFile(name, skin);
                                    skinView.qhly_origin_setBackgroundImage(file);
                                }
                            }

                        } else {
                            skinView.qhly_origin_setBackground(name, 'character');
                        }
                    } else {
                        if (skin) {
                            skinView.belowText.innerHTML = skinInfo.skinName
                        } else {
                            skinView.belowText.innerHTML = "初始皮肤"
                        }

                        if (skin === currentSelect) {
                            skinView.belowText.style.textShadow = '.2rem 0rem .5rem red,-.2rem 0rem .5rem red,0rem .2rem .5rem red,0rem -.2rem .5rem red';
                        } else {
                            skinView.belowText.style.textShadow = '.2rem 0rem .5rem blue,-.2rem 0rem .5rem blue,0rem .2rem .5rem blue,0rem -.2rem .5rem blue';
                        }
                        (function (name, skin, view) {
                            view.listen(function () {
                                if (viewState.cancelClick) return;
                                if (skin === currentSelect) return;
                                if (skin == null) {
                                    currentSelect = skin
                                    skinView.setBackground(name, 'character');
                                    setStaticSkin()
                                } else {
                                    skinSwitch.dynamic.selectSkinV3(skinKey, player, isPrimary)
                                    currentSelect = skin
                                }
                                viewState.refreshSkins()
                            })
                        })(name, skin, skinView);
                        if (!skin) {
                            skinView.setBackground(name, 'character');
                        }
                    }
                }
                viewState.refresh();
            }

            let handleSkinInfo = () => {
                if (skinSwitch.game_hasExtension('千幻聆音')) {
                    game.qhly_getSkinList(name, function (ret, list) {
                        updateSkinInfo(list)
                        initSkinViews()
                    }, false)
                } else {
                    initSkinViews()
                }
            }
            handleSkinInfo()
            this.initSmallWindowDrag(dialog, dragHandle);

            backgroundBack.listen(function (event) {
                exitListener();
            });
            exit.listen(exitListener);
            enlarge.listen(function () {
                exitListener();
                if (skinSwitch.game_hasExtension('千幻聆音')) {
                    game.qhly_open_new(name, lib.config.qhly_doubledefaultpage ? lib.config.qhly_doubledefaultpage : 'skill', player);
                }
            })
        },
        initSmallWindowDrag: function (dialog, dragHandle) {
            if (!dialog || !dragHandle) return;

            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialLeft = 0;
            let initialTop = 0;
            const downEvent = lib.config.touchscreen ? 'touchstart' : 'mousedown';
            const moveEvent = lib.config.touchscreen ? 'touchmove' : 'mousemove';
            const upEvent = lib.config.touchscreen ? 'touchend' : 'mouseup';
            const getEventCoords = (e) => {
                if (e.touches && e.touches.length > 0) {
                    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
                return { x: e.clientX, y: e.clientY };
            };
            const startDrag = (e) => {
                e.preventDefault();
                e.stopPropagation();

                isDragging = true;
                const coords = getEventCoords(e);
                startX = coords.x;
                startY = coords.y;
                const rect = dialog.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                dialog.classList.add('dragging');
                dialog.style.position = 'fixed';
                dialog.style.left = initialLeft + 'px';
                dialog.style.top = initialTop + 'px';
                dialog.style.transform = 'none';
                document.addEventListener(moveEvent, handleDrag, { passive: false });
                document.addEventListener(upEvent, stopDrag);
            };
            const handleDrag = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const coords = getEventCoords(e);
                const deltaX = coords.x - startX;
                const deltaY = coords.y - startY;
                const newLeft = initialLeft + deltaX;
                const newTop = initialTop + deltaY;
                const maxLeft = window.innerWidth - dialog.offsetWidth;
                const maxTop = window.innerHeight - dialog.offsetHeight;
                const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
                const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
                dialog.style.left = constrainedLeft + 'px';
                dialog.style.top = constrainedTop + 'px';
            };
            const stopDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                dialog.classList.remove('dragging');
                document.removeEventListener(moveEvent, handleDrag);
                document.removeEventListener(upEvent, stopDrag);
            };
            const resetPosition = () => {
                dialog.style.position = '';
                dialog.style.left = '';
                dialog.style.top = '';
                dialog.style.transform = 'translate(-50%, -50%)';
            };
            dragHandle.addEventListener(downEvent, startDrag);
            let clickCount = 0;
            dragHandle.addEventListener('click', (e) => {
                e.stopPropagation();
                clickCount++;
                setTimeout(() => {
                    if (clickCount === 2) {
                        resetPosition();
                    }
                    clickCount = 0;
                }, 300);
            });
        }
    };
}
