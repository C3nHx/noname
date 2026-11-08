import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { holdConfirm, releaseConfirm, initConfirmGuard } from "./confirmGuard.js";

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

const NS = "__ssPoxi";
const TITLE_GRAD =
	"linear-gradient(#C8BEB4 1%,#FCF8CC 12%,#F3F0BE,#FEF5A8,#E1D275,#C9B173,#D6CB6F,#A99355,#AC9557,#A38A51,#A38A51,#B29983,#B19786,#B19786,#B19786,#9B8583),linear-gradient(to right,#FCF8CC,#AC9557)";
const NAME_SHADOW =
	"0 0 2px #453325,0 0 2px #453325,0 0 2px #453325,0 0 2px #453325,0 0 2px #453325,0 0 2px #453325,0 0 2px #453325,0 0 2px #453325,0 0 2px #453325,0 0 2px #453325";

function node() {
	if (!window[NS]) window[NS] = {};
	return window[NS];
}

node().img = function (file) {
	return lib.assetURL + "extension/自用美化/image/" + file;
};

node().css = function () {
	if (document.getElementById("ss-poxi-css")) return;
	const I = window[NS].img;
	const st = document.createElement("style");
	st.id = "ss-poxi-css";
	st.textContent = [
		"#ss-poxi{position:absolute !important;left:calc(50% - 651.5px) !important;right:auto !important;top:65px !important;bottom:auto !important;width:1303px !important;height:calc(138px + 2 * (var(--ss-ch,106px) + 4px)) !important;max-width:none !important;margin:0 !important;padding:0 !important;transform:none !important;display:block !important;z-index:60 !important;pointer-events:auto !important;background-image:url('" + I("scdialog.png") + "') !important;background-size:100% 100% !important;background-position:top center !important;background-repeat:no-repeat !important;background-color:transparent !important;border:none !important;box-shadow:none !important;text-align:center !important;overflow:visible !important;animation:none !important;-webkit-animation:none !important;transition:none !important;}",
		"#ss-poxi>.ss-wrap{position:absolute !important;left:50% !important;top:0 !important;width:100% !important;height:100% !important;transform:translateX(-50%) !important;margin:0 !important;padding:0 !important;display:block !important;pointer-events:none !important;}",
		"#ss-poxi,#ss-poxi *{animation:none !important;-webkit-animation:none !important;transition:none !important;}",
		"body.ss-poxi-open #jindutiaopl,body.ss-poxi-open #progresspl,body.ss-poxi-open #dui-progress,body.ss-poxi-open .jindutiaopl{display:none !important;}",
		"body.ss-poxi-open #ui-confirm,body.ss-poxi-open .newconfirm1{display:none !important;}",
		"body.ss-poxi-open .lbtn-controls,body.ss-poxi-open .lbtn-control,body.ss-poxi-open .lbtn-paixu,body.ss-poxi-open .lbtn-paixu1,body.ss-poxi-open .latn-jilu,body.ss-poxi-open .latn-jilu1,body.ss-poxi-open .jiluButton,body.ss-poxi-open .jiluButton_new,body.ss-poxi-open .jiluButton_new1,body.ss-poxi-open .settingButton,body.ss-poxi-open .buttonyjcm,body.ss-poxi-open .tuoguanButton{z-index:9999 !important;}",
		/*●去掉高度过渡动画：首次显示时 --ss-ch 还没测出来会用兜底值，实测后高度变化会被 0.3s 过渡演成「先很低再拉高」*/
		/*●兜底值统一用卡牌实际高度 106px（不是底部留白 138px），首帧就接近最终高度，不会出现明显跳变*/
		"#ss-poxi{transition:none !important;}",
		/*●魄袭框卡牌统一缩放到 70%；--ss-ch 由 fit() 实测缩放后的高度，卡槽同步变小*/
		"#ss-poxi{--ss-card-zoom:0.7;}",
		"#ss-poxi .card{zoom:var(--ss-card-zoom,1) !important;}",
		"#ss-poxi>.ss-wrap>.ss-title{position:absolute !important;left:0 !important;right:0 !important;top:2px !important;height:46px !important;display:flex !important;justify-content:center !important;align-items:center !important;text-align:center !important;background:" + TITLE_GRAD + " !important;border:none !important;font-family:HYZLSJ,shousha,xinwei !important;font-size:42px !important;font-weight:500 !important;line-height:1 !important;padding-left:3px !important;-webkit-text-stroke:0 !important;letter-spacing:3px !important;-webkit-background-clip:text !important;background-clip:text !important;-webkit-text-fill-color:transparent !important;color:transparent !important;text-shadow:none !important;z-index:20 !important;pointer-events:auto !important;}",
		"#ss-poxi>.ss-wrap>.ss-title img{width:30px !important;height:24px !important;margin-left:6px !important;margin-bottom:0 !important;cursor:pointer !important;pointer-events:auto !important;transition:transform 0.35s ease !important;-webkit-transition:transform 0.35s ease !important;}",
		"#ss-poxi>.ss-wrap>.ss-name{position:absolute !important;z-index:5 !important;background-image:url('" + I("cebian.png") + "') !important;background-size:100% 100% !important;background-repeat:no-repeat !important;height:calc(var(--ss-ch,106px) + 6px) !important;width:38px !important;writing-mode:tb-rl !important;white-space:nowrap !important;font-size:20px !important;font-size:clamp(12px, calc(var(--ss-ch,106px) * 0.19), 20px) !important;left:13% !important;color:#eddac3 !important;text-shadow:" + NAME_SHADOW + " !important;font-family:shousha,xinwei !important;justify-content:center !important;align-items:center !important;display:flex !important;pointer-events:none !important;}",
		"#ss-poxi>.ss-wrap>.ss-name.ss-top{top:54px !important;}",
		"#ss-poxi>.ss-wrap>.ss-name.ss-bottom{top:calc(54px + var(--ss-ch,106px) + 4px) !important;}",
		"#ss-poxi>.ss-wrap>.ss-area{position:absolute !important;z-index:6 !important;background-image:url('" + I("newarena1.png") + "') !important;background-size:100% 100% !important;background-repeat:no-repeat !important;left:17% !important;right:17% !important;width:auto !important;height:calc(var(--ss-ch,106px) + 4px) !important;display:block !important;border-radius:5px !important;overflow-x:visible !important;overflow-y:visible !important;}",
		"#ss-poxi>.ss-wrap>.ss-area.ss-top{top:56px !important;}",
		"#ss-poxi>.ss-wrap>.ss-area.ss-bottom{top:calc(56px + var(--ss-ch,106px) + 4px) !important;}",
		"#ss-poxi>.ss-wrap>.ss-area>.buttons{margin-top:-1px !important;margin-left:0 !important;width:auto !important;overflow-x:visible !important;display:flex !important;flex-wrap:nowrap !important;flex-direction:row !important;justify-content:flex-start !important;}",
		"#ss-poxi>.ss-wrap>.ss-area>.buttons>div.card{flex:0 0 auto !important;box-shadow:none !important;border:none !important;background-color:transparent !important;}",
		"#ss-poxi>.ss-wrap>.ss-area>.buttons>div:not(:first-child){margin-left:-1.9px !important;}",
		"#ss-poxi>.ss-wrap>.ss-area>.buttons>div:last-child{margin-right:0 !important;}",
		"#ss-poxi>.ss-wrap>.ss-area>.buttons>div.card.ss-noclick{pointer-events:none !important;filter:brightness(0.72) grayscale(0.25) !important;-webkit-filter:brightness(0.72) grayscale(0.25) !important;}",
		"#ss-poxi>.ss-wrap>.ss-area>.buttons>div.card:not(.selectable):not(.selected):not(.ss-noclick){filter:none !important;-webkit-filter:none !important;}",
		"#ss-poxi>.ss-wrap>.ss-area>.buttons>div.card.selected{z-index:50 !important;position:relative !important;}",
		"#ss-poxi>.ss-wrap>.ss-bar{position:absolute !important;left:0 !important;right:0 !important;top:calc(56px + 2 * (var(--ss-ch,106px) + 4px)) !important;bottom:auto !important;height:50px !important;display:block !important;background:none !important;z-index:30 !important;pointer-events:none !important;}",
		"#ss-poxi>.ss-wrap>.ss-bar>.ss-ok{position:absolute !important;left:50% !important;top:50% !important;width:122px !important;height:47px !important;margin-left:-154px !important;margin-top:-24px !important;font-size:0 !important;line-height:0 !important;background-image:url('" + I("confirmButton.png") + "') !important;background-size:100% 100% !important;background-repeat:no-repeat !important;background-position:center !important;cursor:pointer !important;pointer-events:auto !important;z-index:31 !important;}",
		"#ss-poxi>.ss-wrap>.ss-bar>.ss-no{position:absolute !important;left:50% !important;top:50% !important;width:115px !important;height:40px !important;margin-left:40px !important;margin-top:-20px !important;font-size:0 !important;line-height:0 !important;background-image:url('" + I("cancel.png") + "') !important;background-size:100% 100% !important;background-repeat:no-repeat !important;background-position:center !important;cursor:pointer !important;pointer-events:auto !important;z-index:31 !important;}",
		"#ss-poxi>.ss-wrap>.ss-bar>.ss-ok.ss-disabled{pointer-events:none !important;filter:grayscale(1) brightness(0.85) !important;-webkit-filter:grayscale(1) brightness(0.85) !important;cursor:default !important;}",
		"#ss-poxi>.ss-wrap>.ss-bar>.ss-ok:active,#ss-poxi>.ss-wrap>.ss-bar>.ss-no:active{filter:brightness(1.8) !important;}",
		"#ss-poxi>.ss-wrap>.ss-timer{position:absolute !important;left:31% !important;right:31% !important;width:auto !important;height:8px !important;top:calc(56px + 2 * (var(--ss-ch,106px) + 4px) + 49px) !important;border-radius:1000px !important;background:rgba(0,0,0,.45) !important;box-shadow:0 0 9px #2e2b27 inset,0 0 2.1px #FFFFD5 !important;border:1.2px solid #000 !important;overflow:hidden !important;z-index:33 !important;pointer-events:none !important;}",
		"#ss-poxi>.ss-wrap>.ss-timer>.ss-fill{position:absolute !important;left:0 !important;top:0 !important;bottom:0 !important;height:auto !important;width:100% !important;background-image:linear-gradient(#fccc54 15%,#d01424 30%,#cc6953 90%) !important;}",
		"#ss-poxi>.ss-wrap>.ss-desc{position:absolute !important;left:17% !important;right:17% !important;top:calc(56px + 2 * (var(--ss-ch,106px) + 4px) + 59px) !important;height:22px !important;line-height:22px !important;white-space:nowrap !important;overflow:visible !important;text-align:center !important;font-size:15px !important;color:#f0e6d2 !important;font-family:shousha,xinwei !important;text-shadow:0 0 3px #000,0 1px 0 #000 !important;pointer-events:none !important;z-index:40 !important;}",
		"#ss-poxi.ss-folded{height:78px !important;min-height:78px !important;max-height:78px !important;background-size:100% auto !important;background-position:top center !important;background-repeat:no-repeat !important;animation:none !important;-webkit-animation:none !important;transition:none !important;}",
		"#ss-poxi.ss-folded>.ss-wrap>.ss-title{width:100% !important;left:0 !important;right:0 !important;transform:none !important;top:2px !important;height:46px !important;line-height:46px !important;}",
		"#ss-poxi.ss-folded .ss-title img{transform:scaleY(-1) !important;-webkit-transform:scaleY(-1) !important;}",
		"#ss-poxi.ss-folded>.ss-wrap>.ss-name,#ss-poxi.ss-folded>.ss-wrap>.ss-area,#ss-poxi.ss-folded>.ss-wrap>.ss-bar,#ss-poxi.ss-folded>.ss-wrap>.ss-desc{display:none !important;}",
		"#ss-poxi.ss-folded>.ss-wrap>.ss-timer{display:block !important;top:auto !important;bottom:6px !important;}",
	]
		.concat(
			window.decadeUI
				? []
				: [
					//●未安装十周年UI时花色点数是原生 .info 渲染的：原生只给了 top/right，没给 position，
					//  会跟着 #ss-poxi 的 text-align:center 跑到卡牌中间；这里只补 absolute 固定到右上角，字号沿用原生
					"#ss-poxi .card .info,#ss-poxi .card > .info{position:absolute !important;top:5px !important;left:auto !important;right:7px !important;}",
				]
		)
		.join("\n");
	(document.head || document.body).appendChild(st);
};

