import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { DBtn } from "./baseEle.js";
import { Character2 } from "./ChooseChar.js";
export class WuJiang_packBtn extends DBtn {
	constructor(ID, name) {
		super(ui.create.div('.wujiang-pack-btn'));
		this.ID = ID;
		this.name = name;
		this.charList = [];
		this.charList2 = [];
		this.btnImg = ui.create.div('.wujiang-pack-btn-img', this.ele);
		this.nameEle = ui.create.div('.wujiang-pack-btn-name', name, this.ele);
	}
}
export class WuJiang_groupBtn extends DBtn {
	constructor(ID, name) {
		super(ui.create.div('.wujiang-group-btn-back'));
		this.ID = ID;
		this.name = name;
		this.charList = [];
		this.charList2 = [];
		this.btnImg = ui.create.div('.wujiang-group-btn-img', this.ele);
		this.nameEle = ui.create.div('.wujiang-group-btn-name', name, this.ele);
	}
	setText() {
		this.nameEle.innerHTML = `${this.name}<br>${this.charList.length}/${this.charList2.length}`;
	}
}
export class Skin extends DBtn {
	constructor(ID, skinName) {
		super(ui.create.div('.pifu-skin-back'));
		this.initEle(ID, skinName);
	}
	/**
	 * 
	 * @param {*} ID 武将id
	 * @param {*} skinFileName 皮肤完整的文件名 不带最默认.jpg
	 */
	initEle(ID, skinFileName) {
		let ext = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
		let extIndex = skinFileName.lastIndexOf('.');
		if (extIndex > 0 && ext.some(i => i == skinFileName.slice(extIndex))) {
			this.skinFileName = skinFileName;
			this.skinName = skinFileName.slice(0, extIndex);
		} else {
			this.skinFileName = skinFileName + '.jpg';
			this.skinName = skinFileName;
		}
		this.ID = ID;
		this.frame = ui.create.div('.pifu-skin-frame', this.ele);
		this.img = ui.create.div('.pifu-skin-img', this.ele);


		if (this.skinName == '经典形象') {
			this.img.classList.add('oringin-skin')
			this.img.qhly_origin_setBackground?.(ID, 'character') || this.img.setBackground(ID, 'character');
			// let charLt = dzxy.getCharData(ID, 'loutou', true);
			// this.ele.dataset.loutou = charLt;
		} else {
			this.img.setBackgroundImage(`extension/千幻聆音/${dzxy.getCF('qianhuanSkinDir')}/${ID}/${this.skinFileName}`);
			// let charLt = dzxy.getCharData(ID, 'skinloutou', true);
			let charLt = dzxy.getCF('skinLoutou');
			this.img.dataset.loutou = charLt;
		}
		this.nameBg = ui.create.div('.pifu-skin-name-bg', this.ele);
		this.nameEle = ui.create.div('.pifu-skin-name', this.skinName, this.nameBg);
		this.share = ui.create.div('.pifu-skin-share', this.ele);
		this.hideShare();
		this.showDynamic();
	}
	showDynamic() {
		if (window.decadeUI && decadeUI.dynamicSkin && decadeUI.dynamicSkin[this.ID] && Object.keys(decadeUI.dynamicSkin[this.ID]).includes(this.skinName)) {
			this.dynamic = ui.create.div('.pifu-skin-dynamic', this.ele);
			this.hasDynamic = true;
		}
	}
	showShare() {
		this.hasShare = true;
		this.share.show();
	}
	hideShare() {
		this.hasShare = false;
		this.share.hide();
	}
}


