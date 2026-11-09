'use strict';
importScripts('spine.js', './spine-lib/spine_4_0_64.js', './spine-lib/spine_3_8.js',
    './spine-lib/spine_3_5_35.js', './spine-lib/spine_3_7.js', './spine-lib/spine_4_1.js', './spine-lib/spine_4_2.js', 'animation.js', 'settings.js', 'animations.js');
let window = self;
let devicePixelRatio = 1;
let documentZoom = 1;
let HTMLCanvasElement = function () {
    return 'HTMLCanvasElement';
};
let htmlElementMap = {}
let htmlElementIdCounter = 0

class HTMLElement {

    constructor(bound, bodySize, id) {
        this.boundRect = bound
        this.bodySize = bodySize
        this.id = id !== undefined ? id : (htmlElementIdCounter++)
        htmlElementMap[this.id] = this
    }
    getBoundingClientRect() {
        return this.boundRect
    }
    updateBoundRect(bound) {
        this.boundRect = bound
    }
}
Array.prototype.remove = function (item) {
    var index = this.indexOf(item);
    if (index >= 0) return this.splice(index, 1);
    return item;
}

function resolveRuntimeSkelVersion(am, filename, skelType, actionParams, player) {
    const explicit = actionParams && actionParams.version != null && actionParams.version !== '' ? actionParams.version : null
    const pv = player && player.version != null && player.version !== '' ? player.version : null
    return am.resolveSkelRuntimeVersion(filename, skelType, explicit, pv)
}

function inferSkelTypeFromParams(am, filename, params) {
    if (!filename || typeof filename !== 'string') return 'skel'
    if (params && typeof params === 'object') {
        if (params.json === true) return 'json'
        if (params.json === false) return 'skel'
        if (params.skelType != null && params.skelType !== '') {
            const s = String(params.skelType).toLowerCase()
            if (s === 'json' || s === 'skel') return s
        }
    }
    if (am && typeof am.resolveSkelFileTypeSync === 'function') {
        return am.resolveSkelFileTypeSync(filename)
    }
    return 'skel'
}

function resolveEffectSpriteRuntimeVersion(am, sprite) {
    const sk = inferSkelTypeFromParams(am, sprite && sprite.name, sprite)
    const ex = sprite && sprite.version != null && sprite.version !== '' ? sprite.version : null
    return am.resolveSkelRuntimeVersion(sprite.name, sk, ex, null)
}

function ensureSpineUnpackReloadIfNeeded(dynamic, boneName, wantUnpack, skelHint) {
    if (!dynamic || !boneName || wantUnpack !== true) return
    if (!dynamic.hasSpine(boneName)) return
    let asset = dynamic.spine && dynamic.spine.assets && dynamic.spine.assets[boneName]
    if (asset && asset.textureUnpackPremultipliedAlpha === true) return
    let st = asset && asset.skelType != null ? String(asset.skelType).toLowerCase() : skelHint
    if (st !== 'json') st = 'skel'
    dynamic.removeSpine(boneName, st)
}

function resolveUnpackAlphaForActionParams(player, actionParams) {
    if (!player || !actionParams) return
    let u = actionParams.unpackPremultipliedAlpha
    if (u == null) {
        u = (actionParams.name === player.name) ? player.unpackPremultipliedAlpha : false
    } else {
        u = !!u
    }
    actionParams.unpackPremultipliedAlpha = u
    let wantUnpack = !!u
    if (actionParams.alpha == null) {
        actionParams.alpha = wantUnpack ? true : !!player.alpha
    } else {
        actionParams.alpha = !!actionParams.alpha
    }
}

function applyUnpackPremultipliedFromSpriteToDynamic(sprite, dynamic) {
    if (sprite != null && dynamic != null && sprite.unpackPremultipliedAlpha != null) {
        dynamic.unpackPremultipliedAlpha = !!sprite.unpackPremultipliedAlpha
    }
}

function ensureEffectSpineUnpackReloadIfNeeded(sprite, dynamic) {
    applyUnpackPremultipliedFromSpriteToDynamic(sprite, dynamic)
    if (sprite == null || dynamic == null || typeof sprite.name !== 'string') return
    if (sprite.unpackPremultipliedAlpha === true && sprite.alpha !== true) {
        sprite.alpha = true
    }
    if (sprite.unpackPremultipliedAlpha !== true) return
    ensureSpineUnpackReloadIfNeeded(dynamic, sprite.name, true, inferSkelTypeFromParams(playerAnimation.animationManager, sprite.name, sprite))
}

function decadeUiApplyUnpackForSpine(dynamic, sprite) {
    if (!dynamic || !sprite || typeof sprite.name !== 'string') return
    if (sprite.unpackPremultipliedAlpha != null) {
        dynamic.unpackPremultipliedAlpha = !!sprite.unpackPremultipliedAlpha
    }
    if (sprite.unpackPremultipliedAlpha === true && sprite.alpha !== true) {
        sprite.alpha = true
    }
    if (sprite.unpackPremultipliedAlpha === true) {
        let amU = (playerAnimation && playerAnimation.animationManager) ? playerAnimation.animationManager : (typeof decadeUIAni !== 'undefined' ? decadeUIAni : null)
        ensureSpineUnpackReloadIfNeeded(dynamic, sprite.name, true, inferSkelTypeFromParams(amU, sprite.name, sprite))
    }
}

function ckApplyPlayerUnpackToAnni(avatarPlayer, version) {
    if (!playerAnimation || !avatarPlayer) return
    let sk = inferSkelTypeFromParams(playerAnimation.animationManager, avatarPlayer.name, avatarPlayer)
    let v = (version != null && version !== '') ? version : resolveRuntimeSkelVersion(playerAnimation.animationManager, avatarPlayer.name, sk, {}, avatarPlayer)
    let anni = playerAnimation.getAnni(avatarPlayer, v)
    anni.unpackPremultipliedAlpha = !!avatarPlayer.unpackPremultipliedAlpha
    if (avatarPlayer.unpackPremultipliedAlpha) avatarPlayer.alpha = true
}

/** @type {PlayerAnimation} */
let playerAnimation
let chukuangId = 99999   // 自动出框的nodeID起始, 为了不和主线程传过去的skinId重复

// 用来管理所有角色的公共出框animation
class PlayerAnimation {
    constructor(data) {
        this.animationManager = new AnimationManager(data.pathPrefix, data.canvas, 989898, { dpr: data.dpr })
        this.playerAni = {}  // 这个用来管理每个角色的Id及其skinId的配置数据

        this.playerState = {}  // 管理每个角色出框状态, 同时保证一个角色只能有一个出框状态.
        this.isMobile = data.isMobile
        this.isAttackFlipX = data.isAttackFlipX
        this.enemyScale = data.enemyScale != null ? data.enemyScale : 0.6
    }
    getAnni(player, version) {
        if (version) {
            return this.animationManager.getAnimation(version)
        }
        return this.animationManager.getAnimation(player.version)
    }
    // 提前把当前角色动皮需要用到的骨骼加载, 可能有默认的骨骼, 出场骨骼, 攻击骨骼, 特殊骨骼
    preLoadPlayerSkel(data) {
        let player = data.player
        if (!player) return
        let _this = this
        this.completeParams(player)
        let pLoad = function (actionParams, times) {
            if (actionParams) {
                resolveUnpackAlphaForActionParams(player, actionParams)
                let wantUnpack = !!actionParams.unpackPremultipliedAlpha
                let skelType = inferSkelTypeFromParams(_this.animationManager, actionParams.name, actionParams)
                let version = resolveRuntimeSkelVersion(_this.animationManager, actionParams.name, skelType, actionParams, player)
                let anni = _this.getAnni(player, version)
                anni.unpackPremultipliedAlpha = wantUnpack
                ensureSpineUnpackReloadIfNeeded(anni, actionParams.name, wantUnpack, skelType)

                if (!anni.hasSpine(actionParams.name)) {
                    anni.loadSpine(actionParams.name, skelType, function () {
                        console.log('预加载骨骼成功', actionParams.name)
                    }, function () {
                        console.log('播放骨骼失败, 参数: ', actionParams, '次数: ', times)
                        if (times < 0) {
                            pLoad(actionParams, times + 1)
                        }
                    });
                }
            }
        }
        let arr = []
        for (let act of [{ name: player.name, json: player.json, alpha: player.alpha, unpackPremultipliedAlpha: player.unpackPremultipliedAlpha }, player.gongjiAction, player.teshuAction, player.chuchangAction, player.HuDongAction]) {
            if (act && !arr.includes(act.name)) {
                arr.push(act.name)
                pLoad(act, 0)
            }
        }
        if (data.id != null && !(data.id in this.playerAni)) {
            this.playerAni[data.id] = {}
        }
        if (data.skinId != null && !(data.skinId in this.playerAni[data.id])) {
            this.playerAni[data.id][data.skinId] = {}
            this.playerAni[data.id][data.skinId] = player
        }

    }

    findPlayerParams(id, skinId) {
        if (!(id in this.playerAni)) {
            return
        }
        if (!(skinId in this.playerAni[id])) {
            return
        }
        return this.playerAni[id][skinId]
    }

    playAction(data) {
        let player = this.findPlayerParams(data.id, data.skinId)
        if (!player) return
        let actionParams
        if (data.action === 'GongJi') actionParams = player.gongjiAction
        else if (data.action === 'chukuang') actionParams = player.chuchangAction
        else if (data.action === 'TeShu') actionParams = player.teshuAction
        else if (data.action === 'HuDong') actionParams = player.HuDongAction
        else actionParams = player[data.action + 'Action']
        if (!actionParams) return

        // 是否触发连续攻击
        if (actionParams.playNode) {
            clearTimeout(actionParams.moveToTimeout)
            clearTimeout(actionParams.showTimeout)
            return this.lianxuChuKuang(player, actionParams, data)
        }

        let skelTypePlay = inferSkelTypeFromParams(this.animationManager, actionParams.name, actionParams)
        let version = resolveRuntimeSkelVersion(this.animationManager, actionParams.name, skelTypePlay, actionParams, player)
        let anniPlay = this.getAnni(player, version)
        resolveUnpackAlphaForActionParams(player, actionParams)
        let wantUnpack = !!actionParams.unpackPremultipliedAlpha
        if (wantUnpack) {
            player.alpha = true
        }
        anniPlay.unpackPremultipliedAlpha = wantUnpack
        ensureSpineUnpackReloadIfNeeded(anniPlay, actionParams.name, wantUnpack, skelTypePlay)
        if (!anniPlay.hasSpine(actionParams.name)) {
            anniPlay.loadSpine(actionParams.name, skelTypePlay, () => {
                this.playChuKuang(player, actionParams, data)
            }, this.errPlaySpine)
        } else {
            this.playChuKuang(player, actionParams, data)
        }
    }

    playChuKuangSpine(playNode, animation, data, notSetPos) {
        // 是否要取消连续出框
        if (!this.playerState[data.id]) {
        }
        this.playerState[data.id] = { 'time': new Date().getTime() };
        this.playerState[data.id]['action'] = data.action
        // playNode.angle = undefined
        let showTime = animation.showTime * 1000
        let delayTime = 400

        if (!(playNode.player.shizhounian || playNode.player.chuchang || playNode.player.qhlxBigAvatar)) {
            if (showTime <= 800) {
                delayTime = 200
            }
            if (showTime <= 1200) {
                delayTime = 300
            }
            showTime -= delayTime
            showTime += showTimeBefore

            // 暂时还是开启动画播放速度默认调为1.2, 默认为1太慢了
            if (playNode.speed == null || playNode.speed === 1) playNode.speed = 1

        } else {
            if (playNode.speed == null || playNode.speed === 1) playNode.speed = 1
            if (playNode.player.shizhounian) {
                let huikuangSpeed = 0.9
                if (playNode.actionParams && playNode.actionParams.hasOwnProperty('huikuangSpeed')) {
                    huikuangSpeed = playNode.actionParams.huikuangSpeed
                } else if (playNode.player.hasOwnProperty('huikuangSpeed')) {
                    huikuangSpeed = playNode.player.huikuangSpeed
                }
                showTime = showTime * huikuangSpeed
            }
        }

        showTime /= (playNode.speed || 1)
        console.log('showTime', showTime, animation.showTime, playNode.speed, 'action:', data.action)
        this.playerState[data.id]['endTime'] = new Date().getTime() + showTime
        playNode.actionParams.showTimeout = setTimeout(() => {
            if (playNode.player.shizhounian || playNode.player.qhlxBigAvatar) {
                playNode.actionParams.playNode = null
                playNode.opacity = 0
                postMessage({
                    'message': 'recoverDaiJi',
                    'id': data.id,
                    'skinId': data.skinId,
                    qhlxBigAvatar: playNode.player.qhlxBigAvatar,
                })
                if (this.playerState[data.id]) {
                    this.playerState[data.id].endTime = null
                }
                this.playerState[data.id] = false
                playNode.completed = true
                playNode.skeleton.completed = true
            } else if (playNode.actionParams && playNode.actionParams.inPlace && data.action === 'HuDong') {
                playNode.actionParams.playNode = null
                playNode.opacity = 0
                postMessage({
                    'message': 'recoverDaiJi',
                    'id': data.id,
                    'skinId': data.skinId,
                })
                if (this.playerState[data.id]) {
                    this.playerState[data.id].endTime = null
                }
                this.playerState[data.id] = false
                playNode.completed = true
                playNode.skeleton.completed = true
            } else {
                let fadeTime = 300
                playNode.fadeTo(0, fadeTime)
                playNode.actionParams.moveToTimeout = setTimeout(() => {
                    playNode.actionParams.playNode = null
                    playNode.opacity = 0
                    playNode.completed = true
                    playNode.skeleton.completed = true
                    postMessage({
                        'message': 'recoverDaiJi',
                        'id': data.id,
                        'skinId': data.skinId,
                    })
                    this.playerState[data.id] = false
                }, fadeTime)
            }
        }, showTime)
        if (data.action === 'chuchang') {
        }
        if (!data.me) {
            if (playNode.player.atkFlipX || this.isAttackFlipX) {
                if (data.direction.isLeft) {
                    playNode.flipX = playNode.flipX == null ? true : !playNode.flipX
                }
            }
        }
        if (!notSetPos) {
            setPos(playNode, data);
        }
        if (playNode.player.online) {
            playNode.scale = data.me ? 1.2 : 0.9
        } else if (!data.me) {
            if (data.action === 'chuchang' || data.action === 'GongJi' || data.action === 'TeShu') {
                if (playNode.actionParams.enemyScale != null || playNode.player.enemyScale != null) {
                    let enemyScale = playNode.actionParams.enemyScale != null ? playNode.actionParams.enemyScale :
                        playNode.player.enemyScale
                    playNode.scale = enemyScale
                } else if (playNode.player.shizhounian) {
                    playNode.scale = this.enemyScale
                } else if (playNode.actionParams.scale != null && !playNode.actionParams.posAuto) {
                    playNode.scale = playNode.actionParams.scale
                }
            }
        }
        playNode.opacity = 1
        this.playZhiShiXianWithPlayNode(playNode, animation, data)
    }