node().run = async function (event, player, kuiji) {
	const I = window[NS].img;
	const target = event.target;
	event.list1 = [];
	event.list2 = [];
	window[NS].css();
	const dlg = ui.create.dialog("hidden");
	dlg.id = "ss-poxi";
	event.dialog = dlg;
	try {
		if (!dlg.__ssConfirmHeld) {
			dlg.__ssConfirmHeld = true;
			holdConfirm();
		}
	} catch (e) {}
	try {
		dlg.classList.remove("scroll1");
		dlg.classList.remove("scroll2");
	} catch (e) {}
	const wrap = ui.create.div(".ss-wrap", dlg);
	const title = ui.create.div(".ss-title", wrap);
	title.innerHTML = (kuiji ? "窥机" : "魄袭") + "<img src='" + I("arrow.png") + "'>";
	const arrow = title.querySelector("img");
	if (arrow) {
		arrow.addEventListener("click", function (e) {
			e.stopPropagation();
			dlg.classList.toggle("ss-folded");
			try {
				fit();
			} catch (err) {}
		});
	}
	const desc = ui.create.div(".ss-desc", wrap);
	try {
		desc.innerHTML = kuiji
			? "弃你和他共4张不同花色的手牌"
			: "弃你和他共4张不同花色的手牌，按你的弃牌数执行不同效果";
	} catch (e) {}
	const tn = ui.create.div(".ss-name", wrap);
	tn.classList.add("ss-top");
	tn.innerText = get.translation(target.name);
	const mn = ui.create.div(".ss-name", wrap);
	mn.classList.add("ss-bottom");
	mn.innerText = get.translation(player.name);
	const ta = ui.create.div(".ss-area", wrap);
	ta.classList.add("ss-top");
	const ma = ui.create.div(".ss-area", wrap);
	ma.classList.add("ss-bottom");
	if (target.countCards("h") > 0) dlg.add(target.getCards("h"), "", "", ta);
	if (player.countCards("h") > 0) dlg.add(player.getCards("h"), "", "", ma);
	const _blockRight = function (e) {
		try {
			if (!dlg || !dlg.parentNode) return;
			const right = e && (e.type === "contextmenu" || e.button === 2 || e.which === 3);
			if (!right) return;
			const t = e.target;
			if (t && dlg.contains(t)) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		} catch (err) {}
	};
	const _unbindRight = function () {
		try {
			document.removeEventListener("contextmenu", _blockRight, true);
			document.removeEventListener("mousedown", _blockRight, true);
			document.removeEventListener("pointerdown", _blockRight, true);
		} catch (e) {}
	};
	try {
		document.addEventListener("contextmenu", _blockRight, true);
		document.addEventListener("mousedown", _blockRight, true);
		document.addEventListener("pointerdown", _blockRight, true);
	} catch (e) {}
	let closed = false;
	const fit = function () {
		try {
			if (closed) return;
			const folded = dlg.classList.contains("ss-folded");
			//●实测十周年UI渲染出来的卡牌高度，写入 --ss-ch：上下两个卡槽区、按钮栏、进度条、说明文字全部跟着卡牌大小走，
			//  这样卡牌不会再「大于卡槽」（卡牌大小本身仍由十周年UI决定，本扩展不设卡牌宽高）
			try {
				const _card = dlg.querySelector(".ss-area .buttons > .card") || dlg.querySelector(".ss-area .card");
				let _ch = 0;
				if (_card) {
					//●用 getBoundingClientRect 取实际渲染高度（包含卡牌自身的 zoom，0.7 缩放后约为 105），
					//  offsetHeight 在部分 WebView 里不含 zoom，会让卡槽按原尺寸排
					const _r = _card.getBoundingClientRect();
					let _sc = 1;
					try {
						const _dr = dlg.getBoundingClientRect();
						if (dlg.offsetWidth > 0 && _dr.width > 0) _sc = _dr.width / dlg.offsetWidth;
					} catch (e2) {}
					if (!_sc || !isFinite(_sc)) _sc = 1;
					_ch = Math.round((_r.height || 0) / _sc) || Math.round(_card.offsetHeight || 0);
				}
				if (_ch > 0) {
					if (dlg.__ssCh !== _ch) {
						dlg.__ssCh = _ch;
						dlg.style.setProperty("--ss-ch", _ch + "px");
					}
				}
			} catch (e) {}
			//●高度与拆顺框一致：两行卡槽 + 固定底部按钮区（138 = 上偏移 56 + 按钮区 50 + 底部留白 32）
			//●兜底卡牌高度用 106（实测值），不要用 138，否则首帧算出的高度偏大，实测后会被动画拉回正常
			const H = folded ? 78 : 138 + 2 * ((dlg.__ssCh || 106) + 4);
			dlg.style.setProperty("position", "absolute", "important");
			//●位置与拆顺框一致：宽度 1303、水平居中、top 65px
			dlg.style.setProperty("left", "calc(50% - 651.5px)", "important");
			dlg.style.setProperty("right", "auto", "important");
			//●折叠态统一位置：由 extension.js 的 --ss-fold-top 控制
			dlg.style.setProperty("top", folded ? "var(--ss-fold-top)" : "65px", "important");
			dlg.style.setProperty("bottom", "auto", "important");
			dlg.style.setProperty("width", "1303px", "important");
			dlg.style.setProperty("max-width", "none", "important");
			dlg.style.setProperty("margin", "0", "important");
			dlg.style.setProperty("height", H + "px", "important");
			dlg.style.setProperty("transform", "none", "important");
			//●不再给高度加过渡，避免首次显示时「高度由大变小」被动画放慢放大
			dlg.style.setProperty("transition", "none", "important");
			dlg.style.setProperty("animation", "none", "important");
			dlg.style.setProperty("-webkit-animation", "none", "important");
			dlg.style.setProperty("z-index", "60", "important");
			dlg.style.setProperty("pointer-events", "auto", "important");
			dlg.style.setProperty("background-image", "url('" + I("scdialog.png") + "')", "important");
			dlg.style.setProperty("background-size", folded ? "100% auto" : "100% 100%", "important");
			dlg.style.setProperty("background-position", "top center", "important");
			dlg.style.setProperty("background-repeat", "no-repeat", "important");
			dlg.style.setProperty("background-color", "transparent", "important");
			dlg.style.setProperty("border", "none", "important");
			dlg.style.setProperty("box-shadow", "none", "important");
			dlg.style.setProperty("overflow", "visible", "important");
			try {
				document.body.classList.add("ss-poxi-open");
			} catch (e) {}
			[ta, ma].forEach(function (a) {
				a.style.setProperty("pointer-events", "auto", "important");
				const btn = a.querySelector(".buttons");
				if (btn) {
					btn.style.setProperty("transform", "none", "important");
					btn.style.setProperty("max-width", "none", "important");
					btn.style.setProperty("overflow", "visible", "important");
					btn.style.setProperty("pointer-events", "auto", "important");
				}
			});
			try {
				wrap.style.setProperty("width", "100%", "important");
			} catch (e) {}
			try {
				[
					[tn, ta],
					[mn, ma],
				].forEach(function (pair) {
					const nm = pair[0];
					const ar2 = pair[1];
					if (!nm || !ar2) return;
					const at = ar2.offsetTop;
					const ah = ar2.offsetHeight;
					const nh = nm.offsetHeight;
					nm.style.setProperty("top", Math.round(at + (ah - nh) / 2) + "px", "important");
				});
			} catch (e) {}
			fixStack();
		} catch (e) {}
	};
	const next = player.chooseButton(4, dlg).set("newconfirm1", true);
	next.complexSelect = false;
	next.set("target", target);
	next.set("filterButton", function (button) {
		for (let i = 0; i < ui.selected.buttons.length; i++) {
			if (get.suit(button.link) === get.suit(ui.selected.buttons[i].link)) return false;
		}
		return true;
	});
	next.set("ai", function (button) {
		const p = _status.event.player;
		const t = _status.event.target;
		const ts = [];
		for (let i = 0; i < ui.selected.buttons.length; i++) {
			const c = ui.selected.buttons[i].link;
			if (t.getCards("h").indexOf(c) >= 0) ts.push(c);
		}
		const card = button.link;
		const val = get.value(card) || 1;
		if (get.owner(card) === t) {
			if (ts.length > 1) return 0;
			if (ts.length === 0 || p.hp > 3) return val;
			return 2 * val;
		}
		return 7 - val;
	});
	//●托管接管：破袭框隐藏了本体的确认/取消条，game.Check.confirm 又被 holdConfirm 置空，
	//  game.countChoose() 不会执行，_status.imchoosing 一直是 false；切换托管时 ui.click.auto
	//  既进不了 redo 分支，也没有 switchToAuto 可调，事件就一直挂在暂停里（表现为卡在破袭选牌页）。
	//  这里补上 switchToAuto，让 AI 直接按 next.ai 选牌，再走 ok/cancel。
	next.switchToAuto = function () {
		try {
			if (ui.confirm) ui.confirm.close();
		} catch (e) {}
		try {
			game.check();
		} catch (e) {}
		let picked = false;
		try {
			picked = ai.basic.chooseButton(next.ai);
		} catch (e) {}
		try {
			if ((picked || next.forced) && (!next.filterOk || next.filterOk())) {
				ui.click.ok();
			} else {
				ui.click.cancel();
			}
		} catch (e) {
			try {
				ui.click.cancel();
			} catch (e2) {}
		}
	};
	const bar = ui.create.div(".ss-bar", wrap);
	const ok = ui.create.div(".ss-ok", bar);
	const no = ui.create.div(".ss-no", bar);
	const timer = ui.create.div(".ss-timer", wrap);
	const fill = ui.create.div(".ss-fill", timer);
	ok.style.setProperty("pointer-events", "auto", "important");
	no.style.setProperty("pointer-events", "auto", "important");
	const evName = lib.config.touchscreen ? "touchend" : "click";
	ok.addEventListener(evName, function (e) {
		e.stopPropagation();
		if (ok.classList.contains("ss-disabled")) return;
		try {
			ui.click.ok();
		} catch (err) {}
	});
	no.addEventListener(evName, function (e) {
		e.stopPropagation();
		try {
			ui.click.cancel();
		} catch (err) {}
	});
	try {
		if (ui.confirm) ui.confirm.style.setProperty("display", "none", "important");
		const ctl = dlg.querySelectorAll(".control, .newconfirm1");
		for (let ci = 0; ci < ctl.length; ci++) ctl[ci].style.setProperty("display", "none", "important");
	} catch (e) {}
	const fixStack = function () {
		try {
			[ta, ma].forEach(function (a) {
				const btn = a.querySelector(".buttons");
				if (!btn) return;
				const cards = [];
				for (let i = 0; i < btn.children.length; i++) {
					const c = btn.children[i];
					if (c && c.classList && (c.classList.contains("card") || c.classList.contains("button"))) cards.push(c);
				}
				const n = cards.length;
				if (n < 1) return;
				const areaR = a.getBoundingClientRect();
				if (!areaR.width) return;
				const cwCss = cards[0].offsetWidth || 80;
				const cRect = cards[0].getBoundingClientRect();
				const cwVis = cRect.width || cwCss;
				const scale = cwCss ? cwVis / cwCss : 1;
				const target = areaR.width;
				if (n === 1 || n * cwVis + (n - 1) <= target) {
					for (let k = 0; k < cards.length; k++) {
						if (k === 0) cards[k].style.setProperty("margin-left", "0px", "important");
						else cards[k].style.removeProperty("margin-left");
						cards[k].style.removeProperty("margin-right");
					}
					return;
				}
				const m = (target - n * cwVis) / (n - 1) / (scale || 1);
				for (let j = 0; j < cards.length; j++) {
					cards[j].style.setProperty("margin-left", j === 0 ? "0px" : m + "px", "important");
					cards[j].style.setProperty("margin-right", "0px", "important");
				}
			});
		} catch (e) {}
	};
	const syncOk = function () {
		try {
			const s = {};
			for (let i = 0; i < ui.selected.buttons.length; i++) s[get.suit(ui.selected.buttons[i].link)] = 1;
			const ready = Object.keys(s).length >= 4;
			if (ready) {
				ok.classList.remove("ss-disabled");
				ok.style.setProperty("pointer-events", "auto", "important");
			} else {
				ok.classList.add("ss-disabled");
				ok.style.setProperty("pointer-events", "none", "important");
			}
			const list = dlg.querySelectorAll(".card");
			for (let i = 0; i < list.length; i++) {
				const c = list[i];
				if (c.classList.contains("selected")) {
					c.classList.remove("ss-noclick");
					continue;
				}
				c.classList.toggle("ss-noclick", !!s[get.suit(c.link)]);
			}
		} catch (e) {}
	};
	try {
		dlg.addEventListener(
			"click",
			function (e) {
				try {
					const t = e.target;
					const keep = t && t.closest && (t.closest(".card") || t.closest(".ss-bar") || t.closest(".ss-title"));
					if (!keep) e.stopPropagation();
				} catch (err) {}
				setTimeout(syncOk, 0);
			},
			false
		);
	} catch (e) {}
	syncOk();
	fit();
	setTimeout(fit, 60);
	setTimeout(fit, 200);
	setTimeout(fit, 500);
	setTimeout(fit, 1000);
	const total = ssProgressSeconds() * 1000;
	const t0 = Date.now();
	const iv = setInterval(function () {
		try {
			syncOk();
			if (!document.body.contains(dlg)) {
				closed = true;
				clearInterval(iv);
				try {
					document.body.classList.remove("ss-poxi-open");
				} catch (e) {}
				_unbindRight();
				try {
					if (dlg.__ssConfirmHeld) {
						dlg.__ssConfirmHeld = false;
						releaseConfirm();
					}
				} catch (e) {}
				return;
			}
			const pp = 1 - (Date.now() - t0) / total;
			fill.style.setProperty("width", Math.max(0, pp * 100) + "%", "important");
		} catch (e) {}
	}, 100);
	const result = await next.forResult();
	closed = true;
	clearInterval(iv);
	try {
		document.body.classList.remove("ss-poxi-open");
	} catch (e) {}
	_unbindRight();
	try {
		if (dlg) dlg.close();
	} catch (e) {}
	try {
		if (dlg.__ssConfirmHeld) {
			dlg.__ssConfirmHeld = false;
			releaseConfirm();
		}
	} catch (e) {}
	if (!result || !result.bool) return;
	const list = result.links || [];
	for (let i = 0; i < list.length; i++) {
		if (get.owner(list[i]) === player) event.list1.push(list[i]);
		else event.list2.push(list[i]);
	}
	if (event.list1.length && event.list2.length) {
		await game
			.loseAsync({
				lose_list: [
					[player, event.list1],
					[target, event.list2],
				],
				discarder: player,
			})
			.setContent("discardMultiple");
	} else if (event.list2.length) {
		await target.discard(event.list2);
	} else {
		await player.discard(event.list1);
	}
	if (!kuiji && event.list1.length + event.list2.length === 4) {
		if (event.list1.length === 0) player.loseMaxHp();
		if (event.list1.length === 1) {
			let evt = _status.event;
			for (let i = 0; i < 10; i++) {
				if (evt && evt.getParent) evt = evt.getParent();
				if (evt && evt.name === "phaseUse") {
					evt.skipped = true;
					break;
				}
			}
			player.addTempSkill("drlt_poxi1", { player: "phaseAfter" });
		}
		if (event.list1.length === 3) player.recover();
		if (event.list1.length === 4) player.draw(4);
	}
};

