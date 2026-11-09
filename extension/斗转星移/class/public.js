import { DEle } from "./baseEle.js";
import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import dzxy from "./Dzxy.js";
import { Jiesuan } from "./jiesuan.js";
import { ScreenAdapter } from "./ScreenAdapter.js";
import doudizhuStats from "./DoudizhuStats.js";

export class PropDiv extends DEle {
	/**
	 *
	 * @param {*} icon 道具ID
	 * @param {*} count 道具数量
	 * @param {*} countString 显示的数量提示 有些可能不是 'x5'样式
	 */
	constructor(icon, count, countString) {
		super(ui.create.div(".dz-prop-box"));
		this.init(icon, count, countString);
	}
	init(icon, count, countString) {
		if (!Number.isInteger(count)) {
			console.warn("道具数量只能为整型");
			return;
		}

		let countx = Math.abs(count);
		if (!countString) countString = (count >= 0 ? "X" : "-") + countx;

		this.ID = icon;
		this.count = count;
		let sx = this.getSX();
		this.ditu = ui.create.div(".dz-prop-ditu", this.ele); //正常必要
		this.bgx = ui.create.div(".pubui_prop_bg.hidden", this.ditu);
		this.bgy = ui.create.div(".pubui_prop_bg2.hidden", this.ditu);
		this.bg = ui.create.div(".dz-prop-bg", this.ditu); //正常必要
		this.bgActive = ui.create.div(".dz-prop-bg-active.hidden", this.ditu);
		this.img = ui.create.div(".dz-prop-img", this.ditu); //正常必要
		// this.img.setBackgroundImage(`${dzxy.path}image/icon/${icon}.png`);
		this.img.setBackgroundImage(sx.imgPath);
		this.signLabel = ui.create.div(".dz-prop-sign-label.hidden", this.ditu);
		this.nun = ui.create.div(".dz-prop-num", this.ditu); //正常必要
		this.nun.innerHTML = countString;
		if (sx.nocount) this.nun.hide();
		this.name = ui.create.div(".dz-prop-name", this.ditu); //正常必要
		this.name.innerHTML = Props[icon].name || "";
		this.dim = ui.create.div(".dz-prop-dim.hidden", this.ditu);
		this.checked = ui.create.div(".dz-prop-checked.hidden", this.ditu);
		this.noactive();
		this.nosignin();
	}
	showType(type) {
		switch (type) {
			case "sign":
				this.ele.classList.add("sign");
				this.bgx.hide();
				this.name.hide();
				break;
			case "sign2":
				this.ele.classList.add("sign2");
				this.bgx.hide();
				this.name.hide();
				this.specialBg(2);
				break;
			case "package":
				this.ele.classList.add("package");
				this.bgx.show();
				this.topName();
				this.specialBg(1);
				break;
			case "package2":
				this.ele.classList.add("package2");
				this.bgx.hide();
				this.bgy.show();
				this.specialBg(1);
				break;
		}
	}
	topName() {
		this.name.classList.add("top");
	}
	specialBg(type) {
		this.bg.dataset.type = type;
	}
	signin() {
		this.ele.classList.add("signin");
		this.dim.show();
		this.checked.show();
		this.noactive();
	}
	nosignin() {
		this.ele.classList.remove("signin");
		this.dim.hide();
		this.checked.hide();
	}
	active(type) {
		if (type != "jinri" && type != "buqian") return;
		this.ele.classList.add("active");
		this.signLabel.dataset.type = type;
		this.bgActive.show();
		this.signLabel.show();
	}
	noactive() {
		this.ele.classList.remove("active");
		this.signLabel.dataset.type = "";
		this.bgActive.hide();
		this.signLabel.hide();
	}
	getSX() {
		return Props.getProp(this.ID);
	}
}