    playZhiShiXianWithPlayNode(playNode, animation, data) {
        let dy = playNode.player.zhishixian
        if (dy) {
            let delay = dy.delay
            if (animation.playRate && delay) {
                delay = delay - animation.playRate
                if (delay < 0) {
                    delay = 0
                }
            }
            this.playZhiShiXian(playNode.player, playNode.actionParams.attackArgs, data, animation.showTime * (delay * 1000 || 0), playNode)
        }

    }
    playZhiShiXian(player, attackArgs, data, zhishixianDelay, playNode) {
        if (data.action === 'GongJi') {
            if (player && attackArgs) {
                let dy = player.zhishixian
                if (dy != null) {
                    setTimeout(() => {
                        let zxUnpack = dy.unpackPremultipliedAlpha != null ? !!dy.unpackPremultipliedAlpha : (dy.name === player.name ? !!player.unpackPremultipliedAlpha : false)

                        let playBaoZha = () => {
                            for (let p of attackArgs.targets) {
                                let sprite = Object.assign({}, dy.effect)
                                if (sprite.unpackPremultipliedAlpha == null) sprite.unpackPremultipliedAlpha = zxUnpack
                                if (sprite.alpha == null) {
                                    sprite.alpha = zxUnpack ? true : !!player.alpha
                                } else {
                                    sprite.alpha = !!sprite.alpha
                                }
                                let referNode = new HTMLElement(p.boundRect, attackArgs.bodySize)
                                let skEf = inferSkelTypeFromParams(this.animationManager, sprite.name, sprite)
                                let spriteVersion = resolveRuntimeSkelVersion(this.animationManager, sprite.name, skEf, { version: sprite.version }, player)
                                let effLineAnni = this.getAnni(player, spriteVersion)
                                effLineAnni.unpackPremultipliedAlpha = !!sprite.unpackPremultipliedAlpha
                                ensureSpineUnpackReloadIfNeeded(effLineAnni, sprite.name, sprite.unpackPremultipliedAlpha === true, skEf)
                                effLineAnni.playSpine(sprite, { referNode: referNode })
                            }
                        }

                        let playZhishixian = () => {

                            let zhishixianTime = 0
                            console.log('attackArgs --> ', attackArgs)
                            let getStartXY = () => {
                                let x1, y1

                                if (playNode) {
                                    if (dy.startPos === 'player') {
                                        return {
                                            x1: attackArgs.attack.x,
                                            y1: attackArgs.attack.y + attackArgs.attack.height / 2
                                        }
                                    } else if (typeof dy.startPos === 'object') {
                                        return {
                                            x1: attackArgs.bodySize.bodyWidth * dy.startPos.x[1] + dy.startPos.x[0],
                                            y1: attackArgs.bodySize.bodyHeight - attackArgs.bodySize.bodyHeight * dy.startPos.y[1] - dy.startPos.y[0],
                                        }
                                    } else {
                                        if (Array.isArray(playNode.x)) {
                                            x1 = attackArgs.bodySize.bodyWidth * playNode.x[1] + playNode.x[0];
                                        } else {
                                            x1 = playNode.x;
                                        }

                                        if (Array.isArray(playNode.y)) {
                                            y1 = attackArgs.bodySize.bodyHeight - attackArgs.bodySize.bodyHeight * playNode.y[1] - playNode.y[0]
                                        } else {
                                            y1 = attackArgs.bodySize.bodyHeight - playNode.y
                                        }
                                        if (!data.direction.isLeft) {
                                            x1 -= 50
                                        } else {
                                            x1 += 50
                                        }
                                        return {
                                            x1: x1,
                                            y1: y1
                                        }
                                    }
                                } else {
                                    return {
                                        x1: attackArgs.attack.x,
                                        y1: attackArgs.attack.y + attackArgs.attack.height / 2
                                    }
                                }
                            }
                            for (let p of attackArgs.targets) {
                                let x2 = p.boundRect.left + p.boundRect.width / 2
                                let y2 = p.boundRect.bottom - p.boundRect.height / 2

                                let sprite = Object.assign({}, dy)

                                let { x1, y1 } = getStartXY()

                                let angle = Math.round(Math.atan2(y1 - y2, x1 - x2) / Math.PI * 180)
                                sprite.angle = (dy.angle || 0) + 180 - angle

                                let startX = x1
                                let startY = y1
                                let endX = x2
                                let endY = attackArgs.bodySize.bodyHeight - y2

                                let getDis = (x1, x2, y1, y2) => {
                                    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
                                }

                                let getLineFunc = (x1, x2, y1, y2) => {
                                    let k = (y2 - y1) / (x2 - x1)
                                    let b = y2 - k * x2
                                    return (x) => {
                                        return k * x + b
                                    }
                                }
                                let dis = getDis(startX, x2, startY, y2)
                                if (dis < attackArgs.bodySize.bodyHeight / 2) {
                                    sprite.scale = (sprite.scale || 1) * 0.6
                                }
                                let referNode = new HTMLElement(p.boundRect, attackArgs.bodySize)
                                if (sprite.unpackPremultipliedAlpha == null) sprite.unpackPremultipliedAlpha = zxUnpack
                                if (sprite.alpha == null) {
                                    sprite.alpha = zxUnpack ? true : !!player.alpha
                                } else {
                                    sprite.alpha = !!sprite.alpha
                                }
                                let skZx = inferSkelTypeFromParams(this.animationManager, dy.name, dy)
                                let dyVersion = resolveRuntimeSkelVersion(this.animationManager, dy.name, skZx, { version: dy.version }, player)
                                let zxLineAnni = this.getAnni(player, dyVersion)
                                zxLineAnni.unpackPremultipliedAlpha = !!sprite.unpackPremultipliedAlpha
                                ensureSpineUnpackReloadIfNeeded(zxLineAnni, sprite.name, sprite.unpackPremultipliedAlpha === true, inferSkelTypeFromParams(this.animationManager, sprite.name, sprite))
                                let node = zxLineAnni.playSpine(sprite, { x: startX, y: attackArgs.bodySize.bodyHeight - startY })

                                if (!zhishixianTime) {
                                    let ani = node.skeleton.data.animations[0]
                                    zhishixianTime = ani.duration
                                }
                                node.moveTo(endX, endY, zhishixianTime * 1000 * (sprite.factor || 0.5))

                            }
                            if (dy.effect) {
                                setTimeout(() => {

                                    let skEff = inferSkelTypeFromParams(this.animationManager, dy.effect.name, dy.effect)
                                    let effectVersion = resolveRuntimeSkelVersion(this.animationManager, dy.effect.name, skEff, { version: dy.effect.version }, player)
                                    let effAnni = this.getAnni(player, effectVersion)
                                    effAnni.unpackPremultipliedAlpha = zxUnpack
                                    ensureSpineUnpackReloadIfNeeded(effAnni, dy.effect.name, zxUnpack === true, skEff)
                                    if (!effAnni.hasSpine(dy.effect.name)) {
                                        effAnni.loadSpine(dy.effect.name, skEff, playBaoZha)
                                    } else {
                                        playBaoZha()
                                    }
                                }, zhishixianTime / (dy.speed || 1) * 1000 * dy.effect.delay || 0.5)
                            }
                        }
                        let skZs = inferSkelTypeFromParams(this.animationManager, dy.name, dy)
                        let zhishixianVersion = resolveRuntimeSkelVersion(this.animationManager, dy.name, skZs, { version: dy.version }, player)
                        let zxAnni = this.getAnni(player, zhishixianVersion)
                        zxAnni.unpackPremultipliedAlpha = zxUnpack
                        ensureSpineUnpackReloadIfNeeded(zxAnni, dy.name, zxUnpack === true, skZs)
                        if (!zxAnni.hasSpine(dy.name)) {
                            zxAnni.loadSpine(dy.name, skZs, playZhishixian)
                        } else {
                            playZhishixian()
                        }
                    }, zhishixianDelay)
                }
            }
        }
    }

    setSkin(actionParams, node) {
        let skins = node.skeleton.data.skins
        if (actionParams && actionParams.skin) {
            for (let i = 0; i < skins.length; i++) {
                if (skins[i].name === actionParams.skin) {
                 
                    node.skeleton.setSkinByName(skins[i].name);
                    node.skeleton.setSlotsToSetupPose();

                }
            }
        }
        if (actionParams && actionParams.hideSlots && actionParams.hideSlots.length > 0) {
            for (let i = 0; i < node.skeleton.slots.length; i++) {
                let slot = node.skeleton.slots[i];
                if (actionParams.hideSlots.includes(slot.data.name)) {
                  
                    slot.color.a = 0;
                }
            }
        }
    }
    lianxuChuKuang(player, actionParams, data) {
        let playNode = actionParams.playNode
        let skLx = inferSkelTypeFromParams(this.animationManager, playNode.actionParams.name, playNode.actionParams)
        let version = resolveRuntimeSkelVersion(this.animationManager, playNode.actionParams.name, skLx, playNode.actionParams, playNode.player)
        if (!this.getAnni(playNode.player, version).nodes.includes(playNode)) {
            playNode.skeleton.completed = true
            if (player.hideSlots) {
                playNode.actionParams.hideSlots = player.hideSlots
            }

            let ap = playNode.actionParams
            resolveUnpackAlphaForActionParams(player, ap)
            let wantUnpack = !!ap.unpackPremultipliedAlpha
            let anniLc = this.getAnni(playNode.player, version)
            anniLc.unpackPremultipliedAlpha = wantUnpack
            ensureSpineUnpackReloadIfNeeded(anniLc, ap.name, wantUnpack, inferSkelTypeFromParams(this.animationManager, ap.name, ap))
            let playedSprite = anniLc.playSpine(playNode.actionParams)
            this.setSkin(actionParams, playedSprite)
            playedSprite.player = player
            playedSprite.actionParams = actionParams
            actionParams.playNode = playedSprite
            return this.playChuKuangSpine(playedSprite, { showTime: actionParams.showTime }, data)
        }

        let state = actionParams.playNode.skeleton.state
        let entry = state.tracks[0]
        let lastTime = entry.animationEnd
        let curTime = entry.animationLast

        playNode.player = player
        playNode.actionParams = actionParams
        if (actionParams.triggername !== 'useCardBefore' && data.action === 'GongJi' && playNode.actionParams.attackArgs) {
            if (curTime / lastTime >= 0.75) {
                entry.trackTime = 0
                console.log('多指重置')
            } else {
                lastTime = lastTime - curTime
                console.log('多指连续')
            }
        } else if (data.action === 'chuchang') {
            if (curTime / lastTime >= 0.8) {
                entry.trackTime = 0
                console.log('出场动画重置----', curTime / lastTime, curTime)
            } else {
                lastTime = lastTime - curTime
                console.log('出场动画不重置------', curTime / lastTime, curTime)
            }
        } else if (data.action === 'TeShu') {
            if (curTime / lastTime >= 0.7) {
                entry.trackTime = 0
                console.log('特殊动画重置----', curTime / lastTime, curTime)
            } else {
                lastTime = lastTime - curTime
                console.log('特殊动画不重置------', curTime / lastTime, curTime)
            }
        } else {
            if (curTime / lastTime >= 0.1) {
                entry.trackTime = 0
                console.log('重置----', curTime / lastTime, curTime)
            } else {
                lastTime = lastTime - curTime
                console.log('不重置------', curTime / lastTime, curTime)
            }
        }

        playNode.completed = false
        playNode.skeleton.completed = true
        let notSetPos = false
        if (!player.shizhounian) {

            if ((Math.abs(playNode.renderY - data.player.y)) > data.player.height / 3 * 2 || Math.abs(playNode.renderX - data.player.x) > data.player.width / 3 * 2) {
                notSetPos = true
            }
        }
        this.playChuKuangSpine(playNode, { showTime: lastTime, playRate: entry.trackTime / lastTime }, data, notSetPos)
    }