function applyOverride() {
	if (!lib.skill || !lib.skill.drlt_poxi) return;
	const _fn = function (event, trigger, player) {
		return window.__ssPoxi.run(event, player);
	};
	_fn.__ssPoxi = true;
	lib.skill.drlt_poxi.content = _fn;
	lib.skill.drlt_poxi.audio = 2;
	lib.skill.drlt_poxi.enable = "phaseUse";
	lib.skill.drlt_poxi.usable = 1;
	lib.skill.drlt_poxi.filterTarget = function (card, player, target) {
		return target !== player && target.countCards("h") > 0;
	};
	window.__ssPoxiApplied = true;
}

function applyKuiji() {
	if (!lib.skill || !lib.skill.scskuiji) return;
	const _fn = function (event, trigger, player) {
		return window.__ssPoxi.run(event, player, true);
	};
	_fn.__ssPoxi = true;
	lib.skill.scskuiji.content = _fn;
	window.__ssKuijiApplied = true;
}

export function poxiUI() {
	applyOverride();
	applyKuiji();
	initConfirmGuard();
	try {
		if (lib.arenaReady && typeof lib.arenaReady.push === "function") {
			lib.arenaReady.push(applyOverride);
			lib.arenaReady.push(applyKuiji);
		}
	} catch (e) {}
	try {
		if (!window.__ssPoxiGuard) {
			window.__ssPoxiGuard = setInterval(function () {
				try {
					if (lib.skill && lib.skill.drlt_poxi) {
						const c = lib.skill.drlt_poxi.content;
						if (typeof c !== "function" || c.__ssPoxi !== true) applyOverride();
					}
				} catch (e) {}
				try {
					if (lib.skill && lib.skill.scskuiji) {
						const c = lib.skill.scskuiji.content;
						if (typeof c !== "function" || c.__ssPoxi !== true) applyKuiji();
					}
				} catch (e) {}
			}, 3000);
		}
	} catch (e) {}
}
