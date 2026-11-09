export function createPlayerInitMethods(lib, game, get, skinSwitch) {
    return {
        chukuangPlayerInit: function (player, isPrimary, playParams) {
            if (!player.dynamic) return

            skinSwitch.rendererOnMessage.addListener(player, 'loadFinish', function (data) {
                skinSwitch.postMsgApi.startPlay(player, data)
            })

            let isPlayer = get.itemtype(player) === 'player'

            if (!(isPlayer || [...player.classList].includes('qh-shousha-big-avatar') || player.getElementsByClassName('qhdynamic-decade-big-wrap').length || player.getElementsByClassName('qhdynamic-big-wrap').length)) {
                return
            }
            if (!isPlayer) {
                playParams.qhlxBigAvatar = true
                playParams.isDecade = lib.config.qhly_currentViewSkin === 'decade'
                playParams.divPos = skinSwitch.getCoordinate(player, true)
            }
            let _this = this
            if (!this.transformInitTime) {
                this.transformInitTime = new Date().getTime()
            }
            let initPlayerAudio = () => {
                if (!player.dynamic) {
                    return
                }
                if (!player.dynamic.primary && !player.dynamic.deputy) {
                    return
                }
                let name = isPrimary ? player.name1 : player.name2
                let id = player.dynamic.id
                let skinId = isPrimary ? player.dynamic.primary.id : player.dynamic.deputy.id

                let forceUpdate = playParams._needUpdateAudio === true

                if (forceUpdate && skinSwitch.avatarAudioSkinMap && skinSwitch.avatarAudioSkinMap[name]) {
                    for (let key in skinSwitch.avatarAudioSkinMap[name]) {
                        delete skinSwitch.audioMap[key]
                        delete skinSwitch.avatarAudioSkinMap[name][key]
                    }
                }

                if (playParams.audio && isPlayer) {
                    let skillPath = playParams.audio.skill
                    let cardPath = playParams.audio.card
                    let rootPath = skinSwitch.dcdPath + '/assets/dynamic/'

                    if (!skinSwitch.audioMap) {
                        skinSwitch.audioMap = {}
                    }
                    if (!skinSwitch.avatarAudioSkinMap) {
                        skinSwitch.avatarAudioSkinMap = {}
                    }
                    skinSwitch.avatarAudioSkinMap[name] = {}
                    let qhly_earse_ext = function (path) {
                        let foundDot = path.lastIndexOf('.');
                        if (foundDot < 0) return path;
                        return path.slice(0, foundDot);
                    }
                    if (skillPath) {
                        let path = rootPath + skillPath
                        game.getFileList(path, function (folds, files) {
                            let name = isPrimary ? player.name1 : player.name2
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
                                skinSwitch.avatarAudioSkinMap[name][key] = null
                            }
                        })
                    }

                    if (cardPath) {
                        let cardRootPath = rootPath;
                        let path = cardRootPath + cardPath
                        game.getFileList(path, function (folds, files) {
                            for (let file of files) {
                                file = qhly_earse_ext(file);
                                let id = player.dynamic.id
                                let skinId = isPrimary ? player.dynamic.primary.id : player.dynamic.deputy.id
                                let key = 'card/' + id + '/' + skinId + '/' + file
                                skinSwitch.audioMap[key] = '../' + path + '/' + file
                                skinSwitch.avatarAudioSkinMap[name][key] = null
                            }
                        })
                    }

                    if (!this._initAudio) {
                        skinSwitch.pfqh_originPlayAudio = game.playAudio;
                        game.playAudio = function () {
                            let string = '';
                            let others = [];
                            for (let arg of arguments) {
                                if (typeof arg == 'string' || typeof arg == 'number') {
                                    string = string + "/" + arg;
                                } else {
                                    others.push(arg);
                                }
                            }
                            let replaces = string.split('/')
                            let replace = ''

                            const cardEn2Cn = {
                                bingliang: '兵粮寸断',
                                guohe: '过河拆桥',
                                huogong: '火攻',
                                jiedao: '借刀杀人',
                                jiu: '酒',
                                juedou: '决斗',
                                lebu: '乐不思蜀',
                                nanman: '南蛮入侵',
                                sha: '杀',
                                tao: '桃',
                                sha_fire: '火杀',
                                sha_thunder: '雷杀',
                                shan: '闪',
                                shandian: '闪电',
                                shunshou: '顺手牵羊',
                                taoyuan: '桃园结义',
                                tiesuo: '铁索连环',
                                wanjian: '万箭齐发',
                                wugu: '五谷丰登',
                                wuxie: '无懈可击',
                                wuzhong: '无中生有',
                                yiyi: '以逸待劳',
                                yuanjiao: '远交近攻',
                                zhibi: '知彼知己',
                                caomu: '草木皆兵',
                                diaohulishan: '调虎离山',
                                huoshaolianying: '火烧连营',
                                chuqibuyi: '出其不意',
                                shuiyanqijun: '水淹七军',
                                binglinchengxiax: '兵临城下',
                                lulitongxin: '戮力同心',
                                lianjunshengyan: '联军盛宴',
                                sha_ice: '冰杀',
                                dongzhuxianji: '洞烛先机',
                            }

                            if (string.startsWith('/card') && replaces.length === 4) {
                                let cardName = replaces[3]
                                if (skinSwitch.audioPlayQueue && skinSwitch.audioPlayQueue.length > 0) {
                                    for (let i = 0; i < skinSwitch.audioPlayQueue.length; i++) {
                                        if (new Date().getTime() - skinSwitch.audioPlayQueue[i].time > 2000) {
                                            skinSwitch.audioPlayQueue.splice(i, 1)
                                            i--
                                            continue
                                        }
                                        let au = skinSwitch.audioPlayQueue[i]
                                        if (au.card === cardName) {
                                            let currentId = au.id
                                            let currentSkinId = au.skinId
                                            let currentPlayer = null
                                            let audioConfig = null
                                            
                                            for (let j = 0; j < game.players.length; j++) {
                                                let p = game.players[j]
                                                if (p.dynamic && p.dynamic.id === au.id) {
                                                    currentPlayer = p
                                                    currentId = p.dynamic.id
                                                    if (p.dynamic.primary) {
                                                        currentSkinId = p.dynamic.primary.id
                                                        if (p.dynamic.primary.player && p.dynamic.primary.player.audio) {
                                                            audioConfig = p.dynamic.primary.player.audio
                                                        }
                                                    }
                                                    break
                                                }
                                            }
                                        
                                            replace = 'card/' + currentId + '/' + currentSkinId + '/' + cardEn2Cn[cardName]
                                            if (skinSwitch.audioMap[replace]) {
                                                skinSwitch.audioPlayQueue.splice(i, 1)
                                                break
                                            }
                                
                                            replace = 'card/' + currentId + '/' + currentSkinId + '/' + cardName
                                            if (skinSwitch.audioMap[replace]) {
                                                skinSwitch.audioPlayQueue.splice(i, 1)
                                                break
                                            }
                            
                                            if (audioConfig && audioConfig.card) {
                                                let cardPath = audioConfig.card
                                                let fullPath = '../extension/十周年UI/assets/dynamic/' + cardPath + '/' + cardName
                                                if (cardPath.includes('sanguoaudio/')) {
                                                    fullPath = '../extension/千幻聆音/' + cardPath + '/' + cardName
                                                }
                                                let pathParts = fullPath.split('/')
                                                pathParts = pathParts.filter(function(p) { return p && p !== '..' })
                                                let audioArgs = ['..'].concat(pathParts)
                                                audioArgs.addArray(others)
                                                skinSwitch.audioPlayQueue.splice(i, 1)
                                                return skinSwitch.pfqh_originPlayAudio.apply(this, audioArgs)
                                            }
                                            
                                            replace = ''
                                        }
                                    }
                                }
                            } else if (string.startsWith('/skill') && replaces.length === 3) {
                                replace = string.slice(1)
                            } else if (string.startsWith('/die') && replaces.length === 3) {
                                replace = string.slice(1)
                            } else if (string.startsWith('/effect/win')) {
                                replace = 'effect/' + id + '/' + skinId + '/' + 'victory'
                            }
                            console.log('string...', string)
                            if (replace.length) {
                                let rp = skinSwitch.audioMap[replace];
                                if (rp) {
                                    let args = rp.split("/");
                                    args.addArray(others);
                                    return skinSwitch.pfqh_originPlayAudio.apply(this, args);
                                }
                            }
                            return skinSwitch.pfqh_originPlayAudio.apply(this, arguments);
                        };
                        skinSwitch.qfqh_originPlaySkillAudio = game.playSkillAudio
                        game.playSkillAudio = function (name, index) {
                            let replaceKey = "skill/" + name;
                            if (!index) {
                                index = Math.ceil(Math.random() * 2);
                            }
                            replaceKey = replaceKey + index;
                            let rp = skinSwitch.audioMap[replaceKey]
                            if (rp) {
                                let args = rp.split("/");
                                return skinSwitch.pfqh_originPlayAudio.apply(this, args);
                            }
                            return skinSwitch.qfqh_originPlaySkillAudio.apply(this, arguments);
                        };
                        this._initAudio = true
                    }
                }
                if (isPlayer && playParams.special && playParams.special.condition) {
                    let dskins = decadeUI.dynamicSkin
                    let newSkelLike = []
                    let newTransformEffects = []
                    let getNewSkel = (transform) => {
                        let trans = playParams.special[transform]
                        let newName = trans.name
                        if (newName && newName !== playParams.name) {
                            let [key, skinName] = newName.split('/')
                            let dInfo = key && skinName && dskins[key] && dskins[key][skinName]
                            if (dInfo) {
                                newSkelLike.push(dInfo)
                                let huanfuEff = {
                                    name: '../../../皮肤切换/effects/transform/default',
                                    scale: 0.7,
                                    speed: 0.6,
                                    delay: 0.1,
                                }
                                let huanfuEffect = trans.effect
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

                                    newTransformEffects.push(huanfuEff)
                                }
                            }

                        }
                    }
                    for (let cond of Object.values(playParams.special.condition)) {
                        let transform = cond.transform
                        if (typeof transform === 'string') {
                            getNewSkel(transform)
                        } else if (Array.isArray(transform)) {
                            for (let t of transform) {
                                getNewSkel(t)
                            }
                        }

                    }
                    let basic = 6000
                    if (new Date().getTime() - _this.transformInitTime < 2000) {
                        _this.transformInitTime = _this.transformInitTime + 2000
                        basic = 6000 + _this.transformInitTime - new Date().getTime()
                    } else {
                        _this.transformInitTime = new Date().getTime()
                    }
                    setTimeout(() => {
                        if (newSkelLike.length) {
                            skinSwitch.chukuangWorkerApi.loadResources(newSkelLike, newTransformEffects)
                            player.dynamic.renderer.postMessage({
                                message: 'LOAD_RESOURCES',
                                id: player.dynamic.id,
                                players: newSkelLike,
                            })
                        }
                    }, basic)
                }
            }
            if (isPlayer && player.originSkin && !playParams._transform) {
                delete player.originSkin
            }
            if (isPlayer) {
                let key = isPrimary ? 'damagePrimaryTransform' : 'damageDeputyTransform'
                if (player[key]) delete player[key]
            }
            if (!isPlayer && player.originSkin2 && !playParams._transform) {
                delete player.originSkin2;
            }
            let checkChangeSkin = () => {
                let skinPath = playParams.name
                let lastIdx = skinPath.lastIndexOf('/')
                let foldPath
                if (lastIdx === -1) {
                    foldPath = ''
                } else {
                    foldPath = skinPath.slice(0, lastIdx)
                }
                let path = skinSwitch.dcdPath + '/assets/dynamic/' + foldPath + '/' + playParams.skinName + '.jpg'
                skinSwitch.qhly_checkFileExist(path, exists => {
                    if (exists) {
                        let avatar = player.getElementsByClassName((isPrimary ? 'primary' : 'deputy') + '-avatar')
                        if (avatar.length) {
                            avatar[0].style.backgroundImage = 'url("' + lib.assetURL + path + '")'
                        }
                    }
                })
            }
            if (isPlayer) {
                if (!player._inits) {
                    player._inits = []
                }
                player._inits.push(function () {
                    checkChangeSkin()
                    initPlayerAudio()
                })
            }
            if (isPlayer && player.name1) {
                initPlayerAudio()
                checkChangeSkin()
                if (playParams._needUpdateAudio) {
                    setTimeout(() => {
                        skinSwitch.reloadAudioForSkin(player, isPrimary, playParams.audio);
                    }, 500);
                }
            }
            skinSwitch.chukuangWorkerInit()
            if (!isPrimary && player.dynamic.deputy) {
                skinSwitch.chukuangWorkerApi.preLoad(player.dynamic.id, player.dynamic.deputy.id, playParams)
            }
            else if (isPrimary && player.dynamic.primary) {
                skinSwitch.chukuangWorkerApi.preLoad(player.dynamic.id, player.dynamic.primary.id, playParams)
            }
        },
    }
}