    playChuKuang(player, actionParams, data) {
        let actionState = player.actionState
        if (!actionState || !actionState[data.action]) return

        actionParams.id = chukuangId++

        let actionInfo = actionState[data.action]

        if (Array.isArray(actionInfo)) {
            let selectAction = randomChoice(actionInfo)
            actionParams.showTime = selectAction.showTime
            actionParams.action = selectAction.action
        } else {
            actionParams.showTime = actionInfo.showTime
            actionParams.action = actionInfo.action
        }
        if (player.hideSlots) {
            actionParams.hideSlots = player.hideSlots
        }
        let skPc = inferSkelTypeFromParams(this.animationManager, actionParams.name, actionParams)
        let version = resolveRuntimeSkelVersion(this.animationManager, actionParams.name, skPc, actionParams, player)
        resolveUnpackAlphaForActionParams(player, actionParams)
        let wantUnpackPlay = !!actionParams.unpackPremultipliedAlpha
        let anniCk = this.getAnni(player, version)
        anniCk.unpackPremultipliedAlpha = wantUnpackPlay
        let playedSprite = anniCk.playSpine(actionParams)
        playedSprite.player = player
        playedSprite.actionParams = actionParams
        this.setSkin(actionParams, playedSprite)
        actionParams.playNode = playedSprite

        this.playChuKuangSpine(playedSprite, { showTime: actionParams.showTime }, data);
    }

    errPlaySpine(data) {
        console.log('播放失败....', data)
    }
    completeParams(player) {
        if (!player) return
        // 给一些简化初始化方式的攻击参数补全
        let initPlayerGongJi = function () {
            if (!player.gongji) {
                player.gongji = {}
                player.qhlxAutoSetGongJi = true  // 用来标记是千幻页面没有设置gongji自动添加上的标记. 手杀是真动皮, 带有gongji标签
            } else if (typeof player.gongji === 'string') {
                player.gongji = {
                    action: player.gongji
                }
            } else if (player.gongji === true) {
                player.gongji = {}
                player.fakeDynamic = true
            }
        }
        if (player.qhlxBigAvatar) {
            if (player.isDecade) {
                player.qhlx = player.qhlx && player.qhlx.decade // 如果当前是十周年样式, 用十周年的配置覆盖.
            }
            if (player.qhlx) {
                if (player.qhlx.gongji) {
                    initPlayerGongJi()
                    player.gongji = Object.assign(player.gongji, player.qhlx.gongji)
                } else {
                    // 使用雷修默认的出框参数
                    initPlayerGongJi()
                    if (playerAnimation.isMobile) {
                        player.gongji.x = player.divPos.x + player.divPos.width / 2;
                        player.gongji.y = player.divPos.y + player.divPos.height / 2;
                        if (player.gongji.name === player.name) {
                            player.gongji.scale = player.scale * 0.6
                        } else {
                            player.gongji.scale = player.largeFactor * (player.gongji.scale || 1) * 0.55
                        }
                    } else {
                        player.gongji.x = player.divPos.x + player.divPos.width / 2;
                        player.gongji.y = player.divPos.y + player.divPos.height / 2;
                        player.gongji.scale = player.scale * 0.55
                    }
                }
            } else {
                initPlayerGongJi()
                // fix 大屏预览参数使用雷修默认的出框偏移
                if (playerAnimation.isMobile) {
                    if (!player.gongji) {
                        player.gongji = {}
                    }
                    player.gongji.x = player.divPos.x + player.divPos.width / 2;
                    player.gongji.y = player.divPos.y + player.divPos.height / 2;
                    if (!player.gongji.name || player.gongji.name === player.name) {
                        player.gongji.scale = player.scale * 0.6
                    } else {
                        player.gongji.scale = player.largeFactor * (player.gongji.scale || 1) * 0.55
                    }
                } else {
                    player.gongji.x = player.divPos.x + player.divPos.width / 2;
                    player.gongji.y = player.divPos.y + player.divPos.height / 2;
                    player.gongji.scale = player.scale * 0.55
                }
            }

        }

        let gongjiAction, teshuAction
        let gongji = player.gongji
        let teshu = player.teshu
        let gongjiType = typeof gongji
        let teshuType = typeof teshu

        // 定义为十周年的开局出场
        let chuchang = player.chuchang
        let chuchangType = typeof chuchang

        // 如果填写了出场参数, 基本确认是十周年的真动皮
        if (chuchang) {
            if (chuchangType === 'object') {
                if (!chuchang.name) { chuchang.name = player.name }
                if (!chuchang.action) { chuchang.action = 'play' }
                if (!chuchang.scale) { chuchang.scale = player.scale }
                player.chuchangAction = chuchang
            }
        }

        // 这是原来的EngEX扩展的判断手杀真动皮的写法. player.pos用来调整出框位置参数, 兼容此种写法, 如果填写了pos认为是原来的真动皮
        if (player.pos) {
            gongjiAction = {
                name: player.name,  // 和原来的皮肤一样
                x: player.pos.x,
                y: player.pos.y,
                scale: player.scale,
                action: 'GongJi'
            }
            teshuAction = {
                name: player.name,
                x: player.x,
                y: player.y,
                action: 'TeShu'  // 可以手动指定相同动皮的特殊动作
            }
            // 如果还填写了具体的攻击参数, 那么用攻击参数覆盖原来的配置
            if (gongjiType === 'object') {
                gongjiAction = Object.assign(gongjiAction, gongji)
            } else if (gongjiType === 'string') {
                gongjiAction.action = gongji
            }
            if (teshuType === 'object') {
                teshuAction = Object.assign(teshuAction, teshu)
            } else if (teshuType === 'string') {
                teshuAction.action = teshu
            }
        } else {
            // 只指定了攻击的动画标签, 那么使用当前动皮指定的标签在屏幕中间播放
            if (gongjiType === 'string') {
                gongjiAction = {
                    name: player.name,  // 和原来的皮肤一样
                    x: [0, 0.5],
                    y: [0, 0.5],
                    scale: player.scale,  //
                    action: player.gongji,
                    posAuto: true
                }
            }
            // 如果是简单的设置为true, 那么说明当前动皮是静态皮肤, 也想出框, 那么和上面一样, 播放当前待机动作到中央
            else if (gongji === true) {
                gongjiAction = {
                    name: player.name,  // 和原来的皮肤一样
                    x: [0, 0.5],
                    y: [0, 0.5],
                    scale: player.scale,  //
                    fakeDynamic: true,
                    posAuto: true
                }
            } else if (gongjiType === 'object') {
                gongjiAction = gongji
                if (!gongjiAction.name) {
                    gongjiAction.name = player.name
                } else {
                    gongjiAction.name = getFullName(player.localePath, gongjiAction.name)
                }
                if (!gongjiAction.x) {
                    gongjiAction.x = [0, 0.5]
                    gongjiAction.posAuto = true  // 自动设置的位置, 如果是十周年的动皮的话, 原地出框
                }
                if (!gongjiAction.y) {
                    gongjiAction.y = [0, 0.5]
                    gongjiAction.posAuto = true
                }
                if (!gongjiAction.scale) { gongjiAction.scale = player.scale }
                if (!gongjiAction.action && gongjiAction.name === player.name) {
                    gongjiAction.fakeDynamic = true
                }
            } else {
                // 默认从当前皮肤的GongJi标签来播放动作
                gongjiAction = {
                    name: player.name,  // 和原来的皮肤一样
                    x: [0, 0.5],
                    y: [0, 0.5],
                    scale: player.scale,
                    action: 'GongJi'  // 寻找默认的攻击动画标签名称
                }
            }

            // 特殊动作同样处理
            if (teshuType === 'string') {
                teshuAction = {
                    name: player.name,  // 和原来的皮肤一样
                    x: [0, 0.5],
                    y: [0, 0.5],
                    scale: player.scale,
                    action: player.teshu,
                }
            }
            else if (teshuType === 'object') {
                teshuAction = teshu
                if (!teshuAction.name) {
                    teshuAction.name = player.name
                } else {
                    teshuAction.name = getFullName(player.localePath, teshu.name)
                }
                if (teshuAction.name !== player.name) {
                    if (!teshuAction.x) {
                        teshuAction.x = [0, 0.5]
                        teshuAction.posAuto = true
                    }
                    if (!teshuAction.y) {
                        teshuAction.y = [0, 0.5]
                        teshuAction.posAuto = true
                    }

                } else {
                    if (teshuAction.ck === true) {
                        if (!teshuAction.x) {
                            teshuAction.x = [0, 0.5]
                            teshuAction.posAuto = true
                        }
                        if (!teshuAction.y) {
                            teshuAction.y = [0, 0.5]
                            teshuAction.posAuto = true
                        }
                    } else {
                        if (!teshuAction.x) { teshuAction.x = player.x }
                        if (!teshuAction.y) { teshuAction.y = player.y }
                    }
                }
                if (!teshuAction.scale) { teshuAction.scale = player.scale }
            } else {
                // 默认从当前皮肤的TeShu标签来播放动作
                teshuAction = {
                    name: player.name,  // 和原来的皮肤一样
                    x: [0, 0.5],
                    y: [0, 0.5],
                    scale: player.scale,
                    action: 'TeShu',  // 寻找默认的攻击动画标签名称
                    posAuto: true
                }
            }
        }

        player.gongjiAction = gongjiAction
        player.teshuAction = teshuAction

        if (player.online) {
            if (gongjiAction && !gongjiAction.x) {
                gongjiAction.x = [0, 0.5]
                gongjiAction.posAuto = true
            }
            if (gongjiAction && !gongjiAction.y) {
                gongjiAction.y = [0, 0.5]
                gongjiAction.posAuto = true
            }
            if (teshuAction && !teshuAction.x) {
                teshuAction.x = [0, 0.5]
                teshuAction.posAuto = true
            }
            if (teshuAction && !teshuAction.y) {
                teshuAction.y = [0, 0.5]
                teshuAction.posAuto = true
            }
        }

        // 处理hudong参数（无懈出框）
        let hudong = player.hudong
        if (hudong && typeof hudong === 'object') {
            let hudongAction = hudong
            if (!hudongAction.name) {
                hudongAction.name = player.name
            } else {
                hudongAction.name = getFullName(player.localePath, hudongAction.name)
            }
            if (hudongAction.inPlace) {
                hudongAction.x = player.x
                hudongAction.y = player.y
                hudongAction.posAuto = false
            } else {
                if (hudongAction.name === player.name && hudongAction.ck !== true) {
                    if (!hudongAction.x) {
                        hudongAction.x = player.x
                    }
                    if (!hudongAction.y) {
                        hudongAction.y = player.y
                    }
                } else {
                    if (!hudongAction.x) {
                        hudongAction.x = [0, 0.5]
                        hudongAction.posAuto = true
                    }
                    if (!hudongAction.y) {
                        hudongAction.y = [0, 0.5]
                        hudongAction.posAuto = true
                    }
                }
            }
            if (!hudongAction.scale) { hudongAction.scale = player.scale }
            player.HuDongAction = hudongAction
            if (player.online && !hudongAction.inPlace) {
                if (!hudongAction.x) {
                    hudongAction.x = [0, 0.5]
                    hudongAction.posAuto = true
                }
                if (!hudongAction.y) {
                    hudongAction.y = [0, 0.5]
                    hudongAction.posAuto = true
                }
            }
        }
    }
}

function getOnlineActionParams(apnode, action) {
    if (!apnode || !apnode.player) return null
    if (action === 'GongJi') return apnode.player.gongjiAction
    if (action === 'TeShu') return apnode.player.teshuAction
    if (action === 'chuchang') return apnode.player.chuchangAction
    if (action === 'HuDong') return apnode.player.HuDongAction
    return apnode.player[action + 'Action']
}

