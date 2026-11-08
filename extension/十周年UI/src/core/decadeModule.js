/**
 * @fileoverview DecadeModule初始化模块，负责加载样式和资源
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createScriptElement, createLinkElement } from "./loader.js";
import { prefixMarkModule } from "../ui/prefixMark.js";

/** @type {Array<string>} 排除的游戏模式 */
const EXCLUDED_MODES = ["chess", "tafang", "hs_hearthstone"];

/** @type {Array<string>} 样式配置选项 */
const STYLE_OPTIONS = ["on", "off", "othersOff", "onlineUI", "babysha", "codename"];

/** @type {Object<string, string>} 样式到皮肤的映射 */
const STYLE_TO_SKIN = {
	on: "shizhounian",
	off: "shousha",
	othersOff: "xinsha",
	onlineUI: "online",
	babysha: "baby",
	codename: "codename",
};

/** @type {Object<string, number>} 样式到索引的映射 */
const STYLE_TO_INDEX = {
	on: 2,
	off: 1,
	othersOff: 3,
	onlineUI: 4,
	babysha: 5,
	codename: 6,
};

/**
 * 获取配置项值
 * @param {string} key - 配置键名
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
function getConfigValue(key, defaultValue) {
	const configKey = `extension_十周年UI_${key}`;
	const value = lib.config[configKey];
	return value !== undefined ? value : defaultValue;
}

/**
 * 初始化decadeModule
 * @returns {Object} 模块对象
 */
export function initDecadeModule() {

	if (!ui.css.layout) return {};
	if (!ui.css.layout.href?.includes("long2")) {
		ui.css.layout.href = `${lib.assetURL}layout/long2/layout.css`;
	}

	const module = {
		/**
		 * 加载JS文件
		 * @param {string} path - 文件路径
		 * @returns {HTMLScriptElement|null} script元素
		 */
		js: path => path && createScriptElement(path, false),
		/**
		 * 异步加载JS文件
		 * @param {string} path - 文件路径
		 * @returns {HTMLScriptElement|null} script元素
		 */
		jsAsync: path => path && createScriptElement(path, true),
		/**
		 * 加载CSS文件
		 * @param {string} path - 文件路径
		 * @returns {HTMLLinkElement|null} link元素
		 */
		css: path => path && createLinkElement(path),
		/** @type {Array<Function>} 模块列表 */
		modules: [],
		/**
		 * 导入模块
		 * @param {Function} mod - 模块函数
		 */
		import(mod) {
			if (typeof mod === "function") this.modules.push(mod);
		},
		prefixMark: prefixMarkModule,
	};

	/**
	 * 初始化模块
	 * @returns {Promise<Object>} this
	 */
	module.init = async function () {
		const cssFiles = ["src/styles/extension.css", "src/styles/decadeLayout.css", "src/styles/card.css", "src/styles/meihua.css"];
		cssFiles.forEach(path => this.css(`${decadeUIPath}${path}`));

		const style = getConfigValue("newDecadeStyle", "on");
		const styleIndex = STYLE_OPTIONS.indexOf(style);
		this.css(`${decadeUIPath}src/styles/player${styleIndex !== -1 ? styleIndex + 1 : 2}.css`);
		this.css(`${decadeUIPath}src/styles/equip.css`);
		this.css(`${decadeUIPath}src/styles/layout.css`);
		document.body.setAttribute("data-style", style);

		if (getConfigValue("meanPrettify", false)) {
			ui.css.decadeMenu = this.css(`${decadeUIPath}src/styles/menu.css`);
		}

		// 同步等待 spine.js 加载完成
		await this.js(`${decadeUIPath}src/libs/spine.js`);

	/*●*/
    window.zqGetWebviewVersion = function () {
        const userAgent = navigator.userAgent;
        const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        if (chromeMatch) return parseInt(chromeMatch[1], 10);
        try {
            if (typeof navigator.userAgentData !== 'undefined' && navigator.userAgentData.brands) {
                for (let i = 0; i < navigator.userAgentData.brands.length; i++) {
                    const brand = String(navigator.userAgentData.brands[i].brand).toLowerCase();
                    if (brand.indexOf('chrome') !== -1 || brand.indexOf('chromium') !== -1) {
                        const version = parseInt(navigator.userAgentData.brands[i].version, 10);
                        if (!isNaN(version)) return version;
                    }
                }
            }
        } catch (e) {}
        return 0;
    };
    game.zqWebVersion = window.zqGetWebviewVersion(); //获取webview版本号
		this.js(`${decadeUIPath}zq/js/pause.js`);
		this.js(`${decadeUIPath}zq/js/meihua.js`);
		this.css(`${decadeUIPath}zq/css/meihua.css`);
		if(lib.config.extension_十周年UI_shoushatexiao) this.js(`${decadeUIPath}zq/js/texiao.js`);
		if(lib.config.extension_十周年UI_newDecadeStyle=='off') {
		    this.css(`${decadeUIPath}zq/css/shousha.css`);
		    this.css(`${decadeUIPath}zq/css/shoushalog.css`);
	    	if(!lib.config.extension_十周年UI_aloneEquip) this.css(`${decadeUIPath}zq/css/equip.css`);
	    	if(lib.config.player_style=='simple') this.css(`${decadeUIPath}zq/css/simple.css`);
	    }
		if(lib.config.extension_十周年UI_smallsuit) this.css(`${decadeUIPath}zq/css/smallsuit.css`);
		if(lib.config.extension_十周年UI_xuanjiang) this.css(`${decadeUIPath}zq/css/xuanjiang.css`);
		if(lib.config.extension_十周年UI_juexingji){
		    if(lib.config.extension_十周年UI_newDecadeStyle=='othersOff') this.css(`${decadeUIPath}zq/css/juexingji1.css`);
		    else if(lib.config.extension_十周年UI_newDecadeStyle=='off') this.css(`${decadeUIPath}zq/css/juexingji2.css`);
		    else if(lib.config.extension_十周年UI_newDecadeStyle=='onlineUI' || lib.config.extension_十周年UI_newDecadeStyle=='babysha') this.css(`${decadeUIPath}zq/css/juexingji3.css`);
		} 

		const currentMode = get.mode();
		const isPhoneLayout = lib.config.phonelayout;

		if (!EXCLUDED_MODES.includes(currentMode)) {
			const skinName = STYLE_TO_SKIN[style] || "shizhounian";
			const uiPath = `${decadeUIPath}ui/`;

			this.css(`${uiPath}styles/fonts.css`);
			this.css(`${uiPath}styles/base.css`);
			this.css(`${uiPath}styles/character/${skinName}.css`);
			this.css(`${uiPath}styles/lbtn/${skinName}.css`);
			
			if (skinName == 'shousha' && game.zqWebVersion && game.zqWebVersion > 149) this.css(`${uiPath}styles/skill/shousha2.css`); else this.css(`${uiPath}styles/skill/${skinName}.css`);//●

			if (!isPhoneLayout) {
				this.css(`${uiPath}styles/lbtn/window/${skinName}.css`);
				this.css(`${uiPath}styles/skill/window/${skinName}.css`);
			}
		}

		// 初始化亮将钩子
		this.prefixMark.setupShowCharacterHook();

		return this;
	};

	return module.init();
}

export { EXCLUDED_MODES };
