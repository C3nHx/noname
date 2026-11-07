export function createChukuangWorkerApi(lib, ui, game, _status) {
    return {
        chukuangWorkerApi: {
            _elementIdCounter: 0,
            _followUpdateMap: new Map(),
            _startFollowUpdate: function(worker, elementId, originalParent, canvasId) {
                if (!this._followUpdateMap) this._followUpdateMap = new Map()
                let canvas = document.getElementById(canvasId)
                let updateLoop = () => {
                    if (!this._followUpdateMap.has(elementId)) return
                    try {
                        let parentRect = originalParent.getBoundingClientRect()
                        if (canvas) {
                            let canvasRect = canvas.getBoundingClientRect()
                            let bodySize = decadeUI.get.bodySize()
                            let boundRectInCanvas = {
                                left: parentRect.left - canvasRect.left,
                                top: parentRect.top - canvasRect.top,
                                right: parentRect.right - canvasRect.left,
                                bottom: parentRect.bottom - canvasRect.top,
                                width: parentRect.width,
                                height: parentRect.height,
                                x: parentRect.left - canvasRect.left,
                                y: parentRect.top - canvasRect.top,
                                bottomInBody: bodySize.height - parentRect.bottom,
                                canvasBottomInBody: bodySize.height - canvasRect.bottom
                            }
                            worker.postMessage({
                                message: "UPDATE_ELEMENT_BOUNDS",
                                elementId: elementId,
                                boundRect: boundRectInCanvas
                            })
                        } else {
                            worker.postMessage({
                                message: "UPDATE_ELEMENT_BOUNDS",
                                elementId: elementId,
                                boundRect: parentRect
                            })
                        }
                        requestAnimationFrame(updateLoop)
                    } catch (e) {
                        this._followUpdateMap.delete(elementId)
                    }
                }
                this._followUpdateMap.set(elementId, { element: originalParent, loop: updateLoop })
                requestAnimationFrame(updateLoop)
            },
            create: function () {
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas'
                canvas.style = `position: fixed; left: 0px; top: 0px; pointer-events:none; width:100%;height:100%;`
                canvas.height = decadeUI.get.bodySize().height
                canvas.width = decadeUI.get.bodySize().width
                let div = ui.create.div('.chukuang-canvas-wraper', document.body)
                div.appendChild(canvas)
                div.id = 'chukuang-canvas-wraper'
                canvas.id = 'chukuang-canvas'
                if (self.ResizeObserver) {
                    let ro = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            if (skinSwitch.chukuangWorker) {
                                const cr = entry.contentRect
                                skinSwitch.chukuangWorker.postMessage({
                                    message: 'UPDATE',
                                    width: cr.width,
                                    height: cr.height,
                                })
                            }
                        }
                    });
                    ro.observe(document.body);
                }
                let offsetCanvas = canvas.transferControlToOffscreen();
                skinSwitch.chukuangWorker.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipX: lib.config[skinSwitch.configKey.isAttackFlipX]
                }, [offsetCanvas]);
            },
            create2: function () {
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas2'
                canvas.style = `position: fixed; left: 0px; top: 0px; pointer-events:none; width:100%;height:100%; z-index: 4;`
                canvas.height = decadeUI.get.bodySize().height
                canvas.width = decadeUI.get.bodySize().width
                let div = ui.create.div('.chukuang-canvas-wraper2', document.body)
                div.style.zIndex = '4'
                div.appendChild(canvas)
                div.id = 'chukuang-canvas-wraper2'
                canvas.id = 'chukuang-canvas2'
                if (self.ResizeObserver) {
                    let ro = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            if (skinSwitch.chukuangWorker2) {
                                const cr = entry.contentRect
                                skinSwitch.chukuangWorker2.postMessage({
                                    message: 'UPDATE',
                                    width: cr.width,
                                    height: cr.height,
                                })
                            }
                        }
                    });
                    ro.observe(document.body);
                }
                let offsetCanvas = canvas.transferControlToOffscreen();
                skinSwitch.chukuangWorker2.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipX: lib.config[skinSwitch.configKey.isAttackFlipX]
                }, [offsetCanvas]);
            },
            create3: function () {
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas3'
                canvas.style = `position: fixed; left: 0px; top: 0px; pointer-events:none; width:100%;height:100%; z-index: -2;`
                canvas.height = decadeUI.get.bodySize().height
                canvas.width = decadeUI.get.bodySize().width
                let div = ui.create.div('.chukuang-canvas-wraper3', document.body)
                div.style.zIndex = '-2'
                div.appendChild(canvas)
                div.id = 'chukuang-canvas-wraper3'
                canvas.id = 'chukuang-canvas3'
                if (self.ResizeObserver) {
                    let ro = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            if (skinSwitch.chukuangWorker3) {
                                const cr = entry.contentRect
                                skinSwitch.chukuangWorker3.postMessage({
                                    message: 'UPDATE',
                                    width: cr.width,
                                    height: cr.height,
                                })
                            }
                        }
                    });
                    ro.observe(document.body);
                }
                let offsetCanvas = canvas.transferControlToOffscreen();
                skinSwitch.chukuangWorker3.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipX: lib.config[skinSwitch.configKey.isAttackFlipX]
                }, [offsetCanvas]);
            },
            // 新增create4 z-index:-1
            create4: function () {
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas4'
                canvas.style = `position: fixed; left: 0px; top: 0px; pointer-events:none; width:100%;height:100%; z-index: -1;`
                canvas.height = decadeUI.get.bodySize().height
                canvas.width = decadeUI.get.bodySize().width
                let div = ui.create.div('.chukuang-canvas-wraper4', document.body)
                div.style.zIndex = '-1'
                div.appendChild(canvas)
                div.id = 'chukuang-canvas-wraper4'
                canvas.id = 'chukuang-canvas4'
                if (self.ResizeObserver) {
                    let ro = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            if (skinSwitch.chukuangWorker4) {
                                const cr = entry.contentRect
                                skinSwitch.chukuangWorker4.postMessage({
                                    message: 'UPDATE',
                                    width: cr.width,
                                    height: cr.height,
                                })
                            }
                        }
                    });
                    ro.observe(document.body);
                }
                let offsetCanvas = canvas.transferControlToOffscreen();
                skinSwitch.chukuangWorker4.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipX: lib.config[skinSwitch.configKey.isAttackFlipX]
                }, [offsetCanvas]);
            },
            // 新增create5 z-index:-1
            create5: function () {
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas5'
                canvas.style = `position: fixed; left: 0px; top: 0px; pointer-events:none; width:100%;height:100%; z-index: -1;`
                canvas.height = decadeUI.get.bodySize().height
                canvas.width = decadeUI.get.bodySize().width
                let div = ui.create.div('.chukuang-canvas-wraper5', document.body)
                div.style.zIndex = '-1'
                div.appendChild(canvas)
                div.id = 'chukuang-canvas-wraper5'
                canvas.id = 'chukuang-canvas5'
                if (self.ResizeObserver) {
                    let ro = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            if (skinSwitch.chukuangWorker5) {
                                const cr = entry.contentRect
                                skinSwitch.chukuangWorker5.postMessage({
                                    message: 'UPDATE',
                                    width: cr.width,
                                    height: cr.height,
                                })
                            }
                        }
                    });
                    ro.observe(document.body);
                }
                let offsetCanvas = canvas.transferControlToOffscreen();
                skinSwitch.chukuangWorker5.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipXShizhounian: lib.config[skinSwitch.configKey.isAttackFlipXShizhounian],
                    isAttackFlipXShousha: lib.config[skinSwitch.configKey.isAttackFlipXShousha]
                }, [offsetCanvas]);
            },
            // 新增create6 z-index:10
            create6: function () {
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas6'
                canvas.style = `position: fixed; left: 0px; top: 0px; pointer-events:none; width:100%;height:100%; z-index: 10;`
                canvas.height = decadeUI.get.bodySize().height
                canvas.width = decadeUI.get.bodySize().width
                let div = ui.create.div('.chukuang-canvas-wraper6', document.body)
                div.style.zIndex = '10'
                div.appendChild(canvas)
                div.id = 'chukuang-canvas-wraper6'
                canvas.id = 'chukuang-canvas6'
                if (self.ResizeObserver) {
                    let ro = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            if (skinSwitch.chukuangWorker6) {
                                const cr = entry.contentRect
                                skinSwitch.chukuangWorker6.postMessage({
                                    message: 'UPDATE',
                                    width: cr.width,
                                    height: cr.height,
                                })
                            }
                        }
                    });
                    ro.observe(document.body);
                }
                let offsetCanvas = canvas.transferControlToOffscreen();
                skinSwitch.chukuangWorker6.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipX: lib.config[skinSwitch.configKey.isAttackFlipX]
                }, [offsetCanvas]);
            },
            // 新增create7 z-index:10
            create7: function () {
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas7'
                canvas.style = `position: fixed; left: 0px; top: 0px; pointer-events:none; width:100%;height:100%; z-index: 10;`
                canvas.height = decadeUI.get.bodySize().height
                canvas.width = decadeUI.get.bodySize().width
                let div = ui.create.div('.chukuang-canvas-wraper7', document.body)
                div.style.zIndex = '10'
                div.appendChild(canvas)
                div.id = 'chukuang-canvas-wraper7'
                canvas.id = 'chukuang-canvas7'
                if (self.ResizeObserver) {
                    let ro = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            if (skinSwitch.chukuangWorker7) {
                                const cr = entry.contentRect
                                skinSwitch.chukuangWorker7.postMessage({
                                    message: 'UPDATE',
                                    width: cr.width,
                                    height: cr.height,
                                })
                            }
                        }
                    });
                    ro.observe(document.body);
                }
                let offsetCanvas = canvas.transferControlToOffscreen();
                skinSwitch.chukuangWorker7.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipX: lib.config[skinSwitch.configKey.isAttackFlipX]
                }, [offsetCanvas]);
            },
            preLoad: function (id, skinId, skinPlayer) {
                skinSwitch.chukuangWorker.postMessage({
                    message: 'PRELOAD',
                    player: skinPlayer,
                    id: id,
                    skinId: skinId
                })
            },
            action: function (player, action) {
                let res = skinSwitch.dynamic.checkCanBeAction(player)
                let pp = skinSwitch.getCoordinate(player, true)
                let me = player === game.me
                if (res && res.dynamic) {
                    if (!player.dynamic.renderer.postMessage) {
                        skinSwitchMessage.show({
                            type: 'warning',
                            text: '当前动皮过多',
                            duration: 1500,
                            closeable: false,
                        })
                        clearInterval(_status.texiaoTimer);
                        clearTimeout(_status.texiaoTimer2);
                        return
                    }
                    skinSwitch.chukuangWorkerInit()
                    skinSwitch.chukuangWorker.postMessage({
                        message: 'ACTION',
                        id: player.dynamic.id,
                        action: action,
                        skinId: res.dynamic.id,
                        isDouble: res.isDouble,
                        deputy: res.deputy,
                        needHide: res.needHide,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                        selfPhase: _status.currentPhase === player
                    })
                } else {
                    player.GongJi = false
                }
                return res
            },
            chukuangAction: function (player, action, extraParams) {
                let dynamic = player.dynamic
                if (!dynamic || (!dynamic.primary && !dynamic.deputy)) {
                    return
                }
                skinSwitch.chukuangWorkerInit()
                skinSwitch.chukuangWorker.postMessage({
                    message: 'isChuKuang',
                    id: dynamic.id,
                    primarySkinId: (!player.isUnseen || !player.isUnseen(0)) && dynamic.primary && dynamic.primary.id,
                    deputySkinId: (!player.isUnseen || !player.isUnseen(1)) && dynamic.deputy && dynamic.deputy.id,
                    action: action,
                    extraParams: extraParams,
                })
            },
            adjust: function (player, posData, action) {
                skinSwitch.chukuangWorkerInit()
                skinSwitch.chukuangWorker.postMessage({
                    message: "ADJUST",
                    id: player.dynamic.id,
                    skinId: player.dynamic.primary.id,
                    action: action,
                    xyPos: posData.xyPos,
                    x: posData.x,
                    y: posData.y,
                    scale: posData.scale,
                    angle: posData.angle
                })
            },
            playEffect: function (sprite, position) {
                skinSwitch.chukuangWorkerInit()
                let originalParent = null
                let elementId = null
                if (position && position.parent) {
                    if (position.parent instanceof Element || position.parent instanceof HTMLElement || position.parent.getBoundingClientRect) {
                        originalParent = position.parent
                        elementId = this._elementIdCounter++
                        position.elementId = elementId
                        let canvas = document.getElementById('chukuang-canvas')
                        let parentRect = position.parent.getBoundingClientRect()
                        if (canvas) {
                            let canvasRect = canvas.getBoundingClientRect()
                            let bodySize = decadeUI.get.bodySize()
                            let boundRectInCanvas = {
                                left: parentRect.left - canvasRect.left,
                                top: parentRect.top - canvasRect.top,
                                right: parentRect.right - canvasRect.left,
                                bottom: parentRect.bottom - canvasRect.top,
                                width: parentRect.width,
                                height: parentRect.height,
                                x: parentRect.left - canvasRect.left,
                                y: parentRect.top - canvasRect.top,
                            }
                            let parentBottomInBody = bodySize.height - parentRect.bottom
                            let canvasBottomInBody = bodySize.height - canvasRect.bottom
                            boundRectInCanvas.bottomInBody = parentBottomInBody
                            boundRectInCanvas.canvasBottomInBody = canvasBottomInBody
                            position.parent = {
                                boundRect: boundRectInCanvas,
                                bodySize: {
                                    bodyWidth: Math.round(canvasRect.width),
                                    bodyHeight: Math.round(canvasRect.height)
                                }
                            }
                        } else {
                            position.parent = {
                                boundRect: parentRect,
                                bodySize: {
                                    bodyWidth: decadeUI.get.bodySize().width,
                                    bodyHeight: decadeUI.get.bodySize().height
                                }
                            }
                        }
                    }
                }
                if (!position) position = {}
                skinSwitch.chukuangWorker.postMessage({
                    message: "PLAY_EFFECT",
                    sprite,
                    position: position,
                })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(skinSwitch.chukuangWorker, elementId, originalParent, 'chukuang-canvas')
                }
            },
            playEffect2: function (sprite, position) {
                skinSwitch.chukuangWorkerInit2()
                let originalParent = null
                let elementId = null
                if (position && position.parent) {
                    originalParent = position.parent
                    elementId = this._elementIdCounter++
                    position.elementId = elementId
                    let canvas = document.getElementById('chukuang-canvas2')
                    let parentRect = position.parent.getBoundingClientRect()
                    if (canvas) {
                        let canvasRect = canvas.getBoundingClientRect()
                        let bodySize = decadeUI.get.bodySize()
                        let boundRectInCanvas = {
                            left: parentRect.left - canvasRect.left,
                            top: parentRect.top - canvasRect.top,
                            right: parentRect.right - canvasRect.left,
                            bottom: parentRect.bottom - canvasRect.top,
                            width: parentRect.width,
                            height: parentRect.height,
                            x: parentRect.left - canvasRect.left,
                            y: parentRect.top - canvasRect.top,
                        }
                        let parentBottomInBody = bodySize.height - parentRect.bottom
                        let canvasBottomInBody = bodySize.height - canvasRect.bottom
                        boundRectInCanvas.bottomInBody = parentBottomInBody
                        boundRectInCanvas.canvasBottomInBody = canvasBottomInBody
                        position.parent = {
                            boundRect: boundRectInCanvas,
                            bodySize: {
                                bodyWidth: Math.round(canvasRect.width),
                                bodyHeight: Math.round(canvasRect.height)
                            }
                        }
                    } else {
                        position.parent = {
                            boundRect: parentRect,
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        }
                    }
                }
                if (!position) position = {}
                skinSwitch.chukuangWorker2.postMessage({
                    message: "PLAY_EFFECT2",
                    sprite,
                    position: position,
                })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(skinSwitch.chukuangWorker2, elementId, originalParent, 'chukuang-canvas2')
                }
            },
            playEffect3: function (sprite, position) {
                skinSwitch.chukuangWorkerInit3()
                let originalParent = null
                let elementId = null
                if (position && position.parent) {
                    originalParent = position.parent
                    elementId = this._elementIdCounter++
                    position.elementId = elementId
                    let canvas = document.getElementById('chukuang-canvas3')
                    let parentRect = position.parent.getBoundingClientRect()
                    if (canvas) {
                        let canvasRect = canvas.getBoundingClientRect()
                        let bodySize = decadeUI.get.bodySize()
                        let boundRectInCanvas = {
                            left: parentRect.left - canvasRect.left,
                            top: parentRect.top - canvasRect.top,
                            right: parentRect.right - canvasRect.left,
                            bottom: parentRect.bottom - canvasRect.top,
                            width: parentRect.width,
                            height: parentRect.height,
                            x: parentRect.left - canvasRect.left,
                            y: parentRect.top - canvasRect.top,
                        }
                        let parentBottomInBody = bodySize.height - parentRect.bottom
                        let canvasBottomInBody = bodySize.height - canvasRect.bottom
                        boundRectInCanvas.bottomInBody = parentBottomInBody
                        boundRectInCanvas.canvasBottomInBody = canvasBottomInBody
                        position.parent = {
                            boundRect: boundRectInCanvas,
                            bodySize: {
                                bodyWidth: Math.round(canvasRect.width),
                                bodyHeight: Math.round(canvasRect.height)
                            }
                        }
                    } else {
                        position.parent = {
                            boundRect: parentRect,
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        }
                    }
                }
                if (!position) position = {}
                skinSwitch.chukuangWorker3.postMessage({
                    message: "PLAY_EFFECT3",
                    sprite,
                    position: position,
                })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(skinSwitch.chukuangWorker3, elementId, originalParent, 'chukuang-canvas3')
                }
            },
            // 新增playEffect4
            playEffect4: function (sprite, position) {
                skinSwitch.chukuangWorkerInit4()
                let originalParent = null
                let elementId = null
                if (position && position.parent) {
                    originalParent = position.parent
                    elementId = this._elementIdCounter++
                    position.elementId = elementId
                    let canvas = document.getElementById('chukuang-canvas4')
                    let parentRect = position.parent.getBoundingClientRect()
                    if (canvas) {
                        let canvasRect = canvas.getBoundingClientRect()
                        let bodySize = decadeUI.get.bodySize()
                        let boundRectInCanvas = {
                            left: parentRect.left - canvasRect.left,
                            top: parentRect.top - canvasRect.top,
                            right: parentRect.right - canvasRect.left,
                            bottom: parentRect.bottom - canvasRect.top,
                            width: parentRect.width,
                            height: parentRect.height,
                            x: parentRect.left - canvasRect.left,
                            y: parentRect.top - canvasRect.top,
                        }
                        let parentBottomInBody = bodySize.height - parentRect.bottom
                        let canvasBottomInBody = bodySize.height - canvasRect.bottom
                        boundRectInCanvas.bottomInBody = parentBottomInBody
                        boundRectInCanvas.canvasBottomInBody = canvasBottomInBody
                        position.parent = {
                            boundRect: boundRectInCanvas,
                            bodySize: {
                                bodyWidth: Math.round(canvasRect.width),
                                bodyHeight: Math.round(canvasRect.height)
                            }
                        }
                    } else {
                        position.parent = {
                            boundRect: parentRect,
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        }
                    }
                }
                if (!position) position = {}
                skinSwitch.chukuangWorker4.postMessage({
                    message: "PLAY_EFFECT4",
                    sprite,
                    position: position,
                })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(skinSwitch.chukuangWorker4, elementId, originalParent, 'chukuang-canvas4')
                }
            },
            // 新增playEffect5
            playEffect5: function (sprite, position) {
                skinSwitch.chukuangWorkerInit5()
                let originalParent = null
                let elementId = null
                if (position && position.parent) {
                    originalParent = position.parent
                    elementId = this._elementIdCounter++
                    position.elementId = elementId
                    let canvas = document.getElementById('chukuang-canvas5')
                    let parentRect = position.parent.getBoundingClientRect()
                    if (canvas) {
                        let canvasRect = canvas.getBoundingClientRect()
                        let bodySize = decadeUI.get.bodySize()
                        let boundRectInCanvas = {
                            left: parentRect.left - canvasRect.left,
                            top: parentRect.top - canvasRect.top,
                            right: parentRect.right - canvasRect.left,
                            bottom: parentRect.bottom - canvasRect.top,
                            width: parentRect.width,
                            height: parentRect.height,
                            x: parentRect.left - canvasRect.left,
                            y: parentRect.top - canvasRect.top,
                        }
                        let parentBottomInBody = bodySize.height - parentRect.bottom
                        let canvasBottomInBody = bodySize.height - canvasRect.bottom
                        boundRectInCanvas.bottomInBody = parentBottomInBody
                        boundRectInCanvas.canvasBottomInBody = canvasBottomInBody
                        position.parent = {
                            boundRect: boundRectInCanvas,
                            bodySize: {
                                bodyWidth: Math.round(canvasRect.width),
                                bodyHeight: Math.round(canvasRect.height)
                            }
                        }
                    } else {
                        position.parent = {
                            boundRect: parentRect,
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        }
                    }
                }
                if (!position) position = {}
                skinSwitch.chukuangWorker5.postMessage({
                    message: "PLAY_EFFECT5",
                    sprite,
                    position: position,
                })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(skinSwitch.chukuangWorker5, elementId, originalParent, 'chukuang-canvas5')
                }
            },
            // 新增playEffect6
            playEffect6: function (sprite, position) {
                skinSwitch.chukuangWorkerInit6()
                let originalParent = null
                let elementId = null
                if (position && position.parent) {
                    originalParent = position.parent
                    elementId = this._elementIdCounter++
                    position.elementId = elementId
                    let canvas = document.getElementById('chukuang-canvas6')
                    let parentRect = position.parent.getBoundingClientRect()
                    if (canvas) {
                        let canvasRect = canvas.getBoundingClientRect()
                        let bodySize = decadeUI.get.bodySize()
                        let boundRectInCanvas = {
                            left: parentRect.left - canvasRect.left,
                            top: parentRect.top - canvasRect.top,
                            right: parentRect.right - canvasRect.left,
                            bottom: parentRect.bottom - canvasRect.top,
                            width: parentRect.width,
                            height: parentRect.height,
                            x: parentRect.left - canvasRect.left,
                            y: parentRect.top - canvasRect.top,
                        }
                        let parentBottomInBody = bodySize.height - parentRect.bottom
                        let canvasBottomInBody = bodySize.height - canvasRect.bottom
                        boundRectInCanvas.bottomInBody = parentBottomInBody
                        boundRectInCanvas.canvasBottomInBody = canvasBottomInBody
                        position.parent = {
                            boundRect: boundRectInCanvas,
                            bodySize: {
                                bodyWidth: Math.round(canvasRect.width),
                                bodyHeight: Math.round(canvasRect.height)
                            }
                        }
                    } else {
                        position.parent = {
                            boundRect: parentRect,
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        }
                    }
                }
                if (!position) position = {}
                skinSwitch.chukuangWorker6.postMessage({
                    message: "PLAY_EFFECT6",
                    sprite,
                    position: position,
                })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(skinSwitch.chukuangWorker6, elementId, originalParent, 'chukuang-canvas6')
                }
            },
            // 新增playEffect7
            playEffect7: function (sprite, position) {
                skinSwitch.chukuangWorkerInit7()
                let originalParent = null
                let elementId = null
                if (position && position.parent) {
                    originalParent = position.parent
                    elementId = this._elementIdCounter++
                    position.elementId = elementId
                    let canvas = document.getElementById('chukuang-canvas7')
                    let parentRect = position.parent.getBoundingClientRect()
                    if (canvas) {
                        let canvasRect = canvas.getBoundingClientRect()
                        let bodySize = decadeUI.get.bodySize()
                        let boundRectInCanvas = {
                            left: parentRect.left - canvasRect.left,
                            top: parentRect.top - canvasRect.top,
                            right: parentRect.right - canvasRect.left,
                            bottom: parentRect.bottom - canvasRect.top,
                            width: parentRect.width,
                            height: parentRect.height,
                            x: parentRect.left - canvasRect.left,
                            y: parentRect.top - canvasRect.top,
                        }
                        let parentBottomInBody = bodySize.height - parentRect.bottom
                        let canvasBottomInBody = bodySize.height - canvasRect.bottom
                        boundRectInCanvas.bottomInBody = parentBottomInBody
                        boundRectInCanvas.canvasBottomInBody = canvasBottomInBody
                        position.parent = {
                            boundRect: boundRectInCanvas,
                            bodySize: {
                                bodyWidth: Math.round(canvasRect.width),
                                bodyHeight: Math.round(canvasRect.height)
                            }
                        }
                    } else {
                        position.parent = {
                            boundRect: parentRect,
                            bodySize: {
                                bodyWidth: decadeUI.get.bodySize().width,
                                bodyHeight: decadeUI.get.bodySize().height
                            }
                        }
                    }
                }
                if (!position) position = {}
                skinSwitch.chukuangWorker7.postMessage({
                    message: "PLAY_EFFECT7",
                    sprite,
                    position: position,
                })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(skinSwitch.chukuangWorker7, elementId, originalParent, 'chukuang-canvas7')
                }
            },
            stopEffect: function (sprite) {
                if (skinSwitch.chukuangWorker) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker.postMessage({
                        message: "STOP_EFFECT",
                        sprite: spriteData,
                    })
                }
            },
            stopEffect2: function (sprite) {
                if (skinSwitch.chukuangWorker2) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker2.postMessage({
                        message: "STOP_EFFECT2",
                        sprite: spriteData,
                    })
                }
            },
            stopEffect3: function (sprite) {
                if (skinSwitch.chukuangWorker3) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker3.postMessage({
                        message: "STOP_EFFECT3",
                        sprite: spriteData,
                    })
                }
            },
            // 新增stopEffect4
            stopEffect4: function (sprite) {
                if (skinSwitch.chukuangWorker4) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker4.postMessage({
                        message: "STOP_EFFECT4",
                        sprite: spriteData,
                    })
                }
            },
            // 新增stopEffect5
            stopEffect5: function (sprite) {
                if (skinSwitch.chukuangWorker5) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker5.postMessage({
                        message: "STOP_EFFECT5",
                        sprite: spriteData,
                    })
                }
            },
            // 新增stopEffect6
            stopEffect6: function (sprite) {
                if (skinSwitch.chukuangWorker6) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker6.postMessage({
                        message: "STOP_EFFECT6",
                        sprite: spriteData,
                    })
                }
            },
            // 新增stopEffect7
            stopEffect7: function (sprite) {
                if (skinSwitch.chukuangWorker7) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker7.postMessage({
                        message: "STOP_EFFECT7",
                        sprite: spriteData,
                    })
                }
            },
            clearEffect: function (sprite) {
                skinSwitch.chukuangWorkerInit()
                skinSwitch.chukuangWorker.postMessage({
                    message: "CLEAR_EFFECT",
                    sprite: sprite,
                })
            },
            clearEffect2: function (sprite) {
                skinSwitch.chukuangWorkerInit2()
                skinSwitch.chukuangWorker2.postMessage({
                    message: "CLEAR_EFFECT2",
                    sprite: sprite,
                })
            },
            // 新增clearEffect3
            clearEffect3: function (sprite) {
                skinSwitch.chukuangWorkerInit3()
                skinSwitch.chukuangWorker3.postMessage({
                    message: "CLEAR_EFFECT3",
                    sprite: sprite,
                })
            },
            // 新增clearEffect4
            clearEffect4: function (sprite) {
                skinSwitch.chukuangWorkerInit4()
                skinSwitch.chukuangWorker4.postMessage({
                    message: "CLEAR_EFFECT4",
                    sprite: sprite,
                })
            },
            // 新增clearEffect5
            clearEffect5: function (sprite) {
                skinSwitch.chukuangWorkerInit5()
                skinSwitch.chukuangWorker5.postMessage({
                    message: "CLEAR_EFFECT5",
                    sprite: sprite,
                })
            },
            // 新增clearEffect6
            clearEffect6: function (sprite) {
                skinSwitch.chukuangWorkerInit6()
                skinSwitch.chukuangWorker6.postMessage({
                    message: "CLEAR_EFFECT6",
                    sprite: sprite,
                })
            },
            // 新增clearEffect7
            clearEffect7: function (sprite) {
                skinSwitch.chukuangWorkerInit7()
                skinSwitch.chukuangWorker7.postMessage({
                    message: "CLEAR_EFFECT7",
                    sprite: sprite,
                })
            },
            clearAllEffects: function () {
                skinSwitch.chukuangWorkerInit()
                skinSwitch.chukuangWorker.postMessage({
                    message: "CLEAR_ALL_EFFECTS"
                })
            },
            clearAllEffects2: function () {
                skinSwitch.chukuangWorkerInit2()
                skinSwitch.chukuangWorker2.postMessage({
                    message: "CLEAR_ALL_EFFECTS2"
                })
            },
            // 新增clearAllEffects3
            clearAllEffects3: function () {
                skinSwitch.chukuangWorkerInit3()
                skinSwitch.chukuangWorker3.postMessage({
                    message: "CLEAR_ALL_EFFECTS3"
                })
            },
            // 新增clearAllEffects4
            clearAllEffects4: function () {
                skinSwitch.chukuangWorkerInit4()
                skinSwitch.chukuangWorker4.postMessage({
                    message: "CLEAR_ALL_EFFECTS4"
                })
            },
            // 新增clearAllEffects5
            clearAllEffects5: function () {
                skinSwitch.chukuangWorkerInit5()
                skinSwitch.chukuangWorker5.postMessage({
                    message: "CLEAR_ALL_EFFECTS5"
                })
            },
            // 新增clearAllEffects6
            clearAllEffects6: function () {
                skinSwitch.chukuangWorkerInit6()
                skinSwitch.chukuangWorker6.postMessage({
                    message: "CLEAR_ALL_EFFECTS6"
                })
            },
            // 新增clearAllEffects7
            clearAllEffects7: function () {
                skinSwitch.chukuangWorkerInit7()
                skinSwitch.chukuangWorker7.postMessage({
                    message: "CLEAR_ALL_EFFECTS7"
                })
            },
            loadResources: function (players, skels) {
                skinSwitch.chukuangWorkerInit()
                skinSwitch.chukuangWorker.postMessage({
                    message: "LOAD_RESOURCES",
                    players,
                    skels,
                })
            },
            preloadEffect: function (sprite) {
                skinSwitch.chukuangWorkerInit()
                let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                skinSwitch.chukuangWorker.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: [spriteData]
                })
            },
            preloadEffect2: function (sprite) {
                skinSwitch.chukuangWorkerInit2()
                let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                skinSwitch.chukuangWorker2.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: [spriteData]
                })
            },
            preloadEffect3: function (sprite) {
                skinSwitch.chukuangWorkerInit3()
                let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                skinSwitch.chukuangWorker3.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: [spriteData]
                })
            },
            // 新增preloadEffect4
            preloadEffect4: function (sprite) {
                skinSwitch.chukuangWorkerInit4()
                let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                skinSwitch.chukuangWorker4.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: [spriteData]
                })
            },
            // 新增preloadEffect5
            preloadEffect5: function (sprite) {
                skinSwitch.chukuangWorkerInit5()
                let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                skinSwitch.chukuangWorker5.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: [spriteData]
                })
            },
            // 新增preloadEffect6
            preloadEffect6: function (sprite) {
                skinSwitch.chukuangWorkerInit6()
                let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                skinSwitch.chukuangWorker6.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: [spriteData]
                })
            },
            // 新增preloadEffect7
            preloadEffect7: function (sprite) {
                skinSwitch.chukuangWorkerInit7()
                let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                skinSwitch.chukuangWorker7.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: [spriteData]
                })
            },
            preloadEffects: function (sprites) {
                skinSwitch.chukuangWorkerInit()
                let skels = sprites.map(sprite => typeof sprite === 'string' ? { name: sprite } : sprite)
                skinSwitch.chukuangWorker.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: skels
                })
            },
            preloadEffects2: function (sprites) {
                skinSwitch.chukuangWorkerInit2()
                let skels = sprites.map(sprite => typeof sprite === 'string' ? { name: sprite } : sprite)
                skinSwitch.chukuangWorker2.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: skels
                })
            },
            preloadEffects3: function (sprites) {
                skinSwitch.chukuangWorkerInit3()
                let skels = sprites.map(sprite => typeof sprite === 'string' ? { name: sprite } : sprite)
                skinSwitch.chukuangWorker3.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: skels
                })
            },
            // 新增preloadEffects4
            preloadEffects4: function (sprites) {
                skinSwitch.chukuangWorkerInit4()
                let skels = sprites.map(sprite => typeof sprite === 'string' ? { name: sprite } : sprite)
                skinSwitch.chukuangWorker4.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: skels
                })
            },
            // 新增preloadEffects5
            preloadEffects5: function (sprites) {
                skinSwitch.chukuangWorkerInit5()
                let skels = sprites.map(sprite => typeof sprite === 'string' ? { name: sprite } : sprite)
                skinSwitch.chukuangWorker5.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: skels
                })
            },
            // 新增preloadEffects6
            preloadEffects6: function (sprites) {
                skinSwitch.chukuangWorkerInit6()
                let skels = sprites.map(sprite => typeof sprite === 'string' ? { name: sprite } : sprite)
                skinSwitch.chukuangWorker6.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: skels
                })
            },
            // 新增preloadEffects7
            preloadEffects7: function (sprites) {
                skinSwitch.chukuangWorkerInit7()
                let skels = sprites.map(sprite => typeof sprite === 'string' ? { name: sprite } : sprite)
                skinSwitch.chukuangWorker7.postMessage({
                    message: "LOAD_RESOURCES",
                    players: null,
                    skels: skels
                })
            },
            _canvas5Map: null,
            _effect5DefaultPadding: 400,
            _effect5DefaultScale: 4,
            _updateCanvas5Position: function (canvas, parent, padding, scale) {
                if (!canvas || !parent || !parent.getBoundingClientRect) return
                const rect = parent.getBoundingClientRect()
                const expandedWidth = Math.max(rect.width * scale, rect.width + padding * 2)
                const expandedHeight = Math.max(rect.height * scale, rect.height + padding * 2)
                const offsetX = (expandedWidth - rect.width) / 2
                const offsetY = (expandedHeight - rect.height) / 2
                canvas.style.left = (-offsetX) + 'px'
                canvas.style.top = (-offsetY) + 'px'
                canvas.style.width = expandedWidth + 'px'
                canvas.style.height = expandedHeight + 'px'
            },
            _getOrCreateCanvas5ForElement: function (parent, position) {
                if (!parent || !(parent instanceof Element || parent instanceof HTMLElement || parent.getBoundingClientRect)) return null
                if (!this._canvas5Map) this._canvas5Map = new Map()
                let entry = this._canvas5Map.get(parent)
                if (entry && entry.canvas.parentNode === parent) return entry
                const api = this
                const padding = (position && typeof position.padding === 'number') ? position.padding : this._effect5DefaultPadding
                const scale = (position && typeof position.scale === 'number') ? position.scale : this._effect5DefaultScale
                const elementPosition = window.getComputedStyle(parent).position
                if (elementPosition === 'static') parent.style.position = 'relative'
                let canvas = document.createElement('canvas')
                canvas.className = 'chukuang-canvas5'
                canvas.style.position = 'absolute'
                canvas.style.pointerEvents = 'none'
                canvas._effect5Padding = padding
                canvas._effect5Scale = scale
                parent.appendChild(canvas)
                api._updateCanvas5Position(canvas, parent, padding, scale)
                let worker = new Worker(skinSwitch.url + 'chukuangWorker.js')
                const dpr = Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1)
                canvas.width = Math.round(canvas.clientWidth * dpr)
                canvas.height = Math.round(canvas.clientHeight * dpr)
                if (self.ResizeObserver) {
                    let observer = new ResizeObserver(function (entries) {
                        for (let i = 0; i < entries.length; i++) {
                            if (worker && canvas.observeId === entries[i].target.observeId) {
                                const cr = entries[i].contentRect
                                worker.postMessage({ message: 'UPDATE', width: Math.round(cr.width), height: Math.round(cr.height) })
                            }
                        }
                    })
                    canvas.observeId = 'canvas5_' + Date.now() + '_' + Math.random().toString(36).slice(2)
                    observer.observe(canvas)
                }
                const updateLoop = () => {
                    if (canvas && canvas.parentNode === parent && parent && parent.parentElement) {
                        api._updateCanvas5Position(canvas, parent, canvas._effect5Padding, canvas._effect5Scale)
                        requestAnimationFrame(updateLoop)
                    }
                }
                requestAnimationFrame(updateLoop)
                let offsetCanvas = canvas.transferControlToOffscreen()
                worker.postMessage({
                    message: 'CREATE',
                    canvas: offsetCanvas,
                    pathPrefix: '../十周年UI/assets/dynamic/',
                    isMobile: skinSwitch.isMobile(),
                    dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                    isAttackFlipXShizhounian: lib.config[skinSwitch.configKey.isAttackFlipXShizhounian],
                    isAttackFlipXShousha: lib.config[skinSwitch.configKey.isAttackFlipXShousha]
                }, [offsetCanvas])
                entry = { worker, canvas }
                this._canvas5Map.set(parent, entry)
                return entry
            },
            _lastWeiweixiao: null,
            weiweixiao: function (sprite, position) {
                let parent = position && position.parent
                let worker = null
                let spriteName = (typeof sprite === 'string' ? sprite : (sprite && sprite.name)) || ''
                if (parent && spriteName) {
                    if (!this._lastWeiweixiao) this._lastWeiweixiao = new Map()
                    let key = parent
                    let last = this._lastWeiweixiao.get(key)
                    if (last && last.name === spriteName && Date.now() - last.time < 400) return
                    this._lastWeiweixiao.set(key, { name: spriteName, time: Date.now() })
                }
                let originalParent = null
                let elementId = null
                if (parent && (parent instanceof Element || parent instanceof HTMLElement || parent.getBoundingClientRect)) {
                    let entry = this._getOrCreateCanvas5ForElement(parent, position)
                    if (!entry) return
                    worker = entry.worker
                    originalParent = parent
                    elementId = this._elementIdCounter++
                    position.elementId = elementId
                    let canvasEl = entry.canvas
                    let canvasRect = canvasEl.getBoundingClientRect()
                    let parentRect = parent.getBoundingClientRect()
                    let bodySize = decadeUI.get.bodySize()
                    let boundRectInCanvas = {
                        left: parentRect.left - canvasRect.left,
                        top: parentRect.top - canvasRect.top,
                        right: parentRect.right - canvasRect.left,
                        bottom: parentRect.bottom - canvasRect.top,
                        width: parentRect.width,
                        height: parentRect.height,
                        x: parentRect.left - canvasRect.left,
                        y: parentRect.top - canvasRect.top,
                    }
                    boundRectInCanvas.bottomInBody = bodySize.height - parentRect.bottom
                    boundRectInCanvas.canvasBottomInBody = bodySize.height - canvasRect.bottom
                    position.parent = {
                        boundRect: boundRectInCanvas,
                        bodySize: { bodyWidth: Math.round(canvasRect.width), bodyHeight: Math.round(canvasRect.height) }
                    }
                } else {
                    return
                }
                if (!position) position = {}
                if (!worker) return
                worker.postMessage({ message: "PLAY_EFFECT5", sprite, position: position })
                if (position.follow && originalParent && elementId !== null) {
                    this._startFollowUpdate(worker, elementId, originalParent, originalParent ? null : 'chukuang-canvas5')
                }
            },
            stopWeiweixiao: function (sprite, parent) {
                if (parent && this._canvas5Map) {
                    let entry = this._canvas5Map.get(parent)
                    if (entry && entry.worker) {
                        let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                        entry.worker.postMessage({ message: "STOP_EFFECT5", sprite: spriteData })
                    }
                } else if (skinSwitch.chukuangWorker5) {
                    let spriteData = typeof sprite === 'string' ? { name: sprite } : sprite
                    skinSwitch.chukuangWorker5.postMessage({ message: "STOP_EFFECT5", sprite: spriteData })
                }
            }
        },
        chukuangWorkerOnMessage: {
            init: function () {
                skinSwitch.chukuangWorker.onmessage = e => {
                    let data = e.data
                    switch (data.message) {
                        case "chukuangPrepare":
                            this.chukuangStart(data)
                            break
                        case "recoverDaiJi":
                            this.recoverDaiJi(data)
                            break
                        case 'noActionChuKuang':
                            this.noActionChuKuang(data)
                            break
                    }
                }
            },
            getPlayerById: function (id, isQhlx) {
                for (let p of game.players) {
                    if (p.dynamic && p.dynamic.id === id) {
                        return p
                    }
                }
                let p = document.getElementById('mainView')
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        return _canvas[0].parentNode.parentNode
                    }
                }
                return null
            },
            chukuangStart: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                if (_status.currentPhase !== player && data.action === 'TeShu' && !avatar.player.shizhounian) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                    isPrimary: data.isPrimary,
                    skinId: data.skinId
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                    let pp = skinSwitch.getCoordinate(player, true)
                    let me = player === game.me
                    skinSwitch.chukuangWorker.postMessage({
                        id: data.id,
                        skinId: data.skinId,
                        message: 'chukuangStart',
                        action: data.action,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                    })
                    player.chukuangState = {
                        status: true,
                        action: data.action
                    }
                    if (data.action === 'GongJi' || data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3")
                            }
                        })
                    }
                    if (data.action === 'GongJi') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_1.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_1.mp3")
                            }
                        })
                    }
                    if (data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_2.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_2.mp3")
                            }
                        })
                    }
                })
            },
            recoverDaiJi: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                player.chukuangState = {
                    status: false,
                }
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'recoverDaiJi',
                    id: data.id,
                    skinId: data.skinId,
                })
                player.GongJi = false
            },
            noActionChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                if (data.action === 'GongJi') {
                    if (dynamic.primary && dynamic.primary.player) {
                        let playerP = dynamic.primary.player;
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.primary)
                        }
                    }
                    if (dynamic.deputy && dynamic.deputy.player) {
                        let playerP = dynamic.deputy.player
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.deputy)
                        }
                    }
                }
                if (data.action === 'TeShu') {
                    skinSwitch.postMsgApi.actionTeShu(player)
                }
            },
            debugChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () { })
            }
        },
        chukuangWorkerOnMessage2: {
            init: function () {
                skinSwitch.chukuangWorker2.onmessage = e => {
                    let data = e.data
                    switch (data.message) {
                        case "chukuangPrepare":
                            this.chukuangStart(data)
                            break
                        case "recoverDaiJi":
                            this.recoverDaiJi(data)
                            break
                        case 'noActionChuKuang':
                            this.noActionChuKuang(data)
                            break
                    }
                }
            },
            getPlayerById: function (id, isQhlx) {
                for (let p of game.players) {
                    if (p.dynamic && p.dynamic.id === id) {
                        return p
                    }
                }
                let p = document.getElementById('mainView')
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        return _canvas[0].parentNode.parentNode
                    }
                }
                return null
            },
            chukuangStart: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                if (_status.currentPhase !== player && data.action === 'TeShu' && !avatar.player.shizhounian) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                    isPrimary: data.isPrimary,
                    skinId: data.skinId
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                    let pp = skinSwitch.getCoordinate(player, true)
                    let me = player === game.me
                    skinSwitch.chukuangWorker2.postMessage({
                        id: data.id,
                        skinId: data.skinId,
                        message: 'chukuangStart',
                        action: data.action,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                    })
                    player.chukuangState2 = {
                        status: true,
                        action: data.action
                    }
                    if (data.action === 'GongJi' || data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3")
                            }
                        })
                    }
                    if (data.action === 'GongJi') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_1.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_1.mp3")
                            }
                        })
                    }
                    if (data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_2.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_2.mp3")
                            }
                        })
                    }
                })
            },
            recoverDaiJi: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                player.chukuangState2 = {
                    status: false,
                }
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'recoverDaiJi',
                    id: data.id,
                    skinId: data.skinId,
                })
                player.GongJi2 = false
            },
            noActionChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                if (data.action === 'GongJi') {
                    if (dynamic.primary && dynamic.primary.player) {
                        let playerP = dynamic.primary.player;
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.primary)
                        }
                    }
                    if (dynamic.deputy && dynamic.deputy.player) {
                        let playerP = dynamic.deputy.player
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.deputy)
                        }
                    }
                }
                if (data.action === 'TeShu') {
                    skinSwitch.postMsgApi.actionTeShu(player)
                }
            },
            debugChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () { })
            }
        },
        chukuangWorkerOnMessage3: {
            init: function () {
                skinSwitch.chukuangWorker3.onmessage = e => {
                    let data = e.data
                    switch (data.message) {
                        case "chukuangPrepare":
                            this.chukuangStart(data)
                            break
                        case "recoverDaiJi":
                            this.recoverDaiJi(data)
                            break
                        case 'noActionChuKuang':
                            this.noActionChuKuang(data)
                            break
                    }
                }
            },
            getPlayerById: function (id, isQhlx) {
                for (let p of game.players) {
                    if (p.dynamic && p.dynamic.id === id) {
                        return p
                    }
                }
                let p = document.getElementById('mainView')
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        return _canvas[0].parentNode.parentNode
                    }
                }
                return null
            },
            chukuangStart: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                if (_status.currentPhase !== player && data.action === 'TeShu' && !avatar.player.shizhounian) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                    isPrimary: data.isPrimary,
                    skinId: data.skinId
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                    let pp = skinSwitch.getCoordinate(player, true)
                    let me = player === game.me
                    skinSwitch.chukuangWorker3.postMessage({
                        id: data.id,
                        skinId: data.skinId,
                        message: 'chukuangStart',
                        action: data.action,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                    })
                    player.chukuangState3 = {
                        status: true,
                        action: data.action
                    }
                    if (data.action === 'GongJi' || data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3")
                            }
                        })
                    }
                    if (data.action === 'GongJi') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_1.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_1.mp3")
                            }
                        })
                    }
                    if (data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_2.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_2.mp3")
                            }
                        })
                    }
                })
            },
            recoverDaiJi: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                player.chukuangState3 = {
                    status: false,
                }
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'recoverDaiJi',
                    id: data.id,
                    skinId: data.skinId,
                })
                player.GongJi3 = false
            },
            noActionChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                if (data.action === 'GongJi') {
                    if (dynamic.primary && dynamic.primary.player) {
                        let playerP = dynamic.primary.player;
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.primary)
                        }
                    }
                    if (dynamic.deputy && dynamic.deputy.player) {
                        let playerP = dynamic.deputy.player
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.deputy)
                        }
                    }
                }
                if (data.action === 'TeShu') {
                    skinSwitch.postMsgApi.actionTeShu(player)
                }
            },
            debugChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () { })
            }
        },
        // 新增 chukuangWorkerOnMessage4
        chukuangWorkerOnMessage4: {
            init: function () {
                skinSwitch.chukuangWorker4.onmessage = e => {
                    let data = e.data
                    switch (data.message) {
                        case "chukuangPrepare":
                            this.chukuangStart(data)
                            break
                        case "recoverDaiJi":
                            this.recoverDaiJi(data)
                            break
                        case 'noActionChuKuang':
                            this.noActionChuKuang(data)
                            break
                    }
                }
            },
            getPlayerById: function (id, isQhlx) {
                for (let p of game.players) {
                    if (p.dynamic && p.dynamic.id === id) {
                        return p
                    }
                }
                let p = document.getElementById('mainView')
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        return _canvas[0].parentNode.parentNode
                    }
                }
                return null
            },
            chukuangStart: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                if (_status.currentPhase !== player && data.action === 'TeShu' && !avatar.player.shizhounian) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                    isPrimary: data.isPrimary,
                    skinId: data.skinId
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                    let pp = skinSwitch.getCoordinate(player, true)
                    let me = player === game.me
                    skinSwitch.chukuangWorker4.postMessage({
                        id: data.id,
                        skinId: data.skinId,
                        message: 'chukuangStart',
                        action: data.action,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                    })
                    player.chukuangState4 = {
                        status: true,
                        action: data.action
                    }
                    if (data.action === 'GongJi' || data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3")
                            }
                        })
                    }
                    if (data.action === 'GongJi') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_1.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_1.mp3")
                            }
                        })
                    }
                    if (data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_2.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_2.mp3")
                            }
                        })
                    }
                })
            },
            recoverDaiJi: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                player.chukuangState4 = {
                    status: false,
                }
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'recoverDaiJi',
                    id: data.id,
                    skinId: data.skinId,
                })
                player.GongJi4 = false
            },
            noActionChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                if (data.action === 'GongJi') {
                    if (dynamic.primary && dynamic.primary.player) {
                        let playerP = dynamic.primary.player;
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.primary)
                        }
                    }
                    if (dynamic.deputy && dynamic.deputy.player) {
                        let playerP = dynamic.deputy.player
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.deputy)
                        }
                    }
                }
                if (data.action === 'TeShu') {
                    skinSwitch.postMsgApi.actionTeShu(player)
                }
            },
            debugChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () { })
            }
        },
        // 新增 chukuangWorkerOnMessage5
        chukuangWorkerOnMessage5: {
            init: function () {
                skinSwitch.chukuangWorker5.onmessage = e => {
                    let data = e.data
                    switch (data.message) {
                        case "chukuangPrepare":
                            this.chukuangStart(data)
                            break
                        case "recoverDaiJi":
                            this.recoverDaiJi(data)
                            break
                        case 'noActionChuKuang':
                            this.noActionChuKuang(data)
                            break
                    }
                }
            },
            getPlayerById: function (id, isQhlx) {
                for (let p of game.players) {
                    if (p.dynamic && p.dynamic.id === id) {
                        return p
                    }
                }
                let p = document.getElementById('mainView')
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        return _canvas[0].parentNode.parentNode
                    }
                }
                return null
            },
            chukuangStart: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                if (_status.currentPhase !== player && data.action === 'TeShu' && !avatar.player.shizhounian) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                    isPrimary: data.isPrimary,
                    skinId: data.skinId
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                    let pp = skinSwitch.getCoordinate(player, true)
                    let me = player === game.me
                    skinSwitch.chukuangWorker5.postMessage({
                        id: data.id,
                        skinId: data.skinId,
                        message: 'chukuangStart',
                        action: data.action,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                    })
                    player.chukuangState5 = {
                        status: true,
                        action: data.action
                    }
                    if (data.action === 'GongJi' || data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3")
                            }
                        })
                    }
                    if (data.action === 'GongJi') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_1.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_1.mp3")
                            }
                        })
                    }
                    if (data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_2.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_2.mp3")
                            }
                        })
                    }
                })
            },
            recoverDaiJi: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                player.chukuangState5 = {
                    status: false,
                }
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'recoverDaiJi',
                    id: data.id,
                    skinId: data.skinId,
                })
                player.GongJi5 = false
            },
            noActionChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                if (data.action === 'GongJi') {
                    if (dynamic.primary && dynamic.primary.player) {
                        let playerP = dynamic.primary.player;
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.primary)
                        }
                    }
                    if (dynamic.deputy && dynamic.deputy.player) {
                        let playerP = dynamic.deputy.player
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.deputy)
                        }
                    }
                }
                if (data.action === 'TeShu') {
                    skinSwitch.postMsgApi.actionTeShu(player)
                }
            },
            debugChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () { })
            }
        },
        // 新增 chukuangWorkerOnMessage6
        chukuangWorkerOnMessage6: {
            init: function () {
                skinSwitch.chukuangWorker6.onmessage = e => {
                    let data = e.data
                    switch (data.message) {
                        case "chukuangPrepare":
                            this.chukuangStart(data)
                            break
                        case "recoverDaiJi":
                            this.recoverDaiJi(data)
                            break
                        case 'noActionChuKuang':
                            this.noActionChuKuang(data)
                            break
                    }
                }
            },
            getPlayerById: function (id, isQhlx) {
                for (let p of game.players) {
                    if (p.dynamic && p.dynamic.id === id) {
                        return p
                    }
                }
                let p = document.getElementById('mainView')
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        return _canvas[0].parentNode.parentNode
                    }
                }
                return null
            },
            chukuangStart: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                if (_status.currentPhase !== player && data.action === 'TeShu' && !avatar.player.shizhounian) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                    isPrimary: data.isPrimary,
                    skinId: data.skinId
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                    let pp = skinSwitch.getCoordinate(player, true)
                    let me = player === game.me
                    skinSwitch.chukuangWorker6.postMessage({
                        id: data.id,
                        skinId: data.skinId,
                        message: 'chukuangStart',
                        action: data.action,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                    })
                    player.chukuangState6 = {
                        status: true,
                        action: data.action
                    }
                    if (data.action === 'GongJi' || data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3")
                            }
                        })
                    }
                    if (data.action === 'GongJi') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_1.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_1.mp3")
                            }
                        })
                    }
                    if (data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_2.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_2.mp3")
                            }
                        })
                    }
                })
            },
            recoverDaiJi: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                player.chukuangState6 = {
                    status: false,
                }
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'recoverDaiJi',
                    id: data.id,
                    skinId: data.skinId,
                })
                player.GongJi6 = false
            },
            noActionChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                if (data.action === 'GongJi') {
                    if (dynamic.primary && dynamic.primary.player) {
                        let playerP = dynamic.primary.player;
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.primary)
                        }
                    }
                    if (dynamic.deputy && dynamic.deputy.player) {
                        let playerP = dynamic.deputy.player
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.deputy)
                        }
                    }
                }
                if (data.action === 'TeShu') {
                    skinSwitch.postMsgApi.actionTeShu(player)
                }
            },
            debugChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () { })
            }
        },
        // 新增 chukuangWorkerOnMessage7
        chukuangWorkerOnMessage7: {
            init: function () {
                skinSwitch.chukuangWorker7.onmessage = e => {
                    let data = e.data
                    switch (data.message) {
                        case "chukuangPrepare":
                            this.chukuangStart(data)
                            break
                        case "recoverDaiJi":
                            this.recoverDaiJi(data)
                            break
                        case 'noActionChuKuang':
                            this.noActionChuKuang(data)
                            break
                    }
                }
            },
            getPlayerById: function (id, isQhlx) {
                for (let p of game.players) {
                    if (p.dynamic && p.dynamic.id === id) {
                        return p
                    }
                }
                let p = document.getElementById('mainView')
                if (p) {
                    let _canvas = p.getElementsByClassName('animation-player')
                    if (_canvas.length) {
                        return _canvas[0].parentNode.parentNode
                    }
                }
                return null
            },
            chukuangStart: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                if (_status.currentPhase !== player && data.action === 'TeShu' && !avatar.player.shizhounian) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                    isPrimary: data.isPrimary,
                    skinId: data.skinId
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                    let pp = skinSwitch.getCoordinate(player, true)
                    let me = player === game.me
                    skinSwitch.chukuangWorker7.postMessage({
                        id: data.id,
                        skinId: data.skinId,
                        message: 'chukuangStart',
                        action: data.action,
                        me: me,
                        direction: me ? false : skinSwitch.getDirection(player),
                        player: pp,
                    })
                    player.chukuangState7 = {
                        status: true,
                        action: data.action
                    }
                    if (data.action === 'GongJi' || data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3")
                            }
                        })
                    }
                    if (data.action === 'GongJi') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_1.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_1.mp3")
                            }
                        })
                    }
                    if (data.action === 'TeShu') {
                        let playName = avatar.player.name
                        let path = 'extension/十周年UI/assets/dynamic/' + playName + '_2.mp3'
                        skinSwitch.qhly_checkFileExist(path, exists => {
                            if (exists) {
                                game.playAudio("..", path)
                            } else {
                                game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + "_2.mp3")
                            }
                        })
                    }
                })
            },
            recoverDaiJi: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                player.chukuangState7 = {
                    status: false,
                }
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'recoverDaiJi',
                    id: data.id,
                    skinId: data.skinId,
                })
                player.GongJi7 = false
            },
            noActionChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                if (!dynamic.primary && !dynamic.deputy) {
                    return
                }
                if (data.action === 'GongJi') {
                    if (dynamic.primary && dynamic.primary.player) {
                        let playerP = dynamic.primary.player;
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.primary)
                        }
                    }
                    if (dynamic.deputy && dynamic.deputy.player) {
                        let playerP = dynamic.deputy.player
                        if (playerP.gongji && playerP.gongji.ck === false) {
                            return skinSwitch.postMsgApi.action(player, playerP.gongji.action, dynamic.deputy)
                        }
                    }
                }
                if (data.action === 'TeShu') {
                    skinSwitch.postMsgApi.actionTeShu(player)
                }
            },
            debugChuKuang: function (data) {
                let player = this.getPlayerById(data.id, data.qhlxBigAvatar)
                if (!player || !player.dynamic) return
                let dynamic = player.dynamic
                let avatar = data.isPrimary ? dynamic.primary : dynamic.deputy
                if (!avatar) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: 'hideAllNode',
                    id: dynamic.id,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () { })
            }
        },
        // 全局Worker实例声明（补全4/5/6/7）
        chukuangWorker: null,
        chukuangWorker2: null,
        chukuangWorker3: null,
        chukuangWorker4: null,
        chukuangWorker5: null,
        chukuangWorker6: null,
        chukuangWorker7: null,
        // 初始化函数（新增4/5/6/7）
        chukuangWorkerInit: function () {
            if (!skinSwitch.chukuangWorker) {
                skinSwitch.chukuangWorker = new Worker(skinSwitch.url + 'chukuangWorker.js')
                skinSwitch.chukuangWorkerApi.create()
                skinSwitch.chukuangWorkerOnMessage.init()
            }
        },
        chukuangWorkerInit2: function () {
            if (!skinSwitch.chukuangWorker2) {
                skinSwitch.chukuangWorker2 = new Worker(skinSwitch.url + 'chukuangWorker.js')
                skinSwitch.chukuangWorkerApi.create2()
                skinSwitch.chukuangWorkerOnMessage2.init()
            }
        },
        chukuangWorkerInit3: function () {
            if (!skinSwitch.chukuangWorker3) {
                skinSwitch.chukuangWorker3 = new Worker(skinSwitch.url + 'chukuangWorker.js')
                skinSwitch.chukuangWorkerApi.create3()
                skinSwitch.chukuangWorkerOnMessage3.init()
            }
        },
        chukuangWorkerInit4: function () {
            if (!skinSwitch.chukuangWorker4) {
                skinSwitch.chukuangWorker4 = new Worker(skinSwitch.url + 'chukuangWorker.js')
                skinSwitch.chukuangWorkerApi.create4()
                skinSwitch.chukuangWorkerOnMessage4.init()
            }
        },
        chukuangWorkerInit5: function () {
            if (!skinSwitch.chukuangWorker5) {
                skinSwitch.chukuangWorker5 = new Worker(skinSwitch.url + 'chukuangWorker.js')
                skinSwitch.chukuangWorkerApi.create5()
                skinSwitch.chukuangWorkerOnMessage5.init()
            }
        },
        chukuangWorkerInit6: function () {
            if (!skinSwitch.chukuangWorker6) {
                skinSwitch.chukuangWorker6 = new Worker(skinSwitch.url + 'chukuangWorker.js')
                skinSwitch.chukuangWorkerApi.create6()
                skinSwitch.chukuangWorkerOnMessage6.init()
            }
        },
        chukuangWorkerInit7: function () {
            if (!skinSwitch.chukuangWorker7) {
                skinSwitch.chukuangWorker7 = new Worker(skinSwitch.url + 'chukuangWorker.js')
                skinSwitch.chukuangWorkerApi.create7()
                skinSwitch.chukuangWorkerOnMessage7.init()
            }
        }
    };
}