function setOnlinePos(apnode, data, defaultOffsetY, defaultOffsetX) {
    let offsetY = defaultOffsetY
    if (offsetY == null) offsetY = 0
    let offsetX = defaultOffsetX
    if (offsetX == null) offsetX = 0
    let actionParams = getOnlineActionParams(apnode, data.action)
    if (actionParams && actionParams.usePrimaryPlayerPos) {
        if (setPrimaryPlayerPos(apnode, data, actionParams)) {
            return
        }
    }
    if (actionParams && actionParams.offsetY != null) {
        offsetY = actionParams.offsetY
    }
    if (actionParams && actionParams.offsetX != null) {
        offsetX = actionParams.offsetX
    }
    if (data.direction && typeof data.direction.isLeft === 'boolean') {
        offsetX += data.direction.isLeft ? 90 : -90
    }
    apnode.x = data.player.x + data.player.width / 2 + offsetX
    apnode.y = data.player.y + data.player.height / 2 + offsetY
}

function setOnlineGongJiPos(apnode, data) {
    const offsetY = data.me ? 100 : -80
    const offsetX = data.me ? -120 : 0
    setOnlinePos(apnode, data, offsetY, offsetX)
}

function setOnlineTeShuPos(apnode, data) {
    const offsetY = data.me ? 100 : -80
    const offsetX = data.me ? -120 : 0
    setOnlinePos(apnode, data, offsetY, offsetX)
}

function setOnlineChuChangPos(apnode, data) {
    const offsetY = data.me ? 100 : -80
    const offsetX = data.me ? -120 : 0
    setOnlinePos(apnode, data, offsetY, offsetX)
}

function setOnlineHuDongPos(apnode, data) {
    const offsetY = data.me ? 100 : -80
    const offsetX = data.me ? -120 : 0
    setOnlinePos(apnode, data, offsetY, offsetX)
}

function getShiZhouNianActionParams(apnode, action) {
    if (!apnode || !apnode.player) return null
    if (action === 'GongJi') return apnode.player.gongjiAction
    if (action === 'TeShu') return apnode.player.teshuAction
    if (action === 'chuchang') return apnode.player.chuchangAction
    if (action === 'HuDong') return apnode.player.HuDongAction
    return apnode.player[action + 'Action']
}

function getPrimaryPlayerActionParams(data, action) {
    if (!playerAnimation || !data) return null
    let primarySkinId = data.primarySkinId
    if (primarySkinId == null) {
        primarySkinId = data.skinId
    }
    if (primarySkinId == null) return null
    let primaryPlayer = playerAnimation.findPlayerParams(data.id, primarySkinId)
    if (!primaryPlayer) return null
    if (action === 'GongJi') return primaryPlayer.gongjiAction
    if (action === 'TeShu') return primaryPlayer.teshuAction
    if (action === 'chuchang') return primaryPlayer.chuchangAction
    if (action === 'HuDong') return primaryPlayer.HuDongAction
    return primaryPlayer && primaryPlayer[action + 'Action']
}

function setPrimaryPlayerPos(apnode, data, actionParams) {
    if (!actionParams) return false
    let primaryActionParams = getPrimaryPlayerActionParams(data, data.action)
    if (!primaryActionParams) return false
    if (primaryActionParams.x == null || primaryActionParams.y == null) return false
    let offsetX = actionParams.offsetX != null ? actionParams.offsetX : 0
    let offsetY = actionParams.offsetY != null ? actionParams.offsetY : 0
    if (Array.isArray(primaryActionParams.x)) {
        let xArr = primaryActionParams.x.slice()
        if (actionParams.offsetX != null && xArr.length > 0 && typeof xArr[0] === 'number') {
            xArr[0] += offsetX
        }
        apnode.x = xArr
    } else if (typeof primaryActionParams.x === 'number') {
        apnode.x = primaryActionParams.x + offsetX
    } else {
        apnode.x = primaryActionParams.x
    }
    if (Array.isArray(primaryActionParams.y)) {
        let yArr = primaryActionParams.y.slice()
        if (actionParams.offsetY != null && yArr.length > 0 && typeof yArr[0] === 'number') {
            yArr[0] += offsetY
        }
        apnode.y = yArr
    } else if (typeof primaryActionParams.y === 'number') {
        apnode.y = primaryActionParams.y + offsetY
    } else {
        apnode.y = primaryActionParams.y
    }
    if (primaryActionParams.scale != null && actionParams.scale == null) {
        apnode.scale = primaryActionParams.scale
    }
    return true
}

function setShiZhouNianPos(apnode, data, defaultOffsetY, defaultOffsetX) {
    let offsetY = defaultOffsetY
    if (offsetY == null) offsetY = 0
    let offsetX = defaultOffsetX
    if (offsetX == null) offsetX = 0
    let actionParams = getShiZhouNianActionParams(apnode, data.action)
    if (actionParams && actionParams.usePrimaryPlayerPos) {
        if (setPrimaryPlayerPos(apnode, data, actionParams)) {
            return
        }
    }
    if (actionParams && actionParams.offsetY != null) {
        offsetY = actionParams.offsetY
    }
    if (actionParams && actionParams.offsetX != null) {
        offsetX = actionParams.offsetX
    }
    if (data.direction && typeof data.direction.isLeft === 'boolean') {
        offsetX += data.direction.isLeft ? 90 : -90
    }
    apnode.x = data.player.x + data.player.width / 2 + offsetX
    apnode.y = data.player.y + data.player.height / 2 + offsetY
}

function setShiZhouNianGongJiPos(apnode, data) {
    const offsetY = data.me ? 100 : -80;
    const offsetX = data.me ? -120 : 0;
    setShiZhouNianPos(apnode, data, offsetY, offsetX);
}

function setShiZhouNianTeShuPos(apnode, data) {
    const offsetY = data.me ? 100 : -80;
    const offsetX = data.me ? -120 : 0;
    setShiZhouNianPos(apnode, data, offsetY, offsetX);
}

function setShiZhouNianChuChangPos(apnode, data) {
    const offsetY = data.me ? 100 : -80;
    const offsetX = data.me ? -120 : 0;
    setShiZhouNianPos(apnode, data, offsetY, offsetX);
}

function setPos(apnode, data) {
    if (apnode.player.qhlxBigAvatar) {
        apnode.x = apnode.player.gongjiAction.x
        apnode.y = apnode.player.gongjiAction.y
        return
    }
    if (data.me) {
        // 获取
        let actionParams
        if (data.action === 'GongJi') {
            actionParams = apnode.player.gongjiAction
            if (actionParams) {
                if (actionParams.usePrimaryPlayerPos) {
                    if (setPrimaryPlayerPos(apnode, data, actionParams)) {
                        return
                    }
                }
                // 十周年默认的
                if (actionParams.posAuto && apnode.player.online) {
                    return setOnlineGongJiPos(apnode, data)
                }
                if (actionParams.posAuto && apnode.player.shizhounian) {
                    return setShiZhouNianGongJiPos(apnode, data)
                }
            }
        }
        else if (data.action === 'TeShu') {
            actionParams = apnode.player.teshuAction
            if (actionParams) {
                if (actionParams.usePrimaryPlayerPos) {
                    if (setPrimaryPlayerPos(apnode, data, actionParams)) {
                        return
                    }
                }
                if (actionParams.posAuto && apnode.player.online) {
                    return setOnlineTeShuPos(apnode, data)
                }
                if (actionParams.posAuto && apnode.player.shizhounian) {
                    return setShiZhouNianTeShuPos(apnode, data)
                }
            }
        } else if (data.action === 'chuchang') {
            actionParams = apnode.player.chuchangAction
            if (actionParams && actionParams.usePrimaryPlayerPos) {
                if (setPrimaryPlayerPos(apnode, data, actionParams)) {
                    return
                }
            }
            // 如果设置了出场的位置, 那么不使用默认的位置
            if (apnode.player.chuchangAction.x && apnode.player.chuchangAction.y) {
                return
            }
            apnode.x = data.player.x + data.player.width / 4
            apnode.y = data.player.y + data.player.height * 0.8
            if (apnode.player.online) {
                return setOnlineChuChangPos(apnode, data)
            }
            return setShiZhouNianChuChangPos(apnode, data)
            // 出场是原地出场
        } else if (data.action === 'HuDong') {
            actionParams = apnode.player.HuDongAction
            if (actionParams) {
                if (actionParams.inPlace) {
                    apnode.x = data.player.x + data.player.width / 2
                    apnode.y = data.player.y + data.player.height / 2
                    return
                }
                if (actionParams.usePrimaryPlayerPos) {
                    if (setPrimaryPlayerPos(apnode, data, actionParams)) {
                        return
                    }
                }
                if (actionParams.posAuto && apnode.player.online) {
                    return setOnlineHuDongPos(apnode, data)
                }
            }
        } else {
            return
        }
        if (!actionParams) return
        apnode.x = actionParams.x
        apnode.y = actionParams.y
        data.player.y += data.player.height * 0.8
        data.player.x += data.player.width * 0.4
    } else {
        let actionParams
        if (data.action === 'GongJi') {
            actionParams = apnode.player.gongjiAction
        } else if (data.action === 'TeShu') {
            actionParams = apnode.player.teshuAction
        } else {
            actionParams = apnode.player[data.action + 'Action']
        }
        if (actionParams && actionParams.usePrimaryPlayerPos) {
            if (setPrimaryPlayerPos(apnode, data, actionParams)) {
                return
            }
        }
        if (data.action === 'chuchang') {
            if (apnode.player.online) {
                return setOnlineChuChangPos(apnode, data)
            }
            if (apnode.player.shizhounian) {
                return setShiZhouNianChuChangPos(apnode, data)
            }
        }
        else if (data.action === 'GongJi') {
            if (apnode.player.online) {
                return setOnlineGongJiPos(apnode, data)
            }
            if (apnode.player.shizhounian) {
                return setShiZhouNianGongJiPos(apnode, data)
            }
        } else if (data.action === 'TeShu') {
            if (apnode.player.online) {
                return setOnlineTeShuPos(apnode, data)
            }
            if (apnode.player.shizhounian) {
                return setShiZhouNianTeShuPos(apnode, data)
            }
        } else if (data.action === 'HuDong') {
            actionParams = apnode.player.HuDongAction
            if (actionParams && actionParams.inPlace) {
                apnode.x = data.player.x + data.player.width / 2
                apnode.y = data.player.y + data.player.height / 2
                return
            }
            if (apnode.player.online && actionParams && actionParams.posAuto) {
                return setOnlineHuDongPos(apnode, data)
            }
        }
        if (actionParams && actionParams.x != null && actionParams.y != null) {
            // 直接使用配置的位置
            apnode.x = actionParams.x
            apnode.y = actionParams.y
        }
        if (data.direction.isLeft) data.player.x += 85; else data.player.x += 40;
    }
}

// 填写了动皮的路径, 原来默认是放在assets/dynamic文件夹下, 这样不太好管理, 可以建立角色的文件夹,
// 然后填写localePath参数即可.如果包含本地路径的话, 再添加上文件夹路径作为骨骼的路径
function getFullName(localePath, name) {
    if (!localePath) return name
    if (!name.startsWith(localePath + '/')) {
        name = localePath + '/' + name
    }
    return name
}


// 返回0-a-1中的随机整数
function randomInt(a) {
    return Math.floor(Math.random() * a)
}

// 返回数组中的随机一个值, 如果数组为空则放回undefined
function randomChoice(arr) {
    if (!arr || arr.length === 0) return undefined
    return arr[randomInt(arr.length)]
}


/** 消息处理函数 */

function createChuKuang(data) {
    playerAnimation = new PlayerAnimation(data)
    playerAnimation.dprAdaptive = false
}


// 预加载用到的骨骼
function preLoad(data) {
    playerAnimation.preLoadPlayerSkel(data)
}

