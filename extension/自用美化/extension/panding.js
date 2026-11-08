import { lib, game, ui, get, ai, _status } from "../../../noname.js";
const JUDGE_FAIL_X = 0;
const JUDGE_FAIL_Y = 0;
const JUDGE_FAIL_SCALE = 1;
function tuneJudgeFailSpine(card) {
    if (!card) return;
    if (JUDGE_FAIL_X === 0 && JUDGE_FAIL_Y === 0 && JUDGE_FAIL_SCALE === 1) return;
    const apply = function () {
        const player = card._ap;
        if (!player || !Array.isArray(player.nodes)) return false;
        for (let i = player.nodes.length - 1; i >= 0; i--) {
            const node = player.nodes[i];
            if (!node || node.completed) continue;
            if (String(node.name || "").indexOf("effect_panding") !== 0) continue;
            if (node.action !== "play2" && node.action !== "play5") continue;
            if (JUDGE_FAIL_X !== 0) node.x = (node.x == null ? 0 : node.x) + JUDGE_FAIL_X;
            if (JUDGE_FAIL_Y !== 0) node.y = (node.y == null ? 0 : node.y) + JUDGE_FAIL_Y;
            if (JUDGE_FAIL_SCALE !== 1) node.scale = (node.scale == null ? 1 : node.scale) * JUDGE_FAIL_SCALE;
            node.referBounds = undefined;
            return true;
        }
        return false;
    };
    if (!apply()) {
        //●有界重试：最多 8 次（约 0.6 秒），避免判定区一直没建好时无限等待
        let tries = 0;
        const retry = function () {
            if (apply() || ++tries >= 8) return;
            setTimeout(retry, 80);
        };
        setTimeout(retry, 30);
    }
}


