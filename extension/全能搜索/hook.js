import { lib } from "../../noname.js";
import { getOtherModeData } from "./loadMode.js";

// 兼容别的扩展和低版本，所以改为只hook这四个属性
let card = lib.card;
const cardDescriptor = Object.getOwnPropertyDescriptor(lib, "card");

let characterPack = lib.characterPack;
const characterPackDescriptor = Object.getOwnPropertyDescriptor(
	lib,
	"characterPack"
);

let skill = lib.skill;
const skillDescriptor = Object.getOwnPropertyDescriptor(lib, "skill");

let translate = lib.translate;
const translateDescriptor = Object.getOwnPropertyDescriptor(
	lib,
	"translate"
);

/**
 * @template { "card" | "characterPack" | "skill" | "translate" } T
 * @type { Map<T, Library[T]> }
 */
const map = new Map();

export let loadModeReady = false;

// 初始化其他模式数据到map中
export const loadModeData = () => {
	getOtherModeData().then((array) => {
        loadModeReady = true;
		map.set(
			"card",
			array
				.map((v) => v.data.card)
				.flat(1)
				.reduce((previous, current) => {
					// 未考虑同属性覆盖问题
					return Object.assign(previous, current);
				}, {})
		);
		map.set(
			"characterPack",
			array
				.map((v) => v.data.characterPack)
				.flat(1)
				.reduce((previous, current) => {
					// 未考虑同属性覆盖问题
					return Object.assign(previous, current);
				}, {})
		);
		map.set(
			"skill",
			array
				.map((v) => v.data.skill)
				.flat(1)
				.reduce((previous, current) => {
					// 未考虑同属性覆盖问题
					return Object.assign(previous, current);
				}, {})
		);
		map.set(
			"translate",
			array
				.map((v) => v.data.translate)
				.flat(1)
				.reduce((previous, current) => {
					// 未考虑同属性覆盖问题
					return Object.assign(previous, current);
				}, {})
		);
	});
};

export const hook = () => {
	const errorLog = () =>
		console.error("[全能搜索]: 其他模式的数据加载失败！数据不可配置");
	if (
		[
			cardDescriptor,
			characterPackDescriptor,
			skillDescriptor,
			translateDescriptor,
		].every((descriptor) => {
			return !descriptor || descriptor.configurable === true;
		})
	) {
		const func = (prop, variable) => {
			return (
				Reflect.defineProperty(lib, prop, {
					configurable: true,
					enumerable: true,
                    writable: true,
                    value: (() => {
                        const result = map.get(prop) ?? {};
                        const data = Object.assign({}, variable, result);
                        return data;
                    })()
				})
			);
		};

		if (!func("card", card)) {
            restore();
			errorLog();
            return;
		}

		if (!func("characterPack", characterPack)) {
			restore();
			errorLog();
            return;
		}

		if (!func("skill", skill)) {
			restore();
			errorLog();
            return;
		}

		if (!func("translate", translate)) {
			restore();
			errorLog();
            return;
		}
	} else {
		errorLog();
	}
};

export const restore = () => {
	[
		{ key: 'card', descriptor: cardDescriptor },
        { key: 'characterPack', descriptor: characterPackDescriptor },
        { key: 'skill', descriptor: skillDescriptor },
        { key: 'translate', descriptor: translateDescriptor },
	].forEach(({ key, descriptor }) => {
		if (!descriptor || descriptor.configurable === true) {
            Reflect.defineProperty(lib, key, descriptor);
        }
	});
};