function completePlayerParams(avatarPlayer, action) {
    if (avatarPlayer) {
        if (!avatarPlayer.actionState) { avatarPlayer.actionState = {} }
        else {
            if (avatarPlayer.actionState[action] === false) {
                return false
            }
            if (avatarPlayer.actionState[action] != null) {
                return true
            }
        }
        // 查找是否有该骨骼, 并且可否出框
        let daijiName = avatarPlayer.name
        let actionParams
        if (action === 'GongJi') actionParams = avatarPlayer.gongjiAction
        else if (action === 'TeShu') actionParams = avatarPlayer.teshuAction
        else if (action === 'chuchang') actionParams = avatarPlayer.chuchangAction
        else if (action === 'HuDong') actionParams = avatarPlayer.HuDongAction
        else actionParams = avatarPlayer[action + 'Action']  // 这个写法是可以扩展随意任意想要出框的action, 默认可以出框的只有gongji,teshu,chuchang

        if (actionParams && actionParams.name === daijiName) {
            // 只支持假动皮攻击出框, 其他动作和待机相同, 不允许出框
            if (action === 'GongJi') {
                // 查找待机动作的默认动作标签, 并缓存
                let skDaiji = inferSkelTypeFromParams(playerAnimation.animationManager, daijiName, avatarPlayer)
                let version = resolveRuntimeSkelVersion(playerAnimation.animationManager, daijiName, skDaiji, actionParams, avatarPlayer)
                ckApplyPlayerUnpackToAnni(avatarPlayer, version)
                let results = playerAnimation.getAnni(avatarPlayer, version).getSpineActions(daijiName, actionParams.toLoadActions)
                if (results && results.length > 0) {
                    // 检查是否有GongJi标签, 如果有那是真动皮
                    if (actionParams.fakeDynamic) {
                        for (let r of results) {
                            if (r.name === 'GongJi') {
                                avatarPlayer.actionState[action] = {
                                    action: r.name,
                                    duration: r.duration,
                                    showTime: actionParams.showTime || r.duration
                                }
                                actionParams.fakeDynamic = false
                                avatarPlayer.qhlxAutoSetGongJi = false
                                return true
                            }
                        }
                        if (avatarPlayer.qhlxAutoSetGongJi) {
                            return false
                        }
                        avatarPlayer.actionState[action] = {
                            action: results[0].name,
                            duration: results[0].duration,
                            showTime: actionParams.showTime || Math.min(results[0].duration, 2)
                        }
                        return true

                    }
                    let isArray = Array.isArray(actionParams.action)
                    let states = []
                    for (let r of results) {
                        // 如果攻击填写的出多个标签, 那么顺便校验
                        if (isArray) {
                            if (actionParams.action.includes(r.name)) {
                                states.push({
                                    action: r.name,
                                    duration: r.duration,
                                    showTime: actionParams.showTime || r.duration
                                })
                            }
                        } else {
                            if (r.name === actionParams.action) {
                                avatarPlayer.actionState[action] = {
                                    action: r.name,
                                    duration: r.duration,
                                    showTime: actionParams.showTime || r.duration
                                }
                                return true
                            }
                        }
                    }
                    if (states.length > 0) {
                        avatarPlayer.actionState[action] = states
                        return true
                    }
                }
                avatarPlayer.actionState[action] = false
            } else if (action === 'chuchang') {
                let skDaiji = inferSkelTypeFromParams(playerAnimation.animationManager, daijiName, avatarPlayer)
                let version = resolveRuntimeSkelVersion(playerAnimation.animationManager, daijiName, skDaiji, actionParams, avatarPlayer)
                ckApplyPlayerUnpackToAnni(avatarPlayer, version)
                let results = playerAnimation.getAnni(avatarPlayer, version).getSpineActions(daijiName, actionParams.toLoadActions)
                if (results && results.length > 0) {
                    for (let r of results) {
                        if (r.name === actionParams.action) {
                            avatarPlayer.actionState[action] = {
                                action: r.name,
                                duration: r.duration,
                                // 出场动画固定显示3秒
                                showTime: actionParams.showTime || 3
                            }
                            return true
                        }
                    }
                    // 使用第一个当作chuchang
                    avatarPlayer.actionState[action] = {
                        action: results[0].name,
                        duration: results[0].duration,
                        // 出场动画固定显示3秒
                        showTime: actionParams.showTime || 3
                    }
                    return true
                }
                avatarPlayer.actionState[action] = false
            } else if (action === 'TeShu') {
                let shouldChukuang = actionParams.ck === true
                
                if (shouldChukuang) {
                    let skDaijiTs = inferSkelTypeFromParams(playerAnimation.animationManager, daijiName, avatarPlayer)
                    let version = resolveRuntimeSkelVersion(playerAnimation.animationManager, daijiName, skDaijiTs, actionParams, avatarPlayer)
                    ckApplyPlayerUnpackToAnni(avatarPlayer, version)
                    let results = playerAnimation.getAnni(avatarPlayer, version).getSpineActions(daijiName, actionParams.toLoadActions)
                    if (results && results.length > 0) {
                        let isArray = Array.isArray(actionParams.action)
                        let states = []
                        for (let r of results) {
                            if (isArray) {
                                if (actionParams.action.includes(r.name)) {
                                    let showTime = actionParams.showTime || Math.max(r.duration, 1.5)
                                    states.push({
                                        action: r.name,
                                        duration: r.duration,
                                        showTime: showTime
                                    })
                                }
                            } else {
                                if (r.name === actionParams.action || !actionParams.action) {
                                    let showTime = actionParams.showTime || Math.max(r.duration, 1.5)
                                    avatarPlayer.actionState[action] = {
                                        action: r.name,
                                        duration: r.duration,
                                        showTime: showTime
                                    }
                                    return true
                                }
                            }
                        }
                        if (states.length > 0) {
                            avatarPlayer.actionState[action] = states
                            return true
                        }
                    }
                }
                avatarPlayer.actionState[action] = false
            } else if (action === 'HuDong') {
                let skDaijiHd = inferSkelTypeFromParams(playerAnimation.animationManager, daijiName, avatarPlayer)
                let version = resolveRuntimeSkelVersion(playerAnimation.animationManager, daijiName, skDaijiHd, actionParams, avatarPlayer)
                ckApplyPlayerUnpackToAnni(avatarPlayer, version)
                let results = playerAnimation.getAnni(avatarPlayer, version).getSpineActions(daijiName, actionParams.toLoadActions)
                if (results && results.length > 0) {
                    let isArray = Array.isArray(actionParams.action)
                    let states = []
                    for (let r of results) {
                        if (isArray) {
                            if (actionParams.action.includes(r.name)) {
                                states.push({
                                    action: r.name,
                                    duration: r.duration,
                                    showTime: actionParams.showTime || r.duration
                                })
                            }
                        } else {
                            if (r.name === actionParams.action || !actionParams.action) {
                                avatarPlayer.actionState[action] = {
                                    action: r.name,
                                    duration: r.duration,
                                    showTime: actionParams.showTime || r.duration
                                }
                                return true
                            }
                        }
                    }
                    if (states.length > 0) {
                        avatarPlayer.actionState[action] = states
                        return true
                    }
                }
                avatarPlayer.actionState[action] = false
            } else {
                avatarPlayer.actionState[action] = false
            }
        } else {
            // 查找骨骼与正确的标签
            // 修复：确保actionParams存在且有有效的version参数
            if (!actionParams) {
                avatarPlayer.actionState[action] = false;
                return false;
            }

            let skBone = inferSkelTypeFromParams(playerAnimation.animationManager, actionParams.name, actionParams)
            let version = resolveRuntimeSkelVersion(playerAnimation.animationManager, actionParams.name, skBone, actionParams, avatarPlayer)
            ckApplyPlayerUnpackToAnni(avatarPlayer, version)
            let results = playerAnimation.getAnni(avatarPlayer, version).getSpineActions(actionParams.name, actionParams.toLoadActions)
            let isArray = Array.isArray(actionParams.action)
            let states = []

            if (results && results.length > 0) {
                if (!actionParams.action) {
                    avatarPlayer.actionState[action] = {
                        action: results[0].name,
                        duration: results[0].duration,
                        showTime: actionParams.showTime || results[0].duration
                    }
                    return true
                }
                for (let r of results) {
                    if (isArray) {
                        if (actionParams.action.includes(r.name)) {
                            let showTime = actionParams.showTime || r.duration
                            // 针对特殊动画确保最小显示时间
                            if (action === 'TeShu') {
                                showTime = actionParams.showTime || Math.max(r.duration, 1.5)
                            }
                            states.push({
                                action: r.name,
                                duration: r.duration,
                                showTime: showTime
                            })
                        }
                    } else {
                        if (r.name === actionParams.action) {
                            let showTime = actionParams.showTime || r.duration
                            // 针对特殊动画确保最小显示时间
                            if (action === 'TeShu') {
                                showTime = actionParams.showTime || Math.max(r.duration, 1.5)
                            }
                            avatarPlayer.actionState[action] = {
                                action: r.name,
                                duration: r.duration,
                                showTime: showTime
                            }
                            return true
                        }
                    }
                }
                if (states.length > 0) {
                    avatarPlayer.actionState[action] = states
                    return true
                }
            }
            avatarPlayer.actionState[action] = false;
        }
    }
}

function isChuKuang(data) {
    // 如果已经是出框状态, 直接返回, 不能在短时间内连续请求
    let playerState = playerAnimation.playerState[data.id]
    if (playerState) {
        let currentTime = new Date().getTime()

        // 针对出场动画设置更短的冷却时间，实现立即重播
        if (data.action === 'chuchang') {
            // 出场动画的冷却时间改为50ms，几乎立即重播
            if (playerState.time && currentTime - playerState.time <= 50) {
                return
            }
            playerState['time'] = currentTime
        }
        // 针对特殊动画设置更短的冷却时间，实现立即重播
        else if (data.action === 'TeShu') {
            // 如果出场动画正在播放，则不播放特殊动画
            if (playerState.action === 'chuchang') {
                return
            }
            if (playerState.lastAction === 'chuchang' && playerState.time && currentTime - playerState.time <= 500) {
                return
            }
            if (playerState.action === 'GongJi') {
                if (playerState.endTime && currentTime < playerState.endTime) {
                    return
                }
            }
            if (playerState.time && currentTime - playerState.time <= 50) {
                return
            }
            playerState['time'] = currentTime
        }
        else {
            console.log(playerState, currentTime, currentTime - playerState.time < 40)
            if (playerState.action != null && playerState.action !== data.action) {
                return
            }
            if (playerState.lastAction === 'chuchang' && playerState.time && currentTime - playerState.time <= 50) {
                return
            }
            if (playerState.lastAction === 'TeShu' && playerState.time && currentTime - playerState.time <= 50) {
                return
            }
            // 延时40ms执行动作, 防止两次触发相近（保持原有逻辑）
            if (playerState.time && currentTime - playerState.time < 40) {
                // if (playerState.lastAction && playerState.lastAction !== data.action) {
                //     setTimeout(() => {
                //         isChuKuang(data)
                //     }, 100)
                // }
                return;
            }

        }

        // playerState['time'] = new Date().getTime()
        // playerState['lastAction'] = data.action
    }
    // else {
    //     playerAnimation.playerState[data.id] = {time: new Date().getTime(), lastAction: data.action}
    // }


    let primarySkinId = data.primarySkinId
    let deputySkinId = data.deputySkinId
    // 查找是否可以出框
    let primaryPlayer = playerAnimation.findPlayerParams(data.id, primarySkinId)

    let extraParams = data.extraParams

    // 检查是否是主动不出框
    let checkNoChukuang = (player) => {
        if (!player) return
        let actionParams
        if (data.action === 'GongJi') actionParams = player.gongjiAction
        else if (data.action === 'chukuang') actionParams = player.chuchangAction
        else if (data.action === 'TeShu') actionParams = player.teshuAction
        else if (data.action === 'HuDong') actionParams = player.HuDongAction
        else actionParams = player[data.action + 'Action']
        if (extraParams) {
            if (actionParams) {
                for (let k in extraParams) {
                    actionParams[k] = extraParams[k]
                }
            }
        }
        if (actionParams && actionParams.ck === false) {
            if (player.zhishixian && extraParams) {
                playerAnimation.playZhiShiXian(player, extraParams.attackArgs, data, (player.zhishixian.delay * 1000) || 0)
            }
            postMessage({
                id: data.id,
                message: 'noActionChuKuang',
                action: data.action,
                qhlxBigAvatar: player && player.qhlxBigAvatar
            })
            return true
        }
    }
    if (checkNoChukuang(primaryPlayer)) {
        return
    }

    if (completePlayerParams(primaryPlayer, data.action)) {
        if (!playerState) {
            playerAnimation.playerState[data.id] = { time: new Date().getTime(), lastAction: data.action };
        } else {
            playerAnimation.playerState[data.id].time = new Date().getTime()
            playerAnimation.playerState[data.id].lastAction = data.action
        }


        let actionParams
        if (data.action === 'GongJi') actionParams = primaryPlayer.gongjiAction
        else if (data.action === 'chukuang') actionParams = primaryPlayer.chuchangAction
        else if (data.action === 'TeShu') actionParams = primaryPlayer.teshuAction
        else if (data.action === 'HuDong') actionParams = primaryPlayer.HuDongAction
        else actionParams = primaryPlayer[data.action + 'Action']
        if (extraParams) {
            if (actionParams) {
                for (let k in extraParams) {
                    actionParams[k] = extraParams[k]
                }
            }
        }
        clearTimeout(actionParams.moveToTimeout)
        clearTimeout(actionParams.showTimeout)


        return postMessage({
            id: data.id,
            skinId: primarySkinId,
            message: 'chukuangPrepare',
            action: data.action,
            isPrimary: true,
            qhlxBigAvatar: primaryPlayer.qhlxBigAvatar
        })
    }

    let deputyPlayer = playerAnimation.findPlayerParams(data.id, deputySkinId)
    if (checkNoChukuang(deputyPlayer)) {
        return
    }
    if (completePlayerParams(deputyPlayer, data.action)) {

        if (!playerState) {
            playerAnimation.playerState[data.id] = { time: new Date().getTime(), lastAction: data.action };
        } else {
            playerAnimation.playerState[data.id].time = new Date().getTime()
            playerAnimation.playerState[data.id].lastAction = data.action
        }

        let actionParams
        if (data.action === 'GongJi') actionParams = deputyPlayer.gongjiAction
        else if (data.action === 'chukuang') actionParams = deputyPlayer.chuchangAction
        else if (data.action === 'TeShu') actionParams = deputyPlayer.teshuAction
        else if (data.action === 'HuDong') actionParams = deputyPlayer.HuDongAction
        else actionParams = deputyPlayer[data.action + 'Action']
        if (extraParams) {
            if (actionParams) {
                for (let k in extraParams) {
                    actionParams[k] = extraParams[k]
                }
            }
        }
        // 需要重新出框了, 清除原来的出框消息
        clearTimeout(actionParams.moveToTimeout)
        clearTimeout(actionParams.showTimeout)
        return postMessage({
            id: data.id,
            skinId: deputySkinId,
            message: 'chukuangPrepare',
            action: data.action,
            isPrimary: false,
            qhlxBigAvatar: deputyPlayer.qhlxBigAvatar
        })
    }

    // 如果填写了指示线, 那么从指示线进行攻击
    if (primaryPlayer && primaryPlayer.zhishixian && extraParams) {
        return playerAnimation.playZhiShiXian(primaryPlayer, extraParams.attackArgs, data, (primaryPlayer.zhishixian.delay * 1000) || 0)
    }
    if (deputyPlayer && deputyPlayer.zhishixian && extraParams) {
        return playerAnimation.playZhiShiXian(deputyPlayer, extraParams.attackArgs, data, (primaryPlayer.zhishixian.delay * 1000) || 0)
    }

    postMessage({
        id: data.id,
        message: 'noActionChuKuang',
        action: data.action,
        qhlxBigAvatar: primaryPlayer && primaryPlayer.qhlxBigAvatar
    })
}


