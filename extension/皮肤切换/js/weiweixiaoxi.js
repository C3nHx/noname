export function modifyDecadeUIContent(lib, skinSwitch) {
    function overrides(dest, src) {
        if (!src) return
        for (let key in src) {
            dest[key] = src[key];
        }
    }

    function getSkinInfo(newName) {
        if (!newName) return null
        let [key, skinName] = newName.split('/')
        let dskins = decadeUI.dynamicSkin
        return key && skinName && dskins[key] && dskins[key][skinName] ? dskins[key][skinName] : null
    }

    function handleTransform(player, isPrimary, effs, special, options = {}) {
        let { huanfuEffect, isOrigin, trans, transform, updateAudio = false, avatar } = options
        if (!transform && !trans) {
            transform = effs.transform
        }
        if (!transform && !trans) return null

        if (!trans) {
            if (Array.isArray(transform)) {
                transform = transform[0]
            }
            if (!transform || !(transform in special)) return null
            trans = special[transform]
        }

        if (!trans) return null

        let audio = trans.audio
        let dskins = decadeUI.dynamicSkin
        let effect = huanfuEffect || effs.effect

        if (trans.group && options.currentGroup && trans.group !== options.currentGroup) {
            console.log('势力不匹配，跳过变身:', {
                requiredGroup: trans.group,
                currentGroup: options.currentGroup
            });
            return null
        }

        let newName = trans.name
        if (newName) {
            let dInfo = getSkinInfo(newName)
            if (dInfo) {
                if (updateAudio) {
                    dInfo = Object.assign({}, dInfo)
                    dInfo.audio = trans.audio
                    dInfo._needUpdateAudio = true
                    if (avatar && avatar.audio) {
                        dInfo._originalAudio = avatar.audio
                    }
                }
                pfqhApplyTransform(player, isPrimary, dInfo, { huanfuEffect: effect, isOrigin, newName })
                if (updateAudio && trans.audio) {
                    setTimeout(() => {
                        skinSwitch.reloadAudioForSkin(player, isPrimary, trans.audio)
                    }, 1000)
                }
                return { audio, trans }
            } else {
                return null
            }
        } else {
            if (updateAudio) {
                trans = Object.assign({}, trans)
                trans._needUpdateAudio = true
            }
            pfqhApplyTransform(player, isPrimary, trans, { huanfuEffect: effect, isOrigin, newName })
            if (updateAudio && trans.audio) {
                setTimeout(() => {
                    skinSwitch.reloadAudioForSkin(player, isPrimary, trans.audio)
                }, 1000)
            }
            return { audio, trans }
        }
    }

    // 变身各机器本地执行只改本机显示: 技能content只在房主机跑, 客机靠原生同步方法在同一时机本机transformDst
    function pfqhApplyTransform(player, isPrimary, cfg, opts) {
        let newName = (opts && opts.newName) || (cfg && cfg.name)
        // 变身闪光特效
        let effect = opts && opts.huanfuEffect
        // 客机靠核心同步消息→checkTeshuAction在同一时机本机transformDst(仅改本机显示, 无需扩展广播)
        try {
            skinSwitch.dynamic.transformDst(player, isPrimary, cfg, { huanfuEffect: effect, isOrigin: opts && opts.isOrigin })
        } catch (e) {}
    }

    function handleEffectPlay(player, effs, special, audioRef) {
        let effectPlay = effs.play
        if (!effectPlay) return
        let eff = special[effectPlay]
        if (!eff) return

        if (!eff.x) eff.x = [0, 0.5]
        if (!eff.y) eff.y = [0, 0.5]
        setTimeout(() => {
            // ●原因【客机自触发】: 特效本机playEffect(按玩家node锚点)。
            try {
                if (player && player.node && player.node.getBoundingClientRect) {
                    skinSwitch.chukuangWorkerApi.playEffect(eff, { parent: player.node })
                } else {
                    skinSwitch.chukuangWorkerApi.playEffect(eff)
                }
            } catch (e) {}
        }, (eff.delay || 0) * 1000)

        if (!audioRef.audio && eff.audio) {
            audioRef.audio = eff.audio
        }
    }

    function playAudioSafe(audio, conditionAudio, path) {
        if (!audio) audio = conditionAudio
        if (audio) {
            let audioPath = path || skinSwitch.dcdPath || 'extension'
            let audioFolder = path === 'extension' ? '十周年UI' : ''
            game.playAudio('..', audioPath, audioFolder ? `${audioFolder}/assets/dynamic` : 'assets/dynamic', audio)
        }
    }

    const pfqhHelpers = {
        handleTransform,
        handleEffectPlay,
        playAudioSafe,
        getSkinInfo,
        // ●原因【客机自触发】: 变身闪光本机playEffect。
        playTransformFlash: function (player, effectName) {
            if (!effectName || typeof effectName !== 'string') return
            try {
                let sprite = {
                    name: `../../../皮肤切换/effects/${effectName}/${effectName}`,
                    version: '4.0'
                }
                if (player && player.node && player.node.getBoundingClientRect) {
                    skinSwitch.chukuangWorkerApi.playEffect(sprite, { parent: player.node })
                } else {
                    skinSwitch.chukuangWorkerApi.playEffect(sprite)
                }
            } catch (e) {}
        }
    }
    window.__pfqh_helpers = pfqhHelpers

    // 判断技能所属武将: 主将返回'primary', 副将返回'deputy', 第三方赋予(装备/手牌)返回null
    function getSkillOwnSide(player, skillName) {
        if (!player || !skillName) return null
        if (skillName.charAt(0) === '_') return null
        var match = function (cha) {
            if (!cha || !Array.isArray(cha[3])) return false
            if (cha[3].indexOf(skillName) !== -1) return true
            // 子技能/阶段技能: "xxx_yyy" 归属武将主动技能 "xxx" (与现有变身子技能判定一致)
            var idx = skillName.lastIndexOf('_')
            if (idx > 0 && cha[3].indexOf(skillName.slice(0, idx)) !== -1) return true
            return false
        }
        if (match(lib.character[player.name])) return 'primary'
        if (player.name2 && match(lib.character[player.name2])) return 'deputy'
        return null
    }

    skinSwitch.checkTeshuAction = function(player, skillName) {
        // 仅主将/副将自己武将牌上的技能才触发teshu, 否则跳过避免频繁播动作
        var side = getSkillOwnSide(player, skillName)
        if (!side) return
        // 目标那一侧的动皮
        var avatar = side === 'deputy'
            ? (player.dynamic.deputy && player.dynamic.deputy.player)
            : (player.dynamic.primary && player.dynamic.primary.player)
        if (!avatar) return
        var teshu = avatar.teshu
        if (teshu && typeof teshu === 'object' && teshu.whitelist) {
            if (!teshu.whitelist.includes(skillName)) return
        }
        // ●主副都播: 不再限定只播某一侧, 交由出框worker按 primary → deputy 依次播放
        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'TeShu')
    }

    let Player = {};
    // ●修复(2026-09-02): 客机端特效不再依赖主机传出/本机的"十周年UI"动态皮开关(extension_十周年UI_dynamicSkin);
    //   只要本机已启用千幻聆音(modern动皮引擎)即初始化全部特效(技能/logv拦截/出框), 否则房主关闭扩展后客机只剩待机动皮、无攻击等特效。
    if (lib.config[skinSwitch.decadeKey.dynamicSkin] || (skinSwitch.game_hasExtension && skinSwitch.game_hasExtension('千幻聆音'))) {
        if (self.OffscreenCanvas === undefined) {
            alert("您的设备环境不支持新版手杀动皮效果，请更换更好的设备或者不使用此版本的手杀动皮效果");
            return
        } else {
            // 技能
            lib.skill._tsx = {
                trigger: {
                    player: ["logSkillBegin", "useSkillBegin"],
                },
                silent: true,
                charlotte: true,
                forced: true,
                priority: 2022,
                filter(event, player) {
                    return player.dynamic
                },
                async content(event, trigger, player) {
                    let name = trigger.skill
                    if (game.phaseNumber > 0 || (game.phaseNumber === 0 && event.player && event.player.isAlive())) {
                        if (name.indexOf("_") !== 0 && skinSwitch.filterSkills.indexOf(name) === -1 || event.player.skills.indexOf(name) !== -1) {
                            if (event.player.isAlive() && event.player.dynamic.primary && !event.player.GongJi) {
                                skinSwitch.checkTeshuAction(event.player, name)
                            }
                            let skillInfo = get.info(name)
                            if (skillInfo) {
                                let h = window.__pfqh_helpers || pfqhHelpers
                                let specailEvent = (player, triggerName) => {
                                    let res = skinSwitch.dynamic.getSpecial(player, triggerName)
                                    res.forEach(r => {
                                        const { avatar, special, effs, isPrimary } = r
                                        let pName = isPrimary ? player.name : player.name2
                                        let cha = lib.character[pName]
                                        if (!cha || !cha[3]) return
                                        if (!cha[3].includes(name)) {
                                            if (!cha[3].includes(name.slice(0, name.lastIndexOf('_'))))
                                                return
                                        }
                                        let audioRef = { audio: null }
                                        let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                                            huanfuEffect: effs.effect
                                        })
                                        if (transformResult) {
                                            audioRef.audio = transformResult.audio
                                        }
                                        h.handleEffectPlay(player, special.condition[triggerName], special, audioRef)
                                        h.playAudioSafe(audioRef.audio, special.condition[triggerName].audio, 'extension')
                                    })
                                }
                                let res = skinSwitch.dynamic.getSpecial(event.player, name)
                                res.forEach(r => {
                                    let { avatar, isPrimary } = r
                                    let special = avatar.special
                                    if (!special) return;
                                    let effs = special.condition[name]
                                    let audioRef = { audio: null }
                                    let h = window.__pfqh_helpers || pfqhHelpers
                                    let transformResult = h.handleTransform(event.player, isPrimary, effs, special, {
                                        huanfuEffect: effs.effect
                                    })
                                    if (transformResult && transformResult.trans) {
                                        if (transformResult.trans.name) {
                                            let dInfo = h.getSkinInfo(transformResult.trans.name)
                                            if (dInfo) {
                                                dInfo.audio = transformResult.trans.audio
                                            }
                                        }
                                        audioRef.audio = transformResult.audio
                                    }
                                    h.handleEffectPlay(event.player, effs, special, audioRef)
                                })
                                if (skillInfo.juexingji) {
                                    specailEvent(event.player, 'juexingji')
                                }
                                if (skillInfo.limited) {
                                    specailEvent(event.player, 'xiandingji')
                                }
                                // 检查使命技
                                if (name.endsWith('_fail')) {
                                    let parentSkill = name.slice(0, name.length - 5)
                                    let parentSkillInfo = get.info(parentSkill)
                                    if (parentSkillInfo && parentSkillInfo.dutySkill) {
                                        specailEvent(event.player, 'shimingjiFail')
                                    }
                                } else if (name.endsWith('_achieve')) {
                                    let parentSkill = name.slice(0, name.length - 8)
                                    let parentSkillInfo = get.info(parentSkill)
                                    if (parentSkillInfo && parentSkillInfo.dutySkill) {
                                        specailEvent(event.player, 'shimingjiSuccess')
                                    }
                                }

                            }

                        }
                    }
                }
            }
            if (lib.element && lib.element.player && lib.element.player.$changeZhuanhuanji) {
                var originchangeZhuanhuanji = lib.element.player.$changeZhuanhuanji;
                lib.element.player.$changeZhuanhuanji = function (skill) {
                    originchangeZhuanhuanji.apply(this, arguments);
                    if (!get.is.zhuanhuanji(skill, this)) return;
                    if (!this.dynamic) return;
                    let res = skinSwitch.dynamic.getSpecial(this, 'zhuanhuanji')
                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r
                        let pName = isPrimary ? this.name : this.name2
                        let cha = lib.character[pName]
                        if (!cha || !cha[3] || !cha[3].includes(skill)) {
                            return
                        }
                        let mark = this.node.xSkillMarks.querySelector('[data-id="' + skill + '"]')
                        if (!mark) return
                        let isYin = mark.classList.contains("yin")
                        let transform = effs.transform
                        if (!transform) return
                        const originSkin = isPrimary ? this.originSkin : this.originSkin2
                        if (!originSkin) return
                        let h = window.__pfqh_helpers || pfqhHelpers
                        let audioRef = { audio: null }
                        setTimeout(() => {
                            if (isYin) {
                                skinSwitch.dynamic.transformDst(this, isPrimary, originSkin, { huanfuEffect: effs.effect, isOrigin: true })
                            } else {
                                let transformResult = h.handleTransform(this, isPrimary, effs, special, {
                                    huanfuEffect: effs.effect,
                                    transform
                                })
                                if (transformResult) {
                                    audioRef.audio = transformResult.audio
                                }
                            }
                        }, 50)
                        h.handleEffectPlay(this, special.condition.zhuanhuanji, special, audioRef)
                        h.playAudioSafe(audioRef.audio, special.condition.zhuanhuanji.audio)
                    })
                };
            }
            // 客机事件不派发, 靠广播 game.logv(player/card/targets) 识别出牌/技能/die自触发; 仅留转发壳, 逻辑在本机 __pfqh_logvTrigger
            if (skinSwitch && !skinSwitch.__logvHooked) {
                skinSwitch.__logvHooked = true
                // 本地特效触发逻辑(仅客机运行, 本机注册, 不会被广播重建)
                window.__pfqh_logvTrigger = function (player, card, targets) {
                    try {
                        if (game.servermode) return   // 房主已由自身事件播放, 跳过
                        if (!_status.connectMode) return
                        var ss = window.skinSwitch
                        if (!ss || !ss.chukuangWorkerApi) return
                        // ●修复(2026-09-02): 主机无本扩展时, 广播里经 parsedResult 重建的"玩家快照"不带 .dynamic(客机动皮由客机本地千幻建在*实时玩家*对象上)。
                        //   原逻辑直接判 player.dynamic 是"依赖主机提供动皮", 此场景必miss → 攻击/技能/无懈/击杀全无。
                        //   这里把快照映射回客机本地实时玩家(live object, 本地已有dynamic)再走特效, 找不到时保守回退原对象。
                        var _resolveLive = function (p) {
                            if (!p || !game || !game.players) return p
                            var live = null
                            if (p.playerid) {
                                live = (game.players || []).concat(game.dead || []).find(function (x) { return x && x.playerid === p.playerid })
                            }
                            if (!live && p.name) {
                                live = (game.players || []).concat(game.dead || []).find(function (x) { return x && x.name === p.name && x.name1 === p.name1 })
                            }
                            return live || p
                        }
                        player = _resolveLive(player)
                        if (Array.isArray(targets)) targets = targets.map(_resolveLive)
                        else if (targets) targets = _resolveLive(targets)
                        // die: player 是被杀者, targets 才是击杀者; 击杀者无dynamic仍需继续执行否则动画永不出
                        if (card === 'die') {
                            // 仅当击杀者存在且带动态时才继续, 否则直接跳过
                            var _k0 = (Array.isArray(targets) && targets[0]) || targets
                            if (!_k0 || !_k0.dynamic) return
                        } else if (!player || !player.dynamic) {
                            return
                        }
                        var fxRecent = function (p) { if (!p) return true; p.__ssfxF = p.__ssfxF || 0; return Date.now() - p.__ssfxF < 400 }
                        var fxMark = function (p) { if (p) p.__ssfxF = Date.now() }
                        if (typeof card === 'string') {
                            // ●修复(2026-09-01): 联机主机也开本扩展时, 客机收到的杀被序列化为攻击字符串(_gj/攻击), 而非[杀卡]数组; 原数组分支永远miss → 客机无攻击特效
                            //   这里把攻击字符串也映射成 GongJi(尾触发防抖), 与下方数组分支同一套播放逻辑
                            if (card === 'sha' || /^_?gj$/i.test(card) || /gongji|攻击|gongjitoo/i.test(card)) {
                                var _ss2 = window.skinSwitch
                                if (player && player.dynamic) {
                                    clearTimeout(player.__ssfxTimer)
                                    player.__ssfxTimer = setTimeout(function () {
                                        try { _ss2.chukuangWorkerApi.chukuangAction(player, 'GongJi', {}) } catch (e) {}
                                    }, 60)
                                }
                            } else if (card === 'die') {
                                // ●变身击杀同样可能连续触发多次logv, 用尾触发防抖统一为最后一次执行
                                clearTimeout(player.__ssfxTimer)
                                player.__ssfxTimer = setTimeout(function () {
                                    var killer = (Array.isArray(targets) && targets[0]) || targets
                                    var h = window.__pfqh_helpers
                                    if (killer && killer.dynamic && killer !== player && ss.dynamic && h) {
                                        var res = ss.dynamic.getSpecial(killer, 'jisha')
                                        ;(Array.isArray(res) ? res : []).forEach(function (rr) {
                                            var special = rr.special, effs = rr.effs, isPrimary = rr.isPrimary, avatar = rr.avatar
                                            if (!special || !effs) return
                                            var audioRef = { audio: null }
                                            var tr = h.handleTransform(killer, isPrimary, effs, special, { huanfuEffect: effs.effect, updateAudio: true, avatar })
                                            if (tr) audioRef.audio = tr.audio
                                            h.handleEffectPlay(killer, effs, special, audioRef)
                                            if (special.condition && special.condition.jisha && special.condition.jisha.audio) h.playAudioSafe(audioRef.audio, special.condition.jisha.audio)
                                        })
                                    }
                                }, 60)
                            } else if (lib && lib.skill && lib.skill[card] && ss.checkTeshuAction) {
                                // 仅真实注册技能触发, 用法相同尾触发防抖; 客机不跑useSkill事件, 在此模拟技能标签换形
                                clearTimeout(player.__ssfxTimer)
                                player.__ssfxTimer = setTimeout(function () {
                                    try { ss.checkTeshuAction(player, card) } catch (e) {}
                                    try {
                                        var h = window.__pfqh_helpers
                                        if (!h || !ss.dynamic || !ss.dynamic.getSpecial) return
                                        var specailEvent = function (target, triggerName) {
                                            var res = ss.dynamic.getSpecial(target, triggerName)
                                            res.forEach(function (r) {
                                                var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                                if (!special || !effs) return
                                                var audioRef = { audio: null }
                                                var tr = h.handleTransform(target, isPrimary, effs, special, { huanfuEffect: effs.effect })
                                                if (tr) audioRef.audio = tr.audio
                                                h.handleEffectPlay(target, effs, special, audioRef)
                                                if (effs.audio) h.playAudioSafe(audioRef.audio, effs.audio, 'extension')
                                            })
                                        }
                                        var skillInfo = (typeof get !== 'undefined' && get.info) ? get.info(card) : null
                                        // ●【客机变身·技能名条件】与单机_tsx一致: 该技能名本身也可能作为 condition 键(如 special.condition.<技能名>), 一并触发。
                                        specailEvent(player, card)
                                        if (skillInfo) {
                                            if (skillInfo.juexingji) specailEvent(player, 'juexingji')
                                            if (skillInfo.limited) specailEvent(player, 'xiandingji')
                                            if (card.indexOf('_fail') > 0) {
                                                var _ps = card.slice(0, card.lastIndexOf('_')), _psi = get.info(_ps)
                                                if (_psi && _psi.dutySkill) specailEvent(player, 'shimingjiFail')
                                            } else if (card.indexOf('_achieve') > 0) {
                                                var _ps2 = card.slice(0, card.lastIndexOf('_')), _psi2 = get.info(_ps2)
                                                if (_psi2 && _psi2.dutySkill) specailEvent(player, 'shimingjiSuccess')
                                            }
                                        }
                                    } catch (e) {}
                                }, 80)
                            }
                        } else if (Array.isArray(card) && card[0] && card[0].name) {
                            var c = card[0]
                            if (c.name === 'huogong') return
                            var t = null, dmg = 0
                            try { t = get.type(c) } catch (e) {}
                            try { dmg = get.tag(c, 'damage') || 0 } catch (e) {}
                            // ●实测(2026-08-30): 重建后的杀牌 get.tag(c,'damage') 读到0, 故用 c.name==='sha' 直接判攻击; 伤害锦囊也纳入
                            if (c.name === 'sha' || ((t === 'basic' || t === 'trick') && dmg > 0)) {
                                // 同次出杀会连发多条logv, 用60ms尾触发防抖只播最后一次
                                clearTimeout(player.__ssfxTimer)
                                player.__ssfxTimer = setTimeout(function () {
                                    try { ss.chukuangWorkerApi.chukuangAction(player, 'GongJi', {}) } catch (e) {}
                                }, 60)
                            } else if (c.name === 'wuxie') {
                                // hudong互动特效客机触发: 从logv识别"无懈", 先查玩家有无hudong再播放(替代原getHistory轮询)
                                var _hasHu = !!(player.dynamic && player.dynamic.primary && player.dynamic.primary.player && player.dynamic.primary.player.hudong)
                                    || !!(player.dynamic && player.dynamic.deputy && player.dynamic.deputy.player && player.dynamic.deputy.player.hudong)
                                if (_hasHu) {
                                    clearTimeout(player.__ssfxHuTimer)
                                    player.__ssfxHuTimer = setTimeout(function () {
                                        try {
                                            if (player.dynamic.primary && player.dynamic.primary.player.hudong) {
                                                ss.chukuangWorkerApi.chukuangAction(player, 'HuDong')
                                            } else if (player.dynamic.deputy && player.dynamic.deputy.player.hudong) {
                                                ss.chukuangWorkerApi.chukuangAction(player, 'HuDong', null, 'fu')
                                            }
                                        } catch (e) {}
                                    }, 60)
                                }
                            }
                            // ●其余(闪/装备/无伤害锦囊等)静默跳过
                        }
                    } catch (e) {}
                }
                // 客机自己出杀时本地执行logv不回发自己, ws钩子漏掉, 故本地再包一层game.logv补抓(轮询防重建覆盖)
                // ●修复(2026-09-01): 联机主机也开本扩展时, game.logv 被包裹后再经基础logv的 game.broadcast(game.logv,...) 广播给客机,
                //   广播体源码变成包裹体(不含 'game.logv(' / 'node.node={}' 标记), 客机下方 ws 钩子识别不到 → 攻击特效只在主机播放。
                //   解决: 主机(servermode=true)不包裹且保持基础版; 若在servermode就绪前误包, 由轮询回滚为基础版, 使广播体恒为基础源码。
                ;(function () {
                    var _wrapOnce = function () {
                        try {
                            if (!game || typeof game.logv !== 'function') return false
                            if (game.servermode === true) {
                                // 主机: 若此前(servermode未就绪)被误包, 回滚为基础版
                                if (game.logv.__pfqhLvWrapped && game.logv.__pfqhLvBase) {
                                    game.logv = game.logv.__pfqhLvBase
                                    try { delete game.logv.__pfqhLvBase } catch (e) {}
                                    try { delete game.logv.__pfqhLvWrapped } catch (e) {}
                                }
                                return true
                            }
                            if (game.logv.__pfqhLvWrapped) return true
                            // ●维护全局基础版引用(主机/客机都执行这段, 但主机在下方branch直接return true不包裹): 
                            //   供包裹函数源码被序列化/重建后仍能取到真实基础版, 且随引擎重建刷新不取到过期空壳
                            try {
                                var _pb = game.logv
                                if (typeof _pb === 'function' && !_pb.__pfqhLvWrapped) window.__pfqhLogvBase = _pb
                            } catch (e) {}
                            if (game.servermode === true) {
                                // 主机: 若此前(servermode未就绪)被误包, 回滚为基础版
                                if (game.logv.__pfqhLvWrapped && game.logv.__pfqhLvBase) {
                                    game.logv = game.logv.__pfqhLvBase
                                    try { delete game.logv.__pfqhLvBase } catch (e) {}
                                    try { delete game.logv.__pfqhLvWrapped } catch (e) {}
                                }
                                return true
                            }
                            if (game.logv.__pfqhLvWrapped) return true
                            var _origLogv = game.logv
                            game.logv = function (player, card, targets, event, forced, logvid) {
                                try {
                                    if (!game || !game.servermode) {
                                        if (_status && _status.connectMode && window.__pfqh_logvTrigger) {
                                            window.__pfqh_logvTrigger(player, card, targets)
                                        }
                                    }
                                } catch (e) {}
                                // ●修复(_origLogv is not defined): 引擎的 game.broadcast(game.logv,...) 会把 game.logv 的函数源码序列化,
                                //   对面收到后再用 eval 重建并调用; eval 作用域只注入 _status/ai/lib/game/ui/get, 不含本(extension)闭包里的
                                //   _origLogv → ReferenceError, 客机频繁报错。改用 typeof 安全探测闭包原始引用(未定义时 typeof 不抛错),
                                //   被重建时回退到各端自己维护的全局 window.__pfqhLogvBase, 不抛错且日志不丢。
                                var _f = null
                                if (typeof _origLogv === 'function') _f = _origLogv
                                else if (window && window.__pfqhLogvBase && typeof window.__pfqhLogvBase === 'function') _f = window.__pfqhLogvBase
                                if (_f) return _f.apply(this, arguments)
                                return undefined
                            }
                            try { game.logv.__pfqhLvWrapped = true } catch (e) {}
                            // 记录基础版引用, 供主机误包后回滚
                            try { game.logv.__pfqhLvBase = _origLogv } catch (e) {}
                            return true
                        } catch (e) { return false }
                    }
                    if (!_wrapOnce()) {
                        var _iv = setInterval(function () { try { if (_wrapOnce()) clearInterval(_iv) } catch (e) {} }, 400)
                    }
                    setInterval(function () { try { if (game && typeof game.logv === 'function' && !game.logv.__pfqhLvWrapped) _wrapOnce() } catch (e) {} }, 600)
                })()
                // 更底层保证命中的客机拦截: logv可能被重建为空函数(实测exec命中但logv识别不中), 改拦截 ws 原始分发
                //   lib.element.ws.onmessage, 在重建前读原始JSON识别exec中的logv特征, 不受重建影响
                // ●时序: 该 onmessage 在 precontent 可能非函数, 用轮询直到可用再包, 必须在连房前完成
                ;(function () {
                    var _installWsHook = function () {
                        try {
                            if (!lib || !lib.element || !lib.element.ws) return false
                            if (typeof lib.element.ws.onmessage !== 'function') return false
                            if (lib.element.ws.__pfqhMsgWrapped) return true
                            lib.element.ws.__pfqhMsgWrapped = true
                            var _origOnMsg = lib.element.ws.onmessage
                            lib.element.ws.onmessage = function (ev) {
                                    var _hitHpSync = false
                                    var _isExec = false
                                    try {
                                        if (game && !game.servermode) {
                                            var d = ev && ev.data
                                            if (typeof d === 'string') {
                                                var parsed = JSON.parse(d)
                                                if (Array.isArray(parsed) && parsed[0] === 'exec' && typeof parsed[1] === 'string' && parsed[1].indexOf('_noname_func:') === 0) {
                                                    _isExec = true
                                                    var src = parsed[1].slice(13)
                                                    // ●修复(2026-09-02): 主机广播的 game.logv 在序列化后可能不包含原版特征(game.logv(/node.node={})。
                                                    //   实测主机出杀时广播的签名是 "function(player,card,targets,event2,forced,logvid)"，
                                                    //   改用函数签名匹配确保稳认。
                                                    var _mark = (src.indexOf('game.logv(') >= 0 || src.indexOf('node.node={}') >= 0 || /function\s*\(\s*player\s*,\s*card\s*,\s*targets/.test(src))
                                                    if (window.__pfqh_logvTrigger && _mark) {
                                                        var player = null, card = null, targets = null
                                                        try {
                                                            player = get.parsedResult(parsed[2])
                                                            card = get.parsedResult(parsed[3])
                                                            targets = (parsed.length > 4) ? get.parsedResult(parsed[4]) : null
                                                        } catch (e) { return }
                                                        window.__pfqh_logvTrigger(player, card, targets)
                                                    }
                                                    // 即时血量同步识别: player.update 广播后按新血量比对触发变身
                                                    if (window.__pfqh_tickHp) _hitHpSync = true
                                                }
                                            }
                                        }
                                    } catch (e) {}
                                    var _ret = _origOnMsg.apply(this, arguments)
                                    if (_hitHpSync && _isExec) {
                                        try { window.__pfqh_tickHp() } catch (e) {}
                                    }
                                    return _ret
                                }
                            // game.ws 若已生成并持有旧引用, 补指向一次
                            try { if (game && game.ws && typeof game.ws.onmessage === 'function' && game.ws.onmessage !== lib.element.ws.onmessage) game.ws.onmessage = lib.element.ws.onmessage } catch (e) {}
                            return true
                        } catch (e) { return false }
                    }
                    if (!_installWsHook()) {
                        var _iv = setInterval(function () { try { if (_installWsHook()) clearInterval(_iv) } catch (e) {} }, 200)
                    }
                })()
                // 客机不跑血量/回合事件, 但房主改HP/换阶段会同步广播, 客机据此比对hp/phaseNumber自触发变身
                if (skinSwitch && !skinSwitch.__pfqhStateHooked) {
                    skinSwitch.__pfqhStateHooked = true
                    // playerid -> { hp, phaseNum, dmgTimes, infDmg, lastActor, claimed }
                    var _stPlayers = {}
                    var _stCurPhase = null
                    // 血量恢复时还原低血量变身(带 recover 的皮), 与 _evalLowhp 共用同一选档规则
                    var _evalLowhpRestore = function (p) {
                        try {
                            var ss = window.skinSwitch
                            var h = window.__pfqh_helpers
                            if (!ss || !h || !ss.dynamic || !p) return
                            var res = ss.dynamic.getSpecial(p, 'lowhp')
                            res.forEach(function (r) {
                                var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                if (!special || !effs) return
                                if (!effs.recover) return // 无 recover: 恢复血量不自动还原
                                var lowhpTransform = effs.transform
                                if (!lowhpTransform || lowhpTransform.length === 0) return
                                var originSkin = isPrimary ? (p.originSkin || avatar.player) : (p.originSkin2 || avatar.player)
                                var transList = [], transforms = Array.isArray(lowhpTransform) ? lowhpTransform : [lowhpTransform]
                                for (var i = 0; i < transforms.length; i++) {
                                    var set = special[transforms[i]]
                                    if (set && set.hp) transList.push(set)
                                }
                                transList.sort(function (a, b) { return a.hp - b.hp })
                                var idx = -1
                                for (var j = 0; j < transList.length; j++) { if (p.hp <= transList[j].hp) { idx = j; break } }
                                var current = isPrimary ? p.dynamic.primary : p.dynamic.deputy
                                var audioRef = { audio: null }
                                if (idx === -1) {
                                    if (current && current.name === originSkin.name) return // 已在原皮
                                    if (!originSkin.skin) originSkin = Object.assign({}, originSkin, { skin: 'default' })
                                    ss.dynamic.transformDst(p, isPrimary, originSkin, { huanfuEffect: effs.effect, isOrigin: true })
                                    return
                                }
                                if (!current || transList[idx].name === current.name) return // 已是目标形态
                                var trans = transList[idx]
                                var tr = h.handleTransform(p, isPrimary, effs, special, { huanfuEffect: effs.effect, trans: trans, updateAudio: true, avatar: avatar })
                                if (tr) audioRef.audio = tr.audio
                                var dInfo = h.getSkinInfo(trans.name)
                                if (dInfo && dInfo.name !== (current && current.name)) {
                                    h.handleEffectPlay(p, special.condition.lowhp, special, audioRef)
                                    h.playAudioSafe(audioRef.audio, special.condition.lowhp && special.condition.lowhp.audio, 'extension')
                                }
                            })
                        } catch (e) {}
                    }
                    var _onHpUp = function (p) {
                        try { _evalLowhpRestore(p) } catch (e) {}
                    }
                    // ●处理某玩家血量降低(记一次"受到伤害"事件): 触发 lowhp / damage / damageTimes
                    var _onHpDown = function (p) {
                        try {
                            var ss = window.skinSwitch
                            var h = window.__pfqh_helpers
                            if (!ss || !h || !ss.dynamic || !p || !p.dynamic) return
                            var s = _stPlayers[p.playerid] || (_stPlayers[p.playerid] = {})
                            // 计数受到伤害次数 (damageTimes)
                            s.dmgTimes = (s.dmgTimes || 0) + 1
                            // 受伤害总次数用于 damageTimes 阈值
                            var _evalDamageTimes = function () {
                                var res = ss.dynamic.getSpecial(p, 'damageTimes')
                                res.forEach(function (r) {
                                    var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                    if (!special || !effs) return
                                    var key = (isPrimary ? '__pfqh_dtP' : '__pfqh_dtD') + s.dmgTimes
                                    if (p[key]) return
                                    p[key] = true
                                    var transList = [], transforms = effs.transform || []
                                    if (typeof transforms === 'string') transforms = [transforms]
                                    for (var i = 0; i < transforms.length; i++) {
                                        var set = special[transforms[i]]
                                        if (set && set.times && set.times === s.dmgTimes) transList.push(set)
                                    }
                                    if (!transList.length) return
                                    var audioRef = { audio: null }
                                    var tr = h.handleTransform(p, isPrimary, effs, special, { huanfuEffect: effs.effect, trans: transList[0], updateAudio: true, avatar: avatar })
                                    if (tr) audioRef.audio = tr.audio
                                    h.handleEffectPlay(p, effs, special, audioRef)
                                    h.playAudioSafe(audioRef.audio, special.condition.damageTimes && special.condition.damageTimes.audio, 'extension')
                                })
                            }
                            // 受到一次伤害立即变身 (damage), 每人只限一次且维持不还原
                            var _evalDamage = function () {
                                var res = ss.dynamic.getSpecial(p, 'damage')
                                res.forEach(function (r) {
                                    var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                    if (!special || !effs) return
                                    var key = isPrimary ? 'damagePrimaryTransform' : 'damageDeputyTransform'
                                    if (p[key]) return
                                    p[key] = true
                                    var audioRef = { audio: null }
                                    var tr = h.handleTransform(p, isPrimary, effs, special, { huanfuEffect: effs.effect, updateAudio: true, avatar: avatar })
                                    if (tr) audioRef.audio = tr.audio
                                    h.handleEffectPlay(p, effs, special, audioRef)
                                    h.playAudioSafe(audioRef.audio, special.condition.damage && special.condition.damage.audio, 'extension')
                                })
                            }
                            // 低血量变身: 取新低血量, 落到对应血线区间
                            var _evalLowhp = function () {
                                var res = ss.dynamic.getSpecial(p, 'lowhp')
                                res.forEach(function (r) {
                                    var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                    if (!special || !effs) return
                                    if (isPrimary) {
                                        if (p._primaryLowestHp == null) p._primaryLowestHp = p.hp + 1000
                                    } else {
                                        if (p._deputyLowestHp == null) p._deputyLowestHp = p.hp + 1000
                                    }
                                    var prevLow = isPrimary ? p._primaryLowestHp : p._deputyLowestHp
                                    if (!effs.recover && p.hp >= prevLow) return
                                    if (isPrimary) {
                                        p._primaryLowestHp = p.hp
                                    } else {
                                        p._deputyLowestHp = p.hp
                                    }
                                    var lowhpTransform = effs.transform
                                    if (!lowhpTransform || lowhpTransform.length === 0) return
                                    var originSkin = isPrimary ? (p.originSkin || avatar.player) : (p.originSkin2 || avatar.player)
                                    var transList = [], transforms = Array.isArray(lowhpTransform) ? lowhpTransform : [lowhpTransform]
                                    for (var i = 0; i < transforms.length; i++) {
                                        var set = special[transforms[i]]
                                        if (set && set.hp) transList.push(set)
                                    }
                                    transList.sort(function (a, b) { return a.hp - b.hp })
                                    var idx = -1
                                    for (var j = 0; j < transList.length; j++) { if (p.hp <= transList[j].hp) { idx = j; break } }
                                    var current = isPrimary ? p.dynamic.primary : p.dynamic.deputy
                                    var audioRef = { audio: null }
                                    if (idx === -1) {
                                        if (!originSkin.skin) originSkin = Object.assign({}, originSkin, { skin: 'default' })
                                        ss.dynamic.transformDst(p, isPrimary, originSkin, { huanfuEffect: effs.effect, isOrigin: true })
                                        return
                                    }
                                    var trans = transList[idx]
                                    var tr = h.handleTransform(p, isPrimary, effs, special, { huanfuEffect: effs.effect, trans: trans, updateAudio: true, avatar: avatar })
                                    if (tr) audioRef.audio = tr.audio
                                    var dInfo = h.getSkinInfo(trans.name)
                                    if (dInfo && dInfo.name !== (current && current.name)) {
                                        h.handleEffectPlay(p, special.condition.lowhp, special, audioRef)
                                        h.playAudioSafe(audioRef.audio, special.condition.lowhp && special.condition.lowhp.audio, 'extension')
                                    }
                                })
                            }
                            _evalDamage()
                            _evalDamageTimes()
                            _evalLowhp()
                        } catch (e) {}
                    }
                    // 累计造成伤害(inflictDamage): 客机不知伤害来源, 用"当前回合玩家且非扣血者"近似归属
                    var _onInflict = function (victim) {
                        try {
                            var ss = window.skinSwitch
                            var h = window.__pfqh_helpers
                            if (!ss || !h || !ss.dynamic || !victim || !victim.dynamic) return
                            if (!_stCurPhase || _stCurPhase === victim || !_stCurPhase.isAlive()) return
                            var p = _stCurPhase
                            if (!p.dynamic) return
                            var res = ss.dynamic.getSpecial(p, 'inflictDamage')
                            if (!res || !res.length) return
                            var s = _stPlayers[p.playerid] || (_stPlayers[p.playerid] = {})
                            s.infDmg = (s.infDmg || 0) + 1
                            res.forEach(function (r) {
                                var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                if (!special || !effs) return
                                var transforms = effs.transform
                                if (typeof transforms === 'string') transforms = [transforms]
                                transforms = transforms || []
                                var transList = []
                                for (var i = 0; i < transforms.length; i++) {
                                    var set = special[transforms[i]]
                                    if (set && set.damage) transList.push(set)
                                }
                                transList.sort(function (a, b) { return a.damage - b.damage })
                                var idx = -1
                                for (var j = transList.length - 1; j >= 0; j--) {
                                    if (s.infDmg >= transList[j].damage) {
                                        var key = isPrimary ? '__inflict_damage_transformed_' : '__inflict_damage_transformed2_'
                                        if (!p[key + transList[j].damage]) { p[key + transList[j].damage] = true; idx = j; break }
                                    }
                                }
                                if (idx !== -1) {
                                    var trans = transList[idx], audioRef = { audio: null }
                                    var tr = h.handleTransform(p, isPrimary, effs, special, { huanfuEffect: effs.effect, trans: trans, updateAudio: true, avatar: avatar })
                                    if (tr) audioRef.audio = tr.audio
                                    var dInfo = h.getSkinInfo(trans.name)
                                    if (dInfo && dInfo.name !== avatar.name) {
                                        h.handleEffectPlay(p, effs, special, audioRef)
                                        h.playAudioSafe(audioRef.audio, special.condition.inflictDamage && special.condition.inflictDamage.audio, 'extension')
                                    }
                                }
                            })
                        } catch (e) {}
                    }

                    // ●处理阶段/回合变化: phaseBegin / phaseEnd / roundCount
                    var _onPhase = function () {
                        try {
                            var ss = window.skinSwitch
                            var h = window.__pfqh_helpers
                            if (!ss || !h || !ss.dynamic) return
                            var cur = _status.currentPhase
                            if (!cur) return
                            if (cur !== _stCurPhase) {
                                var prev = _stCurPhase
                                _stCurPhase = cur
                                // phaseEnd
                                if (prev && prev !== cur && prev.dynamic) {
                                    var resPE = ss.dynamic.getSpecial(prev, 'phaseEnd')
                                    resPE.forEach(function (r) {
                                        var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                        if (!special || !effs) return
                                        var audio = null
                                        var tryT = function () {
                                            var transform = effs.transform
                                            if (!transform || !(transform in special)) return
                                            var trans = special[transform]
                                            var newName = trans.name
                                            if (newName) {
                                                var dInfo = h.getSkinInfo(newName)
                                                if (dInfo) ss.dynamic.transformDst(prev, isPrimary, dInfo, { huanfuEffect: effs.effect })
                                            } else {
                                                ss.dynamic.transformDst(prev, isPrimary, trans, { huanfuEffect: effs.effect })
                                            }
                                            audio = trans.audio
                                        }
                                        var tryEff = function () {
                                            var effectPlay = effs.play
                                            if (effectPlay) {
                                                var eff = special[effectPlay]
                                                if (eff) {
                                                    if (!eff.x) eff.x = [0, 0.5]
                                                    if (!eff.y) eff.y = [0, 0.5]
                                                    setTimeout(function () {
                                                        try {
                                                            if (prev && prev.node && prev.node.getBoundingClientRect) {
                                                                ss.chukuangWorkerApi.playEffect(eff, { parent: prev.node })
                                                            } else {
                                                                ss.chukuangWorkerApi.playEffect(eff)
                                                            }
                                                        } catch (e) {}
                                                    }, (eff.delay || 0) * 1000)
                                                    if (!audio) audio = eff.audio
                                                }
                                            }
                                        }
                                        tryT(); tryEff()
                                        if (!audio) audio = special.condition.phaseEnd && special.condition.phaseEnd.audio
                                        if (audio) h.playAudioSafe(audio, special.condition.phaseEnd && special.condition.phaseEnd.audio)
                                    })
                                }
                                // phaseBegin
                                if (cur.dynamic) {
                                    // 客机回合开始播chuchang: 不派发phaseBegin事件, 用同步的currentPhase+phaseNumber识别新回合播一次
                                    var cs = _stPlayers[cur.playerid] || (_stPlayers[cur.playerid] = {})
                                    var _first = cs.chuSeen == null
                                    var _next = cs.chuNum != null && cur.phaseNumber !== cs.chuNum && cur.phaseNumber > 0
                                    cs.chuNum = cur.phaseNumber
                                    cs.chuSeen = true
                                    // 与 _checkDcdChuChang 技能共享 __ssChuChangTurn 去重: 任一路径先播, 本回合另一路径跳过
                                    if ((_first || _next) && !cs.chuTurnLock && cur.__ssChuChangTurn !== cur.phaseNumber) {
                                        cur.__ssChuChangTurn = cur.phaseNumber
                                        cs.chuTurnLock = true
                                        setTimeout(function () { try { if (cs) cs.chuTurnLock = false } catch (e) {} }, 400)
                                        try {
                                            var hc = !!(cur.dynamic.primary && cur.dynamic.primary.player && cur.dynamic.primary.player.chuchang)
                                                || !!(cur.dynamic.deputy && cur.dynamic.deputy.player && cur.dynamic.deputy.player.chuchang)
                                            if (hc && window.skinSwitch && skinSwitch.chukuangWorkerApi) {
                                                skinSwitch.chukuangWorkerApi.chukuangAction(cur, 'chuchang')
                                            }
                                        } catch (e) {}
                                    }
                                    var resPB = ss.dynamic.getSpecial(cur, 'phaseBegin')
                                    resPB.forEach(function (r) {
                                        var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                        if (!special || !effs) return
                                        var audioRef = { audio: null }
                                        var tr = h.handleTransform(cur, isPrimary, effs, special, { huanfuEffect: effs.effect })
                                        if (tr) audioRef.audio = tr.audio
                                        h.handleEffectPlay(cur, effs, special, audioRef)
                                        h.playAudioSafe(audioRef.audio, special.condition.phaseBegin && special.condition.phaseBegin.audio)
                                    })
                                }
                            }
                            // roundCount: 回合计数变身(阶段到某玩家时, 比较其自身回合数)
                            if (cur.dynamic) {
                                var rSt = _stPlayers[cur.playerid] || (_stPlayers[cur.playerid] = {})
                                if (rSt.phaseNum !== undefined && cur.phaseNumber !== rSt.phaseNum && cur.phaseNumber > 0) {
                                    var resRC = ss.dynamic.getSpecial(cur, 'roundCount')
                                    resRC.forEach(function (r) {
                                        var avatar = r.avatar, special = r.special || (avatar && avatar.special), effs = r.effs, isPrimary = r.isPrimary
                                        if (!special || !effs) return
                                        if (effs.rounds && cur.phaseNumber === effs.rounds) {
                                            var audioRef = { audio: null }
                                            var tr = h.handleTransform(cur, isPrimary, effs, special, { huanfuEffect: effs.effect })
                                            if (tr) audioRef.audio = tr.audio
                                            h.handleEffectPlay(cur, effs, special, audioRef)
                                            h.playAudioSafe(audioRef.audio, effs.audio)
                                        }
                                    })
                                }
                                rSt.phaseNum = cur.phaseNumber
                            }
                        } catch (e) {}
                    }
                    var _tickHp = function () {
                        try {
                            if (game.servermode) return
                            if (!_status.connectMode) return
                            if (!window.skinSwitch || !window.skinSwitch.dynamic) return
                            var list = (game.players || []).slice().concat((game.dead || []).slice())
                            for (var i = 0; i < list.length; i++) {
                                var p = list[i]
                                if (!p || !p.dynamic || p.playerid == null) continue
                                var s = _stPlayers[p.playerid]
                                if (!s) { _stPlayers[p.playerid] = { hp: p.hp, phaseNum: p.phaseNumber }; continue }
                                if (typeof p.hp === 'number' && typeof s.hp === 'number') {
                                    if (p.hp < s.hp - 0.01) {
                                        _onHpDown(p)
                                        if (typeof _stCurPhase === 'object' && _stCurPhase !== p) _onInflict(p)
                                    }
                                    else if (p.hp > s.hp + 0.01) {
                                        // 血量恢复: 触发低血量还原
                                        _onHpUp(p)
                                    }
                                }
                                s.hp = p.hp
                            }
                        } catch (e) {}
                    }
                    // ws消息层识别的即时血量广播依赖此入口(见 ws 钩子内的 _hitHpSync 逻辑)
                    window.__pfqh_tickHp = (function () {
                        var _lt = 0
                        return function () {
                            var _n = Date.now()
                            if (_n - _lt < 30) return // 30ms 合并, 避免每 exec 都全遍历
                            _lt = _n
                            try { _tickHp() } catch (e) {}
                        }
                    })()
                    // ●updateState 触发(回合/阶段): 血量检测已完全交给实时通道(_tickHp), 本路径仅驱动回合/阶段特效。
                    var _tickState = function () {
                        try {
                            if (game.servermode) return
                            if (!_status.connectMode) return
                            if (!window.skinSwitch || !window.skinSwitch.dynamic) return
                            _onPhase()
                        } catch (e) {}
                    }
                    // 触发源1(回合/阶段): 房主game.updateState广播回合状态到客机, 尾触发执行_tickState; 血量实时见触发源2
                    var _pfUsTimer = 0, _pfUsBatch = 0
                    var _scheduleTick = function () {
                        try {
                            if (game && game.servermode) return
                            if (!_status || !_status.connectMode) return
                            _pfUsBatch++
                            var _tag = _pfUsBatch
                            clearTimeout(_pfUsTimer)
                            _pfUsTimer = setTimeout(function () {
                                try { if (_tag === _pfUsBatch) _tickState() } catch (e) {}
                            }, 60)
                        } catch (e) {}
                    }
                    var _pfHpTimer = 0, _pfHpBatch = 0
                    var _scheduleTickHp = function () {
                        try {
                            if (game && game.servermode) return
                            if (!_status || !_status.connectMode) return
                            _pfHpBatch++
                            var _tag = _pfHpBatch
                            clearTimeout(_pfHpTimer)
                            _pfHpTimer = setTimeout(function () {
                                try { if (_tag === _pfHpBatch) _tickHp() } catch (e) {}
                            }, 60)
                        } catch (e) {}
                    }
                    // 触发源1: 回合/阶段同步(game.updateState)驱动 phaseBegin/phaseEnd/chuchang/roundCount
                    var _wrapUpdateState = function () {
                        try {
                            if (!game || typeof game.updateState !== 'function' || game.updateState.__pfqhUsWrapped) {
                                return !!(game && typeof game.updateState === 'function' && game.updateState.__pfqhUsWrapped)
                            }
                            game.updateState.__pfqhUsWrapped = true
                            var _origUS = game.updateState
                            game.updateState = function (state) {
                                try {
                                    var _r = _origUS.apply(this, arguments)
                                    _scheduleTick()
                                    return _r
                                } catch (e) {
                                    return _origUS.apply(this, arguments)
                                }
                            }
                            return true
                        } catch (e) { return false }
                    }
                    if (!_wrapUpdateState()) {
                        var _ivUs = setInterval(function () { try { if (_wrapUpdateState()) clearInterval(_ivUs) } catch (e) {} }, 200)
                    }
                    // 触发源2: 血量实时同步。changeHp 改血后会 player.update → broadcast 到客机, wrap之使变身即时触发
                    var _wrapPlayerUpdate = function () {
                        try {
                            var proto = lib.element && lib.element.player && lib.element.player.prototype
                            if (!proto || typeof proto.update !== 'function') return false
                            if (proto.update.__pfqhUpWrapped) return true
                            proto.update.__pfqhUpWrapped = true
                            var _origUp = proto.update
                            proto.update = function () {
                                try {
                                    var _r = _origUp.apply(this, arguments)
                                    if (this && this.dynamic) _scheduleTickHp()
                                    return _r
                                } catch (e) {
                                    return _origUp.apply(this, arguments)
                                }
                            }
                            return true
                        } catch (e) { return false }
                    }
                    if (!_wrapPlayerUpdate()) {
                        var _ivPu = setInterval(function () { try { if (_wrapPlayerUpdate()) clearInterval(_ivPu) } catch (e) {} }, 200)
                    }
                }
            }
            lib.skill._gj = {
                trigger: { player: ['useCardBefore', 'useCard1', 'useCard2'] },
                forced: true,
                filter: function (event, player) {
                    if (player.isUnseen()) return false;
                    if (!player.dynamic) return false;
                    if (!lib.config[skinSwitch.configKey.allowNonCurrentPhaseAttack] && _status.currentPhase != player) return false;
                    if (event.card.name == "huogong") return false;
                    if (event.card.cards && Array.isArray(event.card.cards) && event.card.cards.length > 0) {
                        let originalCard = event.card.cards[0];
                        if (originalCard && originalCard.name && originalCard.name !== event.card.name) {
                            return false;
                        }
                    }
                    let type = get.type(event.card);
                    return ((type == 'basic' || type == 'trick') && get.tag(event.card, 'damage') > 0)
                },
                content: function () {
                    // 判定当前能否攻击(可能有国战隐藏武将)
                    let res = skinSwitch.dynamic.checkCanBeAction(player);
                    if (!res || !res.dynamic) return player.GongJi = false;
                    else {
                        // 添加指示线功能, 加载攻击指示线骨骼, 直接使用十周年ani来进行播放
                        let dy = (player.dynamic.primary && player.dynamic.primary.player && player.dynamic.primary.player.zhishixian) || (player.dynamic.deputy && player.dynamic.deputy.player && player.dynamic.deputy.player.zhishixian)
                        let args = null

                        let getArgs = (filterPlayers = []) => {
                            if (dy != null) {
                                if (event.triggername !== 'useCardBefore' && event._trigger.targets.length < 2) {
                                    return
                                }
                                let hand = decadeUI.boundsCaches.hand;
                                let x1, y1

                                args = {
                                    hand: null,  // 手牌区域
                                    attack: {},  // 攻击方坐标
                                    targets: [],  // 攻击目标坐标
                                    bodySize: {
                                        bodyWidth: decadeUI.get.bodySize().width,
                                        bodyHeight: decadeUI.get.bodySize().height
                                    }
                                }

                                player.checkBoundsCache(true);
                                if (player === game.me) {
                                    hand.check();
                                    x1 = hand.x + hand.width / 2;
                                    y1 = hand.y;
                                    args.hand = {
                                        x1: x1,
                                        y1: y1
                                    }
                                }
                                // 攻击方的位置
                                args.attack = player.getBoundingClientRect()

                                // 计算当前角色和其他角色的角度. 参考十周年ui的指示线
                                for (let p of event._trigger.targets) {
                                    if (filterPlayers.includes(p)) continue
                                    p.checkBoundsCache(true);
                                    args.targets.push({
                                        boundRect: p.getBoundingClientRect(),
                                    })
                                }
                            }
                        }

                        // 记忆上次的攻击事件, useCard, useCard1, useCard2,会短时间内连续触发. 这样先过滤掉

                        let timeDelta = player.__lastGongji ? new Date().getTime() - player.__lastGongji.t : 10000
                        // 间隔极短的连续攻击忽略不计
                        if (timeDelta < 20) return

                        if (timeDelta >= 200) {
                            if (/*timeDelta <= 350 &&*/ event.triggername !== 'useCardBefore') {
                                if (player.__lastGongji && event._trigger.targets.length <= player.__lastGongji.tLen) {
                                    return
                                }
                            }
                            getArgs()
                            skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi', args ? { attackArgs: args, triggername: event.triggername } : {});
                            player.__lastGongji = {
                                t: new Date().getTime(),
                                tLen: event._trigger.targets.length,
                            }
                        } else {
                            if (event.triggername !== 'useCardBefore') {
                                if (event._trigger.targets.length <= player.__lastGongji.tLen) {
                                    return
                                }
                                getArgs()
                                if (args) {
                                    skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi', { attackArgs: args, triggername: event.triggername })
                                    player.__lastGongji = {
                                        t: new Date().getTime(),
                                        tLen: event._trigger.targets.length,
                                    }
                                }
                            }
                        }


                    }
                }
            }
            lib.skill._ts = {
                trigger: {
                    player: ['useSkillBefore']
                },
                forced: true,
                filter: function (event, player) {
                    return player.isAlive() && player.dynamic;
                },
                content(event, trigger, player) {
                    // 检查限定技
                    let skillType = ''
                    let triggerSkill = event.getTrigger().skill
                    if (triggerSkill && triggerSkill[0] === '_') return

                    let skillInfo = get.info(triggerSkill)
                    let dskins = decadeUI.dynamicSkin
                    if (skillInfo) {
                        if (skillInfo.limited) {
                            let res = skinSwitch.dynamic.getSpecial(player, 'xiandingji')
                            res.forEach(r => {
                                const { avatar, special, effs, isPrimary } = r
                                let pName = isPrimary ? player.name : player.name2
                                let cha = lib.character[pName]
                                if (!cha || !cha[3] || !cha[3].includes(triggerSkill)) {
                                    return
                                }
                                let h = window.__pfqh_helpers || pfqhHelpers
                                let audioRef = { audio: null }
                                let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                                    huanfuEffect: effs.effect
                                })
                                if (transformResult) {
                                    audioRef.audio = transformResult.audio
                                }
                                h.handleEffectPlay(player, special.condition.xiandingji, special, audioRef)
                                h.playAudioSafe(audioRef.audio, special.condition.xiandingji.audio)
                            })
                        } else if (skillInfo.dutySkill) {
                            skillType = 'shimingji';
                        }
                    }

                    skinSwitch.checkTeshuAction(player, triggerSkill)
                }
            }

            lib.skill._playAudioToQueue = {
                trigger: { player: ['useCardBefore', 'respondBefore'] },
                forced: true,
                filter: function (event, player) {
                    if (player.isUnseen()) return false;
                    if (!player.dynamic) return false;
                    return player.dynamic.primary && player.dynamic.primary.player && player.dynamic.primary.player.audio
                },
                content: function () {
                    let id = player.dynamic.id
                    let skinId = player.dynamic.primary.id
                    if (!skinSwitch.audioPlayQueue) {
                        skinSwitch.audioPlayQueue = []
                    }
                    // 添加到队列中, 每次播放音频, 检查当前队列是否有待替换的语音需要进行播放
                    let card = event.getTrigger().card
                    let cardName
                    if (card.name == 'sha' && (card.nature == 'fire' || card.nature == 'thunder' || card.nature == 'ice' || card.nature == 'stab')) {
                        cardName = card.name + '_' + card.nature
                    } else {
                        cardName = card.name
                    }

                    skinSwitch.audioPlayQueue.push({
                        'card': cardName,
                        'id': id,
                        'skinId': skinId,
                        'time': new Date().getTime()
                    })

                }
            }

            // 回合开始播chuchang: 用 global:"phaseBegin" 对全场派发(房主逻辑端必然执行技能), 仅当前回合者生效, 以phaseNumber+__ssChuChangTurn与_onPhase共享去重, 各端各播一次不双播
            // ●修复[能在filter放行但content不执行]: 原因见下——
            //   引擎会把技能的 content 送入 StepCompiler 编译: 编译时解构函数源码并用 new Function 重建, 运行域只注入
            //   _status/ai/game/get/lib/ui 与 event 字段, __不会 __保留 extension 闭包里的自由变量(如 skinSwitch)。
            //   旧 content 未加 window. 前缀, 引用闭包变量 skinSwitch 会在编译域内抛出 ReferenceError, 联机时被静默吞掉 → 主机content看似不执行;
            //   而 filter 不走编译、保留闭包作用域, 所以此前只有把播放移进 filter 才在主机生效。
            //   ●本版: 播放放回 content, 一律用全局 window.skinSwitch 安全访问; filter 改为纯判定, 不再带播放副作用。
            lib.skill._checkDcdChuChang = {
                trigger: {
                    global: "phaseBegin",
                },
                forced: true,
                filter: function (event, player) {
                    // 只对当前回合者生效(global事件会派发给全场玩家, 非当前回合者跳过)
                    if (event.player !== player) return false;
                    if (!player.dynamic) return false;
                    // 双将也播chuchang: 主将或副将任一有chuchang即触发, 交由出框worker主副都播
                    var hasChuChang = !!(player.dynamic.primary && player.dynamic.primary.player && player.dynamic.primary.player.chuchang)
                        || !!(player.dynamic.deputy && player.dynamic.deputy.player && player.dynamic.deputy.player.chuchang)
                    if (!hasChuChang) return false;
                    // 与 _onPhase 共享回合标记去重: 任一路径先播, 本回合另一路径跳过(标记在content播放成功后写入)
                    if (player.__ssChuChangTurn === player.phaseNumber) return false;
                    return true;
                },
                content: function () {
                    // content 经编译不含闭包 skinSwitch, 用 window.skinSwitch(全局) 安全访问
                    if (!player.GongJi && window.skinSwitch && window.skinSwitch.chukuangWorkerApi) {
                        window.skinSwitch.chukuangWorkerApi.chukuangAction(player, 'chuchang');
                        player.__ssChuChangTurn = player.phaseNumber;
                    }
                }
            };
            lib.skill._checkDcdShan = {
                trigger: {
                    player: 'useCard'
                },
                forced: true,
                filter: function (event, player) {
                    // 打出闪时
                    return event.card.name === 'shan' && player.dynamic && (player.dynamic.primary && player.dynamic.primary.player.shizhounian || player.dynamic.deputy && player.dynamic.deputy.player.shizhounian)
                },
                content: function () {
                    let avatar = player.dynamic.primary && player.dynamic.primary.player.shizhounian ? player.dynamic.primary : player.dynamic.deputy
                    if (!avatar) return
                    let currentSkinName = lib.config[skinSwitch.configKey.dynamicSkin] && lib.config[skinSwitch.configKey.dynamicSkin][player.name]
                    if (!currentSkinName && avatar.skinName) {
                        currentSkinName = avatar.skinName
                    }
                    let skinConfig = null
                    if (window.decadeUI && window.decadeUI.dynamicSkin && player.name && currentSkinName && window.decadeUI.dynamicSkin[player.name] && window.decadeUI.dynamicSkin[player.name][currentSkinName]) {
                        skinConfig = window.decadeUI.dynamicSkin[player.name][currentSkinName]
                    }
                    let huanshashan = skinConfig && skinConfig.huanshashan
                    if (huanshashan && huanshashan.name) {
                        let isPrimary = player.dynamic.primary && player.dynamic.primary.player.shizhounian
                        skinSwitch.rendererOnMessage.addListener(player, 'hideAllNodeEnd', function () {
                            let shanActionName = huanshashan.action || 'play'
                            let shanActionParams = {
                                name: huanshashan.name,
                                action: shanActionName,
                                scale: huanshashan.scale,
                                x: huanshashan.x,
                                y: huanshashan.y,
                                showTime: huanshashan.showTime || huanshashan.duration,
                                speed: huanshashan.speed
                            }
                            if (huanshashan.version != null && huanshashan.version !== '') {
                                shanActionParams.version = huanshashan.version
                            }
                            if (huanshashan.json === true || huanshashan.json === false) {
                                shanActionParams.json = huanshashan.json
                            }
                            let res = skinSwitch.dynamic.checkCanBeAction(player)
                            if (res && res.dynamic) {
                                let pp = skinSwitch.getCoordinate(player, true)
                                let me = player === game.me
                                player.dynamic.renderer.postMessage({
                                    message: 'ACTION',
                                    id: player.dynamic.id,
                                    action: 'shan',
                                    skinID: res.dynamic.id,
                                    isDouble: res.isDouble,
                                    deputy: res.deputy,
                                    needHide: res.needHide,
                                    me: me,
                                    direction: me ? false : skinSwitch.getDirection(player),
                                    player: pp,
                                    selfPhase: _status.currentPhase === player,
                                    shanAction: shanActionParams
                                })
                            }
                            if (skinSwitch.rendererOnMessage.dynamicEvents[player.dynamic.id] && skinSwitch.rendererOnMessage.dynamicEvents[player.dynamic.id]['hideAllNodeEnd']) {
                                delete skinSwitch.rendererOnMessage.dynamicEvents[player.dynamic.id]['hideAllNodeEnd']
                            }
                        })
                        player.dynamic.renderer.postMessage({
                            message: 'hideAllNode',
                            id: player.dynamic.id,
                            isPrimary: isPrimary,
                            skinId: avatar.id
                        })
                    } else {
                        let shanAction = (skinConfig && skinConfig.daijishan) || (skinConfig && skinConfig.shan) || avatar.player.shan || 'play3'
                        skinSwitch.postMsgApi.action(player, shanAction, avatar)
                    }
                }
            }
            lib.skill._checkDcdwuxie = {
                trigger: {
                    player: 'useCard'
                },
                forced: true,
                filter: function (event, player) {
                    // 打出无懈时
                    return event.card.name === 'wuxie' && player.dynamic && (player.dynamic.primary && player.dynamic.primary.player.hudong || player.dynamic.deputy && player.dynamic.deputy.player.hudong)
                },
                content: function () {
                    // 如果是双将, 优先使用主将的hudong参数
                    if (player.dynamic.primary && player.dynamic.primary.player.hudong) {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'HuDong')
                    } else if (player.dynamic.deputy && player.dynamic.deputy.player.hudong) {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'HuDong', null, 'fu')
                    }
                }
            }

            // 游戏开始时检查所有角色的圆弧组别是否正确
            lib.skill._fix_yh = {
                trigger: {
                    global: 'gameStart'
                },
                forced: true,
                filter: function (event, player) {
                    return !(lib.config[skinSwitch.decadeKey.newDecadeStyle] === "on")
                },
                content: function () {
                    skinSwitch.skinSwitchCheckYH(player)
                }
            }

            // 不知道怎么合并, 在回合开始和回合结束, 检测Player的group变化
            lib.skill._fix_phase_yh = {
                trigger: {
                    player: ['phaseBegin', 'phaseEnd']
                },
                forced: true,
                filter: function (event, player) {
                    return !(lib.config[skinSwitch.decadeKey.newDecadeStyle] === "on")
                },
                content: function () {
                    skinSwitch.skinSwitchCheckYH(player)
                }
            }

            // 回合计数变身触发
            lib.skill._pfqh_check_roundCount = {
                trigger: {
                    player: "phaseBegin",
                },
                silent: true,
                charlotte: true,
                forced: true,
                priority: 2022,
                filter(event, player) {
                    return player.dynamic && player.isAlive();
                },
                content: function () {
                    // 获取与回合计数相关的特殊效果
                    let res = skinSwitch.dynamic.getSpecial(player, 'roundCount');
                    if (res && res.length > 0) {
                        res.forEach(r => {
                            const { avatar, special, effs, isPrimary } = r;
                            // 检查是否达到回合数触发条件
                            if (effs && effs.rounds && player.phaseNumber === effs.rounds) {
                                let audioRef = { audio: null };
                                let transform = effs.transform;
                                if (transform) {
                                    let newSkin = null;
                                    if (Array.isArray(transform)) {
                                        for (let i = 0; i < transform.length; i++) {
                                            newSkin = special[transform[i]];
                                            if (newSkin) break;
                                        }
                                    } else {
                                        newSkin = special[transform];
                                    }
                                    if (newSkin) {
                                        if (newSkin.audio) audioRef.audio = newSkin.audio;
                                        if (newSkin.name) {
                                            // ●原因: 原bianshen不存在会抛错, 改用getSkinInfo+pfqhApplyTransform修报错且变身只所属玩家可见。
                                            let dInfo = getSkinInfo(newSkin.name)
                                            if (dInfo) {
                                                pfqhApplyTransform(player, isPrimary, dInfo, { huanfuEffect: newSkin.effect, isOrigin: false, newName: newSkin.name })
                                            }
                                        }
                                    }
                                }
                                let h = window.__pfqh_helpers || pfqhHelpers
                                h.handleEffectPlay(player, effs, special, audioRef);
                                h.playAudioSafe(audioRef.audio, effs.audio);
                            }
                        });
                    }
                }
            };

            lib.skill._check_die_yh = {
                trigger: {
                    player: "dieBefore",
                },
                silent: true,
                charlotte: true,
                forced: true,
                filter(event, player) {
                    return player.dynamic
                },
                content: function () {
                    let skinYh = player.getElementsByClassName("skinYh");
                    if (skinYh.length > 0) {
                        player.removeChild(skinYh[0]);
                    }
                }
            }

            // 添加游戏开始时重新应用保存的动皮参数的技能
            lib.skill._pfqh_reapply_saved_params = {
                trigger: {
                    global: 'gameStart'
                },
                forced: true,
                silent: true,
                priority: 100, // 高优先级确保在其他技能之前执行
                content: function () {
                    // 多次尝试应用参数，确保成功
                    let applyParams = () => {
                        console.log('=== 尝试应用保存的动皮参数 ===');
                        console.log('当前保存的参数:', window.skinSwitch ? skinSwitch.saveSkinParams : 'skinSwitch不存在');
                        console.log('十周年UI状态:', window.decadeUI ? '已加载' : '未加载');

                        if (window.skinSwitch && typeof skinSwitch.updateDecadeDynamicSkin === 'function' && window.decadeUI) {
                            skinSwitch.updateDecadeDynamicSkin();
                            console.log('已重新应用保存的动皮参数');

                            // 输出应用后的结果
                            if (decadeUI.dynamicSkin) {
                                console.log('应用后的dynamicSkin:', decadeUI.dynamicSkin);
                            }
                            return true;
                        } else {
                            console.warn('条件不满足，跳过应用');
                            return false;
                        }
                    };

                    // 立即尝试一次
                    if (!applyParams()) {
                        // 如果失败，延迟500ms再试
                        setTimeout(() => {
                            if (!applyParams()) {
                                // 如果还失败，再延迟1000ms试一次
                                setTimeout(() => {
                                    if (!applyParams()) {
                                        // 最后再延迟2000ms试一次
                                        setTimeout(applyParams, 2000);
                                    }
                                }, 1000);
                            }
                        }, 500);
                    }
                }
            }

            // 添加角色初始化时重新应用保存的动皮参数的技能
            lib.skill._pfqh_reapply_on_init = {
                trigger: {
                    player: 'enterGame'
                },
                forced: true,
                silent: true,
                priority: -100, // 低优先级，确保在角色完全初始化后执行
                filter: function (event, player) {
                    return player.dynamic && player.dynamic.primary;
                },
                content: function () {
                    // 延迟执行，确保角色完全初始化
                    setTimeout(() => {
                        console.log('=== 角色初始化完成，重新应用保存的动皮参数 ===', player.name);
                        if (window.skinSwitch && typeof skinSwitch.updateDecadeDynamicSkin === 'function' && window.decadeUI) {
                            skinSwitch.updateDecadeDynamicSkin();
                            console.log('角色初始化时已重新应用保存的动皮参数');
                        }
                    }, 200);
                }
            }

            // 不知道怎么合并, 在回合开始和回合结束, 检测Player的group变化
            lib.skill._fix_phase_yh = {
                trigger: {
                    player: ['phaseBegin', 'phaseEnd']
                },
                forced: true,
                filter: function (event, player) {
                    return !(lib.config[skinSwitch.decadeKey.newDecadeStyle] === "on")
                },
                content: function () {
                    skinSwitch.skinSwitchCheckYH(player)
                }
            }

            // 回合计数变身触发
            lib.skill._pfqh_check_roundCount = {
                trigger: {
                    player: "phaseBegin",
                },
                silent: true,
                charlotte: true,
                forced: true,
                priority: 2022,
                filter(event, player) {
                    return player.dynamic && player.isAlive();
                },
                content: function () {
                    // 获取与回合计数相关的特殊效果
                    let res = skinSwitch.dynamic.getSpecial(player, 'roundCount');
                    if (res && res.length > 0) {
                        res.forEach(r => {
                            const { avatar, special, effs, isPrimary } = r;
                            // 检查是否达到回合数触发条件
                            if (effs && effs.rounds && player.phaseNumber === effs.rounds) {
                                let audioRef = { audio: null };
                                let transform = effs.transform;
                                if (transform) {
                                    let newSkin = null;
                                    if (Array.isArray(transform)) {
                                        for (let i = 0; i < transform.length; i++) {
                                            newSkin = special[transform[i]];
                                            if (newSkin) break;
                                        }
                                    } else {
                                        newSkin = special[transform];
                                    }
                                    if (newSkin) {
                                        if (newSkin.audio) audioRef.audio = newSkin.audio;
                                        if (newSkin.name) {
                                            // ●原因: 原bianshen不存在会抛错, 改用getSkinInfo+pfqhApplyTransform修报错且变身只所属玩家可见。
                                            let dInfo = getSkinInfo(newSkin.name)
                                            if (dInfo) {
                                                pfqhApplyTransform(player, isPrimary, dInfo, { huanfuEffect: newSkin.effect, isOrigin: false, newName: newSkin.name })
                                            }
                                        }
                                    }
                                }
                                let h = window.__pfqh_helpers || pfqhHelpers
                                h.handleEffectPlay(player, effs, special, audioRef);
                                h.playAudioSafe(audioRef.audio, effs.audio);
                            }
                        });
                    }
                }
            };

            lib.skill._check_die_yh = {
                trigger: {
                    player: "dieBefore",
                },
                silent: true,
                charlotte: true,
                forced: true,
                filter(event, player) {
                    return player.dynamic
                },
                content: function () {
                    let skinYh = player.getElementsByClassName("skinYh");
                    if (skinYh.length > 0) {
                        player.removeChild(skinYh[0]);
                    }
                }
            }

            // 血量变化时, 触发变身
            lib.skill._pfqh_check_hp_change = {
                trigger: {
                    player: ['changeHp'],
                },
                silent: true,
                charlotte: true,
                forced: true,
                filter(event, player) {
                    // 只有动皮可以进行过滤.
                    return player.dynamic
                },
                content: function () {
                    let h = window.__pfqh_helpers || pfqhHelpers
                    // 获取有配置了special的角色
                    let res = skinSwitch.dynamic.getSpecial(player, 'lowhp')
                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r
                        // 默认回复血量不变回来, 和十周年保持一致
                        if (event.getTrigger().num > 0 && !effs.recover) {
                            return
                        }
                        let hp = player.hp
                        if (isPrimary && player._primaryLowestHp == null) {
                            player._primaryLowestHp = hp + 1000
                        }
                        if (!isPrimary && player._deputyLowestHp == null) {
                            player._deputyLowestHp = hp + 1000
                        }
                        if (!effs.recover) {
                            if ((isPrimary && hp >= player._primaryLowestHp) || (!isPrimary && hp >= player._deputyLowestHp))
                                return // 排除救助回来, 然后继续重复变身
                        }
                        if (isPrimary) {
                            player._primaryLowestHp = hp
                        } else {
                            player._deputyLowestHp = hp
                        }
                        let audioRef = { audio: null }
                        let lowhpTransform = effs.transform
                        if (!lowhpTransform || lowhpTransform.length === 0) return

                        const originSkin = isPrimary ? player.originSkin : player.originSkin2
                        let transList = []
                        if (lowhpTransform) {
                            for (let transName of lowhpTransform) {
                                let set = special[transName]
                                if (set && set.hp) {
                                    transList.push(set)
                                }
                            }
                        }
                        transList.sort((a, b) => { return a.hp - b.hp })
                        let index = -1
                        for (let i = 0; i < transList.length; i++) {
                            if (hp <= transList[i].hp) {
                                index = i
                                break
                            }
                        }

                        if (index === -1) {
                            if (!originSkin.skin) originSkin.skin = 'default'
                            skinSwitch.dynamic.transformDst(player, isPrimary, originSkin, { huanfuEffect: effs.effect, isOrigin: true })
                        } else {
                            let trans = transList[index]
                            let h = window.__pfqh_helpers || pfqhHelpers
                            let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                                huanfuEffect: effs.effect,
                                trans,
                                updateAudio: true,
                                avatar
                            })
                            if (transformResult) {
                                audioRef.audio = transformResult.audio
                                let dInfo = h.getSkinInfo(trans.name)
                                if (dInfo && dInfo.name !== player.dynamic[isPrimary ? 'primary' : 'deputy'].name) {
                                    h.handleEffectPlay(player, special.condition.lowhp, special, audioRef)
                                    h.playAudioSafe(audioRef.audio, special.condition.lowhp.audio, 'extension')
                                }
                            }
                        }
                    })
                }

            }

            // 检测受到伤害次数并且变身或者播放特效, 只有达到指定的次数才播放
            lib.skill._pfqh_check_damage_times = {
                trigger: {
                    player: ['damage'],
                },
                silent: true,
                charlotte: true,
                forced: true,
                filter(event, player) {
                    // 只有动皮可以进行过滤.
                    return player.dynamic
                },
                content: function () {
                    let h = window.__pfqh_helpers || pfqhHelpers
                    // 获取有配置了special的角色
                    if (player.__damage_times == null) {
                        player.__damage_times = 1
                    } else {
                        player.__damage_times++
                    }
                    let res = skinSwitch.dynamic.getSpecial(player, 'damageTimes')
                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r
                        // 获取低血量的配置
                        let transforms = effs.transform || []

                        // const originSkin = isPrimary ? player.originSkin : player.originSkin2

                        let transList = []
                        for (let transName of transforms) {
                            // 获取配置里的设置.
                            let set = special[transName]
                            if (set && set.times) {
                                transList.push(set)
                            }
                        }
                        transList.sort((a, b) => { return a.times - b.times })
                        let times = player.__damage_times
                        // 找到合适的符合当前血量的区间.
                        let index = -1
                        for (let i = 0; i < transList.length; i++) {
                            if (times === transList[i].times) {
                                index = i
                                break
                            }
                            if (times < transList[i].times) {
                                break
                            }
                        }
                        if (index !== -1) {
                            let trans = transList[index]
                            let audioRef = { audio: null }
                            let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                                huanfuEffect: effs.effect,
                                trans,
                                updateAudio: true,
                                avatar
                            })
                            if (transformResult) {
                                audioRef.audio = transformResult.audio
                                let dInfo = h.getSkinInfo(trans.name)
                                if (dInfo && dInfo.name !== avatar.name) {
                                    h.handleEffectPlay(player, effs, special, audioRef)
                                    h.playAudioSafe(audioRef.audio, special.condition.damageTimes.audio, 'extension')
                                }
                            }
                        }
                    })
                }

            }

            // 检测受到伤害变身或者播放特效
            lib.skill._pfqh_check_damage = {
                trigger: {
                    player: ['damage'],
                },
                silent: true,
                charlotte: true,
                forced: true,
                filter(event, player) {
                    // 只有动皮可以进行过滤.
                    return player.dynamic
                },
                content: function () {
                    let h = window.__pfqh_helpers || pfqhHelpers
                    let res = skinSwitch.dynamic.getSpecial(player, 'damage')

                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r
                        let pName = isPrimary ? player.name : player.name2
                        let key = isPrimary ? 'damagePrimaryTransform' : 'damageDeputyTransform'
                        if (player[key]) return
                        let audioRef = { audio: null }
                        let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                            huanfuEffect: effs.effect,
                            updateAudio: true,
                            avatar
                        })
                        if (transformResult) {
                            audioRef.audio = transformResult.audio
                        }
                        h.handleEffectPlay(player, effs, special, audioRef)
                        h.playAudioSafe(audioRef.audio, special.condition.damage.audio)
                    })
                }

            }
            // 检测造成伤害累计值并且变身或者播放特效, 只有达到指定的伤害值才播放
            lib.skill._pfqh_check_inflict_damage = {
                trigger: {
                    source: ['damage'],
                },
                silent: true,
                charlotte: true,
                forced: true,
                filter(event, player) {
                    return player.dynamic;
                },
                content: function () {
                    let h = window.__pfqh_helpers || pfqhHelpers
                    let damageValue = event.num || 1;
                    if (player.__inflict_damage == null) {
                        player.__inflict_damage = damageValue;
                    } else {
                        player.__inflict_damage += damageValue;
                    }
                    let res = skinSwitch.dynamic.getSpecial(player, 'inflictDamage')
                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r
                        let transforms = effs.transform
                        if (typeof transforms === 'string') {
                            transforms = [transforms]
                        }
                        transforms = transforms || []
                        let transList = []
                        for (let transName of transforms) {
                            let set = special[transName]
                            if (set && set.damage) {
                                transList.push(set)
                            }
                        }
                        transList.sort((a, b) => { return a.damage - b.damage })
                        let totalDamage = player.__inflict_damage
                        let index = -1
                        for (let i = transList.length - 1; i >= 0; i--) {
                            if (totalDamage >= transList[i].damage) {
                                let key = isPrimary ? '__inflict_damage_transformed_' : '__inflict_damage_transformed2_'
                                let transformKey = key + transList[i].damage
                                if (!player[transformKey]) {
                                    index = i
                                    player[transformKey] = true
                                    break
                                }
                            }
                        }
                        if (index !== -1) {
                            let trans = transList[index]
                            let audioRef = { audio: null }
                            let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                                huanfuEffect: effs.effect,
                                trans,
                                updateAudio: true,
                                avatar
                            })
                            if (transformResult) {
                                audioRef.audio = transformResult.audio
                                let dInfo = h.getSkinInfo(trans.name)
                                if (dInfo && dInfo.name !== avatar.name) {
                                    h.handleEffectPlay(player, effs, special, audioRef)
                                    h.playAudioSafe(audioRef.audio, special.condition.inflictDamage.audio, 'extension')
                                }
                            }
                        }
                    })
                }
            }

            // 击杀
            lib.skill._pfqh_check_jisha = {
                trigger: {
                    source: "dieBegin",
                },
                silent: true,
                charlotte: true,
                forced: true,
                priority: 2022,
                filter(event, player) {
                    return player.dynamic
                },
                content: function () {
                    let h = window.__pfqh_helpers || pfqhHelpers
                    let res = skinSwitch.dynamic.getSpecial(player, 'jisha')
                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r
                        let audioRef = { audio: null }
                        let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                            huanfuEffect: effs.effect,
                            updateAudio: true,
                            avatar
                        })
                        if (transformResult) {
                            audioRef.audio = transformResult.audio
                        }
                        h.handleEffectPlay(player, effs, special, audioRef)
                        h.playAudioSafe(audioRef.audio, special.condition.jisha.audio)
                    })
                }
            }
            // 改变势力
            lib.skill._pfqh_check_changeGroup = {
                trigger: {
                    global: 'gameStart'
                },
                silent: true,
                charlotte: true,
                forced: true,
                priority: 2022,
                filter(event, player) {
                    return player.dynamic;
                },
                content: function () {
                    let h = window.__pfqh_helpers || pfqhHelpers
                    let res = skinSwitch.dynamic.getSpecial(player, 'changeGroup');
                    // 接口传不过来呜呜呜，再写一遍
                    var groupMap = {
                        'wei': ['wei'],
                        'shu': ['shu'],
                        'wu': ['wu'],
                        'qun': ['qun']
                    };
                    function getFirstGroupType(characterName) {
                        var group = get.groupnature(lib.character[characterName]);
                        for (var type in groupMap) {
                            if (groupMap[type].some(function (keyword) { return group.startsWith(keyword); })) {
                                return type;
                            }
                        }
                        return null;
                    }
                    var playerGroupType = getFirstGroupType(player.name);
                    var currentPlayerGroupType = player.group;
                    if (currentPlayerGroupType !== playerGroupType) {

                        // 检查是否执行过换肤操作
                        res.forEach(r => {
                            const { avatar, special, effs, isPrimary } = r;
                            let audioRef = { audio: null };
                            let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                                huanfuEffect: effs.effect,
                                currentGroup: currentPlayerGroupType
                            });
                            if (transformResult) {
                                audioRef.audio = transformResult.audio;
                            }
                            h.handleEffectPlay(player, effs, special, audioRef);
                            h.playAudioSafe(audioRef.audio, special.condition.changeGroup.audio);
                        });
                    }
                }
            };
            // 回合开始变身
            lib.skill._pfqh_check_phaseBegin = {
                trigger: {
                    player: 'phaseBegin'
                },
                silent: true,
                charlotte: true,
                forced: true,
                priority: 2022,
                filter(event, player) {
                    return player.dynamic;
                },
                content: function () {
                    let h = window.__pfqh_helpers || pfqhHelpers
                    let res = skinSwitch.dynamic.getSpecial(player, 'phaseBegin');
                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r;
                        let audioRef = { audio: null };
                        let transformResult = h.handleTransform(player, isPrimary, effs, special, {
                            huanfuEffect: effs.effect
                        });
                        if (transformResult) {
                            audioRef.audio = transformResult.audio;
                        }
                        h.handleEffectPlay(player, effs, special, audioRef);
                        h.playAudioSafe(audioRef.audio, special.condition.phaseBegin.audio);
                    });
                }
            };

            // 回合结束变身
            lib.skill._pfqh_check_phaseEnd = {
                trigger: {
                    player: 'phaseEnd'
                },
                silent: true,
                charlotte: true,
                forced: true,
                priority: 2022,
                filter(event, player) {
                    return player.dynamic;
                },
                content: function () {
                    let res = skinSwitch.dynamic.getSpecial(player, 'phaseEnd');
                    res.forEach(r => {
                        const { avatar, special, effs, isPrimary } = r;
                        let audio;

                        let tryTransform = () => {
                            let transform = effs.transform;
                            if (!transform || !(transform in special)) return;
                            let trans = special[transform];

                            let dskins = decadeUI.dynamicSkin;
                            // 播放转换的骨骼
                            let newName = trans.name;
                            if (newName) {
                                // 分割名字, 获取骨骼, 与当前角色的骨骼的名字比较,是否是同名
                                let [key, skinName] = newName.split('/');
                                let dInfo = key && skinName && dskins[key] && dskins[key][skinName];
                                if (dInfo) {
                                    skinSwitch.dynamic.transformDst(player, isPrimary, dInfo, { huanfuEffect: effs.effect });
                                }
                            } else {
                                skinSwitch.dynamic.transformDst(player, isPrimary, trans, { huanfuEffect: effs.effect });
                            }
                            audio = trans.audio;
                        };

                        let tryEffectPlay = () => {
                            // 检查是否有播放特效
                            let effectPlay = effs.play;
                            if (effectPlay) {
                                let eff = special[effectPlay];
                                if (eff) {
                                    if (!eff.x) eff.x = [0, 0.5];
                                    if (!eff.y) eff.y = [0, 0.5];
                                    // ●原因【客机自触发】: phaseEnd特效本机playEffect, 保留原delay延迟。
                                    setTimeout(() => {
                                        try {
                                            if (player && player.node && player.node.getBoundingClientRect) {
                                                skinSwitch.chukuangWorkerApi.playEffect(eff, { parent: player.node })
                                            } else {
                                                skinSwitch.chukuangWorkerApi.playEffect(eff)
                                            }
                                        } catch (e) {}
                                    }, (eff.delay || 0) * 1000);
                                    if (!audio) audio = eff.audio;
                                }
                            }
                        };
                        tryTransform();
                        tryEffectPlay();

                        if (!audio) audio = special.condition.phaseEnd.audio;
                        if (audio) {
                            game.playAudio('..', skinSwitch.dcdPath, 'assets/dynamic', audio);
                        }

                    });
                }
            };

            // 先初步进行初始化
            if (!lib.config['extension_千幻聆音_enable'] || lib.config['extension_千幻聆音_qhly_decadeCloseDynamic'] || !(lib.config.qhly_currentViewSkin === 'decade' || lib.config.qhly_currentViewSkin === 'shousha')) {
                overrides(lib.element.player, Player)
            }
        }
        let retryOverride = function (times, timer) {
            if (times < 0) return
            if (!window.decadeUI || !lib.skill._decadeUI_usecardBegin) {
                console.log(`第${times}次尝试`)
                let ti = setTimeout(() => {
                    retryOverride(times - 1, ti)
                }, 10)
            } else {
                overrides(lib.element.player, Player)
                console.log('替换十周年UI player成功')
                // 为当前的每一个player更换init方法
                for (let i = 0; i < game.players.length; i++) {
                    game.players[i].playDynamic = Player.playDynamic;
                }

                if (timer) {
                    clearTimeout(timer)
                }
            }
        }
        // 如果千幻聆音没有开启动皮, 或者选择的UI套装不是十周年或者手杀, 初始化
        if (!lib.config['extension_千幻聆音_enable'] || lib.config['extension_千幻聆音_qhly_decadeCloseDynamic'] || !(lib.config.qhly_currentViewSkin === 'decade' || lib.config.qhly_currentViewSkin === 'shousha')) {
            retryOverride(20)
        }
    }
    // ======== 替换结束 ========
}