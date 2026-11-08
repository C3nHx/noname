import { lib, game, get, _status } from "../../../noname.js";

//●联机判定：进房间后 _status.connectMode 为 true（房主和客机都如此）；game.online/servermode 兜底
function ssIsOnline() {
	try {
		if (_status && _status.connectMode) return true;
		if (game && (game.online || game.servermode)) return true;
	} catch (e) {}
	return false;
}

export function aiShunshou() {
	if (get.buttonValue.__ssAiShunshouPatched) {
		return;
	}
	//●联机模式不启用：各端（含服务端）各自算 AI 的选牌，改写 get.buttonValue 只会让判断不一致
	if (ssIsOnline()) return;
	const hiddenHandValue = function (player) {
		const nh = player.countCards("h");
		return 3 * Math.exp(-0.2 * nh) + Math.max(0, 4 - nh) * 0.5 + 0.1;
	};
	const original = get.buttonValue;
	get.buttonValue = function (button) {
		//●运行时再判一次：先单机安装、后进联机的场景也不会生效
		if (!ssIsOnline() && lib.config.extension_自用美化_aiShunshou) {
			const event = _status.event;
			if (
				event &&
				(event.name === "gainPlayerCard" || event.name === "discardPlayerCard" || event.name === "choosePlayerCard") &&
				!event.visible &&
				event.player &&
				event.player !== game.me
			) {
				const card = button.link;
				const owner = card && get.owner(card);
				if (
					owner &&
					owner === game.me &&
					owner.getCards("h").includes(card) &&
					!get.is.shownCard(card) &&
					!owner.isUnderControl(true, event.player) &&
					!event.player.hasSkillTag("viewHandcard", null, owner, true)
				) {
					return hiddenHandValue(owner) + Math.random() * 0.001;
				}
			}
		}
		return original.apply(this, arguments);
	};
	get.buttonValue.__ssAiShunshouPatched = true;
}