function chukuangStart(data) {
    playerAnimation.playAction(data)
}

function update(data) {
    if (playerAnimation) playerAnimation.animationManager.updateSpineAll(data)
    if (decadeUIAni) {
        decadeUIAni.updateSpineAll(data)
    }
}

function adjust(data) {
    let player = playerAnimation.findPlayerParams(data.id, data.skinId)
    if (!player) return;

    // 修复：支持调整不同类型的动作，包括出场动作
    let actionParams
    if (data.action === 'GongJi') {
        actionParams = player.gongjiAction
    } else if (data.action === 'chukuang' || data.action === 'chuchang') {
        actionParams = player.chuchangAction
    } else if (data.action === 'TeShu') {
        actionParams = player.teshuAction
    } else if (data.action === 'HuDong') {
        actionParams = player.HuDongAction
    } else if (data.action) {
        actionParams = player[data.action + 'Action']
    } else {
        // 如果没有指定动作类型，默认调整攻击动作（保持兼容性）
        actionParams = player.gongjiAction
    }

    if (!actionParams) return

    if (data.x != null && data.y != null) {
        // 修改参数
        actionParams.x = data.x
        actionParams.y = data.y
    }
    if (data.scale != null) {
        // 同一个动皮出框通过调整静态大小即可.
        actionParams.scale = data.scale
    }
    if (data.angle != null) {
        // 同一个动皮出框通过调整静态大小即可.
        actionParams.angle = data.angle
    }
    actionParams.posAuto = false

    // 如果调整的是攻击动作，同步更新特殊动作的参数
    if (data.action === 'GongJi' && player.teshuAction) {
        if (data.x != null && data.y != null) {
            player.teshuAction.x = data.x
            player.teshuAction.y = data.y
        }
        if (data.scale != null) {
            player.teshuAction.scale = data.scale
        }
        if (data.angle != null) {
            player.teshuAction.angle = data.angle
        }
        player.teshuAction.posAuto = false
    }

    let skAdj = inferSkelTypeFromParams(playerAnimation.animationManager, actionParams.name, actionParams)
    let version = resolveRuntimeSkelVersion(playerAnimation.animationManager, actionParams.name, skAdj, actionParams, player)
    let animationManager = playerAnimation.getAnni(player, version);

    // 查找正在播放的动画节点
    if (animationManager && animationManager.nodes) {
        let updatedNodes = 0;
        for (let node of animationManager.nodes) {
            // 检查是否是当前玩家的动画节点且未完成
            let shouldUpdate = false
            let targetActionParams = actionParams

            if (node.player === player && !node.completed) {
                if (node.actionParams === actionParams) {
                    shouldUpdate = true
                } else if (data.action === 'GongJi' && node.actionParams === player.teshuAction) {
                    // 如果调整的是攻击动作，也要更新特殊动作的节点
                    shouldUpdate = true
                    targetActionParams = player.teshuAction
                }
            }

            if (shouldUpdate) {
                // 立即更新节点的位置、缩放、角度
                if (data.x != null && data.y != null) {
                    node.x = targetActionParams.x;
                    node.y = targetActionParams.y;
                }
                if (data.scale != null) {
                    node.scale = targetActionParams.scale;
                }
                if (data.angle != null) {
                    node.angle = targetActionParams.angle;
                }
                updatedNodes++;
            }
        }
        console.log(`adjust: 已更新 ${updatedNodes} 个动画节点，动作类型: ${data.action}`);
    }
}

function position(data) {
    let player = playerAnimation.findPlayerParams(data.id, data.skinId)
    if (!player) return;

    let actionParams
    let actionType = data.action

    if (!actionType) {
        if (data.mode === 'chukuang' || data.mode === 'zhishixian') {
            actionType = 'GongJi'
        } else if (data.mode === 'chuchang') {
            actionType = 'chuchang'
        } else if (data.mode === 'teshu') {
            actionType = 'TeShu'
        } else if (data.mode === 'hudong') {
            actionType = 'HuDong'
        } else {
            actionType = 'GongJi'
        }
    }

    if (actionType === 'GongJi') {
        actionParams = player.gongjiAction
    } else if (actionType === 'chuchang' || actionType === 'chukuang') {
        actionParams = player.chuchangAction
    } else if (actionType === 'TeShu') {
        actionParams = player.teshuAction
    } else if (actionType === 'HuDong') {
        actionParams = player.HuDongAction
    } else if (actionType) {
        actionParams = player[actionType + 'Action']
    }

    if (!actionParams) {
        postMessage({
            id: data.id,
            type: 'position',
            x: [0, 0.5],
            y: [0, 0.5],
            scale: 1,
            angle: 0
        })
        return
    }

    let x = actionParams.x != null ? actionParams.x : [0, 0.5]
    let y = actionParams.y != null ? actionParams.y : [0, 0.5]
    let scale = actionParams.scale != null ? actionParams.scale : 1
    let angle = actionParams.angle != null ? actionParams.angle : 0

    if (data.player && player.shizhounian) {
        if (actionParams.usePrimaryPlayerPos) {
            let primaryActionParams = getPrimaryPlayerActionParams(data, actionType)
            if (primaryActionParams && primaryActionParams.x != null && primaryActionParams.y != null) {
                let offsetX = actionParams.offsetX != null ? actionParams.offsetX : 0
                let offsetY = actionParams.offsetY != null ? actionParams.offsetY : 0
                if (Array.isArray(primaryActionParams.x)) {
                    let xArr = primaryActionParams.x.slice()
                    if (actionParams.offsetX != null && xArr.length > 0 && typeof xArr[0] === 'number') {
                        xArr[0] += offsetX
                    }
                    x = xArr
                } else if (typeof primaryActionParams.x === 'number') {
                    x = primaryActionParams.x + offsetX
                } else {
                    x = primaryActionParams.x
                }
                if (Array.isArray(primaryActionParams.y)) {
                    let yArr = primaryActionParams.y.slice()
                    if (actionParams.offsetY != null && yArr.length > 0 && typeof yArr[0] === 'number') {
                        yArr[0] += offsetY
                    }
                    y = yArr
                } else if (typeof primaryActionParams.y === 'number') {
                    y = primaryActionParams.y + offsetY
                } else {
                    y = primaryActionParams.y
                }
                if (primaryActionParams.scale != null && actionParams.scale == null) {
                    scale = primaryActionParams.scale
                }
            }
        } else if (actionParams.posAuto || (actionParams.x == null && actionParams.y == null)) {
            let offsetY = actionParams.offsetY != null ? actionParams.offsetY : (data.me ? 100 : -80)
            let offsetX = actionParams.offsetX != null ? actionParams.offsetX : (data.me ? -120 : 0)
            
            if (data.direction && typeof data.direction.isLeft === 'boolean') {
                offsetX += data.direction.isLeft ? 90 : -90
            }
            
            if (actionType === 'GongJi' || actionType === 'TeShu' || actionType === 'chuchang') {
                const centerX = data.player.x + data.player.width / 2 + offsetX
                const centerY = data.player.y + data.player.height / 2 + offsetY
                const bodySize = data.bodySize || { width: 1920, height: 1080 }
                x = [0, centerX / bodySize.width]
                y = [0, centerY / bodySize.height]
            }
        } else {
            if (actionParams.x == null) {
                x = [0, 0.5]
            }
            if (actionParams.y == null) {
                y = [0, 0.5]
            }
        }
    }

    if (data.player && player.online) {
        let shouldUseAutoPos = false
        if (actionParams.posAuto) {
            shouldUseAutoPos = true
        } else if (actionParams.x == null && actionParams.y == null) {
            shouldUseAutoPos = true
        }
        if (shouldUseAutoPos) {
            let offsetY = data.me ? 100 : -80
            let offsetX = data.me ? -120 : 0
            if (actionType === 'GongJi' || actionType === 'TeShu' || actionType === 'chuchang' || actionType === 'HuDong') {
                const centerX = data.player.x + data.player.width / 2 + offsetX
                const centerY = data.player.y + data.player.height / 2 + offsetY
                const bodySize = data.bodySize || { width: 1920, height: 1080 }
                x = [0, centerX / bodySize.width]
                y = [0, centerY / bodySize.height]
            }
            scale = data.me ? 1.2 : 0.9
        } else {
            if (actionParams.x == null) {
                x = [0, 0.5]
            }
            if (actionParams.y == null) {
                y = [0, 0.5]
            }
            scale = data.me ? 1.2 : 0.9
        }
    }

    postMessage({
        id: data.id,
        type: 'position',
        x: x,
        y: y,
        scale: scale,
        angle: angle
    })
}

