"use strict";
decadeModule.import((lib, game, ui, get, ai, _status) => {
    delete lib.extensionMenu["extension_十周年UI"].edit;
    if (lib.config.extension_十周年UI_newDecadeStyle == "off" && !["chess", "tafang"].includes(lib.config.mode)) game.saveConfig("show_round_menu", false);
    else if (_status.connectMode) game.saveConfig("show_round_menu", true);

    /*if (_status.connectMode) {
        if (lib.config.extension_十周年UI_dynamicSkin == true) {
            game.saveConfig("extension_十周年UI_dynamicSkin", false);
            lib.config.dynamicSkin = false;
            game.saveConfig("dynamicSkin", false);
            game.reload();
        }
    } else {
        if (lib.config.extensions.includes("皮肤切换") && lib.config["extension_皮肤切换_enable"]) {
            if (lib.config.extension_十周年UI_dynamicSkin == false) {
                game.saveConfig("extension_十周年UI_dynamicSkin", true);
                lib.config.dynamicSkin = true;
                game.saveConfig("dynamicSkin", true);
                game.reload();
            }
        }
    }*/

    if (game.zqWebVersion && game.zqWebVersion < 128 && !lib.config.extension_十周年UI_smallsuit && !lib.config.extension_十周年UI_smallsuit2){
        game.saveConfig('extension_十周年UI_smallsuit', true);
        game.saveConfig('extension_十周年UI_smallsuit2', true);
    }

    //●文件存在性判断
    game.FileExist = function (url) {
        if (window.XMLHttpRequest) {
            var http = new XMLHttpRequest();
        } else {
            var http = new ActiveXObject("Microsoft.XMLHTTP");
        }
        http.open("HEAD", url, false);
        try {
            http.send();
        } catch (err) {
            return false;
        }
        return http.status != 404;
    };
    //用法 if(game.FileExist(lib.assetURL+'extension/十周年UI/css/equip.css')){};

    window.zqEquipCss = function() {
        let style = document.createElement("style"), css;
        if (window.decadeUI) {
            css = `
                .player>.equips>div,
                .player>.equips>.card {position: absolute;}
                .player>.equips>.card {top: -16px;}
                .player>.equips>div.equip1 {top: 29px;}
                .player>.equips>div.equip2 {top: 45px;}
                .player>.equips>div.equip3,
                .player>.equips>div.equip6 {top: 61px;}
                .player>.equips>div.equip4 {top: 61px;left: 53px;bottom: 0;}
                .player>.equips>div.equip5 {top: 13px;}
            `;
        } else {
            css = `
                .player>.equips>div,
                .player>.equips>.card {position: absolute;}
                .player>.equips>.card {top: -16px;}
                .player>.equips>div.equip1 {top: -9px;}
                .player>.equips>div.equip2 {top: -1px;}
                .player>.equips>div.equip3,
                .player>.equips>div.equip6 {top: 7px;}
                .player>.equips>div.equip4 {top: 15px;bottom: 0;}
                .player>.equips>div.equip5 {top: -17px;}
            `;
        }
        style.innerHTML = css;
        document.head.appendChild(style);
    };

	        lib.skill._virtualCardThrowordered = {
                trigger: { player: ['useCard', 'respond'] },
                forceDie: true,
                forced: true,
                charlotte: true,
                locked: true,
                popup: false,
                silent: true,
                unique: true,
                priority: 9999,
                filter: function (event, player) {
                    return event.card?.name && (!event.cards || event.cards.length==0);
                },
                content: function () {
                    const cardName = trigger.card?.name;
                    if(cardName){
                        game.broadcastAll( (cardName, player) => {
                            const xuni = 'extension/十周年UI/zq/image/card-base/xuni.png';
                            const vcard = game.createCard(
                                cardName, 
                                game.FileExist && typeof game.FileExist === 'function' && game.FileExist(lib.assetURL+xuni) ? 
                                `<img src="${lib.assetURL + xuni}" style="position:absolute; height:1.9em; width:1em; z-index:4; transform: translate(-38%, -58%);">`
                                : '<font color="#AF1919">虚拟</font>', ''
                            );
                            if(vcard.dataset) vcard.dataset.virtual = 1;
                            player.$throwordered2(vcard.copy('thrown'), false);
                        }, cardName, player);
                    }
                },
            };

    //手杀美化
    if (lib.config.extension_十周年UI_newDecadeStyle == "off") {
        //●手杀双将名字显示
        if (lib.config.extension_十周年UI_shuangjiang) {
            lib.skill._shousha_shuangjiang = {
                trigger: {
                    global: ["gameStart", "changeCharacterAfter", "zqhongxian_judgeAfter"],
                },
                forced: true,
                filter: function (event, player) {
                    return lib.config.mode != "guozhan" && player.name != "shichangshi";
                },
                content: function () {
                    //● 性能优化：预提取 trigger.name 为字符串，避免序列化整个 trigger 事件对象
                    var triggerName = trigger.name;
                    var playerName2 = player.name2;
                    game.broadcastAll(
                        function (player, triggerName, playerName2) {
                            if (window.decadeUI && lib.config.extension_十周年UI_newDecadeStyle == "off") {
                                if (player._fujiangkuang && (!playerName2 || triggerName == "changeCharacter")) {
                                    if (player._fujiangkuang.parentNode) player._fujiangkuang.parentNode.removeChild(player._fujiangkuang);
                                    delete player._fujiangkuang;
                                }
                                if (
                                    playerName2 &&
                                    !player._fujiangkuang &&
                                    lib.character &&
                                    lib.character[playerName2] &&
                                    lib.character[playerName2].group
                                ) {
                                    var sj = document.createElement("img");
                                    group2 = lib.character[playerName2].group;
                                    sj.src = window.decadeUIPath + "/zq/image/double/" + "fu_" + group2 + ".png";
                                    sj.style.display = "block";
                                    sj.style.position = "absolute";
                                    sj.style.top = "-1.5px";
                                    sj.style.left = "62.6px";
                                    sj.style.height = "173.5px";
                                    sj.style.width = "22px";
                                    sj.style.zIndex = "62";
                                    player.appendChild(sj);
                                    player._fujiangkuang = sj;
                                }
                            }
                        },
                        player,
                        triggerName,
                        playerName2
                    );
                },
            };

            //国战隐匿
            lib.skill._gzyinni = {
                trigger: {
                    global: ["gameStart", "dieBegin"],
                    player: ["enterGame", "showCharacterEnd", "hideCharacterEnd"],
                },
                forced: true,
                priority: 999,
                firstDo: true,
                filter: function (event, player, name) {
                    if (lib.config.mode != "guozhan") return false;
                    if (lib.config.extension_十周年UI_newDecadeStyle != "off") return false;
                    if (name == "showCharacterEnd" || name == "dieBegin") {
                        return (
                            event.player.getElementsByClassName("gzyinni").length > 0 ||
                            event.player.getElementsByClassName("gzyinni1").length > 0 ||
                            event.player.getElementsByClassName("player_gz_cntry").length > 0 ||
                            event.player.getElementsByClassName("fujiang").length > 0
                        );
                    }
                    return true;
                },
                content: function () {
                    var name = event.triggername;
                    //● 性能优化：预提取 trigger.player 和 trigger.num，避免序列化整个 trigger 事件对象
                    var triggerPlayer = trigger?.player;
                    var triggerNum = trigger?.num;
                    game.broadcastAll(
                        function (player, name, triggerPlayer, triggerNum) {
                            if (window.decadeUI && lib.config.extension_十周年UI_newDecadeStyle == "off") {
                                var gzMedelete = function (node) {
                                    if (this[node]) {
                                        this[node].style.opacity = 0;
                                        var player = this;
                                        setTimeout(function () {
                                            if (!player[node]) return;
                                            player.removeChild(player[node]);
                                            player[node] = false;
                                        }, 600);
                                    }
                                };
                                player.gzMe_delete = gzMedelete;
                                if(triggerPlayer) triggerPlayer.gzMe_delete = gzMedelete;
                                if (name == "gameStart" || name == "enterGame") {
                                    if (player.classList?.contains('unseen')){
                                        //主将隐匿图
                                        var gzyn = document.createElement("img");
                                        gzyn.src = window.decadeUIPath + "/zq/image/double/yinnigz.png";
                                        gzyn.style.cssText = "pointer-events:none";
                                        gzyn.style.opacity = 0;
                                        gzyn.style.transition = "all 0.5s";
                                        gzyn.classList.add("gzyinni");
                                        gzyn.style.display = "block";
                                        gzyn.style.position = "absolute";
                                        gzyn.style.top = "auto";
                                        gzyn.style.bottom = "0px";
                                        gzyn.style.left = "16%";
                                        gzyn.style.height = "195px";
                                        gzyn.style.width = "40%";
                                        gzyn.style.zIndex = "61";
                                        player.appendChild(gzyn);
                                        setTimeout(function () {
                                            gzyn.style.opacity = 1;
                                        }, 0);
                                        player.gzMe_gzyn = gzyn;

                                        //未知势力图
                                        var cntry = document.createElement("img");
                                        cntry.src = window.decadeUIPath + "/zq/image/double/player_gz_cntry.png";
                                        cntry.style.cssText = "pointer-events:none";
                                        cntry.style.opacity = 0;
                                        cntry.style.transition = "all 0.5s";
                                        cntry.classList.add("player_gz_cntry");
                                        cntry.style.display = "block";
                                        cntry.style.position = "absolute";
                                        cntry.style.top = "-8.3px";
                                        cntry.style.left = "-4px";
                                        cntry.style.height = "33.5px";
                                        cntry.style.width = "33.5px";
                                        cntry.style.zIndex = "62";
                                        player.appendChild(cntry);
                                        setTimeout(function () {
                                            cntry.style.opacity = 1;
                                        }, 0);
                                        player.gzMe_cntry = cntry;
                                    }

                                    if (player.classList?.contains('unseen2')){
                                        //副将隐匿图
                                        var gzyn1 = document.createElement("img");
                                        gzyn1.src = window.decadeUIPath + "/zq/image/double/yinnigz.png";
                                        gzyn1.style.cssText = "pointer-events:none";
                                        gzyn1.style.opacity = 0;
                                        gzyn1.style.transition = "all 0.5s";
                                        gzyn1.classList.add("gzyinni1");
                                        gzyn1.style.display = "block";
                                        gzyn1.style.position = "absolute";
                                        gzyn1.style.top = "auto";
                                        gzyn1.style.bottom = "0px";
                                        gzyn1.style.left = "56%";
                                        gzyn1.style.height = "195px";
                                        gzyn1.style.width = "43.4%";
                                        gzyn1.style.zIndex = "61";
                                        player.appendChild(gzyn1);
                                        setTimeout(function () {
                                            gzyn1.style.opacity = 1;
                                        }, 0);
                                        player.gzMe_gzyn1 = gzyn1;

                                        //副将文字显示
                                        var fj = document.createElement("img");
                                        fj.src = window.decadeUIPath + "/zq/image/double/fujiang.png";
                                        fj.style.cssText = "pointer-events:none";
                                        fj.style.opacity = 0;
                                        fj.style.transition = "all 0.5s";
                                        fj.style.display = "block";
                                        fj.style.position = "absolute";
                                        fj.classList.add("fujiang");
                                        fj.style.top = "22px";
                                        fj.style.left = "62.6px";
                                        fj.style.height = "36.6px";
                                        fj.style.width = "21.6px";
                                        fj.style.zIndex = "62";
                                        player.appendChild(fj);
                                        setTimeout(function () {
                                            fj.style.opacity = 1;
                                        }, 0);
                                        player.gzMe_fj = fj;
                                    }
                                } else if (name == "showCharacterEnd") {
                                        // 如果是亮主将或全亮
                                        if ([0, 2].includes(triggerNum) && !triggerPlayer.isUnseen(0)) {
                                            triggerPlayer.gzMe_delete("gzMe_gzyn");
                                        }
                                        // 如果是亮副将或全亮
                                        if ([1, 2].includes(triggerNum) && !triggerPlayer.isUnseen(1)) {
                                            triggerPlayer.gzMe_delete("gzMe_gzyn1");
                                            triggerPlayer.gzMe_delete("gzMe_fj");
                                        }
                                        // 亮将就会移除未知势力的图标
                                        if (!triggerPlayer.isUnseen(0)) triggerPlayer.gzMe_delete("gzMe_cntry");
                                } else if (name == "dieBegin") {
                                        // 如果是亮主将或全亮
                                        triggerPlayer.gzMe_delete("gzMe_gzyn");
                                        // 如果是亮副将或全亮
                                        triggerPlayer.gzMe_delete("gzMe_gzyn1");
                                        triggerPlayer.gzMe_delete("gzMe_fj");
                                        // 亮将就会移除未知势力的图标
                                        triggerPlayer.gzMe_delete("gzMe_cntry");
                                } else if (name == "hideCharacterEnd") {
                                    //主将隐匿图
                                    if (player.classList?.length) {
                                        if (player.isUnseen(0) && !player.gzMe_gzyn) {
                                            var gzyn = document.createElement("img");
                                            gzyn.src = window.decadeUIPath + "/zq/image/double/yinnigz.png";
                                            gzyn.style.cssText = "pointer-events:none";
                                            gzyn.style.opacity = 0;
                                            gzyn.style.transition = "all 0.5s";
                                            gzyn.classList.add("gzyinni");
                                            gzyn.style.display = "block";
                                            gzyn.style.position = "absolute";
                                            gzyn.style.top = "auto";
                                            gzyn.style.bottom = "0px";
                                            gzyn.style.left = "16%";
                                            gzyn.style.height = "195px";
                                            gzyn.style.width = "40%";
                                            gzyn.style.zIndex = "61";
                                            player.appendChild(gzyn);
                                            setTimeout(function () {
                                                gzyn.style.opacity = 1;
                                            }, 0);
                                            player.gzMe_gzyn = gzyn;
                                        }
                                        //副将隐匿图
                                        if (player.isUnseen(1) && !player.gzMe_gzyn1) {
                                            var gzyn1 = document.createElement("img");
                                            gzyn1.src = window.decadeUIPath + "/zq/image/double/yinnigz.png";
                                            gzyn1.style.cssText = "pointer-events:none";
                                            gzyn1.style.opacity = 0;
                                            gzyn1.style.transition = "all 0.5s";
                                            gzyn1.classList.add("gzyinni1");
                                            gzyn1.style.display = "block";
                                            gzyn1.style.position = "absolute";
                                            gzyn1.style.top = "auto";
                                            gzyn1.style.bottom = "0px";
                                            gzyn1.style.left = "56%";
                                            gzyn1.style.height = "195px";
                                            gzyn1.style.width = "43.4%";
                                            gzyn1.style.zIndex = "61";
                                            player.appendChild(gzyn1);
                                            setTimeout(function () {
                                                gzyn1.style.opacity = 1;
                                            }, 0);
                                            player.gzMe_gzyn1 = gzyn1;
                                        }
                                        if (player.isUnseen(1) && !player.gzMe_fj) {
                                            //副将显示
                                            var fj = document.createElement("img");
                                            fj.src = window.decadeUIPath + "/zq/image/double/fujiang.png";
                                            fj.style.cssText = "pointer-events:none";
                                            fj.style.display = "block";
                                            fj.style.position = "absolute";
                                            fj.classList.add("fujiang");
                                            fj.style.top = "22px";
                                            fj.style.left = "62.6px";
                                            fj.style.height = "36.6px";
                                            fj.style.width = "21.6px";
                                            fj.style.zIndex = "62";
                                            player.appendChild(fj);
                                            player.gzMe_fj = fj;
                                        }
                                    }
                                }
                            }
                        },
                        player,
                        name,
                        triggerPlayer,
                        triggerNum
                    );
                },
            };
            lib.skill._guozhan = { //国战添加副将边框
                trigger: {
                    global: "gameStart",
                    player: "showCharacterEnd",
                },
                forced: true,
                filter: function (event, player, name) {
                    if (lib.config.mode != "guozhan") return false;
                    if (lib.config.extension_十周年UI_newDecadeStyle != "off") return false;
                    if (name == "showCharacterEnd") return event.player.getElementsByClassName("guozhan").length > 0;
                    return true;
                },
                content: function () {
                    var name = event.triggername;
                    game.broadcastAll(
                        function (player, name, trigger) {
                            if (window.decadeUI && lib.config.extension_十周年UI_newDecadeStyle == "off") {
                                if (name == "gameStart") {
                                    var gz = document.createElement("img");
                                    gz.src = window.decadeUIPath + "/zq/image/double/fu_unknown.png";
                                    gz.style.cssText = "pointer-events:none";
                                    gz.classList.add("guozhan");
                                    gz.style.display = "block";
                                    gz.style.position = "absolute";
                                    gz.style.top = "-1.5px";
                                    gz.style.left = "62.6px";
                                    gz.style.height = "173px";
                                    gz.style.width = "22px";
                                    gz.style.zIndex = "61";
                                    player.appendChild(gz);
                                    player.gzMe_guozhan = gz;
                                } else if (name == "showCharacterEnd") {
                                    if(trigger?.player){
                                        trigger.player.gzMe_delete = function (node) {
                                            if (this[node]) {
                                            this[node].style.opacity = 0;
                                            var player = this;
                                            setTimeout(function () {
                                                if (!player[node]) return;
                                                player.removeChild(player[node]);
                                                player[node] = false;
                                            }, 600);
                                            }
                                        };
                                        trigger.player.gzMe_delete("gzMe_guozhan");
                                    }
                                    var yh = document.createElement("img");
                                    //   group2 = lib.character[player.name2][1];
                                    yh.src = window.decadeUIPath + "/zq/image/double/" + "fu_" + player.group + ".png";
                                    yh.style.display = "block";
                                    yh.style.position = "absolute";
                                    yh.style.top = "-1.5px";
                                    yh.style.left = "62.6px";
                                    yh.style.height = "173px";
                                    yh.style.width = "22px";
                                    yh.style.zIndex = "61";
                                    player.appendChild(yh);
                                }
                            }
                        },
                        player,
                        name,
                        trigger
                    );
                },
            };
        }

        //●手杀武将角标，感谢大佬啦啦啦提供
        if (lib.config.extension_十周年UI_ssjiaobiao) {
            lib.skill._sswujiangjiaobiao = {
                trigger: {
                    global: "gameStart",
                    player: "enterGame",
                },
                direct: true,
                firstDo: true,
                priority: 400,
                filter(event, player) {
                    return player.name1;
                },
                content() {
                    //武将名
                    const jianglist = ["xin_sunliang", "re_guanqiujian", "re_jikang"],
                        splist = ["yangfeng"],
                        kunlist = [
                            "lingcao",
                            "sunru",
                            "liuzan",
                            "pangdegong",
                            "th_pangdegong",
                            "miheng",
                            "majun",
                            "th_majun",
                            "zhengxuan",
                            "th_zhengxuan",
                            "simashi",
                            "nanhualaoxian",
                            "th_nanhualaoxian",
                            "shichangshi",
                            "k_shichangshi",
                            "sunhanhua",
                            "th_sunhanhua",
                            "mb_zhangfen",
                        ],
                        xuanlist = [
                            "mb_simafu",
                            "mb_wenqin",
                            "mb_simazhou",
                            "mb_sp_guanqiujian",
                            "mb_caomao",
                            "chengji",
                            "lizhaojiaobo",
                            "mb_wangjing",
                            "mb_jiachong",
                        ],
                        xuanjianglist = ["mbjsrg_simazhao", "mbjsrg_simazhao2", "mb_simazhao"],
                        qifulist = [
                            "baosanniang",
                            "guansuo",
                            "wolongfengchu",
                            "ol_jiangwan",
                            "ol_feiyi",
                            "caoying",
                            "ol_xuelingyun",
                            "ol_guozhao",
                            "caoshuang",
                            "caochun",
                            "panshu",
                            "fengfangnv",
                            "zhangqiying",
                            "caoxiancaohua",
                            "xurong",
                            "yuantanyuanshang",
                            "jin_zhouchu",
                        ];

                    let jiaobiaoimg = "kongbai",
                        shiji = false,
                        yijiang = false,
                        sp = false,
                        jsrg = false;
                    ((standard = false), (guozhan = false));
                    //将包
                    for (const jiangbao in lib.characterPack) {
                        for (const id in lib.characterPack[jiangbao]) {
                            if (jiangbao == "shiji" && id == player.name1) {
                                shiji = true;
                                break;
                            } else if ((jiangbao == "yijiang" || jiangbao == "newjiang") && id == player.name1) {
                                yijiang = true;
                                break;
                            } else if ((jiangbao == "sp" || jiangbao == "sp2" || jiangbao == "mobile") && id == player.name1) {
                                sp = true;
                                break;
                            } else if (jiangbao == "jsrg" && id == player.name1) {
                                jsrg = true;
                                break;
                            } else if (jiangbao == "standard" && id == player.name1) {
                                standard = true;
                                break;
                            } else if (jiangbao == "mode_guozhan" && id == player.name1) {
                                guozhan = true;
                                break;
                            }
                        }
                    }
                    //判断中文名
                    const namex = get.translation(player.name1);
                    if (namex.startsWith("武")) {
                        jiaobiaoimg = "新杀角标_武";
                    } else if (namex.startsWith("威")) {
                        jiaobiaoimg = "新杀角标_威";
                    } else if (
                        namex.includes("魔") ||
                        (lib.character[player.name1] && lib.character[player.name1][1] && lib.character[player.name1][1] == "devil")
                    ) {
                        jiaobiaoimg = "OL角标_魔";
                    } else if (namex.includes("闪")) {
                        jiaobiaoimg = "OL角标_闪";
                    } else if (lib.characterSort["sp"]["sp_qifu"].includes(player.name1) || qifulist.includes(player.name1)) {
                        jiaobiaoimg = "OL角标_祈福";
                    } else if (lib.characterSort["sp"]["sp_wanglang"].includes(player.name1)) {
                        jiaobiaoimg = "OL角标_限定";
                    } else if (lib.characterPack["yingbian"] && lib.characterPack["yingbian"][player.name1]) {
                        if (lib.characterSort["yingbian"]["yingbian_pack1"].includes(player.name1)) {
                            jiaobiaoimg = "OL角标_文德武备_理";
                        } else if (lib.characterSort["yingbian"]["yingbian_pack2"].includes(player.name1)) {
                            jiaobiaoimg = "OL角标_文德武备_备";
                        } else if (lib.characterSort["yingbian"]["yingbian_pack3"].includes(player.name1)) {
                            jiaobiaoimg = "OL角标_文德武备_果";
                        } else if (lib.characterSort["yingbian"]["yingbian_pack4"].includes(player.name1)) {
                            jiaobiaoimg = "OL角标_文德武备_戒";
                        } else if (lib.characterSort["yingbian"]["yingbian_pack5"].includes(player.name1)) {
                            jiaobiaoimg = "OL角标_文德武备_约";
                        }
                    } else if (player.name1.startsWith("clan_") && namex.includes("族") && lib.character[player.name1]) {
                        const dabian = lib.character[player.name1][4],
                            taofen = lib.character[player.name1].clans;
                        if (namex.includes("族荀") && ((dabian && dabian.includes("clan:颍川荀氏")) || taofen?.includes("颍川荀氏"))) {
                            jiaobiaoimg = "OL角标_门阀士族_颍川荀氏";
                        } else if (namex.includes("族吴") && ((dabian && dabian.includes("clan:陈留吴氏")) || taofen?.includes("陈留吴氏"))) {
                            jiaobiaoimg = "OL角标_门阀士族_陈留吴氏";
                        } else if (namex.includes("族韩") && ((dabian && dabian.includes("clan:颍川韩氏")) || taofen?.includes("颍川韩氏"))) {
                            jiaobiaoimg = "OL角标_门阀士族_颍川韩氏";
                        } else if (namex.includes("族钟") && ((dabian && dabian.includes("clan:颍川钟氏")) || taofen?.includes("颍川钟氏"))) {
                            jiaobiaoimg = "OL角标_门阀士族_颍川钟氏";
                        } else if (namex.includes("族王") && ((dabian && dabian.includes("clan:太原王氏")) || taofen?.includes("太原王氏"))) {
                            jiaobiaoimg = "OL角标_门阀士族_太原王氏";
                        } else if (namex.includes("族杨") && ((dabian && dabian.includes("clan:弘农杨氏")) || taofen?.includes("弘农杨氏"))) {
                            jiaobiaoimg = "OL角标_门阀士族_弘农杨氏";
                        } else if (namex.includes("族陆") && ((dabian && dabian.includes("clan:吴郡陆氏")) || taofen?.includes("吴郡陆氏"))) {
                            jiaobiaoimg = "OL角标_门阀士族_吴郡陆氏";
                        }
                    } else if (jsrg == true) {
                        jiaobiaoimg = "手杀角标江";
                    } else if (xuanjianglist.includes(player.name1)) {
                        jiaobiaoimg = "手杀角标玄江";
                    } else if (namex.includes("势")) {
                        jiaobiaoimg = "手杀角标势";
                    } else if (namex.includes("友")) {
                        jiaobiaoimg = "手杀角标友";
                    } else if (namex.includes("界")) {
                        jiaobiaoimg = "手杀角标界";
                    } else if (namex.includes("谋")) {
                        jiaobiaoimg = "手杀角标谋";
                    } else if (
                        namex.includes("神") ||
                        (lib.character[player.name1] && lib.character[player.name1][1] && lib.character[player.name1][1] == "shen")
                    ) {
                        jiaobiaoimg = "手杀角标神";
                    } else if (
                        (namex.includes("星") || namex.includes("☆")) &&
                        !lib.characterSort["offline"]["offline_star"].includes(player.name1) &&
                        !["zhangxingcai", "old_zhangxingcai"].includes(player.name1)
                    ) {
                        jiaobiaoimg = "手杀角标星";
                    } else if (shiji == true) {
                        jiaobiaoimg = "手杀角标计";
                    } else if (yijiang == true || jianglist.includes(player.name1)) {
                        jiaobiaoimg = "手杀角标将";
                    } else if (kunlist.includes(player.name1)) {
                        jiaobiaoimg = "手杀角标坤";
                    } else if (xuanlist.includes(player.name1)) {
                        jiaobiaoimg = "手杀角标玄";
                    } else if (namex.includes("sp") || namex.includes("SP") || splist.includes(player.name1) || sp == true) {
                        jiaobiaoimg = "手杀角标SP";
                    } else if (namex.includes("标") || standard == true) {
                        jiaobiaoimg = "手杀角标标";
                    } else if (namex.includes("国") || namex.includes("战役篇") || guozhan == true || player.name1.startsWith("gz_")) {
                        jiaobiaoimg = "手杀角标国";
                    }

                    if (jiaobiaoimg != "kongbai") {
                        const jiaobiao = document.createElement("div");
                        jiaobiao.classList.add("skssjiaobiao");
                        player.appendChild(jiaobiao);
                        jiaobiao.setBackgroundImage("extension/十周年UI/zq/image/jiaobiao/" + jiaobiaoimg + ".png");
                        player._skmh_jiaobiao = jiaobiao;
                    }
                },
            };
        }
    }

    lib.arenaReady.push(function () {
        get.groupnature2 = function (infoitem) {
            var group = infoitem[1];
            if (infoitem[4] && infoitem[4][0] && infoitem[4][0].toString().indexOf("double") != -1) {
                let doublegroup = infoitem[4][0].toString().split(":").slice(1);
                group = doublegroup[0] + doublegroup[1] + doublegroup[2];
            }
            return group;
        };
        get.bordergroup = function (info, raw) {
            if (typeof info === "string") {
                info = get.character(info);
            }
            // 检查是否存在 groupBorder 属性
            if (info && info.groupBorder) {
                // 拼接 groupBorder 和 group (如 "jin" + "qun" = "jinqun")
                return info.groupBorder + (info.group || "");
            }
            // 没有 groupBorder 时保持原逻辑
            return raw ? "" : info?.group || ""; /*●*/
        };
        lib.groupnature = {
            // 这里修改控制武将边框的代码。shen的后缀是shen（本体里神的nature是thunder，和晋一样，这里修改后不用再改本体了。给扩展武将加边框，请在下面按格式填写你喜欢的属性，然后在mark.css里按例子填写边框样式图片的调用。
            shen: "shen",
            wei: "water",
            shu: "soil",
            wu: "wood",
            qun: "metal",
            key: "key",
            jin: "thunder",
            ye: "ye",
            zqfo: "zqfo",
            devil: "devil",
            jinqun: "jinqun",
            jinwei: "jinwei",
            jinshu: "jinshu",
            wushu: "wushu",
            weishu: "weishu",
            weiqun: "weiqun",
            yewei: "jinwei",
            keyqun: "jinqun",
            western: "western",
            devilshu: "devilshu",
            devilqun: "devilqun",
            qunwei: "qunwei",
        };
        if (_status.connectMode) lib.config.connect_nickname = `※${typeof lib.config.connect_nickname == "string" ? lib.config.connect_nickname.slice(0, 12) : "无名玩家"}`; //区分联机时玩家是否开启十周年UI扩展，请勿修改
    });

    if (
        lib.config.extension_十周年UI_equipments &&
        !lib.config.extension_十周年UI_aloneEquip &&
        lib.config.extension_十周年UI_newDecadeStyle == "off"
    ) {
        //●装备栏美化
        lib.element.player.$addVirtualEquip = function (card, cards) {
            const player = this;
            const isViewAsCard = cards.length !== 1 || cards[0].name !== card.name,
                info = get.info(card, false);
            let cardx;
            if (get.itemtype(card) == "card" && card.isViewAsCard) cardx = card;
            else
                cardx = isViewAsCard
                    ? game.createCard(card.name, cards.length == 1 ? get.suit(cards[0]) : "none", cards.length == 1 ? get.number(cards[0]) : 0)
                    : cards[0];
            let cardShownName = get.translation(card.name);
            let subtype = get.subtypes(card)[0];
            let cardname = card.name;

            //装备是武将牌
            let characterCard = lib.card[cardname];
            if (characterCard?.image && characterCard.image.indexOf("character") != -1) characterCard = true;
            else characterCard = false;

            //装备名称列表
            let SSEquip = {
                金箍棒: "金箍棒∞",
                吴六剑: "吴六剑2",
                机关弩: "机关弩1",
                雌雄双股剑: "雌雄剑2",
                方天画戟: "方天戟4",
                贯石斧: "贯石斧3",
                寒冰剑: "寒冰剑2",
                麒麟弓: "麒麟弓5",
                青釭剑: "青釭剑2",
                青龙偃月刀: "青龙刀3",
                丈八蛇矛: "丈八矛3",
                古锭刀: "古锭刀2",
                朱雀羽扇: "朱雀扇4",
                七宝刀: "七宝刀2",
                银月枪: "银月枪3",
                衠钢槊: "衠钢槊3",
                飞龙夺凤: "飞龙刀2",
                三尖两刃刀: "三尖刀3",
                诸葛连弩: "诸葛弩1",
                倚天剑: "倚天剑2",
                七星宝刀: "七星刀2",
                折戟: "折戟0",
                无锋剑: "无锋剑1",
                涯角枪: "涯角枪3",
                五行鹤翎扇: "五行扇4",
                断剑: "断剑0",
                霹雳车: "霹雳车9",
                霹雳投石车: "投石车",
                水波剑: "水波剑2",
                红缎枪: "红缎枪3",
                天雷刃: "天雷刃4",
                混毒弯匕: "混毒匕1",
                元戎精械弩: "精械弩3",
                乌铁锁链: "铁锁链3",
                太极拂尘: "太极拂5",
                灵宝仙壶: "灵宝壶3",
                冲应神符: "冲应符",
                先天八卦阵: "先天八卦",
                照月狮子盔: "狮子盔",
                白银狮子: "白银狮",
                仁王金刚盾: "金刚盾",
                桐油百韧甲: "百韧甲",
                定澜夜明珠: "夜明珠",
                镔铁双戟: "镔铁戟3",
                玲珑狮蛮带: "狮蛮带",
                束发紫金冠: "束发金冠",
                红棉百花袍: "百花袍",
                虚妄之冕: "虚妄之冕",
                无双方天戟: "无双戟4",
                修罗炼狱戟: "炼狱戟4",
                鬼龙斩月刀: "斩月刀3",
                赤焰镇魂琴: "镇魂琴4",
                赤血青锋: "赤血锋2",
                鸾凤和鸣剑: "鸾凤剑3",
                金乌落日弓: "落日弓9",
                刑天破军斧: "破军斧4",
                "大攻车·攻": "进击车9",
                "大攻车·守": "御守车9",
                如意金箍棒: "金箍棒3",
                思召剑: "思召剑2",
                铁蒺藜骨朵: "铁蒺藜2",
                玄剑: "玄剑3",
                镇魂琴: "镇魂琴4",
                虎翼: "虎翼3",
                姬神弓: "姬神弓5",
                宣花斧: "宣花斧3",
                百辟双匕: "百辟匕1",
                木牛流马: "木牛",
                "真·诸葛连弩": "真诸葛弩99",
                "魂·诸葛连弩": "魂诸葛弩1",
                "魂·八卦阵": "魂八卦阵",
            };

            window.zqEquipCss?.(); //布局

            //● 性能优化：在房主端预计算 SSEquip 查找结果，仅传最终 cardShownName 字符串到 broadcastAll
            var _equip1Distance = 1;
            if (subtype == "equip1" && !SSEquip[cardShownName]) {
                if (lib.card[card.name]?.distance) {
                    var dist = lib.card[card.name].distance;
                    if (dist && dist.attackFrom) {
                        _equip1Distance = -dist.attackFrom + 1;
                    }
                }
                if (_equip1Distance == "Infinity") _equip1Distance = "∞";
                cardShownName += _equip1Distance.toString();
            }
            if (SSEquip[cardShownName]) cardShownName = SSEquip[cardShownName];

            game.broadcastAll(
                function (card, cards, cardx, player, isViewAsCard, cardShownName, subtype, cardname, characterCard) {
                    cardx.fix();
                    if (!cardx.isViewAsCard) {
                        const cardSymbol = Symbol("card");
                        cardx.cardSymbol = cardSymbol;
                        cardx[cardSymbol] = card;
                    }
                    if (card.subtypes) {
                        cardx.subtypes = card.subtypes;
                    }
                    cardx.style.transform = "";
                    cardx.classList.remove("drawinghidden");
                    delete cardx._transform;
                    if (isViewAsCard && !cardx.isViewAsCard) {
                        cardx.isViewAsCard = true;
                        cardx.destroyLog = false;
                        for (let i of cards) {
                            i.goto(ui.special);
                            i.destiny = player.node.equips;
                        }
                        if (cardx.destroyed) {
                            cardx._destroyed_Virtua = cardx.destroyed;
                        }
                        cardx.destroyed = function (card, id, player, event) {
                            if (card._destroyed_Virtua) {
                                if (typeof card._destroyed_Virtua == "function") {
                                    let bool = card._destroyed_Virtua(card, id, player, event);
                                    if (bool === true) {
                                        return true;
                                    }
                                } else if (lib.skill[card._destroyed_Virtua]) {
                                    if (player) {
                                        if (player.hasSkill(card._destroyed_Virtua)) {
                                            delete card._destroyed_Virtua;
                                            return false;
                                        }
                                    }
                                    return true;
                                } else if (typeof card._destroyed_Virtua == "string") {
                                    return card._destroyed_Virtua == id;
                                } else if (card._destroyed_Virtua === true) {
                                    return true;
                                }
                            }
                            if (id != "equip") {
                                return true;
                            }
                        };
                    }

                    //花色
                    const suitfont = get.translation(cardx.suit),
                        number = get.strNumber(cardx.number);
                    let suitnum = document.createElement("span");
                    suitnum.innerHTML = `${suitfont}`;
                    if (suitfont == get.translation("none")) {
                        if (number == "0") suitnum.innerHTML = "";
                        else suitnum.innerHTML = "◎";
                    }
                    suitnum.style.color = cardx.suit == "diamond" || cardx.suit == "heart" ? "#ef1806" : "#8DBEDE";
                    suitnum.style.fontSize = "9px"; //花色大小
                    suitnum.style.fontFamily = "shousha";
                    suitnum.style.position = "absolute";
                    if (subtype == "equip3" || subtype == "equip4") suitnum.style.marginLeft = "27px";
                    else suitnum.style.marginLeft = "22px"; //花色右移
                    suitnum.style.textShadow = "-1.3px 0px 2.2px #000, 0px -1.3px 2.2px #000, 1.3px 0px 2.2px #000 ,0px 1.3px 2.2px #000"; // 描边显示

                    //点数
                    let numsuit = document.createElement("span");
                    numsuit.innerHTML = `${number}`;
                    if (number == "0") numsuit.innerHTML = "";
                    numsuit.style.color = cardx.suit == "diamond" || cardx.suit == "heart" ? "#ef1806" : "#8DBEDE";
                    numsuit.style.fontSize = "16px"; //点数大小
                    numsuit.style.fontFamily = "shousha";
                    numsuit.style.position = "absolute";
                    if (subtype == "equip3" || subtype == "equip4") numsuit.style.marginLeft = "36px";
                    else numsuit.style.marginLeft = "31px"; //点数右移
                    numsuit.style.marginTop = "0.5px"; //字体上下
                    numsuit.style.textShadow = "-1.3px 0px 2.2px #000, 0px -1.3px 2.2px #000, 1.3px 0px 2.2px #000 ,0px 1.3px 2.2px #000"; // 描边显示

                    //名字
                    let equipname = document.createElement("span");
                    //● SSEquip 查找已移至房主端预计算，此处直接使用 cardShownName
                    equipname.style.color = "#e9e8e3"; //白色
                    equipname.style.fontSize = "16px"; //字体大小
                    equipname.style.fontFamily = "shousha";
                    equipname.style.position = "absolute";
                    equipname.style.marginLeft = "42px"; //字体右移
                    if (suitfont == get.translation("none") || number == "0") equipname.style.marginLeft = "32px";
                    if (suitfont == get.translation("none") && number == "0") equipname.style.marginLeft = "21px";
                    equipname.style.marginTop = "0.5px"; //字体上下
                    equipname.style.textShadow = "-1.3px 0px 2.2px #000, 0px -1.3px 2.2px #000, 1.3px 0px 2.2px #000 ,0px 1.3px 2.2px #000"; // 装备字体描边显示
                    if (window.decadeUI && (subtype == "equip3" || subtype == "equip4")) equipname.innerHTML = "";
                    else equipname.innerHTML = cardShownName;

                    //背景图
                    let newele = document.createElement("img");
                    if (subtype == "equip3" || subtype == "equip4") {
                        var b = subtype == "equip3" ? "+" : "-";
                        newele.setAttribute("src", window.decadeUIPath + "/zq/image/ass/" + b + "1.png");
                        newele.style.marginLeft = "0px";
                        newele.style.marginTop = "-1px";
                        newele.style.height = "110%";
                        newele.style.transform = "scale(0.8,0.9)"; //拉伸
                    } else {
                        newele.setAttribute("src", window.decadeUIPath + "/zq/image/ass/" + `${characterCard ? "character" : cardname}` + ".png");
                        newele.style.opacity = "1"; //图标透明度
                        newele.style.height = "100%";
                        newele.style.marginLeft = "7px";
                        newele.style.marginTop = "-1px";
                        newele.style.transform = "scale(0.85,0.9)"; //拉伸
                    }

                    newele.onerror = function () {
                        this.src = window.decadeUIPath + "/zq/image/ass/weizhi.png";
                        this.onerror = null;
                    };
                    newele.style.position = "absolute";
                    cardx.node.name2.innerHTML = "";
                    cardx.node.name2.appendChild(newele);
                    cardx.node.name2.appendChild(suitnum);
                    cardx.node.name2.appendChild(numsuit);
                    cardx.node.name2.appendChild(equipname);

                    if (isViewAsCard) {
                        cardx.cards = cards || [];
                        cardx.viewAs = card.name;
                        cardx.classList.add("fakeequip");
                    } else {
                        delete cardx.viewAs;
                        cardx.classList.remove("fakeequip");
                    }
                    let equipped = false,
                        equipNum = get.equipNum(cardx);
                    if (player.node.equips.childNodes.length) {
                        for (let i = 0; i < player.node.equips.childNodes.length; i++) {
                            if (get.equipNum(player.node.equips.childNodes[i]) >= equipNum) {
                                equipped = true;
                                player.node.equips.insertBefore(cardx, player.node.equips.childNodes[i]);
                                break;
                            }
                        }
                    }
                    if (equipped === false) {
                        player.node.equips.appendChild(cardx);
                        if (cards?.length && _status.discarded) _status.discarded.removeArray(cards);
                    }

                    //美化样式
                    var style2 = document.createElement("style");
                    var css2 = `
                        :not(.equips)>div.sk_taofen_zbxf_zqlrb {top: 0px !important; left: 0px !important; bottom: 0px !important;}
                    `;
                    style2.innerHTML = css2;
                    document.head.appendChild(style2);
                    cardx.classList.add("sk_taofen_zbxf_zqlrb");

                    if (!window.decadeUI) return;

                    //暴力修复非装备牌错位，出自大佬啦啦啦
                    let taofenlist = {
                        equip1: { top: "29px" },
                        equip2: { top: "45px" },
                        equip3: { top: "61px" },
                        equip4: { top: "61px", left: "53px", bottom: "0px" },
                        equip4_jiaobiao: { top: "61px", left: "43px", bottom: "0px" },
                        equip5: { top: "13px" },
                        get equip6() {
                            return this.equip3;
                        },
                    };
                    const lulu = subtype == "equip4" && player._skmh_jiaobiao ? taofenlist["equip4_jiaobiao"] : taofenlist[subtype];
                    if (lulu) {
                        for (const taofen in lulu) {
                            cardx.style[taofen] = lulu[taofen];
                        }
                    }

                   //修复额外武器栏
                    if (subtype == "equip1") {
                        var wuqi = player.countCards("e", { subtype: "equip1" });
                        if (wuqi > 1) player.node.marks.style.setProperty("bottom", "86px", "important");
                        for (var i = wuqi - 1; i >= 0; i--) {
                            var card = player.getCards("e", { subtype: "equip1" })[i];
                            if (i == wuqi - 1) card.style.top = "29px";
                            else card.style.top = "calc(" + (i - 0.2) * 20 + "%)";
                        }
                    }
                //● 移除 SSEquip 参数，查找已移至房主端
                }, card, cards, cardx, player, isViewAsCard, cardShownName, subtype, cardname, characterCard
            );
        };

        //●废除装备栏美化
        lib.element.player.$syncDisable = function (map) {
            //game.broadcastAll(function () {
            window.zqEquipCss?.(); //布局
            //});
            const suits = { equip1: "none", equip2: "none", equip3: "none", equip4: "none", equip5: "none", equip6: "none" };
            if (!map) {
                map = this.disabledSlots || {};
            }
            game.addVideo("$syncDisable", this, get.copy(map));
            game.broadcast(
                function (player2, map3) {
                    player2.disabledSlots = map3;
                    player2.$syncDisable(map3);
                },
                this,
                map
            );
            const map2 = get.copy(map);
            const cards = Array.from(this.node.equips.childNodes);
            for (const card of cards) {
                if (card.name.startsWith("feichu_")) {
                    const index = card.name.slice(7);
                    if (!map2[index]) {
                        map2[index] = 0;
                    }
                    map2[index]--;
                }
            }
            for (const index in map2) {
                if (!index.startsWith("equip") || !(parseInt(index.slice(5)) > 0)) {
                    continue;
                }
                const num = map2[index];
                if (num > 0) {
                    for (let i = 0; i < num; i++) {
                        const card = game.createCard("feichu_" + index, suits[index] || get.translation(index) + "栏", "");
                        card.fix();
                        card.style.transform = "";
                        card.classList.remove("drawinghidden");
                        card.classList.add("feichu");
                        delete card._transform;
                        const equipNum = get.equipNum(card);
                        let equipped = false;
                        for (let j = 0; j < this.node.equips.childNodes.length; j++) {
                            if (get.equipNum(this.node.equips.childNodes[j]) >= equipNum) {
                                this.node.equips.insertBefore(card, this.node.equips.childNodes[j]);
                                equipped = true;
                                break;
                            }
                        }
                        if (!equipped) {
                            this.node.equips.appendChild(card);
                            if (_status.discarded) {
                                _status.discarded.remove(card);
                            }
                        }
                    }
                } else if (num < 0) {
                    for (let i = 0; i > num; i--) {
                        const card = cards.find(card2 => card2.name == "feichu_" + index);
                        if (card) {
                            this.node.equips.removeChild(card);
                            cards.remove(card);
                        }
                    }
                }
            }
        };

        //●视为装备兼容废除装备栏
        lib.element.player.$handleEquipChange = function () {
            const player2 = this;
            const cards = Array.from(player2.node.equips.childNodes);
            const cardsResume = cards.slice(0);
            const extraEquip = [];
            player2.extraEquip?.forEach(info => {
                const extra = `${get.translation(info[0])} ${get.translation(info[1])}`;
                const subtype = get.subtype(info[1]);
                let preserve = info[2] && !info[2](player2);
                if (!preserve && !extraEquip.map(info2 => info2[1]).includes(info[1])) {
                    extraEquip.add([info, extra, subtype]);
                }
            });
            cards?.forEach(card => {
                let num = get.equipNum(card);
                let remove = false;
                if (card.name.indexOf("empty_equip") == 0) {
                    if ((num == 4 || num == 3) && get.is.mountCombined()) {
                        remove = !player2.hasEmptySlot("equip3_4") || player2.getEquips("equip3_4").length;
                    } else if (!player2.hasEmptySlot(num) || player2.getEquips(num).length) {
                        remove = true;
                    }
                    if (remove) {
                        player2.node.equips.removeChild(card);
                        cardsResume.remove(card);
                    }
                }
                if (card.extraEquip && !remove) {
                    let info = card.extraEquip,
                        preserve = card.extraEquip[2] && !card.extraEquip[2](player2);
                    const disable = card.classList.contains("feichu");
                    if (!extraEquip.some(infox => infox[0][0] == info[0] && infox[0][1] == info[1]) || preserve) {
                        if (disable) {
                            card.node.name2.innerHTML = get.translation("equip" + num) + " 已废除";
                            // 修改
                            card.node.name2.style.fontSize = "0px";
                            card.node.name2.style.opacity = "1";
                            card.node.name2.style.marginTop = "0";
                            delete card.extraEquip;
                        } else {
                            player2.node.equips.removeChild(card);
                            cardsResume.remove(card);
                        }
                    }
                } else if (card.classList.contains("feichu")) {
                    let extra = extraEquip.find(info => info[2].includes("equip" + num));
                    if (extra) {
                        card.node.name2.innerHTML = extra[1];
                        // 修改
                        if (num === 3 || num === 4) {
                            card.node.name2.style.fontSize = "11.5px";
                        } else {
                            card.node.name2.style.fontSize = "15px";
                        }
                        card.node.name2.style.opacity = "0.75";
                        card.node.name2.style.marginTop = "-2.5px";
                        card.node.name2.style.marginLeft = "3px"; //视为装备
                        card.node.name2.style.backgroundImage = "none";
                        card.extraEquip = extra[0];
                        extraEquip.remove(extra);
                    }
                }
            });
            for (let i = 1; i <= 5; i++) {
                let add = false;
                if ((i == 4 || i == 3) && get.is.mountCombined()) {
                    add = player2.hasEmptySlot("equip3_4") && !player2.getEquips("equip3_4").length;
                } else {
                    add = player2.hasEmptySlot(i) && !player2.getEquips(i).length;
                }
                if (
                    add &&
                    !cardsResume.some(card => {
                        let num = get.equipNum(card);
                        if ((i == 4 || i == 3) && get.is.mountCombined()) {
                            return num == 4 || num == 3;
                        } else {
                            return num == i;
                        }
                    })
                ) {
                    const card = game.createCard("empty_equip" + i, "", "");
                    card.fix();
                    card.style.transform = "";
                    card.classList.remove("drawinghidden");
                    card.classList.add("emptyequip");
                    card.classList.add("hidden");
                    delete card._transform;
                    const equipNum = get.equipNum(card);
                    let equipped = false;
                    for (let j = 0; j < player2.node.equips.childNodes.length; j++) {
                        if (get.equipNum(player2.node.equips.childNodes[j]) >= equipNum) {
                            player2.node.equips.insertBefore(card, player2.node.equips.childNodes[j]);
                            equipped = true;
                            break;
                        }
                    }
                    if (!equipped) {
                        player2.node.equips.appendChild(card);
                        if (_status.discarded) {
                            _status.discarded.remove(card);
                        }
                    }
                }
            }
            extraEquip?.forEach(info => {
                if (player2.hasEmptySlot(info[2])) {
                    const card = game.createCard("empty_" + info[2], "", "");
                    card.fix();
                    card.style.transform = "";
                    card.classList.remove("drawinghidden");
                    card.classList.add("emptyequip");
                    card.node.name2.innerHTML = info[1];
                    card.extraEquip = info[0];
                    delete card._transform;
                    const equipNum = get.equipNum(card);
                    let equipped = false;
                    for (let j = 0; j < player2.node.equips.childNodes.length; j++) {
                        const node = player2.node.equips.childNodes[j];
                        if (get.equipNum(node) == info[2].at(-1) && info && node.classList.contains("emptyequip") && !node.extraEquip) {
                            node.node.name2.innerHTML = info[1];
                            node.extraEquip = info[0];
                            node.classList.remove("hidden");
                            equipped = true;
                            break;
                        }
                        if (get.equipNum(node) >= equipNum) {
                            player2.node.equips.insertBefore(card, node);
                            equipped = true;
                            break;
                        }
                    }
                    if (!equipped) {
                        player2.node.equips.appendChild(card);
                        if (_status.discarded) {
                            _status.discarded.remove(card);
                        }
                    }
                }
            });
        };
    }

            //●联机阵亡图标
            lib.skill._libElementPlayer_dieAfterx = {
                trigger: {
                    player: ["dieBegin", "dieAfter"],
                },
                forceDie: true,
                forced: true,
                charlotte: true,
                locked: true,
                popup: false,
                silent: true,
                unique: true,
                priority: -111,
                lastDo: true,
                content: function () {
                    if (_status.video) return;
                    var that = player,
                        identity = decadeUI.getPlayerIdentity(that);
                    if (get.mode() == 'guozhan' && identity == 'unknown') { that.showCharacter(2); identity = that.identity; }
                    //● 性能优化：移除 image(DOM) 和 event(事件对象) 参数，函数内仅需 event.triggername（字符串）和 image.src/onerror（可在客机端 new Image）
                    var triggername = event.triggername;
                    game.broadcastAll(function (identity, that, triggername) {
                        const decadeUI = window.decadeUI;
                        if (!decadeUI) return; //●
                            if (that.node.dieidentity) that.node.dieidentity.innerHTML = "";
                            else that.node.dieidentity = ui.create.div("died-identity", that);
                            if (triggername == "dieAfter") {
                                that.stopDynamic();
                                that.node.gainSkill.innerHTML = null;
                                if (lib.config.extension_十周年UI_playerDieEffect == "decade") {
                                    decadeUI.animation.playSpine("effect_zhenwang", {
                                        parent: that,
                                        scale: 0.8,
                                    });
                                } else if (lib.config.extension_十周年UI_playerDieEffect == "mobile") {
                                    decadeUI.animation.playSpine("SS_zhenwang", {
                                        parent: that,
                                        scale: 0.8,
                                    });
                                }
                                return;
                            }
                            // 修改开始 阵亡图片
                            if (!that.node.dieidentity2) that.node.dieidentity2 = ui.create.div("died-identity", that);
                            that.node.dieidentity2.classList.add("died-identity");
                            if (!that.node.diegray) that.node.diegray = ui.create.div("died-gray", that);
                            that.node.diegray.classList.add("died-gray");

                            const goon =
                                lib.config.extension_十周年UI_newDecadeStyle === "on" || lib.config.extension_十周年UI_newDecadeStyle === "othersOff"; //十周年或一将成名

                            // 为onlineUI样式设置单独的路径判断
                            var url;
                            if (decadeUI.config.newDecadeStyle === "onlineUI") {
                                url = `${window.decadeUIPath}image/styles/online/dead4_${identity}.png`;
                            } else if (decadeUI.config.newDecadeStyle === "babysha") {
                                url = `${window.decadeUIPath}image/styles/baby/dead3_${identity}.png`;
                            } else if (decadeUI.config.newDecadeStyle === "codename") {
                                url = `${window.decadeUIPath}image/styles/codename/dead_${identity}.png`;
                            } else if (goon) {
                                url = `${window.decadeUIPath}image/styles/decade/dead_${identity}.png`;
                            } else {
                                if (that != game.me) {
                                    url = `${window.decadeUIPath}image/styles/shousha/dead2_${identity}.png`;
                                } else {
                                    url = `${window.decadeUIPath}image/styles/shousha/dead2_me.png`;
                                }
                            }
                        setTimeout(() => {
                            var image = new Image();
                            image.onerror = function () {
                               that.node.dieidentity2.innerHTML = `${decadeUI.getPlayerIdentity(that, that.identity, true)}<br>阵亡`;
                            };
                            // 随机离开效果
                            if ((that._trueMe || that) != game.me && that != game.me && Math.random() < 0.8) {
                                if (lib.config.extension_十周年UI_newDecadeStyle == "onlineUI" || lib.config.extension_十周年UI_newDecadeStyle == "babysha") {
                                    // onlineUI样式固定使用第一个路径
                                    that.node.dieidentity2.innerHTML = `<div style="width:40.2px; height:20px; left:10px; top:-32px; position:absolute; background-image: url(${lib.assetURL}extension/十周年UI/image/ui/misc/likai_1.png);background-size: 100% 100%;"></div>`;
                                } else {
                                    // 其他样式保持随机
                                    if (goon) {
                                        that.node.dieidentity2.innerHTML = `<div style="width:40.2px; height:20px; left:10px; top:-32px; position:absolute; background-image: url(${lib.assetURL}extension/十周年UI/image/ui/misc/likai_1.png);background-size: 100% 100%;"></div>`;
                                    } else if (lib.config.extension_十周年UI_newDecadeStyle != "codename") {
                                        that.node.dieidentity2.innerHTML = `<div style="width:21px; height:81px; left:22.5px; top:-12px; position:absolute; background-image: url(${lib.assetURL}extension/十周年UI/image/ui/misc/likai.png);background-size: 100% 100%;"></div>`;
                                    }
                                }
                            } else {
                                that.node.dieidentity2.innerHTML = "";
                            }
                            that.node.dieidentity2.style.backgroundImage = `url(${url})`;
                            if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") {
                                that.node.dieidentity2.style.backgroundSize = "80% 80%";
                                that.node.dieidentity2.style.left = "17px";
                                that.node.dieidentity2.style.bottom = "0px";
                            }
                            image.src = url;
                        }, 250);
                    }, identity, that, triggername);
                },
            };

    //●谋奕卡牌
    lib.element.content.chooseToDuiben = function () {
        "step 0";
        if (!event.namelist) {
            event.namelist = ["全军出击", "分兵围城", "奇袭粮道", "开城诱敌"];
        }
        event.translationList ??= [
            "若对方选择“开城诱敌”，你胜",
            "若对方选择“奇袭粮道”，你胜",
            "若对方选择“全军出击”，你胜",
            "若对方选择“分兵围城”，你胜",
        ];
        game.broadcastAll(
            function (list, translationList = []) {
                if (window.decadeUI) {
                    var list2 = ["db_atk1", "db_atk2", "db_def1", "db_def2"];
                    for (var i = 0; i < 4; i++) {
                        lib.card[list2[i]].image =
                            "../extension/十周年UI/zq/image/db/" + list2[i] + (list[0] == "全军出击" ? "" : "_" + list[i]) + ".jpg";
                        lib.translate[list2[i]] = list[i];
                        lib.translate[list2[i] + "_info"] = translationList[i];
                    }
                }
            },
            event.namelist,
            event.translationList
        );
        if (!event.title) {
            event.title = "对策";
        }
        game.log(player, "向", target, "发起了", "#y" + event.title);
        if (!event.ai) {
            event.ai = function () {
                return 1 + Math.random();
            };
        }
        if (_status.connectMode) {
            player
                .chooseButtonOL(
                    [
                        [
                            player,
                            [
                                event.title + "：请选择一种策略",
                                [
                                    [
                                        ["", "", "db_def2"],
                                        ["", "", "db_def1"],
                                    ],
                                    "vcard",
                                ],
                            ],
                            true,
                        ],
                        [
                            target,
                            [
                                event.title + "：请选择一种策略",
                                [
                                    [
                                        ["", "", "db_atk1"],
                                        ["", "", "db_atk2"],
                                    ],
                                    "vcard",
                                ],
                            ],
                            true,
                        ],
                    ],
                    function () { },
                    event.ai
                )
                .set("switchToAuto", function () {
                    _status.event.result = "ai";
                })
                .set("processAI", function () {
                    var buttons = _status.event.dialog.buttons;
                    return {
                        bool: true,
                        links: [buttons.randomGet().link],
                    };
                });
        }
        ("step 1");
        if (_status.connectMode) {
            event.mes = result[player.playerid].links[0][2];
            event.tes = result[target.playerid].links[0][2];
            event.goto(4);
        } else {
            player.chooseButton(
                [
                    event.title + "：请选择一种策略",
                    [
                        [
                            ["", "", "db_def2"],
                            ["", "", "db_def1"],
                        ],
                        "vcard",
                    ],
                ],
                true
            ).ai = event.ai;
        }
        ("step 2");
        event.mes = result.links[0][2];
        target.chooseButton(
            [
                event.title + "：请选择一种策略",
                [
                    [
                        ["", "", "db_atk1"],
                        ["", "", "db_atk2"],
                    ],
                    "vcard",
                ],
            ],
            true
        ).ai = event.ai;
        ("step 3");
        event.tes = result.links[0][2];
        ("step 4");
        game.broadcast(function () {
            ui.arena.classList.add("thrownhighlight");
        });
        ui.arena.classList.add("thrownhighlight");
        game.addVideo("thrownhighlight1");
        target.$compare(game.createCard(event.tes, "", ""), player, game.createCard(event.mes, "", ""));
        game.log(target, "选择的策略为", "#g" + get.translation(event.tes));
        game.log(player, "选择的策略为", "#g" + get.translation(event.mes));
        game.delay(0, lib.config.game_speed == "vvfast" ? 4000 : 1500);
        ("step 5");
        var mes = event.mes.slice(6);
        var tes = event.tes.slice(6);
        var str;
        if (mes == tes) {
            str = get.translation(player) + event.title + "成功";
            player.popup("胜", "wood");
            target.popup("负", "fire");
            game.log(player, "#g胜");
            event.result = { bool: true };
        } else {
            str = get.translation(player) + event.title + "失败";
            target.popup("胜", "wood");
            player.popup("负", "fire");
            game.log(target, "#g胜");
            event.result = { bool: false };
        }
        event.result.player = event.mes;
        event.result.target = event.tes;
        game.broadcastAll(function (str) {
            var dialog = ui.create.dialog(str);
            dialog.classList.add("center");
            setTimeout(function () {
                dialog.close();
            }, 1000);
        }, str);
        const skill = event.getParent().name + "_" + (event.result.bool ? "true" + mes : "false");
        game.trySkillAudio(skill, player, true, null, null, [event, event.player]);
        game.delay(2);
        ("step 6");
        game.broadcastAll(function () {
            ui.arena.classList.remove("thrownhighlight");
        });
        game.addVideo("thrownhighlight2");
        if (event.clear !== false) {
            game.broadcastAll(ui.clear);
        }
    };

    //●去掉按钮卡牌上的【类别】字样
    ui.create.buttonPresets["vcard"] = function (item, type, position, noclick, node) {
        if (typeof item == "string") item = ["", "", item];
        // 仅用副本初始化显示，避免把调用方数组的 item[0]（序号/类别）改成空串；
        // 韬饵等技能依赖 button.link[0] 是否为数字来区分上下两排按钮
        const display = Array.isArray(item) ? item.slice() : item;
        if (Array.isArray(display)) display[0] = "";
        node = ui.create.card(position, "noclick", noclick);
        node.classList.add("button");
        node.init(display);
        node.link = item;
        return node;
    };

    lib.skill.ghujia = {
        mark: false,
    };
});