/**道具类 */
var Props = {
	shenmibaoxiang: {
		name: "神秘宝箱",
		intro: "随机开出各种道具",
		type: "daoju",
		use() {
			//this.id
			let list = [
				["paiweijiaxingka", 2],
				["zhaomuling", 1],
				["yanlingjia", 1],
				["huanjiangka", 10],
				["shouqika", 10],
				["huanledou", 600],
				["yinbi", 300],
				["jinpiao", 300],
				["gaimingka", 1],
				["jianghun", 100],
				["yanling", 100],
			];
			for (let i = 0; i < 10; i++) {
				let ran = list.randomGet();
				propToast.addToast(ran[0], ran[1]);
			}
			Props.changeCount(this.id, -1);
		},
		useAll() {
			let count = Props.getCount(this.id);
			for (let i = 0; i < count; i++) this.use();
		},
		//后续属性添加
	},
	paiweijiaxingka: {
		name: "排位加星卡",
		intro: "排位模式获得胜利时可以额外加一颗星",
		type: "daoju",
		//后续属性添加
	},
	zhaomuling: {
		name: "招募令",
		intro: "必中一个武将，有可能开出稀有武将哦",
		type: "daoju",
		//后续属性添加
	},
	yanlingjia: {
		name: "雁翎甲",
		intro: "必中一件武将皮肤，有可能开出稀有皮肤哦",
		type: "daoju",
		//后续属性添加
	},
	huanjiangka: {
		name: "换将卡",
		intro: "可以让你额外拥有选择武将机会的神奇道具",
		type: "daoju",
		//后续属性添加
	},
	shouqika: {
		name: "手气卡",
		intro: "可以重新抽取游戏开始时的4张手牌",
		type: "daoju",
		//后续属性添加
	},
	huanledou: {
		name: "欢乐豆",
		intro: "可在欢乐斗地主中使用！可赢取金票哦！",
		type: "daoju",
		//后续属性添加
	},
	yinbi: {
		name: "银币",
		intro: "游戏内活动获得，用于兑换武将和稀有道具",
		type: "cailiao",
		//后续属性添加
	},
	jinpiao: {
		name: "金票",
		intro: "游戏内活动获得，用于兑换武将和稀有道具",
		type: "cailiao",
		//后续属性添加
	},
	gaimingka: {
		name: "改名卡",
		intro: "用于改头换面，重新做人",
		type: "daoju",
		//后续属性添加
	},
	jianghun: {
		name: "将魂",
		intro: "制作武将的原材料，十分珍贵",
		type: "cailiao",
		//后续属性添加
	},
	yanling: {
		name: "雁翎",
		intro: "制作武将皮肤和解锁皮肤动态权限的原材料，十分珍贵",
		type: "daoju",
		//后续属性添加
	},
	daojulibao: {
		name: "道具礼包",
		intro: "打开可获得手气卡*2，换将卡*2",
		type: "lihe",
		use() {
			//this.id
			let list = [
				["huanjiangka", 2],
				["shouqika", 2],
			];
			for (let i = 0; i < list.length; i++) {
				propToast.addToast(list[i][0], list[i][1]);
			}
			Props.changeCount(this.id, -1);
		},
		useAll() {
			let count = Props.getCount(this.id);
			let list = [
				["huanjiangka", 2],
				["shouqika", 2],
			];
			for (let i = 0; i < list.length; i++) {
				propToast.addToast(list[i][0], list[i][1] * count);
			}
			Props.changeCount(this.id, -count);
		},
	},
	// mark:添加新的道具
	shishibaozhu: {
		name: "史诗宝珠",
		intro: "史诗宝珠",
		type: "daoju",
		//后续属性添加
	},
	shishibaozhusuipian: {
		name: "史诗宝珠碎片",
		intro: "十个史诗宝珠碎片可以合成一个史诗宝珠",
		type: "daoju",
		dyintro() {
			let count = Props.getCount("shishibaozhusuipian");
			return `十个史诗宝珠碎片可以合成一个史诗宝珠`;
		},
		display: false,
		nocount: false,
		imgPath: `${dzxy.path}image/icon/shishibaozhusuipian.png`,
		synthesis() {
			let sp = Props.getCount("shishibaozhusuipian");
			if (sp < 10) {
				dzxy.create.bottomBarTip("史诗宝珠碎片不足,无法合成", document.body);
				return false;
			}
			let n = Math.floor(sp / 10);
			Props.changeCount("shishibaozhusuipian", n * -10);
			propToast.addToast("shishibaozhu", n);
		},
	},
	//暂时放包裹里 后面在移出去
	shop_huanjiangka: {
		name: "换将卡*5",
		intro: "使用1000金票兑换5张换将卡",
		dyintro() {
			let count = Props.getCount("jinpiao");
			return `使用1000金票兑换5张换将卡<br>(当前金票：${count})`;
		},
		type: "shangdian",
		display: true,
		nocount: true,
		imgPath: `${dzxy.path}image/icon/huanjiangka.png`,
		use() {
			let jp = Props.getCount("jinpiao");
			if (jp < 1000) {
				dzxy.create.bottomBarTip("金票不足", document.body);
				return false;
			}
			Props.changeCount("jinpiao", -1000);
			propToast.addToast("huanjiangka", 5);
		},
		useAll() {
			let jp = Props.getCount("jinpiao");
			if (jp < 1000) {
				dzxy.create.bottomBarTip("金票不足", document.body);
				return false;
			}
			let n = Math.floor(jp / 1000);
			Props.changeCount("jinpiao", n * -1000);
			propToast.addToast("huanjiangka", 5 * n);
		},
	},
	shop_shouqika: {
		name: "手气卡*5",
		intro: "使用1000金票兑换5张手气卡",
		dyintro() {
			let count = Props.getCount("jinpiao");
			return `使用1000金票兑换5张手气卡<br>(当前金票：${count})`;
		},
		type: "shangdian",
		display: true,
		nocount: true,
		imgPath: `${dzxy.path}image/icon/shouqika.png`,
		use() {
			let jp = Props.getCount("jinpiao");
			if (jp < 1000) {
				dzxy.create.bottomBarTip("金票不足", document.body);
				return false;
			}
			Props.changeCount("jinpiao", -1000);
			propToast.addToast("shouqika", 5);
		},
		useAll() {
			let jp = Props.getCount("jinpiao");
			if (jp < 1000) {
				dzxy.create.bottomBarTip("金票不足", document.body);
				return false;
			}
			let n = Math.floor(jp / 1000);
			Props.changeCount("jinpiao", n * -1000);
			propToast.addToast("shouqika", 5 * n);
		},
	},
	shop_huanledou: {
		name: "欢乐豆*1000",
		intro: "使用2000金票兑换1000欢乐豆",
		dyintro() {
			let remainCount = dzxy.getCF("time")["shop_huanledou"]["remainCount"];
			let count_jp = Props.getCount("jinpiao");
			return `使用2000金票兑换1000欢乐豆<br>(今日剩余兑换次数：${remainCount}/3;当前金票：${count_jp})`;
		},
		type: "shangdian",
		display: true,
		nocount: true,
		imgPath: `${dzxy.path}image/icon/huanledou.png`,
		use() {
			let jp = Props.getCount("jinpiao"),
				hld = Props.getCount("huanledou");
			let needCount = 2000;
			if (hld > 100) {
				dzxy.create.bottomBarTip("欢乐豆小于100才能兑换", document.body);
				return false;
			}
			if (jp < needCount) {
				dzxy.create.bottomBarTip("金票不足", document.body);
				return false;
			}

			let timeInfo = dzxy.getCF("time")["shop_huanledou"];
			if (timeInfo.remainCount <= 0) {
				dzxy.create.bottomBarTip("今日剩余兑换次数不足", document.body);
				return false;
			}
			Object.assign(timeInfo, dzxy.getDate("nyr"));
			timeInfo.remainCount--;

			Props.changeCount("jinpiao", -needCount);
			propToast.addToast("huanledou", 1000);
			dzxy.saveCF("time");
		},
		useAll() {
			while (true) {
				let bool = this.use();
				if (bool == false) break;
			}
			return false;
		},
	},
	/*--------------------------------------------------------------------------------------------------------*/
	/**
	 * 获取所有道具数组
	 * 本应该是合起来放一块的 后面写的懒得改了
	 * @returns 所有道具数组
	 */
	getPropList() {
		let list = [];
		for (let i in this) {
			if (typeof this[i] == "object" && this[i].name != undefined) list.add(i);
		}
		return list;
	},
	/**
	 * 将道具分类
	 * @returns
	 */
	sort() {
		let map = {};
		let f = prop => {
			if (typeof prop.type != "string" && !Array.isArray(prop.type)) return;
			if (typeof prop.type == "string") {
				if (!map[prop.type]) map[prop.type] = {};
				map[prop.type][prop.id] = prop;
			} else {
				prop.type.forEach(j => {
					if (!map[j]) map[j] = {};
					map[j][prop.id] = prop;
				});
			}
		};
		for (let i in this) {
			if (typeof this[i] == "object" && this[i].name != undefined) f(this[i]);
		}
		return map;
	},
	/**
	 * 道具数量的改变
	 * @param {*} propID ID
	 * @param {*} changeCount 改变值
	 * @returns
	 */
	changeCount(propID, changeCount) {
		if (typeof this[propID] != "object") return;
		if (!Number.isInteger(changeCount)) return;

		let packageInfo = dzxy.getCF("package");
		if (packageInfo[propID] == undefined) packageInfo[propID] = {};
		if (packageInfo[propID]["count"] == undefined) packageInfo[propID]["count"] = 0;
		packageInfo[propID]["count"] += changeCount;

		let maxCount = this[propID].maxCount;
		let minCount = this[propID].minCount;
		if (typeof maxCount == "number" && maxCount < packageInfo[propID]["count"]) packageInfo[propID]["count"] = maxCount;
		if (typeof minCount == "number" && minCount > packageInfo[propID]["count"]) packageInfo[propID]["count"] = minCount;

		dzxy.saveCF("package");
	},
	/**
	 * 获取道具的数量
	 * @param {*} propID ID
	 * @returns 数量
	 */
	getCount(propID) {
		let packageInfo = dzxy.getCF("package");
		if (packageInfo[propID] == undefined) return 0;
		if (!packageInfo[propID]["count"]) return 0;
		return packageInfo[propID]["count"];
	},
	getProp(propID) {
		let prop = this[propID];
		if (prop == undefined) return {};
		return prop;
	},
};
//加默认值
for (let i in Props) {
	Props[i].id = i; //ID
	//包裹显示问题
	if (Props[i].maxCount == undefined) Props[i].maxCount = 99999999;
	if (Props[i].minCount == undefined) Props[i].minCount = -99999999;
	if (Props[i].imgPath == undefined) Props[i].imgPath = `${dzxy.path}image/icon/${i}.png`;
}
let packageInfo = dzxy.getCF("package"); if (packageInfo["huanledou"] == undefined) Props.changeCount("huanledou", 1200); /*●*/
dzxy.Props = Props;
export { Props };