function resolveReplaceSlotFetchUrl(url) {
    if (!url || typeof url !== 'string') return url
    var u = url.trim()
    if (/^(https?:|file:|blob:|data:)/i.test(u)) return u
    var base = self.location.href.replace(/[/\\][^/\\]*$/, '/')
    var s = u.replace(/^\.\//, '')
    if (/^extension\//i.test(s)) {
        s = '../' + s.replace(/^extension\//i, '')
    }
    try {
        return new URL(s, base).href
    } catch (e) {
        return url
    }
}

function applyReplaceSlotUrls(sprite, node) {
    let list = sprite.replaceSlotUrls
    if (!list || !list.length || !node || !node.skeleton) return
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (!dynamic || typeof dynamic.replaceSlotTexture !== 'function') return
    let tasks = []
    for (let i = 0; i < list.length; i++) {
        let pair = list[i]
        if (!pair || pair.length < 2 || typeof pair[1] !== 'string') continue
        let slotName = pair[0]
        let url = pair[1]
        let resolved = resolveReplaceSlotFetchUrl(url)
        tasks.push(
            fetch(resolved, { mode: 'cors', cache: 'force-cache' })
                .then(function (r) {
                    if (!r.ok) throw new Error('http ' + r.status)
                    return r.blob()
                })
                .then(function (blob) { return createImageBitmap(blob) })
                .then(function (bmp) {
                    let ok = dynamic.replaceSlotTexture(node, slotName, bmp, 'url_' + slotName + '_' + i)
                    if (!ok) return
                    let slot = node.skeleton.findSlot(slotName)
                    let a = slot && slot.getAttachment()
                    if (!a) return
                    if (!node._runtimeSlotReplacements) node._runtimeSlotReplacements = []
                    let rep = node._runtimeSlotReplacements
                    let j = rep.findIndex(function (x) { return x.slotName === slotName })
                    if (j >= 0) rep[j].attachment = a
                    else rep.push({ slotName: slotName, attachment: a })
                })
                .catch(function () { })
        )
    }
    if (tasks.length) Promise.all(tasks).catch(function () {})
}

function effectPreparePositionRefer(position) {
    if (position && position.parent) {
        let elementId = position.elementId !== undefined ? position.elementId : undefined
        position.referNode = new HTMLElement(position.parent.boundRect, position.parent.bodySize, elementId)
        position.referFollow = !!position.follow
        position.elementId = position.referNode.id
        position.parent = null
    } else if (position) {
        position.referFollow = !!position.follow
    }
}

function effectClonePosition(position) {
    if (!position) return null
    let p = {}
    for (let k in position) {
        p[k] = position[k]
    }
    return p
}

function effectPairAttachSync(masterNode, slaveNode, mode) {
    if (!masterNode || !slaveNode || !masterNode.skeleton || !slaveNode.skeleton || !masterNode.skeleton.state) return
    if (masterNode._effectPairSyncInstalled) return
    masterNode._effectPairSyncInstalled = true
    masterNode._effectPairSlaveNode = slaveNode
    let m = mode === 'stopFollow' ? 'stopFollow' : 'resetFollow'
    masterNode.skeleton.state.addListener({
        complete: function (entry) {
            try {
                if (!entry || entry.trackIndex !== 0) return
                let sn = masterNode._effectPairSlaveNode
                if (!sn || !sn.skeleton || !sn.skeleton.state) return
                let tr = sn.skeleton.state.tracks[0]
                if (!tr) return
                if (m === 'stopFollow') {
                    sn.skeleton.state.setEmptyAnimation(0, 0)
                    sn.completed = true
                } else {
                    tr.trackTime = 0
                }
            } catch (e) { }
        }
    })
}

function effectEnsurePlay(dynamic, sprite, position, onReady, onError) {
    if (dynamic.hasSpine(sprite.name)) {
        onReady(dynamic.playSpine(sprite, position))
    } else {
        let skEf = inferSkelTypeFromParams(playerAnimation.animationManager, sprite.name, sprite)
        dynamic.loadSpine(sprite.name, skEf, function () {
            onReady(dynamic.playSpine(sprite, position))
        }, onError || function () { })
    }
}

function effectBuildAfterPlay(sprite) {
    let hideBlack = sprite.hideBlack
    let hideBlackSlots = sprite.hideBlackSlots

    let playAndHideBlack = (node) => {
        if (!node || !node.skeleton) return

        if (hideBlack || hideBlackSlots) {
            node._hideBlack = hideBlack
            node._hideBlackSlots = hideBlackSlots
            node._blackAttachmentNames = []

            let applyHideBlack = () => {
                if (!node || !node.skeleton || !node.skeleton.slots || node.completed) {
                    return false
                }

                let slots = node.skeleton.slots
                let blackAttachmentNames = node._blackAttachmentNames || []

                if (node._hideBlackSlots && Array.isArray(node._hideBlackSlots)) {
                    for (let name of node._hideBlackSlots) {
                        if (!blackAttachmentNames.includes(name)) {
                            blackAttachmentNames.push(name)
                        }
                    }
                }

                for (let i = 0; i < slots.length; i++) {
                    let slot = slots[i]
                    let attachment = slot.getAttachment()

                    if (attachment && attachment.name) {
                        let shouldHide = false

                        if (blackAttachmentNames.includes(attachment.name)) {
                            shouldHide = true
                        } else if (node._hideBlack) {
                            let slotColor = slot.color
                            let skeletonColor = node.skeleton.color
                            let r = slotColor.r * skeletonColor.r
                            let g = slotColor.g * skeletonColor.g
                            let b = slotColor.b * skeletonColor.b
                            let a = slotColor.a * skeletonColor.a

                            if (a > 0.01) {
                                let avg = (r + g + b) / 3
                                let maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))

                                if (avg < 1.0 || (avg < 1.0 && maxDiff < 0.2)) {
                                    shouldHide = true
                                    if (!blackAttachmentNames.includes(attachment.name)) {
                                        blackAttachmentNames.push(attachment.name)
                                    }
                                }
                            }

                            if (!shouldHide && attachment.color) {
                                let attR = attachment.color.r || 0
                                let attG = attachment.color.g || 0
                                let attB = attachment.color.b || 0
                                let attA = attachment.color.a || 1

                                let finalR = r * attR
                                let finalG = g * attG
                                let finalB = b * attB

                                if (attA > 0.01) {
                                    let finalAvg = (finalR + finalG + finalB) / 3
                                    let finalMaxDiff = Math.max(Math.abs(finalR - finalG), Math.abs(finalG - finalB), Math.abs(finalR - finalB))

                                    if (finalAvg < 1.0 || (finalAvg < 1.0 && finalMaxDiff < 0.2)) {
                                        shouldHide = true
                                        if (!blackAttachmentNames.includes(attachment.name)) {
                                            blackAttachmentNames.push(attachment.name)
                                        }
                                    }
                                }
                            }
                        }

                        if (shouldHide) {
                            slot.color.a = 0
                            if (!node.hideSlots) {
                                node.hideSlots = []
                            }
                            if (Array.isArray(node.hideSlots) && !node.hideSlots.includes(attachment.name)) {
                                node.hideSlots.push(attachment.name)
                            }
                        }
                    }
                }

                node._blackAttachmentNames = blackAttachmentNames
                return true
            }

            let animate = () => {
                if (applyHideBlack()) {
                    requestAnimationFrame(animate)
                }
            }

            applyHideBlack()
            animate()
        }
    }

    return function (node) {
        playAndHideBlack(node)
        applyReplaceSlotUrls(sprite, node)
    }
}

function runChukuangPlayEffect(data) {
    let sprite = data.sprite
    let position = data.position
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let followSprite = data.followSprite != null ? data.followSprite : sprite.followSprite
    if (followSprite != null && typeof followSprite === 'string') {
        followSprite = { name: followSprite }
    }

    effectPreparePositionRefer(position)

    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    ensureEffectSpineUnpackReloadIfNeeded(sprite, dynamic)
    let afterPrimary = effectBuildAfterPlay(sprite)

    if (!followSprite) {
        effectEnsurePlay(dynamic, sprite, position, afterPrimary, function () { })
        return
    }

    let v2 = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, followSprite)
    let dynamic2 = playerAnimation.getAnni(null, v2)
    ensureEffectSpineUnpackReloadIfNeeded(followSprite, dynamic2)
    let afterFollow = effectBuildAfterPlay(followSprite)
    let pos2 = effectClonePosition(position)

    let mode = sprite.effectPairOnMasterComplete
    if (mode !== 'stopFollow' && mode !== 'resetFollow') {
        mode = 'resetFollow'
    }
    let syncMaster = sprite.effectPairSyncMaster === 'follow' ? 'follow' : 'primary'

    let n1
    let n2
    let pending = 0
    function tryFinish() {
        pending++
        if (pending < 2) return
        afterPrimary(n1)
        afterFollow(n2)
        let master = syncMaster === 'follow' ? n2 : n1
        let slave = syncMaster === 'follow' ? n1 : n2
        effectPairAttachSync(master, slave, mode)
    }
    effectEnsurePlay(dynamic, sprite, position, function (node) {
        n1 = node
        tryFinish()
    }, function () { })
    effectEnsurePlay(dynamic2, followSprite, pos2, function (node) {
        n2 = node
        tryFinish()
    }, function () { })
}

function playEffect(data) {
    runChukuangPlayEffect(data)
}
function playEffect2(data) {
    runChukuangPlayEffect(data)
}
function playEffect3(data) {
    runChukuangPlayEffect(data)
}

// playEffect3～7用来适配『無名背景』扩展
function playEffect4(data) {
    runChukuangPlayEffect(data)
}
function playEffect5(data) {
    runChukuangPlayEffect(data)
}
function playEffect6(data) {
    runChukuangPlayEffect(data)
}
function playEffect7(data) {
    runChukuangPlayEffect(data)
}

// 清除特效
function clearEffect(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = {name: sprite}
    }
    let v = sprite.version || '3.6'
    let dynamic = playerAnimation.getAnni(null, v)
    dynamic.stopSpine(sprite)
}
function clearEffect2(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = {name: sprite}
    }
    let v = sprite.version || '3.6'
    let dynamic = playerAnimation.getAnni(null, v)
    dynamic.stopSpine(sprite)
}
function clearEffect3(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = {name: sprite}
    }
    let v = sprite.version || '3.6'
    let dynamic = playerAnimation.getAnni(null, v)
    dynamic.stopSpine(sprite)
}
function clearEffect4(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = {name: sprite}
    }
    let v = sprite.version || '3.6'
    let dynamic = playerAnimation.getAnni(null, v)
    dynamic.stopSpine(sprite)
}
function clearEffect5(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = {name: sprite}
    }
    let v = sprite.version || '3.6'
    let dynamic = playerAnimation.getAnni(null, v)
    dynamic.stopSpine(sprite)
}
function clearEffect6(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = {name: sprite}
    }
    let v = sprite.version || '3.6'
    let dynamic = playerAnimation.getAnni(null, v)
    dynamic.stopSpine(sprite)
}
function clearEffect7(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = {name: sprite}
    }
    let v = sprite.version || '3.6'
    let dynamic = playerAnimation.getAnni(null, v)
    dynamic.stopSpine(sprite)
}


// 清除所有特效
function clearAllEffects() {
    // 清除普通动画管理器中的所有特效
    if (playerAnimation && playerAnimation.animationManager) {
        playerAnimation.animationManager.stopSpineAll()
    }
    // 清除十周年UI动画管理器中的所有特效
    if (decadeUIAni) {
        decadeUIAni.stopSpineAll()
    }
}
function clearAllEffects2() {
    if (playerAnimation && playerAnimation.animationManager) {
        playerAnimation.animationManager.stopSpineAll()
    }
    if (decadeUIAni) {
        decadeUIAni.stopSpineAll()
    }
}
function clearAllEffects3() {
    if (playerAnimation && playerAnimation.animationManager) {
        playerAnimation.animationManager.stopSpineAll()
    }
    if (decadeUIAni) {
        decadeUIAni.stopSpineAll()
    }
}
function clearAllEffects4() {
    if (playerAnimation && playerAnimation.animationManager) {
        playerAnimation.animationManager.stopSpineAll()
    }
    if (decadeUIAni) {
        decadeUIAni.stopSpineAll()
    }
}
function clearAllEffects5() {
    if (playerAnimation && playerAnimation.animationManager) {
        playerAnimation.animationManager.stopSpineAll()
    }
    if (decadeUIAni) {
        decadeUIAni.stopSpineAll()
    }
}
function clearAllEffects6() {
    if (playerAnimation && playerAnimation.animationManager) {
        playerAnimation.animationManager.stopSpineAll()
    }
    if (decadeUIAni) {
        decadeUIAni.stopSpineAll()
    }
}
function clearAllEffects7() {
    if (playerAnimation && playerAnimation.animationManager) {
        playerAnimation.animationManager.stopSpineAll()
    }
    if (decadeUIAni) {
        decadeUIAni.stopSpineAll()
    }
}


function stopEffect(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (sprite.id != null) {
        dynamic.stopSpine(sprite)
    } else if (sprite.name) {
        let nodes = dynamic.nodes || []
        for (let i = nodes.length - 1; i >= 0; i--) {
            let node = nodes[i]
            if (node.skeleton && node.skeleton.name === sprite.name) {
                if (!node.completed) {
                    node.completed = true
                    node.skeleton.state.setEmptyAnimation(0)
                }
            }
        }
    }
}

function stopEffect2(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (sprite.id != null) {
        dynamic.stopSpine(sprite)
    } else if (sprite.name) {
        let nodes = dynamic.nodes || []
        for (let i = nodes.length - 1; i >= 0; i--) {
            let node = nodes[i]
            if (node.skeleton && node.skeleton.name === sprite.name) {
                if (!node.completed) {
                    node.completed = true
                    node.skeleton.state.setEmptyAnimation(0)
                }
            }
        }
    }
}

function stopEffect3(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (sprite.id != null) {
        dynamic.stopSpine(sprite)
    } else if (sprite.name) {
        let nodes = dynamic.nodes || []
        for (let i = nodes.length - 1; i >= 0; i--) {
            let node = nodes[i]
            if (node.skeleton && node.skeleton.name === sprite.name) {
                if (!node.completed) {
                    node.completed = true
                    node.skeleton.state.setEmptyAnimation(0)
                }
            }
        }
    }
}

function stopEffect4(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (sprite.id != null) {
        dynamic.stopSpine(sprite)
    } else if (sprite.name) {
        let nodes = dynamic.nodes || []
        for (let i = nodes.length - 1; i >= 0; i--) {
            let node = nodes[i]
            if (node.skeleton && node.skeleton.name === sprite.name) {
                if (!node.completed) {
                    node.completed = true
                    node.skeleton.state.setEmptyAnimation(0)
                }
            }
        }
    }
}

function stopEffect5(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (sprite.id != null) {
        dynamic.stopSpine(sprite)
    } else if (sprite.name) {
        let nodes = dynamic.nodes || []
        for (let i = nodes.length - 1; i >= 0; i--) {
            let node = nodes[i]
            if (node.skeleton && node.skeleton.name === sprite.name) {
                if (!node.completed) {
                    node.completed = true
                    node.skeleton.state.setEmptyAnimation(0)
                }
            }
        }
    }
}

