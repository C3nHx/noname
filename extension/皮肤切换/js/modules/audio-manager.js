export function createAudioManagerMethods(game, skinSwitch) {
    return {
        cleanupAfterStopDynamic: function (player, primary, deputy) {
            let clearAudioMap = (name) => {
                if (skinSwitch.avatarAudioSkinMap) {
                    let avatarKeys = skinSwitch.avatarAudioSkinMap[name]
                    if (avatarKeys) {
                        for (let key in avatarKeys) {
                            delete skinSwitch.audioMap[key]
                        }
                        delete skinSwitch.avatarAudioSkinMap[name]
                    }
                    console.log('skinSwitch.audioMap', skinSwitch.audioMap, 'skinSwitch.avatarAudioSkinMap', skinSwitch.avatarAudioSkinMap)
                }
            }
            if (primary && player.name1) {
                clearAudioMap(player.name1)
            }
            if (deputy && player.name2) {
                clearAudioMap(player.name2)
            }
        },
        reloadAudioForSkin: function (player, isPrimary, audioConfig) {
            if (!player || !player.isAlive() || !player.dynamic) {
                return;
            }
            let name = isPrimary ? player.name1 : player.name2;
            if (!name) return;
            let id = player.dynamic.id;
            let skinId = isPrimary ?
                (player.dynamic.primary ? player.dynamic.primary.id : null) :
                (player.dynamic.deputy ? player.dynamic.deputy.id : null);
            if (!skinId) return;
            console.log('开始重新加载语音:', name, id, skinId, '当前位置:', isPrimary ? '主将' : '副将');
            this.clearAllAudioMappings(name, id, skinId);
            if (!audioConfig) {
                console.warn('觉醒切换皮肤 - 无法获取音频配置，跳过语音重新加载');
                return;
            }
            let skillPath = audioConfig.skill;
            let cardPath = audioConfig.card;
            if (!skillPath && !cardPath) return;
            let rootPath = skinSwitch.dcdPath + '/assets/dynamic/';
            if (!skinSwitch.audioMap) {
                skinSwitch.audioMap = {};
            }
            if (!skinSwitch.avatarAudioSkinMap) {
                skinSwitch.avatarAudioSkinMap = {};
            }
            skinSwitch.avatarAudioSkinMap[name] = {};
            let qhly_earse_ext = function (path) {
                let foundDot = path.lastIndexOf('.');
                if (foundDot < 0) return path;
                return path.slice(0, foundDot);
            };
            console.log('开始重建语音映射...');
            this.rebuildAudioMappings(name, id, skinId, skillPath, cardPath, rootPath, qhly_earse_ext);
            this.ensureAudioSystemInitialized(id, skinId);
            console.log('已重新初始化语音系统', name, id, skinId);
        },
        clearAllAudioMappings: function (name, id, skinId) {
            console.log('清除所有语音映射:', name, id, skinId);
            if (skinSwitch.avatarAudioSkinMap && skinSwitch.avatarAudioSkinMap[name]) {
                for (let key in skinSwitch.avatarAudioSkinMap[name]) {
                    delete skinSwitch.audioMap[key];
                }
                delete skinSwitch.avatarAudioSkinMap[name];
            }
            const keysToRemove = [];
            for (let key in skinSwitch.audioMap) {
                if (key.startsWith('skill/') ||
                    key.startsWith('die/' + name) ||
                    key.includes('/' + id + '/' + skinId + '/') ||
                    key.includes('/effect/' + id + '/' + skinId)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                console.log('删除旧语音映射:', key);
                delete skinSwitch.audioMap[key];
            });
            console.log('清除了', keysToRemove.length, '个旧的语音映射');
        },
        rebuildAudioMappings: function (name, id, skinId, skillPath, cardPath, rootPath, qhly_earse_ext) {
            console.log('重建语音映射:', { name, id, skinId, skillPath, cardPath, rootPath });
            if (!skinSwitch.audioMap) {
                skinSwitch.audioMap = {};
            }
            if (!skinSwitch.avatarAudioSkinMap) {
                skinSwitch.avatarAudioSkinMap = {};
            }
            if (!skinSwitch.avatarAudioSkinMap[name]) {
                skinSwitch.avatarAudioSkinMap[name] = {};
            }
            skinSwitch.avatarAudioSkinMap[name]['_rebuilding'] = true;
            if (skillPath) {
                this.buildSkillAudioMapping(name, id, skinId, skillPath, rootPath, qhly_earse_ext);
            }
            if (cardPath) {
                this.buildCardAudioMapping(name, id, skinId, cardPath, rootPath, qhly_earse_ext);
            }
            setTimeout(() => {
                this.refreshAudioSystemCache(name, id, skinId);
            }, 100);
        },
        buildSkillAudioMapping: function (name, id, skinId, skillPath, rootPath, qhly_earse_ext) {
            let skillRootPath = rootPath;
            let path = skillRootPath + skillPath;
            console.log('构建技能语音映射:', path);
            this.safeGetFileList(path, (folds, files) => {
                let mappingCount = 0;
                for (let file of files) {
                    file = qhly_earse_ext(file);
                    let key;
                    let audioPath = '../' + path + '/' + file;
                    if (file === name) {
                        key = 'die/' + file;
                    } else if (file === 'victory' || file === 'win') {
                        key = 'effect/' + id + '/' + skinId + '/' + 'victory';
                    } else {
                        key = 'skill/' + file;
                    }
                    skinSwitch.audioMap[key] = audioPath;
                    skinSwitch.avatarAudioSkinMap[name][key] = audioPath;
                    mappingCount++;
                    console.log('添加技能语音映射:', key, '->', audioPath);
                }
                console.log('技能语音映射构建完成，共', mappingCount, '个文件');
            }, (error) => {
                console.warn('技能语音目录访问失败:', skillPath, error);
            });
        },
        buildCardAudioMapping: function (name, id, skinId, cardPath, rootPath, qhly_earse_ext) {
            let cardRootPath = rootPath;
            let path = cardRootPath + cardPath;
            console.log('构建卡牌语音映射:', path);
            this.safeGetFileList(path, (folds, files) => {
                let mappingCount = 0;
                for (let file of files) {
                    file = qhly_earse_ext(file);
                    let key = 'card/' + id + '/' + skinId + '/' + file;
                    let audioPath = '../' + path + '/' + file;
                    skinSwitch.audioMap[key] = audioPath;
                    skinSwitch.avatarAudioSkinMap[name][key] = audioPath;
                    mappingCount++;
                    console.log('添加卡牌语音映射:', key, '->', audioPath);
                }
                console.log('卡牌语音映射构建完成，共', mappingCount, '个文件');
            }, (error) => {
                console.warn('卡牌语音目录访问失败:', cardPath, error);
            });
        },
        refreshAudioSystemCache: function (name, id, skinId) {
            console.log('刷新语音系统缓存:', name, id, skinId);
            if (skinSwitch.avatarAudioSkinMap && skinSwitch.avatarAudioSkinMap[name]) {
                delete skinSwitch.avatarAudioSkinMap[name]['_rebuilding'];
                skinSwitch.avatarAudioSkinMap[name]['_lastRefresh'] = Date.now();
            }
            console.log('当前语音映射状态:', {
                audioMapSize: Object.keys(skinSwitch.audioMap).length,
                characterMappings: skinSwitch.avatarAudioSkinMap[name] ? Object.keys(skinSwitch.avatarAudioSkinMap[name]).length : 0
            });
            if (skinSwitch.pfqh_originPlayAudio && skinSwitch.qfqh_originPlaySkillAudio) {
                console.log('语音系统已重新初始化，新的语音映射生效');
            }
        },
        safeGetFileList: function (path, callback, errorCallback) {
            try {
                game.getFileList(path, function (folds, files) {
                    if (files && files.length > 0) {
                        console.log('成功读取语音目录:', path, files.length + '个文件');
                        if (callback) callback(folds, files);
                    } else {
                        console.warn('语音目录为空:', path);
                        if (errorCallback) errorCallback('目录为空');
                    }
                });
            } catch (e) {
                console.warn('语音目录访问失败:', path, e.message);
                if (errorCallback) errorCallback(e);
            }
        },
        loadAudioFiles: function (name, id, skinId, skillPath, cardPath, rootPath, qhly_earse_ext) {
            if (skillPath) {
                let skillRootPath = rootPath;
                let path = skillRootPath + skillPath;
                this.safeGetFileList(path, function (folds, files) {
                    for (let file of files) {
                        file = qhly_earse_ext(file);
                        let key;
                        if (file === name) {
                            key = 'die/' + file;
                            skinSwitch.audioMap[key] = '../' + path + '/' + file;
                        } else if (file === 'victory' || file === 'win') {
                            key = 'effect/' + id + '/' + skinId + '/' + 'victory';
                            skinSwitch.audioMap[key] = '../' + path + '/' + file;
                        } else {
                            key = 'skill/' + file;
                            skinSwitch.audioMap[key] = '../' + path + '/' + file;
                        }
                        if (skinSwitch.avatarAudioSkinMap[name]) {
                            skinSwitch.avatarAudioSkinMap[name][key] = null;
                        }
                    }
                    console.log('重新加载语音完成 - 技能语音', name, id, skinId, skillPath);
                }, function (error) {
                    console.warn('技能语音目录访问失败:', skillPath, error);
                });
            }
            if (cardPath) {
                let cardRootPath = rootPath;
                let path = cardRootPath + cardPath;
                this.safeGetFileList(path, function (folds, files) {
                    for (let file of files) {
                        file = qhly_earse_ext(file);
                        let key = 'card/' + id + '/' + skinId + '/' + file
                        skinSwitch.audioMap[key] = '../' + path + '/' + file
                        skinSwitch.avatarAudioSkinMap[name][key] = null
                    }
                    console.log('重新加载语音完成 - 卡牌语音', name, id, skinId, cardPath);
                }, function (error) {
                    console.warn('卡牌语音目录访问失败:', cardPath, error);
                });
            }
        },
        ensureAudioSystemInitialized: function (id, skinId) {
            if (!skinSwitch.pfqh_originPlayAudio) {
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
                    let replaces = string.split('/');
                    let replace = '';
                    if (string.startsWith('/skill') && replaces.length === 3) {
                        replace = string.slice(1);
                    } else if (string.startsWith('/die') && replaces.length === 3) {
                        replace = string.slice(1);
                    } else if (string.startsWith('/effect/win')) {
                        replace = 'effect/' + id + '/' + skinId + '/' + 'victory';
                    }
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
            }
            if (!skinSwitch.qfqh_originPlaySkillAudio) {
                skinSwitch.qfqh_originPlaySkillAudio = game.playSkillAudio;
                game.playSkillAudio = function (name, index) {
                    let replaceKey = "skill/" + name;
                    if (!index) {
                        index = Math.ceil(Math.random() * 2);
                    }
                    replaceKey = replaceKey + index;
                    let rp = skinSwitch.audioMap[replaceKey];
                    if (rp) {
                        let args = rp.split("/");
                        return skinSwitch.pfqh_originPlayAudio.apply(this, args);
                    }
                    return skinSwitch.qfqh_originPlaySkillAudio.apply(this, arguments);
                };
            }
        },
    }
}

