export function createFileManagerMethods(lib, game, ui, skinSwitch) {
    return {
        backupFileDui: function () {
            if (!window.decadeUI) {
                alert("请先安装和开启十周年UI");
                return;
            }
            let backDir = skinSwitch.dcdPath + '/备份'
            game.ensureDirectory(backDir, function () {
                let progressBG = ui.create.div(".progressBG", ui.window)
                let progressBar = ui.create.div(progressBG)

                let files = ['animation.js', 'dynamicWorker.js', 'extension.js']
                let tasks = files.length
                let current = 0
                skinSwitch.addProgress(progressBar, current, tasks)

                for (let f of files) {
                    game.readFile(skinSwitch.dcdPath + '/' + f, function (data) {
                        game.writeFile(data, backDir, f, function () {
                            console.log(`备份${f}成功`)
                            skinSwitch.addProgress(progressBar, ++current, tasks)
                            if (current >= files.length) {
                                progressBG.style.opacity = "0";
                                skinSwitchMessage.show({
                                    type: 'success',
                                    text: '备份完成',
                                })
                            }
                        })
                    })
                }
            })
        },
        modifyFileDui: function () {
            if (confirm("会覆盖十周年原文件,请确认是否已经备份过原文件方便出错还原, 是否确认?")) {
                let progressBG = ui.create.div(".progressBG", ui.window)
                let progressBar = ui.create.div(progressBG)
                let files = ['animation.js', 'dynamicWorker.js']
                let tasks = files.length
                let current = 0
                skinSwitch.addProgress(progressBar, current, tasks)
                
                let cpWorkerFiles = ['dynamicWorker.js', 'animation.js']
                cpWorkerFiles.forEach(cpWorkerFile => {
                    game.readFile(skinSwitch.path + '/十周年UI/' + cpWorkerFile, function (data) {
                        game.writeFile(data, skinSwitch.dcdPath, cpWorkerFile, function () {
                            skinSwitch.addProgress(progressBar, ++current, tasks)
                            if (current >= tasks) {
                                game.saveConfig(skinSwitch.configKey.bakeup, true)
                                setTimeout(() => {
                                    progressBG.style.opacity = "0";
                                    if (confirm("导入备份十周年文件成功，点击确定将重启游戏")) {
                                        progressBG.remove();
                                        game.reload();
                                    }
                                }, 2500)
                            }
                        })
                    })
                })
            }
        },
        genDynamicSkin: function () {
            if (window.pfqhUtils) {
                if (decadeUI.dynamicSkin) {
                    let str = pfqhUtils.transformDdyskins(decadeUI.dynamicSkin)
                    game.writeFile(str, skinSwitch.path, '转换后_dynamicSkin.js', function () {
                        console.log('写入saveSkinParams.js成功')
                        skinSwitchMessage.show({
                            type: 'success',
                            text: '转换成功',
                            duration: 1500,
                            closeable: false,
                        })
                    })
                }
            }
        },
        genDyTempFile: function () {
            if (window.pfqhUtils && decadeUI.dynamicSkin) {
                if (decadeUI.dynamicSkin) {
                    skinSwitchMessage.show({
                        type: 'success',
                        text: '正在生成中, 请等待',
                        duration: 1500,
                    })
                    pfqhUtils.generateDynamicFile(lib, decadeUI.dynamicSkin)
                }
            }
        },
        resetDynamicData: function () {
            if (!lib.config[skinSwitch.decadeKey.dynamicSkin]) return alert("需要先打开十周年UI的动皮,再重置");
            if (!lib.config[skinSwitch.configKey.dynamicSkin]) alert("没有动皮存档可重置");
            if (confirm("你确定要重置动皮存档吗？完成后会自动重启游戏")) {
                game.saveConfig(skinSwitch.configKey.dynamicSkin, null)
                setTimeout(() => {
                    game.reload();
                }, 1000);
            }
        }
    };
}