function stopEffect6(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (sprite.id != null) {
        dynamic.stopSpine(sprite)
    } else if (sprite.name) {
        let nodes = dynamic.nodes || []
        for (let i = nodes.length - 1; i >= 0; i--) {
            let node = nodes[i]
            if (node.skeleton && node.skeleton.name === sprite.name) {
                if (!node.completed) {
                    node.completed = true
                    node.skeleton.state.setEmptyAnimation(0)
                }
            }
        }
    }
}
function stopEffect7(data) {
    let sprite = data.sprite
    if (typeof sprite === 'string') {
        sprite = { name: sprite }
    }
    let v = resolveEffectSpriteRuntimeVersion(playerAnimation.animationManager, sprite)
    let dynamic = playerAnimation.getAnni(null, v)
    if (sprite.id != null) {
        dynamic.stopSpine(sprite)
    } else if (sprite.name) {
        let nodes = dynamic.nodes || []
        for (let i = nodes.length - 1; i >= 0; i--) {
            let node = nodes[i]
            if (node.skeleton && node.skeleton.name === sprite.name) {
                if (!node.completed) {
                    node.completed = true
                    node.skeleton.state.setEmptyAnimation(0)
                }
            }
        }
    }
}


function weiweixiao(data) {
    return playEffect(data)
}

function stopWeiweixiao(data) {
    return stopEffect(data)
}

/** @type {AnimationManager} */
let decadeUIAni
function createDecadeAni(data) {
    decadeUIAni = new AnimationManager(data.pathPrefix, data.canvas, null, { dpr: data.dpr })
}

// 调用十周年专用的ani播放函数
function decadeAniFunc(data) {
    let f = data.funcName
    let eventId = data.eventId
    let args = data.args
    switch (f) {
        case 'createTextureRegion':
            break
        case 'hasSpine':
            break
        case 'loadSpine':
            (() => {
                let filename = args[0]
                let skelType = args[1]
                let version = args[2]
                let unpackOpt = args.length > 3 ? args[3] : undefined
                if (filename in decadeUIAni.aniVersionMap) {
                    postMessage({
                        eventId: eventId,
                        success: true
                    })
                }
                let st = skelType != null && skelType !== '' ? String(skelType).toLowerCase() : decadeUIAni.resolveSkelFileTypeSync(filename)
                if (st !== 'json' && st !== 'skel') st = 'skel'
                let resolved = decadeUIAni.resolveSkelRuntimeVersion(filename, st, version != null && version !== '' ? version : null, null)
                let dynamic = decadeUIAni.getAnimation(resolved)
                if (unpackOpt != null) {
                    dynamic.unpackPremultipliedAlpha = !!unpackOpt
                }
                if (unpackOpt === true) {
                    let stNorm = st.toLowerCase()
                    if (stNorm !== 'json') stNorm = 'skel'
                    ensureSpineUnpackReloadIfNeeded(dynamic, filename, true, stNorm)
                }
                dynamic.loadSpine(filename, st, () => {
                    if (resolved != null && resolved !== '3.6' && !(resolved in decadeUIAni.aniVersionMap)) {
                        decadeUIAni.aniVersionMap[filename] = resolved
                    }
                    postMessage({
                        eventId: eventId,
                        success: true
                    })
                }, () => {
                    postMessage({
                        eventId: eventId,
                        error: true,
                        errMsg: 'error'
                    })
                })
            })()
            break
        case 'prepSpine':
            break
        case 'playSpine':
            (() => {
                let sprite = args[0]
                let position = args[1]
                if (typeof sprite === "string") {
                    sprite = { name: sprite }
                }
                if (position && position.parent) {
                    position.referNode = new HTMLElement(position.parent.boundRect, position.parent.bodySize)
                    position.referFollow = position.follow
                    position.parent = null
                }
                let skPs = inferSkelTypeFromParams(decadeUIAni, sprite.name, sprite)
                let resolvedPs = decadeUIAni.resolveSkelRuntimeVersion(sprite.name, skPs, sprite.version != null && sprite.version !== '' ? sprite.version : null, null)
                let dynamic = decadeUIAni.getAnimation(resolvedPs)
                ensureEffectSpineUnpackReloadIfNeeded(sprite, dynamic)

                if (dynamic.hasSpine(sprite.name)) {
                    dynamic.playSpine(sprite, position);
                } else {
                    dynamic.loadSpine(sprite.name, skPs, () => {
                        if (resolvedPs != null && resolvedPs !== '3.6' && !(resolvedPs in decadeUIAni.aniVersionMap)) {
                            decadeUIAni.aniVersionMap[sprite.name] = resolvedPs
                        }
                        dynamic.playSpine(sprite, position)
                    }, () => {
                        console.log('err')
                    });
                }
            })()
            break
        case 'loopSpine':
            (() => {
                let sprite = args[0]
                let position = args[1]
                if (typeof sprite === "string") {
                    sprite = { name: sprite, loop: true }
                } else {
                    sprite.loop = true;
                }
                if (position && position.parent) {
                    position.referNode = new HTMLElement(position.parent.boundRect, position.parent.bodySize)
                    position.referFollow = position.follow
                    position.parent = null
                }
                let skLp = inferSkelTypeFromParams(decadeUIAni, sprite.name, sprite)
                let resolvedLp = decadeUIAni.resolveSkelRuntimeVersion(sprite.name, skLp, sprite.version != null && sprite.version !== '' ? sprite.version : null, null)
                let dynamic = decadeUIAni.getAnimation(resolvedLp)
                ensureEffectSpineUnpackReloadIfNeeded(sprite, dynamic)
                if (dynamic.hasSpine(sprite.name)) {
                    dynamic.playSpine(sprite, position)
                } else {
                    dynamic.loadSpine(sprite.name, skLp, () => {
                        if (resolvedLp != null && resolvedLp !== '3.6' && !(resolvedLp in decadeUIAni.aniVersionMap)) {
                            decadeUIAni.aniVersionMap[sprite.name] = resolvedLp
                        }
                        dynamic.playSpine(sprite, position)
                    }, () => {
                        console.log('err')
                    })
                }
            })()
            break
        case 'stopSpine':
            (() => {
                let sprite = args[0]
                if (typeof sprite === "string") {
                    sprite = { name: sprite, loop: true }
                } else {
                    sprite.loop = true;
                }
                let skSt = inferSkelTypeFromParams(decadeUIAni, sprite.name, sprite)
                let mappedV = decadeUIAni.aniVersionMap[sprite.name]
                let resolvedSt = (mappedV != null && mappedV !== '')
                    ? mappedV
                    : decadeUIAni.resolveSkelRuntimeVersion(sprite.name, skSt, sprite.version != null && sprite.version !== '' ? sprite.version : null, null)
                let dynamic = decadeUIAni.getAnimation(resolvedSt)
                dynamic.stopSpine(sprite)

            })()
            break
        case 'stopSpineAll':
            decadeUIAni.stopSpineAll()
            break
        case 'getSpineActions':
            (() => {
                let filename = args[0]
                let type = args[1]
                let mapped = decadeUIAni.aniVersionMap[filename]
                let stGa = type != null && type !== '' ? String(type).toLowerCase() : decadeUIAni.resolveSkelFileTypeSync(filename)
                if (stGa !== 'json' && stGa !== 'skel') stGa = 'skel'
                let resolvedGa = (mapped != null && mapped !== '')
                    ? mapped
                    : decadeUIAni.resolveSkelRuntimeVersion(filename, stGa, null, null)
                let dynamic = decadeUIAni.getAnimation(resolvedGa)

                if (dynamic.hasSpine(filename)) {
                    let actions = dynamic.getSpineActions(filename)
                    postMessage({
                        eventId: eventId,
                        actions: actions
                    })
                } else {
                    dynamic.loadSpine(filename, stGa, () => {
                        let actions = dynamic.getSpineActions(filename)
                        postMessage({
                            eventId: eventId,
                            actions: actions
                        })
                    }, () => {
                        postMessage({
                            error: true,
                            errMsg: 'error'
                        })
                    })
                }
            })()
            break
        case 'getSpineBounds':
            (() => {
                let filename = args[0]
                let type = args[1]
                let mappedGb = decadeUIAni.aniVersionMap[filename]
                let stGb = type != null && type !== '' ? String(type).toLowerCase() : decadeUIAni.resolveSkelFileTypeSync(filename)
                if (stGb !== 'json' && stGb !== 'skel') stGb = 'skel'
                let resolvedGb = (mappedGb != null && mappedGb !== '')
                    ? mappedGb
                    : decadeUIAni.resolveSkelRuntimeVersion(filename, stGb, null, null)
                let dynamic = decadeUIAni.getAnimation(resolvedGb)

                if (dynamic.hasSpine(filename)) {
                    let bounds = dynamic.getSpineBounds(filename)
                    postMessage({
                        eventId: eventId,
                        bounds: bounds
                    })
                } else {
                    dynamic.loadSpine(filename, stGb, () => {
                        let bounds = dynamic.getSpineBounds(filename)
                        postMessage({
                            eventId: eventId,
                            bounds: bounds
                        })
                    }, () => {
                        postMessage({
                            error: true,
                            errMsg: 'error'
                        })
                    })
                }
            })()
            break
    }
}

function loadResources(data) {
    const { players, skels } = data
    if (players) {
        for (let playerParams of players) {
            playerAnimation.preLoadPlayerSkel({ player: playerParams })
        }
        console.log('提前加载变身骨骼', players);
    }
    if (skels) {
        let am = playerAnimation.animationManager
        for (let skel of skels) {
            let skt = inferSkelTypeFromParams(am, skel.name, skel)
            let sv = am.resolveSkelRuntimeVersion(skel.name, skt, skel.version != null && skel.version !== '' ? skel.version : null, null)
            let dy = am.getAnimation(sv)
            if (skel.unpackPremultipliedAlpha != null) {
                dy.unpackPremultipliedAlpha = !!skel.unpackPremultipliedAlpha
            }
            if (skel.unpackPremultipliedAlpha === true) {
                ensureSpineUnpackReloadIfNeeded(dy, skel.name, true, skt)
            }
            if (!dy.hasSpine(skel.name)) {
                dy.loadSpine(skel.name, skt)
            }
        }
        console.log('提前加载变身特效', skels);
    }


}


onmessage = function (e) {
    let data = e.data
    switch (data.message) {
        case 'CREATE':
            createChuKuang(data)
            break
        case 'UPDATE':
            update(data)
            break
        case 'PRELOAD':
            preLoad(data)
            break
        case "isChuKuang":
            isChuKuang(data)
            break
        case "chukuangStart":
            chukuangStart(data)
            break
        case 'ADJUST':
            adjust(data)
            break
        case 'POSITION':
            position(data)
            break
        case 'PLAY_EFFECT':
            playEffect(data)
            break
        case 'PLAY_EFFECT2':
            playEffect2(data)
            break
        case 'PLAY_EFFECT3':
            playEffect3(data)
            break
        case 'PLAY_EFFECT4':
            playEffect4(data)
            break
        case 'PLAY_EFFECT5':
            weiweixiao(data)
            break
        case 'PLAY_EFFECT6':
            playEffect6(data)
            break
        case 'PLAY_EFFECT7':
            playEffect7(data)
            break
        case 'CLEAR_EFFECT':
            clearEffect(data)
            break
        case 'CLEAR_EFFECT2':
            clearEffect2(data)
            break
        case 'CLEAR_EFFECT3':
            clearEffect3(data)
            break
        case 'CLEAR_EFFECT4':
            clearEffect4(data)
            break
        case 'CLEAR_EFFECT5':
            clearEffect5(data)
            break
        case 'CLEAR_EFFECT6':
            clearEffect6(data)
            break
        case 'CLEAR_EFFECT7':
            clearEffect7(data)
            break
        case 'CLEAR_ALL_EFFECTS':
            clearAllEffects()
            break
        case 'CLEAR_ALL_EFFECTS2':
            clearAllEffects2()
            break
        case 'CLEAR_ALL_EFFECTS3':
            clearAllEffects3()
            break
        case 'CLEAR_ALL_EFFECTS4':
            clearAllEffects4()
            break
        case 'CLEAR_ALL_EFFECTS5':
            clearAllEffects5()
            break
        case 'CLEAR_ALL_EFFECTS6':
            clearAllEffects6()
            break
        case 'CLEAR_ALL_EFFECTS7':
            clearAllEffects7()
            break
        case 'STOP_EFFECT':
            stopEffect(data)
            break
        case 'STOP_EFFECT2':
            stopEffect2(data)
            break
        case 'STOP_EFFECT3':
            stopEffect3(data)
            break
        case 'STOP_EFFECT4':
            stopEffect4(data)
            break
        case 'STOP_EFFECT5':
            stopWeiweixiao(data)
            break
        case 'STOP_EFFECT6':
            stopEffect6(data)
            break
        case 'STOP_EFFECT7':
            stopEffect7(data)
            break
        case 'CREATE_DECADE_ANI':
            createDecadeAni(data)
            break
        case 'DECADE_ANI_FUNC':
            decadeAniFunc(data)
            break
        case 'LOAD_RESOURCES':
            loadResources(data)
            break
        case 'UPDATE_ELEMENT_BOUNDS':
            if (data.elementId !== undefined && htmlElementMap[data.elementId]) {
                htmlElementMap[data.elementId].updateBoundRect(data.boundRect)
            }
            break

    }

}