class PropToast {
	toastList = [];
	timer = null;
	active = false;
	createArea() {
		if (!this.toastArea) {
			this.tempArea = ui.create.div(".dz-temp-tip-area", document.body);
			ScreenAdapter.add({
				node: this.tempArea,
				update: true,
				callback: (node, scale) => {
					node.style.zoom = window.inSplash ? scale : scale * 1.1;
				},
			});
			this.toastArea = ui.create.div(".dz-prop-toasts", this.tempArea);
		}
	}
	start() {
		if (this.active) return;
		this.active = true;
		this.timer = setInterval(() => {
			this.handleNext();
		}, 500);
	}
	stop() {
		clearInterval(this.timer);
		this.active = false;
	}
	handleNext() {
		if (this.toastList.length > 0) {
			let next = this.toastList.shift();
			this.toastArea.append(next);
			dzxy.playAudio("audio/base/Notice02.mp3");
			let allItems = document.querySelectorAll(".dz-prop-toast");
			for (let i = 0; i < allItems.length; i++) {
				let targetTop = (allItems.length - i - 1) * 75;
				allItems[i].style.bottom = `${targetTop}px`;
			}

			let t = 2000;
			setTimeout(() => {
				next.classList.add("anim2");
			}, t);
			setTimeout(() => {
				next.remove();
			}, t + 1000);
		} else {
			this.stop();
		}
	}
	/**
	 *
	 * @param {*} icon id
	 * @param {*} count 数量
	 * @param {*} countString 文字
	 */
	addToast(icon, count, countString) {
		let toast = ui.create.div(".dz-prop-toast.anim1");
		toast.propText = ui.create.div(".prop-text", toast);
		toast.prop = new PropDiv(icon, count);
		toast.prop.showType("sign");
		toast.prop.nun.hide();
		toast.prop.setParentNode(toast.propText);

		let countx = Math.abs(count);
		if (!countString) countString = (toast.prop.getSX().name || "") + (count >= 0 ? "X" : "-") + countx;
		toast.text = ui.create.div(".ptext", countString, toast.propText);
		this.toastList.push(toast);
		Props.changeCount(icon, count);
		this.start();
	}
}
export let propToast = new PropToast();
dzxy.propToast = propToast;
propToast.createArea();

