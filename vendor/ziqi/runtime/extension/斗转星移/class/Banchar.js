import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import dzxy from "./Dzxy.js";
import { DBtn, DEle } from "./baseEle.js";
import { ScreenAdapter } from "./ScreenAdapter.js";
/**方案框 */
export class PlanFrame extends DEle {
	constructor() {
		super(ui.create.div(".dz-planFrame"));
		this.init();
	}
	init() {
		this.title = ui.create.div(".dz-title", this.ele);
		this.setting = ui.create.div(".dz-setting", this.ele);
		this.cont = ui.create.div(".dz-cont", this.ele);
		this.btnList = [];
	}
	addBtn(obj) {
		this.btnList.push(obj);
		this.cont.appendChild(obj.ele);
	}
}
/**方案按钮 */
export class PlanBtn extends DBtn {
	constructor(name, index) {
		super(ui.create.div(".dz-planBtn"));
		this.name = name;
		this.index = index;
		this.nameEle = ui.create.div(".dz-btn-text", this.name, this.ele);
		this.banList = [];
		//当前
		this.itemCur = ui.create.div(".jj-item-cur", this.ele);
		//序号
		this.pan = ui.create.div(".will-pan", this.ele);
		this.pan.setBackgroundImage(`${dzxy.path}image/banChar/will_pan${index}.png`);
		//编辑
		this.edit = ui.create.div(".dz-edit", this.ele);
	}
}
/**主体框 */
export class MainFrame extends DEle {
	constructor() {
		//这里后面要在补个空白层
		super(ui.create.div(".dz-mainFrame"));
		this.init();
	}
	init() {
		this.top = ui.create.div(".sp-kdiv", this.ele);
		this.topCont = ui.create.div(".kdiv.left", this.top);
		dzxy.scroll_lr(this.topCont, 150);
		this.topBtnList = [];
		//主体
		this.main = ui.create.div(".jj-contentBg", this.ele);
		this.mainCont = ui.create.div(".kdiv", this.main, { height: "100%" });
		//底部
		this.bottom = ui.create.div(".sp-kdiv", this.ele);
		this.bottomCont = ui.create.div(".kdiv.left", this.bottom);
		dzxy.scroll_lr(this.bottomCont, 150);
		this.bottomBtnList = [];
	}
	topAddBtn(obj, index) {
		this.topBtnList.push(obj);
		if (typeof index == "number" && this.topCont.childNodes.length > index) {
			this.topCont.insertBefore(obj.ele, this.topCont.childNodes[index]);
		} else {
			this.topCont.appendChild(obj.ele || obj);
		}
	}
	bottomAddBtn(obj, index) {
		this.bottomBtnList.push(obj);
		if (typeof index == "number" && this.bottomCont.childNodes.length > index) {
			this.bottomCont.insertBefore(obj.ele, this.bottomCont.childNodes[index]);
		} else {
			this.bottomCont.appendChild(obj.ele || obj);
		}
	}
	addBanCharCont() {
		/**可禁 */
		this.tableCan = ui.create.div(".table-will-can", this.mainCont);
		this.cont1 = ui.create.div(".kdiv", this.mainCont);
		/**已禁 */
		this.tableBan = ui.create.div(".table-will-ban", this.mainCont);
		this.cont2 = ui.create.div(".kdiv", this.mainCont);
	}
	resetBanCharCont() {
		this.mainCont.innerHTML = "";
		this.addBanCharCont();
	}
}
//禁将主体框 仅点将可用特殊处理
export class MainFramex extends MainFrame {
	addBanCharCont() {
		this.tableCan = ui.create.div(".table-will-blank", "仅点将可用", this.mainCont);
		this.cont1 = ui.create.div(".kdiv", this.mainCont);
		this.tableBan = ui.create.div(".table-will-blank", "全部可用", this.mainCont);
		this.cont2 = ui.create.div(".kdiv", this.mainCont);
	}
}
//主体顶部按钮
export class MainFrameTopBtn extends DBtn {
	ID;
	name;
	charList = [];
	charList2 = [];
	constructor(ID, name) {
		super(ui.create.div(".jj-charPackBtn"));
		this.ID = ID;
		this.name = name;
	}
	setText() {
		let len1 = this.charList.length,
			len2 = this.charList2.length;
		this.ele.innerHTML = '<span style="font-size:22px;font-family:shousha;color:#DFDAD4;">' + this.name + "</span>" + "<br>" + len1 + "/" + len2;
		len1 ? this.ele.classList.remove("opacity4") : this.ele.classList.add("opacity4");
	}
}
/**武将 小 */
export class Character extends DBtn {
	ID;
	nameEle;
	charPic;
	banPic;
	isBan;
	isSkin = false;
	constructor(ID, flag) {
		super(ui.create.div(".jj-char-base-back"));
		this.ID = ID;
		this.name = flag === true ? lib._cust_translate[ID] : get.translation(ID);
		this.ele2 = ui.create.div(".jj-char-base-back2", this.ele);
		this.charBg = ui.create.div(".jj-charBg2", this.ele2);
		this.frame = ui.create.div(".jj-charFrame", this.ele2);
		this.frame.hide();

		//武将图
		if (lib.config[`${dzxy.dz}xiaotouxiang`] && dzxy.xiaotouxiang.includes(ID)) {
			this.charPic = ui.create.div(".jj-charPic-ss", this.ele2);
			this.charPic.setBackgroundImage("extension/斗转星移/image/char/" + ID + ".jpg");
		} else {
			this.charPic = ui.create.div(".jj-charPic", this.ele2);
			this.charPic.qhly_origin_setBackground?.(ID, "character") || this.charPic.setBackground(ID, "character");
			let style = lib.config[`${dzxy.dz}bancharImgStyle`];
			if (style) {
				this.charPic.style.backgroundSize = style[0];
				this.charPic.style.backgroundPositionY = style[1];
			}
		}
		this.selfSel = ui.create.div(".jj-self-selected.hidden", this.ele2);
		this.nameEle = ui.create.div(".jj-charName", this.name, this.charPic);
		this.banPic = ui.create.div(".jj-banPic", this.charPic);
		this.notban();
		//加颜色
		let double = get.is.double(ID, true);
		let dzcharacter = flag === true ? lib._cust_character : dzxy.character;
		if (!lib.config[`${dzxy.dz}banCharGroupColor`]) this.nameEle.style.backgroundColor = dzxy.getGroupColor("close");
		else if (double) {
			let color1 = dzxy.getGroupColor(double[0]);
			let color2 = dzxy.getGroupColor(double[1]);
			this.nameEle.style.background = `linear-gradient(to right,${color1},${color2})`;
		} else this.nameEle.style.backgroundColor = dzxy.getGroupColor(dzcharacter[ID][1]);
	}
	ban() {
		this.isBan = true;
		this.banPic.show();
	}
	notban() {
		this.isBan = false;
		this.banPic.hide();
	}
	notDisplay() {
		this.ele.classList.add("not-display");
	}
	display() {
		this.ele.classList.remove("not-display");
	}
	showFrame() {
		this.charBg.hide();
		this.frame.show();
		this.charPic.classList.add("jj-frame-size");
		this.charPic.style.borderRadius = "5px";
	}
	showSelfSel(type) {
		this.selfSel.dataset.type = type;
		this.selfSel.show();
	}
	hideSelfSel() {
		this.selfSel.hide();
	}
}

