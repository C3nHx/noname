import { lib, game, ui, get, ai, _status } from "../../../noname.js";

//●进度条时限（秒）：联机 choose_timeout 优先；否则用十周年UI的「进度条速度」（配置值是秒数的 2 倍）；都没有则固定 30 秒
function ssProgressSeconds() {
	try {
		const ol = lib.configOL;
		if (ol && ol.choose_timeout != null && ol.choose_timeout !== "") {
			const n = parseFloat(ol.choose_timeout);
			if (isFinite(n) && n > 0) return n;
		}
	} catch (e) {}
	try {
		const cfg = lib.config && lib.config.extension_十周年UI_jindutiaoST;
		const n = parseFloat(cfg);
		if (isFinite(n) && n > 0) return n / 2;
	} catch (e) {}
	return 30;
}

export function pindianUI() {
  //●兼容未安装十周年UI的环境：十周年UI给事件提供了 addMessageHook，缺失时退化为在事件结束时执行
  function addMessageHook(event, name, hook) {
    if (!event) return;
    if (typeof event.addMessageHook === "function") {
      event.addMessageHook(name, hook);
      return;
    }
    if (name !== "finished") return;
    var origFinish = event.finish;
    var called = false;
    event.finish = function () {
      if (!called) {
        called = true;
        try {
          hook.call(event);
        } catch (e) {}
      }
      return typeof origFinish === "function" ? origFinish.apply(this, arguments) : undefined;
    };
  }

  //●十周年UI的 decadeUI.delay 缺失时用相同逻辑兜底（暂停游戏并在 ms 毫秒后恢复）
  function uiDelay(ms) {
    if (window.decadeUI && typeof window.decadeUI.delay === "function") return window.decadeUI.delay(ms);
    try {
      if (_status.paused) return;
      game.pause();
      _status.timeout = setTimeout(game.resume, ms);
    } catch (e) {}
  }
  //●下面两个工具必须挂到 window 上：content 里 "step 0"/"step 1" 的代码会被 StepCompiler 重新编译执行，
  //  模块内的闭包变量在编译后不可见，直接写 addMessageHook / uiDelay 会报 xxx is not defined
  window.__ssPdAddMessageHook = addMessageHook;
  window.__ssPdDelay = uiDelay;
  //●统一的拼点框关闭入口：延时拼点、取消、异常退出时都要立即关框，否则框会一直残留
  window.__ssPdCloseHandle = function (evt) {
    try {
      if (evt && evt.compareHandle) {
        try {
          if (evt.compareHandle.clearConfirm) evt.compareHandle.clearConfirm();
        } catch (e0) {}
        try {
          if (evt.compareHandle.close) evt.compareHandle.close();
        } catch (e1) {}
        evt.compareHandle = null;
      }
    } catch (e2) {}
    try {
      document.body.classList.remove("compare-cmp-selecting");
    } catch (e3) {}
  };
  //●拼点结果写进游戏记录（game.log）：只记录谁拼点成功，无赢家时记“无人拼点成功”，不写谁负。
  //  step 内容会被 StepCompiler 重新编译，所以同样挂到 window 上供事件内容调用。
  window.__ssPdLogCompareWinner = function (winner) {
    try {
      if (winner) game.log(winner, "拼点成功");
      else game.log("无人拼点成功");
    } catch (e) {}
  };
  window.__ssPdLogCompare = function (player, target, result) {
    try {
      if (!player || !result || result.cancelled) return;
      var t = target === "cardPile" ? "牌堆" : target;
      window.__ssPdLogCompareWinner(result.tie ? null : result.winner || (result.bool ? player : t));
    } catch (e) {}
  };

window.__ssPindianImport = function (fn) {
  /*●联机客户端上 window.lib/game/ui/get 不一定全都暴露（本体只在 lib.cheat.i() 里挂全局），
    原来只认 window 的话，缺一个就会导致下面所有块永远不执行——联机拼点框完全没反应。
    这里改为 window 优先、缺失时退回本模块自己的 import（永远拿得到）*/
  var _g = function (name) {
    try {
      if (window[name]) return window[name];
    } catch (e) {}
    try {
      if (name === "lib") return lib;
      if (name === "game") return game;
      if (name === "ui") return ui;
      if (name === "get") return get;
      if (name === "ai") return ai;
      if (name === "_status") return _status;
    } catch (e) {}
    return null;
  };
  var _ran = false;
  var _run = function () {
    if (_ran) return;
    _ran = true;
    try {
      fn(_g("lib"), _g("game"), _g("ui"), _g("get"), _g("ai"), _g("_status"));
    } catch (e) {
    }
  };
  if (window.decadeModule && typeof window.decadeModule.import === "function") {
    try {
      window.decadeModule.import(function () {
        _run();
      });
    } catch (e) {}
  }
  var _n = 0;
  var _try = function () {
    if (_ran) return;
    if (_g("lib") && _g("game") && _g("ui") && _g("get")) {
      _run();
      return;
    }
    if (++_n < 300) setTimeout(_try, 100);
  };
  _try();
};
"use strict";
window.__ssPindianImport(function (lib, game, ui, get, ai, _status) {
  if (!lib || !game || !ui || !get) return;
  var defaultImgBase = lib.assetURL + "extension/自用美化/image/";
  var currentDialog = null;
  var PD_DESIGN_H = 302;
  var PD_FIT = 0.98;
  //●拼点框整体放大：只改下面 PD_SCALE 一个数（1 = 原大小，1.3 = 放大到 130%）
  var PD_SCALE = 1.3;/*★拼点*/
  game.createSsTianbianCard = function () {
    var card = ui.create.card().init(["", "", "ss_tianbian", ""]);
    card.ssTianbian = true;
    try {
      var nm0 = card.querySelector(".name");
      if (nm0) nm0.style.display = "none";
    } catch (e0) {}
    var face = document.createElement("img");
    face.src = defaultImgBase + "pindian/di_paiduiding.png";
    face.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:99;pointer-events:none;";
    card.appendChild(face);
    return card;
  };
  game.createSsJianjiCard = function (realCard) {
    var card = ui.create.card().init(["", "", "ss_jianji", ""]);
    card.ssJianji = true;
    card.cardsTop = true;
    card.ssJianjiCard = realCard || null;
    try {
      card.style.setProperty("order", "9999", "important");
    } catch (e) {}
    try {
      var nmj = card.querySelector(".name");
      if (nmj) nmj.style.display = "none";
    } catch (e0) {}
    var face = document.createElement("img");
    face.src = lib.assetURL + "extension/自用美化/image/pindian/jianji.png";
    face.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:99;pointer-events:none;";
    card.appendChild(face);
    return card;
  };
  game.createCardsTopCard = function (realCard) {
    var card = ui.create.card().init([realCard.suit, realCard.number, realCard.name, realCard.nature]);
    card.cardsTopCard = realCard;
    var face = document.createElement("img");
    face.src = defaultImgBase + "pindian/di_paiduiding.png";
    face.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:99;pointer-events:none;";
    card.appendChild(face);
    return card;
  };
  game.hasCompareCardSkill = function (p) {
    if (!p || !p.skills) return false;
    for (var i = 0; i < p.skills.length; i++) {
      var info = lib.skill[p.skills[i]];
      if (info && info.enable === "chooseCard" && info.onCompare) return true;
    }
    return false;
  };
  game.compareCardSkillName = function (p) {
    if (!p || !p.skills) return null;
    for (var i = 0; i < p.skills.length; i++) {
      var info = lib.skill[p.skills[i]];
      if (info && info.enable === "chooseCard" && info.onCompare) return p.skills[i];
    }
    return null;
  };
  game.ssLogCompareSkill = function (p, name) {
    try {
      if (!p || !name || !lib.skill[name]) return;
      var info = lib.skill[name];
      var oldPopup = info.popup;
      var oldSilent = info.silent;
      info.popup = true;
      info.silent = false;
      p.logSkill(name);
      info.popup = oldPopup;
      info.silent = oldSilent;
    } catch (e) {}
    try {
      setTimeout(function () {
        try {
          if (!_status.paused || _status.paused2) return;
          var ev = _status.event;
          if (!ev) return;
          if (ev.name === "chooseCard" || ev.name === "chooseTarget" || ev.name === "chooseToUse" || ev.name === "chooseButton" || ev.dialog) return;
          game.resume();
        } catch (e) {}
      }, 1500);
    } catch (e) {}
  };
  var ssPeekTop = function (n) {
    var out = [];
    try {
      var pile = ui.cardPile;
      if (!pile || !pile.childNodes) return out;
      var cs = pile.childNodes;
      var max = n || 3;
      for (var i = 0; i < cs.length && i < max; i++) out.push(cs[i]);
    } catch (e) {}
    return out;
  };
  var ssBackToPile = function (card) {
    try {
      if (!card || !ui.cardPile) return;
      if (card.parentNode) card.parentNode.removeChild(card);
      ui.cardPile.insertBefore(card, ui.cardPile.firstChild);
    } catch (e) {}
  };
  game.cardsTopTake = function (event) {
    var used = null;
    try {
      var e = event;
      for (var i = 0; i < 8 && e; i++) {
        if (e.card && get.itemtype(e.card) === "card") {
          used = e.card;
          break;
        }
        e = e.parent;
      }
    } catch (err) {}
    var cs = game.cardsGotoOrdering(get.cards()).cards;
    var taken = event.cardsTopTaken || (event.cardsTopTaken = []);
    for (var i = 0; i < cs.length; i++) {
      if (taken.indexOf(cs[i]) >= 0) continue;
      if (used && cs[i] === used) continue;
      taken.push(cs[i]);
      return cs[i];
    }
    return cs[0];
  };
  game.clearSsJianji = function (event, owner) {
    if (!event || !event.ssJianjiCards) return;
    var left = [];
    for (var i = 0; i < event.ssJianjiCards.length; i++) {
      var it = event.ssJianjiCards[i];
      var c = it && it.card;
      if (!c) continue;
      if (owner && it.owner != owner) {
        left.push(it);
        continue;
      }
      if (c.destroyed) continue;
      c.destroyed = true;
      try {
        c.style.setProperty("visibility", "hidden", "important");
      } catch (e) {}
      if (c.remove) c.remove();
      if (it.owner && it.owner.cards) {
        var idx = it.owner.cards.indexOf(c);
        if (idx >= 0) it.owner.cards.splice(idx, 1);
      }
    }
    event.ssJianjiCards = left;
  };
  game.clearCardsTop = function (event, owner) {
    if (!event || !event.cardsTopCards) return;
    var left = [];
    for (var i = 0; i < event.cardsTopCards.length; i++) {
      var it = event.cardsTopCards[i];
      var c = it && it.card;
      if (!c) continue;
      if (owner && it.owner != owner) {
        left.push(it);
        continue;
      }
      if (c.destroyed) continue;
      c.destroyed = true;
      if (c.remove) c.remove();
      if (it.owner && it.owner.cards) {
        var idx = it.owner.cards.indexOf(c);
        if (idx >= 0) it.owner.cards.splice(idx, 1);
      }
      if (!it.used && c.cardsTopCard) {
        var real = c.cardsTopCard;
        try {
          if (real && ui.cardPile) {
            if (real.parentNode) real.parentNode.removeChild(real);
            ui.cardPile.insertBefore(real, ui.cardPile.firstChild);
          }
        } catch (e6) {}
      }
    }
    event.cardsTopCards = left;
    if (window.dui) dui.queueNextFrameTick(dui.layoutHand, dui);
  };
  function addCompareStyle(imgBase) {
    var cssLines = [
      ":root{",
      "  --cd-title-1:#C8BEB4; --cd-title-2:#FCF8CC; --cd-title-3:#F3F0BE; --cd-title-4:#FEF5A8;",
      "  --cd-title-5:#E1D275; --cd-title-6:#C9B173; --cd-title-7:#D6CB6F; --cd-title-8:#A99355;",
      "  --cd-title-9:#AC9557; --cd-title-10:#A38A51; --cd-title-11:#B29983; --cd-title-12:#B19786; --cd-title-13:#9B8583;",
      "  --cd-title-outline:#2F1809;",
      "  --cd-tag-text:#eddac3; --cd-tag-shadow:#453325;",
      "  --cd-fold-bg:rgba(0,0,0,0.45); --cd-fold-text:#E8D5A8; --cd-fold-border:#8a7a52;",
      "  --cd-blue:#9FDCD1;",
      "  --cd-glow:rgba(255,215,0,1); --cd-glow-mid:rgba(255,215,0,0.95); --cd-glow-soft:rgba(255,215,0,0.6); --cd-glow-faint:rgba(255,215,0,0.55);",
      "  --cd-hint-shadow:#4c4037; --cd-hint-text:#BFAF58;",
      "  --cd-option-text:rgb(42,32,30);",
      "}",
      "body #compare-dialog{",
      "  position:absolute !important; left:50% !important; top:22% !important;",
      "  transform-origin:50% 0 !important;",
      "  margin-left:-651.5px !important; margin-top:0px !important;",
      "  width:1303px !important; height:var(--cmp-frame-h,302px) !important; max-height:var(--cmp-frame-h,302px) !important; min-height:0px !important;",
      "  background:url(" + imgBase + "scdialog.png) no-repeat top center/100% auto !important;",
      "  display:block !important; z-index:999;",
      "  text-align:center; overflow:visible !important;",
      "  animation:fadenum 1s ease;",
      "  --compare-bg-size:56px 73px;",
      "  --compare-bg-filter:brightness(0.7) opacity(0.8);",
      "  --compare-area-gap:80px;",
      "  --compare-hint-color:var(--cd-hint-text);",
      "  --compare-slot-w:58px;",
      "  --compare-slot-h:75px;",
      "}",
      "#compare-dialog *:not(.compare-timex):not(.compare-result-badge){animation:none !important;}",
      "#compare-dialog .compare-title{",
      "  left:5px; overflow:visible !important; padding-top:0; width:100%;",
      "  top:2px; height:calc(46px * var(--ss-pd-s,1)); line-height:calc(46px * var(--ss-pd-s,1)); text-align:center;",
      "  letter-spacing:3px !important;",
      "  background:linear-gradient(var(--cd-title-1) 1%,var(--cd-title-2) 12%, var(--cd-title-3),var(--cd-title-4),var(--cd-title-5),var(--cd-title-6),var(--cd-title-7),var(--cd-title-8),var(--cd-title-9),var(--cd-title-10),var(--cd-title-10),var(--cd-title-11),var(--cd-title-12),var(--cd-title-12),var(--cd-title-12), var(--cd-title-13) ),",
      "              linear-gradient(to right,var(--cd-title-2) , var(--cd-title-9));",
      "  font-family:HYZLSJ,shousha,xinwei !important; font-size:calc(42px * var(--ss-pd-s,1)) !important; font-weight:500 !important;",
      "  -webkit-background-clip:text; text-shadow:none; -webkit-text-fill-color:transparent;",
      "  -webkit-text-stroke:0 !important;",
      "  position:absolute; z-index:2; pointer-events:none;",
      "}",
      "#compare-dialog .compare-title img{width:calc(34.5px * var(--ss-pd-s,1));height:calc(28.75px * var(--ss-pd-s,1));margin-left:2px;margin-top:-4px;vertical-align:middle;pointer-events:auto !important;cursor:pointer !important;}",
      "#compare-dialog .compare-line{",
      "  position:absolute; left:0; width:100%;",
      "  display:flex; justify-content:center; align-items:center;",
      "  overflow:visible !important; overflow-y:visible !important;",
      "}",
      "#compare-dialog .compare-area{",
      "  position:relative; display:flex; align-items:flex-start;",
      "  overflow:visible !important;",
      "}",
      "#compare-dialog .compare-area + .compare-area{margin-left:var(--compare-area-gap);}",
      "#compare-dialog .compare-tag{",
      "  position:absolute; top:50%; transform:translateY(-50%);",
      "  right:calc(100% + 3px);",
      "  width:var(--compare-tag-w,38px); height:var(--compare-tag-h,117px);",
      "  background:url(" + imgBase + "cebian.png) no-repeat center/100% 100% !important;",
      "  writing-mode:tb-rl; font-size:var(--compare-tag-fs,20px); overflow:hidden;",
      "  color:var(--cd-tag-text); font-family:shousha;",
      "  justify-content:center; align-items:center; display:flex;",
      "  text-shadow:0 0 2px var(--cd-tag-shadow),0 0 2px var(--cd-tag-shadow);",
      "}",
      "#compare-dialog .compare-slot{",
      "  position:relative; width:var(--compare-slot-w,58px); height:var(--compare-slot-h,75px);",
      "  display:flex; align-items:flex-start; justify-content:center;",
      "  overflow:visible !important;",
      "}",
      "#compare-dialog .compare-slot::before{",
      "  content:\"\"; position:absolute; left:0; top:0; width:100%; height:100%;",
      "  background:url(" + imgBase + "compareCard.png) no-repeat top center/var(--compare-bg-size);",
      "  filter:var(--compare-bg-filter);",
      "}",
      "#compare-dialog .compare-slot .card{",
      "  margin:0 !important; padding:0 !important;",
      "  border:none !important; box-shadow:none !important;",
      "  background-size:100% 100% !important;",
      "  animation:none !important;",
      "  pointer-events:none !important;",
      "}",
      //●未安装十周年UI时保留原生卡名（左上角），和下方手牌区一致；安装十周年UI时仍隐藏
      window.decadeUI ? "#compare-dialog .compare-slot .card .name{display:none !important;}" : "",
      //●花色点数：未安装十周年UI时保留原生 .info（右上角显示花色点数）；安装十周年UI时隐藏，避免和它的花色点数重复
      window.decadeUI ? "#compare-dialog .compare-slot .card .info{display:none !important;}" : "",
      "#compare-dialog .compare-slot .card.infohidden .fullimage,",
      "#compare-dialog .compare-slot .card.infohidden .cardimage{display:none !important;}",
      "#compare-dialog .compare-slot .card .fullimage,",
      "#compare-dialog .compare-slot .card .cardimage{",
      "  position:absolute !important; left:0 !important; top:0 !important;",
      "  width:100% !important; height:100% !important;",
      "  background-size:100% 100% !important;",
      "}",
      "#compare-dialog .compare-cardbox{",
      "  position:relative; z-index:10; flex:none;",
      "  overflow:visible !important;",
      "  cursor:default;",
      "}",
      "#compare-dialog .compare-cardbox.compare-picked{ z-index:30 !important; }",
      "#compare-dialog .compare-cardbox.compare-picked::after{",
      "  content:\"\"; position:absolute; left:0; top:0; width:100%; height:100%;",
      "  outline:2px solid gold; outline-offset:-2px; border-radius:8px;",
      "  box-shadow:0 0 3px var(--cd-glow), 0 0 6px var(--cd-glow-soft);",
      "  pointer-events:none; z-index:15;",
      "}",
      "#compare-dialog .compare-blue{color:var(--cd-blue);}",
      "body.compare-cmp-selecting .card.selected{",
      "  outline:2px solid gold !important; outline-offset:-2px !important;",
      "  box-shadow:0 0 4px var(--cd-glow-mid),0 0 10px var(--cd-glow-faint) !important;",
      "  border-radius:8px !important;",
      "}",
      "#compare-dialog .compare-hint{",
      /*●提示文字贴着进度条下沿开始排（top 定位），超出的部分往下换行，不再往上压进度条*/
      "  position:absolute; top:calc(100% - 29px); bottom:auto; width:100%;",
      "  display:flex; flex-wrap:wrap; text-align:center; justify-content:center;",
      "  white-space:normal !important; word-break:break-word; line-height:1.25;",
      "  padding:0 calc(40px * var(--ss-pd-s,1)); box-sizing:border-box;",
      "  color:var(--cd-hint-text);",
      "  font-family:'shousha'; font-size:calc(14px * var(--ss-pd-s,1)); letter-spacing:2px;",
      "  text-shadow:0 0 3px var(--cd-hint-shadow),0 0 3px var(--cd-hint-shadow),0 0 3px var(--cd-hint-shadow);",
      "  z-index:10;",
      "}",
      "#compare-dialog .compare-hint .card-blue{",
      "  color:#8fd6ff;",
      "}",
      "@keyframes compare-time{ from{width:100%;} to{width:0%;} }",
      "#compare-dialog .compare-progress{ transition:bottom 0.2s linear !important;",
      "  position:absolute; width:calc(420px * var(--ss-pd-s,1)); left:50%; transform:translateX(-50%); bottom:34px; height:calc(8px * var(--ss-pd-s,1));",
      "  background:rgba(0,0,0,0.4);",
      "  border-radius:1000px; border:1.2px solid #000000; box-shadow:0 0 9px #2e2b27 inset, 0 0 2.1px #FFFFD5; z-index:7; overflow:hidden;",
      "}",
      "#compare-dialog .compare-timex{",
      "  position:absolute; left:0; top:0; bottom:0; height:auto; width:100%;",
      "  background-image:linear-gradient(#fccc54 15%, #d01424 30%, #cc6953 90%);",
      "  animation:compare-time 35s linear infinite !important;",
      "}",
      "body.compare-cmp-selecting #jindutiaopl{ display:none !important; }",
      /*●*/
      "#compare-dialog .compare-confirm{",
      "  position:absolute; left:calc(50% - 51px * var(--ss-pd-s,1)); bottom:52px;",
      "  width:calc(88px * var(--ss-pd-s,1)); height:calc(34px * var(--ss-pd-s,1));",
      "  min-width:calc(88px * var(--ss-pd-s,1)); min-height:6px; padding:2.5px 6.75px;",
      "  background:url(" + imgBase + "confirmButton.png) no-repeat center/100% 100%;",
      "  display:none; cursor:pointer; z-index:10;",
      "}",
      "#compare-dialog .compare-confirm.compare-off{",
      "  filter:grayscale(0.75) brightness(0.85); cursor:not-allowed;",
      "  pointer-events:none;",
      "}",
      "#compare-dialog .compare-cancel{",
      "  position:absolute; left:calc(50% + 73px * var(--ss-pd-s,1)); bottom:56px;",
      "  width:calc(100px * var(--ss-pd-s,1)); height:calc(35px * var(--ss-pd-s,1));",
      "  min-width:calc(100px * var(--ss-pd-s,1)); min-height:6px; padding:2.5px 6.75px;",
      "  background:url(" + imgBase + "cancel.png) no-repeat center/100% 100%;",
      "  display:none; cursor:pointer; z-index:10;",
      "}",
      lib.config.extension_自用美化_confirmGlow !== false
        ? "#compare-dialog .compare-confirm:active, #compare-dialog .compare-cancel:active{filter:brightness(1.8) !important;-webkit-filter:brightness(1.8) !important;}"
        : "",
      ".compare-title img{ transition:transform 0.25s ease; }",
      "#compare-dialog.cd-fold .compare-title img{ transform:scaleY(-1) !important; }",
      "#compare-dialog.cd-fold .compare-confirm,",
      "#compare-dialog.cd-fold .compare-cancel{ display:none !important; }",
      "#compare-dialog.cd-fold .compare-line{ display:none !important; }",
      "#compare-dialog.cd-fold .compare-hint{ display:none !important; }",
      //●折叠态进度条再往下挪，贴着框底
      "#compare-dialog.cd-fold .compare-progress{ bottom:8px !important; z-index:20 !important; opacity:1 !important; pointer-events:none !important; display:block !important; }",
      "#compare-dialog.cd-fold .compare-timex{ display:block !important; }",
      //●折叠时隐藏 cd-result 的大幅结果底图，避免折叠后仍留着一整块阴影框
      "#compare-dialog.cd-fold::before{ display:none !important; }",
      "#compare-dialog{ transition:height 0.3s ease, top 0.3s ease !important; }",
      "#compare-dialog.cd-fold{ height:78px !important; top:var(--ss-fold-top) !important; margin-top:0px !important;",
      "  background:url(" + imgBase + "scdialog.png) no-repeat top center/100% auto !important; }",
      //●折叠态不再隐藏本体确认条（原 opacity:0 规则已移除）
      "#compare-dialog.cd-result{ background:transparent !important; top: calc(-30px * var(--ss-pd-r,1)) !important; transition: top 0.3s ease; pointer-events:none !important; }",
      "#compare-dialog.cd-result::before{",
      "  content:\"\"; position:absolute; left:0; top:0; width:100%; height:var(--compare-result-h,221px);",
      "  background:url(" + imgBase + "scdialog.png) no-repeat top center/100% auto;",
      "  z-index:-1; pointer-events:none;",
      "}",
      "#compare-dialog.cd-result .compare-progress,",
      "#compare-dialog.cd-result .compare-hint,",
      "#compare-dialog.cd-result .compare-confirm,",
      "#compare-dialog.cd-result .compare-cancel{ display:none !important; }",
      //●折叠后不要让阴影框整个消失：放在 cd-result 规则之后，让折叠态的窄条底图优先级高于它的 background:transparent，
      //●这样折叠后仍是一整条 78px 高的框（和图二先行折叠效果一致）
      "#compare-dialog.cd-fold{ background:url(" + imgBase + "scdialog.png) no-repeat top center/100% auto !important; }",
      "#compare-dialog.cd-result.cd-fold .compare-progress{ display:block !important; }",
      "#compare-dialog .compare-result-badge{",
      "  content:\"\"; position:absolute; right:-25px; bottom:-8px; top:auto; left:auto;",
      "  width:80px; height:80px; background-size:100% 100% !important;",
      "  background-repeat:no-repeat !important; z-index:100; pointer-events:none;",
      "  animation:compare-losewin 2.5s;",
      "}",
      "#compare-dialog .compare-result-badge.is-win{",
      "  background-image:url(" + defaultImgBase + "pindian/win.png) !important;",
      "}",
      "#compare-dialog .compare-result-badge.is-nowin{",
      "  width:100px; height:80px; right:-30px; bottom:-10px;",
      "  background-image:url(" + defaultImgBase + "pindian/lose.png) !important;",
      "}",
      "@keyframes compare-losewin{ from{opacity:0;} to{opacity:1;} }"
    ].join("\n");
    var styleEl = document.getElementById("compare-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "compare-style";
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = cssLines;
  }
  function makeCardBack(link, scale) {
    try {
      var cardEl = ui.create.card();
      cardEl.className = "card infohidden";
      if (link) cardEl.link = link;
      cardEl.style.setProperty("zoom", scale != null ? scale : 0.9, "important");
      return cardEl;
    } catch (e) {
      var cardEl = document.createElement("div");
      cardEl.className = "card infohidden";
      if (link) cardEl.link = link;
      cardEl.style.setProperty("zoom", scale != null ? scale : 0.9, "important");
      return cardEl;
    }
  }
  function makeCardFace(card, scale) {
	try {
		if (card && typeof card.hasGaintag === "function" && card.hasGaintag("mbjianji")) {
			var _jj = ui.create.card().init(["", "", "ss_jianji", ""]);
			_jj.ssJianji = true;
			try { var _nmj = _jj.querySelector(".name"); if (_nmj) _nmj.style.display = "none"; } catch (e0) {}
			var _face = document.createElement("img");
			_face.src = lib.assetURL + "extension/自用美化/image/pindian/jianji.png";
			_face.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:99;pointer-events:none;";
			_jj.appendChild(_face);
			_jj.style.setProperty("zoom", scale != null ? scale : 0.9, "important");
			return _jj;
		}
	} catch (e) {}
    try {
      var __isTb = !!(card && card.ssTianbian);
      var __isTop = !!(card && card.cardsTopCard);
      if (__isTop) card = card.cardsTopCard;
      var cardEl = null;
      if (!window.decadeUI && card && typeof card.copy === "function") {
        //●未安装十周年UI时用带 info 的卡牌，花色点数才能显示；
        //  copy(false) 不带 info，会出现「拼点框卡牌没有花色点数」
        cardEl = card.copy();
      } else if (card && typeof card.copy === "function") {
        cardEl = card.copy(false);
      }
      if (!cardEl || !(cardEl.dataset && cardEl.dataset.cardName)) {
        var rebuilt = ui.create.card(null, card);
        if (rebuilt) cardEl = rebuilt;
      }
      if (!cardEl) {
        cardEl = document.createElement("div");
        cardEl.className = "card";
      }
      if (__isTb) {
        try {
          var nmTb = cardEl.querySelector(".name");
          if (nmTb) nmTb.style.display = "none";
        } catch (e3) {}
      }
      if (__isTop) {
        try {
          var face = document.createElement("img");
          face.src = defaultImgBase + "pindian/di_paiduiding.png";
          face.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:99;pointer-events:none;";
          cardEl.appendChild(face);
        } catch (e2) {}
      }
    } catch (e) {
      cardEl = document.createElement("div");
      cardEl.className = "card";
    }
    if (cardEl) cardEl.link = card;
    //●copy()/cloneNode 出来的卡牌不会带本体的事件监听，这里补挂长按介绍（本体显示卡牌的效果）
    try {
      if (cardEl && lib && typeof lib.setIntro === "function" && !cardEl._longpresscallback) lib.setIntro(cardEl);
    } catch (eI) {}
    cardEl.style.setProperty("zoom", scale != null ? scale : 0.9, "important");
    cardEl.style.setProperty("transition", "none", "important");
    cardEl.classList.remove("selected", "compare-picked", "glow");
    return cardEl;
  }
  var _ssNumFxCache = null;
function ssPlayNumFx(box, cardEl) {
	var base = lib.assetURL + "extension/自用美化/animation/pindian/huanshuzi_0000";
	if (!_ssNumFxCache) {
		_ssNumFxCache = [];
		for (var i = 0; i < 4; i++) {
			var im = new Image();
			im.src = base + i + ".png";
			_ssNumFxCache.push(im);
		}
	}
	try {
		var old = box.querySelector(".ss-num-fx");
		if (old && old.parentNode) old.parentNode.removeChild(old);
	} catch (e) {}
	var img = document.createElement("img");
	img.className = "ss-num-fx";
	var w = 0,
		h = 0;
	try {
		w = cardEl.offsetWidth || 0;
		h = cardEl.offsetHeight || 0;
	} catch (e) {}
	if (!w) w = 80;
	if (!h) h = 110;
	var sz = Math.round(Math.min(w * 0.92, h * 0.76));
	var cx = Math.round(w * 0.18);
	var cy = Math.round(h * 0.22);
	try {
		var numEl = cardEl.querySelector(".suit-num") || cardEl.querySelector(".info");
		if (numEl) {
			var ib = numEl.getBoundingClientRect();
			var cb = cardEl.getBoundingClientRect();
			if (ib.width > 0 && ib.height > 0 && cb.width > 0) {
				cx = Math.round(ib.left - cb.left + ib.width / 2);
				cy = Math.round(ib.top - cb.top + ib.height / 2);
			}
		}
	} catch (e) {}
	cx += Math.round(w * 0.01);
	cy -= Math.round(h * 0.08);
	img.style.cssText =
		"position:absolute;left:" + (cx - Math.round(sz / 2)) + "px;top:" + (cy - Math.round(sz / 2)) + "px;width:" + sz + "px;height:" + sz + "px;pointer-events:none;z-index:60;";
	img.src = _ssNumFxCache[0].src;
	try {
		box.style.position = "relative";
		box.appendChild(img);
	} catch (e) {}
	var f = 0;
	var total = 3;
	var timer = setInterval(function () {
		f++;
		if (f > total) {
			clearInterval(timer);
			try {
				img.remove();
			} catch (e) {}
			return;
		}
		try {
			img.src = _ssNumFxCache[f % 4].src;
		} catch (e) {}
	}, 100);
}

function createCompareDialog(player, holder, opts) {
    try {
      opts = opts || {};
      var imgBase = (opts.imgBase || defaultImgBase).replace(/\/?$/, "/");
      var hintText = opts.hint != null ? opts.hint : null;
      var hintColor = opts.hintColor || "#BFAF58";
      var titleText = opts.title || "拼点";
      var players = opts.players || [player];
      var faceBack = opts.faceBack || [];
      addCompareStyle(imgBase);
      var oldDialog = document.getElementById("compare-cmp-dialog");
      if (oldDialog && oldDialog.parentNode) oldDialog.parentNode.removeChild(oldDialog);
      var dialog = ui.create.dialognew("#compare-dialog");
      //●不再屏蔽本体确认/取消：保留游戏本体的确认条（原 holdConfirm() 已移除）
      try {
        if (typeof dialog.__ssPdApplyRatio === "function") dialog.__ssPdApplyRatio(dialog);
      } catch (e0) {}
      if (holder) holder.dialog = dialog;
      dialog.style.setProperty("--compare-hint-color", hintColor);
      //●把放大比例写进 CSS 变量：标题/确定/取消/进度条等 CSS 里的尺寸都按它一起缩放
      dialog.style.setProperty("--ss-pd-s", String(PD_SCALE));
      dialog.style.setProperty("--compare-area-gap", (opts.areaGap != null ? opts.areaGap : 80) + "px");
      dialog.style.setProperty("height", "302px", "important");
      dialog.style.setProperty("left", "50%", "important");
      dialog.style.setProperty("top", "22%", "important");
      dialog.style.setProperty("margin-left", "-651.5px", "important");
      dialog.style.setProperty("margin-top", "0px", "important");
      var cardW = 62,
        cardH = 81;
      try {
        var measureCard = ui.create.card();
        measureCard.className = "card";
        measureCard.style.position = "absolute";
        measureCard.style.left = "-9999px";
        measureCard.style.top = "-9999px";
        measureCard.style.visibility = "hidden";
        dialog.appendChild(measureCard);
        cardW = measureCard.offsetWidth || 62;
        cardH = measureCard.offsetHeight || 81;
        if (measureCard.parentNode) measureCard.parentNode.removeChild(measureCard);
      } catch (e) {
        cardW = 62;
        cardH = 81;
      }
      var SLOT_RATIO = 1;
      var slotW = 0,
        slotH = 0;
      try {
        var firstHand = null;
        try {
          var hcBox = [];
          try {
            if (game.me && typeof game.me.getCards === "function") hcBox = hcBox.concat(game.me.getCards("h") || []);
          } catch (e3) {}
          if (game.me && game.me.node) {
            if (game.me.node.handcards1) hcBox.push(game.me.node.handcards1);
            if (game.me.node.handcards2) hcBox.push(game.me.node.handcards2);
          }
          if (!hcBox.length) {
            var hcList = document.querySelectorAll("#handcards1, #handcards2, .handcards");
            for (var hi = 0; hi < hcList.length; hi++) hcBox.push(hcList[hi]);
          }
          var bestArea = 0;
          for (var ci = 0; ci < hcBox.length; ci++) {
            var node = hcBox[ci];
            if (!node) continue;
            var pool = [];
            if (node.classList && node.classList.contains("card")) pool = [node];
            else if (node.querySelectorAll) pool = node.querySelectorAll(".card");
            for (var cj = 0; cj < pool.length; cj++) {
              if (!pool[cj].getBoundingClientRect) continue;
              var cr = pool[cj].getBoundingClientRect();
              var area = cr.width * cr.height;
              if (area > bestArea) {
                bestArea = area;
                firstHand = pool[cj];
              }
            }
          }
        } catch (e2) {}
        if (firstHand && firstHand.getBoundingClientRect) {
          var hr = firstHand.getBoundingClientRect();
          //●补偿皮肤切换扩展的 chrome-fix：它把 getBoundingClientRect 的结果除以 documentZoom，
          //  不乘回来会把手牌尺寸测偏，导致拼点框整体变大 / 左侧牌起始位置左移
          var _rz = 1;
          try {
            if (String(HTMLElement.prototype.getBoundingClientRect).indexOf("documentZoom") !== -1) {
              _rz = window.documentZoom || window.devicePixelRatio || 1;
            }
          } catch (e4) {}
          var handW = hr && hr.width > 4 ? hr.width * _rz : 0;
          var handH = hr && hr.height > 4 ? hr.height * _rz : 0;
          var rr = dialog.__ssPdRatio || 1;
          if (handW > 4 && handH > 4 && rr > 0) {
            slotW = Math.round((handW / rr) * SLOT_RATIO);
            slotH = Math.round((handH / rr) * SLOT_RATIO);
          }
        }
      } catch (e) {}
      if (!slotW || !slotH) {
        slotW = Math.round(cardW * 0.75);
        slotH = Math.round(cardH * 0.75);
      }
      var k = slotH / 75;
      if (!(k > 0) || k < 0.6 || k > 2.4) {
        k = 1;
        slotW = 56;
        slotH = 75;
      }
      //●未安装十周年UI时卡牌接近方形：卡槽也取方形（参照五谷框里的原生卡牌），
      //  不再沿用 compareCard.png 卡背的竖长方形比例
      if (!window.decadeUI && slotW > 0 && slotH > 0) {
        var __pdSide = Math.min(slotW, slotH);
        slotW = __pdSide;
        slotH = __pdSide;
      }
      //●按 PD_SCALE 整体放大卡槽：标签/确定取消按钮/进度条/框高都是由 slotH 或 --ss-pd-s 推导出来的，会一起变大
      slotW = Math.round(slotW * PD_SCALE);
      slotH = Math.round(slotH * PD_SCALE);
      var cardScale = slotW / cardW;
      var tagH = Math.max(40, Math.round(slotH * 0.85));
      var tagW = Math.max(14, Math.round(tagH * 0.32));
      var slotBoxW = slotW + 2;
      var slotBoxH = slotH + 2;
      //●标题条高度也按同一比例放大，避免标题变大后压到卡牌
      var lineTop = Math.round(48 * PD_SCALE);
      var contentBottom = lineTop + slotBoxH;
      var OK_H = 50;
      var GAP_OK = 5;
      var GAP_PG = 5;
      var okTop = contentBottom - 2 + GAP_OK;
      var progTop = okTop + OK_H + GAP_PG;
      var dialogH = progTop + 42;
      dialog.style.setProperty("height", dialogH + "px", "important");
      dialog.style.setProperty("--cmp-frame-h", dialogH + "px");
      dialog.__ssExpandHeight = dialogH + "px";
      dialog.style.setProperty("--compare-slot-w", slotBoxW + "px");
      dialog.style.setProperty("--compare-slot-h", slotBoxH + "px");
      dialog.style.setProperty("--compare-bg-size", slotW + "px " + slotH + "px");
      dialog.style.setProperty("--compare-tag-w", tagW + "px");
      dialog.style.setProperty("--compare-tag-h", tagH + "px");
      dialog.style.setProperty("--compare-tag-fs", Math.max(9, Math.round(tagH * 0.16)) + "px");
      var titleEl = ui.create.div(".compare-title", dialog);
      titleEl.innerHTML = titleText + "<img src=\"" + imgBase + "arrow.png\"/>";
      var hintEl = ui.create.div(".compare-hint", dialog);
      if (hintText) hintEl.innerHTML = hintText;
      var progressEl = ui.create.div(".compare-progress", dialog);
      var timexEl = document.createElement("div");
      timexEl.className = "compare-timex";
      progressEl.appendChild(timexEl);
      var lineEl = ui.create.div(".compare-line", dialog);
      var areas = [];
      players.forEach(function (p, i) {
        var areaEl = ui.create.div(".compare-area", lineEl);
        var tagEl = ui.create.div(".compare-tag", areaEl);
        tagEl.innerText = get.translation(p.name);
        var tagName = get.translation(p.name) || "";
        if (tagName.length > 4) tagEl.style.fontSize = Math.max(7, Math.floor((tagH * 0.55) / tagName.length)) + "px";
        var area = {};
        area.p = p;
        area.el = areaEl;
        area.box = null;
        area.cardEl = null;
        areas.push(area);
      });
      var nPlayers = players.length;
      if (nPlayers > 4) {
        var dynGap = Math.max(48, 80 - (nPlayers - 4) * 12);
        dialog.style.setProperty("--compare-area-gap", dynGap + "px");
      }
      lineEl.style.top = lineTop + "px";
      lineEl.style.transform = "translateX(" + Math.round(tagW / 2 + 1.5) + "px)";
      dialog.style.setProperty("--compare-result-h", (lineTop + slotBoxH + 14) + "px");
      var okBtn = ui.create.div(".compare-confirm", dialog);
      var cancelBtn = ui.create.div(".compare-cancel", dialog);
      okBtn.style.setProperty("top", okTop + "px", "important");
      okBtn.style.setProperty("bottom", "auto", "important");
      cancelBtn.style.setProperty("top", (okTop + 4) + "px", "important");
      cancelBtn.style.setProperty("bottom", "auto", "important");
      if (opts.collapsible !== false) {
        var expandHeight = dialog.style.height || "302px";
        var expandTop = dialog.style.top || "75px";
        var lastFoldAt = 0;
        function setFold(fold) {
          dialog.style.transition = "height 0.3s ease, top 0.3s ease";
          if (fold) {
            dialog.classList.add("cd-fold");
            dialog.style.setProperty("height", "78px", "important");
            //●折叠态统一位置：由 extension.js 的 --ss-fold-top 控制
            dialog.style.setProperty("top", "var(--ss-fold-top)", "important");
            dialog.style.setProperty("margin-top", "0px", "important");
            dialog.style.setProperty("pointer-events", "none", "important");
            titleEl.style.pointerEvents = "auto";
          } else {
            dialog.classList.remove("cd-fold");
            dialog.style.setProperty("height", expandHeight, "important");
            dialog.style.setProperty("top", expandTop, "important");
            dialog.style.setProperty("margin-top", "0px", "important");
            //●展开时不要写死 pointer-events:auto：结果态(cd-result)本身是 pointer-events:none，
            //●写死自动后整块透明框会盖住本体"取消"按钮导致点不动；这里清掉内联值交回 CSS
            dialog.style.removeProperty("pointer-events");
            titleEl.style.pointerEvents = "";
          }
        }
        var lastFoldTime = 0;
        function onFoldPress(e) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          var now = Date.now();
          if (now - lastFoldTime < 50) return;
          lastFoldTime = now;
          lastFoldAt = now;
          setFold(!dialog.classList.contains("cd-fold"));
        }
        function onFoldClick(e) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          if (!window.PointerEvent && Date.now() - lastFoldAt > 800) {
            lastFoldAt = Date.now();
            setFold(!dialog.classList.contains("cd-fold"));
          }
        }
        function bindFoldEvents(el) {
          if (!el) return;
          //●事件绑在标题容器上做委托：reset()/setTitle() 会重写 innerHTML，
          //●箭头 img 变成新节点，直接绑在 img 上的旧监听会失效（拼点结束后续提示就无法折叠）
          var isArrow = function (e) {
            return !!(e && e.target && e.target.tagName === "IMG");
          };
          var onPressArrow = function (e) {
            if (!isArrow(e)) return;
            onFoldPress(e);
          };
          var onClickArrow = function (e) {
            if (!isArrow(e)) return;
            onFoldClick(e);
          };
          el.addEventListener("pointerdown", onPressArrow, true);
          el.addEventListener("mousedown", onPressArrow, true);
          var touchOpt = {};
          touchOpt.passive = false;
          touchOpt.capture = true;
          el.addEventListener("touchstart", onPressArrow, touchOpt);
          el.addEventListener("click", onClickArrow, true);
          el.style.cursor = "pointer";
        }
        bindFoldEvents(titleEl);
      }
      dialog.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      var touchOpts = {};
      touchOpts.passive = true;
      touchOpts.capture = true;
      dialog.addEventListener("touchstart", function (e) {
        if (e.touches.length === 1) {
          e.stopPropagation();
        }
      }, touchOpts);
      var __ssStopBubble = function (e) {
        try {
          e.stopPropagation();
        } catch (e0) {}
      };
      dialog.addEventListener("touchend", __ssStopBubble, false);
      dialog.addEventListener("click", __ssStopBubble, false);
      function fitCardToSlot(cardEl) {
        if (!cardEl) return;
        try {
          cardEl.style.setProperty("transition", "none", "important");
          var kids = cardEl.querySelectorAll ? cardEl.querySelectorAll("*") : [];
          for (var ki = 0; ki < kids.length; ki++) {
            try {
              kids[ki].style.setProperty("transition", "none", "important");
              kids[ki].style.setProperty("animation", "none", "important");
            } catch (ek) {}
          }
          //●已移除把卡牌字号强行匹配手牌字号的逻辑（matchHandCardFonts），花色点数交给十周年UI渲染
          cardEl.style.setProperty("zoom", 1, "important");
          var bw = cardEl.offsetWidth || 0;
          var bh = cardEl.offsetHeight || 0;
          if (!(bw > 0) || !(bh > 0)) return;
          var z = Math.min(slotW / bw, slotH / bh);
          if (!(z > 0)) z = 1;
          if (!window.decadeUI) {
            //●兼容未安装十周年UI：此时卡牌自身尺寸/比例与手牌不一致，zoom 无法铺满卡槽，
            //  直接把卡牌按卡槽宽高铺满，避免出现「卡槽比卡牌大」的空框
            cardEl.style.setProperty("width", slotW + "px", "important");
            cardEl.style.setProperty("height", slotH + "px", "important");
            cardEl.style.setProperty("zoom", 1, "important");
          } else {
            cardEl.style.setProperty("zoom", z.toFixed(4), "important");
          }
        } catch (e) {}
      }
      function setSlotCard(area, mode) {
        if (area.__ssLastMode === mode && area.cardEl && area.cardEl.parentNode) return;
        area.__ssLastMode = mode;
        var areaEl = area.el;
        var oldSlots = areaEl.querySelectorAll(".compare-slot");
        for (var i = 0; i < oldSlots.length; i++) {
          if (oldSlots[i].parentNode) oldSlots[i].parentNode.removeChild(oldSlots[i]);
        }
        var slotEl = document.createElement("div");
        slotEl.className = "compare-slot";
        areaEl.appendChild(slotEl);
        var cardBox = document.createElement("div");
        cardBox.className = "compare-cardbox";
        cardBox.style.width = slotW + "px";
        cardBox.style.height = slotH + "px";
        slotEl.appendChild(cardBox);
        if (mode === "back") {
          var backEl = makeCardBack(null, 1);
          backEl.style.setProperty("visibility", "hidden", "important");
          cardBox.appendChild(backEl);
          fitCardToSlot(backEl);
          backEl.style.removeProperty("visibility");
          area.cardEl = backEl;
        } else if (mode === "pile-top") {
          //●牌堆顶占位：直接用 di_paiduiding.png 素材
          var topEl = null;
          try {
            if (game.createSsTianbianCard) topEl = game.createSsTianbianCard();
          } catch (eT) {}
          if (!topEl) {
            topEl = document.createElement("div");
            topEl.className = "card";
            var topFace = document.createElement("img");
            topFace.src = imgBase + "pindian/di_paiduiding.png";
            topFace.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:99;pointer-events:none;";
            topEl.appendChild(topFace);
          }
          topEl.style.setProperty("visibility", "hidden", "important");
          cardBox.appendChild(topEl);
          fitCardToSlot(topEl);
          topEl.style.removeProperty("visibility");
          area.cardEl = topEl;
        } else if (mode) {
          var faceEl = makeCardFace(mode, 1);
          faceEl.style.setProperty("visibility", "hidden", "important");
          cardBox.appendChild(faceEl);
          fitCardToSlot(faceEl);
          faceEl.style.removeProperty("visibility");
          area.cardEl = faceEl;
        }
        area.box = cardBox;
        area.card = mode && mode !== "back" && mode !== "pile-top" ? mode : null;
      }
      areas.forEach(function (area, i) {
        if (faceBack.indexOf(i) >= 0) {
          setSlotCard(area, "back");
        } else {
          setSlotCard(area, null);
        }
      });
      var pickedIdx = [];
      var pickListeners = [];
      var confirmState = null;
      function refreshConfirmState() {
        if (!confirmState) return;
        var valid = true;
        try {
          valid = !!confirmState.validate();
        } catch (e) {
          valid = false;
        }
        okBtn.classList.toggle("compare-off", !valid);
      }
      function clearConfirmState() {
        confirmState = null;
        okBtn.style.display = "none";
        cancelBtn.style.display = "none";
      }
      function clearPick() {
        pickListeners.forEach(function (b) {
          b.box.removeEventListener("click", b.fn, true);
          b.box.style.cursor = "";
        });
        pickListeners = [];
        pickedIdx = [];
        areas.forEach(function (a) {
          if (a.box) a.box.classList.remove("compare-picked");
        });
      }
      var __ssConfirmOk = function (e) {
        try {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
        } catch (e0) {}
        if (dialog.classList.contains("cd-fold")) return;
        if (!confirmState) return;
        var valid = true;
        try {
          valid = !!confirmState.validate();
        } catch (e) {
          valid = false;
        }
        if (!valid) return;
        var onOk = confirmState.onOk;
        clearConfirmState();
        if (onOk) onOk();
      };
      var __ssConfirmCancel = function (e) {
        try {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
        } catch (e0) {}
        if (dialog.classList.contains("cd-fold")) return;
        if (!confirmState) return;
        var onCancel = confirmState.onCancel;
        clearConfirmState();
        if (onCancel) onCancel();
      };
      okBtn.addEventListener("click", __ssConfirmOk);
      okBtn.addEventListener("touchend", __ssConfirmOk);
      cancelBtn.addEventListener("click", __ssConfirmCancel);
      cancelBtn.addEventListener("touchend", __ssConfirmCancel);
      if (players.length > 7) {
        var fitK = Math.max(0.4, 7 / players.length);
        lineEl.style.transform = "translateX(" + Math.round(tagW / 2 + 1.5) + "px) scale(" + fitK.toFixed(3) + ")";
        lineEl.style.transformOrigin = "50% 0";
        var fitShift = Math.round((1 - fitK) * slotBoxH);
        okBtn.style.setProperty("top", (okTop - fitShift) + "px", "important");
        cancelBtn.style.setProperty("top", (okTop - fitShift + 4) + "px", "important");
        dialog.style.setProperty("--cmp-frame-h", (dialogH - fitShift) + "px");
        dialog.style.setProperty("--compare-result-h", (lineTop + Math.round(slotBoxH * fitK) + 14) + "px");
      } else {
        lineEl.style.transform = "translateX(" + Math.round(tagW / 2 + 1.5) + "px)";
        lineEl.style.transformOrigin = "";
        dialog.style.setProperty("--cmp-frame-h", dialogH + "px");
        dialog.style.setProperty("--compare-result-h", (lineTop + slotBoxH + 14) + "px");
      }
      var handle = {
        "dialog": dialog,
        "players": players,
        "areas": areas,
        "_title": titleText,
        "_hint": hintText,
        "setCard": function (idx, card) {
          var a = areas[idx];
          if (a) setSlotCard(a, card);
        },
        "setNum": function (idx, num) {
          var a = areas[idx];
          if (!a || !a.box || !a.card) return;
          if (num === null || num === undefined || num === "" || isNaN(num)) return;
          if (a.__ssShownNum === num) return;
          a.__ssShownNum = num;
          var fake = null;
          try {
            fake = game.createCard(a.card.name, a.card.suit, num);
          } catch (e) {}
          if (!fake) return;
          var el = null;
          try {
            el = fake.copy();
          } catch (e) {}
          if (!el) return;
          //●fake.copy() 不带事件监听，补 link 和长按介绍
          try {
            el.link = a.card;
            if (!el._longpresscallback && lib && typeof lib.setIntro === "function") lib.setIntro(el);
          } catch (eL3) {}
          try {
            if (a.cardEl && a.cardEl.parentNode) a.cardEl.parentNode.removeChild(a.cardEl);
          } catch (e) {}
          el.style.setProperty("visibility", "hidden", "important");
          a.box.appendChild(el);
          fitCardToSlot(el);
          el.style.removeProperty("visibility");
          a.cardEl = el;
          try {
            if (a.card.number !== num) ssPlayNumFx(a.box, el);
          } catch (e) {}
        },
        "setTitle": function (t) {
          titleEl.innerHTML = t + "<img src=\"" + imgBase + "arrow.png\"/>";
        },
        "setHint": function (html) {
          hintEl.innerHTML = html || "";
        },
        "setConfirm": function (state) {
          clearConfirmState();
          confirmState = state || null;
          if (!confirmState) return;
          okBtn.style.display = "block";
          if (confirmState.onCancel) cancelBtn.style.display = "block";
          refreshConfirmState();
        },
        "clearConfirm": clearConfirmState,
        "refreshConfirm": refreshConfirmState,
        "toResultMode": function () {
          dialog.classList.add("cd-result");
        },
        "showResult": function (results) {
          if (!results) results = [];
          areas.forEach(function (area, i) {
            var txt = results[i] || "";
            if (!txt || !area.box) return;
            var oldBadge = area.box.querySelector(".compare-result-badge");
            if (oldBadge && oldBadge.parentNode) oldBadge.parentNode.removeChild(oldBadge);
            var badge = document.createElement("div");
            badge.className = "compare-result-badge" + (txt === "赢" ? " is-win" : " is-nowin");
            area.box.appendChild(badge);
          });
        },
        "betPick": function (maxPick) {
          clearPick();
          areas.forEach(function (area, i) {
            if (!area.box) return;
            area.box.style.cursor = "pointer";
            var onPick = function (e) {
              e.preventDefault();
              e.stopPropagation();
              var pos = pickedIdx.indexOf(i);
              if (pos >= 0) {
                pickedIdx.splice(pos, 1);
                area.box.classList.remove("compare-picked");
              } else {
                if (pickedIdx.length >= maxPick) {
                  var evicted = pickedIdx.shift();
                  if (areas[evicted] && areas[evicted].box) areas[evicted].box.classList.remove("compare-picked");
                }
                pickedIdx.push(i);
                area.box.classList.add("compare-picked");
              }
              refreshConfirmState();
            };
            area.box.addEventListener("click", onPick, true);
            var listener = {};
            listener.box = area.box;
            listener.fn = onPick;
            pickListeners.push(listener);
          });
        },
        "getPicked": function () {
          return pickedIdx.slice();
        },
        "reset": function () {
          clearConfirmState();
          clearPick();
          titleEl.innerHTML = handle._title + "<img src=\"" + imgBase + "arrow.png\"/>";
          hintEl.innerHTML = handle._hint || "";
        },
        "close": function () {
          clearConfirmState();
          clearPick();
          //●未调用 holdConfirm()，关闭时也不再 releaseConfirm()
          if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
          if (currentDialog === handle) currentDialog = null;
        }
      };
      currentDialog = handle;
      return handle;
    } catch (e) {
      return null;
    }
  }
  window.compareDialog = createCompareDialog;
  createCompareDialog.current = function () {
    return currentDialog;
  };
  window.__ssCloseCompare = function (handle) {
    try {
      if (handle && handle.close) handle.close();
    } catch (e) {}
    try {
      var cur = createCompareDialog.current();
      if (cur && cur !== handle && cur.close) cur.close();
    } catch (e) {}
    try {
      var el = document.getElementById("compare-dialog");
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (e) {}
    try {
      document.body.classList.remove("compare-cmp-selecting");
      document.body.classList.remove("ss-compare-on");
    } catch (e) {}
    try {
      if (_status.paused && !_status.paused2) game.resume();
    } catch (e) {}
    try {
      if (ui.selected) {
        if (ui.selected.cards) ui.selected.cards.length = 0;
        if (ui.selected.buttons) ui.selected.buttons.length = 0;
        if (ui.selected.targets) ui.selected.targets.length = 0;
      }
      var hcs = document.querySelectorAll("#handcards1 .card.selected, #handcards2 .card.selected, .handcards .card.selected");
      for (var i = 0; i < hcs.length; i++) hcs[i].classList.remove("selected");
    } catch (e) {}
  };
});
"use strict";
window.__ssPindianImport(function (lib, game, ui, get, ai, _status) {
  if (!lib || !game || !ui || !get) return;
  var strHint = window.strHint = function (h) {
    if (typeof h !== "string") return null;
    var t = h.replace(/<[^>]*>/g, "").trim();
    if (!t || t === "undefined" || t === "null") return null;
    return h;
  };
  //●拼点框标题：从事件上找出真正的中文技能名（自动处理 pre_/equip_/lose_ 前缀和 _backup/_cost/_lose 后缀）
  var ssCompareTitle = window.ssCompareTitle = function (evt) {
    if (!evt) return null;
    //●只要 lib.translate 里有这个键就直接用它的值（即使值本身是英文），
    //  只有查不到时才去掉 pre_/equip_/lose_ 前缀和 _backup/_cost/_lose 后缀再查
    var lookup = function (key) {
      if (typeof key !== "string" || !key) return null;
      var tr = null;
      try {
        tr = lib.translate && lib.translate[key];
      } catch (e) {}
      if (typeof tr !== "string" || !tr || tr === key || tr === "null" || tr === "undefined") return null;
      //●"pre: xxx" 这类占位式翻译不算技能名，继续试去前缀后的键
      if (/^(?:pre|equip|lose):/i.test(tr)) return null;
      return tr;
    };
    var variants = function (n) {
      var out = [n];
      var s = n;
      if (s.indexOf("pre_") === 0) s = s.slice(4);
      else if (s.indexOf("equip_") === 0) s = s.slice(6);
      else if (s.indexOf("lose_") === 0) s = s.slice(5);
      var cut = s.indexOf("_backup");
      if (cut < 0) cut = s.indexOf("_cost");
      if (cut < 0) cut = s.indexOf("_lose");
      if (cut > 0) s = s.slice(0, cut);
      if (s !== n) out.push(s);
      return out;
    };
    //●只沿着事件链找真正的技能名：原来只看 evt.parent 两层，技能事件在更外层时找不到，
    //  就会退回默认的“拼点”。这里一路向上找 skills / 技能事件名 / 触发事件上的技能名。
    var names = [];
    var _skipName = function (n) {
      return /^(chooseToCompare|chooseToUse|chooseButton|choosePlayerCard|chooseCard|chooseControl|chooseTarget|chooseToDiscard|chooseNumbers|gainPlayerCard|discardPlayerCard|useCard|useSkill|phaseUse|phase|judge|draw|discard|gain|lose)(_|$)/.test(String(n || ""));
    };
    var _isSkill = function (n) {
      if (typeof n !== "string" || !n) return false;
      try { return !!lib.skill[n]; } catch (e) {}
      return false;
    };
    var _e = evt;
    var _depth = 0;
    while (_e && _depth < 20) {
      try {
        if (typeof _e.skill === "string" && _e.skill) names.push(_e.skill);
        else if (Array.isArray(_e.skill)) names = names.concat(_e.skill);
      } catch (e) {}
      try {
        if (typeof _e.name === "string" && _e.name && !_skipName(_e.name) && _isSkill(_e.name)) names.push(_e.name);
      } catch (e) {}
      try {
        if (_e._trigger && typeof _e._trigger.skill === "string" && _e._trigger.skill) names.push(_e._trigger.skill);
      } catch (e) {}
      _e = _e.parent || _e._modparent || null;
      _depth++;
    }
    for (var i = 0; i < names.length; i++) {
      var list = variants(names[i]);
      for (var j = 0; j < list.length; j++) {
        if (!lib.skill || !lib.skill[list[j]]) continue;
        var tr = lookup(list[j]);
        if (tr) return tr;
      }
    }
    //●技能名本身是中文（没有翻译键）时直接用原名
    for (var i = 0; i < names.length; i++) {
      if (/[^\x00-\x7f]/.test(names[i])) return names[i];
    }
    //●兜底：交给统一的标题解析（它会继续处理技能名/卡牌名）
    try { if (window.ssTitleFor) { var _ft = window.ssTitleFor(evt, null); if (_ft) return _ft; } } catch (e) {}
    return null;
  };
  var ssPindianCardUser = window.ssPindianCardUser = function (evt, p1, p2) {
    var pe = evt && evt.parent;
    for (var i = 0; pe && i < 3; i++) {
      var tg = pe._trigger;
      if (tg && tg.card && tg.player && (tg.player === p1 || tg.player === p2)) return tg.player;
      pe = pe.parent;
    }
    return null;
  };
  window.__ssKeepTopRight = function (pl) {
    try {
      var cont = pl && pl.node && pl.node.handcards1;
      if (!cont || cont.__ssTopKeep) return;
      var obs = new MutationObserver(function () {
        try {
          var nodes = cont.childNodes;
          var last = nodes[nodes.length - 1];
          for (var i = nodes.length - 1; i >= 0; i--) {
            var n = nodes[i];
            if (n && n.cardsTop) {
              if (n !== last) {
                cont.appendChild(n);
                try {
                  if (window.dui) dui.queueNextFrameTick(dui.layoutHand, dui);
                } catch (e) {}
              }
              break;
            }
          }
        } catch (e) {}
      });
      obs.observe(cont, { childList: true });
      cont.__ssTopKeep = obs;
    } catch (e) {}
  };
  var ssPindianTips = window.ssPindianTips = {
    gushe: {
      self: "你赢：没赢的角色选择弃牌或让你摸牌；你没赢：你获得1个“饶舌”标记，但仍能摸牌",
      other: "对方赢：你选择弃牌或让对方摸牌；对方没赢：对方获得1个“饶舌”标记，但仍能摸牌"
    },
    regushe: {
      self: "你赢：没赢的角色选择弃牌或让你摸牌；你没赢：你获得1个“饶舌”标记，但仍能摸牌",
      other: "对方赢：你选择弃牌或让对方摸牌；对方没赢：对方获得1个“饶舌”标记，但仍能摸牌"
    },
    mbjianji: {
      self: "你赢：视为对没赢的角色使用一张无距离的【杀】；间计牌为【杀】时，用此牌拼点者各受1点伤害",
      other: "对方赢：视为对你使用一张无距离的【杀】；间计牌为【杀】时，用此牌拼点者各受1点伤害"
    }
  };
  var ssPindianIntro = window.ssPindianIntro = function (skill, mode, userIsMe) {
    if (typeof skill !== "string" || !skill) return null;
    if (skill === "tianbian" || skill === "retianbian") return null;
    if (mode !== "other") mode = "self";
    var names = [skill];
    if (skill.indexOf("_") > 0) names.unshift(skill.slice(0, skill.indexOf("_")));
    for (var i = 0; i < names.length; i++) {
      var tip = ssPindianTips[names[i]];
      if (tip && typeof tip[mode] === "string" && tip[mode]) return tip[mode];
    }
    for (var i = names.length - 1; i >= 0; i--) {
      var info = null;
      try {
        var t = lib.translate[names[i] + "_info"];
        if (typeof t === "string" && t) info = t;
      } catch (e) {}
      if (!info) continue;
      var plain = info.replace(/<[^>]*>/g, "").replace(/[{}\[\]]/g, "");
      var specWin = ["使用者赢", "若你拼点赢", "拼点赢时", "若你赢", "若赢", "若其赢"];
      var specLose = ["使用者没赢", "若你拼点没赢", "拼点没赢时", "若你没赢", "若没赢", "若你输", "若拼点输", "若其没赢", "若其输", "你没有赢", "没赢的话", "若你未赢"];
      var genWin = ["你赢", "拼点赢"];
      var genLose = ["你没赢", "拼点没赢", "你未赢", "拼点失败", "否则"];
      var winPos = -1, winKey = "", losePos = -1, loseKey = "";
      for (var k = 0; k < specWin.length; k++) {
        var p = plain.indexOf(specWin[k]);
        if (p >= 0) { winPos = p; winKey = specWin[k]; break; }
      }
      if (winPos < 0) {
        for (var k = 0; k < genWin.length; k++) {
          var p = plain.indexOf(genWin[k]);
          if (p >= 0 && (winPos < 0 || p < winPos)) { winPos = p; winKey = genWin[k]; }
        }
      }
      for (var k2 = 0; k2 < specLose.length; k2++) {
        var p2 = plain.indexOf(specLose[k2]);
        if (p2 >= 0) { losePos = p2; loseKey = specLose[k2]; break; }
      }
      if (losePos < 0) {
        for (var k2 = 0; k2 < genLose.length; k2++) {
          var p2 = plain.indexOf(genLose[k2]);
          if (p2 >= 0 && (losePos < 0 || p2 < losePos)) { losePos = p2; loseKey = genLose[k2]; }
        }
      }
      if (winKey.indexOf("其") >= 0 || loseKey.indexOf("其") >= 0) return null;
      if (winKey === "拼点赢" && plain.slice(winPos + 3).indexOf("的角色") === 0) return null;
      if (loseKey === "否则" && winPos >= 0 && losePos < winPos) {
        var p3 = plain.indexOf("否则", winPos);
        if (p3 >= 0) losePos = p3;
        else { losePos = -1; loseKey = ""; }
      }
      if (winPos < 0 && loseKey === "否则") return null;
      if (winPos < 0 && losePos < 0) return null;
      var winPart = "", losePart = "";
      if (winPos >= 0) {
        var end = plain.indexOf("。", winPos + winKey.length);
        if (losePos > winPos && (end < 0 || losePos < end)) end = losePos;
        winPart = plain.slice(winPos + winKey.length, end >= 0 ? end : plain.length);
      }
      if (losePos >= 0) {
        var end2 = plain.indexOf("。", losePos + loseKey.length);
        losePart = plain.slice(losePos + loseKey.length, end2 >= 0 ? end2 : plain.length);
      }
      winPart = winPart.replace(/^[则，,；;：:\s]+/, "").replace(/[。，,；;\s]+$/, "").replace(/^你获得以下(技能)?效果(直到回合结束)?[:：]?/, "").replace(/^根据你拼点牌的点数依次执行以下效果[:：]?/, "").replace(/\//g, "或");
      losePart = losePart.replace(/^[则，,；;：:\s]+/, "").replace(/[。，,；;\s]+$/, "").replace(/^你获得以下(技能)?效果(直到回合结束)?[:：]?/, "").replace(/^根据你拼点牌的点数依次执行以下效果[:：]?/, "").replace(/\//g, "或");
      function cleanPart(s) {
        var segs = s.split(/[；;]/);
        var keep = [];
        for (var i = 0; i < segs.length; i++) {
          if (i > 0 && (segs[i].indexOf("若") === 0 || segs[i].indexOf("当") === 0 || segs[i].indexOf("本回合") === 0)) break;
          keep.push(segs[i]);
        }
        return keep.join("；");
      }
      winPart = cleanPart(winPart);
      losePart = cleanPart(losePart);
      if (winPart.indexOf("且") === 0 || winPart.indexOf("或") === 0) return null;
      var swap = winKey === "使用者赢" || loseKey === "使用者没赢";
      if (swap && userIsMe === null) return null;
      if (swap && !userIsMe) {
        var tmpw = winPart;
        winPart = losePart;
        losePart = tmpw;
      }
      if (mode === "other") {
        winPart = winPart.replace(/你的/g, "对方的").replace(/你/g, "对方");
        losePart = losePart.replace(/你的/g, "对方的").replace(/你/g, "对方");
      }
      var winHead = mode === "other" ? "对方赢：" : "你赢：";
      var loseHead = mode === "other" ? "对方没赢：" : "你没赢：";
      if (!winPart && losePart) winPart = "无事";
      if (!losePart && winPart) losePart = "无事";
      var mk = function (wp, lp) {
        var o = "";
        if (wp) o += winHead + wp;
        if (lp) o += (o ? "；" : "") + loseHead + lp;
        return o;
      };
      //●提示文字不再截断（原来超过 42 字会加省略号），超出宽度由 CSS 自动换行
      var out = mk(winPart, losePart);
      return out || null;
    }
    return null;
  };
  var ssPindianColor = window.ssPindianColor = function (text, names) {
    if (typeof text !== "string" || !text || !names || !names.length) return text;
    var out = text.replace(/【([^】]{1,6})】/g, "<span class='card-blue'>$1</span>");
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (typeof n !== "string" || !n || n === "你" || n === "对方") continue;
      var from = 0;
      var idx = out.indexOf(n, from);
      while (idx >= 0) {
        out = out.slice(0, idx) + "<span class='card-blue'>" + n + "</span>" + out.slice(idx + n.length);
        from = idx + n.length + 25;
        idx = out.indexOf(n, from);
      }
    }
    return out;
  };
  try {
    if (ui.create && typeof ui.create.dialognew !== "function") {
      ui.create.dialognew = function (arg) {
        var dlg = null;
        try {
          dlg = ui.create.div();
        } catch (e) {
          dlg = document.createElement("div");
        }
        try {
          if (typeof arg === "string" && arg) {
            if (arg.charAt(0) === "#") dlg.id = arg.slice(1);else if (arg.charAt(0) === ".") dlg.classList.add(arg.slice(1));else dlg.id = arg;
          }
        } catch (e) {}
        var host = null;
        try {
          if (ui.window && ui.window.appendChild) host = ui.window;
        } catch (e) {}
        if (!host) {
          try {
            host = document.body;
          } catch (e) {}
        }
        if (host && host.appendChild) {
          try {
            host.appendChild(dlg);
          } catch (e) {}
        }
        var dlgRef = dlg;
        var __ssPdApplyRatio = function (el) {
          try {
            var host = (ui.window && ui.window.offsetWidth) ? ui.window : document.body;
            var layoutW = (host && host.clientWidth) || window.innerWidth || 1303;
            var layoutH = (host && host.clientHeight) || window.innerHeight || 720;
            if (!(layoutW > 0)) layoutW = 1303;
            if (!(layoutH > 0)) layoutH = 720;
            var ratio = (layoutW * PD_FIT) / 1303;
            var hCap = (layoutH * 0.72) / PD_DESIGN_H;
            if (ratio > hCap) ratio = hCap;
            if (!(ratio > 0)) ratio = 1;
            el.style.setProperty("--ss-pd-r", ratio.toFixed(4), "important");
            el.style.setProperty("margin-left", "-651.5px", "important");
            el.style.setProperty("transform", "scale(" + ratio.toFixed(4) + ")", "important");
            el.__ssPdRatio = ratio;
          } catch (e) {}
        };
        dlgRef.__ssPdApplyRatio = __ssPdApplyRatio;
        setTimeout(function () {
          __ssPdApplyRatio(dlgRef);
        }, 0);
        if (!window.__ssPdResizeBound) {
          window.__ssPdResizeBound = true;
          window.addEventListener("resize", function () {
            setTimeout(function () {
              var el = document.getElementById("compare-dialog");
              if (el && __ssPdApplyRatio) __ssPdApplyRatio(el);
            }, 0);
          });
        }
        return dlg;
      };
    }
  } catch (e) {}
  (function () {
    var proto = lib.element.Player && lib.element.Player.prototype || lib.element.player;
    if (!proto || !proto.chooseToCompare) return;
    var raw = proto.chooseToCompare;
    proto.chooseToCompare = function (target) {
      var event = raw.apply(this, arguments);
      if (!event) return event;
      event.compare_opts = event.compare_opts || {};
      if (arguments.length > 1 && typeof arguments[1] === "string" && event.compare_opts.hint === undefined) {
        event.compare_opts.hint = arguments[1];
      }
      for (var name in lib.skill) {
        var info = lib.skill[name];
        if (!info || !info.compare_opts) continue;
        var opts = info.compare_opts;
        var pHas = this.hasSkill(name);
        var tHas = !!(target && target.hasSkill && target.hasSkill(name));
        if (pHas) {
          for (var key in opts) {
            if (event.compare_opts[key] === undefined) event.compare_opts[key] = opts[key];
          }
        }
        if (tHas && opts.cardsTop) event.compare_opts.cardsTopTarget = true;
        if ((pHas || tHas) && opts.cardsTop && !event.compare_opts.cardsTopHolder) {
          event.compare_opts.cardsTopHolder = pHas ? this : target;
        }
        if ((pHas || tHas) && opts.cardsTop && !event.compare_opts.cardsTopSkill) {
          event.compare_opts.cardsTopSkill = name;
        }
      }
      return event;
    };
  })();
  (function () {
    var proto = lib.element.Player && lib.element.Player.prototype || lib.element.player;
    if (!proto || !proto.chooseToCompareMultiple) return;
    var raw = proto.chooseToCompareMultiple;
    proto.chooseToCompareMultiple = function (target) {
      var event = raw.apply(this, arguments);
      if (!event) return event;
      event.compare_opts = event.compare_opts || {};
      for (var name in lib.skill) {
        var info = lib.skill[name];
        if (!info || !info.compare_opts) continue;
        var opts = info.compare_opts;
        if (this.hasSkill(name)) {
          for (var key in opts) {
            if (event.compare_opts[key] === undefined) event.compare_opts[key] = opts[key];
          }
        }
      }
      return event;
    };
  })();
  try {
    lib.card.ss_tianbian = {
      fullskin: true,
      image: "ext:自用美化/image/pindian/di_paiduiding.png",
    };
  } catch (e9) {}
  try {
    if (lib.translate) lib.translate.ss_tianbian = "牌堆顶";
  } catch (e10) {}
  try {
    if (lib.card)
      lib.card.ss_jianji = {
        fullskin: true,
        image: "ext:自用美化/image/pindian/jianji.png",
      };
  } catch (e11) {}
  try {
    if (lib.translate) lib.translate.ss_jianji = "间计牌";
  } catch (e12) {}

/*●天辩同样是流程型改写：联机时必须保留本体版（本体走 chooseCard 的 onCompare 从牌堆顶取牌），
  否则客机用秦宓【专对】+【天辩】时拿不到拼点牌，拼点会中断。
  这里按 _status.connectMode 动态二选一，避免"先单机后进联机"时残留单机版 */
(function () {
  var nativeTianbian = lib.skill.tianbian;
  var ssTianbianCustom = {
    skill_id: "tianbian",
    audio: 2,
    compare_opts: {
      cardsTop: true,
      cardsTopValue: function (card, p) {
        return get.suit(card) == "heart" ? 13 : get.number(card, p);
      },
      cardsTopExpect: function (p, event) {
        var cs = [];
        try {
          var pile = ui.cardPile;
          if (pile && pile.childNodes) {
            var cn = pile.childNodes;
            for (var i = 0; i < cn.length && i < 5; i++) cs.push(cn[i]);
          }
        } catch (e0) {}
        if (!cs.length) return 0;
        var sum = 0;
        for (var i = 0; i < cs.length; i++) {
          sum += get.suit(cs[i]) == "heart" ? 13 : get.number(cs[i]);
        }
        return sum / cs.length;
      },
    },
    trigger: { player: "compare", target: "compare" },
    silent: true,
    forced: true,
    popup: false,
    filter: function (event, player) {
      if (!event.card1 || !event.card2) return false;
      if (event.result && event.result.cancelled) return false;
      if (player == event.player) return !event.iwhile && get.suit(event.card1) == "heart";
      return get.suit(event.card2) == "heart";
    },
    content: function () {
      var isInitiator = player == trigger.player;
      game.log(player, "的拼点牌", isInitiator ? trigger.card1 : trigger.card2, "为红桃，点数视为", "#yK");
      if (isInitiator) trigger.num1 = 13;
      else trigger.num2 = 13;
    },
  };
  try {
    Object.defineProperty(lib.skill, "tianbian", {
      configurable: true,
      enumerable: true,
      get: function () {
        try {
          if (_status && _status.connectMode) return nativeTianbian;
        } catch (e0) {}
        return ssTianbianCustom;
      },
      set: function (v) {
        ssTianbianCustom = v;
      },
    });
  } catch (e) {
    try {
      lib.skill.tianbian = _status.connectMode ? nativeTianbian : ssTianbianCustom;
    } catch (e1) {}
  }
})();
  /* 瞻势（zhanshi）的拼点框定制已注释，恢复官方实现
  if (lib.skill.zhanshi) {
    lib.skill.zhanshi.cost = async function (event, trigger, player) {
      var participants = [trigger.player, ...trigger.targets?.length ? trigger.targets : [trigger.target]];
      var hz = window.compareDialog && typeof window.compareDialog.current === "function" ? window.compareDialog.current() : null;
      if (!hz || !hz.dialog || !hz.dialog.parentNode || !player.isUnderControl(true)) {
        event.result = await player.chooseCardTarget({
          prompt: get.prompt2(event.skill),
          filterTarget: function (card, player2, target) {
            return get.event().targets.includes(target);
          },
          selectTarget: function () {
            return ui.selected.cards.length;
          },
          filterCard: lib.filter.cardDiscardable,
          position: "he",
          selectCard: [1, participants.length]
        }).set("targets", participants).forResult();
        return;
      }
      var goon = await new Promise(function (resolve) {
        hz.setHint("你可发动<span class=\"compare-blue\">瞻势</span>，弃牌并有机会摸牌");
        hz.setConfirm({
          validate: function () { return true; },
          onOk: function () { resolve(true); },
          onCancel: function () { resolve(false); }
        });
      });
      if (!goon || !hz.dialog || !hz.dialog.parentNode) {
        hz.reset();
        event.result = { bool: false };
        return;
      }
      if (game.ssLogCompareSkill) game.ssLogCompareSkill(player, "zhanshi");
      hz.setHint("你可以选择任意名拼点角色的拼点牌并弃置等量张牌，每有一个选择的角色拼赢你摸<span class=\"compare-blue\">3</span>张牌");
      hz.betPick(participants.length);
      document.body.classList.add("compare-cmp-selecting");
      var nextz = player.chooseCard("he", [1, participants.length], function (card) {
        return lib.filter.cardDiscardable(card, player, "zhanshi");
      }).set("prompt", false).set("noconfirm", true).set("ai", function (card) {
        return 7 - get.value(card);
      });
      nextz.custom = nextz.custom || { add: {}, replace: {} };
      nextz.custom.add = nextz.custom.add || {};
      nextz.custom.add.card = function () {
        hz.refreshConfirm();
      };
      hz.setConfirm({
        validate: function () {
          var n = hz.getPicked().length;
          return n >= 1 && ui.selected.cards.length === n;
        },
        onOk: function () {
          ui.click.ok();
        }
      });
      var discardResult = await nextz.forResult();
      var betTargets = hz.getPicked().map(function (i) {
        return participants[i];
      });
      hz.reset();
      document.body.classList.remove("compare-cmp-selecting");
      if (!discardResult || !discardResult.bool || !discardResult.cards || !discardResult.cards.length || betTargets.length != discardResult.cards.length) {
        event.result = { bool: false };
        return;
      }
      event.result = { bool: true, cards: discardResult.cards, targets: betTargets };
    };
  }
  if (lib.skill.zhanshi && lib.skill.zhanshi.subSkill && lib.skill.zhanshi.subSkill.draw) {
    var rawZsDrawFilter = lib.skill.zhanshi.subSkill.draw.filter;
    lib.skill.zhanshi.subSkill.draw.filter = function (event, player) {
      if (event.__ssZsDrawDone) return false;
      if (typeof rawZsDrawFilter === "function") return rawZsDrawFilter.apply(this, arguments);
      return true;
    };
    var rawZsContent = lib.skill.zhanshi.content;
    if (typeof rawZsContent === "function") {
      lib.skill.zhanshi.content = async function (event, trigger, player) {
        game.print("[ZS] main content targets=" + JSON.stringify((event.targets || []).map(function (t) { return t.name; })));
        await rawZsContent.apply(this, arguments);
        game.print("[ZS] main done storage=" + player.getStorage("zhanshi_draw").length);
      };
    }
    var rawZsDraw = lib.skill.zhanshi.subSkill.draw.content;
    if (typeof rawZsDraw === "function") {
      lib.skill.zhanshi.subSkill.draw.content = async function (event, trigger, player) {
        var st = player.getStorage("zhanshi_draw");
        game.print("[ZS] draw trigger=" + trigger.name + " storage=" + st.length + " pres=" + !!trigger.preserve + " cmpM=" + !!trigger.compareMultiple);
        event.__ssZsDrawDone = true;
        await rawZsDraw.apply(this, arguments);
        game.print("[ZS] draw done");
      };
    }
  }
  */
  //●纯保险性质的收尾清理：不再包装 game.over 和 player.die。
  //  game.over 在联机结束时会被本体的 client.send(game.over, ...) 原样发给客机执行，
  //  函数源码传输会丢闭包（之前客机报 "rawOver is not defined"）；die 的包装也会和
  //  其它扩展的同名包装叠加。这里改为轻量轮询：只在游戏结束时清掉残留的拼点框和
  //  body 标记，不碰本体任何流程，异常全部忽略。
  (function () {
    if (window.__ssOverCleanupTimer) return;
    window.__ssOverCleanupTimer = setInterval(function () {
      try {
        if (!_status || !_status.over) {
          window.__ssOverCleanupDone = false;
          return;
        }
        if (window.__ssOverCleanupDone) return;
        var cur = null;
        if (window.compareDialog && typeof window.compareDialog.current === "function") {
          cur = window.compareDialog.current();
        }
        var body = document.body;
        var hasClass = !!(body && (body.classList.contains("compare-cmp-selecting") || body.classList.contains("ss-compare-on")));
        if (!cur && !hasClass) {
          window.__ssOverCleanupDone = true;
          return;
        }
        if (cur && cur.close) cur.close();
        if (body) {
          body.classList.remove("compare-cmp-selecting");
          body.classList.remove("ss-compare-on");
        }
        window.__ssOverCleanupDone = true;
      } catch (e) {}
    }, 500);
  })();


  /*●联机（_status.connectMode）下必须让本体原流程跑：
    本扩展的 chooseToCompare 等 content 是改写拼点流程的（自己发牌、收 online 结果、处理牌堆顶），
    其中 online 结果里 result.skill（天辩/间计等 onCompare 技能）没有被解析，
    双方只要有一方没装本扩展（尤其客机用秦宓【专对】+【天辩】拿牌堆顶拼点）就会在结算处抛错、
    整个拼点流程被终止，牌留在手里、没有记录和结果。
    所以这些流程型 content 只在单机生效；联机一律用本体 content，
    展示部分由下面的"联机客机拼点框"（$compare / popup / ui.clear 广播钩子）负责。
    ●用 getter 按事件创建时的 _status.connectMode 动态二选一，避免"先单机后进联机"时装错版本 */
  var ssPdContentHooks = {};
  var ssPdRegisterContent = function (name, custom) {
    if (ssPdContentHooks[name]) return;
    var native = lib.element.content[name];
    ssPdContentHooks[name] = { native: native, custom: custom };
    try {
      Object.defineProperty(lib.element.content, name, {
        configurable: true,
        enumerable: true,
        get: function () {
          try {
            if (_status && _status.connectMode) return native;
          } catch (e0) {}
          return custom;
        },
        set: function (v) {
          custom = v;
          ssPdContentHooks[name].custom = v;
        },
      });
    } catch (e) {
      try {
        lib.element.content[name] = custom;
      } catch (e1) {}
    }
  };
  function installCompare() {
    if (ssPdContentHooks["chooseToCompare"]) return;
    var ssPdCustomCompare = function () {
      'step 0';

      //●与本体一致：target 可以是 "cardPile"（与牌堆拼点），此时没有第二个玩家
      if (event.target === "cardPile") {
        event.compareWithCardPile = true;
        if (event.compareType == undefined) event.compareType = "top";
      }
      if (!event.position || typeof event.position != "string") event.position = "h";
      //●与本体一致：未指定 selected 牌过滤时默认全部可选
      if (event.filterCard == undefined) event.filterCard = lib.filter.all;
      if ((!event.fixedResult || !event.fixedResult[player.playerid]) && player.countCards(event.position) === 0
        || (!event.compareWithCardPile && (!event.fixedResult || !event.fixedResult[target.playerid]) && target.countCards(event.position) === 0)) {
        event.result = {
          cancelled: true,
          bool: false
        };
        event.finish();
        return;
      }
      event.lose_list = [];
      if (event.compareWithCardPile) {
        game.log(player, "对牌堆发起", event.isDelay ? "延时" : "", "拼点");
        //●与牌堆拼点同样弹出手杀拼点框：玩家一侧正常选牌，牌堆一侧显示 di_paiduiding.png / 牌背
        event.compareOpts = event.compare_opts || {};
        if (event.parent.name === undefined || event.parent.name === "trigger") {
          event.compareName = event.name;
        } else {
          event.compareName = event.parent.name;
        }
        var _pileEvent = event;
        window.__ssPdAddMessageHook(event, "finished", function () {
          if (_pileEvent.compareHandle) {
            _pileEvent.compareHandle.close();
            _pileEvent.compareHandle = null;
          }
          document.body.classList.remove("compare-cmp-selecting");
        });
        try {
          var _pileOpts = event.compareOpts || {};
          var _pileLabel = event.compareType === "bottom" ? "牌堆底" : "牌堆顶";
          event.compareHandle = window.compareDialog(player, event, {
            title: _pileOpts.title || window.ssCompareTitle(event) || "拼点",
            hint: strHint(_pileOpts.hint) || "请选择一张手牌进行拼点",
            hintColor: _pileOpts.hintColor || "#BFAF58",
            players: [player, { name: _pileLabel }],
            collapsible: _pileOpts.collapsible != null ? _pileOpts.collapsible : true
          });
          if (event.compareHandle) {
            event.compareHandle.setCard(1, event.compareType === "bottom" ? "back" : "pile-top");
            document.body.classList.add("compare-cmp-selecting");
          }
        } catch (eP) {}
        event.goto(8);
        return;
      }
      game.log(player, "对", target, "发起", event.isDelay ? "延时" : "", "拼点");
      if (event.parent.name === undefined || event.parent.name === "trigger") {
        event.compareName = event.name;
      } else {
        event.compareName = event.parent.name;
      }
      window.__ssPdAddMessageHook(event, "finished", function () {
        var dialog = ui.dialogs[this.compareName];
        if (dialog && dialog.close) dialog.close();
        if (this.compareHandle) {
          this.compareHandle.close();
          this.compareHandle = null;
        }
        document.body.classList.remove("compare-cmp-selecting");
        game.clearCardsTop(this);
      });
      event.compareOpts = event.compare_opts || {};
      "step 1";
      var sendback = function () {
        if (_status.event != event) {
          return function () {
            event.resultOL = _status.event.resultOL;
          };
        }
      };
      var compareOpts = event.compareOpts || {};
      var pIsMine = player.isUnderControl(true);
      var tIsMine = !!(target && typeof target.isUnderControl === "function" && target.isUnderControl(true));
      if (pIsMine || tIsMine) document.body.classList.add("compare-cmp-selecting");
      var cardsTopValue = function (card, p) {
        if (compareOpts.cardsTopValue) return compareOpts.cardsTopValue(card, p);
        return get.number(card, p);
      };
      var cardsTopExpect = function (p) {
        if (compareOpts.cardsTopExpect) return compareOpts.cardsTopExpect(p, event);
        var cs = [];
        try {
          var pile = ui.cardPile;
          if (pile && pile.childNodes) {
            var cn = pile.childNodes;
            for (var i = 0; i < cn.length && i < 5; i++) cs.push(cn[i]);
          }
        } catch (e0) {}
        if (!cs.length) return 0;
        var sum = 0;
        for (var ci = 0; ci < cs.length; ci++) sum += get.number(cs[ci]);
        return sum / cs.length;
      };
      if (compareOpts.cardsTop && !pIsMine && player !== game.me && !player.isOnline() && ui.cardPile && ui.cardPile.hasChildNodes()) {
        var hsP = player.getCards("h");
        var maxP = 0;
        for (var pi = 0; pi < hsP.length; pi++) maxP = Math.max(maxP, cardsTopValue(hsP[pi], player));
        if (maxP < 13 || cardsTopExpect(player) > maxP) {
          event.fixedResult = event.fixedResult || {};
          event.fixedResult[player.playerid] = game.cardsTopTake(event);
          event.card1IsTop = true;
        }
      }
      if (compareOpts.cardsTopTarget && !tIsMine && target !== game.me && !target.isOnline() && ui.cardPile && ui.cardPile.hasChildNodes()) {
        var hsT0 = target.getCards("h");
        var maxT0 = 0;
        for (var ti0 = 0; ti0 < hsT0.length; ti0++) maxT0 = Math.max(maxT0, cardsTopValue(hsT0[ti0], target));
        if (maxT0 < 13 || cardsTopExpect(target) > maxT0) {
          var _topT0 = game.cardsTopTake(event);
          if (_topT0) {
            event.fixedResult = event.fixedResult || {};
            event.fixedResult[target.playerid] = _topT0;
            event.card2IsTop = true;
            var _skT0 = (event.compare_opts && event.compare_opts.cardsTopSkill) || game.compareCardSkillName(target);
            if (_skT0) game.ssLogCompareSkill(target, _skT0);
            event.__ssSkLogged2 = true;
          }
        }
      }
      event._comparePmine = pIsMine;
      event._compareTmine = tIsMine;
      var meHasZhanshi = game.me && typeof game.me.hasSkill === "function" && game.me.hasSkill("fgzhanshi");
      var hasHumanPlayer = game.hasPlayer(function (p) {
        return p.isUnderControl(true);
      });
      if (pIsMine || tIsMine || meHasZhanshi || compareOpts.aiShow || hasHumanPlayer) {
        var hintFinal = strHint(compareOpts.hint);
        var cardsTopHolder = compareOpts.cardsTopHolder;
        if (cardsTopHolder) {
          if (cardsTopHolder == game.me) {
            hintFinal = compareOpts.hint;
          } else {
            var hintOther = (compareOpts.hint2 == null) ? compareOpts.hint : compareOpts.hint2;
            hintFinal = String(hintOther).split("{who}").join(get.translation(cardsTopHolder));
          }
        } else if (compareOpts.hintViewer && game.me) {
          if (game.me == player) hintFinal = compareOpts.hint;else if (game.me == target) hintFinal = compareOpts.hintViewer;else hintFinal = compareOpts.hintViewer || compareOpts.hint;
        }
        var faceIdx = [];
        if (!pIsMine) faceIdx.push(0);
        if (!tIsMine) faceIdx.push(1);
        var cardUser = window.ssPindianCardUser(event, player, target);
        var userIsMe = cardUser ? cardUser === game.me : null;
        event.compareHandle = compareDialog(player, event, {
          title: compareOpts.title || window.ssCompareTitle(event) || "拼点",
          hint: ssPindianColor(ssPindianIntro(event.compareName, game.me === player ? "self" : "other", userIsMe) || strHint(hintFinal) || strHint(compareOpts.hint), [get.translation(player), get.translation(target)]),
          hintColor: compareOpts.hintColor || "#BFAF58",
          players: [player, target],
          faceBack: faceIdx,
          collapsible: compareOpts.collapsible != null ? compareOpts.collapsible : true
        });
        try {
          document.body.classList.add("ss-compare-on");
          var ctrlTimer = setInterval(function () {
            try {
              if (!document.getElementById("compare-dialog")) {
                clearInterval(ctrlTimer);
                document.body.classList.remove("ss-compare-on");
                return;
              }
              try {
                var dlgNow = document.getElementById("compare-dialog");
                if (dlgNow) {
                  if (!dlgNow.__ssClickBound) {
                    dlgNow.__ssClickBound = true;
                    dlgNow.addEventListener("click", function (ev) {
                      try {
                        var tgt = ev.target;
                        if (tgt && tgt.tagName === "IMG" && tgt.closest && tgt.closest(".compare-title")) return;
                        if (tgt && tgt.closest && tgt.closest(".compare-title")) {
                          ev.stopImmediatePropagation();
                          ev.stopPropagation();
                        }
                      } catch (e) {}
                    }, true);
                  }
                  var folded = dlgNow.classList.contains("cd-fold") || dlgNow.classList.contains("folded");
                  if (folded !== dlgNow.__ssFolded) {
                    dlgNow.__ssFolded = folded;
                    if (folded) {
                      dlgNow.style.setProperty("height", "78px", "important");
                      //●折叠态统一位置：由 extension.js 的 --ss-fold-top 控制
                      dlgNow.style.setProperty("top", "var(--ss-fold-top)", "important");
                      dlgNow.style.setProperty("margin-top", "0px", "important");
                    } else {
                      dlgNow.style.setProperty("height", dlgNow.__ssExpandHeight || "302px", "important");
                      dlgNow.style.setProperty("top", "22%", "important");
                      dlgNow.style.setProperty("margin-top", "0px", "important");
                    }
                  }
                  var txEl = dlgNow.querySelector(".compare-timex");
                  if (txEl) {
                    if (!dlgNow.__ssStart) dlgNow.__ssStart = Date.now();
                    var pct = 100 - (Date.now() - dlgNow.__ssStart) / (ssProgressSeconds() * 1000) * 100;
                    if (pct < 0) pct = 0;
                    txEl.style.setProperty("width", pct.toFixed(2) + "%", "important");
                  }
                  var hintBox = dlgNow.querySelector(".compare-hint");
                  var hintTxt = hintBox ? String(hintBox.textContent || "").trim() : "";
                  if (hintTxt === "undefined" || hintTxt === "null") hintTxt = "";
                  if (!hintTxt && hintBox && !hintBox.__ssAutoHint) {
                    hintBox.__ssAutoHint = true;
                    hintBox.textContent = "请选择一张手牌进行拼点";
                  }
                }
              } catch (e) {}
            } catch (e) {}
          }, 150);
        } catch (e) {}
      }
      if (event.fixedResult && event.fixedResult[player.playerid]) {
        event.card1 = event.fixedResult[player.playerid];
        event.lose_list.push([player, [event.card1]]);
        if (event.card1IsTop) {
          event.card1Top = game.createCardsTopCard(event.card1);
          var _skTop1 = (event.compare_opts && event.compare_opts.cardsTopSkill) || game.compareCardSkillName(player);
          if (_skTop1) game.ssLogCompareSkill(player, _skTop1);
        }
        if (event.compareHandle && faceIdx.indexOf(0) < 0) event.compareHandle.setCard(0, event.card1Top || event.card1);
      } else if (player.isOnline()) {
        player.wait(sendback);
        event.ol = true;
        player.send(function (ai) {
          game.me.chooseCard("请选择拼点牌", true, function (card, player) {
            if (event.playerCards) return event.playerCards.contains(card);
            try {
              if (player.getCards(event.position).indexOf(card) >= 0) return true;
              if (event.mbjianji && player.getCards("s").indexOf(card) >= 0) return !!(card.hasGaintag && card.hasGaintag("mbjianji"));
            } catch (e) {}
            return false;
          }, event.mbjianji ? "hs" : event.position).set("type", "compare").set("glow_result", true).set("prompt", false).ai = ai;
          game.resume();
        }, event.ai);
      } else {
        event.localPlayer = true;
        if (pIsMine || tIsMine) document.body.classList.add("compare-cmp-selecting");
        if (compareOpts.cardsTop && pIsMine && ui.cardPile && ui.cardPile.hasChildNodes()) {
          var topCard1 = game.createSsTianbianCard();
          topCard1.cardsTop = true;
          player.directgain([topCard1]);
          try {
            var hcTop1 = player.node && player.node.handcards1;
            if (hcTop1 && topCard1.parentNode === hcTop1 && hcTop1.lastChild !== topCard1) hcTop1.appendChild(topCard1);
          } catch (e) {}
          if (window.__ssKeepTopRight) window.__ssKeepTopRight(player);
          event.cardsTopCards = event.cardsTopCards || [];
          event.cardsTopCards.push({ card: topCard1, owner: player });
          if (window.dui) dui.queueNextFrameTick(dui.layoutHand, dui);
        }
        if (event.mbjianji && event.mbjianji_card && pIsMine) {
          var jjC1 = game.createSsJianjiCard(event.mbjianji_card);
          player.directgain([jjC1]);
          try {
            var hcJ1 = player.node && player.node.handcards1;
            if (hcJ1 && jjC1.parentNode === hcJ1 && hcJ1.lastChild !== jjC1) hcJ1.appendChild(jjC1);
          } catch (e) {}
          if (window.__ssKeepTopRight) window.__ssKeepTopRight(player);
          event.ssJianjiCards = event.ssJianjiCards || [];
          event.ssJianjiCards.push({ card: jjC1, owner: player });
          if (window.dui) dui.queueNextFrameTick(dui.layoutHand, dui);
        }
        var next1 = player.chooseCard("请选择拼点牌", true, function (card, pl) {
          if (event.playerCards) return event.playerCards.contains(card);
          try {
            return !!(pl && pl.getCards && pl.getCards(event.position).indexOf(card) >= 0);
          } catch (e) {
            return false;
          }
        }, event.mbjianji ? "hs" : event.position).set("type", "compare").set("glow_result", true).set("prompt", false);
        //●不设置 noconfirm：保留本体的确认按钮，拼点框内的确定按钮另行叠加
        next1.ai = event.ai;
        if (event.compareHandle) {
          var h1 = event.compareHandle;
          next1.custom = next1.custom || {
            add: {},
            replace: {}
          };
          next1.custom.add = next1.custom.add || {};
          next1.custom.add.card = function () {
            if (player.isUnderControl(true)) {
              h1.setCard(0, ui.selected.cards[0] || null);
            }
            h1.refreshConfirm();
          };
          h1.setConfirm({
            validate: function () {
              return ui.selected.cards.length === 1;
            },
            onOk: function () {
              ui.click.ok();
            }
          });
        }
      }
      if (event.fixedResult && event.fixedResult[target.playerid]) {
        event.card2 = event.fixedResult[target.playerid];
        event.lose_list.push([target, [event.card2]]);
        if (event.card2IsTop) {
          event.card2Top = game.createCardsTopCard(event.card2);
          var _skTopT = (event.compare_opts && event.compare_opts.cardsTopSkill) || game.compareCardSkillName(target);
          if (_skTopT && !event.__ssSkLogged2) game.ssLogCompareSkill(target, _skTopT);
        }
        if (event.compareHandle && faceIdx.indexOf(1) < 0) event.compareHandle.setCard(1, event.card2Top || event.card2);
      } else if (target.isOnline()) {
        target.wait(sendback);
        event.ol = true;
        target.send(function (ai) {
          game.me.chooseCard("请选择拼点牌", true, function (card, player) {
            if (event.targetCards) return event.targetCards.contains(card);
            try {
              return !!(player && player.getCards && player.getCards(event.position).indexOf(card) >= 0);
            } catch (e) {
              return false;
            }
          }, event.position).set("type", "compare").set("glow_result", true).set("prompt", false).ai = ai;
          game.resume();
        }, event.ai);
      } else {
        event.localTarget = true;
      }
      "step 2";
      var pIsMine = event._comparePmine;
      var tIsMine = event._compareTmine;
      var compareOpts = event.compareOpts || {};
      if (event.compareHandle) event.compareHandle.clearConfirm();
      if (event.localPlayer) {
        if (result.links && !result.cards) result.cards = result.links;
        var cmpSkill1 = result.skill && lib.skill[result.skill] && lib.skill[result.skill].onCompare;
        var __hasCards1 = !!(result.cards && result.cards.length) || !!(result.links && result.links.length);
        if (!cmpSkill1 && !__hasCards1) {
          event.result = {
            cancelled: true,
            bool: false
          };
          window.__ssPdCloseHandle(event);
          event.finish();
          return;
        }
        var pTop = null;
        if (result.cards && result.cards[0] && event.cardsTopCards) {
          for (var pi = 0; pi < event.cardsTopCards.length; pi++) {
            if (event.cardsTopCards[pi].card === result.cards[0]) {
              pTop = event.cardsTopCards[pi];
              break;
            }
          }
        }
        if (pTop && pTop.owner == player) {
          pTop.used = true;
          var _real1 = game.cardsTopTake(event);
          event.card1 = _real1 || pTop.card;
          event.card1Top = game.createCardsTopCard(event.card1);
          event.lose_list.push([player, [event.card1]]);
          var _skTop2 = (event.compare_opts && event.compare_opts.cardsTopSkill) || game.compareCardSkillName(player);
          if (_skTop2) game.ssLogCompareSkill(player, _skTop2);
        } else if (cmpSkill1) {
          result.cards = lib.skill[result.skill].onCompare(player);
          player.logSkill(result.skill);
          event.card1 = result.cards[0] && result.cards[0].ssJianjiCard ? result.cards[0].ssJianjiCard : result.cards[0];
        } else {
          event.lose_list.push([player, [result.cards[0]]]);
          event.card1 = result.cards[0] && result.cards[0].ssJianjiCard ? result.cards[0].ssJianjiCard : result.cards[0];
        }
        if (event.compareHandle && (pIsMine || event.card1Top)) event.compareHandle.setCard(0, event.card1Top || event.card1);
        game.clearCardsTop(event, player);
        game.clearSsJianji(event, player);
      }
      if (event.localTarget) {
        if (compareOpts.cardsTopTarget && tIsMine && ui.cardPile && ui.cardPile.hasChildNodes()) {
          var topCard2 = game.createSsTianbianCard();
          topCard2.cardsTop = true;
          target.directgain([topCard2]);
          try {
            var hcTop2 = target.node && target.node.handcards1;
            if (hcTop2 && topCard2.parentNode === hcTop2 && hcTop2.lastChild !== topCard2) hcTop2.appendChild(topCard2);
          } catch (e) {}
          if (window.__ssKeepTopRight) window.__ssKeepTopRight(target);
          event.cardsTopCards = event.cardsTopCards || [];
          event.cardsTopCards.push({ card: topCard2, owner: target });
          if (window.dui) dui.queueNextFrameTick(dui.layoutHand, dui);
        }
        if (event.mbjianji && event.mbjianji_card && tIsMine) {
          var jjC2 = game.createSsJianjiCard(event.mbjianji_card);
          target.directgain([jjC2]);
          try {
            var hcJ2 = target.node && target.node.handcards1;
            if (hcJ2 && jjC2.parentNode === hcJ2 && hcJ2.lastChild !== jjC2) hcJ2.appendChild(jjC2);
          } catch (e) {}
          if (window.__ssKeepTopRight) window.__ssKeepTopRight(target);
          event.ssJianjiCards = event.ssJianjiCards || [];
          event.ssJianjiCards.push({ card: jjC2, owner: target });
          if (window.dui) dui.queueNextFrameTick(dui.layoutHand, dui);
        }
        if (tIsMine) {
          var next2 = target.chooseCard("请选择拼点牌", true, function (card, pl) {
            if (event.targetCards) return event.targetCards.contains(card);
            try {
              if (!pl || !pl.getCards) return false;
              if (pl.getCards(event.position).indexOf(card) >= 0) return true;
              if (event.mbjianji && pl.getCards("s").indexOf(card) >= 0) return !!(card.hasGaintag && card.hasGaintag("mbjianji"));
              return false;
            } catch (e) {
              return false;
            }
          }, event.mbjianji ? "hs" : event.position).set("type", "compare").set("glow_result", true).set("prompt", false);
          next2.ai = event.ai;
          if (event.compareHandle) {
            var h2 = event.compareHandle;
            next2.custom = next2.custom || {
              add: {},
              replace: {}
            };
            next2.custom.add = next2.custom.add || {};
            next2.custom.add.card = function () {
              if (target.isUnderControl(true)) {
                h2.setCard(1, ui.selected.cards[0] || null);
              }
              h2.refreshConfirm();
            };
            h2.setConfirm({
              validate: function () {
                return ui.selected.cards.length === 1;
              },
              onOk: function () {
                ui.click.ok();
              }
            });
          }
        } else {
          var hsAI = target.getCards(event.position);
          if (event.mbjianji) {
            var _jjc = target.getCards("s", function (c) {
              return c.hasGaintag && c.hasGaintag("mbjianji");
            });
            if (_jjc.length) hsAI = _jjc.concat(hsAI);
          }
          try {
            hsAI.sort(function (a, b) {
              return event.ai(b) - event.ai(a);
            });
          } catch (e) {
          }
          event.card2 = hsAI[0];
          event.lose_list.push([target, [event.card2]]);
        }
      }
      "step 3";
      var tIsMine = event._compareTmine;
      if (event.localTarget && tIsMine) {
        var cmpSkill2 = result.skill && lib.skill[result.skill] && lib.skill[result.skill].onCompare;
        if (!cmpSkill2 && (!result.cards || !result.cards.length)) {
          event.result = {
            cancelled: true,
            bool: false
          };
          window.__ssPdCloseHandle(event);
          event.finish();
          return;
        }
        var tTop = null;
        if (result.cards && result.cards[0] && event.cardsTopCards) {
          for (var ti = 0; ti < event.cardsTopCards.length; ti++) {
            if (event.cardsTopCards[ti].card === result.cards[0]) {
              tTop = event.cardsTopCards[ti];
              break;
            }
          }
        }
        if (tTop && tTop.owner == target) {
          tTop.used = true;
          var _real2 = game.cardsTopTake(event);
          event.card2 = _real2 || tTop.card;
          event.card2Top = game.createCardsTopCard(event.card2);
          event.lose_list.push([target, [event.card2]]);
          var _skTop3 = (event.compare_opts && event.compare_opts.cardsTopSkill) || game.compareCardSkillName(target);
          if (_skTop3) game.ssLogCompareSkill(target, _skTop3);
        } else if (cmpSkill2) {
          target.logSkill(result.skill);
          result.cards = lib.skill[result.skill].onCompare(target);
          event.card2 = result.cards[0] && result.cards[0].ssJianjiCard ? result.cards[0].ssJianjiCard : result.cards[0];
        } else {
          event.lose_list.push([target, [result.cards[0]]]);
          event.card2 = result.cards[0] && result.cards[0].ssJianjiCard ? result.cards[0].ssJianjiCard : result.cards[0];
        }
        if (event.compareHandle && (tIsMine || event.card2Top)) {
          event.compareHandle.setCard(1, event.card2Top || event.card2);
        }
        game.clearCardsTop(event, target);
        game.clearSsJianji(event, target);
      }
      if (!event.resultOL && event.ol) {
        game.pause();
      }
      "step 4";
      document.body.classList.remove("compare-cmp-selecting");
      if (event.compareHandle) event.compareHandle.clearConfirm();
      try {
        if (!event.card1) {
          event.lose_list.push([player, [event.resultOL[player.playerid].cards[0]]]);
          event.card1 = event.resultOL[player.playerid].cards[0];
        }
        if (!event.card2) {
          event.lose_list.push([target, [event.resultOL[target.playerid].cards[0]]]);
          event.card2 = event.resultOL[target.playerid].cards[0];
        }
        if (!event.card1 || !event.card2) {
          throw "err";
        }
      } catch (e) {
        game.print(e);
        window.__ssPdCloseHandle(event);
        event.finish();
        return;
      }
      if (event.card2.number >= 10 || event.card2.number <= 4) {
        if (target.countCards("h") > 2) {
          event.addToAI = true;
        }
      }
      if (event.lose_list.length) {
        game.loseAsync({
          lose_list: event.lose_list
        }).setContent("chooseToCompareLose");
      }
      "step 5";
      //●与本体一致：延时拼点（isDelay）不立即展示/结算，拼点牌暂存特殊区，待阶段结束或角色死亡再弃置
      if (event.isDelay) {
        var _delayCards = [];
        for (var _di = 0; _di < event.lose_list.length; _di++) {
          var _dl = event.lose_list[_di];
          //●lose_list 的第二个元素必须是数组（本体规范和 $giveAuto/addArray 的要求），这里再兜底一次
          var _dlCards = Array.isArray(_dl[1]) ? _dl[1] : [_dl[1]];
          _dl[0].$giveAuto(_dlCards, _dl[0], false);
          _delayCards.addArray(_dlCards);
        }
        game.cardsGotoSpecial(_delayCards);
        var _delayEvt = event;
        player.when({ global: ["dieAfter", "phaseEnd"] }).assign({ forceDie: true }).filter(function (event2, player2) {
          return event2.name == "phase" || [player2, target].includes(event2.player);
        }).step(async function (event2, trigger2, player2) {
          if (_delayCards.some(function (card) { return get.position(card) == "s"; })) {
            _delayEvt.isDestroyed = true;
            await game.cardsGotoOrdering(_delayCards);
            await game.cardsDiscard(_delayCards);
          }
        });
        //●延时拼点不展示结算，直接关掉拼点框，避免框残留且没有确定/取消按钮
        window.__ssPdCloseHandle(event);
        event.untrigger();
        event.finish();
        return;
      }
      if (!event.card1 || !event.card2) {
        window.__ssPdCloseHandle(event);
        event.finish();
        return;
      }
      game.log(player, "的拼点牌为", event.card1);
      game.log(target, "的拼点牌为", event.card2);
      var getNum = function (card) {
        for (var i of event.lose_list) {
          var cs = Array.isArray(i[1]) ? i[1] : [i[1]];
          if (cs.indexOf(card) >= 0) return get.number(card, i[0]);
        }
        return get.number(card, false);
      };
      event.num1 = getNum(event.card1);
      event.num2 = getNum(event.card2);
      event.trigger("compare");
      event.trigger("compareCardShowBefore");
      try {
        var pickPlayers = [player];
        if (target) pickPlayers.push(target);
        setTimeout(function () {
          try {
            var dlg = document.getElementById("compare-dialog");
            if (!dlg) return;
            try {
              var hintBox = dlg.querySelector(".compare-hint");
              if (hintBox && !String(hintBox.textContent || "").trim()) {
                hintBox.textContent = "请选择一张手牌进行拼点";
              }
            } catch (e) {}
            var areaEls = dlg.querySelectorAll(".compare-area");
            var pickTimer = null;
            var confirmOn = false;
            var refreshPick = function () {
              try {
                if (!dlg.isConnected) {
                  if (pickTimer) clearInterval(pickTimer);
                  return;
                }
                var isTargetMode = /Target/.test(_status.event && _status.event.name || "");
                if (isTargetMode && !confirmOn) {
                  try {
                    if (event.compareHandle && typeof event.compareHandle.setConfirm === "function") {
                      event.compareHandle.setConfirm({
                        validate: function () {
                          try {
                            var sel = ui.selected || {};
                            var cardCount = (sel.cards || []).length,
                              targetCount = (sel.targets || []).length;
                            return cardCount > 0 && targetCount === cardCount;
                          } catch (e) {
                            return false;
                          }
                        },
                        onOk: function () {
                          try {
                            ui.click.ok();
                          } catch (e) {}
                        }
                      });
                      confirmOn = true;
                    }
                  } catch (e) {}
                } else if (!isTargetMode && confirmOn) {
                  try {
                    if (event.compareHandle && typeof event.compareHandle.clearConfirm === "function") {
                      event.compareHandle.clearConfirm();
                    }
                  } catch (e) {}
                  confirmOn = false;
                }
                try {
                  if (confirmOn && event.compareHandle && typeof event.compareHandle.refreshConfirm === "function") {
                    event.compareHandle.refreshConfirm();
                  }
                } catch (e) {}
                var sel = ui.selected && ui.selected.targets ? ui.selected.targets : [];
                for (var i = 0; i < areaEls.length && i < pickPlayers.length; i++) {
                  var areaEl = areaEls[i];
                  var cardEl = areaEl.querySelector(".card") || areaEl.querySelector(".compare-slot") || areaEl;
                  if (sel.indexOf(pickPlayers[i]) >= 0) {
                    cardEl.style.outline = "3px solid #FFD700";
                    cardEl.style.outlineOffset = "0px";
                  } else {
                    cardEl.style.outline = "";
                    cardEl.style.outlineOffset = "";
                  }
                }
              } catch (e) {}
            };
            pickTimer = setInterval(refreshPick, 240);
            refreshPick();
            for (var i = 0; i < areaEls.length && i < pickPlayers.length; i++) {
              (function (el, pl) {
                if (!el || !pl || el.__ssPickBound) return;
                el.__ssPickBound = true;
                el.style.cursor = "pointer";
                var doPick = function () {
                  try {
                    var curEvent = _status.event;
                    if (!curEvent || !/Target/.test(curEvent.name || "")) return;
                    var fakeEvent = {
                      stopPropagation: function () {},
                      preventDefault: function () {},
                      target: pl
                    };
                    if (typeof ui.click.target === "function") {
                      ui.click.target.call(pl, fakeEvent);
                    } else if (typeof pl.click === "function") {
                      pl.click();
                    }
                  } catch (e) {}
                };
                el.addEventListener("touchend", function () {
                  try {
                    el.__ssPickTouch = Date.now();
                    doPick();
                  } catch (e) {}
                }, true);
                el.addEventListener("click", function () {
                  try {
                    if (el.__ssPickTouch && Date.now() - el.__ssPickTouch < 700) return;
                    doPick();
                  } catch (e) {}
                }, true);
              })(areaEls[i], pickPlayers[i]);
            }
          } catch (e) {}
        }, 260);
      } catch (e) {}
      window.__ssPdDelay(400);
      "step 6";
      if (!event.card1 || !event.card2) {
        event.finish();
        return;
      }
      event.result = {
        player: event.card1,
        target: event.card2,
        num1: event.num1,
        num2: event.num2
      };
      //●与本体一致：result 就绪后再触发 compareFixing，随后再算胜负
      event.trigger("compareFixing");
      var str;
      var resText = ["", ""];
      //●与本体一致：forceWinner 优先于点数（本体 1.11.6 chooseToCompare 同名逻辑）
      if (event.forceWinner === player || (event.forceWinner !== target && event.num1 > event.num2)) {
        event.result.bool = true;
        event.result.winner = player;
        str = get.translation(player) + "拼点成功";
        resText[0] = "赢";
        resText[1] = "没赢";
      } else {
        event.result.bool = false;
        str = get.translation(player) + "拼点失败";
        if (event.forceWinner !== target && event.num1 === event.num2) {
          event.result.tie = true;
          resText[0] = "没赢";
          resText[1] = "没赢";
        } else {
          event.result.winner = target;
          resText[0] = "没赢";
          resText[1] = "赢";
        }
      }
      //●记录胜负（str 仍留给结果展示用，保持联机客机识别“拼点成功/失败”的逻辑不变）
      window.__ssPdLogCompare(player, target, event.result);
      if (event.compareHandle) {
        var rh = event.compareHandle;
        rh.clearConfirm();
        rh.toResultMode();
        rh.setCard(0, event.card1 || event.card1Top);
        rh.setCard(1, event.card2 || event.card2Top);
        if (rh.setNum) {
          rh.setNum(0, event.num1);
          rh.setNum(1, event.num2);
        }
        try {
          game.pause();
        } catch (e) {}
        rh.showResult(resText);
        setTimeout(function () {
          if (rh && rh.close) rh.close();
          event.compareHandle = null;
          try {
            game.resume();
          } catch (e) {}
        }, 3000);
      } else {
        game.broadcastAll(function (str, eventName, player, target, playerCard, targetCard) {
          if (!window.decadeUI) {
            ui.arena.classList.add("thrownhighlight");
            player.$compare(playerCard, target, targetCard);
            var dialog = ui.create.dialog(str);
            dialog.classList.add("center");
            setTimeout(function (dialog) {
              dialog.close();
            }, 1000, dialog);
          }
        }, str, event.compareName, player, target, event.card1, event.card2);
      }
      window.__ssPdDelay(1800);
      "step 7";
      if (typeof event.target.ai.shown === "number" && event.target.ai.shown <= 0.85 && event.addToAI) {
        event.target.ai.shown += 0.1;
      }
      game.broadcastAll(function () {
        if (!window.decadeUI) ui.arena.classList.remove("thrownhighlight");
      });
      game.addVideo("thrownhighlight2");
      if (event.clear != false) {
        game.broadcastAll(ui.clear);
      }
      if (typeof event.preserve === "function") {
        event.preserve = event.preserve(event.result);
      } else if (event.preserve === "win") {
        event.preserve = event.result.bool;
    } else if (event.preserve === "lose") {
      event.preserve = !event.result.bool;
    }
      //●普通拼点到此结束，必须显式 finish，否则会继续执行下面牌堆拼点专用的 step 8~12
      event.finish();
      "step 8";
      //●牌堆拼点（target === "cardPile"）：与本体一致，只有玩家选一张牌，另一方从牌堆顶/底取
      event.list = [player].filter(function (current) {
        return get.itemtype(current) == "player" && !(event.fixedResult && event.fixedResult[current.playerid]);
      });
      if (event.list.length) {
        if (player.isOnline()) {
          player.chooseCardOL(event.list, "请选择拼点牌", true, event.position)
            .set("filterCard", event.filterCard || lib.filter.all)
            .set("type", "compare")
            .set("ai", event.ai)
            .set("source", player).aiCard = function (target2) {
              try {
                var hs = target2.getCards(event.position);
                var ev2 = _status.event;
                ev2.player = target2;
                hs.sort(function (a, b) { return ev2.ai(b) - ev2.ai(a); });
                delete ev2.player;
                return { bool: true, cards: [hs[0]] };
              } catch (e) {
                return { bool: false, cards: [] };
              }
            };
        } else {
          //●本地选牌：走本体 chooseCard，才能把选中牌同步到拼点框并接管确定按钮
          var _pileNext = player.chooseCard("请选择拼点牌", true, function (card, pl) {
            try {
              if (event.playerCards) return event.playerCards.contains(card);
              if (typeof event.filterCard === "function") return event.filterCard(card, pl, event);
              return true;
            } catch (e) {
              return false;
            }
          }, event.position).set("type", "compare").set("glow_result", true).set("prompt", false);
          //●不设置 noconfirm：保留本体的确认按钮
          _pileNext.ai = event.ai;
          if (event.compareHandle) {
            var _pileHandle = event.compareHandle;
            _pileNext.custom = _pileNext.custom || {
              add: {},
              replace: {}
            };
            _pileNext.custom.add = _pileNext.custom.add || {};
            _pileNext.custom.add.card = function () {
              if (player.isUnderControl(true)) _pileHandle.setCard(0, ui.selected.cards[0] || null);
              _pileHandle.refreshConfirm();
            };
            _pileHandle.setConfirm({
              validate: function () {
                return ui.selected.cards.length === 1;
              },
              onOk: function () {
                ui.click.ok();
              }
            });
          }
        }
      }
      "step 9";
      if (event.fixedResult && event.fixedResult[player.playerid]) {
        event.card1 = event.fixedResult[player.playerid];
      } else {
        var _pileRes = Array.isArray(result) ? result[0] : result;
        if (_pileRes && _pileRes.skill && lib.skill[_pileRes.skill] && lib.skill[_pileRes.skill].onCompare) {
          player.logSkill(_pileRes.skill);
          _pileRes.cards = lib.skill[_pileRes.skill].onCompare(player);
        }
        if (_pileRes && (_pileRes.cards || _pileRes.links)) event.card1 = (_pileRes.cards && _pileRes.cards[0]) || (_pileRes.links && _pileRes.links[0]);
      }
      if (!event.card1) {
        event.result = { cancelled: true, bool: false };
        window.__ssPdCloseHandle(event);
        event.finish();
        return;
      }
      event.lose_list = [[player, [event.card1]]];
      if (event.compareHandle) event.compareHandle.setCard(0, event.card1);
      try {
        if (event.compareType == "bottom") event.card2 = game.cardsGotoOrdering(get.bottomCards()).cards[0];
        else event.card2 = game.cardsGotoOrdering(get.cards()).cards[0];
        if (event.card2 && event.compareType != "bottom" && game.createCardsTopCard) event.card2Top = game.createCardsTopCard(event.card2);
      } catch (e) {}
      "step 10";
      document.body.classList.remove("compare-cmp-selecting");
      if (event.lose_list.length) {
        game.loseAsync({
          lose_list: event.lose_list
        }).setContent("chooseToCompareLose");
      }
      "step 11";
      if (!event.card2) {
        event.result = { cancelled: true, bool: false };
        window.__ssPdCloseHandle(event);
        event.finish();
        return;
      }
      event.trigger("compareCardShowBefore");
      player.showCards(event.card1).set("triggeronly", true);
      game.log(player, "的拼点牌为", event.card1);
      game.log("牌堆", "的拼点牌为", event.card2);
      player.showCards(event.card2).set("triggeronly", true);
      event.num1 = get.number(event.card1, player);
      event.num2 = get.number(event.card2, false);
      event.trigger("compare");
      event.result = {
        player: event.card1,
        target: event.card2,
        num1: event.num1,
        num2: event.num2
      };
      event.trigger("compareFixing");
      var _pileStr;
      if (event.forceWinner === player || (event.forceWinner !== target && event.num1 > event.num2)) {
        event.result.bool = true;
        event.result.winner = player;
        _pileStr = get.translation(player) + "拼点成功";
        player.popup("胜");
      } else {
        event.result.bool = false;
        _pileStr = get.translation(player) + "拼点失败";
        if (event.forceWinner !== target && event.num1 === event.num2) {
          event.result.tie = true;
          player.popup("平");
        } else {
          player.popup("负");
        }
      }
      //●牌堆拼点同样记录胜负
      window.__ssPdLogCompare(player, "cardPile", event.result);
      if (event.compareHandle) {
        //●牌堆拼点同样要给牌堆那张牌贴结果：玩家赢→牌堆没赢；平→双方没赢；玩家输→牌堆赢
        var _pileResText = event.result.bool ? ["赢", "没赢"] : event.result.tie ? ["没赢", "没赢"] : ["没赢", "赢"];
        var _prh = event.compareHandle;
        _prh.clearConfirm();
        _prh.toResultMode();
        try {
          _prh.setCard(0, event.card1);
          _prh.setCard(1, event.compareType == "bottom" ? event.card2 : (event.card2Top || event.card2));
        } catch (e) {}
        if (_prh.setNum) {
          _prh.setNum(0, event.num1);
          _prh.setNum(1, event.num2);
        }
        try {
          game.pause();
        } catch (e) {}
        _prh.showResult(_pileResText);
        setTimeout(function () {
          try {
            if (_prh && _prh.close) _prh.close();
          } catch (e) {}
          if (event.compareHandle === _prh) event.compareHandle = null;
          try {
            game.resume();
          } catch (e) {}
        }, 3000);
      } else {
        game.broadcastAll(function (str) {
          var dialog = ui.create.dialog(str);
          dialog.classList.add("center");
          setTimeout(function (dialog) {
            dialog.close();
          }, 1000, dialog);
        }, _pileStr);
        game.delay(2);
      }
      "step 12";
      if (event.clear != false) {
        game.broadcastAll(ui.clear);
      }
      if (typeof event.preserve === "function") {
        event.preserve = event.preserve(event.result);
      } else if (event.preserve === "win") {
        event.preserve = event.result.bool;
      } else if (event.preserve === "lose") {
        event.preserve = !event.result.bool;
      }
  };
    ssPdRegisterContent("chooseToCompare", ssPdCustomCompare);
    //●联机时上面返回的是本体 content（数组，索引 10 是算胜负的那一步），在那里补一条双方胜负记录
    try {
      var _nativeCmp = ssPdContentHooks["chooseToCompare"].native;
      if (Array.isArray(_nativeCmp) && typeof _nativeCmp[10] === "function" && !_nativeCmp[10].__ssPdLogged) {
        var _origCmp10 = _nativeCmp[10];
        _nativeCmp[10] = async function (event, trigger, player) {
          await _origCmp10.apply(this, arguments);
          try {
            window.__ssPdLogCompare(player, event.target, event.result);
          } catch (e) {}
        };
        _nativeCmp[10].__ssPdLogged = true;
      }
    } catch (e) {}
  }
  //●延时拼点被揭示时，本体走的是 chooseToCompareEffect（不是 chooseToCompare），
  //  原来只替换了 chooseToCompare，所以揭示结果时还是无名杀原本的飞牌 + 居中提示；
  //  这里把揭示流程也接到手杀拼点框：建框 -> 放牌 -> 显示点数 -> 显示胜负 -> 关框
  function installCompareEffect() {
    if (ssPdContentHooks["chooseToCompareEffect"]) return;
    var nativeSteps = lib.element.content.chooseToCompareEffect;
    if (!Array.isArray(nativeSteps) || nativeSteps.length < 8) return;
    var steps = nativeSteps.slice();
    var orig0 = steps[0];
    var orig1 = steps[1];
    var orig2 = steps[2];
    var orig3 = steps[3];
    var orig6 = steps[6];
    var orig7 = steps[7];
    steps[0] = async function (event, trigger, player) {
      await orig0(event, trigger, player);
      //●延时拼点已销毁（不揭示）时 orig0 会直接 finish，不用建框
      if (event.finished || !event.card1 || !event.card2) return;
      var evt0 = event.parentEvent || event;
      var tgt = event.target;
      var label = tgt;
      if (typeof tgt === "string") {
        label = {
          name: tgt === "cardPile" ? (evt0.compareType === "bottom" ? "牌堆底" : "牌堆顶") : tgt
        };
      }
      var _effectEvent = event;
      window.__ssPdAddMessageHook(event, "finished", function () {
        window.__ssPdCloseHandle(_effectEvent);
        try {
          document.body.classList.remove("ss-compare-on");
        } catch (e) {}
      });
      try {
        event.compareHandle = window.compareDialog(player, event, {
          title: window.ssCompareTitle(evt0) || window.ssCompareTitle(event) || "拼点",
          hint: "揭示延时拼点结果",
          players: [player, label],
          collapsible: true
        });
        if (event.compareHandle) {
          event.compareHandle.clearConfirm();
          event.compareHandle.setCard(0, event.card1);
          event.compareHandle.setCard(1, event.card2);
        }
      } catch (e) {}
    };
    steps[1] = async function (event, trigger, player) {
      await orig1(event, trigger, player);
      if (event.finished || !event.compareHandle) return;
      try {
        event.compareHandle.setCard(0, event.card1);
        event.compareHandle.setCard(1, event.card2);
      } catch (e) {}
    };
    steps[2] = async function (event, trigger, player) {
      //●有手杀拼点框时跳过本体的飞牌动画，避免两套牌同时出现在屏幕中央
      if (event.compareHandle) return;
      return orig2(event, trigger, player);
    };
    steps[3] = async function (event, trigger, player) {
      await orig3(event, trigger, player);
      if (event.finished || !event.compareHandle) return;
      try {
        if (event.compareHandle.setNum) {
          event.compareHandle.setNum(0, event.num1);
          event.compareHandle.setNum(1, event.num2);
        }
        event.compareHandle.setHint("揭示延时拼点结果");
      } catch (e) {}
    };
    steps[6] = async function (event, trigger, player) {
      await orig6(event, trigger, player);
      //●延时拼点揭示后同样在游戏记录里写明双方胜负
      try {
        window.__ssPdLogCompare(player, event.target, event.result);
      } catch (e) {}
      if (event.finished || !event.compareHandle) return;
      var resText = ["", ""];
      if (event.result.bool) {
        resText[0] = "赢";
        resText[1] = "没赢";
      } else if (event.result.tie) {
        resText[0] = "没赢";
        resText[1] = "没赢";
      } else {
        resText[0] = "没赢";
        resText[1] = "赢";
      }
      try {
        var rh = event.compareHandle;
        rh.clearConfirm();
        rh.toResultMode();
        if (rh.setNum) {
          rh.setNum(0, event.num1);
          rh.setNum(1, event.num2);
        }
        rh.showResult(resText);
      } catch (e) {}
    };
    steps[7] = async function (event, trigger, player) {
      //●有手杀拼点框时不弹本体的居中文字框，让框停留一会儿再关
      var rh = event.compareHandle;
      if (!rh) return orig7(event, trigger, player);
      await game.delay(0, 2500);
      try {
        rh.close();
      } catch (e) {}
      event.compareHandle = null;
      try {
        document.body.classList.remove("compare-cmp-selecting");
        document.body.classList.remove("ss-compare-on");
      } catch (e) {}
    };
    ssPdRegisterContent("chooseToCompareEffect", steps);
    //●联机时揭示流程用的是本体数组，索引 6 是算胜负的那一步，同样补记录
    try {
      if (typeof nativeSteps[6] === "function" && !nativeSteps[6].__ssPdLogged) {
        var _origEff6 = nativeSteps[6];
        nativeSteps[6] = async function (event, trigger, player) {
          await _origEff6.apply(this, arguments);
          try {
            window.__ssPdLogCompare(player, event.target, event.result);
          } catch (e) {}
        };
        nativeSteps[6].__ssPdLogged = true;
      }
    } catch (e) {}
  }
  function installCompareMultiple() {
    if (ssPdContentHooks["chooseToCompareMultiple"]) return;
    var nativeSteps = lib.element.content.chooseToCompareMultiple;
    if (!Array.isArray(nativeSteps) || nativeSteps.length < 13) return;
    var steps = nativeSteps.slice();
    steps[1] = async function (event, trigger, player, result) {
      //●拼点结算阶段本体确认条可能还留在屏幕上，误点会把 event.result 覆盖成 {confirm:"ok"}，
      //  导致后续 step 8 写 result.num1 时报 "Cannot set properties of undefined"
      try {
        event.custom = event.custom || {};
        event.custom.replace = event.custom.replace || {};
        if (!event.custom.replace.confirm) {
          event.custom.replace.confirm = function () {
            return true;
          };
        }
      } catch (e) {}
      var involved = [player].concat(event.targets || []);
      var anyMine = false;
      for (var i = 0; i < involved.length; i++) {
        if (involved[i].isUnderControl(true)) {
          anyMine = true;
          break;
        }
      }
      if (anyMine && event.targets && event.targets.length) {
        if (event.parent.name === undefined || event.parent.name === "trigger") {
          event.compareName = event.name;
        } else {
          event.compareName = event.parent.name;
        }
        var compareOpts = event.compare_opts || {};
        var faceIdx = [];
        if (!player.isUnderControl(true)) faceIdx.push(0);
        for (var j = 0; j < event.targets.length; j++) {
          if (!event.targets[j].isUnderControl(true)) faceIdx.push(j + 1);
        }
        var introNames = [get.translation(player)];
        for (var j = 0; j < event.targets.length; j++) introNames.push(get.translation(event.targets[j]));
        var cardUser = window.ssPindianCardUser(event, player, event.targets && event.targets[0]);
        var userIsMe = cardUser ? cardUser === game.me : null;
        event.compareHandle = compareDialog(player, event, {
          title: compareOpts.title || window.ssCompareTitle(event) || "拼点",
          hint: ssPindianColor(ssPindianIntro(event.compareName, game.me === player ? "self" : "other", userIsMe) || strHint(compareOpts.hint) || "请选择一张手牌进行拼点", introNames),
          hintColor: compareOpts.hintColor || "#BFAF58",
          players: [player].concat(event.targets),
          faceBack: faceIdx,
          collapsible: compareOpts.collapsible != null ? compareOpts.collapsible : true
        });
        document.body.classList.add("compare-cmp-selecting");
        document.body.classList.add("ss-compare-on");
        event.__ssCardHook = function () {
          try {
            var h = event.compareHandle;
            if (!h) return;
            var mySlot = -1;
            if (game.me === player) {
              mySlot = 0;
            } else if (event.targets) {
              var mi = event.targets.indexOf(game.me);
              if (mi >= 0) mySlot = mi + 1;
            }
            if (mySlot >= 0) {
              h.setCard(mySlot, ui.selected.cards[0] || null);
            }
            h.refreshConfirm();
          } catch (e) {}
        };
        event.__ssCleanup = function () {
          document.body.classList.remove("compare-cmp-selecting");
          document.body.classList.remove("ss-compare-on");
          event.__ssCardHook = null;
          try {
            ui.selected.buttons.length = 0;
            ui.selected.cards.length = 0;
            ui.selected.targets.length = 0;
          } catch (e) {}
          try {
            if (ui.confirm && ui.confirm.close) ui.confirm.close();
          } catch (e) {}
        };
        event.compareHandle.setConfirm({
          validate: function () {
            try {
              return !!(ui.selected && ui.selected.cards && ui.selected.cards.length === 1);
            } catch (e) {
              return false;
            }
          },
          onOk: function () {
            try {
              ui.click.ok();
            } catch (e) {}
          }
        });
        window.__ssPdAddMessageHook(event, "finished", function () {
          if (this.__ssCleanup) this.__ssCleanup();
          if (this.compareHandle) {
            this.compareHandle.close();
            this.compareHandle = null;
          }
          if (window.__ssCloseCompare) window.__ssCloseCompare(null);
        });
      }
      var targets = event.targets;
      event._result = [];
      event.list = [];
      for (var t = 0; t < targets.length; t++) {
        if (!event.fixedResult || !event.fixedResult[targets[t].playerid]) event.list.push(targets[t]);
      }
      if (event.list.length || !event.fixedResult || !event.fixedResult[player.playerid]) {
        if (!event.fixedResult || !event.fixedResult[player.playerid]) event.list.unshift(player);
        var olNext = player.chooseCardOL(event.list, true).set("filterCard", event.filterCard).set("type", "compare").set("prompt", false).set("noconfirm", true).set("ai", event.ai).set("source", player);
        if (event.__ssCardHook) {
          olNext.set("custom", {
            add: { card: event.__ssCardHook },
            replace: {}
          });
        }
        olNext.aiCard = function (target) {
          var hs = target.getCards("h");
          var evt2 = _status.event;
          evt2.player = target;
          hs.sort(function (a, b) { return evt2.ai(b) - evt2.ai(a); });
          delete evt2.player;
          return { bool: true, cards: [hs[0]] };
        };
      }
    };
    var orig2 = steps[2];
    steps[2] = async function (event, trigger, player, result) {
      await orig2(event, trigger, player, result);
      //●保存结算结果对象的引用：万一被本体确认条误点覆盖，后面 step 8 能恢复 num1/num2 数组
      event.__ssCmpResult = event.result;
      if (event.__ssCleanup) event.__ssCleanup();
      var rh = event.compareHandle;
      if (rh) {
        rh.clearConfirm();
        if (event.card1) {
          rh.setCard(0, event.card1);
        }
        rh.toResultMode();
      }
    };
    steps[4] = async function (event, trigger, player) {
      game.log(player, "的拼点牌为", event.card1);
      if (!event.compareHandle) {
        player.showCards(event.card1).set("triggeronly", true);
      }
    };
    steps[5] = async function (event, trigger, player) {
      var targets = event.targets;
      if (event.iwhile < targets.length) {
        event.target = targets[event.iwhile];
        event.target.addTempClass("target");
        player.addTempClass("target");
        event.card2 = event.cardlist[event.iwhile];
        event.num2 = event.getNum(event.card2);
        game.log(event.target, "的拼点牌为", event.card2);
        player.line(event.target);
        if (event.compareHandle) {
          event.compareHandle.setCard(event.iwhile + 1, event.card2);
        } else {
          player.$compare(event.card1, event.target, event.card2);
          event.target.showCards(event.card2).set("triggeronly", true);
        }
      } else {
        event.goto(12);
      }
    };
    var orig8 = steps[8];
    steps[8] = async function (event, trigger, player, result) {
      //●若 event.result 被误点覆盖，先恢复成 step 2 保存的结算结果对象
      if (event.__ssCmpResult && event.result !== event.__ssCmpResult) event.result = event.__ssCmpResult;
      await orig8(event, trigger, player, result);
      //●逐对记录胜负（event.winner 由本体这一步算出；平局时为空）
      try {
        window.__ssPdLogCompareWinner(event.winner);
      } catch (e) {}
      var rh = event.compareHandle;
      if (rh && event.target) {
        var res = [];
        if (event.winner === player) {
          res[0] = "赢";
          res[event.iiwhile + 1] = "没赢";
        } else if (event.winner === event.target) {
          res[0] = "没赢";
          res[event.iiwhile + 1] = "赢";
        } else {
          res[0] = "没赢";
          res[event.iiwhile + 1] = "没赢";
        }
        if (rh.setNum && typeof event.num1 === "number" && typeof event.num2 === "number") {
          rh.setNum(0, event.num1);
          rh.setNum(event.iiwhile + 1, event.num2);
        }
        rh.showResult(res);
      }
    };
    var orig12 = steps[12];
    steps[12] = async function (event, trigger, player) {
      if (event.__ssCleanup) event.__ssCleanup();
      var rh = event.compareHandle;
      if (rh) {
        rh.close();
        event.compareHandle = null;
      }
      await orig12(event, trigger, player);
    };
    ssPdRegisterContent("chooseToCompareMultiple", steps);
    //●联机时用的是本体数组，索引 8 是逐对算胜负的那一步，同样补记录
    try {
      if (typeof nativeSteps[8] === "function" && !nativeSteps[8].__ssPdLogged) {
        var _origMul8 = nativeSteps[8];
        nativeSteps[8] = async function (event, trigger, player) {
          await _origMul8.apply(this, arguments);
          try {
            window.__ssPdLogCompareWinner(event.winner);
          } catch (e) {}
        };
        nativeSteps[8].__ssPdLogged = true;
      }
    } catch (e) {}
  }
  function installCompareMeanwhile() {
    if (ssPdContentHooks["chooseToCompareMeanwhile"]) return;
    var nativeSteps = lib.element.content.chooseToCompareMeanwhile;
    if (!Array.isArray(nativeSteps) || nativeSteps.length < 13) return;
    var steps = nativeSteps.slice();
    steps[1] = async function (event, trigger, player, result) {
      //●拼点结算阶段本体确认条可能还留在屏幕上，误点会把 event.result 覆盖成 {confirm:"ok"}，
      //  导致后续 step 8 写 result.num1 时报 "Cannot set properties of undefined"
      try {
        event.custom = event.custom || {};
        event.custom.replace = event.custom.replace || {};
        if (!event.custom.replace.confirm) {
          event.custom.replace.confirm = function () {
            return true;
          };
        }
      } catch (e) {}
      var involved = [player].concat(event.targets || []);
      var anyMine = false;
      for (var i = 0; i < involved.length; i++) {
        if (involved[i].isUnderControl(true)) {
          anyMine = true;
          break;
        }
      }
      if (anyMine && event.targets && event.targets.length) {
        if (event.parent.name === undefined || event.parent.name === "trigger") {
          event.compareName = event.name;
        } else {
          event.compareName = event.parent.name;
        }
        var compareOpts = event.compare_opts || {};
        var faceIdx = [];
        if (!player.isUnderControl(true)) faceIdx.push(0);
        for (var j = 0; j < event.targets.length; j++) {
          if (!event.targets[j].isUnderControl(true)) faceIdx.push(j + 1);
        }
        var introNames = [get.translation(player)];
        for (var j = 0; j < event.targets.length; j++) introNames.push(get.translation(event.targets[j]));
        var cardUser = window.ssPindianCardUser(event, player, event.targets && event.targets[0]);
        var userIsMe = cardUser ? cardUser === game.me : null;
        event.compareHandle = compareDialog(player, event, {
          title: compareOpts.title || window.ssCompareTitle(event) || "拼点",
          hint: ssPindianColor(ssPindianIntro(event.compareName, game.me === player ? "self" : "other", userIsMe) || strHint(compareOpts.hint) || "请选择一张手牌进行拼点", introNames),
          hintColor: compareOpts.hintColor || "#BFAF58",
          players: [player].concat(event.targets),
          faceBack: faceIdx,
          collapsible: compareOpts.collapsible != null ? compareOpts.collapsible : true
        });
        document.body.classList.add("compare-cmp-selecting");
        document.body.classList.add("ss-compare-on");
        event.__ssCardHook = function () {
          try {
            var h = event.compareHandle;
            if (!h) return;
            var mySlot = -1;
            if (game.me === player) {
              mySlot = 0;
            } else if (event.targets) {
              var mi = event.targets.indexOf(game.me);
              if (mi >= 0) mySlot = mi + 1;
            }
            if (mySlot >= 0) {
              h.setCard(mySlot, ui.selected.cards[0] || null);
            }
            h.refreshConfirm();
          } catch (e) {}
        };
        event.__ssCleanup = function () {
          document.body.classList.remove("compare-cmp-selecting");
          document.body.classList.remove("ss-compare-on");
          event.__ssCardHook = null;
          try {
            ui.selected.buttons.length = 0;
            ui.selected.cards.length = 0;
            ui.selected.targets.length = 0;
          } catch (e) {}
        };
        if (ui.confirm && ui.confirm.close) ui.confirm.close();
        event.compareHandle.setConfirm({
          validate: function () {
            try {
              return !!(ui.selected && ui.selected.cards && ui.selected.cards.length === 1);
            } catch (e) {
              return false;
            }
          },
          onOk: function () {
            try {
              ui.click.ok();
            } catch (e) {}
          }
        });
        window.__ssPdAddMessageHook(event, "finished", function () {
          if (this.__ssCleanup) this.__ssCleanup();
          if (this.compareHandle) {
            this.compareHandle.close();
            this.compareHandle = null;
          }
          if (window.__ssCloseCompare) window.__ssCloseCompare(null);
        });
      }
      var targets = event.targets;
      event._result = [];
      event.list = [];
      for (var t = 0; t < targets.length; t++) {
        if (!event.fixedResult || !event.fixedResult[targets[t].playerid]) event.list.push(targets[t]);
      }
      if (event.list.length || !event.fixedResult || !event.fixedResult[player.playerid]) {
        if (!event.fixedResult || !event.fixedResult[player.playerid]) event.list.unshift(player);
        var olNext = player.chooseCardOL(event.list, "请选择拼点牌", true).set("filterCard", event.filterCard).set("type", "compare").set("prompt", false).set("noconfirm", true).set("ai", event.ai).set("source", player);
        if (event.__ssCardHook) {
          olNext.set("custom", {
            add: { card: event.__ssCardHook },
            replace: {}
          });
        }
        olNext.aiCard = function (target) {
          var hs = target.getCards("h");
          var evt2 = _status.event;
          evt2.player = target;
          hs.sort(function (a, b) { return evt2.ai(b) - evt2.ai(a); });
          delete evt2.player;
          return { bool: true, cards: [hs[0]] };
        };
      }
    };
    var orig2 = steps[2];
    steps[2] = async function (event, trigger, player, result) {
      await orig2(event, trigger, player, result);
      //●保存结算结果对象的引用：万一被本体确认条误点覆盖，后面 step 8 能恢复 num1/num2 数组
      event.__ssCmpResult = event.result;
      //●共同拼点的 step 6 会 delete event.player，step 7 拿到的 player 是 undefined；
      //  这里先记住发起者，否则发起者赢下共同拼点时会被误判成"没赢"
      event.__ssPdInitiator = player || event.tempplayer;
      if (event.__ssCleanup) event.__ssCleanup();
      var rh = event.compareHandle;
      if (rh) {
        rh.clearConfirm();
        if (event.card1) {
          rh.setCard(0, event.card1);
        }
        rh.toResultMode();
      }
    };
    var orig4 = steps[4];
    steps[4] = async function (event, trigger, player) {
      var rh = event.compareHandle;
      if (!rh) {
        await orig4(event, trigger, player);
        return;
      }
      var targets = event.targets;
      rh.setCard(0, event.card1);
      for (var i = 0; i < targets.length; i++) {
        rh.setCard(i + 1, event.cardlist[i]);
      }
      game.log(player, "的拼点牌为", event.card1);
      await player.showCards(event.card1).set("triggeronly", true);
      var func = async function (card, index) {
        game.log(targets[index], "的拼点牌为", card);
        await targets[index].showCards(card).set("triggeronly", true);
      };
      await game.doAsyncInOrder(event.cardlist, func, function () { return 1; });
      player.addTempClass("target");
      game.delay(0, lib.config.game_speed == "vvfast" ? 4000 : 1000);
    };
    var orig7 = steps[7];
    steps[7] = async function (event, trigger, player) {
      await orig7(event, trigger, player);
      var rh = event.compareHandle;
      if (rh && event.target) {
        //●共同拼点里 step 6 已 delete event.player，此处的 player 是 undefined，
        //  必须用提前保存的发起者（或 event.tempplayer）判断，否则发起者赢时全场都贴"没赢"
        var initiator = event.__ssPdInitiator || event.tempplayer || event.player || player;
        var winP = event.forceWinner || event.winner;
        //●重建已亮出的所有槽位结果，顺便清掉上一轮残留的"赢"贴图（赢家被后来者反超/平点时）
        var res = [];
        var slots = (event.iwhile || 0) + 2;
        for (var k = 0; k < slots; k++) res[k] = "没赢";
        var wi = -1;
        if (winP === initiator) wi = 0;
        else if (winP && event.targets) wi = event.targets.indexOf(winP) + 1;
        if (wi >= 0 && wi < slots) res[wi] = "赢";
        if (rh.setNum && typeof event.num1 === "number" && typeof event.num2 === "number") {
          rh.setNum(0, event.num1);
          rh.setNum(event.iwhile + 1, event.num2);
        }
        rh.showResult(res);
      }
    };
    //●共同拼点的 step 8 同样会写 event.result.num1[]，先恢复被误点覆盖的结果对象
    var orig8 = steps[8];
    steps[8] = async function (event, trigger, player, result) {
      if (event.__ssCmpResult && event.result !== event.__ssCmpResult) event.result = event.__ssCmpResult;
      await orig8(event, trigger, player, result);
    };
    var orig12 = steps[12];
    steps[12] = async function (event, trigger, player) {
      if (event.__ssCleanup) event.__ssCleanup();
      var rh = event.compareHandle;
      if (rh) {
        rh.close();
        event.compareHandle = null;
      }
      await orig12(event, trigger, player);
    };
    ssPdRegisterContent("chooseToCompareMeanwhile", steps);
  }
  function boot() {
    try {
      installCompare();
    } catch (e) {
    }
    try {
      installCompareEffect();
    } catch (e) {
    }
    try {
      installCompareMultiple();
    } catch (e) {
    }
    try {
      installCompareMeanwhile();
    } catch (e) {
    }
  }
  if (document.readyState === "complete") {
    setTimeout(boot, 1000);
  } else {
    window.addEventListener("load", function () {
      setTimeout(boot, 1000);
    });
  }
  setTimeout(boot, 5000);
  setTimeout(boot, 15000);
});

/*●联机客机拼点框（房主没装本扩展也能生效）：
  联机时拼点流程（content）跑在执行方/服务器那台机器上，本扩展在那台机器上没有界面，
  所以客机只能靠"本体一定会发出来"的广播在本机重建这个框：
  1) 本体抛出拼点牌时会调用 player.$compare(card1, target, card2)、
     多目标拼点会调用 player.$compareMultiple(card1, targets, cards)，
     这两个方法内部都会 game.broadcast 到每个客机——在这里建框、填牌和点数；
  2) 判出胜负后本体 game.broadcastAll 一条 "XX拼点成功/失败" 的居中对话框——
     在这里按"是谁"给对应槽位补 赢/没赢 徽章，并把本体那条居中文字藏掉；
  3) 收尾的 ui.clear 同样是 broadcastAll 出去的——还没出结果时兜底关框。
  只做展示，不动任何游戏流程；执行方自己已经有框（单机/本扩展生效时）会自动跳过。
  ●多人拼点：本扩展的框本身是单例（同一时刻只有一个），跟单机表现一致；
  两场拼点的结果按"发起者名字"匹配，对不上就直接忽略，不会把徽章贴错人 */
window.__ssPindianImport(function (lib, game, ui, get, ai, _status) {
  if (!lib || !game || !ui || !get) return;
  if (typeof document === "undefined") return;
  if (window.__ssPdGuestBox) return;
  window.__ssPdGuestBox = true;

  var box = null;
  var seq = 0;

  var strip = function (s) {
    return String(s == null ? "" : s)
      .replace(/<[^>]*>/g, "")
      .trim();
  };
  var numOf = function (card) {
    try {
      return get.number(card);
    } catch (e) {
      return null;
    }
  };
  //●槽位名字：真实武将用译名，牌堆之类的占位对象用它的 name
  var labelOf = function (p) {
    try {
      if (!p) return "";
      if (get.itemtype(p) === "player" || p.playerid != null) return strip(get.translation(p));
      return strip(p.name || "");
    } catch (e) {
      return "";
    }
  };

  var closeBox = function () {
    var cur = box;
    box = null;
    if (!cur) return;
    clearTimeout(cur.timer);
    try {
      if (cur.handle && cur.handle.close) cur.handle.close();
    } catch (e) {}
    try {
      document.body.classList.remove("compare-cmp-selecting");
      document.body.classList.remove("ss-compare-on");
    } catch (e) {}
  };

  //●执行方本机已经有框（单机、或本扩展在那台机器上生效）时不要再开一个
  var hasLocalBox = function () {
    try {
      return !!(window.compareDialog && typeof window.compareDialog.current === "function" && window.compareDialog.current());
    } catch (e) {
      return false;
    }
  };

  /*●建框：player 是发起者，card0 是他的拼点牌，sides 是其余槽位 [{who, card}]
    （牌堆拼点时 who 传 {name:"牌堆"}）*/
  var buildBox = function (player, card0, sides, title) {
    if (typeof window.compareDialog !== "function") {
      return;
    }
    if (hasLocalBox()) {
      return;
    }
    closeBox();
    var players = [player],
      names = [labelOf(player)],
      cards = [card0];
    for (var i = 0; i < sides.length; i++) {
      players.push(sides[i].who);
      names.push(labelOf(sides[i].who));
      cards.push(sides[i].card);
    }
    var h = window.compareDialog(player, {}, {
      title: title || "拼点",
      hint: "",
      hintColor: "#BFAF58",
      players: players
    });
    if (!h) return;
    var cur = {
      id: ++seq,
      handle: h,
      names: names,
      nums: [],
      res: [],
      //●pids 与槽位一一对应（牌堆这类占位没有 playerid，记 null）；pops 收本体广播的 胜/负/平
      pids: [],
      pops: [],
      resultShown: false,
      resultAt: 0,
      timer: null
    };
    for (var j = 0; j < cards.length; j++) {
      cur.nums.push(numOf(cards[j]));
      cur.res.push("");
      cur.pids.push(players[j] && players[j].playerid != null ? players[j].playerid : null);
    }
    box = cur;
    for (var k = 0; k < cards.length; k++) {
      try {
        h.setCard(k, cards[k]);
      } catch (e) {}
    }
    for (var m = 0; m < cards.length; m++) {
      try {
        if (h.setNum) h.setNum(m, cur.nums[m]);
      } catch (e) {}
    }
    try {
      if (h.setHint) h.setHint("拼点中…");
    } catch (e) {}
    //●兜底：万一收尾广播没来，30 秒后自己收框，避免留个框挡界面
    cur.timer = setTimeout(function () {
      if (box && box.id === cur.id) closeBox();
    }, 30000);
  };

  /*●胜负优先从本体广播里读，不再靠点数猜：
  本体判胜负的那一刻会对两边分别 popup("胜"/"负"/"平")，而 popup 内部就是
  game.broadcast 的 $damagepop（player.js），所以每个客机都能拿到"谁 胜/负/平"。
  这比结果文字可靠：文字只写发起者"拼点成功/失败"，平局要靠点数推，而 popup 直接给"平" */
  var applyFromPops = function (cur) {
    if (!cur.pops.length) return false;
    var any = false;
    for (var i = 0; i < cur.pops.length; i++) {
      var t = cur.pops[i].text;
      if (t === "平") {
        for (var j = 0; j < cur.res.length; j++) cur.res[j] = "没赢";
        any = true;
        continue;
      }
      var idx = cur.pids.indexOf(cur.pops[i].pid);
      if (idx < 0) continue;
      cur.res[idx] = t === "胜" ? "赢" : "没赢";
      if (cur.res.length === 2) cur.res[1 - idx] = t === "胜" ? "没赢" : "赢";
      any = true;
    }
    return any;
  };

  //●结果：str 形如 "张三拼点成功" / "张三拼点失败"
  var applyResult = function (str) {
    var cur = box;
    if (!cur) return false;
    var s = strip(str);
    var ok = /拼点成功$/.test(s);
    if (!ok && !/拼点失败$/.test(s)) return false;
    if (!applyFromPops(cur)) {
      //●没收到 popup（被别的UI冲掉等）时才退回结果文字：按名字定位发起者
      var who = s.replace(/拼点(成功|失败)$/, "");
      var idx = -1;
      for (var i = 0; i < cur.names.length; i++) {
        var nm = cur.names[i];
        if (!nm) continue;
        if (who === nm || who.indexOf(nm) === 0) {
          idx = i;
          break;
        }
      }
      //●对不上这一场拼点的名字：可能同时有另一场拼点在跑，直接忽略，不乱贴徽章
      if (idx < 0) return false;
      if (idx === 0) {
        var tie = cur.names.length === 2 && cur.nums[0] !== null && cur.nums[0] === cur.nums[1];
        cur.res[0] = ok ? "赢" : "没赢";
        if (cur.res.length > 1) cur.res[1] = ok ? "没赢" : tie ? "没赢" : "赢";
      } else {
        cur.res[idx] = ok ? "赢" : "没赢";
        cur.res[0] = ok ? "没赢" : "赢";
      }
    }
    try {
      if (!cur.resultShown) {
        if (cur.handle.clearConfirm) cur.handle.clearConfirm();
        if (cur.handle.toResultMode) cur.handle.toResultMode();
        if (cur.handle.setHint) cur.handle.setHint("");
        cur.resultShown = true;
      }
      if (cur.handle.showResult) cur.handle.showResult(cur.res);
    } catch (e) {}
    cur.resultAt = Date.now();
    clearTimeout(cur.timer);
    var id = cur.id;
    cur.timer = setTimeout(function () {
      if (box && box.id === id) closeBox();
    }, 2600);
    return true;
  };

  /*●结果文字 / ui.clear / popup 的钩子都在这组函数里，每次拼点前复查一次：
  皮肤切换、十周年UI 这类扩展有的版本会直接给 ui.create.dialog / ui.clear / popup
  重新赋值（不串接原函数）。这里的判断标记打在"包装函数自己"身上：
  - 我们包装后的函数还在 -> 说明没人冲掉，跳过；
  - 被别人换掉了（新函数没有标记）-> 从"当前这个函数"再包一层，
    这样皮肤切换的新实现仍然在最里层生效，两边不会互相吃掉 */
  /*●本体会 `game.broadcastAll(ui.clear)`（content.js 里多处这样写），也就是把函数对象本身
    广播出去、在别的客户端被序列化后再执行。那时包装函数里的闭包变量全都不存在，
    会直接抛 ReferenceError（联机表现为 "origClear is not defined" 弹报错页）。
    所以下面这几个包装函数一律不引用局部变量：原函数挂在 window 上，
    要用的功能走 window.__ssPdGuestApi，取不到就安全跳过 */
  var guestApi = {
    onResultText: function (s, dialog) {
      try {
        if (!box || box.resultShown) return false;
        if (typeof s !== "string" || !/拼点(成功|失败)$/.test(strip(s))) return false;
        if (!applyResult(s)) return false;
        try {
          dialog.style.setProperty("display", "none", "important");
        } catch (e1) {}
        return true;
      } catch (e) {
        return false;
      }
    },
    afterClear: function () {
      try {
        //●已经出过结果的框交给它自己的定时器收，别被 ui.clear 提前掐掉
        if (box && !box.resultShown) setTimeout(closeBox, 300);
      } catch (e) {}
    },
    onPopup: function (player, name) {
      try {
        if (!box || box.resultShown || typeof name !== "string") return;
        var t = strip(get.translation(name));
        if (t === "胜" || t === "负" || t === "平") {
          box.pops.push({ pid: player && player.playerid != null ? player.playerid : null, text: t });
        }
      } catch (e) {}
    }
  };
  try {
    window.__ssPdGuestApi = guestApi;
  } catch (e) {}

  var installResultHooks = function () {
    try {
      if (typeof ui.create.dialog === "function" && !ui.create.dialog.__ssPdGuestResultHook) {
        window.__ssPdOrigDialog = ui.create.dialog;
        var wrappedDialog = function () {
          var orig = window.__ssPdOrigDialog || (window.ui && window.ui.create && window.ui.create.dialog);
          if (typeof orig !== "function") return;
          var dialog = orig.apply(this, arguments);
          try {
            var api = window.__ssPdGuestApi;
            if (api && api.onResultText) api.onResultText(arguments[0], dialog);
          } catch (e1) {}
          return dialog;
        };
        wrappedDialog.__ssPdGuestResultHook = true;
        ui.create.dialog = wrappedDialog;
      }
    } catch (e) {}
    try {
      if (typeof ui.clear === "function" && !ui.clear.__ssPdGuestClearHook) {
        window.__ssPdOrigClear = ui.clear;
        var wrappedClear = function () {
          var orig = window.__ssPdOrigClear || (window.ui && window.ui.clear);
          if (typeof orig !== "function") return;
          var ret = orig.apply(this, arguments);
          try {
            var api = window.__ssPdGuestApi;
            if (api && api.afterClear) api.afterClear();
          } catch (e1) {}
          return ret;
        };
        wrappedClear.__ssPdGuestClearHook = true;
        ui.clear = wrappedClear;
      }
    } catch (e) {}
    //●本体判胜负时会 popup("胜"/"负"/"平")，popup 内部就广播到每个客机，在这里记下来
    try {
      var pproto = pdPlayerProto();
      if (pproto && typeof pproto.popup === "function" && !pproto.popup.__ssPdGuestPopupHook) {
        window.__ssPdOrigPopup = pproto.popup;
        var wrappedPopup = function () {
          var orig = window.__ssPdOrigPopup;
          var ret = typeof orig === "function" ? orig.apply(this, arguments) : undefined;
          try {
            var api = window.__ssPdGuestApi;
            if (api && api.onPopup) api.onPopup(this, arguments[0]);
          } catch (e1) {}
          return ret;
        };
        wrappedPopup.__ssPdGuestPopupHook = true;
        pproto.popup = wrappedPopup;
      }
    } catch (e) {}
  };

  //●不同版本的本体：新版是 class Player（方法在 prototype 上），
  //  老版/AI版会把方法挂在 lib.element.Player 这个对象上、类在 lib.element.player，
  //  只写 .prototype 在老版上会取不到方法（钩子静默失效，联机就不出框）
  var pdPlayerProto = function () {
    try {
      if (lib.element.Player && lib.element.Player.prototype) return lib.element.Player.prototype;
    } catch (e) {}
    try {
      if (lib.element.player && lib.element.player.prototype) return lib.element.player.prototype;
    } catch (e) {}
    try {
      if (lib.element.Player) return lib.element.Player;
    } catch (e) {}
    return null;
  };



  //●技能 id → 中文名（与 ssCompareTitle 的规则一致）
  var ssSkillTitleOf = function (id) {
    try {
      if (typeof id !== "string" || !id) return null;
      var real = id;
      try { if (lib.skill[id] && lib.skill[id].sourceSkill) real = lib.skill[id].sourceSkill; } catch (e) {}
      var tr = lib.translate && lib.translate[real];
      if (typeof tr === "string" && tr && tr !== real) return tr;
      if (/[^\x00-\x7f]/.test(id)) return id;
    } catch (e) {}
    return null;
  };
  //●客机：主机不会把 useSkill 事件发给客机，但会把 game.logv(player, card) 广播过来，
  //  card 就是技能 id。拦截 ws 原始消息记下"每个玩家最近一次技能"，供拼点框取标题（思路同皮肤切换扩展）。
  var installGuestSkillTracker = function () {
    //●注册到扩展统一的消息入口（extension.js 的 ssWsAdd），这里不再单独包 ws.onmessage
    try {
      if (!window.ssWsAdd) return false;
      if (window.__ssPdSkillTrackerAdded) return true;
      window.ssWsAdd(function (src, args) {
        try {
          var isLogv =
            src.indexOf("game.logv(") >= 0 ||
            src.indexOf("node.node={}") >= 0 ||
            /function\s*\(\s*player\s*,\s*card\s*,\s*targets/.test(src);
          if (!isLogv) return;
          var pl = args && args[0];
          var cd = args && args[1];
          var pid = null;
          try { pid = pl && pl.playerid != null ? pl.playerid : null; } catch (e) {}
          if (pid != null && typeof cd === "string" && cd && (lib.skill[cd] || /[^\x00-\x7f]/.test(cd))) {
            window.__ssPdSkillByPid = window.__ssPdSkillByPid || {};
            window.__ssPdSkillByPid[pid] = cd;
            window.__ssPdSkillAt = Date.now();
            window.__ssPdLastSkill = cd;
            window.__ssPdLastAt = Date.now();
            try {
              var nm = lib.translate && lib.translate[cd] ? lib.translate[cd] : (/[^\x00-\x7f]/.test(cd) ? cd : null);
              if (nm && window.ssRememberTitle) window.ssRememberTitle(nm, pid);
            } catch (e) {}
          }
        } catch (e) {}
      });
      window.__ssPdSkillTrackerAdded = true;
      return true;
    } catch (e) { return false; }
  };
  //●联机客机的事件链里没有技能事件，ssCompareTitle 取不到；由执行方（房主）先广播标题，
  //  客机在收到 $compare 广播前先收到标题，就能和单机一样显示技能名
  var takeCompareTitle = function (who) {
    //●统一走 ssTitleFor：客机队列 → 事件链 → 最近标题栈，和拆顺框用同一条路径，避免时有时无
    try {
      if (window.ssTitleFor) {
        var t0 = window.ssTitleFor(_status.event, null);
        if (t0) return t0;
      }
    } catch (e) {}
    try {
      var t1 = window.ssCompareTitle && window.ssCompareTitle(_status.event);
      if (t1) return t1;
    } catch (e) {}
    //●最后用房主广播过来的标题
    try {
      if (window.__ssPdRemoteTitle) {
        var rt = window.__ssPdRemoteTitle;
        window.__ssPdRemoteTitle = null;
        return rt;
      }
    } catch (e) {}
    return null;
  };
  var pushCompareTitle = function (title) {
    if (!title) return;
    try {
      if (game.online && game.servermode && typeof game.broadcast === "function") {
        game.broadcast(function (t) {
          try { window.__ssPdRemoteTitle = t; } catch (e) {}
        }, title);
      }
    } catch (e) {}
  };
  //●统一入口：不管是原型钩子还是实例钩子，都走这里
  var onCompare = function (player, card1, target, card2, title) {
    try {
      installResultHooks();
      var who = null;
      try {
        who = get.itemtype(target) === "player" && target !== player ? target : null;
      } catch (e) {}
      buildBox(player, card1, [{ who: who || { name: "牌堆" }, card: card2 }], title);
    } catch (e) {}
  };
  var onCompareMulti = function (player, card1, targets, cards, title) {
    try {
      installResultHooks();
      var sides = [];
      for (var i = 0; i < targets.length; i++) sides.push({ who: targets[i], card: cards[i] });
      buildBox(player, card1, sides, title);
    } catch (e) {}
  };

  //●兜底：某些版本 ui.create.player 建实例时才拿到方法，直接在实例上拦一层
  //  （原型钩子已经生效时不重复包，否则会一次拼点算两次）
  var protoHooked = false;
  var hookInstance = function (p) {
    try {
      if (!p || p.__ssPdGuestInst) return p;
      var own = Object.prototype.hasOwnProperty.call(p, "$compare");
      if (!protoHooked || own) {
        if (typeof p.$compare === "function") {
          var ic = p.$compare;
          p.$compare = function (card1, target, card2) {
            var t = takeCompareTitle(this);
            pushCompareTitle(t);
            var ret = ic.apply(this, arguments);
            onCompare(this, card1, target, card2, t);
            return ret;
          };
        }
      }
      var ownMulti = Object.prototype.hasOwnProperty.call(p, "$compareMultiple");
      if (!protoHooked || ownMulti) {
        if (typeof p.$compareMultiple === "function") {
          var icm = p.$compareMultiple;
          p.$compareMultiple = function (card1, targets, cards) {
            var t = takeCompareTitle(this);
            pushCompareTitle(t);
            var ret = icm.apply(this, arguments);
            onCompareMulti(this, card1, targets, cards, t);
            return ret;
          };
        }
      }
      p.__ssPdGuestInst = true;
    } catch (e) {}
    return p;
  };

  var installCompareHooks = function () {
    var proto = pdPlayerProto();
    var got = "";
    try {
      if (proto && typeof proto.$compare === "function" && !proto.__ssPdGuestCompare) {
        var origCompare = proto.$compare;
        proto.$compare = function (card1, target, card2) {
          var t = takeCompareTitle(this);
          pushCompareTitle(t);
          var ret = origCompare.apply(this, arguments);
          onCompare(this, card1, target, card2, t);
          return ret;
        };
        proto.__ssPdGuestCompare = true;
        got += "原型";
      }
      if (proto && typeof proto.$compareMultiple === "function" && !proto.__ssPdGuestCompareMulti) {
        var origCompareMulti = proto.$compareMultiple;
        proto.$compareMultiple = function (card1, targets, cards) {
          var t = takeCompareTitle(this);
          pushCompareTitle(t);
          var ret = origCompareMulti.apply(this, arguments);
          onCompareMulti(this, card1, targets, cards, t);
          return ret;
        };
        proto.__ssPdGuestCompareMulti = true;
        got += "多目标";
      }
    } catch (e) {}
    //●再给 ui.create.player 挂一层，实例方法被单独赋值时也能拦住
    try {
      if (typeof ui.create.player === "function" && !ui.create.player.__ssPdGuestPlayerHook) {
        var origCreatePlayer = ui.create.player;
        ui.create.player = function () {
          return hookInstance(origCreatePlayer.apply(this, arguments));
        };
        ui.create.player.__ssPdGuestPlayerHook = true;
        got += " 实例";
        //●已经建好的玩家也补一遍
        try {
          for (var i = 0; i < game.players.length; i++) hookInstance(game.players[i]);
          if (game.me) hookInstance(game.me);
        } catch (e) {}
      }
    } catch (e) {}
    try { installGuestSkillTracker(); } catch (e) {}
    if (got) {
      protoHooked = !!(proto && proto.__ssPdGuestCompare);
    }
    return !!got;
  };

  //●方法对象可能比扩展晚初始化：装不上就隔一会儿再装（最多约 30 秒）
  var pdHookTry = 0;
  if (!installCompareHooks()) {
    var pdHookIv = setInterval(function () {
      if (installCompareHooks() || ++pdHookTry > 60) clearInterval(pdHookIv);
    }, 500);
  }
  //●ws.onmessage 的“未就绪”重试统一由 extension.js 的消息入口负责，这里只注册一次
  installGuestSkillTracker();
  installResultHooks();
});
}
