export function createEditBoxInitMethods(lib, game, ui, get, _status, skinSwitch) {
    // 这些变量需要在模块内部定义
    let editBox  // 编辑动皮参数的弹窗
    let player   // 当前角色
    let dynamic   // 当前角色的apnode对象, 包含皮肤id
    let renderer  // 当前动皮与worker的通信中继
    function isHide(dom) {
        return [...dom.classList].includes('hidden-adjust')
    }
    function hide(dom) {
        if (![...dom.classList].includes('hidden-adjust')) {
            dom.classList.add('hidden-adjust')
        }
    }
    function show(dom) {
        if ([...dom.classList].includes('hidden-adjust')) {
            dom.classList.remove('hidden-adjust')
        }
    }
    function toggleShow(dom) {
        if ([...dom.classList].includes('hidden-adjust')) {
            dom.classList.remove('hidden-adjust')
            skinSwitch.allowTouchEvent(false)
        } else {
            if (typeof selfLoopPlay !== 'undefined' && selfLoopPlay.loopTimer) {
                clearInterval(selfLoopPlay.loopTimer);
                selfLoopPlay.loopTimer = null;
            }
            dom.classList.add('hidden-adjust')
            skinSwitch.allowTouchEvent(true)
        }
    }
    return {
        editBoxInit: function () {
            if (editBox) return

            const downEvent = lib.config.touchscreen ? 'touchstart' : 'mousedown'
            const upEvent = lib.config.touchscreen ? 'touchend' : 'mouseup'
            const cancelEvent = lib.config.touchscreen ? 'touchcancel' : 'mouseleave'
            const modes = {
                daiji: 'daiji',
                chukuang: 'chukuang',
                beijing: 'beijing',
                qianjing: 'qianjing',
                chuchang: 'chuchang',
                teshu: 'teshu',
                hudong: 'hudong',
                zhishixian: 'zhishixian',
            }
            const funcs = {
                player: 'player',
                qhShouSha: 'qhShouSha',  // 千幻手杀大屏
                qhDecade: 'qhDecade'  // 千幻十周年大屏
            }
            let currentFunc = funcs.player  // 定义当前正在调整的功能
            // 定义一些变量调整参数
            let currentMode = modes.daiji  // 默认调整待机模式
            let adjustX
            let adjustY   // 用于存储当前角色的位置
            let adjustScale
            let adjustAngle = 0 // 调整的角度

            // 用于临时存储多个调整，实现批量保存功能
            let tempAdjustments = {}

            // 循环播放功能
            let selfLoopPlay = function (mode) {
                // 清除之前的定时器
                if (selfLoopPlay.loopTimer) {
                    clearInterval(selfLoopPlay.loopTimer);
                    selfLoopPlay.loopTimer = null;
                }

                let canvas = player.getElementsByClassName("animation-player")[0];
                let dynamicWrap
                if (player.isQhlx) {
                    dynamicWrap = canvas.parentNode;
                } else {
                    dynamicWrap = player.getElementsByClassName("dynamic-wrap")[0];
                }
                // 根据不同模式播放不同动画
                if (mode === modes.chuchang) {
                    let playChuchang = () => {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'chuchang')
                    }
                    playChuchang();
                    selfLoopPlay.loopTimer = setInterval(playChuchang, 2000);

                    setTimeout(() => {
                        initPosParams()
                    }, 300)
                } else if (mode === modes.teshu) {
                    let playTeshu = () => {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'TeShu')
                    }
                    playTeshu();
                    selfLoopPlay.loopTimer = setInterval(playTeshu, 2000);
                    setTimeout(() => {
                        initPosParams()
                    }, 300)
                } else if (mode === modes.hudong) {
                    let playHudong = () => {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'HuDong')
                    }
                    playHudong();
                    selfLoopPlay.loopTimer = setInterval(playHudong, 2000);
                    setTimeout(() => {
                        initPosParams()
                    }, 300)
                } else if (mode === modes.chukuang) {
                    let playGongji = () => {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi')
                    }
                    playGongji();
                    selfLoopPlay.loopTimer = setInterval(playGongji, 2000);
                    setTimeout(() => {
                        initPosParams()
                    }, 300)
                } else if (mode === modes.zhishixian) {

                    let playZhishixian = () => {

                        let playerParams = player.dynamic.primary.player
                        if (!playerParams.zhishixian) {
                            return
                        }

                        // 模拟攻击事件来触发指示线
                        let targets = game.players.filter(p => p !== player && p.isAlive())
                        if (targets.length === 0) {
                            return
                        }

                        // 构造指示线参数
                        let args = {
                            hand: null,
                            attack: {},
                            targets: [],
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        }

                        // 获取攻击方位置
                        player.checkBoundsCache(true)
                        args.attack = player.getBoundingClientRect()

                        // 获取目标位置（选择第一个目标）
                        let target = targets[0]
                        target.checkBoundsCache(true)
                        args.targets.push({
                            boundRect: target.getBoundingClientRect(),
                        })

                        // 如果是玩家，添加手牌区域
                        if (player === game.me) {
                            let hand = decadeUI.boundsCaches.hand
                            if (hand) {
                                hand.check()
                                let x1 = hand.x + hand.width / 2
                                let y1 = hand.y
                                args.hand = {
                                    x1: x1,
                                    y1: y1
                                }
                            }
                        }

                        // 播放指示线动画
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi', {
                            attackArgs: args,
                            triggername: 'useCard'
                        })
                    }
                    playZhishixian(); // 立即播放一次
                    // 设置循环播放，每1秒重复一次
                    selfLoopPlay.loopTimer = setInterval(playZhishixian, 1000);
                    // 等待一段时间让动画开始播放
                    setTimeout(() => {
                        initPosParams()
                    }, 300)
                } else {
                    // 其他模式使用原来的debug方式
                    if (mode !== modes.chukuang) {
                        skinSwitch.postMsgApi.debug(player, mode)
                    }
                }

                // 判断是否需要出框
                let needChukuang = false;
                if (mode === modes.chukuang || mode === modes.zhishixian) {
                    needChukuang = true;
                } else if (mode === modes.chuchang || mode === modes.teshu) {
                    // 检查当前动皮是否有对应的出框参数
                    let playerParams = player.dynamic.primary.player
                    if (mode === modes.chuchang && playerParams.chuchang && playerParams.chuchang.ck !== false) {
                        needChukuang = true;
                    } else if (mode === modes.teshu && playerParams.shizhounian) {
                        needChukuang = true;
                    }
                }

                if (needChukuang) {
                    skinSwitch.rendererOnMessage.addListener(player, 'debugChuKuang', function (e) {
                        dynamicWrap.style.zIndex = "100";
                        canvas.style.position = "fixed";
                        canvas.style.width = "100%";

                        if (player.isQhlx) {
                            let bodyHeight = decadeUI.get.bodySize().height
                            let qhDivHeight = dynamicWrap.parentNode.parentNode.getBoundingClientRect().height
                            let top = (bodyHeight - qhDivHeight) / 2
                            canvas.style.top = -top + 'px'
                            canvas.style.height = Math.round((decadeUI.get.bodySize().height / dynamicWrap.parentNode.parentNode.getBoundingClientRect().height * 100)) + '%'
                            player.style.zIndex = 100
                        } else {
                            canvas.style.height = "100%";
                            player.style.zIndex = 10;
                        }

                        canvas.classList.add('hidden')
                        setTimeout(() => {
                            canvas.classList.remove('hidden')
                        }, 250)
                    })
                }

                skinSwitch.rendererOnMessage.addListener(player, 'canvasRecover', function (e) {
                    dynamicWrap.style.zIndex = "60";
                    canvas.style.height = null;
                    canvas.style.width = null;
                    canvas.style.position = null;
                    player.style.zIndex = 4;
                    canvas.style.top = null
                })
                skinSwitch.rendererOnMessage.addListener(player, 'debugNoChuKuang', function (e) {
                    // 没有出框动画无法调整
                    showAdjustBar(true)
                    show(editBox)

                    skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi', {
                        attackArgs: {
                            hand: null,
                            attack: {},
                            targets: [],
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        },
                        triggername: 'useCard'
                    })

                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前动皮暂无出框参数',
                        duration: 1500,    // 显示时间
                        closeable: false, // 可手动关闭
                    })
                })
            }

            editBox = ui.create.div('.editDynamic', ui.window)

            // 添加拖拽手柄
            const dragHandle = ui.create.div('.skin-drag-handle', editBox)
            dragHandle.title = '拖拽移动角色调整窗口'

            const funcContent = ui.create.div('.funcContent', editBox)
            const funcTitle = ui.create.div('.titleDiv', funcContent)
            // 功能页.
            const btnGroup = ui.create.div('.btnGroup', funcContent)
            const playerBtn = ui.create.div('.funcBtn .btnItem', btnGroup)
            const qhShouShaBtn = ui.create.div('.funcBtn .btnItem', btnGroup)
            const qhDecadeBtn = ui.create.div('.funcBtn .btnItem', btnGroup)
            funcTitle.innerText = '功能页'
            playerBtn.innerText = '角色调整'
            qhShouShaBtn.innerText = '千幻手杀'
            qhDecadeBtn.innerText = '千幻十周年'

            // 角色调整页
            const adjustContent = ui.create.div('.playerContent .hidden', editBox)
            const adjustTitle = ui.create.div('.titleDiv', adjustContent)
            adjustTitle.innerText = '角色调整'
            const adjustBtnGroup = ui.create.div('.btnGroup', adjustContent)
            const daijiBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const beijingBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const qianjingBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const chukuangBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const chuchangBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const teshuBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const hudongBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const zhishixianBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const saveBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)
            const retBtn = ui.create.div('.funcBtn .btnItem', adjustBtnGroup)

            const closeBtn = ui.create.div('.iconfont .icon-close .closeEditBtn', editBox)

            daijiBtn.innerText = '调整待机'
            beijingBtn.innerText = '调整背景'
            qianjingBtn.innerText = '调整前景'
            chukuangBtn.innerText = '调整出框'
            chuchangBtn.innerText = '调整出场'
            teshuBtn.innerText = '调整特殊'
            hudongBtn.innerText = '调整互动'
            zhishixianBtn.innerText = '调整指示线'
            saveBtn.innerText = '保存'
            retBtn.innerText = '返回'

            // 封装连续按事件
            let continuousClick = function (dom, func) {
                let downFunc = function (e) {
                    // 改变骨骼的位置
                    //获取鼠标按下时的时间
                    let t = setInterval((e) => { func(e, ++downFunc._times) }, 120)
                    clearInterval(downFunc.timer)
                    downFunc.timer = t
                    downFunc._times = 0  // 表示触发了多少次
                    func(e, ++downFunc._times)  // 立马执行一次
                }
                let holdUp = function () {
                    clearInterval(downFunc.timer);
                    downFunc._times = 0
                }

                dom.addEventListener(downEvent, downFunc)
                dom.addEventListener(upEvent, holdUp)
                dom.addEventListener(cancelEvent, holdUp)

            }

            closeBtn.listen(() => {
                // 清除循环播放定时器
                if (selfLoopPlay.loopTimer) {
                    clearInterval(selfLoopPlay.loopTimer);
                    selfLoopPlay.loopTimer = null;
                }
                hide(editBox)
            })

            // 初始化角色调整窗口拖拽功能
            skinSwitch.initEditBoxDrag(editBox, dragHandle)

            let changeInfoData = () => {
                if (!textInfoShow) return
                // 确保所有参数都有值
                if (!adjustX) adjustX = [0, 0.5]
                if (!adjustY) adjustY = [0, 0.5]
                if (adjustScale === undefined || adjustScale === null) adjustScale = 1
                if (adjustAngle === undefined || adjustAngle === null) adjustAngle = 0
                
                let x = adjustX[1].toFixed(3)
                let y = adjustY[1].toFixed(3)
                let scale = adjustScale.toFixed(3)
                let angle = Number(adjustAngle) || 0
                textInfoShow.innerHTML = `x: [${adjustX[0].toFixed(3)}, ${x}]<br> y: [${adjustY[0].toFixed(3)}, ${y}]<br>大小: ${scale}<br> 角度: ${angle}`
            }

            let isChukuangMode = (mode) => {
                return mode === modes.chukuang || mode === modes.chuchang || mode === modes.teshu || mode === modes.zhishixian || mode === modes.hudong;
            }

            let getActionType = (mode) => {
                if (mode === modes.chukuang || mode === modes.zhishixian) return 'GongJi';
                if (mode === modes.chuchang) return 'chuchang';
                if (mode === modes.teshu) return 'TeShu';
                if (mode === modes.hudong) return 'HuDong';
                return null;
            }

            let initAdjustParams = () => {
                if (!adjustX) adjustX = [0, 0.5];
                if (!adjustY) adjustY = [0, 0.5];
                if (adjustScale === undefined || adjustScale === null) adjustScale = 1;
                if (adjustAngle === undefined || adjustAngle === null) adjustAngle = 0;
            }

            let updatePosition = (params = {}) => {
                initAdjustParams();
                let posParams = {
                    x: adjustX,
                    y: adjustY,
                    scale: adjustScale,
                    angle: adjustAngle,
                    ...params
                };
                skinSwitch.postMsgApi.resizePos(player, currentMode, posParams);
                if (isChukuangMode(currentMode)) {
                    let actionType = getActionType(currentMode);
                    if (actionType) {
                        skinSwitch.chukuangWorkerApi.adjust(player, posParams, actionType);
                    }
                }
                changeInfoData();
            }

            let initBlackBg = () => {
                // 添加调整工具箱
                blackbg = ui.create.div('.pfqh_qhly_blackbg .hidden', document.body);
                let dataShowDiv = ui.create.div('.dataShowDiv', blackbg);  // 显示当前节点的数据信息
                textInfoShow = ui.create.div('.textInfoShow', dataShowDiv)
                let copyJudgeInfo = ui.create.div('.copyCurrentInfoDiv', dataShowDiv)  // 复制信息
                copyJudgeInfo.innerText = '复制参数'
                textInfoShow.innerHTML = `x: [0, 0.5]<br> y: [0, 0.5]<br>大小: 0.5<br> 角度: 0`

                copyJudgeInfo.listen(() => {
                    adjustX[1] = Number(adjustX[1].toFixed(3))
                    adjustY[1] = Number(adjustY[1].toFixed(3))
                    copyToClipboard({
                        x: adjustX,
                        y: adjustY,
                        angle: adjustAngle,
                        scale: Number(adjustScale.toFixed(3)),
                    })
                })

                let buttonbar = ui.create.div('.pfqh_qhly_bigeditbar', blackbg);
                let buttons = new Array(8);
                for (let i = 0; i < 6; i++) {
                    buttons[i] = ui.create.div('.pfqh_qhly_bigeditbutton' + i, buttonbar);
                    buttons[i].id = 'pfqh_qhly_bigedit' + i;

                    if (i < 4) {
                        switch (i) {
                            case 0: {
                                // 放大, 每次scale+0.01, 支持连点
                                continuousClick(buttons[i], (e, times) => {
                                    if (times >= 10) {
                                        adjustScale += 0.02
                                    } else {
                                        adjustScale += 0.01
                                    }
                                    updatePosition({ scale: adjustScale })
                                })
                                break;
                            }
                            case 1: {
                                // 缩小, 每次scale-0.01,
                                continuousClick(buttons[i], (e, times) => {
                                    if (times >= 10) {
                                        adjustScale -= 0.02
                                    } else {
                                        adjustScale -= 0.01
                                    }
                                    if (adjustScale <= 0) adjustScale = 0.01
                                    updatePosition({ scale: adjustScale })
                                })
                                break;
                            }
                            case 2: {
                                continuousClick(buttons[i], (e, times) => {
                                    if (times >= 10) {
                                        adjustAngle += 2
                                    } else {
                                        adjustAngle++
                                    }
                                    updatePosition({ angle: adjustAngle })
                                })
                                break;
                            }
                            case 3: {
                                continuousClick(buttons[i], (e, times) => {
                                    if (times >= 10) {
                                        adjustAngle -= 2
                                    } else {
                                        adjustAngle--
                                    }
                                    updatePosition({ angle: adjustAngle })
                                })
                                break;
                            }
                        }
                    } else {
                        buttons[i].listen(function () {
                            switch (this.id) {
                                case 'pfqh_qhly_bigedit4': {
                                    // 显示十字键辅助微调
                                    this._show = !adjustDirection || adjustDirection.classList.contains('hidden')
                                    showShizi(!this._show)
                                    break;
                                }
                                case 'pfqh_qhly_bigedit5': {
                                    // 调整后返回
                                    showAdjustBar(true)
                                    show(editBox)
                                    // 恢复播放待机动画
                                    // currentMode = modes.daiji
                                    //  initPosParams()
                                    selfLoopPlay(modes.daiji)
                                    break;
                                }
                                case 'pfqh_qhly_bigedit6': {

                                }
                            }
                        })
                    }
                }

                // 绑定全局可以滑动调整

                function mouseupEvent(event) {
                    blackbg._mouseup(event);
                }
                function mousemoveEvent(event) {
                    if (event) {
                        if (event.touches && event.touches.length) {
                            blackbg._mousemove(event.touches[0].clientX, event.touches[0].clientY);
                        }
                        else blackbg._mousemove(event.clientX, event.clientY);
                    }
                }
                function mousedownEvent(event) {
                    if (event) {
                        // 清空之前的数据
                        if (this.posX) delete this.posX
                        if (this.posY) delete this.posY
                        if (event.touches && event.touches.length) blackbg._mousedown(event.touches[0].clientX, event.touches[0].clientY);
                        else blackbg._mousedown(event.clientX, event.clientY);
                    }
                }
                blackbg._mousedown = function (x, y) {
                    this.posX = x
                    this.posY = y
                    this.isTouching = true
                }
                blackbg._mousemove = function (x, y) {
                    if (!this.isTouching) return;
                    let slideX = x - this.posX;
                    let slideY = y - this.posY;
                    if (currentMode === modes.chukuang || currentMode === modes.chuchang || currentMode === modes.teshu || currentMode === modes.zhishixian || currentMode === modes.hudong) {
                        adjustX[1] += slideX * 0.0007;
                        adjustY[1] -= slideY * 0.0007;
                    } else {
                        adjustX[1] += slideX * 0.003;
                        adjustY[1] -= slideY * 0.003;
                    }
                    updatePosition()

                    this.posX = x
                    this.posY = y
                }
                blackbg._mouseup = function (event) {
                    this.isTouching = false;
                    delete this.posX;
                    delete this.posY;
                }
                blackbg.addEventListener('touchstart', mousedownEvent, true);
                blackbg.addEventListener('touchend', mouseupEvent, true);
                blackbg.addEventListener('touchcancel', mouseupEvent, true);
                blackbg.addEventListener('touchmove', mousemoveEvent, true);
                blackbg.addEventListener('mousedown', mousedownEvent, true);
                blackbg.addEventListener('mouseup', mouseupEvent, true);
                blackbg.addEventListener('mouseleave', mouseupEvent, true);
                blackbg.addEventListener('mousemove', mousemoveEvent, true);
            }

            let blackbg
            let textInfoShow
            let showAdjustBar = hidden => {
                if (!blackbg) {
                    initBlackBg()
                }
                if (hidden) {
                    blackbg.classList.add('hidden')
                    showShizi(true)
                }
                else blackbg.classList.remove('hidden')
            }

            let initPosParams = () => {
                // 确保adjustX和adjustY有默认值
                if (!adjustX) adjustX = [0, 0.5];
                if (!adjustY) adjustY = [0, 0.5];

                getDynamicPos(currentMode, (data) => {
                    if (data && data.x) adjustX = data.x;
                    if (data && data.y) adjustY = data.y;
                    if (data && data.scale != null) adjustScale = data.scale;
                    adjustAngle = (data && data.angle != null) ? data.angle : 0;

                    if (adjustX[0] !== 0 || adjustY[0] !== 0) {
                        adjustX[0] = 0;
                        adjustY[0] = 0;
                        skinSwitch.postMsgApi.resizePos(player, currentMode, { x: adjustX, y: adjustY })
                        initPosParams()
                        return
                    }

                    // 如果有临时保存的调整，优先使用临时保存的
                    if (tempAdjustments[currentMode]) {
                        adjustX = [...tempAdjustments[currentMode].x]
                        adjustY = [...tempAdjustments[currentMode].y]
                        adjustScale = tempAdjustments[currentMode].scale
                        adjustAngle = tempAdjustments[currentMode].angle || 0
                        // 立即应用临时保存的调整
                        updatePosition()
                    }

                    changeInfoData()
                })
            }

            let refreshBtnState = (selectDiv) => {
                let allBtns = [daijiBtn, beijingBtn, qianjingBtn, chukuangBtn, chuchangBtn, teshuBtn, hudongBtn, zhishixianBtn]
                for (let item of allBtns) {
                    if (item === selectDiv) {
                        item.classList.add('btnSelect')
                    } else {
                        item.classList.remove('btnSelect')
                    }
                }
            }

            retBtn.listen(() => {
                // 清除循环播放定时器
                if (selfLoopPlay.loopTimer) {
                    clearInterval(selfLoopPlay.loopTimer);
                    selfLoopPlay.loopTimer = null;
                }
                funcContent.classList.remove('hidden')
                adjustContent.classList.add('hidden')
                showShizi(true)
                showAdjustBar(true)
                refreshBtnState(null)  // 清空所有状态
            })

            // 调整角色功能页功能
            playerBtn.listen(() => {
                editBox.updateGlobalParams()
                funcContent.classList.add('hidden')
                adjustContent.classList.remove('hidden')
                currentMode = modes.daiji
                initPosParams()
                showShizi(true)
                currentFunc = funcs.player
                // 清理其他
            })

            // 在切换模式前保存当前模式的调整
            let saveCurrentModeAdjustment = () => {
                if (!adjustX || !adjustY) return

                // 保存当前模式的调整到临时存储
                if (adjustX && adjustX[1] != null) adjustX[1] = Number(adjustX[1].toFixed(3));
                if (adjustY && adjustY[1] != null) adjustY[1] = Number(adjustY[1].toFixed(3));
                tempAdjustments[currentMode] = {
                    x: [...adjustX],
                    y: [...adjustY],
                    scale: Number(adjustScale.toFixed(3)),
                    angle: Number(adjustAngle.toFixed(3)),
                }
            }

            daijiBtn.listen(() => {
                saveCurrentModeAdjustment()
                currentMode = modes.daiji
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(daijiBtn)
                hide(editBox)
            })

            beijingBtn.listen(() => {
                saveCurrentModeAdjustment()
                let playerParams = player.dynamic.primary.player
                if (!playerParams.beijing) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前皮肤没有设置动态背景',
                        duration: 1500,    // 显示时间
                        closeable: false, // 可手动关闭
                    })
                    return
                }

                currentMode = modes.beijing
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(beijingBtn)
                hide(editBox)
            })

            qianjingBtn.listen(() => {
                saveCurrentModeAdjustment()
                let playerParams = player.dynamic.primary.player
                if (!playerParams.qianjing) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前皮肤没有设置动态前景',
                        duration: 1500,    // 显示时间
                        closeable: false, // 可手动关闭
                    })
                    return
                }

                currentMode = modes.qianjing
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(qianjingBtn)
                hide(editBox)
            })

            chukuangBtn.listen(() => {
                saveCurrentModeAdjustment()
                currentMode = modes.chukuang
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(chukuangBtn)
                hide(editBox)
            })

            chuchangBtn.listen(() => {
                saveCurrentModeAdjustment()
                let playerParams = player.dynamic.primary.player
                currentMode = modes.chuchang
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(chuchangBtn)
                hide(editBox)
            })

            teshuBtn.listen(() => {
                saveCurrentModeAdjustment()
                let playerParams = player.dynamic.primary.player
                currentMode = modes.teshu
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(teshuBtn)
                hide(editBox)
            })

            hudongBtn.listen(() => {
                saveCurrentModeAdjustment()
                let playerParams = player.dynamic.primary.player
                if (!playerParams.hudong) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前皮肤没有设置互动动画',
                        duration: 1500,
                        closeable: false,
                    })
                    return
                }
                currentMode = modes.hudong
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(hudongBtn)
                hide(editBox)
            })

            // 添加指示线按钮的事件监听器
            zhishixianBtn.listen(() => {
                saveCurrentModeAdjustment()
                let playerParams = player.dynamic.primary.player
                if (!playerParams.zhishixian) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前皮肤没有设置指示线动画',
                        duration: 1500,
                        closeable: false,
                    })
                    return
                }

                currentMode = modes.zhishixian
                showAdjustBar()
                showShizi(true)
                initPosParams()
                selfLoopPlay(currentMode)
                refreshBtnState(zhishixianBtn)
                hide(editBox)
            })

            saveBtn.listen(() => {
                // 保存当前调整
                saveCurrentModeAdjustment()

                // 只保存当前模式的调整参数
                saveToFile(true) // 传入true表示显示保存消息

                // 从临时调整中移除当前已保存的模式
                if (tempAdjustments[currentMode]) {
                    delete tempAdjustments[currentMode]
                }
            })

            let adjustDirection
            let arena = document.getElementById('arena')

            let showShizi = (hidden) => {
                // 初始化十字键
                if (!adjustDirection) {
                    adjustDirection = ui.create.div('.adjustDirection', arena);
                    adjustDirection.innerHTML = `
                        <div class="directionDiv" style="top:0;left:32.3%">
                            <button id="upbtn"><i class="up"></i></button>
                        </div>
                        <div class="directionDiv" style="top:26.3%;left:-30.3%">
                            <button id="leftbtn"><i class="left"></i></button>
                        </div>  
                        <div class="directionDiv" style="top:18.3%;left:32.3%">
                            <button id="bottombtn"><i class="down"></i></button>
                        </div>
                        <div class="directionDiv" style="top:-7%;left:23.3%">
                            <button id="rightbtn"><i class="right"></i></button>
                        </div>
                    `

                    let adjustDirectionHandler = (deltaX, deltaY) => {
                        initAdjustParams();
                        adjustX[1] += deltaX;
                        adjustY[1] += deltaY;
                        updatePosition();
                    };

                    continuousClick(adjustDirection.querySelector('#upbtn'), () => adjustDirectionHandler(0, 0.001));
                    continuousClick(adjustDirection.querySelector('#bottombtn'), () => adjustDirectionHandler(0, -0.001));
                    continuousClick(adjustDirection.querySelector('#leftbtn'), () => adjustDirectionHandler(-0.001, 0));
                    continuousClick(adjustDirection.querySelector('#rightbtn'), () => adjustDirectionHandler(0.001, 0));
                }
                if (hidden) adjustDirection.classList.add('hidden')
                else adjustDirection.classList.remove('hidden')

            }

            qhShouShaBtn.listen(function () {

                // 寻找千幻的节点,并更新当前player
                let qhNode
                let p = document.getElementById('mainView')
                // 尝试查找手杀大屏的node
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        qhNode = _canvas[0].parentNode.parentNode
                    }

                }
                if (!qhNode || !qhNode.dynamic || !qhNode.dynamic.primary) {
                    skinSwitchMessage.show({
                        'type': 'error',
                        'text': '必须打开千幻大屏预览页且当前预览角色是动皮才可以进行编辑调整'
                    })
                    return
                }
                currentFunc = funcs.qhShouSha
                // 必须保证当前已经打开了千幻的皮肤选择界面.
                funcContent.classList.add('hidden')
                adjustContent.classList.remove('hidden')

                // 停止原来的自动播放攻击动画和待机..
                clearInterval(_status.texiaoTimer);
                clearTimeout(_status.texiaoTimer2);

                // 检查全局参数的引用是否发生变化. 如果发生变化需要进行重新初始化
                player = qhNode
                player.isQhlx = true; // 表示当前动皮角色是千幻雷修版本的
                renderer = player.dynamic.renderer;
                dynamic = player.dynamic.primary;  // 这个是指代主将的sprite也就是APNode对象
                currentMode = modes.daiji
                initPosParams()
            })

            qhDecadeBtn.listen(function () {

                // 寻找千幻的节点,并更新当前player
                let qhNode
                let p = document.getElementById('mainView')
                // 尝试查找手杀大屏的node
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        qhNode = _canvas[0].parentNode.parentNode
                    }

                }
                if (!qhNode || !qhNode.dynamic || !qhNode.dynamic.primary) {
                    skinSwitchMessage.show({
                        'type': 'error',
                        'text': '必须打开千幻大屏预览页且当前预览角色是动皮才可以进行编辑调整'
                    })
                    return
                }
                currentFunc = funcs.qhDecade
                // 必须保证当前已经打开了千幻的皮肤选择界面.
                funcContent.classList.add('hidden')
                adjustContent.classList.remove('hidden')

                // 检查全局参数的引用是否发生变化. 如果发生变化需要进行重新初始化
                player = qhNode
                player.isQhlx = true; // 表示当前动皮角色是千幻雷修版本的
                renderer = player.dynamic.renderer;
                dynamic = player.dynamic.primary;  // 这个是指代主将的sprite也就是APNode对象
                currentMode = modes.daiji
                initPosParams()
            })

            let getDynamicPos = function (mode, func) {
                // 初始化adjustX和adjustY的默认值
                if (!adjustX) adjustX = [0, 0.5];
                if (!adjustY) adjustY = [0, 0.5];

                skinSwitch.postMsgApi.position(player, mode)
                skinSwitch.rendererOnMessage.addListener(player, 'position', func)
            }



            // 增加一个新的方法, 修改全局参数, 尤其是当皮肤也进行了变化
            editBox.updateGlobalParams = function () {
                // 检查全局参数的引用是否发生变化. 如果发生变化需要进行重新初始化
                // 优先使用全局设置的目标玩家，否则使用当前玩家
                let targetPlayer = window.qhly_editTargetPlayer || window.currentEditPlayer || player || game.me;
                player = targetPlayer;
                if (!player.dynamic) return
                renderer = player.dynamic.renderer;
                dynamic = player.dynamic.primary  // 这个是指代主将的sprite也就是APNode对象
                initPosParams()
            }

            let copyToClipboard = function (data) {
                // 保存当前动皮参数
                let copyData = `\t\t\t\tx: [${data.x}],\n\t\t\t\ty: [${data.y}],\n`
                if (data.angle) {
                    copyData += `\t\t\t\tangle: ${data.angle},\n`
                }
                if (data.scale != null) {
                    copyData += `\t\t\t\tscale: ${data.scale},\n`
                }
                // 复制到剪切板, 复制代码来源: https://juejin.cn/post/6844903567480848391
                const input = document.createElement('textarea');
                input.setAttribute('readonly', 'readonly');
                // input.setAttribute('value', copyData);
                input.value = copyData
                document.body.appendChild(input);
                if (document.execCommand('copy')) {
                    input.select()
                    document.execCommand('copy')
                    skinSwitchMessage.show({
                        type: 'success',
                        text: '复制成功',
                        duration: 1500,    // 显示时间
                        closeable: false, // 可手动关闭
                    })
                }
                document.body.removeChild(input);
            }

            let saveToFile = function (showMessage) {
                let primaryDynamic = player.dynamic.primary.player
                let playerName = player.name || player.parentNode.name
                if (!playerName) return

                let dskins = decadeUI.dynamicSkin[playerName]
                let saveKey
                for (let k in dskins) {
                    if (dskins[k].name === primaryDynamic.name) {
                        saveKey = k
                        break
                    }
                }

                if (saveKey) {
                    let modeToKey = {
                        daiji: 'daiji',
                        chukuang: 'gongji',
                        beijing: 'beijing',
                        qianjing: 'qianjing',
                        chuchang: 'chuchang',
                        teshu: 'teshu',
                        hudong: 'hudong',
                        zhishixian: 'zhishixian'
                    }

                    // 统一初始化参数
                    if (!skinSwitch.saveSkinParams) {
                        skinSwitch.saveSkinParams = {}
                    }
                    if (!skinSwitch.saveSkinParams[playerName]) {
                        skinSwitch.saveSkinParams[playerName] = {}
                    }
                    if (!skinSwitch.saveSkinParams[playerName][saveKey]) {
                        skinSwitch.saveSkinParams[playerName][saveKey] = {}
                    }

                    let toSaveData
                    if (player.isQhlx) {
                        if (!skinSwitch.saveSkinParams[playerName][saveKey].qhlx) {
                            skinSwitch.saveSkinParams[playerName][saveKey].qhlx = {}
                        }
                        if (currentFunc === funcs.qhDecade) {
                            if (!skinSwitch.saveSkinParams[playerName][saveKey].qhlx.decade) {
                                skinSwitch.saveSkinParams[playerName][saveKey].qhlx.decade = {}
                            }
                            toSaveData = skinSwitch.saveSkinParams[playerName][saveKey].qhlx.decade
                        } else {
                            toSaveData = skinSwitch.saveSkinParams[playerName][saveKey].qhlx
                        }
                    } else {
                        toSaveData = skinSwitch.saveSkinParams[playerName][saveKey]
                    }

                    // 保存当前模式的位置数据
                    adjustX[1] = Number(adjustX[1].toFixed(3))
                    adjustY[1] = Number(adjustY[1].toFixed(3))
                    let modeData = {
                        x: adjustX,
                        y: adjustY,
                        scale: Number(adjustScale.toFixed(3)),
                        angle: Number(adjustAngle.toFixed(3))
                    }

                    let k = modeToKey[currentMode]
                    if (!player.isQhlx && currentMode === modes.daiji) {
                        skinSwitch.saveSkinParams[playerName][saveKey] = Object.assign(skinSwitch.saveSkinParams[playerName][saveKey], modeData)
                    } else {
                        toSaveData[k] = modeData
                    }
                    function formatParams(obj, indent = '\t') {
                        if (obj === null) return 'null'
                        if (typeof obj !== 'object') {
                            if (typeof obj === 'string') return `"${obj}"`
                            return String(obj)
                        }
                        if (Array.isArray(obj)) {
                            return `[${obj.join(', ')}]`
                        }
                        
                        const keys = Object.keys(obj)
                        if (keys.length === 0) return '{}'
                        
                        const propOrder = ['x', 'y', 'angle', 'scale', 'name', 'action', 'speed', 'shizhounian', 'gongji', 'teshu', 'chuchang', 'beijing', 'qianjing', 'qhlx']
                        keys.sort((a, b) => {
                            const aIndex = propOrder.indexOf(a)
                            const bIndex = propOrder.indexOf(b)
                            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                            if (aIndex !== -1) return -1
                            if (bIndex !== -1) return 1
                            return a.localeCompare(b)
                        })
                        
                        const lines = ['{']
                        keys.forEach((key, index) => {
                            const value = obj[key]
                            const isLast = index === keys.length - 1
                            const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
                            const nextIndent = indent + '\t'
                            
                            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                lines.push(`${indent}\t${keyStr}: ${formatParams(value, nextIndent)}${isLast ? '' : ','}`)
                            } else {
                                lines.push(`${indent}\t${keyStr}: ${formatParams(value, nextIndent)}${isLast ? '' : ','}`)
                            }
                        })
                        lines.push(`${indent}}`)
                        return lines.join('\n')
                    }
                    let str = `window.skinSwitchLoadParams = function(lib, game, ui, get, ai, _status){\n`
                    str += `\twindow.skinSwitch.saveSkinParams = ${formatParams(skinSwitch.saveSkinParams)}\n`
                    str += '}'

                    // 添加防止短时间内多次显示保存成功的逻辑
                    if (showMessage && (!skinSwitch.lastSaveSuccessTime || (new Date().getTime() - skinSwitch.lastSaveSuccessTime) > 3000)) {
                        skinSwitch.lastSaveSuccessTime = new Date().getTime();
                        game.writeFile(str, skinSwitch.path, 'saveSkinParams.js', function () {
                            console.log('写入saveSkinParams.js成功')
                            skinSwitchMessage.show({
                                type: 'success',
                                text: '保存成功',
                                duration: 1500,
                                closeable: false
                            })
                        })
                    } else {
                        // 短时间内重复保存，不显示消息，只写入文件
                        game.writeFile(str, skinSwitch.path, 'saveSkinParams.js', function () {
                            console.log('写入saveSkinParams.js成功')
                        })
                    }

                    // 修改千幻雷修版本的值
                    if (skinSwitch.saveSkinParams[playerName][saveKey].qhlx) {
                        decadeUI.dynamicSkin[playerName][saveKey].qhlx = skinSwitch.saveSkinParams[playerName][saveKey].qhlx
                    }
                }
            }

            editBox.updateGlobalParams()
        },
        editBoxShowOrHide: function () {
            // 初始化一些参数
            if (!editBox) {
                // 优先使用全局设置的目标玩家
                let targetPlayer = window.qhly_editTargetPlayer || window.currentEditPlayer || game.me;
                player = targetPlayer;
                renderer = player.dynamic.renderer;
                dynamic = player.dynamic.primary  // 这个是指代主将的sprite也就是APNode对象
                this.editBoxInit()
                return editBox
            } else {
                // 检查是否有新的目标玩家
                let targetPlayer = window.qhly_editTargetPlayer || window.currentEditPlayer;
                if (targetPlayer && targetPlayer !== player) {
                    player = targetPlayer;
                    renderer = player.dynamic.renderer;
                    dynamic = player.dynamic.primary  // 这个是指代主将的sprite也就是APNode对象
                    editBox.updateGlobalParams(); // 更新编辑框参数
                } else if (game.me !== player && !targetPlayer) {
                    player = game.me
                    renderer = player.dynamic.renderer;
                    dynamic = player.dynamic.primary  // 这个是指代主将的sprite也就是APNode对象
                    editBox.updateGlobalParams(); // 更新编辑框参数
                } else if (player.dynamic.primary !== dynamic) {
                    renderer = player.dynamic.renderer;
                    dynamic = player.dynamic.primary  // 这个是指代主将的sprite也就是APNode对象
                }
            }
            toggleShow(editBox)
            return editBox
        }
    };
}