export function pandingUI() {
    if (window.__zyPandingLoaded) return true;

    const decadeUI = window.decadeUI;
    window.__zyPdj = {
        tuneFail: tuneJudgeFailSpine,
        judgeEffect: function (name, value) {
            switch (name) {
                case 'caomu': case '草木皆兵':
                case 'fulei': case '浮雷':
                case 'shandian': case '闪电':
                case 'hongshui': case '洪水':
                case 'huoshan': case '火山':
                case 'bingliang': case '兵粮寸断':
                case 'lebu': case '乐不思蜀':
                case 'dczixi_card': case '琴':
                    return value < 0 ? true : false;
            }
            return value;
        },
        arrow: lib.assetURL + "extension/自用美化/image/arrow.png",
        //●量一张原生卡牌的尺寸（CSS px，不含 body 的整体缩放）：
        //  未安装十周年UI时判定框用它做卡槽；优先量传入的判定牌，量不到（未挂到 DOM）再临时挂一张原生牌
        cardSize: function (ref) {
            if (window.decadeUI) return [0, 0];
            try {
                var w = ref && ref.offsetWidth || 0;
                var h = ref && ref.offsetHeight || 0;
                if (!(w > 0 && h > 0)) {
                    var tmp = ui.create.card();
                    tmp.style.setProperty('position', 'absolute', 'important');
                    tmp.style.setProperty('left', '-9999px', 'important');
                    tmp.style.setProperty('top', '0', 'important');
                    tmp.style.setProperty('zoom', '1', 'important');
                    (ui.arena || document.body).appendChild(tmp);
                    w = tmp.offsetWidth || 0;
                    h = tmp.offsetHeight || 0;
                    if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
                }
                return [w, h];
            } catch (e) { return [0, 0]; }
        }
    };
    window.__zyPandingLoaded = true;
    if (decadeUI) {
    ui.create.ppdialog = function() {
        var i;
        var hidden = false;
        var notouchscroll = false;
        var forcebutton = false;
        var dialog = decadeUI.element.create('dialog');
        dialog.classList.add('noupdate');
        dialog.contentContainer = decadeUI.element.create('content-container', dialog);
        dialog.content = decadeUI.element.create('content', dialog.contentContainer);
        dialog.buttons = [];
        Object.setPrototypeOf(dialog,lib.element.Dialog.prototype);
        for (i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] == 'boolean') dialog.static = arguments[i];
            else if (arguments[i] == 'hidden') hidden = true;
            else if (arguments[i] == 'notouchscroll') notouchscroll = true;
            else if (arguments[i] == 'forcebutton') forcebutton = true;
            else if (arguments[i].indexOf('#') != -1 && arguments[i].indexOf('>') == -1) dialog.id = arguments[i].slice(1);
            else dialog.add(arguments[i]);
        };
        if (!hidden) dialog.open();
        if (!lib.config.touchscreen) dialog.contentContainer.onscroll = ui.update;
        if (!notouchscroll) {
            dialog.contentContainer.ontouchstart = ui.click.dialogtouchStart;
            dialog.contentContainer.ontouchmove = ui.click.touchScroll;
            dialog.contentContainer.style.WebkitOverflowScrolling = 'touch';
            dialog.ontouchstart = ui.click.dragtouchdialog;
        };
        if (forcebutton) {
            dialog.forcebutton = true;
            dialog.classList.add('forcebutton');
        };
        return dialog;
    };
    } else if (typeof ui.create.ppdialog !== 'function') {
        //●兼容未安装十周年UI：用原生 DOM 提供最小可用的对话框，判定框仍可正常显示
        ui.create.ppdialog = function() {
            var hidden = false;
            var dialog = ui.create.div('.dialog');
            for (var i = 0; i < arguments.length; i++) {
                var arg = arguments[i];
                if (typeof arg == 'boolean') dialog.static = arg;
                else if (arg == 'hidden') hidden = true;
                else if (arg == 'notouchscroll' || arg == 'forcebutton') continue;
                else if (typeof arg == 'string' && arg.indexOf('#') != -1 && arg.indexOf('>') == -1) dialog.id = arg.slice(1);
                else if (typeof arg == 'string' || (arg && arg.nodeType)) dialog.appendChild(typeof arg == 'string' ? ui.create.div(arg) : arg);
            };
            dialog.show = function() { this.style.display = ''; };
            dialog.hide = function() { this.style.display = 'none'; };
            dialog.open = dialog.show;
            dialog.close = dialog.hide;
            dialog.style.position = 'absolute';
            dialog.style.transform = 'none';
            dialog.style.border = 'none';
            dialog.style.boxShadow = 'none';
            dialog.style.padding = '0';
            dialog.style.backgroundColor = 'transparent';
            (ui.arena || document.body).appendChild(dialog);
            if (!hidden) dialog.show();
            return dialog;
        };
    }
        lib.init.css(lib.assetURL + 'extension/自用美化/css','panding');
        /*●*/
        /*● 联机客机判定框：房主未安装/未开启本扩展时，判定只由本体（或十周年UI）以广播形式发来。
            这里参照皮肤切换扩展的做法，包裹主机消息入口（WebSocket onmessage），
            从广播内容里取出判定信息（判定名、判定牌、判定结束），再用本扩展的判定框还原显示。
            全程不依赖房主是否装扩展，也不依赖 ui.create.dialog 是否被其他扩展替换。 */
        (function () {
            if (window.__zyPdjExecBridge) return;
            window.__zyPdjExecBridge = true;

            var pending = null;
            var boxActive = false;
            var activeJudge = null;
            var closeTimer = 0;

            function isOnlineClient() {
                return !!(game.online && !game.servermode && typeof _status !== 'undefined' && _status.connectMode);
            }
            function clearCloseTimer() {
                if (closeTimer) {
                    clearTimeout(closeTimer);
                    closeTimer = 0;
                }
            }
            function removeBox() {
                clearCloseTimer();
                activeJudge = null;
                boxActive = false;
                if (!ui.judgeBox) return;
                if (typeof ui.judgeBoxdel === 'function') ui.judgeBoxdel();
                else {
                    if (ui.judgeBox.parentNode) ui.judgeBox.parentNode.removeChild(ui.judgeBox);
                    delete ui.judgeBox;
                }
            }
            function scheduleFallbackClose() {
                clearCloseTimer();
                closeTimer = setTimeout(function () {
                    closeTimer = 0;
                    removeBox();
                }, 30000);/*★兜底30秒关闭判定框*/
            }
            function parseJudgeTitle(str, player) {
                var text = String(str || '').replace(/<[^>]*>/g, '').replace(/#/g, '');
                var pname = '';
                try { if (player) pname = get.translation(player); } catch (e) {}
                if (pname && text.indexOf(pname + '的') === 0) text = text.slice(pname.length + 1);
                text = text.replace(/判定$/, '').replace(/【/g, '').replace(/】/g, '');
                return text || '判定';
            }
            function hideBaseDialog(videoId) {
                try {
                    var dialog = (typeof videoId === 'number') && get.idDialog && get.idDialog(videoId);
                    if (dialog) {
                        dialog.classList.add('hidden');
                        dialog.style.display = 'none';
                    }
                } catch (e) {}
            }
            /*●房主没装本扩展时，客机广播里只有判定名，没有“这是不是卡牌判定、是哪张延时锦囊”。
                  其实判定名本身就能定：延时锦囊（兵粮寸断、乐不思蜀、闪电等）的判定名就是这张牌的译名，
                  技能判定的判定名是技能名。所以拿判定名反查延时锦囊，查到就是卡牌判定，
                  顺带用它把延时锦囊的牌面还原出来（花色点数客机拿不到，只显示牌面，不留空角标） */
            function inferCardJudgeName(title) {
                if (!title || title === '判定') return '';
                var k;
                try {
                    if (lib.pandingprompt && lib.pandingprompt.card) {
                        for (k in lib.pandingprompt.card) {
                            if (k === title || get.translation(k) === title) return k;
                        }
                    }
                } catch (e) {}
                try {
                    for (k in lib.card) {
                        var info = lib.card[k];
                        //●只看延时锦囊，避免和同名的技能判定混淆
                        if (!info || info.type !== 'delay') continue;
                        if (k === title || get.translation(k) === title) return k;
                    }
                } catch (e) {}
                return '';
            }
            function createBox(str, card, player, isCard, delayCard) {
                if (typeof ui.create.ppdialog !== 'function' || !window.__zyPdj || typeof window.__zyPdj.createJudgeBox !== 'function') return;
                //●本扩展自己的广播已在客机建好判定框时不再重复创建
                if (ui.judgeBox && ui.judgeBox.__ssClientJudge && ui.judgeBox.parentNode && !ui.judgeBox.__zyBroadcastJudge) return;
                removeBox();
                var judgeName = '';
                try { judgeName = inferCardJudgeName(str); } catch (e) {}
                //●isCard 取不到时（房主没装本扩展）用判定名推断：查到延时锦囊 = 卡牌判定，头像走判定牌位；
                //  查不到 = 技能判定，头像走框内技能位
                if (isCard === undefined && str && str !== '判定') isCard = !!judgeName;
                if (!delayCard && judgeName) delayCard = { suit: '', number: 0, name: judgeName, nature: '' };
                var intro = null;
                if (judgeName) {
                    try {
                        var pc = lib.pandingprompt && lib.pandingprompt.card;
                        if (pc && pc[judgeName]) {
                            intro = typeof pc[judgeName] === 'function'
                                ? pc[judgeName](player, { name: judgeName, suit: '', number: 0, nature: '' })
                                : pc[judgeName];
                        }
                    } catch (e) { intro = null; }
                }
                activeJudge = { player: player, judgestr: str, card: card, cardEl: null, finalBool: undefined };
                //●判定框结构由本地同一份工厂创建，客机与房主/单机完全一致；
                //  isCard 决定武将小头像走卡牌位还是技能位（技能位头像在框内 top:50px，卡牌位在判定牌下方），
                //  房主广播会带上这个标记，取不到时沿用旧的卡牌位，避免老主机下布局来回跳
                var res = window.__zyPdj.createJudgeBox({
                    player: player,
                    judgestr: str,
                    isCard: isCard === undefined ? true : !!isCard,
                    judgedCard: card,
                    delayCard: delayCard || null,
                    introduce: intro,
                });
                ui.judgeBox = res.box;
                ui.judgeBox.__ssClientJudge = true;
                ui.judgeBox.__zyBroadcastJudge = true;
                if (res.judgeCard) {
                    try {
                        res.judgeCard.classList.remove('thrown', 'thrownhighlight', 'hidden');
                        res.judgeCard.style.display = '';
                        ui.judgeCardArea.appendChild(res.judgeCard);
                        activeJudge.cardEl = res.judgeCard;
                    } catch (e) {}
                }
                boxActive = true;
                scheduleFallbackClose();
            }
            /*●判定成功/失败动画：与本地判定框、以及房主装扩展时的客机广播保持一致 */
            function playJudgeAnim(isFail) {
                if (!ui.judgeCardArea || !window.__zyPandingTX || !window.dcdAnim) return;
                var effect = isFail ? window.__zyPandingTX.effect_panding2 : window.__zyPandingTX.effect_panding1;
                var play = function () {
                    try {
                        window.dcdAnim.playSpine(effect, {
                            parent: ui.judgeCardArea,
                            scale: effect.scale,
                            speed: effect.speed,
                        });
                    } catch (e) {}
                    if (isFail && window.__zyPdj && typeof window.__zyPdj.tuneFail === 'function') {
                        try { window.__zyPdj.tuneFail(ui.judgeCardArea); } catch (e) {}
                    }
                };
                if (typeof window.dcdAnim.hasSpine === 'function' && window.dcdAnim.hasSpine(effect.name)) {
                    play();
                } else {
                    try {
                        window.dcdAnim.loadSpine(effect.name, 'skel', play);
                    } catch (e) {
                        play();
                    }
                }
            }
            /*●判定结果：算成败 → 播动画 → 判定牌左移展示 → 稍后收框 */
            function finishJudge() {
                if (!activeJudge) {
                    removeBox();
                    return;
                }
                //●同一次判定的“判定结果为”日志只处理一次，避免连判时重复播动画
                if (activeJudge.finished) return;
                activeJudge.finished = true;
                var raw = 0;
                try {
                    var card = activeJudge.card;
                    if (card && card.name) {
                        raw = get.judge(card)({
                            card: card,
                            name: card.name,
                            number: card.number,
                            suit: card.suit,
                        });
                    }
                } catch (e) { raw = 0; }
                var mapped = raw;
                if (typeof activeJudge.finalBool === 'boolean') {
                    mapped = activeJudge.finalBool ? 1 : -1;
                } else {
                    try {
                        mapped = window.__zyPdj.judgeEffect(activeJudge.judgestr, raw);
                    } catch (e) { mapped = raw; }
                }
                if (typeof mapped === 'boolean') mapped = mapped ? 1 : -1;
                //●房主装了本扩展时成败特效已由广播在本地播放，这里不再重复播放
                if (!activeJudge.animByHost) playJudgeAnim(mapped < 0);
                if (raw > 0 && activeJudge.cardEl && typeof ui.judgeCardmove === 'function') {
                    try { ui.judgeCardmove(activeJudge.cardEl); } catch (e) {}
                }
                clearCloseTimer();
                closeTimer = setTimeout(function () {
                    closeTimer = 0;
                    removeBox();
                }, 1800);
            }
            /*●只有“判定抛牌”才处理：
                - 判定抛牌是单张牌 + 判定标题/视频号；
                - 排除 game.showCards（第二参是牌堆数组）和 lose（3 个参数）等同样带 thrownhighlight 的广播，
                  否则会误判成判定框 */
            function isJudgeThrow(args) {
                if (!args || args.length < 4) return false;
                if (get.itemtype(args[1]) !== 'card') return false;
                var hasTitle = false, hasVideo = false;
                for (var i = 2; i < args.length - 1; i++) {
                    if (typeof args[i] === 'string' && args[i].indexOf('判定') >= 0) hasTitle = true;
                    else if (typeof args[i] === 'number') hasVideo = true;
                }
                return hasTitle || hasVideo;
            }
            function onThrowBroadcast(args) {
                var player = args[0], card = args[1], str = null, videoId = null;
                //●房主装了本扩展时会多发一个 isCard 标记（第 6 个参数）；
                //  本体的 5 参 / 十周年UI 的 4 参广播取不到，保持 undefined 走默认布局
                var cardid = args.length >= 6 ? args[4] : args[args.length - 1];
                var isCard = args.length >= 6 ? args[5] : undefined;
                //●房主装了本扩展时还会把延时锦囊的牌面（花色/点数/牌名/属性）带过来；
                //  没带就让 createBox 用判定名反查牌名补一张只有牌面的延时锦囊
                var delayCard = null;
                if (args.length >= 9 && args[8]) {
                    delayCard = { suit: args[6], number: args[7], name: args[8], nature: args[9] };
                }
                for (var i = 2; i < args.length; i++) {
                    if (typeof args[i] === 'string' && str === null && args[i].indexOf('判定') >= 0) str = args[i];
                    else if (typeof args[i] === 'number' && videoId === null) videoId = args[i];
                }
                //●隐藏本体/十周年UI抛出的判定牌和旧标题框，改由本扩展判定框显示
                try {
                    if (lib.cardOL && lib.cardOL[cardid] && lib.cardOL[cardid].style) lib.cardOL[cardid].style.display = 'none';
                } catch (e) {}
                if (str !== null) {
                    pending = null;
                    hideBaseDialog(videoId);
                    createBox(parseJudgeTitle(str, player), card, player, isCard, delayCard);
                } else {
                    //●十周年UI 的主机只广播判定牌，判定名改从随后“进行XX判定”的日志广播里取
                    var p = { card: card, player: player, isCard: isCard, delayCard: delayCard, time: Date.now() };
                    pending = p;
                    setTimeout(function () {
                        if (pending !== p) return;
                        pending = null;
                        createBox('判定', p.card, p.player, p.isCard, p.delayCard);
                    }, 1500);
                }
            }
            function onLogBroadcast(args) {
                if (typeof args[0] !== 'string') return;
                var text = args[0].replace(/<[^>]*>/g, '').replace(/#/g, '');
                if (text.indexOf('判定结果为') >= 0) {
                    //●只处理本转接自己建的判定框，房主装了本扩展时由房主的广播逻辑播动画和收框
                    if (boxActive && ui.judgeBox && ui.judgeBox.__zyBroadcastJudge) finishJudge();
                    return;
                }
                if (!pending) return;
                if (text.indexOf('判定') >= 0 && text.indexOf('亮出的判定牌') >= 0) {
                    var p = pending;
                    pending = null;
                    var m = text.match(/进行(.{1,20}?)判定/);
                    var title = m ? m[1] : '判定';
                    title = title.replace(/【/g, '').replace(/】/g, '');
                    createBox(title, p.card, p.player, p.isCard, p.delayCard);
                }
            }
            /*●判定广播处理：注册到扩展统一的消息入口（extension.js 的 ssWsAdd），不再单独包装 ws.onmessage */
            if (window.ssWsAdd) {
                window.ssWsAdd(function (src, args) {
                try {
                    if (src !== null) {
                        if (src.indexOf('thrownhighlight') >= 0 && src.indexOf('lib.cardOL') >= 0 && isJudgeThrow(args)) {
                            onThrowBroadcast(args);
                        } else if (src.indexOf('game.log') >= 0) {
                            onLogBroadcast(args);
                        } else if (src.indexOf('tryJudgeAnimate') >= 0 && activeJudge && typeof args[1] === 'boolean') {
                            //●本体改判类判定广播的最终成败，用于动画和展示
                            activeJudge.finalBool = args[1];
                        } else if (src.indexOf('effect_panding') >= 0 && src.indexOf('__ssClientJudge') >= 0) {
                            //●房主装了本扩展时会广播成败特效（参数：player, card, isFail, str）：
                            //  客机已经由这条广播播过动画，桥接不再重复播放；顺带取到最终成败
                            if (activeJudge) {
                                activeJudge.animByHost = true;
                                if (typeof args[2] === 'boolean') activeJudge.finalBool = !args[2];
                            }
                        } else if (src.indexOf('judgeCardArea') >= 0 && args.length === 1 && activeJudge && ui.judgeCardArea) {
                            //●改判后主机同步新的判定牌，后续动画/左移用新的这张
                            var newJudgeCard = ui.judgeCardArea.lastChild;
                            if (newJudgeCard) activeJudge.cardEl = newJudgeCard;
                            if (args[0] && args[0].name) activeJudge.card = args[0];
                        }
                    }
                } catch (e) {}
                });
            }
        })();
        /*●*/
        window.__zyPandingTX = {
            effect_panding1: {
            name: "../../../自用美化/animation/panding/shousha/effect_panding",
            action: 'play1',
            speed: 2.5,
            scale: 1.1,
            },
            effect_panding2: {
            name: "../../../自用美化/animation/panding/shousha/effect_panding",
            action: 'play2',
            speed: 2.5,
            scale: 1.1,
            },
            kapaizhuanhuan: {
            name: "../../../自用美化/animation/panding/kapaizhuanhuan",
            },
            gaipan: {
            name: "../../../自用美化/animation/panding/gaipan",
            speed: 2.4,
            },
        };
        try {
            window.dcdAnim.loadSpine(window.__zyPandingTX.effect_panding1.name, "skel", function () {});
            window.dcdAnim.loadSpine(window.__zyPandingTX.kapaizhuanhuan.name, "skel", function () {});
            window.dcdAnim.loadSpine(window.__zyPandingTX.gaipan.name, "skel", function () {});
        } catch (e) {}
        //●包裹式：只调用本体 judge，再修正判定标题（技能名统一走 ssFrameTitle）
        //  不再整段复制，本体后续对参数、judge2、callback 等改动会自动跟进
        if (!lib.element.player.judge.__ssPdjWrapped) {
            var _ssRawPlayerJudge = lib.element.player.judge;
            var _ssWrappedPlayerJudge = function() {
                var _next = _ssRawPlayerJudge.apply(this, arguments);
                try {
                    if (_next && _next.skill && window.ssFrameTitle) {
                        var _jt = window.ssFrameTitle(_next, null);
                        if (_jt) _next.judgestr = _jt;
                    }
                } catch (e) {}
                return _next;
            };
            _ssWrappedPlayerJudge.__ssPdjWrapped = true;
            lib.element.player.judge = _ssWrappedPlayerJudge;
        }
        /*●判定框结构工厂：本地判定（房主/单机）与联机客机转接共用同一份结构，
            以后调样式/改结构只改这里 */
        window.__zyPdj.createJudgeBox = function (opt) {
            opt = opt || {};
            var player = opt.player;
            var judgestr = opt.judgestr || '判定';
            var isCard = !!opt.isCard;
            var judgedCard = opt.judgedCard || null;
            var delayCard = opt.delayCard || null;
            if (!ui.judgeBox) ui.judgeBox = ui.create.ppdialog('#judgeBox');
            var box = ui.judgeBox;
            //●每次建框都换一个代号：连判/嵌套判定时，旧判定事件收框只能收自己那一代，
            //  否则会把新判定的框连同引用一起删掉，后续步骤取不到 ui.judgeCardArea 报错，框就卡在屏幕上
            try {
                box.__ssJudgeGen = (window.__zyPdj.__judgeGen || 0) + 1;
                window.__zyPdj.__judgeGen = box.__ssJudgeGen;
                window.__zyJudgeLastAct = Date.now();
            } catch (e) {}
            try {
                //●复用同一个框时先清掉上一判定的牌，避免连续判定把旧的判定牌/延时锦囊叠在框里
                if (ui.judgeCardArea) {
                    while (ui.judgeCardArea.firstChild) ui.judgeCardArea.removeChild(ui.judgeCardArea.firstChild);
                }
                if (ui.judgeDelayCard) {
                    var _pdOld = ui.judgeDelayCard.querySelectorAll('.card');
                    for (var _pdi = 0; _pdi < _pdOld.length; _pdi++) {
                        if (_pdOld[_pdi].parentNode) _pdOld[_pdi].parentNode.removeChild(_pdOld[_pdi]);
                    }
                }
            } catch (e) {}
            try {
                var __pdSize0 = window.__zyPdj.cardSize(judgedCard);
                if (__pdSize0[0] > 0 && __pdSize0[1] > 0) {
                    box.style.setProperty('--pd-cw', __pdSize0[0] + 'px');
                    box.style.setProperty('--pd-ch', __pdSize0[1] + 'px');
                }
            } catch (e) {}
            box.classList.add('judgeBox');
            box.show();
            box.static = true;
            box.draggable = false;
            box.nodrag = true;
            if (!box._zyNoDrag) {
                box._zyNoDrag = true;
                ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) {
                    box.addEventListener(ev, function (e) {
                        if (e.target && e.target.classList && e.target.classList.contains('judgeArrow')) return;
                        e.stopPropagation();
                    }, true);
                });
            }
            if (!ui.judgeTitle) ui.judgeTitle = ui.create.div('.title', box);
            ui.judgeTitle.innerHTML = judgestr + '<img class="judgeArrow" src="' + (window.__zyPdj.arrow || '') + '"/>';
            if (!box._zyFoldBound) {
                box._zyFoldBound = true;
                box.addEventListener('click', function (e) {
                    if (!e.target || !e.target.classList || !e.target.classList.contains('judgeArrow')) return;
                    e.stopPropagation();
                    box.classList.toggle('folded');
                });
            }
            if (!ui.judgeResultIntroduce) ui.judgeResultIntroduce = ui.create.div('.judgeResultIntroduce', box);
            ui.judgeResultIntroduce.innerText = '判定结果';
            if (!ui.judgeCardArea) ui.judgeCardArea = ui.create.div('.judgeCardArea', box);
            ui.judgeCardArea.setAttribute('id', 'judgeCardArea');
            if (!ui.introduce_card) ui.introduce_card = ui.create.div('.introduce_card', box);
            ui.introduce_card.innerHTML = opt.introduce || '正在进行判定...';
            var judgeCard = null;
            if (judgedCard) {
                judgedCard.setAttribute('id', 'judgeCard');
                judgeCard = judgedCard.cloneNode(true);
                judgeCard.card = judgedCard;
                try {
                    judgeCard.link = judgedCard;
                    if (typeof lib.setIntro === 'function') lib.setIntro(judgeCard);
                } catch (e) {}
                judgeCard.style.setProperty('transform', 'translate(0px, 0px) scale(1)', '');
                if (!window.decadeUI) {
                    try {
                        var __pdSize = window.__zyPdj.cardSize(judgedCard);
                        if (__pdSize[0] > 0 && __pdSize[1] > 0) {
                            judgeCard.style.setProperty('zoom', 1, 'important');
                            judgeCard.style.setProperty('width', __pdSize[0] + 'px', 'important');
                            judgeCard.style.setProperty('height', __pdSize[1] + 'px', 'important');
                            judgeCard.style.setProperty('margin-left', 0, 'important');
                            judgeCard.style.setProperty('margin-right', 0, 'important');
                        }
                    } catch (e) {}
                }
            }
            if (isCard) {
                if (!ui.judgeDelayCard) ui.judgeDelayCard = ui.create.div('.judgeDelayCard', box);
                ui.judgeResultIntroduce.dataset.type = 'card';
                ui.judgeCardArea.dataset.type = 'card';
                if (!ui.smallCharacter) ui.smallCharacter = ui.create.div('.smallCharacter', ui.judgeDelayCard);
                ui.smallCharacter.dataset.type = 'card';
                if (!ui.smallCharacterName) ui.smallCharacterName = ui.create.div('.smallCharacterName', ui.smallCharacter);
                if (player) {
                    ui.smallCharacterName.innerHTML = get.translation(player.name);
                    try {
                        ui.smallCharacter.style.backgroundImage = player.isUnseen(0) ? (player.isUnseen(1) ? 'linear-gradient(0deg, #000000, #000000)' : player.node.avatar2.style.backgroundImage) : player.node.avatar.style.backgroundImage;
                    } catch (e) {}
                }
                ui.introduce_card.dataset.type = 'card';
                if (delayCard && !opt.bianhua) {
                    var __pdDelayCard = ui.create.card().init([delayCard.suit, delayCard.number, delayCard.name, delayCard.nature]);
                    __pdDelayCard.card = delayCard;
                    ui.judgeDelayCard.appendChild(__pdDelayCard);
                }
            } else {
                ui.judgeResultIntroduce.dataset.type = 'skill';
                ui.judgeCardArea.dataset.type = 'skill';
                if (!ui.smallCharacter) ui.smallCharacter = ui.create.div('.smallCharacter', box);
                ui.smallCharacter.dataset.type = 'skill';
                try {
                    ui.smallCharacter.style.backgroundImage = player.node.avatar.style.backgroundImage;
                } catch (e) {}
                ui.introduce_card.dataset.type = 'skill';
            }
            return { box: box, judgeCard: judgeCard };
        };
        lib.element.content.judge = function() {
            "step 0";
            var judgestr = get.translation(player) + '的' + event.judgestr + '判定';
            //●step 之间会被 StepCompiler 拆成独立函数，step 0 的局部变量在 step 1 里取不到，
            //  跨步要用的值必须挂到 event 上，否则单机会报 “judgestr is not defined”
            event.__zyJudgeStr = judgestr;
            event.videoId = lib.status.videoId++;
            var cardj = event.directresult;
            if (!cardj) {
                if (player.getTopCards) cardj = player.getTopCards()[0];
                else cardj = get.cards()[0];
            };
            //●本体与十周年UI都有空牌堆保护；没有牌继续往下走会在 get.owner(cardj) 处崩
            if (!cardj) {
                event.finish();
                return;
            }
            var owner = get.owner(cardj);
            if (owner) {
                owner.lose(cardj, 'visible', ui.ordering);
            } else {
                var nextj = game.cardsGotoOrdering(cardj);
                if (event.position != ui.discardPile) nextj.noOrdering = true;
            };
            player.judging.unshift(cardj);
            game.addVideo('judge1', player, [get.cardInfo(player.judging[0]), judgestr, event.videoId]);
            event.__zyFastJudge = !!ui.judgeBox;
            //●判定框结构统一由 window.__zyPdj.createJudgeBox 创建（与联机客机转接共用）
            var __zyIntro = null;
            try {
                if (event.card) {
                    var __zyCardName = event.card.name || event.card.viewAs || event.name;
                    if (lib.pandingprompt.card[__zyCardName]) {
                        __zyIntro = typeof lib.pandingprompt.card[__zyCardName] === 'function'
                            ? lib.pandingprompt.card[__zyCardName](player, event.card)
                            : lib.pandingprompt.card[__zyCardName];
                    }
                } else {
                    var __zySkillName = event.getParent().name;
                    if (lib.pandingprompt.skill[__zySkillName]) {
                        __zyIntro = typeof lib.pandingprompt.skill[__zySkillName] === 'function'
                            ? lib.pandingprompt.skill[__zySkillName](player, event.card, (typeof target !== 'undefined' ? target : null), __zySkillName)
                            : lib.pandingprompt.skill[__zySkillName];
                    }
                }
            } catch (e) {}
            var __zyBianhua = !!(event.card && (event.card.bianhua || event.card.bianhua2 || event.card.viewAs ||
                event.card.nameb || event.card.suitb || event.card.numberb));
            var __zyBox = window.__zyPdj.createJudgeBox({
                player: player,
                judgestr: event.judgestr,
                isCard: !!event.card,
                judgedCard: player.judging[0],
                delayCard: event.card || null,
                bianhua: __zyBianhua,
                introduce: __zyIntro,
            });
            ui.judgeBox = __zyBox.box;
            event.__zyJudgeGen = __zyBox.box.__ssJudgeGen;
            event.dialog = ui.judgeBox;
            event.judgeCard = __zyBox.judgeCard;
            if (__zyBianhua) {
                var oc = (event.card.cards && event.card.cards[0]) || event.card;
                event.zcard = ui.create.card().init([
                    oc.suit, oc.number, oc.name, oc.nature || event.card.nature,
                ]);
                event.zcard_true = ui.create.card().init([
                    event.card.suit, event.card.number, event.card.name, event.card.nature,
                ]);
                ui.judgeDelayCard.appendChild(event.zcard);
                setTimeout(function () {
                    if (window.dcdAnim) {
                        window.dcdAnim.loadSpine(window.__zyPandingTX.kapaizhuanhuan.name, 'skel', function () {
                            window.dcdAnim.playSpine(window.__zyPandingTX.kapaizhuanhuan, {
                                parent: event.zcard,
                                scale: 0.83,
                                speed: 0.4,
                            });
                        });
                    }
                    setTimeout(function () {
                        ui.judgeDelayCard.removeChild(event.zcard);
                        ui.judgeDelayCard.appendChild(event.zcard_true);
                        event.zcard.noCard = ui.create.div('.zhuanbj', ui.judgeDelayCard);
                    }, 200);
                }, 400);
            }
            game.delay(0.5);
            "step 1";
            //●判定框可能已被新判定接手（连判/嵌套），没有当前这一代的框就跳过，避免抛错中断后续收框
            if (ui.judgeCardArea && (event.__zyJudgeGen == null || !ui.judgeBox || ui.judgeBox.__ssJudgeGen === event.__zyJudgeGen)) {
                ui.judgeCardArea.appendChild(event.judgeCard);
            }
            //●联机时客机不执行判定的 content，只会执行这里的广播。
            //  房主只发“本体那套”：标题对话框 + 抛出判定牌 + 日志 + tryJudgeAnimate；
            //  装了本扩展的客机由消息转接把本体判定还原成扩展判定框，没装的客机看到的就是本体效果
            game.broadcastAll(function (player2, card, str, id, cardid) {
                try {
                    //●执行 content 的一方（服务器/单机）已经建好扩展判定框，本体标题框和抛牌都不需要
                    if (!game.online) return;
                    if (ui.judgeBox && !ui.judgeBox.__ssClientJudge) return;
                    var event2 = {};
                    event2.node = window.decadeUI && player2.$throwordered2
                        ? player2.$throwordered2(card.copy(), true)
                        : player2.$throwordered(card.copy(), true);
                    if (lib.cardOL) lib.cardOL[cardid] = event2.node;
                    event2.node.cardid = cardid;
                    event2.node.classList.add('thrownhighlight');
                    if (ui.arena) ui.arena.classList.add('thrownhighlight');
                    event2.dialog = ui.create.dialog(str);
                    event2.dialog.classList.add('center');
                    event2.dialog.videoId = id;
                } catch (e) {}
            //●第 7~10 个参数是延时锦囊的牌面信息，只有装了本扩展的客机会读；没装的客机按本体签名忽略
            }, player, player.judging[0], event.__zyJudgeStr, event.videoId, get.id(), !!event.card,
                event.card ? get.suit(event.card) : null,
                event.card ? get.number(event.card) : null,
                event.card ? get.name(event.card) : null,
                event.card ? (get.nature(event.card) || null) : null);
            game.log(player, '进行' + (`<span class="greentext">` + event.judgestr + `</span>`) + '判定，亮出的判定牌为', player.judging[0]);
            game.delay(event.__zyFastJudge ? 0 : 2);
            if (!event.noJudgeTrigger) event.trigger('judge');
            "step 2";
            //●本体 step2 那套：客机关闭 step1 的本体标题对话框、去掉高亮；
            //  扩展判定框（客机转接补建的）不在这里收，由转接在判定结果后自行收框
            game.broadcast(function (id) {
                try {
                    var dialog = get.idDialog(id);
                    if (dialog) dialog.close();
                    if (ui.arena) ui.arena.classList.remove('thrownhighlight');
                } catch (e) {}
            }, event.videoId);
            "step 3";
            event.result = {
                card: player.judging[0],
                name: player.judging[0].name,
                number: get.number(player.judging[0]),
                suit: get.suit(player.judging[0]),
                color: get.color(player.judging[0]),
                id: player.judging[0].cardid,
                overjudge: false,
                node: event.node,
            };
            if (event.fixedResult) {
                for (var i in event.fixedResult) {
                    event.result[i] = event.fixedResult[i];
                };
            };
            event.result.judge = event.judge(event.result);
            if (event.result.judge > 0) event.result.bool = true;
            else if (event.result.judge < 0) event.result.bool = false;
            else event.result.bool = null;
            player.judging.shift();
            game.checkMod(player, event.result, 'judge', player);
            if (event.judge2) {
                //●本体只会调用一次 judge2，且返回布尔时交给 tryJudgeAnimate 播放动画；这里存下来给 step5 复用
                event.__zyJudge2Value = event.judge2(event.result);
                if (typeof event.__zyJudge2Value == 'boolean') player.tryJudgeAnimate(event.__zyJudge2Value);
            };
            if (event.clearArena != false) {
                game.broadcastAll(ui.clear);
            };
            game.delay();
            "step 4";
            game.broadcast(function (id) {
                if (!window.decadeUI) ui.arena.classList.remove('thrownhighlight');
            }, event.videoId);
            game.addVideo('judge2', null, event.videoId);
            ui.arena.classList.remove("thrownhighlight");
            if (event.judgeCard.card.cardid != event.result.card.cardid) {
                event.result.overjudge = true;
                let bottom = 0;
                function eraseCard() {
                    bottom += 10;
                    const clipPathPoints = 'polygon(0 0,100% 0,100%' + (100 - bottom) + '%,0 ' + (100 - bottom) + '%)';
                    event.judgeCard.style.clipPath = clipPathPoints;
                    if (bottom >= 50) {
                        clearInterval(eraseCardAnimation);
                    };
                };
                let eraseCardAnimation = setInterval(eraseCard, 20);
                if (window.dcdAnim) {
                    window.dcdAnim.loadSpine(window.__zyPandingTX.gaipan.name,"skel",function(){
                        window.dcdAnim.playSpine(window.__zyPandingTX.gaipan, {
                            parent: event.judgeCard,
                            scale: 0.3,
                        });
                    });
                }
                setTimeout(function() {
                    ui.judgeCardArea.removeChild(event.judgeCard);
                }, 500);
                event.judgeCard2 = event.result.card.cloneNode(true);
                event.judgeCard2.card = event.result.card;
                //●同上：补挂 link 和长按介绍
                try {
                    event.judgeCard2.link = event.result.card;
                    if (typeof lib.setIntro === 'function') lib.setIntro(event.judgeCard2);
                } catch (eL2) {}
                event.judgeCard2.style.setProperty('transform', 'translate(0px, 0px) scale(1)', '');
                event.judgeCard2.style.zIndex = 0;
                ui.judgeCardArea.appendChild(event.judgeCard2);
                //●改判后把新判定牌同步到客机补建的判定框，否则客机仍显示改判前的牌
                game.broadcastAll(function (card) {
                    try {
                        if (!ui.judgeBox || !ui.judgeBox.__ssClientJudge || !ui.judgeCardArea) return;
                        while (ui.judgeCardArea.firstChild) ui.judgeCardArea.removeChild(ui.judgeCardArea.firstChild);
                        var nc = card.cloneNode(true);
                        nc.card = card;
                        nc.style.setProperty("transform", "translate(0px, 0px) scale(1)", "");
                        ui.judgeCardArea.appendChild(nc);
                    } catch (e) {}
                }, event.result.card);
                game.delay(2);
                };
            "step 5";
            var judgeValue;
            var getEffect = event.judge2;
            if (getEffect) {
                //●复用 step3 已经算过的结果，避免 judge2 被调用两次（部分技能有副作用）
                judgeValue = event.__zyJudge2Value !== undefined ? event.__zyJudge2Value : getEffect(event.result);
                if (judgeValue === null || judgeValue === undefined) judgeValue = false;
            } else {
                judgeValue = window.__zyPdj.judgeEffect(event.judgestr, event.result.judge);
            };
            if ((typeof judgeValue == 'boolean')) {
                judgeValue = judgeValue ? 1 : -1;
            } else {
                judgeValue = event.result.judge;
                if ((typeof judgeValue == 'boolean')) {
                    judgeValue = judgeValue ? 1 : -1;
                }
            };
            const judgeEffect = judgeValue >= 0
                ? window.__zyPandingTX.effect_panding1
                : window.__zyPandingTX.effect_panding2;
            if (ui.judgeCardArea && (event.__zyJudgeGen == null || !ui.judgeBox || ui.judgeBox.__ssJudgeGen === event.__zyJudgeGen)) {
                const playJudgeSpine = function () {
                    window.dcdAnim.playSpine(judgeEffect, {
                        parent: ui.judgeCardArea,
                        scale: judgeEffect.scale,
                        speed: judgeEffect.speed,
                    });
                };
                try {
                    playJudgeSpine();
                } catch (e) {
                    try { window.dcdAnim.loadSpine(judgeEffect.name, "skel", playJudgeSpine); } catch (e2) {}
                }
                if (judgeValue < 0) window.__zyPdj.tuneFail(ui.judgeCardArea);
            };
            //●判定成功/失败特效只在房主本地播放，客机补建的判定框收不到，这里广播同步；
            //  没装/没开本扩展的客机则用十周年UI自带的 effect_panding 在判定牌上播放原生特效
            game.broadcastAll(function (player, card, isFail, str) {
                try {
                    //●有判定框但没打客机标记 = 房主/本地，特效已经在上面本地播放过，
                    //  这里必须直接返回，否则会再走下面的原生回退，叠出十周年UI原生的判定牌
                    if (ui.judgeBox && !ui.judgeBox.__ssClientJudge) return;
                    if (ui.judgeBox && ui.judgeBox.__ssClientJudge && ui.judgeCardArea) {
                        if (!window.__zyPdj || !window.__zyPandingTX || !window.dcdAnim) return;
                        var effect = isFail ? window.__zyPandingTX.effect_panding2 : window.__zyPandingTX.effect_panding1;
                        var play = function () {
                            try {
                                window.dcdAnim.playSpine(effect, {
                                    parent: ui.judgeCardArea,
                                    scale: effect.scale,
                                    speed: effect.speed,
                                });
                            } catch (e) {}
                            if (isFail) window.__zyPdj.tuneFail(ui.judgeCardArea);
                        };
                        //●客机的骨骼可能还没加载（precontent 阶段 dcdAnim 未就绪，预加载会静默失败）；
                        //  playSpine 对未加载的骨骼只打日志、不抛错，所以必须先 loadSpine 再播放，
                        //  否则 try/catch 永远走不到加载分支，客机看不到成败特效
                        if (typeof window.dcdAnim.hasSpine === "function" && window.dcdAnim.hasSpine(effect.name)) {
                            play();
                        } else {
                            try {
                                window.dcdAnim.loadSpine(effect.name, "skel", play);
                            } catch (e) {
                                play();
                            }
                        }
                        return;
                    }
                    //●没装/没开本扩展的客机没有判定框：补一张判定牌，
                    //  用十周年UI自带的 effect_panding（play4 生效 / play5 失效）播放原生成败特效
                    if (!window.decadeUI || !card || !player.$throwordered2) return;
                    //●抛出带动画的第二张之前，先删掉 step 1 抛出的那张（正常情况下 step 3 已清掉，这里兜底）
                    if (ui.__ssJudgeThrown) {
                        try {
                            if (typeof ui.__ssJudgeThrown.delete === "function") ui.__ssJudgeThrown.delete();
                            else ui.__ssJudgeThrown.remove();
                        } catch (e) {}
                        delete ui.__ssJudgeThrown;
                    }
                    var node = player.$throwordered2(card.copy(), true);
                    if (!node) return;
                    ui.__ssJudgeThrown = node;
                    var tag = node.querySelector(".used-info");
                    if (!tag) {
                        tag = document.createElement("div");
                        tag.className = "used-info";
                        node.appendChild(tag);
                    }
                    tag.innerHTML = (typeof get !== "undefined" && get.translation ? (get.translation(str) || "") : (str || "")) + (isFail ? "判定失效" : "判定生效");
                    var action = isFail ? "play5" : "play4";
                    try {
                        if (decadeUI.animation && decadeUI.animation.cap && typeof decadeUI.animation.cap.playSpineTo === "function") {
                            decadeUI.animation.cap.playSpineTo(node, { name: "effect_panding", action: action });
                        } else if (node._ap && typeof node._ap.playSpine === "function") {
                            node._ap.playSpine({ name: "effect_panding", action: action });
                        }
                    } catch (e) {}
                } catch (e) {}
            }, player, event.result.card, judgeValue < 0, event.judgestr);
            game.delay(1);
            "step 6";
            game.log(player, '的判定结果为', event.result.card);
            event.trigger('judgeFixing');
            if (typeof event.triggerMessage === 'function') event.triggerMessage('judgeresult');
            if (event.callback) {
                var next = game.createEvent('judgeCallback', false);
                next.player = player;
                next.card = event.result.card;
                next.judgeResult = get.copy(event.result);
                next.setContent(event.callback);
                event.next1 = next;
                event.judgeCard3 = event.judgeCard2 || event.judgeCard;
                if (event.result.bool == null) ui.judgeBoxdel(event.__zyJudgeGen);
            } else {
                if (!get.owner(event.result.card)) {
                    if (event.position != ui.discardPile) event.position.appendChild(event.result.card);
                };
            };
            "step 7";
            if (!event.judge2) ui.judgeBoxdel(event.__zyJudgeGen);
            if (event.parent.finished == true || !event.next1 || (event.next1 && (!event.result.bool || event.result.bool == null || event.next1._result.bool == false))) ui.judgeBoxdel(event.__zyJudgeGen);
            if (ui.judgeBox && (event.__zyJudgeGen == null || ui.judgeBox.__ssJudgeGen === event.__zyJudgeGen) && event.next1) {
                //●展示判定牌左移失败时不能中断后面的 step 8，否则判定框会一直留在画面上
                if (event.result.bool) {
                    try { ui.judgeCardmove(event.judgeCard3); } catch (e) {}
                }
                else game.delay(1.5);
            };
            "step 8";
            if (ui.judgeBox && (event.__zyJudgeGen == null || ui.judgeBox.__ssJudgeGen === event.__zyJudgeGen)) ui.judgeBox.hide();
            //●客机上的判定框是广播补建的，这里同样广播清理，避免客机判定框一直停留
            game.broadcastAll(function () {
                try {
                    if (ui.judgeBox && ui.judgeBox.__ssClientJudge) {
                        if (typeof ui.judgeBoxdel === "function") ui.judgeBoxdel();
                        else ui.judgeBox.hide();
                    }
                    //●清理没装本扩展的客机补抛的判定牌，避免残留
                    if (ui.__ssJudgeThrown) {
                        try {
                            if (typeof ui.__ssJudgeThrown.delete === "function") ui.__ssJudgeThrown.delete();
                            else ui.__ssJudgeThrown.remove();
                        } catch (e) {}
                        delete ui.__ssJudgeThrown;
                    }
                } catch (e) {}
            });
            if (event.getParent && event.getParent().name === "sbtiandu") {
                try {
                    ui.judgeBoxdel();
                } catch (e) {}
                try {
                    if (ui.judgeBox) ui.judgeBox.hide();
                } catch (e) {}
            }
        };
        ui.judgeCardmove = function(element) {
            if (!ui.judgeBox) return;
            //●补偿皮肤切换扩展的 chrome-fix：它把 getBoundingClientRect 的结果除以 documentZoom，
            //  这里的 rect 数值要乘回来，否则开启皮肤切换后判定牌起始位置会左移、牌多时间距会被过度收窄
            var _rz = 1;
            try {
                if (String(HTMLElement.prototype.getBoundingClientRect).indexOf("documentZoom") !== -1) {
                    _rz = window.documentZoom || window.devicePixelRatio || 1;
                }
            } catch (e0) {}
            if (!ui.judgeCardgets) ui.judgeCardgets = [];
            if (ui.judgeCardgets.indexOf(element) < 0) {
                if (element.__zyBaseTf === undefined) element.__zyBaseTf = element.style.transform || '';
                if (element.__zyBaseLeft === undefined) element.__zyBaseLeft = element.getBoundingClientRect().left * _rz;
                ui.judgeCardgets.push(element);
            };
            var gap = -30;/*●*/
            var cardW = 108;
            var maxW = 380;
            var minStep = 20;
            var total = ui.judgeCardgets.length;
            var step = cardW;
            if (total > 1) {
                step = Math.max(minStep, Math.min(cardW, Math.floor((maxW - cardW) / (total - 1))));
            }
            var apply = function (st) {
                for (let i = 0; i < total; i++) {
                    var el = ui.judgeCardgets[i];
                    el.style.zIndex = i;
                    var dx = (gap + i * st) - el.__zyBaseLeft;
                    el.style.transform = 'translateX(' + Math.round(dx) + 'px) ' + el.__zyBaseTf;
                };
            };
            //●右边界：取“判定结果”竖标签与武将小头像里更靠左的那个（视觉坐标），再留 10px
            var limitV = Infinity;
            try {
                var _cands = [ui.judgeResultIntroduce, ui.smallCharacter];
                for (var c = 0; c < _cands.length; c++) {
                    var _c = _cands[c];
                    if (!_c || !_c.getClientRects().length) continue;
                    var _cl = _c.getBoundingClientRect().left * _rz - 10;
                    if (_cl < limitV) limitV = _cl;
                };
            } catch (e) {};
            apply(step);
            //●牌多时按实测的右边缘继续收窄间距（折叠），最多收 to minStep，避免压到标签/头像
            if (total > 1 && isFinite(limitV)) {
                for (var pass = 0; pass < 3; pass++) {
                    var lastEl = ui.judgeCardgets[total - 1];
                    var over = lastEl.getBoundingClientRect().right * _rz - limitV;
                    if (over <= 1 || step <= minStep) break;
                    step = Math.max(minStep, Math.round(step - over / (total - 1)));
                    apply(step);
                };
            };
        };
        ui.judgeBoxdel = function(gen) {
            //●带代号调用时，只允许当前这一代判定收框；旧的判定事件晚一步执行到这里时
            //  不能把已经换成新判定的框删掉（否则新判定后续步骤会因 ui.judgeCardArea 被删而报错，框残留）
            if (gen != null && ui.judgeBox && ui.judgeBox.__ssJudgeGen != null && ui.judgeBox.__ssJudgeGen !== gen) return;
            if (ui.judgeBox) ui.judgeBox.remove();
            delete ui.judgeBox;
            delete ui.judgeTitle;
            delete ui.judgeTitlexg;

            delete ui.judgeDelayCard;
            delete ui.smallCharacter;
            delete ui.smallCharacterName;
            delete ui.introduce_card;
            delete ui.judgeResultIntroduce;
            delete ui.judgeResultIntroduce2;
            delete ui.judgeCardArea;
            if (ui.judgeCardgets) {
                for (let i = 0; i < ui.judgeCardgets.length; i++) {
                    ui.judgeCardgets[i].remove();
                    delete ui.judgeCardgets[i];
                };
            };
            delete ui.judgeCardgets;
        };
        //●判定框残留兜底：连判技能（慧识、洛神等）偶尔会因为前一次判定的收框步骤晚到、
        //  或步骤中抛错而把框留在屏幕上。这里定时检查：已不在判定流程里、框仍可见且静置超过 4 秒，
        //  就强制收框。客机由广播补建的判定框有自己的 30 秒兜底，不在这里处理。
        if (!window.__zyJudgeBoxGuard) {
            window.__zyJudgeBoxGuard = setInterval(function () {
                try {
                    if (!ui.judgeBox || !ui.judgeBox.parentNode) return;
                    if (ui.judgeBox.__ssClientJudge) return;
                    var ev = _status && _status.event;
                    var inJudge = false;
                    for (var i = 0; ev && i < 20; i++) {
                        if (ev.name === "judge" || ev.name === "judgeCallback") { inJudge = true; break; }
                        ev = ev.parent || ev._modparent || null;
                    }
                    if (inJudge) {
                        window.__zyJudgeLastAct = Date.now();
                        return;
                    }
                    if (ui.judgeBox.style && ui.judgeBox.style.display === "none") return;
                    if (ui.judgeBox.classList && ui.judgeBox.classList.contains("hidden")) return;
                    if (!window.__zyJudgeLastAct) {
                        window.__zyJudgeLastAct = Date.now();
                        return;
                    }
                    if (Date.now() - window.__zyJudgeLastAct > 30000 && typeof ui.judgeBoxdel === "function") {
                        ui.judgeBoxdel();
                    }
                } catch (e) {}
            }, 400);
        }
        lib.pandingprompt = {
            card: {
                "lebu": function (player, card) {
                    return "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + get.translation(player.name) + '跳过出牌阶段' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：乐不思蜀失效';
                },
                "bingliang": function (player, card) {
                    return "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♠</span>" + '：' + get.translation(player.name) + '跳过摸牌阶段' + '<br>' + "<span data-suit-type='black'>♣</span>" + '：兵粮寸断失效';
                },
                "shandian": function (player, card) {
                    return "<span data-suit-type='black'>♠</span>" + '2~9：' + get.translation(player.name) + '受到3点雷点伤害' + '<br>' + '其他：闪电失效';
                },
                'fulei': "<span data-suit-type='black'>♠</span>" + '浮雷生效' + '<br>' + "其他：浮雷失效",
                'huoshan': "<span data-suit-type='red'>♥</span>" + '火山生效' + '<br>' + "其他：火山失效",
                'hongshui': "<span data-suit-type='black'>♣</span>" + '洪水生效' + '<br>' + "其他：洪水失效",
                "dshj_tunliangyudi": function (player, card) {
                    return "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♠</span>" + '：' + get.translation(player.name) + '跳过弃牌阶段并且摸2弃1张牌' + '<br>' + "<span data-suit-type='black'>♣</span>" + '：屯粮御敌失效';
                },
                "dshj_xiuyangshengxi": function (player, card) {
                    return "<span data-suit-type='red'>♥</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + get.translation(player.name) + '获得1点护甲并选择回复1点体力或摸2张牌' + '<br>' + "<span data-suit-type='red'>♦</span>" + '：休养生息失效';
                },
                "dshj_renrutousheng": function (player, card) {
                    return "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + get.translation(player.name) + '弃置1张牌后增加1点体力上限并回复1点体力。' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：忍辱偷生失效';
                },
                "dshj_jieweipiaomiao": function (player, card) {
                    return "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♠</span>" + '：' + get.translation(player.name) + '弃置所有牌' + '<br>' + "<span data-suit-type='black'>♣</span>" + '：皆为缥缈失效';
                },
                "dshj_huanbingzhiji": function (player, card) {
                    return "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♣</span>" + '：' + get.translation(player.name) + '失去1点体力且本回合不能使用【杀】' + '<br>' + "<span data-suit-type='black'>♠</span>" + '：缓兵之计失效';
                },
            },
            skill: {
                sitian_tianqi: "<span data-suit-type='black'>♠</span>" + '2~9受到3点雷属性伤害' + '<br>' + "其他：闪电失效",
                pyzhuren_shandian : "<span data-suit-type='black'>♠</span>" + '：' + '其受到3点雷属性伤害' + '<br>' + "<span data-suit-type='black'>♣</span>" + '：' + '其受到1点雷属性伤害，你回复1点体力并摸1张牌' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：天雷刃失效',
                pyzhuren_heart : "<span data-suit-type='red'>♥♦</span>" + '：你回复1点体力'+ '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '你摸2张牌',
                bagua_skill : "<span data-suit-type='red'>♥♦</span>" + '：视为出【闪】'+ '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '八卦阵失效',
                z26_bagua_skill : "<span data-suit-type='red'>♥♦</span>" + '：视为出【闪】'+ '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '八卦阵失效',
                rw_bagua_skill : "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♣</span>" + '：视为出【闪】'+ '<br>' + "<span data-suit-type='black'>♠</span>" + '：' + '八卦阵失效',
                linglongshimandai_skill : "<span data-suit-type='red'>♥</span>" + '：此牌无效' + '<br>' + "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + '狮蛮带失效',
                spzhuilie : '武器或者坐骑牌' + '：此【杀】的伤害基数改为其体力值' + '<br>' + '其他' + '：你失去1点体力',
                twhuangjin : '杀的点数与判定的点数差值不大于1，此杀无效',
                fuji : "<span data-suit-type='black'>♠♣</span>" + '：' + '此伤害+1' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '该角色获得判定牌' ,
                xunde : '小于7' + '：' + '伤害来源弃置1张手牌' + '<br>' + '大于5' + '：' + '其获得此牌',
                spchijie : '点数大于6：此牌失效',
                chexuan : "<span data-suit-type='black'>♠♣</span>" + '：' + '将1张随机的【舆】置入你的装备区',
                releijie : "<span data-suit-type='black'>♠2~9</span>" + '：' + '其受到2点雷电伤害' + '<br>' + '其他' + ':其摸2张牌',
                olleijie : "<span data-suit-type='black'>♠2~9</span>" + '：' + '视为对你使用2张雷【杀】' + '<br>' + '其他' + ':其摸2张牌',
                zlhuji : "<span data-suit-type='red'>♥♦</span>" + '：' + '视为你对伤害来源使用1张无距离限制的【杀】' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + "虎骑失效",
                oldmiji : "<span data-suit-type='black'>♠♣</span>" + '：' + '王异观看牌堆顶的x张牌(x为你已损失的体力值)，然后将这些牌交给一名角色' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '秘计失效',
                shuangxiong : "<span data-suit-type='red'>♥♦</span>" + '：' + '本回合可以将1张黑色手牌当【决斗】使用' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '本回合可以将1张红色手牌当【决斗】使用',
                reshuangxiong : "<span data-suit-type='red'>♥♦</span>" + '：' + '本回合可以将1张黑色手牌当【决斗】使用' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '本回合可以将1张红色手牌当【决斗】使用',
                dingpin : "<span data-suit-type='black'>♠♣</span>" + '：' + '其摸其体力值的牌(至多为3)'+ '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：陈群翻面',
                redingpin : "<span data-suit-type='black'>♠♣</span>" + '：' + '其摸其体力值的牌(至多为3)'+ '<br>' + "<span data-suit-type='red'>♥</span>" + '：此次弃置的牌不计入弃置过的类型' + '<br>' + "<span data-suit-type='red'>♦</span>" + '：界陈群翻面',
                huituo : "<span data-suit-type='red'>♥♦</span>" + '：' + '其回复1点体力' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '其摸此次伤害点数的牌',
                reqingxi : "<span data-suit-type='red'>♥♦</span>" + '：' + '此牌伤害+1且其不能响应此牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '此牌伤害+1',
                xinfu_jijun : '将判定牌置于武将牌上，称为【方】',
                piaoling : "<span data-suit-type='red'>♥</span>" + "<span data-suit-type='black'>♠</span>" + '：你可以将此牌交给一名角色，若交给自己，需弃置1张或你将此牌置于牌堆顶' + '<br>' + "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♣</span>" + '：' + '飘零失效',
                new_wuhun : '【桃】或【桃园结义】' + '：' + '其存活' + '<br>' + '其他' + '：'+ '其死亡',
                twwuhun : '【桃】或【桃园结义】' + '：' + '无事发生' + '<br>' + '其他' + '：'+ '选择一名角色失去等量“梦魇”标记数体力值',
                tieji : "<span data-suit-type='red'>♥♦</span>" + '：' + '不能出【闪】' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '铁骑失效',
                retieji : "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + '需弃置1张同花色牌，否则不能使用【闪】',
                yufeng2 : "<span data-suit-type='black'>♠♣</span>" + '：' + '跳过出牌和弃牌阶段' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '跳过摸牌阶段',
                th_yufeng : "<span data-suit-type='black'>♠♣</span>" + '：' + '跳过出牌和弃牌阶段' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '跳过摸牌阶段',
                oldqianxi : "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + '防止此伤害，然后其减1点体力上限' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：潜袭失效',
                dulie:"<span data-suit-type='red'>♥</span>" + '：' + '取消神太史慈成为杀的目标' + '<br>' +"<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + '笃烈失效',
                dchuayi:"<span data-suit-type='red'>♥♦</span>"  + '：' +'其他角色回合结束时，你摸1张牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'当你受到伤害时，你摸2张牌',
                baonue:"<span data-suit-type='black'>♠</span>"+ '：' +'董卓回复1点体力' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♣</span>" + '：'+'暴虐失效',
                olbaonue:"<span data-suit-type='black'>♠</span>"+ '：' +'界董卓回复1点体力并获得判定牌' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♣</span>" + '：'+'暴虐失效',
                olbeige : "<span data-suit-type='red'>♥</span>" +'：' +'目标回复1点体力' + '<br>' +"<span data-suit-type='black'>♣</span>" + '：' +'目标的伤害来源翻面' + '<br>' + "<span data-suit-type='red'>♦</span>" +'：' +'目标摸两张牌' +'<br>' + "<span data-suit-type='black'>♣</span>" + '：' +'目标的伤害来源弃置两张牌',
                rebeige : "<span data-suit-type='red'>♥</span>" +'：' +'目标回复此次伤害点数的体力' + '<br>' +"<span data-suit-type='black'>♣</span>" + '：' +'目标的伤害来源翻面' + '<br>' + "<span data-suit-type='red'>♦</span>" +'：' +'目标摸三张牌' +'<br>' + "<span data-suit-type='black'>♣</span>" + '：' +'目标的伤害来源弃置两张牌',
                beige : "<span data-suit-type='red'>♥</span>" +'：' +'目标回复1点体力' + '<br>' +"<span data-suit-type='black'>♣</span>" + '：' +'目标的伤害来源翻面' + '<br>' + "<span data-suit-type='red'>♦</span>" +'：' +'目标摸两张牌' +'<br>' + "<span data-suit-type='black'>♣</span>" + '：' +'目标的伤害来源弃置两张牌',
                xinfu_lveming: '点数相同：你受到2点伤害' + '<br>' + '点数不同：随机获得你区域内1张',
                jijing: '弃置任意张点数之和与判定结果点数相同的牌，你回复1点体力',
                tuntian : "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + '邓艾将这张牌作为“田”；田可以用来当作顺手牵羊和减少其他人距离' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：屯田失效',
                retuntian : "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：' + '界邓艾将这张牌作为“田”；田可以用来当作顺手牵羊和减少与其他人的距离' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：界邓艾获得此牌',
                bazhen_bagua : "<span data-suit-type='red'>♥♦</span>" +'：' + '视为出【闪】' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'八卦阵失效',
                binghuo : "<span data-suit-type='black'>♠♣</span>" + '：马元义对其造成1点雷电伤害' + '<br>' + "<span data-suit-type='red'>♦♥</span>" + '：'  + '兵祸失效',
                oldzhenyi : "<span data-suit-type='black'>♠♣</span>" + '：伤害+1',
                releiji :  "<span data-suit-type='black'>♠</span>" + '：对其造成2点雷电伤害'+'<br>' +"<span data-suit-type='black'>♣</span>" + '：你回复1点体力，然后对其造成1点雷电伤害' +'<br>' +"<span data-suit-type='red'>♦♥</span>" + '：'  + '雷击失效',
                xinleiji :  "<span data-suit-type='black'>♠</span>" + '：对其造成2点雷电伤害'+'<br>' +"<span data-suit-type='black'>♣</span>" + '：你回复1点体力，然后对其造成1点雷电伤害' +'<br>' +"<span data-suit-type='red'>♦♥</span>" + '：'  + '雷击失效',
                leiji :  "<span data-suit-type='black'>♠♣</span>" + '：对其造成2点雷电伤害'+'<br>' +"<span data-suit-type='red'>♦♥</span>" + '：'  + '雷击失效',
                ganglie : "<span data-suit-type='red'>♦</span>" + "<span data-suit-type='black'>♠♣</span>" + '：'+ '弃置两张牌或者受到1点伤害' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：刚烈失效',
                chouce : "<span data-suit-type='red'>♦♥</span>" + '：'  + '你选择一名角色摸牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：你弃置一名角色区域内的牌',
                reganglie : "<span data-suit-type='red'>♦♥</span>" + '：'  + '你对其造成一点伤害' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：你弃置其1张',
                dcanzhi : "<span data-suit-type='red'>♦♥</span>" + '：'  + '重置霞泪的观看牌数' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：可令一名非当前回合角色获得本回合进入弃牌堆的两张牌，本回合暗织失效',
                dcxiangmian : '当该角色使用判定花色的牌或使用第X张牌后(X为判定点数)其失去所有体力',
                hongyi2 : "<span data-suit-type='red'>♦♥</span>" + '：'  + '摸1张' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：本次受到伤害-1',
                reshuishi : '可一直判定，直到花色相同',
                spzundi : "<span data-suit-type='red'>♦♥</span>" + '：'  + '移动场上1张' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：摸3张牌',
                shhlianhua:  "<span data-suit-type='black'>♠</span>" + '：' + '取消孙寒华成为杀的目标' + '<br>' + "<span data-suit-type='black'>♣</span>" + "<span data-suit-type='red'>♥♦</span>" + '：' + '莲华失效',
                txhj_huangjin : '点数与杀点数差值不大于1，此杀无效',
                twhuangjin : '点数与杀点数差值不大于1，此杀无效',
                txhj_guimen : '点数与失去的牌点数差值不大于1，对一名其他角色造成2点雷电伤害',
                txhj_dizhou : "<span data-suit-type='black'>♠♣</span>" + '：' + "其随机弃置1张" + "<br>" + "<span data-suit-type='black'>♠</span>" + "：" + "此牌无效" + "<br>" + "<span data-suit-type='black'>♠</span>" + "2~9：" + "其失去1点体力",
                scspicai:'可一直判定，直到出现花色相同',
                luoshen: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得此牌继续判定' + '<br>' +"<span data-suit-type='red'>♥♦</span>" + '：' + '结束判定',
                reluoshen: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得此牌继续判定' + '<br>' +"<span data-suit-type='red'>♥♦</span>" + '：' + '结束判定',
                qiangwu:'小于判定结果点数的杀不受距离限制，大于判定结果点数的杀不受次数限制。', 
                chouce: "<span data-suit-type='black'>♠♣</span>" + '：' + '弃置一名角色区域内的1张' + '<br>' +"<span data-suit-type='red'>♥♦</span>" + '：' + '选择一名角色摸牌',
                shencai: '包含体力:其获得笞标记' + '<br>' + '包含武器:其获得杖标记' + '<br>' + '包含打出:其获得徒标记' + '<br>' + '包含距离:其获得流标记' + '<br>' + '其他:其获得死标记',
    	        dcjilie: "若为【杀】，你可视为使用此牌（无距离限制且此【杀】伤害为本回合你使用【杀】的次数）。",
    	        dczhantao: "若点数大于伤害牌的点数，你视为对来源使用1张【杀】。",
    	        dcsugang: "获得生效的判定牌",
    	        oljiaoyu: "选择一种颜色判定牌获得",
           	    dcjiangzhi: "<span data-suit-type='red'>♦♥</span>" + '：' + '你摸三张牌'+ '<br>' +"<span data-suit-type='black'>♠♣</span>" + '：' + '你弃置一名其他角色至多两张牌',
    	        dccanzhi: "<span data-suit-type='red'>♦♥</span>" + '：' + '你重置〖霞泪〗的观看牌数'+ '<br>' +"<span data-suit-type='black'>♠♣</span>" + '：' + '〖暗织〗本回合失效，令一名非当前回合角色获得本回合进入弃牌堆的两张牌。',
    	        dcxiaoren: "<span data-suit-type='red'>♦♥</span>" + '：' + '令一名角色回复1点体力，满体力则摸1张'+ '<br>' +"<span data-suit-type='black'>♠♣</span>" + '：' + '对受伤角色上下家造1点伤害，可重复至未能执行或角色濒死',
    	        dchuayi: "你获得如下效果直到你下回合开始时" + '：' + '<br>' +"<span data-suit-type='red'>♦♥</span>" + '：' + '一名角色回合结束时你摸1张'+ '<br>' +"<span data-suit-type='black'>♠♣</span>" + '：' + '受到伤害后你摸两张牌',
                oldigong: "<span data-suit-type='red'>♥♦</span>" + "：" + "摸1张牌",
                oldigong_remove: "<span data-suit-type='red'>♥♦</span>" + "：" + "摸1张牌",
                fuzhao: "<span data-suit-type='red'>♥♦</span>" + "：" + "回复1点体力",
                olqiqi: "<span data-suit-type='red'>♥</span>" + "：" + "减少1点体力上限",
                olshenhou : "<span data-suit-type='red'>♥♦</span>" +'：' + '此【杀】对你无效' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'申猴失效',
              	clanjianzhi: "你将与你本回合使用过的花色相同的判定牌分配给任意角色" + '<br>' +"若判定牌中有你本回合未使用过的花色，你受到1点无来源雷电伤害。",
                ollbzhiji: '装备牌:你获得【神戟】' + '<br>' + '【杀】或【决斗】:你获得无双和判定牌' + '<br>' + '其他:此牌伤害+X并移除其所有“恨”标记（X为其“恨”标记数）' ,
                jsrgpianchong : "摸此回合进入弃牌堆" + '<br>' +"<span data-suit-type='red'>♥♦</span>" +'：' + '红色牌数量的牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'黑色牌数量的牌',
                mbxunjie: "<span data-suit-type='red'>♥♦</span>" + '：' + '此伤害-1',
                biancai : "<span data-suit-type='red'>♥♦</span>" +'：' + '从牌堆' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'从弃牌堆'+ '<br>' + "获得1张装备牌",
                sbkongcheng:"点数≤“星”数，此伤害-1。",
                wechatsbtiandu:"获得判定牌"+ '<br>' + "与〖天妒〗弃置牌花色相同：你受到1点无来源伤害。",
                sbtiandu:"获得判定牌"+ '<br>' + "与〖天妒〗弃置牌花色相同：你受到1点无来源伤害。",
            	olleishi: "获得判定牌"+ '<br>' + "与使用牌的花色相同：你对一名角色造成1点雷电伤害"+ '<br>' + "：你展示1张牌，本回合下次判定时，若此牌在你的手牌区内，将此牌作为判定牌",
            	xinfu_jijun: "将判定牌置于自己的武将牌上，称之为「方」",
            	olweifu: "本回合下次使用与结果类型相同的牌无距离限制且可以额外指定一个目标"+ '<br>' + "若你弃置的牌与判定牌类型相同：你摸1张牌",
            	oltianhou_diamond: "点数大于此【杀】：则此【杀】对其无效。",
            	linglongshimandai_skill: "<span data-suit-type='red'>♥</span>" + "：" + "则此牌对你无效。",
            	stardangchen_buff: "点数为其交给你的牌数的倍数：则此牌额外结算一次。",
            	dclibang: "与这两张牌的颜色均不同：你交给其中一名角色两张牌或失去1点体力"+ '<br>' + "其他：你获得判定牌并视为对其中一名角色使用1张【杀】",
            	lslixun: "点数小于“珠”的数量：你弃置等同于“珠”数量的手牌（若弃牌的牌数不够，则失去剩余数量的体力值）",
            	sxrmsigu: "获得第X个技能（X为判定点数）。魔曹操对你造成两次1点伤害，然后你失去以此法获得的技能",
                twzongquan : "<span data-suit-type='red'>♥♦</span>" +'：' + '令其摸1张牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'令其弃置1张牌'+ '<br>' + "本次选择的目标与上次相同但判定结果不同：摸/弃牌数改为3"+ '<br>' + "令一名角色获得判定牌",



                dhs_tianduyingcai : "<span data-suit-type='black'>♣</span>" + '：' + '获得判定牌'+ '<br>'+"<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♠</span>" + '：受到1点伤害',
                dhs_feishengtaixu: "根据点数依次确定你当前的体力值和手牌上限。",
                miniyanxiao : "<span data-suit-type='red'>♥♦</span>" + '：' + '摸1张' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '本回合使用【杀】次数+1',
                linglong_bagua : "<span data-suit-type='red'>♥♦</span>" +'：' + '视为出【闪】' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'八卦阵失效',
                yxcq_chanyuan: "<span data-suit-type='red'>♥♦</span>：回复1点体力",
                GXS_duzun: "<span data-suit-type='red'>♥♦</span>：【杀】伤害+1<br/><span data-suit-type='black'>♠♣</span>：失效",
                GXS_luanzhen: "<span data-suit-type='red'>♥♦</span>：获得其他角色出牌阶段技能<br/><span data-suit-type='black'>♠♣</span>：摸1张牌",
                GXS_yinglie: "<span data-suit-type='red'>♥♦</span>：回复1点体力",
                GXS_qianglve: "<span data-suit-type='black'>♠♣</span>：抽取目标1张牌",
                GXS_rangquan: "<span data-suit-type='red'>♥♦</span>：摸1张牌<br/><span data-suit-type='black'>♠♣</span>：弃置其他角色1张牌",
                GXS_xuezhan: "<span data-suit-type='red'>♥</span><span data-suit-type='black'>♠♣</span>：恢复1点体力（未脱离濒死可重复判定）<br/><span data-suit-type='red'>♦</span>：判定无效",
                GXS_lianxi: "<span data-suit-type='red'>♥♦</span>：结算两次<br/><span data-suit-type='black'>♠♣</span>：无效并摸1张牌",
                GXS_feijiang: "<span data-suit-type='black'>♠♣</span>：不可被响应<br/><span data-suit-type='red'>♥♦</span>：获得该判定牌",
                GXS_yubu: "<span data-suit-type='black'>♠♣</span>：继续判定并获得此牌<br/><span data-suit-type='red'>♥♦</span>：结束判定",
                GXS_dyyaoji: "<span data-suit-type='black'>♠</span>：跳过出牌阶段",
                GXS_houzhu: "<span data-suit-type='black'>♠</span>：掉2点血",
                GXS_jiabeng: "<span data-suit-type='black'>♠</span>：受到3点伤害",
                GXS_guidao: "<span data-suit-type='red'>♥</span>：自身回血<br/><span data-suit-type='red'>♦</span>：指定角色摸2张牌<br/><span data-suit-type='black'>♠</span>：指定角色掉1点血<br/><span data-suit-type='black'>♣</span>：指定角色弃2张牌",
                GXS_zhisheng: "点数<7：摸1张牌",
                GXS_beifu: "点数<7：令一名角色回血<br/>点数≥7：可调整判定牌位置",
                GXS_qiuhuang: "点数<7：视为使用【桃】<br/>点数≥7：令女性角色摸1张牌并交给自己1-2张",
                GXS_beimin: "点数<7：从牌堆获得两张点数≥7的牌并分配",
                GXS_dycuanquan: "与打出手牌花色不同：继续判定并获得此牌<br/>与打出手牌花色相同：结束判定",
                GXS_huiyan: "预言花色正确：摸1张牌<br/>预言花色错误：卜算3",
                yxsjn_doushen : "<span data-suit-type='red'>♥♦</span>" + '：' + '本回合可以将1张黑色手牌当【决斗】使用' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '本回合可以将1张红色手牌当【决斗】使用',
                yxsjn_gongxin: "指定花色后翻开己方1张手牌，花色一致则对方获得该牌，否则对方掉血后获得该牌",
                wzry_chuangshi: "不能使用与判定牌同种类的牌直到回合结束",
                GXS_guose_bagua : "<span data-suit-type='red'>♥♦</span>" +'：' + '视为出【闪】' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'八卦阵失效',
                GXS_jizhi_backup : "<span data-suit-type='red'>♥</span>" +'：' + '视为出【闪】' + '<br>' + "<span data-suit-type='black'>♠</span>" + '：' +'视为出【闪】'+ '<br>' +'其他:失效',
                GXS_vxshixin: "<span data-suit-type='red'>♥♦</span>：令一名男性角色从牌堆获得1张红桃牌<br/><span data-suit-type='black'>♠♣</span>：弃置一名其他角色1张",
                GXS_qicai: "连续判定直至结果为<span data-suit-type='black'>♠♣</span>，获得所有判定牌并弃置1张",
                GXS_chexuan: "基本牌：本回合额外使用1张【杀】<br/>锦囊牌：本回合攻击范围无限<br/>装备牌：本回合【杀】可指定两名目标<br/><span data-suit-type='black'>♠♣</span>：获得该判定牌",
                GXS_fengyi: "<span data-suit-type='red'>♥</span>：伤你的角色立即进入弃牌阶段<br/><span data-suit-type='black'>♠♣</span>：失效",
                GXS_qiuhuang: "点数<7：视为使用【桃】<br/>点数≥7：令女性角色摸1张牌并交给你1-2张牌",
                GXS_tianlang: "判定结果为<span data-suit-type='black'>♠</span>：对其造成2点雷电伤害<br/><span data-suit-type='black'>♣</span>：回复1点体力并对其造成1点雷电伤害<br/><span data-suit-type='red'>♥♦</span>：雷击失效",
                GXS_cifu: "<span data-suit-type='black'>♠♣</span>：交给任意角色<br/><span data-suit-type='red'>♥♦</span>：置于牌堆顶或牌堆底",
                GXS_dycuanquan: "与打出手牌花色不同：获得该判定牌<br/>与打出手牌花色相同：停止判定",
                GXS_dyyaoji: "<span data-suit-type='black'>♠</span>：跳过出牌阶段",
                yxsduji: "<span data-suit-type='red'>♥♦</span>：造成1点伤害",
                GXS_luanzhen: "<span data-suit-type='red'>♥♦</span>：获得其他角色一项出牌阶段技能<br/><span data-suit-type='black'>♠♣</span>：摸1张牌",
                GXS_vxqianglve: "点数<7：对目标造成1点伤害<br/>点数>7：获得目标1张",
                GXS_cike: "<span data-suit-type='red'>♥♦</span>：此【杀】不可闪避<br/><span data-suit-type='black'>♠♣</span>：弃置目标角色1张牌",

                dshj_linglong_bagua : "<span data-suit-type='red'>♥♦</span>" + '：视为出【闪】'+ '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '八卦失效',
                dshj_yashi_bazhen : "<span data-suit-type='red'>♥♦</span>" + '：视为出【闪】'+ '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '八卦失效',
                dshj_bazhen : "<span data-suit-type='red'>♥♦</span>" +'：' + '视为出【闪】' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' +'获得每回合首次的判定牌且不计入手牌上限。',
                dshj_baonue : "<span data-suit-type='black'>♠</span>" + '：' + '回复1点体力并获得判定牌'+ '<br>'+"<span data-suit-type='red'>♥♦</span>" + "<span data-suit-type='black'>♣</span>" + '：本回合〖暴虐〗和〖崩坏〗失效。',
                dshj_zhuilie : '不为为基本牌或普通锦囊牌，' + '：此【杀】的伤害基数改为其体力值' ,
                dshj_shencai: "<span data-suit-type='black'>♠</span>" + '：' + '获得笞标记' + '<br>' + "<span data-suit-type='black'>♣</span>" + '：' + '获得杖标记' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：' + '获得流标记' + '<br>' + "<span data-suit-type='red'>♦</span>" + '：' + '获得徒标记' + '<br>' + '无色' + '：' + '获得裁标记' + '<br>' + '重复获得' + '：' + '获得死标记，非锁定技失效',
                dshj_shencai_Use: "<span data-suit-type='black'>♠</span>" + '：' + '获得笞标记' + '<br>' + "<span data-suit-type='black'>♣</span>" + '：' + '获得杖标记' + '<br>' + "<span data-suit-type='red'>♥</span>" + '：' + '获得流标记' + '<br>' + "<span data-suit-type='red'>♦</span>" + '：' + '获得徒标记' + '<br>' + '无色' + '：' + '获得裁标记' + '<br>' + '重复获得' + '：' + '获得死标记，非锁定技失效',
                dshj_leiji: "<span data-suit-type='black'>♠</span>" + '：' + '摸1张牌，然后可以对一名角色造成2点雷电伤害”' + '<br>' + "<span data-suit-type='black'>♣️</span>" + '：' + '选择回复1点体力或摸2张牌，然后可以对一名角色造成1点雷电伤害',
                dshj_huangtian: "<span data-suit-type='black'>♠♣</span>：获得判定牌",
                dshj_huangtian_Gain: "<span data-suit-type='black'>♠♣</span>：获得判定牌并摸1张",
                dshj_chijie_Defense : '点数大于6：此牌失效',
                dshj_leijie: "<span data-suit-type='black'>♠</span>" + '或花牌' + '：' + '你重置〖驻颜〗，该角色对一名角色造成2点雷电伤害' + '<br>' + '其他' + ':无额外效果',
                dshj_huji: "<span data-suit-type='black'>♠♣</span>" + '：' + '你获得1枚“虎”' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '你可以视为使用1张无视距离、不计次限且无视防具的【杀】',
                dshj_jijun: "与牌A同色" + '：' + '获得判定牌',
                dshj_huituo: "<span data-suit-type='red'>♥♦</span>" + '：' + '令一名角色回复1体力或摸2牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '令一名角色体力上限+1',
                dshj_tieji: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得其1张牌' + '<br>' + '基本牌' + '：' + '其体力上限-1' + '<br>' + '其他' + '：' + '无效果',
                dshj_piaoling: "<span data-suit-type='red'>♥</span>" + '：' + '获得判定牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + ', ' + "<span data-suit-type='red'>♦</span>" + '：' + '并可弃置一名角色区域内1张牌',
                dshj_liangji: '奇数' + '：' + '摸1牌' + '<br>' + '偶数' + '：' + '摸2牌'+'<br>'+"可分配至多3牌",
                dshj_yice: "<span data-suit-type='black'>♠♣</span>" + '：' + '可使用1张黑色牌' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '可使用1张红色牌',
                dshj_zhantao: "视为对伤害来源使用"+ '<br>' + "<span data-suit-type='black'>♠</span>" + '：' + '1张雷【杀】' + '<br>' + "<span data-suit-type='black'>♣</span>" + '：' + '1张冰【杀】' + '<br>' + "<span data-suit-type='red'>♦</span>" + '：' + "1张火【杀】"+ '<br>' +"<span data-suit-type='red'>♥</span>" +"/无法出杀"+ '：'  + '获得判定牌' ,
                dshj_zhenlie: "与牌A同色" + '：' + '回复1体力或获得其1牌' + '<br>' + "其他" + '：' + '获得判定牌，可弃置其1牌',
                dshj_chouce: "<span data-suit-type='black'>♠♣</span>" + '：' + '可获得一名角色区域内1牌' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '令一名角色摸2牌，为先辅角色选弃1牌或从牌堆底摸1牌',
                dshj_luoshen: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得判定牌，可继续判定' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '获得判定牌，结束判定',
                dshj_fankui: '与伤害牌颜色不同' + '：' + '可获得一名角色区域内1牌',
                dshj_weihou: '摸2牌并将1牌置牌堆顶；可令至多2张手牌无上限、点数+1、不计次数无距离',
                dshj_jifeng_Fire: "<span data-suit-type='red'>♥♦</span>" + '：' + '对一名角色造成1点火焰伤害' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '获得判定牌',
                dshj_lianhua_Damage: "<span data-suit-type='black'>♠♣</span>" + '：' + '伤害值-1' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '获得判定牌',
                dshj_danfa: '丹中有同点数牌' + '：' + '回复1体力并获得1张丹' + '<br>' + '其他' + '：' + '获得判定牌',
                dshj_lingbao_Debuff: "与此牌异色" + '：' + '则此牌无效',
                dshj_mieji: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得判定牌，令此锦囊无效' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '无效果',
                dshj_lveming: '点数相同' + '：' + '重置〖屯军〗' + '<br>' + '花色相同' + '：' + '重置〖掠命〗' + '<br>' + '类别或颜色相同' + '：' + '对其造成1‑2点伤害',
                dshj_yishe: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得判定牌' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '将判定牌置为“米”，手牌上限+X',
                dshj_hongyi: "<span data-suit-type='black'>♠♣</span>" + '：' + '伤害-1' + '<br>' + "<span data-suit-type='red'>♥♦</span>" + '：' + '摸2牌弃1牌',
                dshj_SNhuishi: '连续判定至点数相同' + '<br>' + '奇数次' + '：' + '体力上限+1' + '<br>' + '偶数次' + '：' + '回复1体力' + '<br>' + '结束将所有判定牌交给一名角色，非你则其上限+1',
                dshj_dulie: "<span data-suit-type='red'>♥♦</span>" + '：' + '此【杀】无效' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '获得此【杀】实体牌',
                dshj_yingbing: '若没有“咒”' + '：' + '将判定牌置于武将牌上作为“咒”' + '<br>' + '其他' + '：' + '张宝获得判定牌并对你造成1点伤害',
                dshj_jiangzhi: "<span data-suit-type='red'>♦♥</span>" + '：' + '令一名角色摸1张牌' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '弃置一名角色区域内至多1张牌',
                dshj_anzhi: "<span data-suit-type='red'>♦♥</span>" + '：' + '本回合〖暗织〗失效，将弃牌堆中至多2张牌交给一名角色' + '<br>' + "<span data-suit-type='black'>♠♣</span>" + '：' + '可以使用1张无视距离和次数限制的黑色牌',
                dshj_yunchou_Damage: '若“筹”中有与此判定牌点数相同的牌' + '：' + '你造成/受到的伤害值+1/-1',

    minizhuilie: '武器或者坐骑牌：此【杀】的伤害基数改为其体力值<br>其他：你失去1点体力',
    minihuangjin: '杀的点数与判定的点数差值不大于1，此杀无效',
    minifuji: "<span data-suit-type='black'>♠♣</span>：此伤害+1<br><span data-suit-type='red'>♥♦</span>：该角色获得判定牌",
    minixunde: '不大于6：伤害来源弃置1张手牌<br>不小于6：其获得此牌',
    minichijie: '点数大于6：此牌失效',
    minichexuan: "<span data-suit-type='black'>♠♣</span>：将1张随机的【舆】置入你的装备区",
    minileijie: "<span data-suit-type='black'>♠2`9</span>：其受到2点雷电伤害<br>其他：其摸2张牌",
    minizlhuji: "<span data-suit-type='red'>♥♦</span>：视为你对伤害来源使用1张无距离限制的【杀】<br><span data-suit-type='black'>♠♣</span>：虎骑失效",
    minimiji: "<span data-suit-type='black'>♠♣</span>：王异观看牌堆顶的x张牌(x为你已损失的体力值)，然后将这些牌交给一名角色<br><span data-suit-type='red'>♥♦</span>：秘计失效",
    minishuangxiong: "<span data-suit-type='red'>♥♦</span>：本回合可以将1张黑色手牌当【决斗】使用<br><span data-suit-type='black'>♠♣</span>：本回合可以将1张红色手牌当【决斗】使用",
    minidingpin: "<span data-suit-type='black'>♠♣</span>：其摸其体力值的牌(至多为3)<br><span data-suit-type='red'>♥</span>：此次弃置的牌不计入弃置过的类型<br><span data-suit-type='red'>♦</span>：界陈群翻面",
    minihuituo: "<span data-suit-type='red'>♥♦</span>：其回复1点体力<br><span data-suit-type='black'>♠♣</span>：其摸此次伤害点数的牌",
    miniqingxi: "<span data-suit-type='red'>♥♦</span>：此牌伤害+1且其不能响应此牌<br><span data-suit-type='black'>♠♣</span>：此牌伤害+1",
    minijijun: '将判定牌置于武将牌上，称为【方】',
    minipiaoling: "<span data-suit-type='red'>♥</span><span data-suit-type='black'>♠</span>：你可以将此牌交给一名角色，若交给自己，需弃置1张或你将此牌置于牌堆顶<br><span data-suit-type='red'>♦</span><span data-suit-type='black'>♣</span>：飘零失效",
    mininew_wuhun: '【桃】或【桃园结义】：其存活<br>其他：其死亡',
    minitieji: "<span data-suit-type='red'>♥♦</span><span data-suit-type='black'>♠♣</span>：需弃置1张同花色牌，否则不能使用【闪】",
    miniqianxi: "<span data-suit-type='red'>♦</span><span data-suit-type='black'>♠♣</span>：防止此伤害，然后其减1点体力上限<br><span data-suit-type='red'>♥</span>：潜袭失效",
    minidulie: "<span data-suit-type='red'>♥</span>：取消神太史慈成为杀的目标<br><span data-suit-type='red'>♦</span><span data-suit-type='black'>♣♠</span>：笃烈失效",
    minihuayi: "你获得如下效果直到你下回合开始时：<br><span data-suit-type='red'>♦♥</span>：一名角色回合结束时你摸1张<br><span data-suit-type='black'>♠♣</span>：受到伤害后你摸两张牌",
    minibaonue: "<span data-suit-type='black'>♠</span>：董卓回复1点体力<br><span data-suit-type='red'>♥♦</span><span data-suit-type='black'>♣</span>：暴虐失效",
    minibeige: "<span data-suit-type='red'>♥</span>：目标回复此次伤害点数的体力<br><span data-suit-type='black'>♣</span>：目标的伤害来源翻面<br><span data-suit-type='red'>♦</span>：目标摸三张牌<br><span data-suit-type='black'>♣</span>：目标的伤害来源弃置两张牌",
    minilveming: '点数相同：你受到2点伤害<br>点数不同：随机获得你区域内1张',
    minijijing: '弃置任意张点数之和与判定结果点数相同的牌，你回复1点体力',
    minituntian: "<span data-suit-type='red'>♦</span><span data-suit-type='black'>♠♣</span>：界邓艾将这张牌作为“田”；田可以用来当作顺手牵羊和减少与其他人的距离<br><span data-suit-type='red'>♥</span>：界邓艾获得此牌",
    minibinghuo: "<span data-suit-type='black'>♠♣</span>：马元义对其造成1点雷电伤害<br><span data-suit-type='red'>♦♥</span>：兵祸失效",
    minizhenyi: "<span data-suit-type='black'>♠♣</span>：伤害+1",
    minileiji: "<span data-suit-type='black'>♠</span>：对其造成2点雷电伤害<br><span data-suit-type='black'>♣</span>：你回复1点体力，然后对其造成1点雷电伤害<br><span data-suit-type='red'>♦♥</span>：雷击失效",
    miniganglie: "<span data-suit-type='red'>♦♥</span>：你对其造成一点伤害<br><span data-suit-type='black'>♠♣</span>：你弃置其1张",
    minichouce: "<span data-suit-type='black'>♠♣</span>：弃置一名角色区域内的1张<br><span data-suit-type='red'>♥♦</span>：选择一名角色摸牌",
    minianzhi: "<span data-suit-type='red'>♦♥</span>：重置霞泪的观看牌数<br><span data-suit-type='black'>♠♣</span>：可令一名非当前回合角色获得本回合进入弃牌堆的两张牌，本回合暗织失效",
    minixiangmian: '当该角色使用判定花色的牌或使用第X张牌后(X为判定点数)其失去所有体力',
    minihongyi2: "<span data-suit-type='red'>♦♥</span>：摸1张<br><span data-suit-type='black'>♠♣</span>：本次受到伤害-1",
    minishuishi: '可一直判定，直到出现花色相同',
    minizundi: "<span data-suit-type='red'>♦♥</span>：移动场上1张<br><span data-suit-type='black'>♠♣</span>：摸3张牌",
    miniluoshen: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得此牌继续判定' + '<br>' +"<span data-suit-type='red'>♥♦</span>" + '：' + '结束判定',
    minimiaoluoshen: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得此牌继续判定' + '<br>' +"<span data-suit-type='red'>♥♦</span>" + '：' + '结束判定',
    miniqiangwu: '小于判定结果点数的杀不受距离限制，大于判定结果点数的杀不受次数限制。',
    minishencai: '包含体力:其获得笞标记<br>包含武器:其获得杖标记<br>包含打出:其获得徒标记<br>包含距离:其获得流标记<br>其他:其获得死标记',
    miniyufeng2: "<span data-suit-type='black'>♠♣</span>：跳过出牌和弃牌阶段<br><span data-suit-type='red'>♥♦</span>：跳过摸牌阶段",
    minith_yufeng: "<span data-suit-type='black'>♠♣</span>：跳过出牌和弃牌阶段<br><span data-suit-type='red'>♥♦</span>：跳过摸牌阶段",
    minishhlianhua: "<span data-suit-type='black'>♠</span>：取消孙寒华成为杀的目标<br><span data-suit-type='black'>♣</span><span data-suit-type='red'>♥♦</span>：莲华失效",
    miniscspicai: '可一直判定，直到出现花色相同',
    minijilie: "若为【杀】，你可视为使用此牌（无距离限制且此【杀】伤害为本回合你使用【杀】的次数）。",
    minizhantao: "若点数大于伤害牌的点数，你视为对来源使用1张【杀】。",
    minisugang: "获得生效的判定牌",
    minijiaoyu: "选择一种颜色判定牌获得",
    minijiangzhi: "<span data-suit-type='red'>♦♥</span>：你摸三张牌<br><span data-suit-type='black'>♠♣</span>：你弃置一名其他角色至多两张牌",
    minicanzhi: "<span data-suit-type='red'>♦♥</span>：你重置〖霞泪〗的观看牌数<br><span data-suit-type='black'>♠♣</span>：〖暗织〗本回合失效，令一名非当前回合角色获得本回合进入弃牌堆的两张牌。",
    minixiaoren: "<span data-suit-type='red'>♦♥</span>：令一名角色回复1点体力，满体力则摸1张<br><span data-suit-type='black'>♠♣</span>：对受伤角色上下家造1点伤害，可重复至未能执行或角色濒死",
    wechatzhuilie: '武器或者坐骑牌：此【杀】的伤害基数改为其体力值<br>其他：你失去1点体力',
    wechathuangjin: '杀的点数与判定的点数差值不大于1，此杀无效',
    wechatfuji: "<span data-suit-type='black'>♠♣</span>：此伤害+1<br><span data-suit-type='red'>♥♦</span>：该角色获得判定牌",
    wechatxunde: '不大于6：伤害来源弃置1张手牌<br>不小于6：其获得此牌',
    wechatchijie: '点数大于6：此牌失效',
    wechatchexuan: "<span data-suit-type='black'>♠♣</span>：将1张随机的【舆】置入你的装备区",
    wechatleijie: "<span data-suit-type='black'>♠2`9</span>：其受到2点雷电伤害<br>其他：其摸2张牌",
    wechatzlhuji: "<span data-suit-type='red'>♥♦</span>：视为你对伤害来源使用1张无距离限制的【杀】<br><span data-suit-type='black'>♠♣</span>：虎骑失效",
    wechatmiji: "<span data-suit-type='black'>♠♣</span>：王异观看牌堆顶的x张牌(x为你已损失的体力值)，然后将这些牌交给一名角色<br><span data-suit-type='red'>♥♦</span>：秘计失效",
    wechatshuangxiong: "<span data-suit-type='red'>♥♦</span>：本回合可以将1张黑色手牌当【决斗】使用<br><span data-suit-type='black'>♠♣</span>：本回合可以将1张红色手牌当【决斗】使用",
    wechatdingpin: "<span data-suit-type='black'>♠♣</span>：其摸其体力值的牌(至多为3)<br><span data-suit-type='red'>♥</span>：此次弃置的牌不计入弃置过的类型<br><span data-suit-type='red'>♦</span>：界陈群翻面",
    wechathuituo: "<span data-suit-type='red'>♥♦</span>：其回复1点体力<br><span data-suit-type='black'>♠♣</span>：其摸此次伤害点数的牌",
    wechatqingxi: "<span data-suit-type='red'>♥♦</span>：此牌伤害+1且其不能响应此牌<br><span data-suit-type='black'>♠♣</span>：此牌伤害+1",
    wechatjijun: '将判定牌置于武将牌上，称为【方】',
    wechatpiaoling: "<span data-suit-type='red'>♥</span><span data-suit-type='black'>♠</span>：你可以将此牌交给一名角色，若交给自己，需弃置1张或你将此牌置于牌堆顶<br><span data-suit-type='red'>♦</span><span data-suit-type='black'>♣</span>：飘零失效",
    wechatnew_wuhun: '【桃】或【桃园结义】：其存活<br>其他：其死亡',
    wechattieji: "<span data-suit-type='red'>♥♦</span><span data-suit-type='black'>♠♣</span>：需弃置1张同花色牌，否则不能使用【闪】",
    wechatqianxi: "<span data-suit-type='red'>♦</span><span data-suit-type='black'>♠♣</span>：防止此伤害，然后其减1点体力上限<br><span data-suit-type='red'>♥</span>：潜袭失效",
    wechatdulie: "<span data-suit-type='red'>♥</span>：取消神太史慈成为杀的目标<br><span data-suit-type='red'>♦</span><span data-suit-type='black'>♣♠</span>：笃烈失效",
    wechathuayi: "你获得如下效果直到你下回合开始时：<br><span data-suit-type='red'>♦♥</span>：一名角色回合结束时你摸1张<br><span data-suit-type='black'>♠♣</span>：受到伤害后你摸两张牌",
    wechatbaonue: "<span data-suit-type='black'>♠</span>：董卓回复1点体力<br><span data-suit-type='red'>♥♦</span><span data-suit-type='black'>♣</span>：暴虐失效",
    wechatbeige: "<span data-suit-type='red'>♥</span>：目标回复此次伤害点数的体力<br><span data-suit-type='black'>♣</span>：目标的伤害来源翻面<br><span data-suit-type='red'>♦</span>：目标摸三张牌<br><span data-suit-type='black'>♣</span>：目标的伤害来源弃置两张牌",
    wechatlveming: '点数相同：你受到2点伤害<br>点数不同：随机获得你区域内1张',
    wechatjijing: '弃置任意张点数之和与判定结果点数相同的牌，你回复1点体力',
    wechattuntian: "<span data-suit-type='red'>♦</span><span data-suit-type='black'>♠♣</span>：界邓艾将这张牌作为“田”；田可以用来当作顺手牵羊和减少与其他人的距离<br><span data-suit-type='red'>♥</span>：界邓艾获得此牌",
    wechatbinghuo: "<span data-suit-type='black'>♠♣</span>：马元义对其造成1点雷电伤害<br><span data-suit-type='red'>♦♥</span>：兵祸失效",
    wechatzhenyi: "<span data-suit-type='black'>♠♣</span>：伤害+1",
    wechatleiji: "<span data-suit-type='black'>♠</span>：对其造成2点雷电伤害<br><span data-suit-type='black'>♣</span>：你回复1点体力，然后对其造成1点雷电伤害<br><span data-suit-type='red'>♦♥</span>：雷击失效",
    wechatganglie: "<span data-suit-type='red'>♦♥</span>：你对其造成一点伤害<br><span data-suit-type='black'>♠♣</span>：你弃置其1张",
    wechatchouce: "<span data-suit-type='black'>♠♣</span>：弃置一名角色区域内的1张<br><span data-suit-type='red'>♥♦</span>：选择一名角色摸牌",
    wechatanzhi: "<span data-suit-type='red'>♦♥</span>：重置霞泪的观看牌数<br><span data-suit-type='black'>♠♣</span>：可令一名非当前回合角色获得本回合进入弃牌堆的两张牌，本回合暗织失效",
    wechatxiangmian: '当该角色使用判定花色的牌或使用第X张牌后(X为判定点数)其失去所有体力',
    wechathongyi2: "<span data-suit-type='red'>♦♥</span>：摸1张<br><span data-suit-type='black'>♠♣</span>：本次受到伤害-1",
    wechatshuishi: '可一直判定，直到出现花色相同',
    wechatzundi: "<span data-suit-type='red'>♦♥</span>：移动场上1张<br><span data-suit-type='black'>♠♣</span>：摸3张牌",
    wechatluoshen: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得此牌继续判定' + '<br>' +"<span data-suit-type='red'>♥♦</span>" + '：' + '结束判定',
    wechatmiaoluoshen: "<span data-suit-type='black'>♠♣</span>" + '：' + '获得此牌继续判定' + '<br>' +"<span data-suit-type='red'>♥♦</span>" + '：' + '结束判定',
    wechatqiangwu: '小于判定结果点数的杀不受距离限制，大于判定结果点数的杀不受次数限制。',
    wechatshencai: '包含体力:其获得笞标记<br>包含武器:其获得杖标记<br>包含打出:其获得徒标记<br>包含距离:其获得流标记<br>其他:其获得死标记',
    wechatyufeng2: "<span data-suit-type='black'>♠♣</span>：跳过出牌和弃牌阶段<br><span data-suit-type='red'>♥♦</span>：跳过摸牌阶段",
    wechatth_yufeng: "<span data-suit-type='black'>♠♣</span>：跳过出牌和弃牌阶段<br><span data-suit-type='red'>♥♦</span>：跳过摸牌阶段",
    wechatshhlianhua: "<span data-suit-type='black'>♠</span>：取消孙寒华成为杀的目标<br><span data-suit-type='black'>♣</span><span data-suit-type='red'>♥♦</span>：莲华失效",
    wechatscspicai: '可一直判定，直到出现花色相同',
    wechatjilie: "若为【杀】，你可视为使用此牌（无距离限制且此【杀】伤害为本回合你使用【杀】的次数）。",
    wechatzhantao: "若点数大于伤害牌的点数，你视为对来源使用1张【杀】。",
    wechatsugang: "获得生效的判定牌",
    wechatjiaoyu: "选择一种颜色判定牌获得",
    wechatjiangzhi: "<span data-suit-type='red'>♦♥</span>：你摸三张牌<br><span data-suit-type='black'>♠♣</span>：你弃置一名其他角色至多两张牌",
    wechatcanzhi: "<span data-suit-type='red'>♦♥</span>：你重置〖霞泪〗的观看牌数<br><span data-suit-type='black'>♠♣</span>：〖暗织〗本回合失效，令一名非当前回合角色获得本回合进入弃牌堆的两张牌。",
    wechatxiaoren: "<span data-suit-type='red'>♦♥</span>：令一名角色回复1点体力，满体力则摸1张<br><span data-suit-type='black'>♠♣</span>：对受伤角色上下家造1点伤害，可重复至未能执行或角色濒死",


            },
        };

    return true;
}
