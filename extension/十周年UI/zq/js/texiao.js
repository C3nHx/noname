"use strict";
decadeModule.import((lib, game, ui, get, ai, _status) => {
    if (lib.config.extension_十周年UI_kapaitexiao) {
        //卡牌使用时特效
        lib.skill._dUI_usecard = {
            trigger: {
                player: ["useCardBegin", "respondBegin"],
            },
            charlotte: true,
            forced: true,
            firstDo: true,
            filter: function (event, player) {
                return event.card && event.card.name;
            },
            content: function () {
                const t = trigger.card.name;
                //● 性能优化：移除 game 参数——game 是庞大的全局对象，stringifiedResult 会对其递归8层深拷贝
                game.broadcastAll(
                    function (player, t) {
                        if (window.decadeUI && lib.config.extension_十周年UI_kapaitexiao) {
                            switch (t) {
                                case "sha":
                                    window.decadeUI.animation.playSpine({ name: "card/sha", speed: 0.8 }, { scale: 1.5, parent: player });
                                    break;
                                case "shan":
                                    window.decadeUI.animation.playSpine({ name: "card/shan", speed: 0.8 }, { scale: 1.5, parent: player });
                                    break;
                                case "jiu":
                                    window.decadeUI.animation.playSpine(
                                        { name: "card/jiu", speed: 0.8 },
                                        { scale: 0.85, x: [0, 0.55], y: [0, 0.45], parent: player }
                                    );
                                    break;
                                case "tao":
                                    window.decadeUI.animation.playSpine(
                                        { name: "card/tao", speed: 0.8 },
                                        { scale: 0.85, y: [0, 0.45], parent: player }
                                    );
                                    break;

                                //群体
                                case "nanman":
                                    window.decadeUI.animation.playSpine({ name: "card/nanmanruqin" }, { scale: 0.7 });
                                    game.playAudio("../extension/十周年UI/audio/nanmanruqin.mp3");
                                    break;
                                case "wanjian":
                                    window.decadeUI.animation.playSpine({ name: "card/wanjianqifa" }, { scale: 0.95 });
                                    game.playAudio("../extension/十周年UI/audio/wanjianqifa.mp3");
                                    break;
                                case "taoyuan":
                                    window.decadeUI.animation.playSpine({ name: "card/taoyuanjieyi" }, { scale: 0.95 });
                                    game.playAudio("../extension/十周年UI/audio/taoyuanjieyi.mp3");
                                    break;
                                case "wugu":
                                    for (var i of game.players) {
                                        window.decadeUI.animation.playSpine({ name: "card/wugufengdeng", speed: 0.7 }, { scale: 0.7, parent: i });
                                    }
                                    break;

                                //锦囊
                                case "wuzhong":
                                    window.decadeUI.animation.playSpine(
                                        { name: "card/wuzhongshengyou", speed: 1.3 },
                                        { scale: 0.45, parent: player }
                                    );
                                    break;
                                case "wuxie":
                                    window.decadeUI.animation.playSpine({ name: "card/wuxiekeji" }, { scale: 0.7, parent: player });
                                    game.playAudio("../extension/十周年UI/audio/wuxiekeji.mp3");
                                    break;
                                case "juedou":
                                    window.decadeUI.animation.playSpine({ name: "card/juedou", speed: 1.5 }, { scale: 0.8 });
                                    game.playAudio("../extension/十周年UI/audio/juedou.mp3");
                                    break;
                                case "huogong":
                                    window.decadeUI.animation.playSpine({ name: "card/huogong", speed: 5 }, { scale: 0.75, angle: 180 });
                                    game.playAudio("../extension/十周年UI/audio/huogong.mp3");
                                    break;

                                //国战
                                case "gz_wenheluanwu":
                                    window.decadeUI.animation.playSpine({ name: "card/effect_wenheluanwu" }, { scale: 1 });
                                    game.playAudio("../extension/十周年UI/audio/effect_wenheluanwu.mp3");
                                    break;
                                case "gz_guguoanbang":
                                    window.decadeUI.animation.playSpine({ name: "card/effect_guguoanbang" }, { scale: 1 });
                                    game.playAudio("../extension/十周年UI/audio/effect_guguoanbang.mp3");
                                    break;
                                case "gz_kefuzhongyuan":
                                    window.decadeUI.animation.playSpine({ name: "card/effect_kefuzhongyuan" }, { scale: 1 });
                                    game.playAudio("../extension/十周年UI/audio/effect_kefuzhongyuan.mp3");
                                    break;
                                case "gz_haolingtianxia":
                                    window.decadeUI.animation.playSpine({ name: "card/effect_haolingtianxia" }, { scale: 1 });
                                    game.playAudio("../extension/十周年UI/audio/effect_haolingtianxia.mp3");
                                    break;
                            }
                        }
                //● 移除 game 参数，仅传 player（自动序列化为 playerid）和 t（字符串）
                    },
                    player,
                    t
                );
            },
        };
        //●卡牌结算特效
        lib.skill._deUI_usecardtoBegin = {
            trigger: {
                player: "useCardToBegin",
            },
            forced: true,
            lastDo: true,
            priority: -1,
            charlotte: true,
            filter: function (event, player) {
                return event._triggered && event._triggered < 5;
            },
            content: function () {
                //过河拆桥
                if (trigger.card && get.name(trigger.card, player) == "guohe" && trigger.target && trigger.target != player) {
                    const t = trigger.target;
                    game.broadcastAll(function (t) {
                        if (window.decadeUI) {
                            window.decadeUI.animation.playSpine(
                                { name: "guohechaiqiao", action: "zizouqi_guohechaiqiao_futou" },
                                { scale: 0.8, parent: t }
                            );
                            window.decadeUI.animation.playSpine(
                                { name: "guohechaiqiao", action: "zizouqi_guohechaiqiao_qiao" },
                                { scale: 0.8, parent: t }
                            );
                            game.playAudio("../extension/十周年UI/audio/guohechaiqiao.mp3");
                        }
                    }, t);
                }
                //顺手牵羊
                if (trigger.card && trigger.card.name == "shunshou") {
                    if (trigger.target) {
                        const t = trigger.target;
                        game.broadcastAll(function (t) {
                            if (window.decadeUI)
                                window.decadeUI.animation.playSpine(
                                    { name: "shunshouqianyang", action: "yangchuxian", speed: 1.5 },
                                    { scale: 0.65, parent: t }
                                );
                            game.playAudio("../extension/十周年UI/audio/shunshouqianyang.mp3");
                        }, t);
                    }
                    setTimeout(function () {
                        game.broadcastAll(function (player) {
                            if (window.decadeUI)
                                window.decadeUI.animation.playSpine(
                                    { name: "shunshouqianyang", action: "yangchuxian", speed: 1.5 },
                                    { scale: 0.65, parent: player }
                                );
                        }, player);
                    }, 600);
                }
            },
        };
    }
    if (lib.config.extension_十周年UI_shoushatexiao) {
        //●联机同步已有的特效
        if (_status.connectMode) {
            //失去体力
            lib.skill._player_loseHp = {
                charlotte: true,
                forced: true,
                firstDo: true,
                trigger: { player: "loseHpBegin" },
                content() {
                    game.broadcastAll(function (player) {
                        if (window.decadeUI) window.decadeUI.animation.playSpine({ name: "effect_loseHp" }, { scale: 0.6, parent: player });
                    }, player);
                },
            };
            //虚拟数字
            lib.skill._player_xunishuzi = {
                priority: 10,
                forced: true,
                trigger: { player: "damage" },
                filter(event) {
                    return event.num >= 0 && event.num <= 9 && event.unreal;
                },
                content() {
                    var action = "play" + trigger.num.toString();
                    if (action) {
                        game.broadcastAll(function (player) {
                            if (window.decadeUI)
                                window.decadeUI.animation.playSpine(
                                    { name: "globaltexiao/xunishuzi/SS_PaiJu_xunishanghai", speed: 0.6 },
                                    { scale: 0.6, parent: player }
                                );
                        }, player);
                    }
                },
            };
        } //联机结束

        //●免伤
        lib.skill._player_missdamage = {
            trigger: {
                player: ["damageZero", "damageCancelled"],
            },
            forced: true,
            charlotte: true,
            content: function () {
                game.broadcastAll(function (player) {
                    if (window.decadeUI)
                        window.decadeUI.animation.playSpine({ name: "Ss_PaiJu_wushang", speed: 0.8 }, { scale: 0.8, parent: player });
                }, player);
            },
        };

        //●救我特效
        game.SS_jiuwo = function (player, bool) {
            if (bool == null) return;
            if (!player) player = game.me;
            game.broadcastAll(function (player, bool) {
                if (window.decadeUI) {
                    var id = player.playerid*95;
                    if(bool){
                        if (!_status[id]) _status[id] = decadeUI.animation.playSpine({ name: "SS_jiuwo", speed: 0.5, loop: false }, { y: [0, 0.4], scale: 0.8, parent: player });
                        if (_status[id] == undefined) delete _status[id];
                        if (_status[id]) _status[id].loop = true;
                    } else if (_status[id]) setTimeout(function () {
                        if (_status[id]) {
                            decadeUI.animation.stopSpine(_status[id]);
                            delete _status[id];
                        }
                    }, 300);
                }
            }, player, bool);
        }
        lib.skill._jiuwo_ = {
            trigger: { player: "dyingBegin" },
            firstDo: true, silent: true, charlotte: true, forceDie: true, forced: true, popup: false,
            content() { game.SS_jiuwo?.(player, true) }
        };
        lib.skill._delete_jiuwo_ = {
            trigger: { player: ["changeHp", "dyingAfter", "dieBefore", "phaseAfter"] },
            firstDo: true, silent: true, charlotte: true, forceDie: true, forced: true, popup: false, priority: 9999,
            filter: function (event, player) {
                if (event.name == "changeHp") return player.hp>0;
                return true;
            },
            content() { game.SS_jiuwo?.(player, false) },
        };

        //●技能特效
        lib.skill._logskill_jinengX = {
            trigger: {
                player: ["logSkillBegin", "useSkillBegin"],
            },
            filter: function (event, player) {
                if (event.name == "logSkill") {
                    if (!event.parent) return false;
                    var skill = event.parent.skill;
                } else var skill = event.skill;
                if (!skill || skill == get.translation(skill) || lib.skill.global.includes(skill)) return false;
                var info = get.info(skill);
                return info && !info.charlotte && !info.equipSkill;
            },
            priority: 523,
            charlotte: true,
            forced: true,
            popup: false,
            silent: true,
            content: function () {
                //game.delay(0.5);
                var info = get.info(trigger.skill);
                //● 性能优化：预提取 info 中的布尔值，避免序列化整个技能定义对象
                var isZhuanhuanji = !!(info.zhuanhuanji || info.zhuanhuanji2);
                var isEnableActive = !!(info.enable && !info.skillAnimation);
                game.broadcastAll(
                    function (isZhuanhuanji, isEnableActive, player) {
                        if (window.decadeUI) {
                            if (isZhuanhuanji) {
                                window.decadeUI.animation.playSpine("zhuanhuanji", { scale: 0.8, parent: player });
                            } else {
                                if (lib.config.extension_十周年UI_newDecadeStyle == "off") {
                                    if (isEnableActive) {
                                        //主动技
                                        window.decadeUI.animation.playSpine("jinengXX", {
                                            scale: 1.12, x: [0, 0.34], y: [0, 0.51],
                                            speed: 1.3, opacity: 0.8, parent: player,
                                        });
                                    } else {
                                        window.decadeUI.animation.playSpine(
                                            { name: "baikuang", speed: 1.2 },
                                            { x: [0, 0.51], y: [0, 0.49], scale: 0.6, parent: player }
                                        ); //白框
                                        window.decadeUI.animation.playSpine(
                                            { name: "jineng", speed: 0.9 },
                                            { scale: 0.8, x: [-49, 0], y: [-31, 0], parent: player }
                                        ); //金光
                                    }
                                } else {
                                    window.decadeUI.animation.playSpine("jinengX", { scale: 1.3, y: [0, 0.43], speed: 1.2, parent: player });
                                }
                            }
                        }
                    },
                    isZhuanhuanji,
                    isEnableActive,
                    player
                );
            },
        };

        //●连杀特效
        lib.skill._szn_lianshatexiao = {
            trigger: {
                player: "_jisha_trigger",
            },
            charlotte: true,
            forced: true,
            popup: false,
            silent: true,
            priority: 2021,
            filter: function (event, player) {
                return true;
            },
            content: function () {
                game.delay(3, 2);
                game.broadcastAll(function (player) {
                    if (window.decadeUI) {
                        if (lib.config.extension_十周年UI_newDecadeStyle == "off") {
                            if (player.storage._jisha_texiao == 1) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoushajisha",
                                    action: "yipo",
                                    scale: 0.9,
                                    speed: 1.2,
                                });
                                game.playAudio("../extension/十周年UI/audio/jisha_1.mp3");
                            }
                            if (player.storage._jisha_texiao == 2) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoushajisha",
                                    action: "shuanglian",
                                    scale: 0.9,
                                    speed: 1.2,
                                });
                                game.playAudio("../extension/十周年UI/audio/jisha_2.mp3");
                            }
                            if (player.storage._jisha_texiao == 3) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoushajisha",
                                    action: "sanlian",
                                    scale: 0.9,
                                    speed: 1.2,
                                });
                                game.playAudio("../extension/十周年UI/audio/jisha_3.mp3");
                            }
                            if (player.storage._jisha_texiao == 4) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoushajisha",
                                    action: "silian",
                                    scale: 0.9,
                                    speed: 1.2,
                                });
                                game.playAudio("../extension/十周年UI/audio/jisha_4.mp3");
                            }
                            if (player.storage._jisha_texiao == 5) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoushajisha",
                                    action: "wulian",
                                    scale: 0.9,
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/jisha_5.mp3");
                            }
                            if (player.storage._jisha_texiao == 6) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoushajisha",
                                    action: "liulian",
                                    scale: 0.9,
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/jisha_6.mp3");
                            }
                            if (player.storage._jisha_texiao >= 7) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoushajisha",
                                    action: "qilian",
                                    scale: 0.9,
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/jisha_7.mp3");
                            }
                        } else {
                            if (player.storage._jisha_texiao == 1) {
                                window.decadeUI.animation.playSpine({
                                    name: "shoupo",
                                    scale: 0.7,
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/liansha_1.mp3");
                            }
                            if (player.storage._jisha_texiao == 2) {
                                window.decadeUI.animation.playSpine({
                                    name: "lianpo",
                                    scale: 0.7,
                                    speed: 0.8,
                                });
                                window.decadeUI.animation.playSpine({
                                    name: "qy_SF_eff_lianzhan_lv2_zi",
                                    scale: 0.7,
                                    x: [0, 0.9],
                                    y: [0, 0.15],
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/liansha_2.mp3");
                            }
                            if (player.storage._jisha_texiao == 3) {
                                window.decadeUI.animation.playSpine({
                                    name: "sanpo",
                                    scale: 0.7,
                                    speed: 0.8,
                                });
                                window.decadeUI.animation.playSpine({
                                    name: "qy_SF_eff_lianzhan_lv3_zi",
                                    scale: 0.7,
                                    x: [0, 0.9],
                                    y: [0, 0.15],
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/liansha_3.mp3");
                            }
                            if (player.storage._jisha_texiao == 4) {
                                window.decadeUI.animation.playSpine({
                                    name: "sipo",
                                    scale: 0.7,
                                    speed: 0.8,
                                });
                                window.decadeUI.animation.playSpine({
                                    name: "qy_SF_eff_lianzhan_lv4_zi",
                                    scale: 0.7,
                                    x: [0, 0.9],
                                    y: [0, 0.15],
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/liansha_4.mp3");
                            }
                            if (player.storage._jisha_texiao == 5) {
                                window.decadeUI.animation.playSpine({
                                    name: "wupo",
                                    scale: 0.7,
                                    speed: 0.8,
                                });
                                window.decadeUI.animation.playSpine({
                                    name: "qy_SF_eff_lianzhan_lv5_zi",
                                    scale: 0.7,
                                    x: [0, 0.9],
                                    y: [0, 0.15],
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/liansha_5.mp3");
                            }
                            if (player.storage._jisha_texiao == 6) {
                                window.decadeUI.animation.playSpine({
                                    name: "liupo",
                                    scale: 0.7,
                                    speed: 0.8,
                                });
                                window.decadeUI.animation.playSpine({
                                    name: "qy_SF_eff_lianzhan_lv6_zi",
                                    scale: 0.7,
                                    x: [0, 0.9],
                                    y: [0, 0.15],
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/liansha_6.mp3");
                            }
                            if (player.storage._jisha_texiao >= 7) {
                                window.decadeUI.animation.playSpine({
                                    name: "qipo",
                                    scale: 0.7,
                                    speed: 0.8,
                                });
                                window.decadeUI.animation.playSpine({
                                    name: "qy_SF_eff_lianzhan_lv7_zi",
                                    scale: 0.7,
                                    x: [0, 0.9],
                                    y: [0, 0.15],
                                    speed: 0.8,
                                });
                                game.playAudio("../extension/十周年UI/audio/liansha_7.mp3");
                            }
                        }
                    }
                }, player);
            },
        };
        lib.skill._szn_lianshatexiaoTrigger = {
            //时机
            trigger: {
                source: "dieBegin",
            },
            forced: true,
            charlotte: true,
            locked: true,
            popup: false,
            silent: true,
            unique: true,
            priority: -111,
            lastDo: true,
            content: function () {
                if (!player.storage._jisha_texiao) player.storage._jisha_texiao = 0;
                if (player.storage._jisha_texiao < 7) {
                    player.storage._jisha_texiao++;
                    player.markSkill("_jisha_texiao");
                    player.syncStorage("_jisha_texiao");
                    player.update();
                }
                event.trigger("_jisha_trigger");
            },
        };
        lib.skill._shousha_onDead = {
            //音效
            trigger: {
                player: "dieBegin",
            },
            charlotte: true,
            //forceDie:true,
            priority: -111,
            lastDo: true,
            forced: true,
            silent: true,
            popup: false,
            content: function () {
                game.broadcastAll(function () {
                    if (lib.config.extension_十周年UI_newDecadeStyle == "off") game.playAudio("../extension/十周年UI/audio/ss_dead.mp3");
                    else game.playAudio("../extension/十周年UI/audio/ss_jisha.mp3");
                });
            },
        };

        //●恢复体力
        lib.skill._szn_miaoshouhuichun = {
            //累计三次濒死时被其他人救回
            trigger: {
                player: "ssmiaoshouhuichun",
            },
            filter: function (event, player) {
                return true;
            },
            priority: 523,
            charlotte: true,
            popup: false,
            silent: true,
            forced: true,
            content: function () {
                game.delay(2, 2);
                game.broadcastAll(function () {
                    if (window.decadeUI) {
                        if (lib.config.extension_十周年UI_newDecadeStyle == "off") {
                            window.decadeUI.animation.playSpine({
                                name: "ss_miaoshouhuichun",
                                scale: 0.7,
                                speed: 0.8,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_miaoshouhuichun.mp3");
                        } else {
                            window.decadeUI.animation.playSpine({
                                name: "shenyimiaoshou",
                                scale: 0.68,
                                y: [0, 0.52],
                                speed: 0.8,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_shenyimiaoshou.mp3");
                        }
                    }
                });
            },
        };
        lib.skill._szn_yishugaochao = {
            //一回合内恢复3体力
            trigger: {
                player: "ssyishugaochao",
            },
            filter: function (event, player) {
                return true;
            },
            priority: 523,
            charlotte: true,
            forced: true,
            popup: false,
            silent: true,
            content: function () {
                game.delay(2, 2);
                game.broadcastAll(function () {
                    if (window.decadeUI) {
                        if (lib.config.extension_十周年UI_newDecadeStyle == "off") {
                            window.decadeUI.animation.playSpine({
                                name: "ss_yishugaochao",
                                scale: 0.7,
                                speed: 0.8,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_yishugaochao.mp3");
                        } else {
                            window.decadeUI.animation.playSpine({
                                name: "qingnangjishi",
                                scale: 0.68,
                                y: [0, 0.52],
                                speed: 0.8,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_qingnangjishi.mp3");
                        }
                    }
                });
            },
        };
        lib.skill._yishugaochao_storage = {
            trigger: {
                player: "recoverEnd",
            },
            filter: function (event, player) {
                return event.source != undefined;
            },
            direct: true,
            charlotte: true,
            popup: false,
            silent: true,
            content: function () {
                if (trigger.source != player) {
                    if (trigger.source.storage.ss_miaoshouhuichun == undefined) {
                        trigger.source.storage.ss_miaoshouhuichun = 0;
                    }
                    if (trigger.source.storage.ss_miaoshouhuichun >= 3) {
                        delete trigger.source.storage.ss_miaoshouhuichun;
                        _status.event.trigger("ssmiaoshouhuichun");
                    }
                }
                //else if(_status.currentPhase == player) {
                if (player.storage.ss_yishugaochao == undefined) {
                    player.storage.ss_yishugaochao = trigger.num;
                } else {
                    player.storage.ss_yishugaochao += trigger.num;
                }
                if (player.storage.ss_yishugaochao >= 3) {
                    delete player.storage.ss_yishugaochao;
                    _status.event.trigger("ssyishugaochao");
                }
                //}
            },
        };
        lib.skill._miaoshouhuichun_storage = {
            trigger: {
                player: "recoverBegin",
            },
            filter: function (event, player) {
                if (event.num <= -event.player.hp) return false;
                return event.source != undefined && player != event.source && player.isDying();
            },
            direct: true,
            charlotte: true,
            popup: false,
            silent: true,
            lastDo: true,
            content: function () {
                if (trigger.source.storage.ss_miaoshouhuichun == undefined) {
                    trigger.source.storage.ss_miaoshouhuichun = 1;
                } else {
                    trigger.source.storage.ss_miaoshouhuichun += 1;
                }
            },
        };
        lib.skill._delete_yishugaochao = {
            trigger: {
                global: "phaseAfter",
            },
            direct: true,
            charlotte: true,
            popup: false,
            silent: true,
            content: function () {
                delete player.storage.ss_yishugaochao;
                //添加以下注释击杀特效仅统计一回合内
                //delete player.storage._jisha_texiao;
            },
        };

        //●高伤害
        lib.skill._szn_diankuangtulu = {
            //癫狂屠戮
            trigger: {
                source: "damageBegin4",
            },
            forced: true,
            charlotte: true,
            popup: false,
            silent: true,
            priority: -523,
            lastDo: true,
            filter: function (event, player) {
                return event.num == 3;
            },
            content: function () {
                game.delay(2, 2);
                game.broadcastAll(function () {
                    if (window.decadeUI) {
                        if (lib.config.extension_十周年UI_newDecadeStyle == "off") {
                            window.decadeUI.animation.playSpine({
                                name: "Xdiankuangtulu", //手杀
                                scale: 0.55,
                                y: [0, 0.48],
                                speed: 0.8,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_diankuangtulu.mp3");
                        } else {
                            window.decadeUI.animation.playSpine({
                                name: "wanfumodi", //十周年
                                scale: 0.7,
                                speed: 0.8,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_wanfumodi.mp3");
                        }
                    }
                });
            },
        };
        lib.skill._szn_wanjunqushou = {
            //万军取首
            trigger: {
                source: "damageBegin4",
            },
            charlotte: true,
            forced: true,
            popup: false,
            silent: true,
            priority: -523,
            lastDo: true,
            filter: function (event, player) {
                return event.num >= 4;
            },
            content: function () {
                game.delay(2, 2);
                game.broadcastAll(function () {
                    if (window.decadeUI) {
                        if (lib.config.extension_十周年UI_newDecadeStyle == "off") {
                            window.decadeUI.animation.playSpine({
                                name: "Xwushuangwanjunqushou", //手杀
                                scale: 0.45,
                                y: [0, 0.75],
                                speed: 0.8,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_wanjunqushou.mp3");
                        } else {
                            window.decadeUI.animation.playSpine({
                                name: "shenweizhengqiankun", //十周年
                                scale: 0.7,
                                speed: 1.15,
                            });
                            game.playAudio("../extension/十周年UI/audio/ss_shenweizhengqiankun.mp3");
                        }
                    }
                });
            },
        };
    }
});
