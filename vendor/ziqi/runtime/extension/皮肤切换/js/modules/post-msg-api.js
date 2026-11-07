export function createPostMsgApi(lib, game, _status) {
    return {
        postMsgApi: {
            _onchangeDynamicWindow: function (player, res) {
                let canvas = player.getElementsByClassName("animation-player")[0];
                let dynamicWrap
                if (player.isQhlx) {
                    dynamicWrap = player.getElementsByClassName("qhdynamic-big-wrap")[0];
                } else {
                    dynamicWrap = player.getElementsByClassName("dynamic-wrap")[0];
                }
                skinSwitch.rendererOnMessage.addListener(player, 'chukuangFirst', function (data) {
                    dynamicWrap.style.zIndex = 100;
                    canvas.style.position = "fixed";
                    canvas.style.height = "100%";
                    canvas.style.width = "100%";
                    if (!player.isQhlx) {
                        player.style.zIndex = 10;
                    } else {
                        player.style.zIndex = 64
                    }
                    canvas.classList.add('pfqhFadeInEffect')
                })

                skinSwitch.rendererOnMessage.addListener(player, 'canvasRecover', function (data) {
                    if (lib.config['extension_十周年UI_newDecadeStyle'] === "on") {
                        dynamicWrap.style.zIndex = "62";
                    } else {
                        dynamicWrap.style.zIndex = "60";
                    }
                    canvas.style.height = null;
                    canvas.style.width = null;
                    canvas.style.position = null;
                    if (player.isQhlx) {
                        dynamicWrap.style.zIndex = 62
                        player.style.zIndex = 62
                    }
                    else player.style.zIndex = 4;
                    player.GongJi = false;
                })

                skinSwitch.rendererOnMessage.addListener(player, 'chukuangSecond', function (data) {
                    setTimeout(() => {
                        canvas.classList.remove('pfqhFadeIn')
                    }, 50)

                    let playName
                    if (res.dynamic.gongji && res.dynamic.gongji.name) {
                        playName = res.dynamic.gongji.name
                    } else {
                        playName = res.dynamic.name
                    }
                    if (res.dynamic.localePath && playName.startsWith(res.dynamic.localePath)) {
                        playName = playName.substr(res.dynamic.localePath.length + 1, playName.length)
                    }
                    game.playAudio("..", "extension", "皮肤切换/audio/effect", playName + ".mp3");
                })
            },

            playAvatar: function (player, isPrimary, action) {
                if (!player.dynamic) return
                let avatar = isPrimary ? player.dynamic.primary : player.dynamic.deputy
                if (!avatar) return
                let msg = {
                    message: 'ACTION',
                    id: player.dynamic.id,
                    skinID: avatar.id,
                }
                if (action && typeof action === 'object' && action.name) {
                    msg.action = action.action || action.animation || 'play2'
                    msg.play2Action = action
                } else {
                    msg.action = action
                }
                player.dynamic.renderer.postMessage(msg)
            },
            changeAvatarAction: function (player, isPrimary, skinInfo, isDefault) {
                if (!player.dynamic) return
                let avatar = isPrimary ? player.dynamic.primary : player.dynamic.deputy
                if (!avatar) return
                player.dynamic.renderer.postMessage({
                    message: 'CHANGE_ACTION',
                    id: player.dynamic.id,
                    skinInfo,
                    isDefault,
                    skinID: avatar.id,
                })
            },
            action: function (player, action, playAvatar) {
                let res = skinSwitch.dynamic.checkCanBeAction(player)
                if (res.dynamic && playAvatar && playAvatar !== res.dynamic) {
                    res.skinID = playAvatar.id
                    res.needHide = res.dynamic.id
                    res.deputy = !res.deputy
                }
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
                    player.dynamic.renderer.postMessage({
                        message: 'ACTION',
                        id: player.dynamic.id,
                        action: action,
                        skinID: res.dynamic.id,
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
            actionTeShu: function (player) {
                let r = this.action(player, 'TeShu')
                if (r) {
                    player.lastPlayTime = new Date().getTime()
                    skinSwitch.rendererOnMessage.addListener(player, 'teshuChuKuang', function (data) {
                        if (data.chukuang) {
                            this._onchangeDynamicWindow(player, r)
                        }
                    }, this)
                }
            },
            actionChuChang: function (player) {
                let r = this.action(player, 'chuchang')
                if (r) {
                    player.GongJi = true
                    this._onchangeDynamicWindow(player, r)
                }
            },
            actionGongJi: function (player, extraParams) {
                skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi', extraParams)
            },
            debug: function (player, mode) {
                if (!(player.dynamic && player.dynamic.primary)) {
                    skinSwitchMessage.show({
                        type: 'error',
                        text: '只有当前角色是动皮时才可以编辑动皮参数',
                        duration: 1500,
                        closeable: false,
                    })
                }
                if (!player.dynamic.renderer.postMessage) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前动皮过多',
                        duration: 1500,
                        closeable: false,
                    })
                }
                let pp = skinSwitch.getCoordinate(player, true)
                player.dynamic.renderer.postMessage({
                    message: "DEBUG",
                    id: player.dynamic.id,
                    action: "GongJi",
                    skinID: player.dynamic.primary.id,
                    isDouble: false,
                    needHide: false,
                    me: true,
                    direction: false,
                    player: pp,
                    mode: mode,
                })
            },
            position: function (player, mode) {
                if (!(player.dynamic && player.dynamic.primary)) {
                    skinSwitchMessage.show({
                        type: 'error',
                        text: '只有当前角色是动皮时才可以编辑动皮参数',
                        duration: 1500,
                        closeable: false,
                    })
                }
                if (!player.dynamic.renderer.postMessage) {
                    return
                }
                player.dynamic.renderer.postMessage({
                    message: "POSITION",
                    id: player.dynamic.id,
                    skinID: player.dynamic.primary.id,
                    mode: mode,
                })
            },
            adjust: function (player, mode, posData) {
                if (!(player.dynamic && player.dynamic.primary)) {
                    skinSwitchMessage.show({
                        type: 'error',
                        text: '只有当前角色是动皮时才可以编辑动皮参数',
                        duration: 1500,
                        closeable: false,
                    })
                }
                if (!player.dynamic.renderer.postMessage) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前动皮过多',
                        duration: 1500,
                        closeable: false,
                    })
                }
                player.dynamic.renderer.postMessage({
                    message: "ADJUST",
                    id: player.dynamic.id,
                    skinID: player.dynamic.primary.id,
                    mode: mode,
                    xyPos: posData.xyPos,
                    x: posData.x,
                    y: posData.y,
                    scale: posData.scale,
                    angle: posData.angle
                })
                if (mode === 'chukuang') {
                    skinSwitch.chukuangWorkerApi.adjust(player, posData, 'GongJi')
                } else if (mode === 'chuchang') {
                    skinSwitch.chukuangWorkerApi.adjust(player, posData, 'chuchang')
                } else if (mode === 'teshu') {
                    skinSwitch.chukuangWorkerApi.adjust(player, posData, 'TeShu')
                } else if (mode === 'hudong') {
                    skinSwitch.chukuangWorkerApi.adjust(player, posData, 'HuDong')
                }
            },
            show: function (player, skinId) {
                if (!(player.dynamic && (player.dynamic.primary || player.dynamic.deputy))) {
                    skinSwitchMessage.show({
                        type: 'error',
                        text: '只有当前角色是动皮时才可以编辑动皮参数',
                        duration: 1500,
                        closeable: false,
                    })
                }
                if (!player.dynamic.renderer.postMessage) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前动皮过多',
                        duration: 1500,
                        closeable: false,
                    })
                }
                player.dynamic.renderer.postMessage({
                    message: 'SHOW',
                    id: player.dynamic.id,
                    skinID: skinId
                });
            },
            resizePos: function (player, mode, posData) {
                if (!(player.dynamic && player.dynamic.primary)) {
                    skinSwitchMessage.show({
                        type: 'error',
                        text: '只有当前角色是动皮时才可以编辑动皮参数',
                        duration: 1500,
                        closeable: false,
                    })
                }
                if (!player.dynamic.renderer.postMessage) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前动皮过多',
                        duration: 1500,
                        closeable: false,
                    })
                }
                player.dynamic.renderer.postMessage({
                    message: "RESIZE",
                    id: player.dynamic.id,
                    skinID: player.dynamic.primary.id,
                    mode: mode,
                    ...posData
                })
                if (mode === 'chukuang') {
                    skinSwitch.chukuangWorkerApi.adjust(player, posData, 'GongJi')
                } else if (mode === 'chuchang') {
                    skinSwitch.chukuangWorkerApi.adjust(player, posData, 'chuchang')
                } else if (mode === 'teshu') {
                    skinSwitch.chukuangWorkerApi.adjust(player, posData, 'TeShu')
                }
            },
            getNodeInfo: function (player) {
                if (!(player.dynamic && player.dynamic.primary)) {
                    skinSwitchMessage.show({
                        type: 'error',
                        text: '只有当前角色是动皮时才可以编辑动皮参数',
                        duration: 1500,
                        closeable: false,
                    })
                }
                if (!player.dynamic.renderer.postMessage) {
                    skinSwitchMessage.show({
                        type: 'warning',
                        text: '当前动皮过多',
                        duration: 1500,
                        closeable: false,
                    })
                }
                player.dynamic.renderer.postMessage({
                    message: "GET_NODE_INFO",
                    id: player.dynamic.id,
                    skinID: player.dynamic.primary.id,
                })
            },
            startPlay: function (player, data) {
                if (!player.dynamic) return
                skinSwitch.rendererOnMessage.addListener(player, 'logMessage', function (data) {
                    console.log('dyWorker', data)
                })

                player.dynamic.renderer.postMessage({
                    message: 'StartPlay',
                    data: data,
                })
                skinSwitch.rendererOnMessage.addListener(player, 'playSkinEnd', function () {
                    let img = player.$dynamicWrap.style.backgroundImage
                    if (img.endsWith('card.png")')) {
                        player.$dynamicWrap.style.backgroundImage = ''
                    }
                })
            },
            changeSkelSkin: function (player, newSkinName, isPrimary) {
                if (!player.dynamic) return
                let avatar = isPrimary ? player.dynamic.primary : player.dynamic.deputy
                if (!avatar) return

                player.dynamic.renderer.postMessage({
                    message: 'changeSkelSkin',
                    id: player.dynamic.id,
                    skinId: avatar.id,
                    skinName: newSkinName,
                })
            }
        }
    };
}

