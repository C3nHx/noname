import { lib, game, ui, get, ai, _status } from "../../../noname.js";

export function recastDirect() {
	//●联机模式下禁用手杀重铸：不安装重铸按钮与点击拦截，保持本体原样
	//  （放在 installed 标记之前，联机时不会占用标记，回到单机后仍能正常安装）
	if (_status.connectMode) return;
	if (window.__yzRecastDirectInstalled) return;
	window.__yzRecastDirectInstalled = true;

	const RECAST_SKILL = "_recasting";
	const BUTTON_CLASS = "recasting-btn";
	const CZ_IMG = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/CZ.png`;
	const CZ_BG = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/game_btn_bg2.png`;
	const CZ_AUDIO_MAN = "ext:自用美化/audio/chongzhu_man.mp3";
	const CZ_AUDIO_WOMAN = "ext:自用美化/audio/chongzhu_woman.mp3";

	function playRecastAudio(player) {
		try {
			const female = !!(player && player.sex === "female");
			game.playAudio({ path: female ? CZ_AUDIO_WOMAN : CZ_AUDIO_MAN });
		} catch (e) {}
	}

	function enabled() {
		return !!lib.config.extension_自用美化_directRecast && !_status.connectMode && lib.config.extension_十周年UI_enable && lib.config.extension_十周年UI_newDecadeStyle === "off";
	}

	function canRecast(card, player) {
		if (!card || !player) return false;
		try {
			return lib.filter.cardRecastable(card, player, void 0, true) !== false;
		} catch (e) {
			return false;
		}
	}

	function selectedRecastableCards(player) {
		const cards = ui.selected && ui.selected.cards;
		if (!cards || !cards.length) return [];
		return cards.filter((card) => canRecast(card, player));
	}

	function canUseDirectRecast(player) {
		const event = _status.event;
		if (!event) return false;
		if (event.name !== "chooseToUse") return false;
		if (event.skill) return false;
		if (event.parent && event.parent.name && event.parent.name !== "phaseUse") return false;
		if (typeof event.isMine === "function" && !event.isMine()) return false;
		if (event.player !== player) return false;
		if (_status.auto) return false;
		return true;
	}

	function createRecastButton(confirm) {
		const item = document.createElement("div");
		item.classList.add(BUTTON_CLASS);
		item.dataset.type = "skill2";
		item.link = RECAST_SKILL;
		item.dataset.yzRecastOwn = "1";
		const img = document.createElement("img");
		img.draggable = false;
		img.src = CZ_IMG;
		img.onerror = function () {
			img.remove();
			item.innerHTML = "重铸";
		};
		item.appendChild(img);
		item.style.backgroundImage = `url('${CZ_BG}')`;
		item.style.transform = "scale(0.75)";
		item.style.setProperty("padding", "25px 10px", "important");
		item.style.setProperty("margin", "0 -12px", "important");
		item.style.cursor = "pointer";
		item.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
			e.stopPropagation();
			ui.click.skill(RECAST_SKILL);
		});
		confirm.insertBefore(item, confirm.firstChild);
		return item;
	}

	function updateRecastButton() {
		const confirm = ui.confirm;
		if (!confirm || typeof confirm.querySelector !== "function") return;
		let button = confirm.querySelector("." + BUTTON_CLASS);
		if (!enabled()) {
			//●联机/关闭功能时只隐藏本扩展自己插入的按钮（带 data-yz-recast-own 标记）；
			//  十周年UI自带的原生重铸按钮同样是 .recasting-btn，绝不能一起隐藏，否则联机时按钮会消失
			confirm.querySelectorAll("." + BUTTON_CLASS + "[data-yz-recast-own='1']").forEach(function (el) {
				el.style.display = "none";
			});
			return;
		}
		const player = game.me;
		const show = !!(player && canUseDirectRecast(player) && selectedRecastableCards(player).length);
		if (!button) {
			if (Array.isArray(confirm.skills2) && confirm.skills2.length) return;
			if (!show) return;
			button = createRecastButton(confirm);
		}
		if (!button) return;
		if (show) {
			if (button.style.display === "none") button.style.display = "";
		} else if (button.style.display !== "none") {
			button.style.display = "none";
		}
	}

	function directRecast(player, cards) {
		const event = _status.event;
		if (!event || !cards.length) return false;
		const buttons = ui.selected.buttons.slice();
		event.result = {
			buttons,
			cards: cards.slice(),
			targets: ui.selected.targets.slice(),
			confirm: "ok",
			bool: true,
			skill: RECAST_SKILL,
			links: get.links(buttons),
		};
		if (ui.confirm && typeof ui.confirm.close === "function") {
			ui.confirm.close();
		}
		if (ui.skills) ui.skills.close();
		if (ui.skills2) ui.skills2.close();
		if (ui.skills3) ui.skills3.close();
		game.uncheck();
		const addConfirm = event.custom && event.custom.add && event.custom.add.confirm;
		if (typeof addConfirm === "function") addConfirm(true);
		game.resume();
		return true;
	}

	lib.hooks.checkEnd.push(function yzRecastButtonSync() {
		try {
			updateRecastButton();
		} catch (e) {}
	});
	lib.hooks.uncheckEnd.push(function yzRecastButtonSyncUncheck() {
		try {
			updateRecastButton();
		} catch (e) {}
	});

	const originalSkillClick = ui.click.skill;
	ui.click.skill = function (skill) {
		try {
			if (enabled() && skill === RECAST_SKILL) {
				const player = (_status.event && _status.event.player) || game.me;
				playRecastAudio(player);
				if (player && canUseDirectRecast(player)) {
					const cards = selectedRecastableCards(player);
					if (cards.length && directRecast(player, cards)) return;
				}
			}
		} catch (e) {
		}
		return originalSkillClick.apply(this, arguments);
	};
}