class CharPage {
	throttle = function (fn, delay) {
		let valid = true;
		return function () {
			if (valid) {
				valid = false;
				setTimeout(() => {
					fn.apply(this, arguments);
					valid = true;
				}, delay);
			}
		};
	}
	open(flag = false) {
		this.init(flag);
		this.initPackBtn(flag);
	}
	init(flag) {
		this.bigBg = dzxy.create.bigBg(document.body, 'image/chooseCharacter/ol_bg.jpg');
		this.backBtn = dzxy.create.back(this.bigBg);
		this.backBtn.listen(() => {
			this.bigBg.remove();
			dzxy.lock_back();
		});
		this.loadBtn = null;//当前武将包
		this.loadBtn2 = null;//当前要显示的武将按钮 必备charList3
		this.createSearch(flag);
		//武将整体位置
		this.charsArea = ui.create.div('.wujiang-chars-area', this.bigBg);
		//滑动加载
		this.charsArea.addEventListener('scroll', this.throttle(() => {
			let clientHeight = this.charsArea.clientHeight;
			let scrollTop = this.charsArea.scrollTop;
			let scrollHeight = this.charsArea.scrollHeight;
			if (clientHeight + scrollTop + 400 >= scrollHeight) {
				if (this.loadBtn2 && this.loadBtn2.charList3.length) this.groupClick(flag);
			}
		}, 250));
		this.chars = ui.create.div('.wujiang-chars', this.charsArea);
	}
	initPackBtn(flag) {

		let allPackList;
		if (flag === true) {
			console.log('imported.character', lib.imported.character);
			console.log('lib.character', lib.character);
			console.log('characterPack', lib.characterPack);
			console.log('translate', lib.translate);
			allPackList = lib.config.all.characters;
			if (!lib._cust_character) {
				lib._cust_character = {}
				lib._cust_characterPack = {}
				lib._cust_translate = {
					...lib.translate
				}
				Object.keys(lib.imported.character).forEach(key => {
					let characters = lib.imported.character[key].character
					let translate = lib.imported.character[key].translate
					lib._cust_translate = {
						...lib._cust_translate,
						...translate
					}

					lib._cust_characterPack[key] = {}
					Object.keys(characters).forEach(character => {
						let characterData = characters[character]
						lib._cust_character[character] = characterData
						lib._cust_characterPack[key][character] = characterData
					})
				})
				// }
			}
		} else {

			allPackList = dzxy.allPackList.slice()
		}
		console.log("allPackList", allPackList);
		if(flag!==true){
			allPackList.unshift('all');
		}
		this.packArea = ui.create.div('.wujiang-pack-area', this.bigBg);
		this.packBtns = ui.create.div('.wujiang-pack-btns', this.packArea);
		this.packBtnsList = [];
		for (let i of allPackList) {
			let pack = null;
			if (flag === true) {
				if (i == 'all') {
					continue;
				}
				pack = new WuJiang_packBtn(i, lib._cust_translate[i + '_character_config']);
			} else {
				pack = new WuJiang_packBtn(i, dzxy.translate[i + '_character_config']);

			}
			this.packBtnsList.push(pack);
			if (flag === true) {
				for (let n in lib._cust_characterPack[i]) {//n是武将名
					pack.charList2.push(n);
				}
			} else {
				for (let n in dzxy.charPack[i]) {//n是武将名
					pack.charList2.push(n);
				}
			}

			pack.setParentNode(this.packBtns);
			pack.setClick(() => {
				dzxy.playAudio('audio/base/PopUp.mp3');
				this.loadBtn = pack;
				this.loadBtn.active(this.packArea);
				this.packClick(flag);
			});
		}
		(() => {
			console.log('this.packBtnsList', this.packBtnsList);
			if (flag === true) {
				this.loadBtn = this.packBtnsList[0];

			} else {
				this.loadBtn = this.packBtnsList[1];

			}
			this.loadBtn.active(this.packArea);
			this.packClick(flag);
		})();
	}
	getSortPack(packID) {
		if(!lib.characterSort[packID]){
			return this.defaultSort
		}
		//简单分下包
		let pack = {
			shiji: [
				{
					ID: 'mobile_shijizhi',
					name: '智',
					filter: function (charID) { 
						return lib.characterSort[packID][this.ID].includes(charID) },
				},
				{
					ID: 'mobile_shijixin',
					name: '信',
					filter: function (charID) { return lib.characterSort[packID][this.ID].includes(charID) },
				},
				{
					ID: 'mobile_shijiren',
					name: '仁',
					filter: function (charID) { return lib.characterSort[packID][this.ID].includes(charID) },
				},
				{
					ID: 'mobile_shijiyong',
					name: '勇',
					filter: function (charID) { return lib.characterSort[packID][this.ID].includes(charID) },
				},
				{
					ID: 'mobile_shijiyan',
					name: '严',
					filter: function (charID) { return lib.characterSort[packID][this.ID].includes(charID) },
				}
			],
			standard: [
				{
					ID: 'wuxingshangjiang',
					name: '五星上将',
					filter: function (charID) {
						let l = ['huanggai', 'huangyueying', 'luxun']
						return l.some(i => i == charID);
					},
				},
				...this.defaultSort
			],
		}
		return pack[packID];
	}
	defaultSort = [
		{
			ID: 'all',
			name: '全部',
			filter: true,
		},
		{
			ID: 'wei',
			name: '魏',
			filter: function (charID) {
				return dzxy.character[charID] && dzxy.character[charID][1] == 'wei';
			},
		},
		{
			ID: 'shu',
			name: '蜀',
			filter: function (charID) {
				return dzxy.character[charID] && dzxy.character[charID][1] == 'shu';
			},
		},
		{
			ID: 'wu',
			name: '吴',
			filter: function (charID) {
				return dzxy.character[charID] && dzxy.character[charID][1] == 'wu';
			},
		},
		{
			ID: 'qun',
			name: '群',
			filter: function (charID) {
				return dzxy.character[charID] && dzxy.character[charID][1] == 'qun';
			},
		},
		{
			ID: 'shen',
			name: '神',
			filter: function (charID) {
				return dzxy.character[charID] && dzxy.character[charID][1] == 'shen';
			},
		},
		//晋的势力框大小不一致就没加
		//添加更多
	];
	packClick(flag) {
		if (this.groupBtns) this.groupBtns.remove();
		//势力包
		this.groupBtns = ui.create.div('.wujiang-group-btns', this.bigBg);
		let groups = [];
		let newx = this.getSortPack(this.loadBtn.ID);
		if (newx) groups = newx;
		else groups = this.defaultSort.slice();

		let groupBtnsList = [];
		for (let i of groups) {
			let groupBtn = new WuJiang_groupBtn(i.ID, i.name);
			groupBtn.filter = i.filter;
			groupBtnsList.push(groupBtn);
		}
		if (flag === true) {
			for (let c in lib._cust_characterPack[this.loadBtn.ID]) {
				for (let gb of groupBtnsList) {
					if (typeof gb.filter == 'function' && gb.filter(c)) {
						gb.charList2.push(c);
					}
					else if (typeof gb.filter == 'boolean' && gb.filter) {
						gb.charList2.push(c);
					}
				}
			}
		} else {
			for (let c in dzxy.charPack[this.loadBtn.ID]) {
				for (let gb of groupBtnsList) {
					if (typeof gb.filter == 'function' && gb.filter(c)) {
						gb.charList2.push(c);
					}
					else if (typeof gb.filter == 'boolean' && gb.filter) {
						gb.charList2.push(c);
					}
				}
			}
		}

		for (let i of groupBtnsList) {
			if (i.charList2.length == 0) continue;
			i.setText();
			i.setParentNode(this.groupBtns);
			i.setClick(() => {
				if (this.lock && i == this.loadBtn2) return;
				this.lock = false;
				this.chars.innerHTML = '';
				this.charsArea.scrollTo(0, 0);
				dzxy.playAudio('audio/base/Label.mp3');
				this.loadBtn2 = i;
				this.loadBtn2.active(this.groupBtns);
				this.loadBtn2.charList3 = this.loadBtn2.charList2.slice();
				this.groupClick(flag);
			});
		}
		(() => {
			this.chars.innerHTML = '';
			this.charsArea.scrollTo(0, 0);
			this.loadBtn2 = groupBtnsList.find(i => i.charList2.length != 0);
			if (!this.loadBtn2) return;
			this.loadBtn2.active(this.groupBtns);
			this.loadBtn2.charList3 = this.loadBtn2.charList2.slice();
			this.lock = false;
			this.groupClick(flag);
		})();
		// 
	}
	async groupClick(flag) {
		if (this.lock) return;
		this.lock = true;
		let t = this.loadBtn2;
		let requireNum = 40, forNum = 0, loadNum = 0;//需要加载数量，循环次数用于删除数组的长度实现滑动加载，加载数
		for (let c of this.loadBtn2.charList3) {
			forNum++;
			/*
			筛选continue写这里
			*/
			await new Promise(res => setTimeout(res));
			if (t != this.loadBtn2) return;
			let ch = new Character2(c, flag);
			ch.showHp();/*●*/
			ch.setClick(() => {
				if (flag === true) {
					dzxy.openCharInfoPage(ch.ID, ch.charImg,flag);
					return
				}
				let page = lib.config[`${dzxy.dz}charInfoPage`];
				if (page == 'qianhuan' && game.qhly_open) game.qhly_open(ch.ID, 'skill');
				else dzxy.openCharInfoPage(ch.ID, ch.charImg);
			});
			ch.setParentNode(this.chars);
			if (++loadNum == requireNum) break;
		}
		this.loadBtn2.charList3.splice(0, forNum);
		this.lock = false;
	}
	createSearch(flag) {
		this.searchBtn = ui.create.div('.wujiang-search-btn', this.bigBg);
		this.searchBtn.charList2 = [];
		this.searchBtn.charList3 = [];
		let This = this;
		this.searchBtn.addEventListener('click', () => {
			dzxy.create.input(this.bigBg, function () {
				if (!this.input.value.length) {
					this.remove();
					return;
				}
				This.chars.innerHTML = '';
				let inputText = this.input.value;
				console.log('inputText', inputText, lib._cust_character);
				if (flag === true) {
					for (let i in lib._cust_character) {
						if (String(lib._cust_translate[i]).indexOf(inputText) == -1 && String(i).indexOf(inputText) == -1) continue;
						This.searchBtn.charList3.push(i);
					}
				} else {
					for (let i in dzxy.character) {
						if (String(get.translation(i)).indexOf(inputText) == -1 && String(i).indexOf(inputText) == -1) continue;
						This.searchBtn.charList3.push(i);
					}
				}

				This.loadBtn2 = This.searchBtn;
				This.groupClick(flag);
				this.remove();
			}, '输入武将名进行搜索', '');
		});
	}
}
export let charPage = new CharPage();
dzxy.charPage = charPage;
/**皮肤页面 */
export class SkinPage extends CharPage {
	init() {
		this.bigBg = dzxy.create.bigBg(document.body, 'image/chooseCharacter/ol_bg.jpg');
		this.backBtn = dzxy.create.back(this.bigBg);
		this.backBtn.listen(() => {
			this.bigBg.remove();
			dzxy.lock_back();
		});
		this.loadBtn = null;//当前武将包
		this.loadBtn2 = null;//当前要显示的武将按钮 必备charList3
		this.isCheck = false;
		this.createSearch();
		this.createView();
		this.createCheck();
		this.createDeleteAll();
		//武将整体位置
		this.charsArea = ui.create.div('.wujiang-chars-area', this.bigBg);
		//滑动加载
		this.charsArea.addEventListener('scroll', this.throttle(() => {
			let clientHeight = this.charsArea.clientHeight;
			let scrollTop = this.charsArea.scrollTop;
			let scrollHeight = this.charsArea.scrollHeight;
			if (clientHeight + scrollTop + 400 >= scrollHeight) {
				if (this.loadBtn2 && this.loadBtn2.charList3.length) this.groupClick();
			}
		}, 250));
		//改
		this.initShare();
		this.chars = ui.create.div('.pifu-skins', this.charsArea);
	}
	initShare() {
		//共享皮肤
		this.shareList = [];
		this.shareObj = {};//查看该武将共享皮肤的其他武将
		if (lib.qhly_skinShare) {
			for (let i in lib.qhly_skinShare) {//被共享
				let cid = lib.qhly_skinShare[i].name;//共享出去的
				if (!cid) continue;
				if (this.shareObj[cid] == undefined) this.shareObj[cid] = [];
				this.shareObj[cid].add(i);
			}
			this.shareList = Object.keys(this.shareObj);
		}
	}
	async groupClick() {
		if (this.lock) return;
		this.lock = true;
		let t = this.loadBtn2;

		let requireNum = 40, forNum = 0, loadNum = 0;//需要加载数量，循环次数用于删除数组的长度实现滑动加载，加载数
		for (let c of this.loadBtn2.charList3) {
			forNum++;
			/*
			筛选continue写这里
			*/
			let chrSkinsContainer = ui.create.div('.pifu-skins-container', this.chars);
			let charName = ui.create.div('.pifu-skins-charname', dzxy.charNameRep(get.translation(c)), chrSkinsContainer);
			let chrSkinsContent = ui.create.div('.pifu-skins-content', chrSkinsContainer);
			let yuanhua = new Skin(c, '经典形象');
			yuanhua.setClick(() => {
				// let page = lib.config[`${dzxy.dz}charInfoPage`];
				// if (game.qhly_open) game.qhly_open(c, 'skill');
				// else dzxy.create.bottomBarTip('该功能需要安装【千幻聆音】扩展', this.bigBg);
				let page = lib.config[`${dzxy.dz}charInfoPage`];
				if (page == 'qianhuan' && game.qhly_open) game.qhly_open(c, 'skill');
				else dzxy.openCharInfoPage(c);
			})
			yuanhua.setParentNode(chrSkinsContent);

			let skills = dzxy.getSkill(c)[2];
			skills.addArray(['阵亡', '其他']);
			let skinsList = [];//以带后缀名的皮肤文件 没有的创建皮肤时默认.jpg
			//皮肤文件
			let p = new Promise((res) => {
				game.getFileList(`extension/千幻聆音/${dzxy.getCF('qianhuanSkinDir')}/${c}`, function (folders1, files1) {//(),皮肤名文件.jpg
					skinsList.addArray(files1);
					res();
				}, res);
			});
			await p;
			//合并语音文件夹
			//复制开始的带后缀名的文件列表，去掉后缀名在筛选多出来皮肤文件夹的
			let tempSkinsList = skinsList.slice();
			let ext = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
			for (let i = 0; i < tempSkinsList.length; i++) {
				let extIndex = tempSkinsList[i].lastIndexOf('.');
				if (extIndex > 0 && ext.some(j => j == tempSkinsList[i].slice(extIndex))) {
					tempSkinsList[i] = tempSkinsList[i].slice(0, extIndex);
				}
			}
			let p2 = new Promise((res) => {
				game.getFileList('extension/千幻聆音/sanguoaudio/' + c, function (folders2, files2) {//皮肤名文件夹,()
					if (window.decadeUI && decadeUI.dynamicSkin && decadeUI.dynamicSkin[c]) {
						folders2.addArray(Object.keys(decadeUI.dynamicSkin[c]));
					}
					let skinsList2 = folders2.filter(i => !tempSkinsList.includes(i));
					skinsList.addArray(skinsList2);
					res();
				}, () => {
					if (window.decadeUI && decadeUI.dynamicSkin && decadeUI.dynamicSkin[c]) {
						let skinsList2 = Object.keys(decadeUI.dynamicSkin[c]).filter(i => !tempSkinsList.includes(i));;
						skinsList.addArray(skinsList2);
					}
					res();
				});
			});
			await p2;
			if (t != this.loadBtn2) return;

			skinsList.remove('skininfo.js');
			let share;
			if (this.shareList.includes(c)) share = true;
			for (let i of skinsList) {
				let skin = new Skin(c, i);
				if (share) skin.showShare();
				skin.setParentNode(chrSkinsContent);
				skin.setClick(() => {
					this.skinClick(skin);
				});
			}
			if (++loadNum == requireNum) break;
		}
		this.loadBtn2.charList3.splice(0, forNum);
		this.lock = false;
	}
	skinClick(skin) {
		if (this.isCheck) {
			skin.ele.classList.toggle('dz-selected');
			return;
		}
		let bg = dzxy.create.bigBg(this.bigBg, true, function () { this.remove() });
		let frame = dzxy.create.setFrame(bg, '760px', '340px');
		frame.hide();
		frame.setBackgroundImage(dzxy.path + 'image/char_skin/TaiciBg.png');
		frame.cont.style.textAlign = 'left';
		frame.cont.style.width = '95%';
		let skills = dzxy.getSkill(skin.ID)[2];
		skills.addArray(['阵亡', '其他']);

		let skillEle = [];
		//查找千幻台词
		game.getFileList('extension/千幻聆音/sanguoaudio/' + skin.ID + '/' + skin.skinName, function (folders, files) {//files是文件名 x.mp3
			for (let s of skills) {
				let skillcont = ui.create.div('.taici-skill-container', frame.cont);
				let skillname = ui.create.div('.taici-skillname', get.translation(s) || s, skillcont);
				skillEle.push(skillcont);
			}
			for (let f of files) {
				if (f.slice(0, -4) == skin.ID) {
					let skillItem = ui.create.div('.taici-skill-item', skillEle[skills.length - 2], function () {
						dzxy.playAudio('千幻聆音', 'sanguoaudio/' + skin.ID + '/' + skin.skinName + '/' + f);
					});
					//喇叭
					ui.create.div('.taici-skill-trumpet', skillItem);
					//台词文本
					let taiciText = ui.create.div('.taici-skill-text', f, skillItem);
					continue;
				}
				let isSkill = false;
				for (let i = 0; i < skills.length; i++) {
					let info = get.info(skills[i]);
					if (f.indexOf(skills[i]) != -1 || (info && typeof info.audio == 'string' && f.indexOf(info.audio) != -1)) {
						let skillItem = ui.create.div('.taici-skill-item', skillEle[i], function () {
							dzxy.playAudio('千幻聆音', 'sanguoaudio/' + skin.ID + '/' + skin.skinName + '/' + f);
						});
						//喇叭
						ui.create.div('.taici-skill-trumpet', skillItem);
						//台词文本
						let taiciText = ui.create.div('.taici-skill-text', skillItem);
						let num = f.slice(0, -4).match(/\d+$/gi);
						num ? taiciText.innerHTML = get.translation(skills[i]) + num : f;
						isSkill = true;
						break;
					}
				}
				if (isSkill) continue;
				//其他
				let skillItem = ui.create.div('.taici-skill-item', skillEle[skills.length - 1], function () {
					dzxy.playAudio('千幻聆音', 'sanguoaudio/' + skin.ID + '/' + skin.skinName + '/' + f);
				});
				//喇叭
				ui.create.div('.taici-skill-trumpet', skillItem);
				//台词文本
				let taiciText = ui.create.div('.taici-skill-text', f, skillItem);

			}
			skillEle.forEach(i => { if (i.childNodes.length == 1) i.remove() });
			frame.show();
		}, () => { frame.show() });

		//删除皮肤
		let delSkin = ui.create.div('.pifu-skin-delete-btn', '删除皮肤', bg);
		delSkin.addEventListener("click", (evt) => {
			evt.stopPropagation();
			let del = () => {
				//皮肤文件
				game.removeFile(`extension/千幻聆音/${dzxy.getCF('qianhuanSkinDir')}/${skin.ID}/${skin.skinFileName}`, (err) => {
					bg.delete();
					skin.ele.remove();
					dzxy.create.bottomBarTip('删除成功', this.bigBg);
				});
				// 语音文件
				game.removeDir(`extension/千幻聆音/sanguoaudio/${skin.ID}/${skin.skinName}`, () => { }, () => { });
				// 屏蔽十周年动皮
				if (skin.hasDynamic) {
					if (lib.config[`${dzxy.dz}deletedSkin`][skin.ID] == undefined) lib.config[`${dzxy.dz}deletedSkin`][skin.ID] = [];
					lib.config[`${dzxy.dz}deletedSkin`][skin.ID].add(skin.skinName);
					dzxy.saveCF('deletedSkin');

					dzxy.deleteDySkin(skin.ID, skin.skinName);
				}

			}

			if (!lib.config[`${dzxy.dz}delSkinTip`]) {
				del();
				return;
			}
			//提示框
			let bgx = dzxy.create.bigBg(bg, true);
			bgx.addEventListener('click', (evt2) => { evt2.stopPropagation(); bgx.remove() });
			let frame = dzxy.create.setFrame(bgx, '560px', '290px');
			frame.cont.innerHTML = `<p>是否确认删除皮肤(${skin.skinName})及其语音</p>`;
			let ok = dzxy.create.ok(frame.cont, () => {
				del();
			});
			ok.style.marginTop = '100px';
		});
	}
	createView() {
		let btn = ui.create.div('.wujiang-view-btn', '查看屏蔽动皮', this.bigBg);
		btn.addEventListener('click', () => {
			let bg = dzxy.create.bigBg(this.bigBg, true, function () {
				this.remove();
				dzxy.saveCF('deletedSkin');
			});
			let frame = dzxy.create.setFrame(bg);
			frame.cont.style.textAlign = 'left';
			frame.cont.style.fontFamily = 'none';
			let skins = lib.config[`${dzxy.dz}deletedSkin`];
			frame.cont.innerHTML = `<p style='text-align: center'>以下的动态皮肤将会被屏蔽</p>`
			for (let c in skins) {
				if (!skins[c].length) continue;
				ui.create.div('.pifu-view-charname', c + (get.translation(c) || ''), frame.cont);
				for (let s of skins[c]) {
					let skindiv = ui.create.div('.pifu-view-skinname', s, frame.cont);
					skindiv.addEventListener('click', () => {
						let bool = confirm(`是否确认解除对${get.translation(c) || c}的动态皮肤${s}的屏蔽`);
						if (bool) {
							skins[c].remove(s);
							skindiv.remove();
						}
					});
				}
			}
		})
	}
	createCheck() {
		let btn = ui.create.div('.wujiang-view-btn', '勾选', this.bigBg);
		btn.style.right = '389px';
		btn.addEventListener('click', () => {
			this.isCheck = !this.isCheck;
			btn.classList.toggle('active');
		});
	}
	createDeleteAll() {
		let btn = ui.create.div('.wujiang-view-btn', '删除已选皮肤', this.bigBg);
		btn.style.right = "523px";
		let del = (skin) => {
			//皮肤文件
			game.removeFile(`extension/千幻聆音/${dzxy.getCF('qianhuanSkinDir')}/${skin.ID}/${skin.skinFileName}`, (err) => {
				skin.ele.remove();
				// dzxy.create.bottomBarTip('删除成功', this.bigBg);
			});
			// 语音文件
			game.removeDir(`extension/千幻聆音/sanguoaudio/${skin.ID}/${skin.skinName}`, () => { }, () => { });
			// 屏蔽十周年动皮
			if (skin.hasDynamic) {
				if (lib.config[`${dzxy.dz}deletedSkin`][skin.ID] == undefined) lib.config[`${dzxy.dz}deletedSkin`][skin.ID] = [];
				lib.config[`${dzxy.dz}deletedSkin`][skin.ID].add(skin.skinName);
				dzxy.saveCF('deletedSkin');
				dzxy.deleteDySkin(skin.ID, skin.skinName);
			}
		}
		btn.addEventListener('click', () => {
			let skins = this.bigBg.querySelectorAll(".pifu-skin-back.dz-selected");
			//提示框
			let bgx = dzxy.create.bigBg(this.bigBg, true);
			bgx.addEventListener('click', (evt2) => { evt2.stopPropagation(); bgx.remove() });
			let frame = dzxy.create.setFrame(bgx, '924px', '490px');
			frame.cont.innerHTML = `<p style='margin:10px 0;'>是否确认删除以下皮肤及其语音</p>`;
			let skinsCont = ui.create.div({
				position: 'relative',
				width: '100%',
				height: 'calc(100% - 95px)',
				overflow: 'auto',
			}, frame.cont);
			for (let i of skins) {
				let skin = new Skin(i.source.ID, i.source.skinFileName);
				skin.setParentNode(skinsCont);
			}
			dzxy.create.ok(frame.cont, () => {
				for (let i of skins) {
					del(i.source);
				}
				bgx.remove();
				dzxy.create.bottomBarTip('删除成功', this.bigBg);
			});
		})
	}
}
export let skinPage = new SkinPage();
dzxy.skinPage = skinPage;
lib.init.css(`${lib.assetURL}${dzxy.path}css`, "char_skin");

lib.arenaReady.push(() => {
	if (dzxy.getCF('addSkinToTopMenu')) ui.create.system('皮肤', () => {
		skinPage.open();
	});
});
