export function createDynamicMethods(lib, game, ui, skinSwitch) {
    return {
        dynamic: {
            initSwitch: function (player, skins) {
                if (player.name == "unknown" && player.name1) {
                    var name = player.name1;
                } else {
                    var name = player.name;
                }
                var skinDiv = ui.create.div("#skinDiv", ui.window);
                skinSwitch.dynamic.skinDiv = skinDiv;
                skinDiv.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
                    skinSwitch.dynamic.skinDivShowOrHide()
                })
                var skinDiv2 = ui.create.div("#skinDiv2", skinDiv);
                skinDiv2.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function (e) {
                    e.stopPropagation();
                })
                var skinBox = ui.create.div(".skinBox", skinDiv2);
                skinBox.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function (e) {
                    e.stopPropagation();
                })
                var keys = Object.keys(skins)
                for (let i = 0; i < keys.length; i++) {
                    var t = ui.create.div(".engSkin", skinBox);
                    t.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function (e) {
                        e.stopPropagation();
                    })
                    let path = skinSwitch.url + "/images/character/" + skinSwitch.dynamic.judgingRealName(name) + "/" + keys[i] + ".png";
                    let img = document.createElement("img");
                    let saveDynamic = lib.config[skinSwitch.configKey.dynamicSkin];
                    if (saveDynamic) {
                        var skin = saveDynamic[name];
                        if (skin == keys[i]) {
                            t.style.backgroundImage = "url(" + skinSwitch.url + "/images/base/skin_bg.png)";
                            skinSwitch.selectSkinData.temp = t;
                            skinSwitch.selectSkinData.value = keys[i];
                        } else t.style.backgroundImage = "url(" + skinSwitch.url + "/images/base/skin_not_bg.png)";
                    }

                    img.alt = keys[i];
                    img.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function (e) {
                        e.stopPropagation();
                        this.parentNode.alt = this.alt;
                        skinSwitch.dynamic.selectSkin(this.parentNode);
                    })
                    img.src = path;
                    img.onerror = function () {
                        this.src = skinSwitch.url + "/images/character/小杀.png";
                        this.onerror = null;
                        return true
                    }
                    t.appendChild(img);
                }
            },
            dynamicSkinInfo: {},  // 保存每个有动皮角色的在十周年ui的动皮配置信息
            playerTempSkinInfo: {
                currentWatchId: null,  // 保存当前选择查看的角色动皮信息
            },
            initPlayerAvatarDynamic: (player, isPrimary) => {
                if (player.pfqhId == null) return
                let dInfo = skinSwitch.dynamic.dynamicSkinInfo[player.pfqhId]
                if (!dInfo) return
                let skinInfos = isPrimary ? dInfo.primary : dInfo.deputy
                let characterName = isPrimary ? player.name1 : player.name2
                // 初始化当前皮肤信息到dom中
                let skins = document.getElementById('pfqhSkins')
                // 删除原来的节点
                skins.innerHTML = ''

                let addLisName = lib.config.touchscreen ? 'touchend' : 'click'

                let selectName = null
                if (lib.config[skinSwitch.configKey.dynamicSkin]) {
                    selectName = lib.config[skinSwitch.configKey.dynamicSkin][characterName]
                }

                if (skinInfos) {
                    // 获取选择的皮肤的位置
                    let keys = Object.keys(skinInfos)
                    let curIndex = 0
                    for (let j = 0; j < keys.length; j++) {
                        if (selectName === keys[j]) {
                            curIndex = j
                            break
                        }
                    }
                    for (let i = 0; i < keys.length; i++) {
                        let k = keys[i]
                        let skinInfo = skinInfos[k]
                        let skinAvatar = ui.create.div(".skin-avatar", skins);
                        let skinName = ui.create.div('.pfqh-text', skinAvatar)
                        skinName.innerHTML = k
                        let skinCover = ui.create.div('.pfqh-skin-cover', skinAvatar)
                        let skinImgDiv = ui.create.div('.pfqh-skin', skinCover)
                        if (curIndex <= 2) {
                            if (i > 2) skinAvatar.style.display = 'none'
                        } else {
                            if (i + 2 < curIndex || i > curIndex) skinAvatar.style.display = 'none'
                        }
                        skinImgDiv.setAttribute('skinName', k)
                        skinImgDiv.addEventListener(addLisName, (e) => {
                            e.stopPropagation()
                            skinSwitch.dynamic.selectSkinV2(e.target.getAttribute('skinName'), e.target)
                        })

                        if (selectName === k) {
                            skinCover.classList.add('pfqh-selected')
                            // 并且设置选择的是当前皮肤
                            let selInfo = skinSwitch.dynamic.playerTempSkinInfo[player.pfqhId]
                            if (isPrimary) {
                                selInfo.primary = { temp: skinImgDiv, value: k, curIndex: curIndex - 2 <= 0 ? 0 : curIndex - 2 }
                            } else {
                                selInfo.deputy = { temp: skinImgDiv, value: k, curIndex: i }
                            }
                        }
                        if (skinSwitch.game_hasExtension('千幻聆音')) {
                            let filename = game.qhly_getSkinFile(characterName, k)
                            // 获取放在骨骼目录下的图片路径
                            let skinPath = skinInfo.name
                            let lastIdx = skinPath.lastIndexOf('/')
                            let foldPath = lastIdx === -1 ? '' : skinPath.slice(0, lastIdx)
                            skinSwitch.checkFilesExistAndReturnOne([filename + '.jpg', filename + '.png', skinSwitch.dcdPath + '/assets/dynamic/' + foldPath + '/' + skinInfo.skinName + '.jpg'], (path) => {
                                if (path) {
                                    skinImgDiv.style.backgroundImage = "url(" + lib.assetURL + path + ")"
                                } else {
                                    skinImgDiv.style.backgroundImage = "url(" + skinSwitch.url + "/images/character/小杀.png)"
                                }

                            })
                        } else {
                            skinImgDiv.style.backgroundImage = "url(" + skinSwitch.url + "/images/character/小杀.png)"
                        }
                    }
                    if (keys.length < 3) {
                        skins.style = 'justify-content: flex-start;'
                        skins.children[0].style = 'margin-right:5%;'
                    } else {
                        skins.style = ''
                    }
                    let left = document.getElementById('dynamicLeftArrow')
                    let right = document.getElementById('dynamicRightArrow')
                    if (Object.keys(skinInfos).length <= 3) {
                        // 隐藏左右按钮
                        left.classList.add('hidden')
                        right.classList.add('hidden')
                    } else {
                        if (curIndex <= 2) {
                            left.classList.add('hidden')
                        } else {
                            left.classList.remove('hidden')
                        }
                        if (curIndex + 2 >= Object.keys(skinInfos).length) {
                            right.classList.add('hidden')
                        } else {
                            right.classList.remove('hidden')
                        }
                    }
                }
            },
            initSwitchV2: function () {
                // 初始化当前对局中, 所有拥有动皮角色的动皮
                for (let i = 0; i < game.players.length; i++) {
                    let p = game.players[i]
                    let dskins = decadeUI.dynamicSkin
                    let primarySkins = dskins[p.name1]
                    let dyInfo = {}
                    if (primarySkins) {
                        dyInfo.primary = primarySkins
                    }
                    let deputySkins = dskins[p.name2]
                    if (deputySkins) {
                        dyInfo.deputy = deputySkins
                    }
                    if (primarySkins || deputySkins) {
                        p.pfqhId = i  // 动态添加一个id, 来标明当前是那个角色
                        dyInfo.player = p  // 保存当前玩家的引用
                        dyInfo.zhuFuFlag = !!primarySkins;
                        this.dynamicSkinInfo[i] = dyInfo

                        this.playerTempSkinInfo[i] = {
                            primary: { temp: '', value: '', curIndex: 0 },
                            deputy: { temp: '', value: '', curIndex: 0 },
                        }
                    }

                }

                let addLisName = lib.config.touchscreen ? 'touchend' : 'click'
                // 初始化动皮框的全体内容
                if (Object.keys(this.dynamicSkinInfo).length > 0) {
                    let skinDiv = ui.create.div("#skinDiv", ui.window);
                    skinDiv.innerHTML = `
                        <div class="skin-character" id="skinCharacter">
                            <div class="selectBackground">
                                <div class="selectOut">
                                    <select class="selectInner" id="playerSkinSelect">
                                    </select>
                                </div>
                            </div>
                            <!-- 切换样式: https://code.juejin.cn/pen/7144159185901453342 -->
                            <div class='hellokitty' id="zhuFuDiv">
                                <div class='text active' id='zhuText1'>
                                    主将
                                </div>
                                <div class='btn' id='zhuFuBtn'>
                                    <div class='paw'>
                                    </div>
                                    <div class='kitty'>
                                    </div>
                                </div>
                                <div class='text' id='fuText2'>
                                    副将
                                </div>
                            </div>
                        </div>
                        <div id="skinDiv2">
                            <div class="skin-drag-handle" id="skinDragHandle" title="拖拽移动皮肤切换窗口"></div>
                            <div class="skinBox">
                                <div class="pfqhLeftArrow" id="dynamicLeftArrow"></div>
                                <div class="skins" id="pfqhSkins">
                                </div>
                                <div id="dynamicRightArrow" class="pfqhRightArrow"></div>
                            </div>
                        </div>
                    `
                    document.getElementById('skinCharacter').addEventListener(addLisName, e => {
                        e.stopPropagation()
                    })
                    document.getElementById('skinDiv2').addEventListener(addLisName, e => {
                        e.stopPropagation()
                    })

                    // 添加拖拽功能
                    this.initDragFunctionality()

                    // 将座次号添加到option中
                    let playerSkinSelect = document.getElementById('playerSkinSelect')
                    let btn = document.getElementById('zhuFuBtn');
                    let text1 = document.getElementById('zhuText1');
                    let text2 = document.getElementById('fuText2');

                    for (let k in this.dynamicSkinInfo) {
                        let option = document.createElement('option')
                        option.setAttribute('value', k)
                        let p = this.dynamicSkinInfo[k].player
                        let pName = lib.translate[p.name1]
                        if (!pName) pName = p.getSeatNum() + 1 + '号位'
                        option.text = pName
                        playerSkinSelect.options.add(option)
                    }

                    let initPlayerAvatarDynamic = skinSwitch.dynamic.initPlayerAvatarDynamic
                    skinDiv.addEventListener(addLisName, function () {
                        skinSwitch.dynamic.skinDivShowOrHide()
                    })

                    let changeDynamicSkinsByIdx = (idx) => {
                        // 获取所选角色的有动皮的部分, 然后进行初始化
                        if (this.dynamicSkinInfo[idx].primary) {
                            initPlayerAvatarDynamic(this.dynamicSkinInfo[idx].player, true)
                            setZhuFuBtnStyle(true)
                        } else if (this.dynamicSkinInfo[idx].deputy) {
                            initPlayerAvatarDynamic(this.dynamicSkinInfo[idx].player, false)
                            setZhuFuBtnStyle(false)
                        }
                    }

                    let setZhuFuBtnStyle = (isPrimary) => {
                        if (!isPrimary) {
                            btn.classList.remove('left');
                            btn.classList.add('right');
                            text1.classList.remove('active');
                            text2.classList.add('active');
                        } else {
                            btn.classList.add('left');
                            btn.classList.remove('right');
                            text1.classList.add('active');
                            text2.classList.remove('active');
                        }
                    }

                    playerSkinSelect.onchange = (e) => {
                        let idx = playerSkinSelect.options[playerSkinSelect.selectedIndex].value
                        this.playerTempSkinInfo.currentWatchId = idx
                        changeDynamicSkinsByIdx(idx)
                        e.stopPropagation()
                    }


                    btn.addEventListener(addLisName, e => {
                        let curSelect = this.dynamicSkinInfo[this.playerTempSkinInfo.currentWatchId]
                        curSelect.zhuFuFlag = !curSelect.zhuFuFlag;
                        if (!curSelect.zhuFuFlag) {
                            btn.classList.remove('left');
                            btn.classList.add('right');
                            text1.classList.remove('active');
                            text2.classList.add('active');
                            initPlayerAvatarDynamic(curSelect.player, curSelect.zhuFuFlag)
                        } else {
                            btn.classList.add('left');
                            btn.classList.remove('right');
                            text1.classList.add('active');
                            text2.classList.remove('active');
                            initPlayerAvatarDynamic(curSelect.player, curSelect.zhuFuFlag)
                        }
                    });

                    document.getElementById('dynamicRightArrow').addEventListener(addLisName, (e) => {
                        let skins = document.getElementById('pfqhSkins').children
                        // 获取当前是主将还是副将
                        let flag = this.dynamicSkinInfo[this.playerTempSkinInfo.currentWatchId].zhuFuFlag
                        let watchId = this.playerTempSkinInfo.currentWatchId
                        let avatar = flag ? this.playerTempSkinInfo[watchId].primary : this.playerTempSkinInfo[watchId].deputy
                        let curIdx = avatar.curIndex
                        if (skins.length <= curIdx + 3) return
                        skins[curIdx].style.display = 'none'
                        skins[curIdx + 3].style.display = 'block'
                        avatar.curIndex++
                        if (skins.length <= avatar.curIndex + 3) e.target.classList.add('hidden')
                        document.getElementById('dynamicLeftArrow').classList.remove('hidden')
                    })

                    document.getElementById('dynamicLeftArrow').addEventListener(addLisName, (e) => {
                        let skins = document.getElementById('pfqhSkins').children
                        let flag = this.dynamicSkinInfo[this.playerTempSkinInfo.currentWatchId].zhuFuFlag
                        let watchId = this.playerTempSkinInfo.currentWatchId
                        let avatar = flag ? this.playerTempSkinInfo[watchId].primary : this.playerTempSkinInfo[watchId].deputy
                        let curIdx = avatar.curIndex
                        if (curIdx === 0) return
                        skins[curIdx + 2].style.display = 'none'
                        skins[curIdx - 1].style.display = 'block'
                        avatar.curIndex--
                        if (avatar.curIndex === 0) e.target.classList.add('hidden')
                        document.getElementById('dynamicRightArrow').classList.remove('hidden')
                    })

                    skinSwitch.dynamic.skinDiv = skinDiv;
                    // 初始化第一个
                    for (let k in this.dynamicSkinInfo) {
                        this.playerTempSkinInfo.currentWatchId = k
                        changeDynamicSkinsByIdx(k)
                        // 如果不是双将模式, 隐藏按钮
                        if (this.dynamicSkinInfo[k].player.name2 == null) {
                            document.getElementById('zhuFuDiv').style.display = 'none'
                        } else {
                            document.getElementById('zhuFuDiv').style.display = 'flex'
                        }
                        break
                    }
                }
            },
            // 初始化拖拽功能
            initDragFunctionality: function () {
                const skinDiv2 = document.getElementById('skinDiv2');
                const dragHandle = document.getElementById('skinDragHandle');

                if (!skinDiv2 || !dragHandle) return;

                let isDragging = false;
                let startX = 0;
                let startY = 0;
                let initialLeft = 0;
                let initialTop = 0;

                // 获取事件类型
                const downEvent = lib.config.touchscreen ? 'touchstart' : 'mousedown';
                const moveEvent = lib.config.touchscreen ? 'touchmove' : 'mousemove';
                const upEvent = lib.config.touchscreen ? 'touchend' : 'mouseup';

                // 获取触摸/鼠标坐标
                const getEventCoords = (e) => {
                    if (e.touches && e.touches.length > 0) {
                        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    }
                    return { x: e.clientX, y: e.clientY };
                };

                // 开始拖拽
                const startDrag = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    isDragging = true;
                    const coords = getEventCoords(e);
                    startX = coords.x;
                    startY = coords.y;

                    // 获取当前位置
                    const rect = skinDiv2.getBoundingClientRect();
                    initialLeft = rect.left;
                    initialTop = rect.top;

                    // 添加拖拽状态样式
                    skinDiv2.classList.add('dragging');

                    // 阻止默认的transform，使用绝对定位
                    skinDiv2.style.position = 'fixed';
                    skinDiv2.style.left = initialLeft + 'px';
                    skinDiv2.style.top = initialTop + 'px';
                    skinDiv2.style.transform = 'none';

                    // 添加全局事件监听
                    document.addEventListener(moveEvent, handleDrag, { passive: false });
                    document.addEventListener(upEvent, stopDrag);
                };

                // 处理拖拽
                const handleDrag = (e) => {
                    if (!isDragging) return;

                    e.preventDefault();
                    const coords = getEventCoords(e);
                    const deltaX = coords.x - startX;
                    const deltaY = coords.y - startY;

                    const newLeft = initialLeft + deltaX;
                    const newTop = initialTop + deltaY;

                    // 限制在屏幕范围内
                    const maxLeft = window.innerWidth - skinDiv2.offsetWidth;
                    const maxTop = window.innerHeight - skinDiv2.offsetHeight;

                    const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
                    const constrainedTop = Math.max(0, Math.min(newTop, maxTop));

                    skinDiv2.style.left = constrainedLeft + 'px';
                    skinDiv2.style.top = constrainedTop + 'px';
                };

                // 停止拖拽
                const stopDrag = () => {
                    if (!isDragging) return;

                    isDragging = false;
                    skinDiv2.classList.remove('dragging');

                    // 移除全局事件监听
                    document.removeEventListener(moveEvent, handleDrag);
                    document.removeEventListener(upEvent, stopDrag);
                };

                // 重置位置功能（双击拖拽手柄）
                const resetPosition = () => {
                    skinDiv2.style.position = '';
                    skinDiv2.style.left = '';
                    skinDiv2.style.top = '';
                    skinDiv2.style.transform = 'translate(-50%, -50%)';
                };

                // 绑定事件
                dragHandle.addEventListener(downEvent, startDrag);

                // 双击重置位置
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
            },
            // 修改eng选择皮肤框的写法
            selectSkinV2: function (skinName, target) {
                if (!skinName) return
                game.playAudio("..", "extension", "皮肤切换/audio/game", "Notice02.mp3")
                let curWatchId = this.playerTempSkinInfo.currentWatchId
                let curSkins = this.dynamicSkinInfo[curWatchId]
                let tempSkinInfo = this.playerTempSkinInfo[curWatchId]
                let isPrimary = curSkins.zhuFuFlag
                let avatarSkins = isPrimary ? curSkins.primary : curSkins.deputy
                let avatarInfo = isPrimary ? tempSkinInfo.primary : tempSkinInfo.deputy
                if (avatarSkins && avatarInfo && avatarInfo.value !== skinName) {
                    if (avatarInfo.temp instanceof HTMLElement) {
                        avatarInfo.temp.parentNode.classList.remove('pfqh-selected')
                    }
                    target.parentNode.classList.add('pfqh-selected')
                    avatarInfo.value = skinName
                    avatarInfo.temp = target
                    let player = curSkins.player
                    if (!player.isAlive()) return
                    let avatarName = isPrimary ? player.name1 : player.name2

                    let skin = avatarSkins[skinName]
                    if (!skin) return
                    player.stopDynamic(isPrimary, !isPrimary)



                    skin.player = skin;
                    dcdAnim.playSpine(skinSwitch.huanfu, { scale: 0.5, parent: player });
                    skin.deputy = !isPrimary

                    if (skin.localePath) {
                        if (!skin.name.startsWith(skin.localePath + '/')) {
                            skin.name = skin.localePath + '/' + skin.name
                            skin.background = skin.localePath + '/' + skin.background
                        }
                    }

                    if (game.qhly_setCurrentSkin) {
                        // todo? 暂时先这样, 后面改成和雷音同步
                        game.qhly_setCurrentSkin(isPrimary ? player.name1 : player.name2, skin.skinName + '.jpg', () => {
                            let namex = isPrimary ? player.name1 : player.name2
                            if (!lib.config.qhly_skinset) {
                                lib.config.qhly_skinset = {}
                            }
                            if (!lib.config.qhly_skinset.djtoggle) {
                                lib.config.qhly_skinset.djtoggle = {}
                            }
                            if (!lib.config.qhly_skinset.djtoggle[namex]) {
                                lib.config.qhly_skinset.djtoggle[namex] = {}
                            }
                            // 默认用.jpg结尾,
                            lib.config.qhly_skinset.djtoggle[namex][skin.skinName + '.jpg'] = false
                        }, true)
                    }

                    player.playDynamic(skin, !isPrimary);



                    if (skin.background) {
                        player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skin.background + '")';
                    } else {
                        player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/皮肤切换/images/card/card.png")'
                    }
                    player.classList.add(!isPrimary ? 'd-skin2' : 'd-skin');

                    if (!lib.config[skinSwitch.configKey.dynamicSkin]) lib.config[skinSwitch.configKey.dynamicSkin] = {};
                    if (lib.config[skinSwitch.configKey.dynamicSkin]) {
                        let cg = lib.config[skinSwitch.configKey.dynamicSkin];
                        cg[avatarName] = skinName;
                        game.saveConfig(skinSwitch.configKey.dynamicSkin, cg);
                    }
                    skinSwitch.dynamic.startPlay2Random(player)

                    // 皮肤变化了, 修改编辑的全局变量
                    if (isPrimary && window.dynamicEditBox && player === game.me) {
                        dynamicEditBox.updateGlobalParams()
                    }

                }

            },
            // 以千幻聆音小窗扩展形式的选择皮肤功能
            selectSkinV3: function (skinName, player, isPrimary) {
                if (!skinName) return
                if (!player || !player.isAlive()) return

                let dskins = decadeUI.dynamicSkin
                const avatarName = isPrimary ? player.name1 : player.name2
                const skins = dskins[avatarName]
                let skin = skins[skinName]
                if (!skin) return

                player.stopDynamic(isPrimary, !isPrimary)
                skin.player = skin



                dcdAnim.playSpine(skinSwitch.huanfu, { scale: 0.5, parent: player })
                skin.deputy = !isPrimary
                player.playDynamic(skin, !isPrimary);

                // 皮肤切换后重新应用保存的动皮参数
                setTimeout(() => {
                    if (window.skinSwitch && typeof skinSwitch.updateDecadeDynamicSkin === 'function') {
                        console.log('皮肤切换后重新应用保存的动皮参数...');
                        skinSwitch.updateDecadeDynamicSkin();
                    }
                }, 100);



                if (skin.background) {
                    player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skin.background + '")';
                } else {
                    player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/皮肤切换/images/card/card.png")'
                }
                player.classList.add(!isPrimary ? 'd-skin2' : 'd-skin');

                if (!lib.config[skinSwitch.configKey.dynamicSkin]) lib.config[skinSwitch.configKey.dynamicSkin] = {};
                if (lib.config[skinSwitch.configKey.dynamicSkin]) {
                    let cg = lib.config[skinSwitch.configKey.dynamicSkin];
                    cg[avatarName] = skinName;
                    game.saveConfig(skinSwitch.configKey.dynamicSkin, cg);
                }
                skinSwitch.dynamic.startPlay2Random(player)

                // 皮肤变化了, 修改编辑的全局变量
                if (isPrimary && window.dynamicEditBox && player === game.me) {
                    dynamicEditBox.updateGlobalParams()
                }

            },
            // 老eng的选择皮肤
            selectSkin: function (e) {
                game.playAudio("..", "extension", "皮肤切换/audio/game", "Notice02.mp3");
                let temp = skinSwitch.selectSkinData.temp;
                if (temp === "") {
                    skinSwitch.selectSkinData.temp = e;
                    skinSwitch.selectSkinData.value = e.alt
                    return
                }
                if (temp !== e) {
                    if (skinSwitch.dynamic.selectSkin.cd) {
                        skinSwitch.dynamic.selectSkin.cd = false;
                        let player = game.me;
                        temp.style.backgroundImage = "url(" + skinSwitch.url + "/images/base/skin_not_bg.png)";
                        skinSwitch.selectSkinData.value = e.alt;
                        e.style.backgroundImage = "url(" + skinSwitch.url + "/images/base/skin_bg.png)";
                        skinSwitch.selectSkinData.temp = e;
                        var skin = decadeUI.dynamicSkin[player.name][e.alt];
                        // if (skin.action) delete skin.action;
                        player.stopDynamic();
                        skinSwitch.huanfu.parent = player;
                        skin.player = skin;
                        dcdAnim.playSpine(skinSwitch.huanfu, skinSwitch.huanfu);
                        if (skin.deputy) skin.deputy = false;

                        if (skin.localePath) {
                            if (!skin.name.startsWith(skin.localePath + '/')) {
                                skin.name = skin.localePath + '/' + skin.name
                                skin.background = skin.localePath + '/' + skin.background
                            }
                        }
                        // 重新初始化
                        player.playDynamic(skin, false);

                        // 皮肤切换后重新应用保存的动皮参数
                        setTimeout(() => {
                            if (window.skinSwitch && typeof skinSwitch.updateDecadeDynamicSkin === 'function') {
                                console.log('皮肤切换后重新应用保存的动皮参数...');
                                skinSwitch.updateDecadeDynamicSkin();
                            }
                        }, 100);


                        if (skin.background) {
                            player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skin.background + '")';
                        } else {
                            player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/皮肤切换/images/card/card.png")'
                        }
                        if (lib.config[skinSwitch.configKey.dynamicSkin]) {
                            var cg = lib.config[skinSwitch.configKey.dynamicSkin];
                            cg[player.name] = e.alt;
                            game.saveConfig(skinSwitch.configKey.dynamicSkin, cg);
                        }
                        skinSwitch.dynamic.skinDivShowOrHide();

                        // 皮肤变化了, 修改编辑的全局变量
                        if (window.dynamicEditBox) {
                            dynamicEditBox.updateGlobalParams()
                        }

                        setTimeout(() => {
                            skinSwitch.dynamic.selectSkin.cd = true;
                        }, 1000);
                    } else {
                        skinSwitchMessage.show({
                            type: 'warning',
                            text: '更换动皮频繁.',
                            duration: 1500,    // 显示时间
                            closeable: false, // 可手动关闭
                        })
                        // alert("更换动皮频繁.");
                    }
                }
            },
            skinDivShowOrHide: function (show) {
                if (show) {
                    skinSwitch.dynamic.skinDiv.style.display = "block";
                    setTimeout(() => {
                        skinSwitch.dynamic.skinDiv.style.opacity = "1";
                    }, 200);
                } else {
                    skinSwitch.dynamic.skinDiv.style.opacity = "0";
                    setTimeout(() => {
                        skinSwitch.dynamic.skinDiv.style.display = "none";
                    }, 400);
                }
            },
            judgingRealName: function (name) {
                let shen = name.indexOf("shen_");
                let boss = name.indexOf("boss_");
                let special = shen > -1 ? shen : boss > -1 ? boss : -1;
                if (special > -1) {
                    return name.substr(special, name.length);
                } else {
                    var index = name.lastIndexOf("_");
                    return name.substr(index + 1, name.length);
                }
            },
            /**
             * 判断当前player是否触发攻击特效, 使用动皮攻击会自动触发攻击特效, 比如如果是暗将, 就不触发攻击特效
             * @param player: player对象
             * @returns {Object|false}
             * { deputy: boolean,  // 是否是副将
             *   needHide: Number, // 需要隐藏的副将的skinId 当两个皮肤都是动皮的时候,需要隐藏一个动皮的出框动画
             *   isDouble: boolean  // 是否是双将
             *   dynamic: 需要播放的动皮参数
             * }
             */
            checkCanBeAction: function (player) {
                let isPrimary = player.dynamic.primary;
                let res = {
                    isDouble: false,
                    deputy: false,
                    needHide: undefined
                }
                if (player.doubleAvatar) {
                    res.isDouble = true;
                    let isDeputy = player.dynamic.deputy;
                    let unseen = player.isUnseen(0);
                    let unseen2 = player.isUnseen(1);
                    // 默认会只播放动皮的攻击动画.
                    if (isPrimary && !unseen) {
                        res.dynamic = isPrimary;
                    } else if (isDeputy && !unseen2) {
                        res.dynamic = isDeputy;
                        res.deputy = true;
                    } else {
                        return false;
                    }
                    // 两个都是动皮, 并且都不是隐藏状态, 那么2号可能需要隐藏
                    if (isPrimary && isDeputy) {
                        if (!unseen && !unseen2) {
                            res.needHide = isDeputy.id;
                        }
                    }
                } else {
                    res.dynamic = isPrimary;
                }
                return res;
            },
            getSkinName: function (roleName, skinPath) {
                let dskins = decadeUI.dynamicSkin[roleName]
                for (let k in dskins) {
                    if (dskins[k].name === skinPath) {
                        return k
                    }
                }
            },
            setBackground: function (avatar, player) {
                // 设置背景, 配合千幻使用, 会自动设置, 西瓜大佬的限定技需要读取这个角色的默认背景放到图框里面, 配合兼容
                let skin = player.dynamic[avatar];
                let obj = player.getElementsByClassName(avatar + "-avatar")[0];
                // 如果已经设置了, 就不再进行设置
                if (obj.style.backgroundImage == null) {
                    obj.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skin.background + '")';
                }

                // 设置动态皮肤背景
                if (player.$dynamicWrap && skin.player && skin.player.background) {
                    player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + skin.player.background + '")';
                }

            },

            // 随机播放十周年动皮的play2动画
            startPlay2Random: function (player) {
                // 检查当前角色的动皮
                let checkCanPlay2 = (isPrimary) => {
                    if (!player.dynamic) return false
                    let avatar = isPrimary ? player.dynamic.primary : player.dynamic.deputy
                    if (avatar) {
                        let sprite = avatar.player
                        return sprite.shizhounian;
                    }
                    return false
                }
                let getPlay2Action = (sprite) => {
                    if (sprite.daijiteshu) {
                        return sprite.daijiteshu
                    }
                    if (sprite.play2) {
                        return sprite.play2
                    }
                    if (typeof sprite.teshu === 'string') {
                        return sprite.teshu
                    }
                    return 'play2'
                }
                let firstLast
                if (!player.playPrimaryTimer) {
                    if (checkCanPlay2(true)) {
                        let sprite = player.dynamic.primary.player
                        let action = getPlay2Action(sprite)
                        let randomInterval = function (timer) {
                            clearTimeout(player.playPrimaryTimer)
                            if (!checkCanPlay2(true)) {
                                return
                            }
                            // 只有非攻击状态才播放play2
                            if ((!player.lastPlayTime || (new Date().getTime() - player.lastPlayTime) > 10000) && !player.GongJi) {
                                skinSwitch.postMsgApi.playAvatar(player, true, action)
                            }
                            if (firstLast) {
                                // console.log('play2 time', (new Date().getTime() - firstLast) / 1000)
                            }
                            firstLast = new Date().getTime()
                            player.playPrimaryTimer = setTimeout(() => {
                                randomInterval()
                            }, Math.floor(Math.random() * 6000) + 10000)

                        }
                        // 10s后开启自动播放play2模式
                        setTimeout(randomInterval, 10 * 1000)
                    }
                }
                let last
                if (!player.playDeputyTimer) {
                    if (checkCanPlay2(false)) {
                        let sprite = player.dynamic.deputy.player
                        let action = getPlay2Action(sprite)
                        let randomInterval = function () {
                            clearTimeout(player.playDeputyTimer)
                            if (!checkCanPlay2(false)) {
                                return
                            }
                            if ((!player.lastPlayTime || (new Date().getTime() - player.lastPlayTime) > 8000) && !player.GongJi) {
                                skinSwitch.postMsgApi.playAvatar(player, false, action)
                            }
                            if (last) {
                                // console.log('play2 time', (new Date().getTime() - last) / 1000)
                            }
                            last = new Date().getTime()

                            player.playDeputyTimer = setTimeout(() => {
                                randomInterval()
                            }, Math.floor(Math.random() * 6000) + 8000)
                        }
                        // 10s后开启自动播放play2模式
                        setTimeout(randomInterval, 10 * 1000)
                    }
                }
            },
            // 下面两个方法配合动皮更换骨骼等特殊事件
            // 返回单将或者双将满足条件的判断
            getSpecial: (player, triName) => {
                let getSpecialEffs = (avatar, isPrimary) => {
                    if (!avatar) return null
                    if (isPrimary) {
                        if (!player.originSkin) {
                            player.originSkin = avatar.player
                        }
                    }
                    else {
                        if (!player.originSkin2) {
                            player.originSkin2 = avatar.player  // 副将的原始皮肤
                        }
                    }

                    // 优先使用当前皮肤的special配置，如果不存在则使用原始皮肤的配置
                    let currentSkin = avatar.player;
                    let originSkin = isPrimary ? player.originSkin : player.originSkin2
                    let special = currentSkin?.special;
                    if (!special && originSkin) {
                        special = originSkin.special;
                    }
                    if (!special) return null
                    let effs
                    effs = special.condition[triName]
                    if (!effs) return null
                    return { avatar, special, effs, isPrimary }
                }
                let res = []
                if (player.dynamic) {
                    let r = getSpecialEffs(player.dynamic.primary, true)
                    if (r) res.push(r)
                    if (player.doubleAvatar) {
                        r = getSpecialEffs(player.dynamic.deputy, false)
                        if (r) res.push(r)
                    }
                }
                return res
            },
            // 更改为指定参数的状态,
            transformDst: (player, isPrimary, dstInfo, extraParams = { isOrigin: false, huanfuEffect: null }) => {
                const avatar = isPrimary ? player.dynamic.primary : player.dynamic.deputy
                let { isOrigin, huanfuEffect } = extraParams
                // 标明这时转换播放骨骼
                dstInfo = Object.assign({}, dstInfo)
                dstInfo._transform = true

                // 记录原始骨骼的音频配置，确保可以恢复
                if (avatar && avatar.audio && !dstInfo.audio) {
                    dstInfo.audio = avatar.audio
                }

                if (dstInfo.name == null || dstInfo.name === avatar.name) {
                    if (dstInfo.action) {
                        skinSwitch.postMsgApi.changeAvatarAction(player, isPrimary, dstInfo, isOrigin)
                    }
                    if (dstInfo.skin) {
                        skinSwitch.postMsgApi.changeSkelSkin(player, dstInfo.skin, isPrimary)
                    }
                } else {

                    dstInfo.player = dstInfo
                    let huanfuEff = {
                        name: '../../../皮肤切换/effects/transform/default',
                        scale: 0.7,
                        speed: 0.6,
                        delay: 0.3, // 默认设置的延迟是0.2秒
                    }

                    const changeEffects = skinSwitch.effects.transformEffects

                    if (huanfuEffect) {
                        if (typeof huanfuEffect === 'string') {
                            if (huanfuEffect in changeEffects) {
                                huanfuEffect = changeEffects[huanfuEffect]
                            } else {
                                huanfuEffect = { name: huanfuEffect };
                            }
                        }
                        huanfuEff = Object.assign(huanfuEff, huanfuEffect)
                        huanfuEff.name = '../../../皮肤切换/effects/transform/' + huanfuEffect.name
                    }
                    skinSwitch.chukuangWorkerApi.playEffect(huanfuEff, { parent: player })
                    dstInfo.deputy = !isPrimary

                    setTimeout(() => {
                        player.stopDynamic(isPrimary, !isPrimary)

                        // 添加_needUpdateAudio标记，确保playDynamic会重新初始化音频
                        dstInfo._needUpdateAudio = true



                        // 确保游戏音频系统被初始化
                        if (!skinSwitch.pfqh_originPlayAudio) {
                            skinSwitch.pfqh_originPlayAudio = game.playAudio
                        }
                        if (!skinSwitch.qfqh_originPlaySkillAudio) {
                            skinSwitch.qfqh_originPlaySkillAudio = game.playSkillAudio
                        }

                        // 重新初始化语音
                        if (dstInfo.audio) {
                            let id = player.dynamic.id
                            let skinId = isPrimary ?
                                (player.dynamic.primary ? player.dynamic.primary.id : null) :
                                (player.dynamic.deputy ? player.dynamic.deputy.id : null)

                            if (!skinSwitch.audioMap) {
                                skinSwitch.audioMap = {}
                            }

                            // 处理音频路径
                            let skillPath = dstInfo.audio.skill
                            let cardPath = dstInfo.audio.card
                            let rootPath = skinSwitch.dcdPath + '/assets/dynamic/'



                            // 处理文件扩展名的辅助函数
                            let qhly_earse_ext = function (path) {
                                let foundDot = path.lastIndexOf('.');
                                if (foundDot < 0) return path;
                                return path.slice(0, foundDot);
                            }

                            // 更新技能语音
                            if (skillPath) {
                                let path = rootPath + skillPath
                                game.getFileList(path, function (folds, files) {
                                    for (let file of files) {
                                        file = qhly_earse_ext(file);
                                        let key
                                        if (file === name) {
                                            key = 'die/' + file
                                            skinSwitch.audioMap[key] = '../' + path + '/' + file;
                                        } else if (file === 'victory' || file === 'win') {
                                            key = 'effect/' + id + '/' + skinId + '/' + 'victory'
                                            skinSwitch.audioMap[key] = '../' + path + '/' + file;
                                        } else {
                                            key = 'skill/' + file
                                            skinSwitch.audioMap[key] = '../' + path + '/' + file;
                                        }
                                        if (skinSwitch.avatarAudioSkinMap[name]) {
                                            skinSwitch.avatarAudioSkinMap[name][key] = null
                                        }
                                    }
                                })
                            }

                            // 更新卡牌语音
                            if (cardPath) {
                                let cardRootPath = rootPath;
                                let path = cardRootPath + cardPath
                                game.getFileList(path, function (folds, files) {
                                    for (let file of files) {
                                        file = qhly_earse_ext(file);
                                        let key = 'card/' + id + '/' + skinId + '/' + file
                                        skinSwitch.audioMap[key] = '../' + path + '/' + file
                                        if (skinSwitch.avatarAudioSkinMap[name]) {
                                            skinSwitch.avatarAudioSkinMap[name][key] = null
                                        }
                                    }
                                })
                            }
                        }



                    }, (huanfuEff.delay || 0) * 1000)

                    if (dstInfo.background) {
                        player.$dynamicWrap.style.backgroundImage = 'url("' + lib.assetURL + 'extension/十周年UI/assets/dynamic/' + dstInfo.background + '")';
                    }
                    player.classList.add(!isPrimary ? 'd-skin2' : 'd-skin');

                    skinSwitch.dynamic.startPlay2Random(player)

                    // 皮肤变化了, 修改编辑的全局变量
                    if (isPrimary && window.dynamicEditBox && player === game.me) {
                        dynamicEditBox.updateGlobalParams()
                    }
                }
            },
            dynamicSkinInfo: {},
            playerTempSkinInfo: {
                currentWatchId: null,
            },
        }
    };
}

