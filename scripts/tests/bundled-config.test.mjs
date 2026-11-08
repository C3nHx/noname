import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { applyBundledAiBans, bundledAiBans, bundledSettingKeys } from "../../apps/core/noname/util/bundled-config.js";

function fixture() {
	const lib = {
		config: {
			forbidai: ["builtin"], forbidai_user: ["manual"],
			extension_斗转星移_enable: true, extension_斗转星移_autoOpenPack: true,
			extension_斗转星移_plan4: { banList: ["plan", "shared"] },
			extension_懒人包_enable: true, extension_懒人包_zq_aiforbidai_characters: true,
		},
		character: {}, characterPack: {},
	};
	const save = (key, value) => { lib.config[key] = structuredClone(value); };
	return { lib, save };
}

test("independent AI exclusions survive plan edits and extension switches", () => {
	const { lib, save } = fixture();
	applyBundledAiBans(lib, save);
	assert.ok(["manual", "plan", "shared", ...bundledAiBans].every(id => lib.config.forbidai_user.includes(id)));
	assert.ok(lib.config.forbidai.includes("builtin"));
	lib.config.extension_斗转星移_plan4.banList = ["new-plan", bundledAiBans[0]];
	applyBundledAiBans(lib, save);
	assert.ok(!lib.config.forbidai.includes("plan"));
	assert.ok(lib.config.forbidai.includes("new-plan"));
	lib.config.extension_懒人包_zq_aiforbidai_characters = false;
	applyBundledAiBans(lib, save);
	assert.ok(lib.config.forbidai.includes(bundledAiBans[0]), "the other source still owns the shared exclusion");
	assert.ok(!lib.config.forbidai.includes(bundledAiBans[1]));
	lib.config.extension_斗转星移_autoOpenPack = false;
	applyBundledAiBans(lib, save);
	assert.deepEqual(lib.config.forbidai_user, ["manual"]);
	assert.deepEqual(lib.config.forbidai, ["builtin", "manual"]);
});

test("removing extension bans preserves boss and pack AI exclusions", () => {
	const { lib, save } = fixture();
	lib.character.plan = { isBoss: true };
	lib.characterPack.identity = { shared: {} };
	lib.config.forbidai_user_identity = true;
	applyBundledAiBans(lib, save);
	lib.config.extension_斗转星移_plan4.banList = [];
	applyBundledAiBans(lib, save);
	assert.ok(lib.config.forbidai.includes("plan"));
	assert.ok(lib.config.forbidai.includes("shared"));
});

test("first launch preserves a manual exclusion belonging to an inactive extension", () => {
	const { lib, save } = fixture();
	lib.config.extension_懒人包_zq_aiforbidai_characters = false;
	lib.config.forbidai_user.push(bundledAiBans[0]);
	lib.config.forbidai.push(bundledAiBans[0]);
	applyBundledAiBans(lib, save);
	assert.ok(lib.config.forbidai_user.includes(bundledAiBans[0]));
	assert.ok(lib.config.forbidai.includes(bundledAiBans[0]));
});

test("recommended settings include actual card assets without importing account or ban state", async () => {
	const config = JSON.parse(await fs.readFile(new URL("../../apps/core/game/config.json", import.meta.url), "utf8"));
	assert.ok(bundledSettingKeys.includes("card_style") && bundledSettingKeys.includes("ui_zoom"));
	assert.ok(bundledSettingKeys.every(key => !/extension_|banned|forbid|hall|ip|version/.test(key)));
	await fs.access(new URL(`../../apps/core/theme/style/card/${config.card_style}.css`, import.meta.url));
	await fs.access(new URL(`../../apps/core/theme/style/cardback/${config.cardback_style}.css`, import.meta.url));
});
