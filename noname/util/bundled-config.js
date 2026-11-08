export const bundledSettingKeys = [
	"layout", "theme", "card_style", "cardback_style", "cardshape", "hp_style",
	"menu_style", "player_border", "radius_size", "image_background",
	"image_character", "card_font", "font_size", "ui_zoom", "game_speed",
	"right_click", "choose_all_button", "die_move",
];

export const bundledAiBans = [
	"eu_kaisa", "pe_que", "hm_shen_huangfusong", "ca_shen_caocao",
	"zombie_jiaxu", "lord_goblin", "shinin_wuguotai", "pe_jun_caopi",
];

const intrinsicAiBans = new WeakMap();

export function applyBundledAiBans(lib, saveConfig) {
	const config = lib.config;
	const plan = config.extension_斗转星移_plan4?.banList || [];
	const managed = new Set();
	if (config.extension_斗转星移_enable && config.extension_斗转星移_autoOpenPack) {
		for (const id of plan) managed.add(id);
	}
	if (config.extension_懒人包_enable && config.extension_懒人包_zq_aiforbidai_characters) {
		for (const id of bundledAiBans) managed.add(id);
	}
	// Older bundles stored both extension sources in the same flat list.
	const previous = new Set(config.bundled_ai_bans ?? managed);
	const user = config.forbidai_user || [];
	if (!intrinsicAiBans.has(lib)) {
		intrinsicAiBans.set(lib, new Set(config.forbidai.filter(id => !user.includes(id))));
	}
	const combined = new Set([...user.filter(id => !previous.has(id)), ...managed]);
	const intrinsic = intrinsicAiBans.get(lib);
	for (const [pack, characters] of Object.entries(lib.characterPack)) {
		if (config[`forbidai_user_${pack}`]) {
			for (const id of Object.keys(characters)) combined.add(id);
		}
	}
	config.forbidai = config.forbidai.filter(id => {
		const character = lib.character[id];
		return !previous.has(id) || combined.has(id) || intrinsic.has(id) || character?.isBoss || character?.isHiddenBoss;
	});
	config.forbidai = [...new Set([...config.forbidai, ...combined])];
	saveConfig("forbidai_user", [...new Set([...user.filter(id => !previous.has(id)), ...managed])]);
	saveConfig("bundled_ai_bans", [...managed]);
}
