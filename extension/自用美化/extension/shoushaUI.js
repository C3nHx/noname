import { lib, game, ui, get, ai, _status } from "../../../noname.js";

export function shoushaUI() {
	if (lib.config.extension_自用美化_confirmGlow !== false && !document.getElementById("ss-global-css")) {
		try {
			const _gs = document.createElement("style");
			_gs.id = "ss-global-css";
			_gs.textContent =
				".ss-confirm-ok:active,.ss-confirm-cancel:active," +
				".dialog-confirm-button-ok:active,.dialog-confirm-button-cancel:active," +
				".control.skill-sbkanpo:active," +
				".recasting-btn:active," +
				".combo-control .primary:active,.combo-control .primary2:active," +
				".lbtn-confirm .primary:active,.lbtn-confirm .primary2:active," +
				".newconfirm1 .primary:active,.newconfirm1 .primary2:active" +
				"{filter:brightness(1.8) !important;-webkit-filter:brightness(1.8) !important;}";
			document.head.appendChild(_gs);
		} catch (e) {}
	}
	game.broadcastAll(function (extensionName) {
		let obutton = ui.create.button,
			oadd = lib.element.dialog.add,
			ocheck = game.check,
			ouncheck = game.uncheck,
			width = Math.min(document.body.offsetWidth, 1080),
			pathImg = lib.assetURL + "extension/" + extensionName + "/image",
			style = document.createElement("style");
		if (ui._shoushaButtonCSSStyle) ui._shoushaButtonCSSStyle.remove();
		style.innerHTML = `
			.card[data-vcard = true].unselectable
			, .card[data-vcard = true]:not(.selectable)
			, .control.unclickable
			, .dialog-confirm > .unclickable
			, .yzk-rehuashen-skill-list > .yzk-rehuashen-skill-button:not(.yzk-un-active):active::before
			, .yzk-rehuashen-skill-list > .yzk-rehuashen-skill-button.yzk-unselectable-skill::before {
				pointer-events: none !important;
				filter: grayscale(1);
				-webkit-filter: grayscale(1)
			}
			.card[data-vcard = true].unselectable
			, .card[data-vcard = true]:not(.selectable) {
				opacity: 1 !important
			}
			.card[data-vitural-card = true]
			, .card.vituralCard {
				opacity: 1 !important
			}
			.button.card[data-vcard = true]::before
			, .rehuashen .button.character::before {
				border: none;
				background-image: none
			}
			.button.card[data-vcard = true]::after
			, .rehuashen .button.character::after {
				box-shadow: none !important
			}
			.button.card[data-vcard = true] > .vcard-selected-border {
				position: absolute;
				left: -8%;
				top: -21%;
				width: 116%;
				height: 130%;
				background: url(${pathImg}/shoushaUI/game_button_light.png) 0 0 / 100% 100%;
				opacity: 0
			}
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button.card[data-vcard = true] > .vcard-selected-border,
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button.card[data-vcard = true].selected > .vcard-selected-border {
				display: none !important;
				opacity: 0 !important
			}
			.button.card[data-vcard = true].selected > .vcard-selected-border {
				opacity: 1
			}
			.button.card[data-vcard = true] {
				margin: .1%;
				/*●印牌框每张牌大小：1 = 十周年UI原生大小，1.1 = 放大 10%，布局为3×3，0.92布局为4×3，0.8布局为4×4*/
				zoom: 0.92/*●*/
			}
			/*●兜底：极少数情况下牌不是走本扩展生成时，也按统一大小显示*/
			body .buttons > .card[data-vcard = true] {
				zoom: 0.92/*●*/ !important;
				margin: 0 !important
			}

			.dialog-confirm {
				display: flex;
				justify-content: center;
				position: absolute !important;
				width: 100%;
				bottom: ${window.decadeUI ? 16 : 3}%;
				left: -6.5%;
				margin: 0 !important;
				z-index: 100
			}
			.dialog-confirm.yzk-no-time {
				bottom: ${window.decadeUI ? 15 : 5}%
			}
			/*●印牌框打开时屏蔽本体（全局）确认/取消条，只保留框内自绘的 .dialog-confirm*/
			body.ss-yinpai-open #ui-confirm,
			body.ss-yinpai-open .newconfirm1 {
				display: none !important
			}
			.yzk-shoushaButtonNoNatureSha .dialog-confirm {
				bottom: 14%
			}
			.dialog-confirm-button-ok, .dialog-confirm-button-cancel {
				width: ${width / 100 * 9.5}px;
				height: ${width / 100 * 3.8}px;
				background: url(${pathImg}/confirmButton.png) 0 0 / 100% 100%
			}
			.dialog-confirm-button-ok.yzk-no-cancel {
				right: 38%
			}
			.dialog-confirm-button-cancel {
				position: absolute;
				right: 32%;
				background-image: url(${pathImg}/cancel.png);
			}
			.yzk-shoushaButtonDialogVertical .dialog-basic {
				width: ${width / 100 * 14}px !important
			}
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button .caption {
				display: flex;
				justify-content: flex-end;
				align-items: center;
				position: absolute;
				left: 6%;
				top: 50%;
				width: 30%;
				height: 26%;
				text-align: right;
				background: url(${pathImg}/shoushaUI/count_back.png) 0 0 / 100% 100%;
				padding: 0 6px 1px 0
			}
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button .caption * {
				color: white;
				font-size: 10px !important
			}
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button:not(.selected) .caption {
				display: none
			}
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button.selected .caption {
				display: flex !important;
				justify-content: flex-end;
				align-items: center;
				position: absolute;
				left: 6%;
				top: 50%;
				width: 30%;
				height: 26%;
				text-align: right;
				color: white;
				font-size: 10px !important;
				background: url(${pathImg}/shoushaUI/count_back.png) 0 0 / 100% 100% !important;
				padding: 0 6px 1px 0
			}
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .button:active {
				filter: brightness(var(--num));
				-webkit-filter: brightness(var(--num));
				--num: 1.8
			}
			.skill-sbkanpo.control.disabled {
				opacity: 0 !important
			}
			.skill-sbkanpo.control {
				display: flex;
				justify-content: center;
				align-items: center;
				background: url(${pathImg}/shoushaUI/confirm-bg-c.png) 0 0 / 100% 100%;
				box-shadow: none !important;
				padding: 5px 24px;
				margin: 1% 0 0 11% !important;
				z-index: 99999 !important
			}
			.yzk-shoushaButtonNoNatureSha.skill-sbkanpo .dialog-confirm {
				bottom: 96px !important;
				z-index: 20 !important
			}
			.rehuashen .button.character.selected,
.rehuashen .button.character.yzk-rehuashen-selected {
    transform: scale(1.2);
    z-index: 160
}
			.rehuashen .button.character {
				zoom: ${window.decadeUI ? 1.3 : 1.8}
			}
			.rehuashen.yzk-big-card .button.character {
    zoom: ${window.decadeUI ? 1.6 : 2.0}
}
			.rehuashen .buttons {
				white-space: nowrap;
				overflow: auto
			}
			.rehuashen .button.character > .replaceButton {
				display: none !important
			}
			.rehuashen .buttons * {
				white-space: normal
			}
			.rehuashen .button.character > .yzk-rehuashen-skill-list {
    display: none;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 100%;
    width: auto;
    max-width: 100%;
    height: 42px;
    white-space: nowrap;
    gap: 4px;
    justify-content: center;
    align-items: center;
    z-index: 200
}
			.rehuashen .button.character.yzk-rehuashen-selected > .yzk-rehuashen-skill-list,
			.rehuashen .button.character.selected > .yzk-rehuashen-skill-list {
				display: flex !important
			}
			.yzk-rehuashen-skill-info-container {
				width: 300px;
				height: auto;
				background-size: none;
				transition: none;
				border-width: 15px 25px 30px 25px;
				border-style: solid;
				border-color: transparent;
				border-image-source: url(${pathImg}/zuoci/teammate_card_bg.png);
				border-image-slice: 15 25 30 25 fill;
				border-image-repeat: stretch;
				z-index: 150;
				text-align: left;
			}
			.yzk-rehuashen-skill-info {
				display: inline-flex;
				align-items: center;
				flex-direction: column;
				position: relative;
				width: 300px;
				z-index: 70
			}
			.yzk-rehuashen-skill-info > * {
				display: block;
				position: relative;
				width: 100%;
				font-family: shousha;
				font-size: 14px;
				font-weight: 200;
			}
			.rehuashen .button.character > .yzk-rehuashen-skill-info-container {
				display: none
			}
			.yzk-rehuashen-skill-list > .yzk-rehuashen-skill-button {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    position: relative;
    min-width: 40px;
    height: 100%;
    padding: 0;
    margin: 0
}
			.yzk-rehuashen-skill-list > .yzk-rehuashen-skill-button > div,
.yzk-rehuashen-skill-list > .yzk-rehuashen-skill-button > .skillitem > div {
    font-family: shousha, 'HYZLSJ', xinwei, sans-serif !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #f5d76e !important;
    -webkit-text-fill-color: #f5d76e !important;
    text-shadow:
        0 0 2px rgba(0, 0, 0, 0.7),
        0 0 1px rgba(0, 0, 0, 0.9) !important;
    -webkit-text-stroke: 0.4px rgba(0, 0, 0, 0.6) !important;
    paint-order: stroke fill;
    white-space: nowrap;
    background: none !important;
    -webkit-background-clip: initial !important;
    background-clip: initial !important;
    line-height: 1.15;
}
			.yzk-rehuashen-skill-list > .yzk-rehuashen-skill-button::before {
				content: '';
				position: absolute;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				background: url(${pathImg}/zuoci/skill_btn.png) 0 0 / 100% 100%
			}
			.yzk-rehuashen-skill-button.yzk-selected-skill {
				filter: var(--filter);
				-webkit-filter: var(--filter);
				--filter: drop-shadow(0 0 3px red)
			}
			.yzk-huashen-card-container {
				display: flex;
				justify-content: center;
				position: absolute;
				pointer-events: none !important;
				left: 0;
				top: 25%;
				width: 100%;
				animation: yzk-hidden .5s 1.2s forwards;
				z-index: 200
			}
			.yzk-huashen-card-container > * {
				position: relative;
				width: 100px;
				height: 160px;
				transition: none;
				animation: yzk-huashen-card 1s forwards
			}
			.refuhan .button.character {
				margin: 0 1%
			}
			.refuhan .button.character > .yzk-character-border {
				position: absolute;
				left: -7.5%;
				top: -16%;
				width: 115%;
				height: 120%;
				background: url(${pathImg}/shoushaUI/character_border.png) 0 0 / 100% 100%;
				opacity: 1 !important;
				z-index: -2000;
				zoom: 1.5
			}
			.refuhan .button.character > .yzk-rehuashen-skill-list {
				top: 105%
			}
			.yzk-guanxing-container {
				display: inline-flex;
				justify-content: center;
				align-items: center;
				width: 80%
			}
			.yzk-guanxing-container > *:first-child {
				display: inline-flex;
				justify-content: center;
				align-items: center;
				flex-direction: column;
				position: relative;
				height: calc(var(--h) + 10px);
				width: 5%;
				font-size: 22px;
				font-family: 'HYZLSJ', shousha;
				background: url(${pathImg}/name.png) 0 0 / 100% 100%;
				margin: .2% 1% 0 0
			}
			.yzk-guanxing-container > *:last-child {
				display: inline-flex;
				justify-content: safe center;
				align-items: center;
				position: relative;
				min-height: calc(var(--h) + 30px);
				width: 92%;
				overflow-x: auto;
				overflow-y: visible
			}
			.yzk-guanxing-container > *:last-child::-webkit-scrollbar {
				display: block;
				height: 12px
			}
			.yzk-guanxing-container > *:last-child::-webkit-scrollbar-track {
				background: hsl(30, 14%, 23%);
				border-radius: 8px
			}
			.yzk-guanxing-container > *:last-child::-webkit-scrollbar-thumb {
				background: hsl(20, 14%, 17%);
				border-radius: 8px
			}
			.yzk-guanxing-container > *:last-child > * {
				flex-shrink: 0;
				margin: 0 .5%
			}
			.yzk-guanxing-container > *:last-child .yzk-guanxing-card-back {
				position: relative;
				width: var(--w);
				height: var(--h);
				background: url(${pathImg}/compareCard.png) 0 0 / 100% 100%
			}
			.yzk-guanxing-container > *:last-child > *:not(.yzk-guanxing-card-back) {
				position: absolute;
				z-index: 10
			}
			.yzk-guanxing-container > *:last-child > .yzk-guanxing-chang-card:not(.yzk-guanxing-card-back) {
				z-index: 20
			}
			.dialog-basic, .dialog-trick, .dialog-delay {
				display: flex;
				justify-content: center;
				align-items: flex-start;
				flex-wrap: wrap;
				position: relative;
				height: 100%;
				overflow: auto
			}
			.dialog-basic {
				width: ${width / 100 * 26}px !important
			}
			.yzk-shoushaButtonDialogVertical .dialog-trick {
				width: ${width / 100 * 36}px !important
			}
			.dialog-trick {
				width: ${width / 100 * 46}px !important
			}
			.dialog-delay {
				width: ${width / 100 * 14}px !important
			}
			@keyframes yzk-huashen-card {
				to { margin-top: 26% }
			}
			@keyframes yzk-hidden {
				to { opacity: 0 }
			}
.rehuashen .dialog .caption,
.rehuashen .dialog .caption *,
.rehuashen .button.character .caption,
.rehuashen .button.character .caption *,
.rehuashen .yzk-rehuashen-skill-info,
.rehuashen .yzk-rehuashen-skill-info *,
.rehuashen .button.character .skillitem,
.rehuashen .button.character .skillitem * {
    font-family: shousha, xinwei !important;
    color: #f5d76e !important;
    -webkit-text-fill-color: #f5d76e !important;
    -webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.85) !important;
    paint-order: stroke fill;
    text-shadow:
        0 0 2px rgba(0, 0, 0, 0.8),
        0 0 1px rgba(0, 0, 0, 0.9) !important;
}
	/*●卡牌大小（zoom）已统一收敛到 css/shunshou.css 的 #shunshouDialog .card 一处，
	   这里不再重复定义 --ss-card-zoom / .card{zoom}，避免和 CSS 互相覆盖导致点击后尺寸抖动。
	   魄袭框的卡牌缩放见 extension/poxiUI.js。*/
	/*●拆顺框的卡槽/区域不再写死 px，改为跟随 JS 实测卡牌后写入的 --ss-cw/--ss-ch 自适应
	   （见 extension/shunshou.js 的 __ssSyncCardVars）；魄袭框见 extension/poxiUI.js*/
	#window #shunshouDialog .eAreaCard,
	#window #shunshouDialog .jAreaCard {
		width: calc(var(--ss-cw, 76px) + 2px) !important;
		height: calc(var(--ss-ch, 106px) + 2px) !important;
	}
	#window #shunshouDialog .eAreaCard > .buttons,
	#window #shunshouDialog .jAreaCard > .buttons {
		width: var(--ss-cw, 76px) !important;
		height: var(--ss-ch, 106px) !important;
	}
	#window #shunshouDialog .hArea,
	#window #shunshouDialog .eArea,
	#window #shunshouDialog .jArea {
		height: calc(var(--ss-ch, 106px) + 4px) !important;
	}
	/*●已移除各美化窗口的花色点数统一规则，改用十周年UI渲染*/
		`;
		document.head.appendChild(style);
		ui._shoushaButtonCSSStyle = style;

		//●第15条：本包装可能因扩展重载/与其它扩展重复 patch 而再次执行，已是本扩展的包装就不再包一层
		game.check = game.check.__ssShoushaCheck ? game.check : function (...args) {
			let ok = ocheck.apply(this, args),
				card,
				evt = args[0] || _status.event,
				select = get.select(evt.selectCard);
			//●美化逻辑整段隔离：出错只丢美化，不影响本体的选牌流程
			try {
			if (_status.event.skill && typeof get.info(_status.event.skill).viewAs == "function") {
				card = ui.selected.cards.length ? get.card(true) : false;
			} else card = get.card(true);
			var _ssShunshouDlg = !!document.getElementById("shunshouDialog");
			var _ssBlockRecreate = ui._ss_shunshouEvt && ui._ss_shunshouEvt === _status.event && !_ssShunshouDlg;
			if (evt && evt.isMine() && card && (card.isCard || select[0] == -1) && !_ssBlockRecreate && (!ui._temp_vituralCard || !ui._temp_vituralCard[evt.player.playerid])) {
				if (_ssShunshouDlg) ui._ss_shunshouEvt = _status.event;
				let cards = (() => evt.player.getCards(evt.position).filter(card => !card.classList.contains("unselectable")))();
				card = ui.create.card(null, "noclick").init(get.autoViewAs(card, select[0] == -1 && cards));
				if (!ui._temp_vituralCard) ui._temp_vituralCard = {};
				ui._temp_vituralCard[evt.player.playerid] = card;
				if (select[0] == -1) {
					cards.forEach(card => {
						card.updateTransform(false, 550);
						card.classList.remove("selected");
						card.classList.add("unselectable");
					});
					//●onuncheck 可能是第三方塞的非函数值，只有函数才包装后调用
					if (typeof evt.onuncheck == "function") {
						let original = evt.onuncheck;
						evt.onuncheck = function () {
							cards.forEach(card => card.classList.remove("unselectable"));
							return original.apply(this, arguments);
						};
					} else
						evt.onuncheck = function () {
							cards.forEach(card => card.classList.remove("unselectable"));
						};
				} else {
					if (window.decadeUI) {
						card.dataset.virtualCard = true;
						card.virtualMark = ui.create.div(".virtualMark", card);
					} else {
						card.suit = "虚拟";
						card.init(card);
					}
				}
				card._transform = " ";
				evt.player.directgains([card]);
				card.classList.add("vituralCard", "selectable", "selected");
				card.updateTransform(true, 550);
			}
			try {
				if (evt && evt.dialog && evt.dialog._confirm && !evt.noconfirm) {
					evt.set("noconfirm", true);
					evt.set("customConfirm", ui.click._shoushaConfirm);
				}
			} catch (e) {}
			if (evt.noconfirm && ui.confirm) {
				try {
					let guarded = false;
					const ids = ["shunshouDialog"];
					for (let i = 0; i < ids.length; i++) {
						const el = document.getElementById(ids[i]);
						if (el && el.isConnected && getComputedStyle(el).display !== "none" && el.getClientRects().length) {
							guarded = true;
							break;
						}
					}
					if (!guarded) {
						ui.confirm.close();
						delete ui.confirm;
					}
				} catch (e) {}
			}
			try {
				let _p = null;
				try {
					const _se = _status.event;
					_p = _se && typeof _se.getParent === "function" ? _se.getParent() : null;
				} catch (e) {}
				if (!_p && evt && typeof evt.getParent === "function") _p = evt.getParent();
				const _pn = _p ? String(_p.name || "") + "|" + String(_p.skill || "") : "";
				const _pp = String((_status.event && _status.event.prompt) || "");
				if (/sb_?kanpo/i.test(_pn) || /看破/.test(_pn) || /看破/.test(_pp)) {
					const _ctl = _p ? _p.controls : null;
					evt._yzk_shoushaButtonDialogNoNatureSha = true;
					evt._yzk_shoushaButtonDialogVertical = true;
					try {
						_status.event._yzk_shoushaButtonDialogNoNatureSha = true;
						_status.event._yzk_shoushaButtonDialogVertical = true;
					} catch (e) {}
					if (_ctl && _ctl[0]) {
						_ctl[0].innerHTML = '<img width = 120 height = 40 src = "' + lib.assetURL + "extension/自用美化/image/shoushaUI/game_skill_reset.png\">";
						_ctl[0].classList.add("skill-sbkanpo");
					}
				}
			} catch (e) {}
			if (evt.noconfirm && evt.customConfirm) evt.customConfirm(ok, evt);
			//●oncheck/onuncheck 不是本体钩子，第三方扩展可能塞了非函数值，直接调用会 TypeError
			if (typeof evt.oncheck == "function") evt.oncheck(evt);
			try {
				const _ssDlgK = document.getElementById("shunshouDialog");
				if (_ssDlgK && _ssDlgK._ssKanpo) ssLookControl(_ssDlgK);
			} catch (e) {}
			} catch (e) { if (window.__ssDebug) console.warn("[自用美化] game.check 美化逻辑异常", e); }
			return ok;
		};
		game.check.__ssShoushaCheck = true;
		game.uncheck = game.uncheck.__ssShoushaUncheck ? game.uncheck : function (...args) {
			let result = ouncheck.apply(this, args);
			//●美化逻辑整段隔离：出错只丢美化，不影响本体
			try {
			if (ui._temp_vituralCard) {
				for (let id in ui._temp_vituralCard) {
					let player = (lib.playerOL || game.playerMap)[id];
					ui._temp_vituralCard[id].remove();
					if (player) player.update();
					if (player == game.me) ui.updatehl();
				}
				delete ui._temp_vituralCard;
			}
			if (_status.event && typeof _status.event.onuncheck == "function") _status.event.onuncheck(_status.event);
			} catch (e) { if (window.__ssDebug) console.warn("[自用美化] game.uncheck 美化逻辑异常", e); }
			return result;
		};
		game.uncheck.__ssShoushaUncheck = true;
		ui.click._shoushaConfirm = (ok, event) => {
			let confirm = event && event.dialog && event.dialog._confirm;
			if (!confirm) return;
			if (event.forceAuto) confirm.ok.hide();
			else confirm.ok.show();
			if (ok && (!event.filterOk || event.filterOk())) confirm.ok.classList.remove("unclickable");
			else confirm.ok.classList.add("unclickable");
			if (!event.forced && !event.fakeforce) {
				confirm.cancel.show();
				confirm.ok.classList.remove("yzk-no-cancel");
			} else {
				confirm.cancel.hide();
				confirm.ok.classList.add("yzk-no-cancel");
			}
		};
		Object.assign(ui.create, {
			_shoushaConfirm: function (dialog, evt) {
				if (dialog) {
					let confirm = dialog._confirm,
						time = document.querySelector("#jindutiaopl");
					if (!confirm) {
						confirm = ui.create.div(".dialog-confirm");
						confirm.ok = ui.create.div(".dialog-confirm-button-ok.unclickable", confirm, e => {
							e.stopImmediatePropagation();
							ui.click.ok();
						});
						confirm.cancel = ui.create.div(".dialog-confirm-button-cancel", confirm, () => ui.click.cancel());
					}
					if (!time) confirm.classList.add("yzk-no-time");
					dialog._confirm = confirm;
					dialog.appendChild(confirm);
				}
				if (evt) {
					evt.set("noconfirm", true);
					evt.set("customConfirm", ui.click._shoushaConfirm);
				}
				return dialog ? dialog._confirm : void 0;
			},
			_yzk_huashenDialog: function (id, cards, prompt, options) {
				if (!options) options = {};
				var dialog = ui.create.dialog(prompt || "化身", options.item || [cards, "character"]),
					skillBtn = [],
					skillInfo = [];
				dialog.videoId = id;
				dialog._skillButtons = skillBtn;
				for (var button of dialog.buttons || [])
    if (!options.noSkillList && !button._skillList && (options.filter ? options.filter(button) : true)) {
        if (!button._yzkLongPressBlocked) {
            button._yzkLongPressBlocked = true;
            ['mousedown', 'touchstart', 'contextmenu'].forEach(function (type) {
                button.addEventListener(type, function (e) {
                    e.stopImmediatePropagation();
                }, true);
            });
        }
        if (options.create && options.create.character) options.create.character(button);
						var list = (button._skillList = setScroll(ui.create.div(".yzk-rehuashen-skill-list", button)));
						if (options.create && options.create.list) options.create.list(list, button);
						var info = (button._skillInfo = ui.create.div(".yzk-rehuashen-skill-info", ui.create.div(".yzk-rehuashen-skill-info-container", button)));
						if (options.create && options.create.info) options.create.info(info);
						button.addEventListener("click", function (e) {
    var node = this._skillInfo.parentNode;
    if (options.infoFilter && options.infoFilter(node, this, e)) return;

    if (this._skillInfo._displaying) {
        this.appendChild(node);
        if (ui._yzk_rehuashen_skill_info) ui._yzk_rehuashen_skill_info.remove(node);
        delete this._skillInfo._displaying;
        return;
    }

    var dlg = _status.event.dialog || get.idDialog(dialog.videoId);
    if (dlg && dlg.buttons) {
        for (var other of dlg.buttons) {
            if (other === this) continue;
            if (other._skillInfo && other._skillInfo._displaying) {
                other.appendChild(other._skillInfo.parentNode);
                if (ui._yzk_rehuashen_skill_info) ui._yzk_rehuashen_skill_info.remove(other._skillInfo.parentNode);
                delete other._skillInfo._displaying;
            }
        }
    }

    ui.window.appendChild(node);
    if (e.touches && e.touches[0]) e = e.touches[0];
    if (e.clientX / game.documentZoom < ui.window.offsetWidth / 2) node.style.left = e.clientX / game.documentZoom + 10 + "px";
    else node.style.left = e.clientX / game.documentZoom - node.offsetWidth - 10 + "px";
    var idealtop = (e.clientY || 0) / game.documentZoom - node.offsetHeight / 2;
    if (typeof idealtop != "number" || isNaN(idealtop) || idealtop <= 5) idealtop = 5;
    else if (idealtop + node.offsetHeight + 10 > ui.window.offsetHeight) idealtop = ui.window.offsetHeight - 10 - node.offsetHeight;
    node.style.top = idealtop + "px";
    this._skillInfo._displaying = true;
    if (options.setDialog) options.setDialog(node);
    if (!ui._yzk_rehuashen_skill_info || !Array.isArray(ui._yzk_rehuashen_skill_info)) ui._yzk_rehuashen_skill_info = [];
    ui._yzk_rehuashen_skill_info.add(node);
});
						for (var skill of (options.map && options.map[button.link]) || get.character(button.link)[3]) {
							if (options.skillFilter && !options.skillFilter(skill)) continue;
							var name = get.translation(skill);
							var btn = ui.create.div(
								".yzk-rehuashen-skill-button.yzk-skill-" + skill,
								`<div>${name.slice(0, 2)}</div>`,
								list,
								function (e) {
									e && e.stopPropagation && e.stopPropagation();
									var result = {};
									if (options.callback) result = options.callback.call(this, e);
									if (result !== false && !result.noDefaultOut) {
										var charBtn = this.parentNode;
										while (charBtn && !charBtn.classList.contains("character")) charBtn = charBtn.parentNode;
										var dialogNode = this.closest ? this.closest(".dialog") : null;
										if (dialogNode && dialogNode._yzkResolve && charBtn && charBtn.link) {
											dialogNode._yzkResolve({
												card: charBtn.link,
												skill: this.link,
											});
										} else {
											if (charBtn) {
												var dlg = _status.event.dialog;
												if (dlg && dlg.buttons) for (var b of dlg.buttons) b.classList.remove("selected", "yzk-rehuashen-selected");
												ui.selected.buttons.length = 0;
												charBtn.classList.add("selected", "yzk-rehuashen-selected");
												ui.selected.buttons.push(charBtn);
											}
											ui.selected.cards.length = 0;
											ui.selected.cards.push(this);
											ui.click.ok();
										}
									}
									if (!result.notCloseInfo) {
										var dialog = _status.event.dialog;
										if (dialog && dialog.buttons)
											for (var button of dialog.buttons)
												if (button._skillInfo && button._skillInfo._displaying) button.appendChild(button._skillInfo.parentNode);
									}
									if (ui.confirm && !result.notClose) {
										ui.confirm.close();
										delete ui.confirm;
									}
									if (result.output) return result.output;
								}
							);
							var intro = ui.create.div(
    ".yzk-skill-" + skill,
    `<span style="color:#ffd700;font-weight:bold">${name}：</span><span>${get.translation(skill + "_info")}</span>`,
    info
);
							if (options.create && options.create.skill) options.create.skill(btn, skill);
							if (options.create && options.create.intro) options.create.list(intro, skill);
							skillBtn.push(btn);
							btn.link = skill;
							intro.link = skill;
							skillInfo.push(intro);
						}
					}
				dialog.classList.add("rehuashen");
				if (options.bigCard) dialog.classList.add("yzk-big-card");
				var buttons = dialog.querySelector(".buttons");
				if (buttons) {
					buttons.style.setProperty("max-width", document.body.offsetWidth / 100 * 80 + "px", "important");
					buttons.style.setProperty("height", document.body.offsetHeight / 100 * 50 + "px", "important");
					buttons.style.paddingTop = "0";
					setScroll(buttons);
				}
				dialog.style.setProperty("width", document.body.offsetWidth / 100 * 90 + "px", "important");
				dialog.style.setProperty("min-height", "55%", "important");
				dialog.style.setProperty("left", "4%", "important");
				dialog.style.setProperty("top", "10%", "important");
for (var b of dialog.buttons || []) {
    if (b.classList) {
        b.classList.remove("unselectable", "disabled", "grayout");
    }
    b.style.setProperty("opacity", "1", "important");
    b.style.setProperty("filter", "none", "important");
    b.style.setProperty("-webkit-filter", "none", "important");
    if (b.childNodes) {
        for (var c of b.childNodes) {
            if (c.style) {
                if (c.style.opacity && c.style.opacity !== "1") c.style.opacity = "1";
                if (c.style.filter && c.style.filter !== "none") c.style.filter = "none";
            }
        }
    }
}
				if (options.hide) dialog.style.display = "none";
				if (options.setDialog) options.setDialog(dialog);
				function setScroll(node) {
					node.addEventListener("wheel", e => {
						if (e.target != node) return;
						e.preventDefault();
						var delta = e.deltaY;
						node.scrollLeft -= -delta;
					});
					lib.setScroll(node);
					return node;
				}
				return dialog;
			},
		});

		const installShoushaButton = function () {
			const prevButton = ui.create.button;
			if (prevButton && prevButton._shoushaPatched) return;
			const patchedButton = function (...args) {
			if (patchedButton._inCall) return prevButton.apply(this, args);
			patchedButton._inCall = true;
			try {
			let _qmgj = false;
			if (args[1] === "vcard" || args[1] === "shousha") {
				try {
					let _qe = _status.event,
						_qd = 0;
					while (_qe && _qd < 10) {
						if (String(_qe.skill || "").indexOf("_qmgj_") === 0 || String(_qe.name || "").indexOf("_qmgj_") === 0) {
							_qmgj = true;
							break;
						}
						_qe = _qe.parent;
						_qd++;
					}
				} catch (e) {}
			}
			let node = prevButton.apply(this, args),
				evt = _status.event,
				bannedSkills = ["dcposuo"],
				onlyUsableSkills = ["sbwusheng_wusheng"],
				verticalSkills = ["sbwusheng_wusheng"];
			//●第15条：若底层（可能已被十周年UI包过）已经美化过这张牌，直接返回，避免重复美化
			if (node && node.__ssShoushaStyled) return node;
			if (
				!_qmgj &&
				(evt
					? ![
							evt.skill,
							evt.name,
							evt.result && evt.result.skill,
							evt.getParent().name,
							evt.getParent().skill,
							evt.getParent().result && evt.getParent().result.skill,
					  ].some(name => bannedSkills.map(skill => [skill, skill + "_backup"]).flat().includes(name))
					: true) &&
				/vcard|shousha/.test(args[1]) &&
				args[2] &&
				args[2].classList &&
				args[2].classList.contains("buttons") &&
				!args[2].classList.contains("noshousha") &&
				args[2].parentNode &&
				args[2].parentNode.classList.contains("content")
			) {
				let item = args[0];
				if (typeof item == "string") {
					if (!lib.card[item] || !lib.card[item].enable) return node;
					item = [get.type(item), "", item];
				}
				if (args[2].removeChild) args[2].removeChild(node);
				node = ui.create.card(args[2], "noclick", args[3]);
				node.init(item);
				node.link = item;
				node.classList.add("button", "vcard");
node.dataset.vcard = true;

				//●印牌框：每行 4 张 + 框高只显示 3 行，多出的上下滑动
				//  用绝对定位把牌区钉在对话框正中（十周年UI 的 .content 宽度塌陷，靠 CSS 居不了中）
				try {
					const _ypCols = 4; //●每行张数
					const _ypCardZoom = window.__ssYinpaiCardZoom || 0.92/*●*/; //●每张牌大小
					const _ypRows = 3; //●可见行数
					const _ypBtns = args[2];
					const _ypCard = node;
					_ypCard.style.setProperty("zoom", String(_ypCardZoom), "important");
					_ypCard.style.setProperty("margin", "3px 3.2px", "important");
					let _ypDlg = _ypBtns.parentNode;
					while (_ypDlg && _ypDlg.classList && !_ypDlg.classList.contains("dialog")) _ypDlg = _ypDlg.parentNode;
					if (_ypDlg && _ypDlg.id !== "shunshouDialog" && !_ypDlg.__ssYpFitted) {
						_ypDlg.__ssYpFitted = true;
						setTimeout(function () {
							try {
								const _h = _ypCard.offsetHeight;
								const _cw = _ypCard.offsetWidth;
								if (!_ypDlg.isConnected || !_h || _h < 20 || !_cw || _cw < 20) return;
								const _dr = _ypDlg.getBoundingClientRect();
								const _k = _dr.width / (_ypDlg.offsetWidth || 1) || 1;
								let _topSp = 110,
									_botSp = 90;
								try {
									const _capEl = _ypDlg.querySelector(".caption");
									if (_capEl) {
										const _b = (_capEl.getBoundingClientRect().bottom - _dr.top) / _k;
										if (_b > 20) _topSp = _b;
									}
								} catch (e) {}
								try {
									const _cf = _ypDlg.querySelector(".dialog-confirm");
									if (_cf) {
										const _ch = _cf.getBoundingClientRect().height / _k;
										if (_ch > 20) _botSp = _ch + 14;
									}
								} catch (e) {}
								const _gapX = 6;
								const _gridW = Math.round(_ypCols * _cw + (_ypCols - 1) * _gapX);
								const _gridH = Math.round(_h * _ypRows + 12);
								_ypBtns.style.setProperty("position", "absolute", "important");
								_ypBtns.style.setProperty("left", "50%", "important");
								_ypBtns.style.setProperty("transform", "translateX(-50%)", "important");
								_ypBtns.style.setProperty("top", Math.round(_topSp) + "px", "important");
								_ypBtns.style.setProperty("width", _gridW + "px", "important");
								_ypBtns.style.setProperty("max-height", _gridH + "px", "important");
								_ypBtns.style.setProperty("overflow-y", "auto", "important");
								_ypBtns.style.setProperty("overflow-x", "hidden", "important");
								_ypBtns.style.setProperty("display", "flex", "important");
								_ypBtns.style.setProperty("flex-wrap", "wrap", "important");
								_ypBtns.style.setProperty("justify-content", "center", "important");
								_ypBtns.style.setProperty("align-content", "flex-start", "important");
								_ypBtns.style.setProperty("box-sizing", "border-box", "important");
								const _H = Math.round(_topSp + _gridH + _botSp);
								_ypDlg.style.setProperty("height", _H + "px", "important");
								_ypDlg.style.setProperty("min-height", _H + "px", "important");
							} catch (e) {}
						}, 40);
					}
					_ypBtns.classList.add("ss-vcard-grid");
				} catch (e) {}
				//●印牌框整体放大：只改下面 window.__ssYinpaiScale 一个数（1 = 原大小，1.35 = 放大到 135%）
				try {
					let _ypDlg = args[2].parentNode;
					while (_ypDlg && _ypDlg.classList && !_ypDlg.classList.contains("dialog")) _ypDlg = _ypDlg.parentNode;
					if (_ypDlg && !_ypDlg.__ssYpScaled && _ypDlg.id !== "shunshouDialog") {
						_ypDlg.__ssYpScaled = true;
						const _ypS = window.__ssYinpaiScale || 1.35;
						_ypDlg.style.setProperty("transform", "scale(" + _ypS + ")", "important");
						_ypDlg.style.setProperty("transform-origin", "50% 50%", "important");
					}
				} catch (e) {}
				//●隐藏印牌卡上十周年UI自带的卡名层（白字/带锦囊底纹），只保留下面统一生成的原版黑字卡名
				if (!window.__ssVcardNameCss) {
					window.__ssVcardNameCss = true;
					const _st = document.createElement("style");
					//●给兜底底图统一加一层米白遮罩（::after），让裁剪卡图的色调更接近有 cardTitle 素材的卡
					//  想调深浅就改最后那个 0.45（0~1，越大越白）
					_st.innerHTML =
						".card.vcard > .temp-name,.card.vcard > .name,.card.vcard > .name.long{display:none !important;}" +
						//●印牌框只上下滑动：牌区（.ss-vcard-grid）横向溢出不滚动、直接裁掉，纵向超出可滑动
						".buttons.ss-vcard-grid{overflow-x:hidden !important;overflow-y:auto !important;flex-wrap:wrap !important;-webkit-overflow-scrolling:touch;}" +
						//●印牌框外层（.dialog-trick 等）也只上下滚动，避免整块框可以左右拖动
						".dialog-trick,.dialog-basic,.dialog-delay{overflow-x:hidden !important;overflow-y:auto !important;}" +
						'.card.vcard > .ss-art-layer::after{content:"";position:absolute;left:0;right:0;top:0;bottom:0;border-radius:inherit;background:rgba(233,222,190,0.45);pointer-events:none;}';
					document.head.appendChild(_st);
				}
				ui.create.div(".vcard-selected-border", node);
				if (!args[3]) node.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.button);
				node.addEventListener(lib.config.touchscreen ? "touchstart" : "mousedown", function () {
					setTimeout(function () {
						try {
							if (node.classList.contains("selected")) node._ssSelAt = Date.now();
						} catch (e) {}
					}, 0);
				}, true);
				node.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
					try {
						if (!node.classList.contains("selected")) return;
						if (node._ssSelAt && Date.now() - node._ssSelAt < 300) return;
						e.stopPropagation();
						e.preventDefault();
						node.classList.remove("selected");
						if (ui.selected && ui.selected.buttons) {
							for (let _i = ui.selected.buttons.length - 1; _i >= 0; _i--) {
								if (ui.selected.buttons[_i] === node) ui.selected.buttons.splice(_i, 1);
							}
						}
						const _cap = node.querySelector(".caption");
						if (_cap && _cap.parentNode) _cap.parentNode.removeChild(_cap);
						node._ssSelAt = 0;
						game.check();
					} catch (err) {}
				}, true);
				let name = {
					fire: "huo" + node.name,
					thunder: "lei" + node.name,
					stab: "ci" + node.name,
					ice: "bing" + node.name,
					poison: "du" + node.name,
					kami: "kami" + node.name,
				};
				for (let i in Object.keys(lib.element.button)) node[i] = lib.element.button[i];
				for (let key in node.node) {
					if (!window.decadeUI && /background|image/.test(key)) continue;
					if (node.node[key] && node.node[key].classList) node.node[key].classList.add("forcehide");
				}
				if (node.$name) node.$name.classList.add("forcehide");
				//●兜底底图图层：不管有没有 cardTitle 素材都先创建，垫在卡牌最底层作为「裁剪后的卡图」
				const _ensureArtLayer = function () {
					if (node._ssArtLayer) return node._ssArtLayer;
					const _l = document.createElement("div");
					_l.className = "ss-art-layer";
					_l.style.cssText = [
						"position:absolute",
						"left:3%",
						"right:4%",
						"top:1%",
						"bottom:16%",
						"border-radius:5px",
						"background-repeat:no-repeat",
						"background-position:50.2% 62.4%",
						"background-size:135.3% 418.4%",
						"z-index:1",
						"pointer-events:none",
					].join(";");
					node.insertBefore(_l, node.firstChild);
					node._ssArtLayer = _l;
					//●原卡图是铺满整张卡的，统一改由底层兜底图层显示，避免和素材层叠在一起显得更大
					try {
						const _b = window.decadeUI ? node : node.node.image;
						_b.style.setProperty("background-image", "none", "important");
					} catch (e) {}
					return _l;
				};
				//●素材图层：有 cardTitle 素材时盖在兜底底图上面（z-index 高于底图）
				const _ensureTitleLayer = function () {
					if (node._ssTitleLayer) return node._ssTitleLayer;
					const _l = document.createElement("div");
					_l.className = "ss-title-layer";
					_l.style.cssText = "position:absolute;left:0;right:0;top:0;bottom:0;background-repeat:no-repeat;background-size:100% 100%;z-index:3;pointer-events:none;";
					node.appendChild(_l);
					node._ssTitleLayer = _l;
					return _l;
				};
				const _setBaseArt = function (u) {
					if (!u) return;
					_ensureArtLayer().style.backgroundImage = 'url("' + u + '")';
				};
				let url = "extension/" + extensionName + "/image/shoushaUI/cardTitle/" + (name[node.nature] || (node.nature || "") + node.name) + ".png",
					img = new Image();
				img.node = node;
				img.altSrc = "extension/" + extensionName + "/image/shoushaUI/cardTitle/" + node.name + ".png";
				img.ourl = (node.node && node.node.image && node.node.image.style && node.node.image.style.backgroundImage) || "";
				img.ourl2 = node.style.backgroundImage;
				img.onload = function () {
					//●有 cardTitle 素材：画到素材层，底下仍然垫着「裁剪卡图」的兜底底图
					try {
						_ensureTitleLayer().style.backgroundImage = 'url("' + lib.assetURL + (this._altTried ? this.altSrc : url) + '")';
					} catch (e) {}
				};
				img.onerror = function () {
					let node = this.node;
					if (!this._altTried && this.altSrc && this.altSrc != url) {
						this._altTried = true;
						this.src = lib.assetURL + this.altSrc;
						return;
					}
					//●确认 cardTitle 里确实没有对应素材：用通用底板 zqnoname.png 盖在最上层
					//  底图（裁剪卡图）和它上面的颜色遮罩都不动，zqnoname.png 就放在原来素材层的同一层（z-index:3）
					try {
						_ensureTitleLayer().style.backgroundImage =
							'url("' + lib.assetURL + "extension/" + extensionName + "/image/shoushaUI/cardTitle/zqnoname.png" + '")';
					} catch (e) {}
					//●未装十周年UI时 node.node / node.node.image 可能不存在，卡图加载失败时直接解引用会 TypeError
					const _bgNode = window.decadeUI ? node : ((node && node.node && node.node.image) || null);
					const _ourl = this.ourl;
					const _cands = (function () {
						const _out = [];
						try {
							const _v = lib.config.extension_十周年UI_cardPrettify;
							if (_v && _v !== "off") {
								const _al = { bingkele: "decade", gold: "caise" };
								const _nm = node.name || "";
								const _dirs = _al[_v] && _al[_v] !== _v ? [_v, _al[_v]] : [_v];
								const _st = window.decadeUI && window.decadeUI.statics && window.decadeUI.statics.cards;
								if (_st) {
									for (let _i = 0; _i < _dirs.length; _i++) {
										const _s = _st[_dirs[_i]] && _st[_dirs[_i]][_nm] && _st[_dirs[_i]][_nm].url;
										if (_s) _out.push(_s.indexOf(lib.assetURL) === 0 ? _s.slice(lib.assetURL.length) : _s);
									}
								}
								const _exts = [_v === "online" ? "jpg" : _v === "caise" || _v === "gold" ? "webp" : "png", "webp", "png", "jpg"];
								for (let _i = 0; _i < _dirs.length; _i++) {
									for (let _j = 0; _j < _exts.length; _j++) {
										const _u = "extension/十周年UI/image/card-skins/" + _dirs[_i] + "/" + _nm + "." + _exts[_j];
										if (_out.indexOf(_u) < 0) _out.push(_u);
									}
								}
							}
						} catch (e) {}
						_out.push("image/card/" + (node.name || "") + ".png");
						return _out;
					})();
					let _ci = 0;
					const _applyBg = function (u) {
						//●兜底底图统一走 _setBaseArt：只画在最底层，内缩/圆角/裁剪参数都在 _ensureArtLayer 里
						_setBaseArt(u);
					};
					const _tryNext = function () {
						if (_ci >= _cands.length) {
							const _m = String(_ourl || "").match(/url\(["']?([^"')]+)["']?\)/);
							if (_m && _m[1]) _applyBg(_m[1]);
							return;
						}
						const _pp = new Image();
						_pp.onload = function () {
							_applyBg(_pp.src);
						};
						_pp.onerror = _tryNext;
						_pp.src = lib.assetURL + _cands[_ci++];
					};
					_tryNext();
					const _oldName = node.querySelector(".--name");
					if (_oldName && _oldName.parentNode) _oldName.parentNode.removeChild(_oldName);
					//●卡名改为原版样式：黑色 shousha 字体 + 白色描边，固定在右下角、单行，不再附带白色的属性小字
					const _nmText = get.translation(node.name);
					const _nameEl = document.createElement("div");
					_nameEl.className = "--name";
					_nameEl.style.cssText = [
						"position:absolute",
						"right:7px",
						"bottom:10px",
						"z-index:6",
						"color:#2B2A24",
						"font-family:shousha",
						"font-weight:900",
						/*"font-size:21.5px",*/
						"font-size:" + document.body.offsetWidth / 100 * 1.78 + "px",
						"line-height:1",
						"letter-spacing:" + document.body.offsetWidth / 100 * -0.1 + "px",
						"white-space:nowrap",
						"max-width:92%",
						"overflow:hidden",
						"text-align:right",
						"pointer-events:none",
						"-webkit-text-stroke:0.6px #2B2A24",
						"text-shadow:0 0 1.5px #fff,0 0 1.5px #fff",
					].join(";");
					_nameEl.textContent = _nmText;
					node.appendChild(_nameEl);
				};
				//●先绑定 onload/onerror 再赋值 src，确保缺少 cardTitle 素材时一定能进入「裁剪 + 右下角卡名」兜底
				img.src = lib.assetURL + url;
				Object.assign(node.style, {
					width: document.body.offsetWidth / 100 * 10 + "px",
					height: document.body.offsetWidth / 100 * 5 + "px",
					background: "none",
					boxShadow: "none",
				});
				//●先把「原卡图裁剪」作为兜底底图垫上（无素材也能看到图），素材由 onload 画在上面的素材层
				const _m0 = String(img.ourl2 || img.ourl || "").match(/url\(["']?([^"')]+)["']?\)/);
				if (_m0 && _m0[1]) _setBaseArt(_m0[1].indexOf("http") === 0 ? _m0[1] : lib.assetURL + _m0[1]);
			}
			//●第15条：节点级标记，外层重复包装时据此判重，避免同一张牌被美化两次
			try { if (node) node.__ssShoushaStyled = true; } catch (e) {}
			return node;
			} finally {
				patchedButton._inCall = false;
			}
			};
			patchedButton._shoushaPatched = true;
			ui.create.button = patchedButton;
		};
		installShoushaButton();
		setTimeout(installShoushaButton, 3000);
		//●由“每 2 秒轮询”改为事件驱动：其它扩展替换 ui.create.button 时立刻重新打补丁
		try {
			if (!ui.create.__ssShoushaGuard) {
				ui.create.__ssShoushaGuard = true;
				let cur = ui.create.button;
				let busy = false;
				Object.defineProperty(ui.create, "button", {
					configurable: true,
					enumerable: true,
					get: function () {
						return cur;
					},
					set: function (v) {
						cur = v;
						if (busy) return;
						busy = true;
						try {
							installShoushaButton();
						} catch (e) {} finally {
							busy = false;
						}
					},
				});
			}
		} catch (e) {
			//●defineProperty 不可用时退回有限次轮询（约 30 秒）
			let tries = 0;
			const iv = setInterval(function () {
				installShoushaButton();
				if (++tries >= 15) clearInterval(iv);
			}, 2000);
		}
		if (!window.__ssVcardCancelBound) {
			window.__ssVcardCancelBound = true;
			const _ssStamp = function (e) {
				try {
					const t = e.target && e.target.closest ? e.target.closest(".card[data-vcard]") : null;
					if (!t) return;
					if (t.classList.contains("selected")) return;
					setTimeout(function () {
						try {
							if (t.classList.contains("selected")) t._ssSelAt = Date.now();
						} catch (err) {}
					}, 0);
				} catch (err) {}
			};
			const _ssCancel = function (e) {
				try {
					const t = e.target && e.target.closest ? e.target.closest(".card[data-vcard]") : null;
					if (!t || !t.classList.contains("selected")) return false;
					if (t._ssSelAt && Date.now() - t._ssSelAt < 300) return false;
					t.classList.remove("selected");
					if (ui.selected && ui.selected.buttons) {
						for (let i = ui.selected.buttons.length - 1; i >= 0; i--) {
							if (ui.selected.buttons[i] === t) ui.selected.buttons.splice(i, 1);
						}
					}
					const cap = t.querySelector(".caption");
					if (cap && cap.parentNode) cap.parentNode.removeChild(cap);
					t._ssSelAt = 0;
					game.check();
					return true;
				} catch (err) {}
				return false;
			};
			document.addEventListener(lib.config.touchscreen ? "touchstart" : "pointerdown", function (e) {
				try {
					if (!_ssCancel(e)) return;
					e.stopPropagation();
					e.stopImmediatePropagation();
					e.preventDefault();
				} catch (err) {}
			}, true);
			document.addEventListener(lib.config.touchscreen ? "touchstart" : "mousedown", _ssStamp, true);
			document.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
				try {
					if (!_ssCancel(e)) return;
					e.stopPropagation();
					e.stopImmediatePropagation();
					e.preventDefault();
				} catch (err) {}
			}, true);
		}
		function ssLookSkinCss() {
			if (!document.querySelector('link[href*="shunshou"]')) {
				const _lk = document.createElement("link");
				_lk.rel = "stylesheet";
				_lk.href = lib.assetURL + "extension/自用美化/css/shunshou.css";
				document.head.appendChild(_lk);
			}
			if (document.getElementById("ss-look-css")) return;
			const st = document.createElement("style");
			st.id = "ss-look-css";
			st.textContent =
				"#shunshouDialog.ss-look{border:0 !important;box-shadow:none !important;outline:none !important;background-color:transparent !important;}" +
				"#shunshouDialog.ss-look .content{background:none !important;border:0 !important;box-shadow:none !important;}" +
				"#shunshouDialog.ss-look .buttons{background:none !important;border:0 !important;box-shadow:none !important;}" +
				"#shunshouDialog.ss-look .shunshouTitle{z-index:20 !important;}" +
				"#shunshouDialog.ss-look .content{position:static !important;margin-top:50px !important;}" +
				"#shunshouDialog.ss-look{pointer-events:none !important;}" +
				"#shunshouDialog.ss-look .button,#shunshouDialog.ss-look .dialog-confirm,#shunshouDialog.ss-look .ss-arrow,#shunshouDialog.ss-look .tdnode,#shunshouDialog.ss-look .tdnodes,#shunshouDialog.ss-look .pointerdiv,#shunshouDialog.ss-look .menubutton{pointer-events:auto !important;}" +
				"#shunshouDialog.ss-look .content *,#shunshouDialog.ss-look .buttons *,#shunshouDialog.ss-look .content>*{pointer-events:auto !important;}" +
				"#shunshouDialog.ss-look .shunshouTitle{left:0 !important;width:100% !important;top:2px !important;height:46px !important;line-height:46px !important;transition:font-size .3s ease !important;}" +
				"#shunshouDialog.ss-look .dialog-confirm{bottom:92px !important;z-index:20 !important;}" +
				"#shunshouDialog.ss-look .ss-timer{bottom:34px !important;}" +
				"#shunshouDialog.ss-look .shunshouHint{bottom:12px !important;}" +
				"#shunshouDialog.ss-look{transition:height 0.3s ease,top 0.3s ease !important;}" +
				"#shunshouDialog.ss-look.folded{width:100% !important;left:50% !important;transform:translateX(-50%) !important;-webkit-transform:translateX(-50%) !important;background-size:100% auto !important;background-position:top center !important;background-repeat:no-repeat !important;}" +
				"body.ss-look-folded .control.skill-sbkanpo{display:none !important;}" +
				"#shunshouDialog.ss-look.folded .content,#shunshouDialog.ss-look.folded .buttons,#shunshouDialog.ss-look.folded .dialog-confirm,#shunshouDialog.ss-look.folded .shunshouHint{display:none !important;}" +
				"#shunshouDialog.ss-look.folded .ss-timer{bottom:6px !important;}" +
				"#shunshouDialog.ss-look.folded .shunshouTitle{top:2px !important;height:46px !important;line-height:46px !important;font-size:42px !important;}" +
				"#shunshouDialog.ss-look.folded .shunshouTitle img.ss-arrow{transform:scaleY(-1) !important;-webkit-transform:scaleY(-1) !important;}";
			document.head.appendChild(st);
		}

		let _ssRepBtnGlobal = null;

		function ssSX(px) {
			const _w = Math.min(document.body.offsetWidth || window.innerWidth || 1067, 1080);
			return Math.round((px * _w) / 1067);
		}
		function ssSY(px) {
			const _h = Math.min(document.body.offsetHeight || window.innerHeight || 546, 546);
			return Math.round((px * _h) / 546);
		}

		function ssLookMark(card, count) {
			let cap = card.querySelector(":scope > .ss-count");
			if (!count) {
				if (cap) cap.remove();
				return;
			}
			if (!cap) {
				cap = ui.create.div(".ss-count", card);
				const st = cap.style;
				st.setProperty("position", "absolute", "important");
				st.setProperty("left", "3%", "important");
				st.setProperty("right", "auto", "important");
				st.setProperty("top", "auto", "important");
				st.setProperty("bottom", "15%", "important");
				st.setProperty("width", "36%", "important");
				st.setProperty("height", "26%", "important");
				st.setProperty("display", "flex", "important");
				st.setProperty("justify-content", "flex-end", "important");
				st.setProperty("align-items", "center", "important");
				st.setProperty("text-align", "right", "important");
				st.setProperty("background", "url('" + lib.assetURL + "extension/自用美化/image/shoushaUI/count_back.png') 0 0 / 100% 100% no-repeat", "important");
				st.setProperty("padding", "0 6px 1px 0", "important");
				st.setProperty("pointer-events", "none", "important");
				st.setProperty("z-index", "9", "important");
			}
			cap.innerHTML = '<span style="color:#fff;font-size:14px;font-family:xinwei;line-height:1;text-shadow:0 0 2px rgba(74,29,1,.8);">×' + count + "</span>";
		}

		function ssLookLabels(dialog) {
			return;
		}

		function ssLookControl(dialog, cfEl) {
			let ctl = document.querySelector(".control.skill-sbkanpo");
			if (!ctl) {
				document.querySelectorAll(".control").forEach(function (el) {
					if (ctl) return;
					let _hit = false;
					try {
						_hit = /清除选择|重新选择|重置/.test(el.textContent || "");
					} catch (e) {}
					if (!_hit) _hit = !!el.querySelector('img[src*="game_skill_reset"]');
					if (_hit) ctl = el;
				});
				if (ctl) ctl.classList.add("skill-sbkanpo", "yzk-shoushaButtonNoNatureSha");
			}
			if (!ctl) return;
			if (!dialog._ssCtlLater) {
				dialog._ssCtlLater = true;
				[200, 500, 900, 1500, 2500, 4000].forEach(function (d) {
					setTimeout(function () {
						try {
							ssLookControl(dialog);
						} catch (e) {}
					}, d);
				});
			}
			try {
				if (ctl.parentNode !== dialog) dialog.appendChild(ctl);
				const st = ctl.style;
				st.setProperty("position", "absolute", "important");
				st.setProperty("left", "19%", "important");
				st.setProperty("right", "auto", "important");
				st.setProperty("margin", "0", "important");
				st.setProperty("z-index", "30", "important");
				st.setProperty("pointer-events", "auto", "important");
				st.setProperty("display", dialog.classList.contains("folded") ? "none" : "flex", "important");
				st.setProperty("align-items", "center", "important");
				st.setProperty("justify-content", "center", "important");
				const cf = cfEl || dialog.querySelector(".dialog-confirm") || document.querySelector(".dialog-confirm");
				let _ok = false;
				if (cf) {
					const _btn = cf.querySelector(".dialog-confirm-button-ok") || cf.querySelector(".dialog-confirm-button-cancel") || cf;
					const _a = _btn.getBoundingClientRect();
					const _d = dialog.getBoundingClientRect();
					const _h = ctl.offsetHeight || ctl.getBoundingClientRect().height;
					if (_d.height > 0 && _h > 0 && (_a.height > 0 || _a.bottom > 0)) {
						const _cy = _a.height > 0 ? (_a.top + _a.bottom) / 2 : _a.bottom;
						st.setProperty("top", Math.round(_cy - _d.top - _h / 2) + "px", "important");
						st.setProperty("bottom", "auto", "important");
						_ok = true;
					}
				}
				if (!_ok) {
					st.setProperty("top", "auto", "important");
					st.setProperty("bottom", ssSY(92) + "px", "important");
				}
			} catch (e) {}
			if (!ctl._ssResetHook) {
				ctl._ssResetHook = true;
				ctl.addEventListener(
					lib.config.touchscreen ? "touchend" : "click",
					function () {
						[0, 120, 400].forEach(function (d) {
							setTimeout(function () {
								try {
									ssLookLabels(dialog);
								} catch (e) {}
							}, d);
						});
					},
					true
				);
			}
		}

		function ssLookNoDrag(dialog) {
			if (!dialog || dialog._ssNoDrag) return;
			dialog._ssNoDrag = true;
			if (!window._ssPreRec) {
				window._ssPreRec = true;
				const _rec = function (e) {
					try {
						const _dg = document.getElementById("shunshouDialog");
						if (!_dg || !_dg._ssKanpo || _dg._ssPreRec) return;
						_dg._ssPreRec = true;
						const _t = e.target;
						const _c = _t && _t.closest ? _t.closest(".button") : null;
						_dg._ssPreCard = _c && _dg.contains(_c) ? _c : null;
						_dg._ssPreCnt = 0;
						if (_c) {
							const _arr = ui.selected.buttons;
							for (let i = 0; i < _arr.length; i++) if (_arr[i] === _c) _dg._ssPreCnt++;
						}
					} catch (e) {}
				};
				window.addEventListener("mousedown", _rec, true);
				window.addEventListener("touchstart", _rec, true);
			}
			const clr = function () {
				try {
					_status.mousedragging = false;
					_status.mousedragorigin = null;
				} catch (e) {}
			};
			["mousedown", "touchstart"].forEach(function (t) {
				dialog.addEventListener(
					t,
					function () {
						clr();
						setTimeout(clr, 0);
					},
					true
				);
			});
			["mousemove", "touchmove"].forEach(function (t) {
				dialog.addEventListener(t, clr, true);
			});
		}

		function ssLookSkin(dialog) {
			if (!dialog) return;
			try {
				dialog.id = "shunshouDialog";
				dialog.classList.add("ss-look");
				if (!dialog._ssSelfRetry) {
					dialog._ssSelfRetry = true;
					[60, 200, 500, 1000].forEach(function (d) {
						setTimeout(function () {
							try {
								ssLookSkin(dialog);
							} catch (e) {}
						}, d);
					});
				}
				dialog.style.setProperty("width", document.body.offsetWidth + "px", "important");
				dialog.style.setProperty("left", "50%", "important");
				dialog.style.setProperty("right", "auto", "important");
				dialog.style.setProperty("transform", "translateX(-50%)", "important");
				dialog.style.setProperty("-webkit-transform", "translateX(-50%)", "important");
				dialog.style.setProperty("background-image", "url('" + lib.assetURL + "extension/自用美化/image/scdialog.png')", "important");
				dialog.style.setProperty("background-size", "100% 100%", "important");
				dialog.style.setProperty("background-position", "top center", "important");
				dialog.style.setProperty("background-repeat", "no-repeat", "important");
				dialog.style.setProperty("overflow", "visible", "important");
				dialog.style.setProperty("transition", "height .3s ease", "important");
				let _skill = "";
				let _isKanpo = false;
				try {
					let _evt2 = _status.event;
					let _dep = 0;
					while (_evt2 && _dep < 20) {
						if (typeof _evt2.skill === "string" && /sb_?kanpo|看破/i.test(_evt2.skill)) _isKanpo = true;
						if (typeof _evt2.name === "string" && /sb_?kanpo|看破/i.test(_evt2.name)) _isKanpo = true;
						_evt2 = _evt2.parent;
						_dep++;
					}
					//●标题统一走 window.ssFrameTitle（lib.translate 有值就用，包括英文技能名）
					_skill = window.ssFrameTitle ? window.ssFrameTitle(_status.event, "") || "" : "";
				} catch (e) {}
				let _capText = "";
				try {
					const _capEl = dialog.querySelector(".caption");
					if (_capEl) _capText = String(_capEl.textContent || "").trim();
				} catch (e) {}
				if (!_skill || !/[\u4E00-\u9FFF]/.test(_skill)) _skill = _capText.replace(/[：:].*$/, "") || "";
				if (_capText && /看破/.test(_capText)) _isKanpo = true;
				dialog._ssKanpo = _isKanpo;
				if (!dialog.querySelector(".shunshouTitle")) {
					const _arW = ssSX(46);
					const _arH = ssSX(38);
					const title = ui.create.div(".shunshouTitle", dialog);
					title.innerHTML =
						_skill +
						'<img src="' +
						lib.assetURL +
						'extension/自用美化/image/arrow.png" class="ss-arrow" style="width:' +
						_arW +
						"px;height:" +
						_arH +
						"px;margin-bottom:0px;position:relative;top:" +
						ssSY(7) +
						"px;cursor:pointer;margin-right:-" +
						_arW +
						'px;"/>';
					const _ar = title.querySelector("img");
					if (_ar) {
						_ar.addEventListener("click", function (e) {
							e.stopPropagation();
							const _fold = dialog.classList.toggle("folded");
							try {
								document.body.classList.toggle("ss-look-folded", _fold);
								[".content", ".buttons", ".dialog-confirm", ".shunshouHint"].forEach(function (sel) {
									dialog.querySelectorAll(sel).forEach(function (el) {
										if (_fold) {
											if (el.__ssDisp === undefined) el.__ssDisp = el.style.display;
											el.style.setProperty("display", "none", "important");
										} else if (el.__ssDisp !== undefined) {
											if (el.__ssDisp) el.style.setProperty("display", el.__ssDisp, "important");
											else el.style.removeProperty("display");
											delete el.__ssDisp;
										}
									});
								});
								const _jd = document.getElementById("jindutiaopl");
								if (_jd) {
									if (_fold) _jd.style.setProperty("display", "none", "important");
									else _jd.style.removeProperty("display");
								}
								document.querySelectorAll(".control.skill-sbkanpo").forEach(function (el) {
									if (_fold) el.style.setProperty("display", "none", "important");
									else el.style.removeProperty("display");
								});
								ssLookSkin(dialog);
							} catch (e2) {}
						});
					}
				}
				if (!dialog.querySelector(".ss-timer")) {
					const timer = document.createElement("div");
					timer.className = "ss-timer";
					const fill = document.createElement("div");
					fill.className = "ss-timer-fill";
					timer.appendChild(fill);
					dialog.appendChild(timer);
				}
				ssLookSkinCss();
				const _dlgSt = dialog.style;
				dialog.id = "shunshouDialog";
				dialog.classList.add("ss-look");
				const _folded = dialog.classList.contains("folded");
				if (!_folded) document.body.classList.remove("ss-look-folded");
				const _jdtEl = document.querySelector("#jindutiaopl");
				if (_jdtEl) _jdtEl.style.setProperty("display", "none", "important");
				_dlgSt.setProperty("pointer-events", "none", "important");
				_dlgSt.setProperty("border", "0", "important");
				_dlgSt.setProperty("box-shadow", "none", "important");
				_dlgSt.setProperty("outline", "none", "important");
				_dlgSt.setProperty("overflow", "visible", "important");
				_dlgSt.setProperty("transition", "height .3s ease, top .3s ease, background-size .3s ease", "important");
				_dlgSt.setProperty("width", document.body.offsetWidth + "px", "important");
				_dlgSt.setProperty("left", "50%", "important");
				_dlgSt.setProperty("right", "auto", "important");
				_dlgSt.setProperty("margin-left", "0px", "important");
				_dlgSt.setProperty("transform", "translateX(-50%)", "important");
				_dlgSt.setProperty("-webkit-transform", "translateX(-50%)", "important");
				_dlgSt.setProperty("background-image", "url('" + lib.assetURL + "extension/自用美化/image/scdialog.png')", "important");
				_dlgSt.setProperty("background-position", "top center", "important");
				_dlgSt.setProperty("background-repeat", "no-repeat", "important");
				const _vh = document.body.offsetHeight;
				const _topN = Math.round(_vh * 0.1) + (dialog.__ssWugu ? ssSY(40) : 0);
				const _foldH = ssSY(78);
				let _innerH = 0;
				let _ssK = 1;
				try {
					const _dwr = dialog.getBoundingClientRect();
					const _dwo = dialog.offsetWidth || 0;
					if (_dwr.width > 8 && _dwo > 8) _ssK = _dwr.width / _dwo;
					if (!isFinite(_ssK) || _ssK <= 0) _ssK = 1;
				} catch (e) { _ssK = 1; }
				try {
					const _dTop2 = dialog.getBoundingClientRect().top;
					const _frames = dialog.querySelectorAll(".dialog-basic,.dialog-trick,.dialog-delay");
					if (_frames.length) {
						_frames.forEach(function (el) {
							if (!el.offsetHeight) return;
							const _b2 = (el.getBoundingClientRect().bottom - _dTop2) / _ssK;
							if (_b2 > _innerH) _innerH = _b2;
						});
					} else {
						const _cardBtns = dialog.querySelector(".buttons");
						(_cardBtns ? _cardBtns.querySelectorAll(".button") : dialog.querySelectorAll(".button")).forEach(function (el) {
							if (!el.offsetHeight) return;
							const _b2 = (el.getBoundingClientRect().bottom - _dTop2) / _ssK;
							if (_b2 > _innerH) _innerH = _b2;
						});
					}
				} catch (e) {}
				_innerH = Math.round(_innerH);
				if (_innerH <= 0) {
					try {
						const _bs = dialog.querySelector(".buttons") || dialog.querySelector(".content");
						if (_bs) {
							const _bb = (_bs.getBoundingClientRect().bottom - dialog.getBoundingClientRect().top) / _ssK;
							if (_bb > 0) _innerH = Math.round(_bb);
						}
					} catch (e) {}
				}
				let _boxH = Math.round(_vh * 0.7);
				dialog._ssTopCf = 0;
				dialog._ssTopTm = 0;
				dialog._ssTopHt = 0;
				if (dialog.__ssWugu) {
					dialog._ssTopTm = _innerH > 0 ? (_innerH + ssSY(10)) : ssSY(138);
					_boxH = Math.max(Math.round(dialog._ssTopTm + ssSY(50)), ssSY(202));
				} else if (!_isKanpo && _innerH > 0) {
					dialog._ssTopCf = _innerH + ssSY(36);
					dialog._ssTopTm = dialog._ssTopCf + ssSY(44) + ssSY(10);
					_boxH = Math.min(Math.max(dialog._ssTopTm + ssSY(2) + ssSY(1/*●*/), Math.round(_vh * 0.42)), Math.round(_vh * 0.72));
				}
				if (_folded) {
					//●折叠态统一位置：由 extension.js 的 --ss-fold-top 控制
					_dlgSt.setProperty("top", "var(--ss-fold-top)", "important");
					_dlgSt.setProperty("height", _foldH + "px", "important");
					_dlgSt.setProperty("min-height", _foldH + "px", "important");
					_dlgSt.setProperty("background-size", "100% auto", "important");
				} else {
					_dlgSt.setProperty("top", _topN + "px", "important");
					_dlgSt.setProperty("height", _boxH + "px", "important");
					_dlgSt.setProperty("min-height", _boxH + "px", "important");
					_dlgSt.setProperty("background-size", dialog.__ssWugu ? "100% auto" : "100% 100%", "important");
					if (dialog.__ssWugu) _dlgSt.setProperty("background-position", "top center", "important");
				}
				const _ctEl = dialog.querySelector(".content");
				if (_ctEl) {
					_ctEl.style.setProperty("background", "none", "important");
					_ctEl.style.setProperty("border", "0", "important");
					//●五谷框：卡牌区域整体下移 window.__ssWuguCardsDown（默认 12.2）像素，卡牌大小不变
					const _wuguDown = dialog.__ssWugu ? ssSY(typeof window.__ssWuguCardsDown === "number" ? window.__ssWuguCardsDown : 12.2) : 0;
					if (!_isKanpo) _ctEl.style.setProperty("margin-top", ssSY(dialog.__ssWugu ? 46 : 74) + _wuguDown + "px", "important");
					if (_folded) _ctEl.style.setProperty("display", "none", "important");
				}
				const _btEl = dialog.querySelector(".buttons");
				if (_btEl) {
					_btEl.style.setProperty("background", "none", "important");
					_btEl.style.setProperty("border", "0", "important");
					_btEl.style.setProperty("box-shadow", "none", "important");
					if (_folded) _btEl.style.setProperty("display", "none", "important");
				}
				dialog.querySelectorAll(".caption").forEach(function (el) {
					if (el.closest && el.closest(".button")) return;
					el.style.setProperty("display", "none", "important");
				});
				dialog.querySelectorAll(".button,.tdnode,.tdnodes,.pointerdiv,.menubutton").forEach(function (el) {
					el.style.setProperty("pointer-events", "auto", "important");
				});
				//●确认/取消按钮固定大小（基准 66×26）。不按 _ssK 反算：
				//  皮肤切换(chrome-fix)改写了 getBoundingClientRect，_ssK 会被污染，导致开启皮肤切换后按钮变小
				const _ssFixCfSize = function (_cf) {
					if (!_cf || !_cf.querySelectorAll) return;
					_cf.querySelectorAll(".dialog-confirm-button-ok,.dialog-confirm-button-cancel").forEach(function (el) {
						el.style.setProperty("width", "99px", "important");/*●*/
						el.style.setProperty("height", "39px", "important");
					});
				};
				const _ssEnsureCf = function () {
					if (dialog.__ssNoConfirm) return null;
					let _c0 = dialog.querySelector(".dialog-confirm");
					if (_c0) return _c0;
					if (_isKanpo) return null;
					try {
						const _evC = _status.event;
						if (_evC && _evC.noconfirm && !_evC.customConfirm) return null;
					} catch (e) {}
					try {
						if (ui.create._shoushaConfirm) ui.create._shoushaConfirm(dialog);
					} catch (e) {}
					return dialog.querySelector(".dialog-confirm");
				};
				let _cfEl = null;
				if (!dialog.__ssNoConfirm) {
					document.querySelectorAll(".dialog-confirm").forEach(function (el) {
						if (!_cfEl && el.offsetHeight > 0) _cfEl = el;
					});
					if (!_cfEl) _cfEl = dialog.querySelector(".dialog-confirm");
					if (!_cfEl) _cfEl = _ssEnsureCf();
				}
				if (_cfEl) {
					if (_cfEl.parentNode !== dialog && dialog.appendChild) dialog.appendChild(_cfEl);
					_cfEl.style.setProperty("position", "absolute", "important");
					_ssFixCfSize(_cfEl);
					if (dialog._ssTopCf && !_folded) {
						const _cfTop = Math.min(dialog._ssTopCf, Math.max(ssSY(60), _boxH - ssSY(80)));
						dialog._ssCfTopFinal = _cfTop;
						_cfEl.style.setProperty("top", (_cfTop + 10/*●*/) + "px", "important");
						_cfEl.style.setProperty("bottom", "auto", "important");
					} else {
						dialog._ssCfTopFinal = null;
						_cfEl.style.setProperty("top", "auto", "important");
						_cfEl.style.setProperty("bottom", ssSY(92) + "px", "important");
					}
					_cfEl.style.setProperty("z-index", "20", "important");
					_cfEl.style.setProperty("pointer-events", "auto", "important");
					_cfEl.style.setProperty("display", _folded ? "none" : "flex", "important");
				} else if (!dialog._ssCfTimer && !dialog.__ssNoConfirm) {
					dialog._ssCfTimer = true;
					[120, 400, 900].forEach(function (d) {
						setTimeout(function () {
							try {
								let _c = dialog.querySelector(".dialog-confirm") || document.querySelector(".dialog-confirm");
								if (!_c) _c = _ssEnsureCf();
								if (!_c) return;
								if (_c.parentNode !== dialog && dialog.appendChild) dialog.appendChild(_c);
								_c.style.setProperty("position", "absolute", "important");
								_ssFixCfSize(_c);
								_c.style.setProperty("bottom", ssSY(92) + "px", "important");
								_c.style.setProperty("z-index", "20", "important");
								_c.style.setProperty("pointer-events", "auto", "important");
								if (dialog.classList.contains("folded")) _c.style.setProperty("display", "none", "important");
								ssLookControl(dialog, _c);
							} catch (e3) {}
						}, d);
					});
				}
				const _arEl = dialog.querySelector(".ss-arrow");
				if (_arEl) _arEl.style.setProperty("pointer-events", "auto", "important");
				const _tmEl = dialog.querySelector(".ss-timer");
				if (_tmEl) {
					_tmEl.style.setProperty("position", "absolute", "important");
					_tmEl.style.setProperty("height", ssSY(8) + "px", "important");
					_tmEl.style.setProperty("left", "31%", "important");
					_tmEl.style.setProperty("right", "31%", "important");
					if (dialog._ssTopTm && !_folded) {
						const _cfBase = dialog._ssCfTopFinal != null ? dialog._ssCfTopFinal : dialog._ssTopCf;
						const _tmTop = Math.min(_cfBase + ssSY(55/*●*/), Math.max(ssSY(20), _boxH - ssSY(10)));
						_tmEl.style.setProperty("top", _tmTop + "px", "important");
						_tmEl.style.setProperty("bottom", "auto", "important");
					} else {
						_tmEl.style.setProperty("top", "auto", "important");
						_tmEl.style.setProperty("bottom", ssSY(_folded ? 6 : 34) + "px", "important");
					}
				}
				const _hintEl = dialog.querySelector(".ss-wugu-hint");
				if (_hintEl) {
					if (_folded) {
						_hintEl.style.setProperty("display", "none", "important");
					} else {
						_hintEl.style.removeProperty("display");
						if (dialog._ssTopTm) {
							_hintEl.style.setProperty("top", dialog._ssTopTm + ssSY(10) + "px", "important");
							_hintEl.style.setProperty("bottom", "auto", "important");
						}
					}
				}
				const _wBoxEl = dialog.querySelector(".wuguWuxieBox");
				if (_wBoxEl && !_folded) {
					let _wbTop = 0;
					try {
						const _ct2 = dialog.querySelector(".content");
						if (_ct2) _wbTop = Math.max(0, Math.round(_ct2.getBoundingClientRect().top - dialog.getBoundingClientRect().top));
					} catch (e) {}
					_wBoxEl.style.setProperty("top", _wbTop + "px", "important");
				}
				const _avEl = dialog.querySelector(".ss-wugu-avatar");
				if (_avEl && !_folded && (!_avEl.style.backgroundImage || _avEl.style.backgroundImage === "none")) {
					try {
						let _pA = null;
						const _evA = _status.event;
						if (_evA && _evA.player && _evA.player.node && _evA.player.node.avatar) _pA = _evA.player;
						if (!_pA && _evA && _evA.getParent) {
							let _up = _evA.getParent();
							for (let _i = 0; _i < 4 && _up; _i++) {
								if (_up.player && _up.player.node && _up.player.node.avatar) {
									_pA = _up.player;
									break;
								}
								_up = _up.getParent ? _up.getParent() : null;
							}
						}
						if (_pA) {
							_avEl.style.backgroundImage =
								_pA.isUnseen && _pA.isUnseen(0)
									? _pA.isUnseen(1)
										? "linear-gradient(0deg, #000000, #000000)"
										: _pA.node.avatar2.style.backgroundImage
									: _pA.node.avatar.style.backgroundImage;
						}
					} catch (e) {}
				}
				dialog.querySelectorAll(".shunshouHint").forEach(function (el) {
					el.style.setProperty("display", "none", "important");
				});
				const _ttEl = dialog.querySelector(".shunshouTitle");
				if (_ttEl) {
					_ttEl.style.setProperty("z-index", "20", "important");
					_ttEl.style.setProperty("left", "0", "important");
					_ttEl.style.setProperty("width", "100%", "important");
					_ttEl.style.setProperty("top", ssSY(10) + "px", "important");
					_ttEl.style.setProperty("height", ssSY(46) + "px", "important");
					_ttEl.style.setProperty("line-height", ssSY(46) + "px", "important");
					_ttEl.style.setProperty("font-size", ssSX(_folded ? 50 : 50) + "px", "important");
					_ttEl.style.setProperty("pointer-events", "auto", "important");
				}
				try {
					const _sc = get.select((_status.event && (_status.event.selectCard || _status.event.selectButton)) || [1, 1]);
					dialog._ssSum = _sc && _sc[1] ? _sc[1] : 1;
					dialog._ssAutoOne = !_isKanpo && _sc[1] === 1;
				} catch (e) {}
				dialog.querySelectorAll(".dialog-confirm-button-ok").forEach(function (el) {
					el.style.setProperty("display", "", "important");
				});
				ssLookLabels(dialog);
				ssLookControl(dialog, _cfEl);
				ssLookNoDrag(dialog);
				if (!dialog._ssLabelHook) {
					dialog._ssLabelHook = true;
					dialog.addEventListener(
						lib.config.touchscreen ? "touchend" : "click",
						function (e) {
							const _onCard = e.target && e.target.closest ? e.target.closest(".button") : null;
							const _wasSel = !!(_onCard && _onCard.classList.contains("selected"));
							if (!lib.config.touchscreen && dialog._ssKanpo && _onCard && dialog.contains(_onCard)) {
								const _sumT = dialog._ssSum || 2;
								const _preCnt = dialog._ssPreCard === _onCard ? dialog._ssPreCnt || 0 : 0;
								const _want = Math.min(_preCnt + 1, _sumT);
								dialog._ssPreRec = false;
								dialog._ssPreCard = null;
								try {
									const _arr = ui.selected.buttons;
									const _cntNow = function () {
										let _k = 0;
										for (let i = 0; i < _arr.length; i++) if (_arr[i] === _onCard) _k++;
										return _k;
									};
									while (_cntNow() > _want) {
										const _ix = _arr.indexOf(_onCard);
										if (_ix < 0) break;
										_arr.splice(_ix, 1);
									}
									while (_cntNow() < _want && _arr.length < _sumT) _arr.push(_onCard);
									_onCard.classList.add("selected");
									const _capA = _onCard.querySelector(".caption");
									if (_capA) {
										if (_capA.childNodes[0]) _capA.childNodes[0].innerHTML = "×" + _want;
										else _capA.innerHTML = "<span>×" + _want + "</span>";
									} else {
										try {
											const _nc = ui.create.caption("<span>×" + _want + "</span>", _onCard);
											_nc.style.right = "5px";
										} catch (e) {}
									}
									game.check();
									const _ctlA = document.querySelector(".control.skill-sbkanpo");
									if (_ctlA) _ctlA.classList.remove("disabled");
								} catch (e7) {}
								e.stopImmediatePropagation();
								e.preventDefault();
								return;
							}
							setTimeout(function () {
								ssLookLabels(dialog);
								try {
									const _ctl9 = document.querySelector(".control.skill-sbkanpo");
									if (_ctl9) {
										const _n9 = ui.selected && ui.selected.buttons ? ui.selected.buttons.length : 0;
										if (_n9 > 0) _ctl9.classList.remove("disabled");
										else _ctl9.classList.add("disabled");
									}
								} catch (e4) {}
							}, 0);
						},
						true
					);
				}
				if (!dialog._ssLookPatched) {
					dialog._ssLookPatched = true;
					const _ssOrigOpen = dialog.open;
					dialog.open = function () {
						let _r;
						try {
							_r = _ssOrigOpen.apply(dialog, arguments);
						} catch (e) {}
						try {
							ssLookSkin(dialog);
							setTimeout(function () {
								ssLookSkin(dialog);
							}, 50);
							setTimeout(function () {
								ssLookSkin(dialog);
							}, 300);
						} catch (e2) {}
						return _r;
					};
				}
			} catch (e) {}
			try {
				if (dialog.__ssWugu && window.__ssWuguLayout) window.__ssWuguLayout(dialog);
			} catch (e) {}
		}
		window.__ssLookSkin = ssLookSkin;

		//●第15条：同上，避免扩展重载/重复 patch 时把 dialog.add 包两层
		lib.element.dialog.add = lib.element.dialog.add.__ssShoushaAdd ? lib.element.dialog.add : function (...args) {
			let _qmgj = false;
			if (args[0] && (args[0][1] === "vcard" || args[0][1] === "shousha")) {
				try {
					let _qe = _status.event,
						_qd = 0;
					while (_qe && _qd < 10) {
						if (String(_qe.skill || "").indexOf("_qmgj_") === 0 || String(_qe.name || "").indexOf("_qmgj_") === 0) {
							_qmgj = true;
							break;
						}
						_qe = _qe.parent;
						_qd++;
					}
				} catch (e) {}
			}
			//●只有「数组里全部都是真实牌节点」时才把 vcard 改成 card；
			//  混入类型描述（如 ["basic","","sha"]）或混合数组时保留 vcard，避免把手牌框的显示方式误改
			if (
				!_qmgj &&
				args[0] &&
				Array.isArray(args[0]) &&
				args[0].length >= 2 &&
				args[0][1] === "vcard" &&
				Array.isArray(args[0][0]) &&
				args[0][0].length > 0 &&
				args[0][0].every(function (_el) {
					return !!_el && typeof _el === "object" && _el.nodeType === 1 && (_el.isCard === true || _el.cardid !== undefined);
				})
			) {
				args[0] = [args[0][0], "card"];
			}
			let result = oadd.apply(this, args),
				evt = _status.event,
				buttons = this.querySelectorAll(".buttons"),
				bannedSkills = ["dcposuo"],
				onlyUsableSkills = ["sbwusheng_wusheng"],
				verticalSkills = ["sbwusheng_wusheng"],
				list = [evt.skill, evt.name, evt.result && evt.result.skill, evt.getParent().name, evt.getParent().skill, evt.getParent().result && evt.getParent().result.skill];
			if (
				!_qmgj &&
				(evt ? !list.some(name => bannedSkills.map(skill => [skill, skill + "_backup"]).flat().includes(name)) : true) &&
				args[0] &&
				/vcard|shousha/.test(args[0][1]) &&
				buttons &&
				buttons.length &&
				this.classList.contains("dialog") &&
				!this.classList.contains("noshousha")
			) {
				buttons = buttons[buttons.length - 1];
				let cards = [...buttons.children].filter(function (card) {
					return card.classList.contains("button") && (!card.parentNode || card.parentNode == buttons);
				});
				try {
					let _tp = null;
					try {
						const _se = _status.event;
						_tp = _se && typeof _se.getParent === "function" ? _se.getParent() : null;
					} catch (e) {}
					if (!_tp && evt && typeof evt.getParent === "function") _tp = evt.getParent();
					const _tn = _tp ? String(_tp.name || "") + "|" + String(_tp.skill || "") : "";
					const _pt = String((_status.event && _status.event.prompt) || "");
					if (/sb_?kanpo/i.test(_tn) || /看破/.test(_tn) || /看破/.test(_pt)) {
						evt._yzk_shoushaButtonDialogNoNatureSha = true;
						evt._yzk_shoushaButtonDialogVertical = true;
						try {
							const _dm = buttons.closest ? buttons.closest(".dialog") : null;
							if (_dm) _dm.classList.add("yzk-shoushaButtonNoNatureSha", "skill-sbkanpo", "yzk-shoushaButtonDialogVertical");
							buttons.classList.add("yzk-shoushaButtonNoNatureSha", "skill-sbkanpo", "yzk-shoushaButtonDialogVertical");
						} catch (e) {}
						try {
							_status.event._yzk_shoushaButtonDialogNoNatureSha = true;
							_status.event._yzk_shoushaButtonDialogVertical = true;
						} catch (e) {}
						const _ctls = _tp ? _tp.controls : null;
						if (_ctls && _ctls[0]) {
							_ctls[0].innerHTML = '<img width = 120 height = 40 src = "' + lib.assetURL + "extension/自用美化/image/shoushaUI/game_skill_reset.png\">";
							_ctls[0].classList.add("skill-sbkanpo");
						}
						try {
							let _sum9 = 2;
							try {
								const _sc9 = get.select((_status.event && (_status.event.selectCard || _status.event.selectButton)) || [1, 2]);
								_sum9 = _sc9 && _sc9[1] ? _sc9[1] : 2;
							} catch (e) {}
							const _ssRepBtn = function (button) {
								try {
									const _e9 = _status.event;
									if (!_e9 || !_e9.isMine()) return;
									const _now = Date.now();
									if (button.classList.contains("selected")) {
										if (button._ssSelAt && _now - button._ssSelAt < 300) return;
										button.classList.remove("selected");
										for (let _i9 = ui.selected.buttons.length - 1; _i9 >= 0; _i9--) {
											if (ui.selected.buttons[_i9] === button) ui.selected.buttons.splice(_i9, 1);
										}
										const _capX = button.querySelector(".caption");
										if (_capX && _capX.parentNode) _capX.parentNode.removeChild(_capX);
										button._ssSelAt = 0;
										game.check();
										return;
									}
									if (ui.selected.buttons.length >= _sum9) return false;
									button.classList.add("selected");
									button._ssSelAt = _now;
									ui.selected.buttons.push(button);
									const _cnt9 = ui.selected.buttons.filter(function (c) {
										return c === button;
									}).length;
									let _cap9 = button.querySelector(".caption");
									if (_cap9) {
										if (_cap9.childNodes[0]) _cap9.childNodes[0].innerHTML = "×" + _cnt9;
										else _cap9.innerHTML = "<span>×" + _cnt9 + "</span>";
									} else {
										try {
											_cap9 = ui.create.caption("<span>×" + _cnt9 + "</span>", button);
											_cap9.style.right = "5px";
										} catch (e) {}
									}
									game.check();
								} catch (e) {}
							};
							[_tp, _status.event].forEach(function (_ev9) {
								if (!_ev9) return;
								_ev9.custom = _ev9.custom || {};
								_ev9.custom.replace = _ev9.custom.replace || {};
								_ev9.custom.replace.button = _ssRepBtn;
							});
						} catch (e) {}
					}
				} catch (e) {}
				let basic = ui.create.div(".dialog-basic", buttons),
					trick = ui.create.div(".dialog-trick", buttons),
					delay = ui.create.div(".dialog-delay", buttons),
					hasBasic = cards.some(card => get.type(card) == "basic"),
					hasTrick = cards.some(card => !/basic|equip|delay/.test(get.type(card))),
					hasDelay = cards.some(card => get.type(card) == "delay"),
					nonature = (evt ? _status.event._yzk_shoushaButtonDialogNoNatureSha : false) || this.classList.contains("yzk-shoushaButtonNoNatureSha"),
					vertical = (evt ? _status.event._yzk_shoushaButtonDialogVertical : false) || this.classList.contains("yzk-shoushaButtonDialogVertical") || list.some(skill => verticalSkills.includes(skill)),
					onlyUsable = (evt ? _status.event._yzk_shoushaButtonDialogOnlyUsable : false) || this.classList.contains("yzk-shoushaButtonDialogOnlyUsable") || list.some(skill => onlyUsableSkills.includes(skill));
				if (nonature) { try { const _de = buttons.closest ? buttons.closest(".dialog") : null; if (_de) _de.classList.add("yzk-shoushaButtonNoNatureSha"); buttons.classList.add("yzk-shoushaButtonNoNatureSha"); } catch (e) {} }
				if (vertical) { try { const _dv = buttons.closest ? buttons.closest(".dialog") : null; if (_dv) _dv.classList.add("yzk-shoushaButtonDialogVertical"); buttons.classList.add("yzk-shoushaButtonDialogVertical"); } catch (e) {} }
				if (!hasBasic) basic.remove();
				if (!hasTrick) trick.remove();
				if (!hasDelay) delay.remove();
				if ((!hasBasic && !hasTrick && !hasDelay) || cards.every(card => !lib.card[card.name] || !lib.card[card.name].content)) return result;
				try { const _ds = buttons.closest ? buttons.closest(".dialog") : null; const _cls = list.filter(name => lib.skill && lib.skill[name]).map(name => `skill-${name == "sb_kanpo" ? "sbkanpo" : name}`); if (_ds) _ds.classList.add(..._cls); buttons.classList.add(..._cls); } catch (e) {}
				cards.forEach(card => buttons.removeChild(card));
				this.buttons.remove(...cards);
				this.style.setProperty("width", document.body.offsetWidth / 100 * 90 + "px", "important");
				this.style.setProperty("left", "5%", "important");
				if (nonature) {
					this.style.setProperty("top", "10%", "important");
					this.style.setProperty("height", "70%", "important");
					this.style.setProperty("min-height", "70%", "important");
				} else this.style.setProperty("min-height", "55%", "important");
				try {
					ssLookSkin(this);
				} catch (e) {}
				Object.assign(buttons.style, {
					display: "flex",
					justifyContent: "center",
					left: "5%",
					width: "90%",
					zoom: 1,
					height: document.body.offsetHeight / 100 * (nonature ? 45 : 35) + "px",
				});
				ui.update();
				if (!onlyUsable)
					for (let name of lib.inpile) {
						if (get.type(name) == "equip" || (!/basic|trick/.test(get.type(name)) && !cards.some(card => get.type(card) == get.type(name)))) continue;
						let card = cards.filter(card => card.name == name && !card.nature)[0],
							button = ui.create.button(card && card.link ? card.link : [get.type(name), "", name], "vcard", buttons);
						if (card) {
							button.classList.add("selectable");
							this.buttons.push(button);
						}
						if (name == "sha" && !nonature) {
							for (var nature of lib.inpile_nature) {
								let card = cards.filter(card => card.name == name && card.nature == nature)[0],
									button = ui.create.button(card && card.link ? card.link : [get.type(name), "", name, nature], "vcard", buttons);
								if (card) this.buttons.push(button);
							}
						}
					}
				while (cards.length) {
					let card = cards.shift();
					if (card && !this.buttons.some(cardx => card.name == cardx.name && card.nature == cardx.nature)) {
						let button = ui.create.button(card.link ? card.link : [get.type(card.name), "", card.name, card.nature], "vcard", buttons);
						button.classList.add("selectable");
						this.buttons.push(button);
					}
				}
				for (let card of [...buttons.children]) {
					if (!card.classList.contains("button")) continue;
					let type = get.type(card.name);
					switch (type) {
						case "basic":
							basic.appendChild(card);
							break;
						case "equip":
							card.remove();
							break;
						case "delay":
							delay.appendChild(card);
							break;
						default:
							trick.appendChild(card);
					}
				}
				ui.create._shoushaConfirm(this);
				this._shoushaButton = true;
				//●印牌框：屏蔽本体全局确认/取消条（参考魄袭框：只用 body 标记 + CSS 隐藏），
				//  不设 noconfirm、不关闭/删除 ui.confirm，否则本体进度条不会开始计时
				try {
					document.body.classList.add("ss-yinpai-open");
				} catch (e) {}
				//●框关闭后再撤掉 body 标记，避免影响下一事件正常显示确认条
				if (!this.__ssYinpaiOpenWatch) {
					this.__ssYinpaiOpenWatch = true;
					var _ypSelf = this,
						_ypIv = setInterval(function () {
							try {
								if (document.body.contains(_ypSelf)) return;
								clearInterval(_ypIv);
								if (!document.querySelector(".buttons.ss-vcard-grid")) document.body.classList.remove("ss-yinpai-open");
							} catch (e) {
								clearInterval(_ypIv);
							}
						}, 100);
				}
				if ((typeof evt.dialog == "number" && this.videoId == evt.dialog) || evt.dialog == this || Array.isArray(evt.createDialog)) ui.create._shoushaConfirm(null, _status.event);
			}
			return result;
		};
		lib.element.dialog.add.__ssShoushaAdd = true;
	}, "自用美化");
}