function addSkill_shouqika() {
	lib.skill._dzxy_shouqika = {
		charlotte: true,
		forced: true,
		trigger: { global: "gameDrawAfter" },
		filter: function (event, player) {
			if (!(get.mode() == "versus" && get.config("versus_mode", "versus") == "two")) return false;
			return player == game.me;
		},
		content: function () {
			"step 0";
			event.sqkNum = dzxy.Props.getCount("shouqika");
			event.num = 7;
			("step 1");
			if (event.num && event.sqkNum) player.chooseBool(`本场还可更换${event.num}次手牌(剩余手气卡${event.sqkNum})`);
			else event.finish();
			("step 2");
			if (result.bool) {
				var hs = player.getCards("h");
				game.addVideo("lose", player, [get.cardsInfo(hs), [], [], []]);
				for (var i = 0; i < hs.length; i++) {
					hs[i].discard(false);
				}
				player.directgain(get.cards(hs.length));
				event.num--;
				event.sqkNum--;
				dzxy.Props.changeCount("shouqika", -1);
				event.goto(1);
			}
		},
	};
}
addSkill_shouqika();
// 对局结束
lib.onover.push(result => {
	let mode = get.mode();
	let submode = get.config(mode + "_mode", mode);
	//欢乐斗地主
	if (mode == "doudizhu" && submode == "huanle") {
		if (!dzxy.ddzBeilv) return;
		let jpCount = dzxy.ddzBeilv * 100,
			hldCount = 10;
		if (game.me == game.zhu) {
			jpCount *= 2;
			hldCount *= 2;
		}
		
		let myhld = Props.getCount("huanledou");
		if (myhld < hldCount) {
			propToast.addToast("huanledou", 0, "欢乐豆不足，无法获得奖励");
			Jiesuan.use(result, 0, 0);
		} else {
			if (result) {
				propToast.addToast("huanledou", -hldCount);
				propToast.addToast("jinpiao", jpCount);
				Jiesuan.use(true, jpCount, -hldCount);
			} else {
				propToast.addToast("huanledou", -jpCount);
				Jiesuan.use(false, 0, -jpCount);
			}
		}
	}
	//非欢乐斗地主
	if (mode != "doudizhu" || (mode == "doudizhu" && submode != "huanle")) {
		let myhld = Props.getCount("huanledou");
		/*●*/
		if (myhld < 3000) {
			let random = Math.random();
			if (random > 0.9) propToast.addToast("huanledou", 300);
			else if (random > 0.7) propToast.addToast("huanledou", 120);
			else if (random > 0.2) propToast.addToast("huanledou", 30);
			else if (random > 0.1) propToast.addToast("huanledou", 2);			
		}

		if (mode == "doudizhu") {
			Jiesuan.use(result, 0, 0);
		}
	}

	let list = [
		{
			id: "daojulibao",
			count: 1,
			prob: 0.2,
			max: 20,
		},
		{
			id: "shouqika",
			count: 1,
			prob: 0.5,
			max: 100,
		},
		{
			id: "huanjiangka",
			count: 1,
			prob: 0.5,
			max: 100,
		},
		{
			id: "jianghun",
			count: 20,
			prob: 0.5,
		},
	];

	for (let i of list) {
		let random = Math.random();
		if (random > i.prob) continue;
		let myPropCount = Props.getCount(i.id);
		if (myPropCount < i.max || i.max == undefined) propToast.addToast(i.id, i.count);
	}
});