/**禁将功能的实现 */
export class BanChar {
	/**修改武将包并加入顶部按钮 */
	modCharPack() {
		//解决启动页重启问题
		if (!dzxy.loadedSplash) dzxy.loadedSplash = [];
		let fixRestart = true; //出现报错的话把true改成false
		if (fixRestart && lib.onloadSplashes != undefined) {
			//开始的启动页
			let originSplash = lib.onloadSplashes.find(item => item.id === lib.config.splash_style);
			if (!originSplash) originSplash = lib.onloadSplashes[0];
			if (dzxy.loadedSplash.includes(originSplash.id)) return;
			dzxy.loadedSplash.push(originSplash.id);
			//覆盖init的回调
			let originSplashInit = originSplash.init;
			originSplash.init = function (node, resolve) {
				let originResolve = resolve;
				resolve = function (mode) {
					let n = lib.config[`${dzxy.dz}modePlan`]?.[mode];
					if (lib.config[`${dzxy.dz}autoOpenPack`] && n != undefined) {
						if (lib.config[`${dzxy.dz}plan${n}`]?.["pack"] != undefined) {
							dzxy.tempMode = mode;
							//这里会导致删除扩展武将包仍有存留的问题
							lib.config.characters = lib.config[`${dzxy.dz}plan${n}`]["pack"].slice();
						}
					}
					return originResolve(mode);
				};
				return originSplashInit.apply(this, [node, resolve]);
			};
		}

		let n = lib.config[`${dzxy.dz}modePlan`]?.[lib.config.mode];
		if (lib.config[`${dzxy.dz}autoOpenPack`] && n != undefined) {
			if (lib.config[`${dzxy.dz}plan${n}`]?.["pack"] != undefined) {
				dzxy.tempMode = lib.config.mode;
				//这里会导致删除扩展武将包仍有存留的问题
				lib.config.characters = lib.config[`${dzxy.dz}plan${n}`]["pack"].slice();
			}
		}
		if (lib.config[`${dzxy.dz}autoOpenPack`] && lib.config[`${dzxy.dz}plan4`]?.["banList"] != undefined) dzxy.originSaveConfig("forbidai_user", lib.config[`${dzxy.dz}plan4`]["banList"].slice());
	}
	/** 禁将功能判断模式重启 */
	checkReload() {
		if (dzxy.tempMode && lib.config.mode != dzxy.tempMode) {
			game.reload();
		}
	}
	/** 初始武将包，用于初始页面加载*/
	initPack;
	plan4 = 4;
	/**初始化方案 */
	initPlan(flag) {
		/*●*/
		const banPacks = lib.config.all.characters.filter(p => !lib.config.characters.includes(p));
		const dzcharPack = flag === true ? lib._cust_characterPack : dzxy.charPack;
        const banSet = new Set();
         for (const pack of banPacks) {
             if (dzcharPack[pack]) {
                 for (const charId of Object.keys(dzcharPack[pack])) {
                     banSet.add(charId);
                 }
             }
         }

		let defaultNames = ["无", "方案一", "方案二", "方案三", "仅点将可用", "方案四", "方案五"];
		//无
		lib.config[`${dzxy.dz}plan0`] = {
			name: defaultNames[0], //方案名
			banList: [], //禁用武将
			pack: flag === true ? lib.config.all.characters : dzxy.allPackList.slice(), //开启的武将包
		};
		dzxy.saveCF("plan0");
		//方案123
		for (let i = 1; i <= 6; i++) {
			if (i == 4) continue;
			if (lib.config[`${dzxy.dz}plan${i}`] != undefined) continue;
			lib.config[`${dzxy.dz}plan${i}`] = {
				name: defaultNames[i],
				banList: Array.from(banSet),
				pack: flag === true ? lib.config.all.characters : dzxy.allPackList.slice(),
			};
			dzxy.saveCF("plan" + i);
		}
		if (lib.config[`${dzxy.dz}plan4`] == undefined)
			lib.config[`${dzxy.dz}plan4`] = {
				name: "仅点将可用",
				banList: [],
				pack: flag === true ? lib.config.all.characters : dzxy.allPackList.slice(),
			};
		dzxy.saveCF("plan4");
	}
	/**初始化模式选用的方案 */
	initModePlan() {
		dzxy.initCF("modePlan", {});
		for (let mode of lib.config.all.mode) {
			if (lib.config[`${dzxy.dz}modePlan`][mode] == undefined) lib.config[`${dzxy.dz}modePlan`][mode] = 1; /*●*/
		}
	}
	/**初始化小头像参数 */
	initBancharImgStyle() {
		dzxy.initCF("bancharImgStyle", ["100%", "0%"]); //大小和y偏移
	}
	/**打开禁将页面 */
	openPage(flag) {
		if (flag === true) {
			if (!lib._cust_character) {
				lib._cust_character = {};
				lib._cust_characterPack = {
					all:{}
				};
				lib._cust_translate = {
					all: "全部",
					all_character_config: "全部",
					...lib.translate,
				};
				Object.keys(lib.imported.character).forEach(key => {
					let characters = lib.imported.character[key].character;
					let translate = lib.imported.character[key].translate;
					lib._cust_translate = {
						...lib._cust_translate,
						...translate,
					};

					lib._cust_characterPack[key] = {};
					Object.keys(characters).forEach(character => {
						let characterData = characters[character];
						lib._cust_character[character] = characterData;
						lib._cust_characterPack[key][character] = characterData;
						lib._cust_characterPack.all[character] = characterData
					});
				});
				// }
			}
		}
		this.initBancharImgStyle();
		this.initModePlan();
		this.initPlan(flag);
		this.bigBg = dzxy.create.bigBg(document.body, "image/banChar/bg_ss.png");
		this.bigBg.addEventListener("touchmove", e => {
			e.stopPropagation();
		});
		ScreenAdapter.add({
			node: this.bigBg,
			scale: window.inSplash ? 0.95 : 1,
			callback: (node, scale) => {
				node.style.zoom = scale;
			},
		});
		this.backBtn = dzxy.create.back(this.bigBg, () => {
			this.backBtnClick(flag);
		});
		this.planFrame = new PlanFrame();
		this.planFrame.setting.addEventListener("click", () => {
			this.settingClick(flag);
		});
		this.planFrame.setParentNode(this.bigBg);
		for (let i = 1; i <= 6; i++) {
			//方案按钮
			let planBtn = new PlanBtn(lib.config[`${dzxy.dz}plan${i}`]["name"], i);
			planBtn.banList = lib.config[`${dzxy.dz}plan${i}`]["banList"];
			this.planFrame.addBtn(planBtn);
			planBtn.setClick(() => {
				dzxy.playAudio("audio/base/click2.mp3");
				this.planBtnClick(planBtn, flag);
			});
			planBtn.edit.addEventListener("click", e => {
				e.stopPropagation();
				this.editBtnClick(planBtn, flag);
			});
		}
		//
		this.searchFilter = ui.create.div(".search-filter-area", this.bigBg);
		//打开页面时自动点击第一个
		this.planBtnClick(this.planFrame.btnList[0], flag);
	}
	/**退出保存 */
	backBtnClick(flag) {
		//●保存每个模式的禁将
		let cn = lib.config[`${dzxy.dz}modePlan`]["connect"];
		var ct = lib.config[`${dzxy.dz}plan${cn}`]["banList"]; 
		for (let mode of lib.config.all.mode) {
			let n = lib.config[`${dzxy.dz}modePlan`][mode];
			dzxy.originSaveConfig(mode + "_banned", lib.config[`${dzxy.dz}plan${n}`]["banList"]);
			game.saveConfig("connect_" + mode + "_banned", ct);
		}

		//保存每个方案开启的武将包
		for (let i of this.planFrame.btnList) {
			if (!i.tempPack) continue;
			let savePack = [];
			for (let j of i.tempPack) {
				if (j.charList.length && j.ID != "all") savePack.add(j.ID);
			}
			lib.config[`${dzxy.dz}plan${i.index}`]["pack"] = savePack.slice();
			dzxy.saveCF("plan" + i.index);
		}
		//保存仅点将可用
		dzxy.originSaveConfig("forbidai_user", lib.config[`${dzxy.dz}plan4`]["banList"]);
		this.bigBg.delete();
	}
	//编辑
	editBtnClick(planBtn) {
		if (planBtn.index == this.plan4) {
			dzxy.create.bottomBarTip("该方案名不可编辑", this.bigBg);
			return;
		}
		dzxy.create.input(
			this.bigBg,
			function () {
				if (!this.input.value.length) {
					this.remove();
					return;
				}
				let text = this.input.value.slice(0, 4);
				planBtn.nameEle.innerHTML = text;
				lib.config[`${dzxy.dz}plan${planBtn.index}`]["name"] = text;
				planBtn.name = text;
				this.remove();
			},
			null,
			planBtn.name
		);
	}
	/**方案设置 */
	settingClick(flag) {
		let bg = dzxy.create.bigBg(this.bigBg, true);
		bg.addEventListener("click", function () {
			dzxy.saveCF("modePlan");
			this.delete();
		});

		let setFrame = dzxy.create.setFrame(bg, "820px", "425px");
		let nameList = [];
		for (let i = 0; i <= 6; i++) {
			nameList.push(lib.config[`${dzxy.dz}plan${i}`]["name"]);
		}
		setFrame.cont.innerHTML = /*html*/ `
    <div class='jj-planNames'>
      <div class='mode-title'>游戏模式</div>
      <div class='jj-planNames'>
        <div class='jj-planName'>${nameList[0]}</div>
        <div class='jj-planName'>${nameList[1]}</div>
        <div class='jj-planName'>${nameList[2]}</div>
        <div class='jj-planName'>${nameList[3]}</div>
        <div class='jj-planName'>${nameList[5]}</div>
        <div class='jj-planName'>${nameList[6]}</div>
      </div>
    </div>`;

		let modeArea = ui.create.div(".kdiv", setFrame.cont);
		modeArea.style.height = "calc(100% - 50px)";

		for (let mode of lib.config.all.mode) {
			let item = ui.create.div(".hor-item", modeArea);
			ui.create.div(".mode-title", flag === true ? lib._cust_translate[mode] : get.translation(mode), item);
			let subplans = ui.create.div(".subplans", item);
			for (let n = 0; n <= 6; n++) {
				if (n == 4) continue;
				let plan = new DBtn(ui.create.div(lib.config[`${dzxy.dz}modePlan`][mode] == n ? ".subplan.active" : ".subplan", subplans));
				plan.setClick(() => {
					plan.active(subplans);
					lib.config[`${dzxy.dz}modePlan`][mode] = n;
				});
			}
		}
	}
	/**方案点击 */
	planBtnClick(planBtn, flag) {
		planBtn.active(this.bigBg);
		let last = this.bigBg.querySelector(".dz-mainFrame");
		if (last) last.remove();

		let mainFrame = new MainFrame();
		if (planBtn.index == this.plan4) {
			mainFrame = new MainFramex();
		}
		mainFrame.resetBanCharCont();
		mainFrame.setParentNode(this.bigBg);

		let banTitle = ui.create.div('.dz-title', '禁将', mainFrame.ele); banTitle.style.cssText = 'position:absolute;top:-65px;left:50%;transform:translateX(-50%);font-size:28px;font-family:shousha;color:#FFD27F;text-shadow:0px 0px 2px black,0px 0px 2px black;z-index:5;'; //●禁将标题

		let dzcharacter = flag === true ? lib._cust_character : dzxy.character;
		let packList = flag === true ? lib.config.all.characters : dzxy.allPackList;
		console.log("dzxy.charPack", dzxy.charPack);
		let allCharPack =  ["all", ...packList];
		for (let i of allCharPack) {
			//i是武将包
			/**武将包按钮 */
			let trasnConfig = flag === true ? lib._cust_translate[i + "_character_config"] : dzxy.translate[i + "_character_config"];
			let packBtn = new MainFrameTopBtn(i, trasnConfig);
			let dzcharPack = flag === true ? lib._cust_characterPack : dzxy.charPack;
			for (let n in dzcharPack[i]) {
				//n是武将名
				if (dzcharacter[n][4] && dzcharacter[n][4].includes("unseen")) continue;
				//仅点将特殊处理
				if (planBtn.index == this.plan4) {
					if (planBtn.banList.includes(n)) packBtn.charList.push(n);
				} else if (!planBtn.banList.includes(n)) packBtn.charList.push(n);
				packBtn.charList2.push(n);
			}
			packBtn.setText();
			packBtn.setClick(() => {
				this.packBtnClick(planBtn, packBtn, flag);
			});
			mainFrame.topAddBtn(packBtn);
		}
		planBtn.tempPack = mainFrame.topBtnList;

		//功能按钮
		/**全部禁用 */
		let allBanBtn = ui.create.div(".jj-gnBtn", "全部禁用", mainFrame.bottomCont, () => this.allBanClick());
		/**全部开启 */
		let allOpenBtn = ui.create.div(".jj-gnBtn", "全部开启", mainFrame.bottomCont, () => this.allOpenClick());
		/**导出方案 */
		let outputBtn = ui.create.div(".jj-gnBtn", "导出方案", mainFrame.bottomCont);
		outputBtn.addEventListener("click", () => {
			this.outputClick(flag);
		});
		/**导入方案 */
		let inputBtn = ui.create.div(".jj-gnBtn", "导入方案", mainFrame.bottomCont);
		inputBtn.addEventListener("click", () => {
			this.inputClick(flag);
		});
		/**原画调节 */
		let adjustBtn = ui.create.div(".jj-gnBtn", "原画调节", mainFrame.bottomCont);
		adjustBtn.addEventListener("click", () => {
			this.adjustClick(flag);
		});
		/**反选 */
		let reverseBtn = ui.create.div(".jj-gnBtn", "反选", mainFrame.bottomCont, () => this.reverseClick(flag));
		/**分包 */
		let sortPackBtn = ui.create.div(".jj-gnBtn", "切换分包", mainFrame.bottomCont, () => this.sortPack(flag));
		//初始自动点击武将包
		let offset = 0;
		if (!this.initPack || this.initPack.ID == "all") {
			this.packBtnClick(planBtn, mainFrame.topBtnList[1], flag);
		} else {
			this.initPack = mainFrame.topBtnList.find(i => i.ID == this.initPack.ID);
			offset = this.initPack.ele.offsetLeft;
			this.packBtnClick(planBtn, this.initPack, flag);
		}
		mainFrame.topCont.scrollTo(offset - 250, 0);
	}
	/**武将包点击 */
	async packBtnClick(planBtn, packBtn, flag) {
		//全部武将按钮特殊处理
		let inputText;
		let p = new Promise(res => {
			if (packBtn.ID == "all") {
				dzxy.create.input(
					this.bigBg,
					function () {
						if (!this.input.value.length) {
							this.remove();
							res();
						}
						inputText = this.input.value.split(" ");
						this.remove();
						res();
					},
					"请输入武将名进行搜索，多个之间用空格隔开",
					""
				);
			} else {
				res();
			}
		});
		await p;
		this.searchFilter.innerHTML = "";
		this.bigBg.classList.remove("banChar-filter");
		if (inputText) {
			this.bigBg.classList.add("banChar-filter");
			inputText.forEach(i => {
				let btn = new DBtn(ui.create.div(".char-name-btn", i, this.searchFilter));
				btn.setClick(() => {
					btn.active(this.searchFilter);
					let allChar = this.bigBg.querySelectorAll(".jj-char-base-back");
					for (let ch of allChar) {
						if (String(ch.source.name).indexOf(i) == -1 && String(ch.source.ID).indexOf(i) == -1) ch.source.notDisplay();
						else ch.source.display();
					}
				});
			});
		}

		packBtn.active(this.bigBg, ".jj-charPackBtn.active");
		this.initPack = packBtn;
		let mainFrame = this.bigBg.querySelector(".dz-mainFrame");
		let bancharSortPack = dzxy.getCF("bancharSortPack");
		bancharSortPack ? (mainFrame.source.mainCont.innerHTML = "") : mainFrame.source.resetBanCharCont();
		mainFrame.source.mainCont.scrollTo(0, 0);
		//缝缝补补
		if (bancharSortPack) {
			let isAll = packBtn.ID == "all" ? true : false;
			let otherSort = packBtn.charList2.slice();

			let func = packObj => {
				for (let i in packObj) {
					let translate = isAll ? dzxy.translate[i + "_character_config"] : get.translation(i);
					if (flag === true) {
						translate = isAll ? lib._cust_translate[i + "_character_config"] : lib._cust_translate[i];
					}
					console.log("translate", translate);
					let table = ui.create.div(".table-will-blank", translate, mainFrame.source.mainCont);
					let cont = ui.create.div(".kdiv", mainFrame.source.mainCont);
					for (let c of packObj[i]) {
						let dzcharacter = flag === true ? lib._cust_character : dzxy.character;

						if (!dzcharacter[c]) continue;
						if (dzcharacter[c]?.[4]?.includes("unseen")) continue;
						otherSort.remove(c);
						//全部武将按钮特殊处理
						if (inputText) {
							let find = inputText.some(j => String(flag === true ? lib._cust_translate[c] : get.translation(c)).indexOf(j) != -1 || String(c).indexOf(j) != -1);
							if (!find) continue;
						}
						let char = new Character(c, flag);
						if (packBtn.charList.includes(c)) {
							//不禁
							char.notban();
							char.setParentNode(cont);
						} else {
							char.ban();
							char.setParentNode(cont);
						}
						char.setClick(() => {
							//仅点将可用特殊处理
							if (planBtn.index == this.plan4) this.charClick2(planBtn, packBtn, char);
							else this.charClick(planBtn, packBtn, char);
						});

						//★ 长按改为显示技能弹窗（与选将面板的提示一致），不再打开武将资料页
						dzxy.addLongPress(char.ele, evt => dzxy.showCharSkillTip(char.ID, evt));
					}
				}
				for (let i of mainFrame.source.mainCont.querySelectorAll(".kdiv")) {
					if (i.children.length == 0) {
						i.previousSibling.remove();
						i.remove();
					}
				}
			};
			if (packBtn.ID == "all") {
				let packObj = {};
				if (flag === true) {
					for (let i of lib.config.all.characters) {
						packObj[i] = Object.keys(lib._cust_characterPack[i]);
					}
				} else {
					for (let i of dzxy.allPackList) {
						packObj[i] = Object.keys(dzxy.charPack[i]);
					}
				}

				func(packObj);
			} else {
				let packObj = {};
				let SortPack = lib.characterSort[packBtn.ID];
				if (SortPack) func(SortPack);
				else {
					let dzcharPack = flag === true ? lib._cust_characterPack : dzxy.charPack;

					packObj["全部"] = Object.keys(dzcharPack[packBtn.ID]);
					func(packObj);
				}
				if (otherSort.length) {
					let packObj2 = {
						其他: otherSort.slice(),
					};
					func(packObj2);
				}
			}
		} else {
			for (let i of packBtn.charList2) {
				//全部武将按钮特殊处理
				if (inputText) {
					let find = inputText.some(j => String(flag === true ? lib._cust_translate[i] : get.translation(i)).indexOf(j) != -1 || String(i).indexOf(j) != -1);
					if (!find) continue;
				}

				let char = new Character(i, flag);
				if (packBtn.charList.includes(i)) {
					//不禁
					char.notban();
					char.setParentNode(mainFrame.source.cont1);
				} else {
					char.ban();
					char.setParentNode(mainFrame.source.cont2);
				}
				char.setClick(() => {
					//仅点将可用特殊处理
					if (planBtn.index == this.plan4) this.charClick2(planBtn, packBtn, char);
					else this.charClick(planBtn, packBtn, char);
				});

				//★ 长按改为显示技能弹窗（与选将面板的提示一致），不再打开武将资料页
				dzxy.addLongPress(char.ele, evt => dzxy.showCharSkillTip(char.ID, evt));
			}
		}
	}
	/**正常方案的点击武将 */
	charClick(planBtn, packBtn, char) {
		if (!char.isBan) {
			//处于未禁用状态
			char.ban();
			packBtn.charList.remove(char.ID);
			planBtn.banList.add(char.ID);
		} else {
			char.notban();
			packBtn.charList.add(char.ID);
			planBtn.banList.remove(char.ID);
		}
		packBtn.setText();
	}
	/**仅点将可用特殊处理 点击武将 */
	charClick2(planBtn, packBtn, char) {
		if (!char.isBan) {
			//处于未禁用状态
			char.ban();
			packBtn.charList.remove(char.ID);
			planBtn.banList.remove(char.ID);
		} else {
			char.notban();
			packBtn.charList.add(char.ID);
			planBtn.banList.add(char.ID);
		}
		packBtn.setText();
	}
	/**全部禁用*/
	allBanClick() {
		let chars = this.bigBg.querySelectorAll(".jj-char-base-back");
		let packAct = this.bigBg.querySelector(".jj-charPackBtn.active").source;
		let planAct = this.bigBg.querySelector(".dz-planBtn.active").source;
		for (let i of chars) {
			//仅点将可用特殊处理
			if (planAct.index == this.plan4) planAct.banList.remove(i.source.ID);
			else planAct.banList.add(i.source.ID);
			i.source.ban();
		}
		packAct.charList = [];
		packAct.setText();
	}
	/**全部开启 */
	allOpenClick() {
		let chars = this.bigBg.querySelectorAll(".jj-char-base-back");
		let packAct = this.bigBg.querySelector(".jj-charPackBtn.active").source;
		let planAct = this.bigBg.querySelector(".dz-planBtn.active").source;
		for (let i of chars) {
			//仅点将可用特殊处理
			if (planAct.index == this.plan4) planAct.banList.add(i.source.ID);
			else planAct.banList.remove(i.source.ID);
			i.source.notban();
		}
		packAct.charList = packAct.charList2.slice();
		packAct.setText();
	}
	/**导出方案 */
	outputClick(flag) {
		let bg = dzxy.create.bigBg(this.bigBg, true, function () {
			this.remove();
		});

		let frame = dzxy.create.setFrame(bg);
		let text = ui.create.div(".kdiv.left", frame.cont);
		text.style.margin = "30px 0 25px";
		let planAct = this.bigBg.querySelector(".dz-planBtn.active").source;
		text.innerHTML = '<span style="word-break:break-all;font-size:22px;font-family:shousha;color:#65532f;text-shadow:none;">' + "路径:斗转星移/data/outputPlan<br>" + "此操作将会在路径下保存(" + planAct.name + ")方案，若存在同名文件则会覆盖，是否确认导出此方案?" + "</span>";

		let chooseList = ["导出已禁用的武将列表", "导出已启用的武将列表"];
		let choose = chooseList[0];
		for (let i = 0; i < chooseList.length; i++) {
			let btn = new DBtn(ui.create.div(chooseList[i] == choose ? ".hor-item.active" : ".hor-item", chooseList[i], frame.cont));
			btn.setClick(() => {
				btn.active(frame.cont);
				choose = chooseList[i];
			});
		}

		dzxy.create.ok(frame.cont, () => {
			let path = `${dzxy.path}data/outputPlan/`;
			let list = [];

			//仅点将特殊处理
			let tempChooseList = ["导出已禁用的武将列表", "导出已启用的武将列表"];
			if (planAct.index == this.plan4) tempChooseList = ["导出已启用的武将列表", "导出已禁用的武将列表"];

			if (choose == tempChooseList[0]) {
				list = planAct.banList.slice();
			} else {
				let charPack = flag === true ? lib._cust_characterPack : dzxy.charPack;
				let dzcharacter = flag === true ? lib._cust_character : dzxy.character;

				for (let i in charPack) {
					//i是武将包
					if (i == "all") continue;
					for (let n in charPack[i]) {
						//n是武将名
						if (dzcharacter[n][4] && dzcharacter[n][4].includes("unseen")) continue;
						if (!planAct.banList.includes(n)) list.push(n);
					}
				}
			}

			let str = JSON.stringify(list);
			let suffix = choose == chooseList[0] ? "[禁]" : "[开]";
			game.writeFile(str, path, planAct.name + suffix, () => {
				alert("操作完成");
			});
		});
	}
	/**导入方案 */
	inputClick(flag) {
		let bg = dzxy.create.bigBg(this.bigBg, true, function () {
			this.remove();
		});
		let frame = dzxy.create.setFrame(bg);
		let planAct = this.bigBg.querySelector(".dz-planBtn.active").source;

		let dir = "inputPlan";
		let dirEle = ui.create.div(".kdiv.right", dir, frame.cont);
		dirEle.addEventListener("click", function () {
			dir = dir == "inputPlan" ? "outputPlan" : "inputPlan";
			this.innerHTML = dir;
			dirClick(dir);
		});

		let text = ui.create.div(".kdiv.left", frame.cont);
		text.style.margin = "10px 0px 10px";

		let plans = ui.create.div(".kdiv", frame.cont);
		plans.style.height = "140px";
		plans.style.marginBottom = "15px";
		// plans.style.backgroundColor = "#dae6da";
		let choose;
		dirClick(dir);
		function dirClick(dir) {
			game.getFileList(
				`${dzxy.path}data/${dir}`,
				(folders, files) => {
					text.innerHTML = '<span style="font-size:22px;color:#65532f;text-shadow:none;">' + "选择路径斗转星移/data/" + dir + "下的一个方案覆盖当前方案(" + planAct.name + ")</span>";
					plans.innerHTML = "";
					choose = undefined;
					for (let i of files) {
						let btn = new DBtn(ui.create.div(".fy-btn", i, plans));
						btn.setClick(() => {
							btn.active(plans);
							choose = i;
						});
					}
				},
				() => {
					alert(`请检查文件夹路径extension/斗转星移/data/${dir}是否完整`);
				}
			);
		}

		dzxy.create.ok(frame.cont, () => {
			if (choose == undefined) {
				alert("请选择要导入的方案");
				return;
			}
			game.readFileAsText(`${dzxy.path}data/${dir}/` + choose, data => {
				let list;
				try {
					list = eval(data); //兼容最初的版本数据
				} catch (e) {
					alert("该文件数据错误");
				}
				if (Array.isArray(list)) {
					let index = planAct.index;
					lib.config[`${dzxy.dz}plan${index}`]["banList"] = list.slice();
					planAct.banList = lib.config[`${dzxy.dz}plan${index}`]["banList"];
					dzxy.saveCF("plan" + index);
					alert("导入成功");
					this.planBtnClick(planAct, flag);
				} else alert("该文件数据错误");
			});
		});
	}
	/**调节武将图 */
	adjustClick() {
		let bg = dzxy.create.bigBg(this.bigBg, true, function () {
			dzxy.saveCF("bancharImgStyle");
			this.remove();
		});
		let frame = dzxy.create.setFrame(bg, "400px", "200px");
		frame.cont.style.display = "flex";
		frame.cont.style.flexDirection = "column";
		frame.cont.style.left = "6%";
		frame.cont.style.justifyContent = "space-around";

		let imgData = lib.config[`${dzxy.dz}bancharImgStyle`];
		let adjust = (data, change, ele, type) => {
			let num = parseInt(data);
			type == "jia" ? (num += change) : (num -= change);
			num = String(num) + "%";
			ele.innerHTML = num;
			return num;
		};
		//原画大小
		let sizeBox = ui.create.div(".sp-kdiv2", frame.cont);
		ui.create.div(".ss-text2", "原画大小", sizeBox);
		ui.create.div(".dz-jian", sizeBox, () => {
			imgData[0] = adjust(imgData[0], 10, sizetext, "jian");
		});
		let sizetext = ui.create.div(".ss-text2", sizeBox);
		sizetext.innerHTML = imgData[0];
		ui.create.div(".dz-jia", sizeBox, () => {
			imgData[0] = adjust(imgData[0], 10, sizetext, "jia");
		});
		//原画上移
		let yBox = ui.create.div(".sp-kdiv2", frame.cont);
		ui.create.div(".ss-text2", "原画上移", yBox);
		ui.create.div(".dz-jian", yBox, () => {
			imgData[1] = adjust(imgData[1], 2, yText, "jian");
		});
		let yText = ui.create.div(".ss-text2", yBox);
		yText.innerHTML = imgData[1];
		ui.create.div(".dz-jia", yBox, () => {
			imgData[1] = adjust(imgData[1], 2, yText, "jia");
		});
	}
	//反选
	reverseClick(flag) {
		let planAct = this.bigBg.querySelector(".dz-planBtn.active").source;
		let list = [];
		// let chars = dzxy.character;
		let chars = flag === true ? lib._cust_character : dzxy.character;

		for (let n in chars) {
			if (chars[n][4] && chars[n][4].includes("unseen")) continue;
			if (!planAct.banList.includes(n)) list.add(n);
		}
		let index = planAct.index;
		lib.config[`${dzxy.dz}plan${index}`]["banList"] = list.slice();
		planAct.banList = lib.config[`${dzxy.dz}plan${index}`]["banList"];
		dzxy.saveCF("plan" + index);
		this.planBtnClick(planAct, flag);
	}
	sortPack(flag) {
		let sortPack = dzxy.getCF("bancharSortPack");
		dzxy.saveCF("bancharSortPack", !sortPack);
		let planAct = this.bigBg.querySelector(".dz-planBtn.active").source;
		this.planBtnClick(planAct, flag);
	}
}
export let banChar = new BanChar();
lib.arenaReady.push(() => {
	if (lib.config[`${dzxy.dz}addBanCharToTopMenu`])
		ui.create.system("禁将", () => {
			banChar.openPage();
		});
	//移除已经关闭或删除的武将包 lib.config.characters = lib.config[`${dzxy.dz}plan${n}`]['pack'].slice();
	let packs = Object.keys(lib.characterPack);
	for (let i = lib.config.characters.length - 1; i >= 0; i--) {
		let pack = lib.config.characters[i];
		if (!packs.includes(pack)) lib.config.characters.remove(pack);
	}
});
dzxy.banChar = banChar;
