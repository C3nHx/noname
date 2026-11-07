import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { DBtn } from "./baseEle.js";
import { Predzxy } from "./Predzxy.js";
import { Danmu } from "./other.js";
import playerConfig from "../playerConfig.js";
class Dzxy extends Predzxy {
	/**扩展路径 */
	path = 'extension/斗转星移/';
	/**config用的简写 */
	dz = 'extension_斗转星移_';
	/**小边框 */
	sborder = [];
	/**大边框 */
	bborder = [];
	/**小头像 */
	xiaotouxiang = [];
	/**武将包数组 */
	allPackList;
	/**武将 */
	character = {
	};
	/**武将包 */
	charPack = {};
	/**翻译 */
	translate = {};
	/**露头缓存 */
	loutouCache = {};
	/**存放其他扩展的变量 */
	extVar = {
		hok: {},
	};
	/**●备份禁将 */
    async backupBancharData() {
      let path = `extension/斗转星移/data/banCharBackup/`;
      let list1 = [];
      let list2 = [];
      for (let mode of lib.config.all.mode) {
        let str = JSON.stringify(lib.config[mode + '_banned']);
        let modeTran = get.translation(mode);
        await new Promise((res, rej) => {
          game.writeFile(str, path, modeTran, () => {
            // alert(`${modeTran}模式备份完成,路径${path}`);
            list1.push(modeTran);
            res();
          }, () => {
            // alert(`${modeTran}模式备份失败,路径${path}`);
            list2.push(modeTran);
            res();
          });
        });
      }
      alert(`斗转星移扩展提示：已备份当前禁将设置，若需要恢复禁将设置请查看扩展内的README.docx。\n文件路径：${path}\n备份成功：${list1.length ? list1 : ['无']}\n备份失败：${list2.length ? list2 : ['无']}`);
    }
	/**更新版本提示 */
	updateVersion() {
		//当前版本
		let currentVersion = '3.6';/*●*/
		//玩家更新前的版本
		let userVersion = lib.config[`${dzxy.dz}version`];
		let warn = currentVersion != userVersion;
		if (warn) {
			//●alert('(斗转星移提醒)使用3.0之前版本覆盖更新的需要删除重装，请注意备份好相关数据！！！使用说明请查看扩展内的README.docx');
		}
		dzxy.saveCF('version', currentVersion);
	}
	/**初始化整合数据 */
	async initData() {
		//储存武将相关设置
		dzxy.initCF('charData', {});
		//删除的皮肤
		dzxy.initCF('deletedSkin', {});
		//确保武将框加载
		let p = new Promise((res) => {
			game.getFileList(`extension/斗转星移/image/char_small_border`, (folders, files) => {
				for (let i of files) {
					this.sborder.add(i.slice(17, -4));
				}
				res();
			});
		});
		await p;
		game.getFileList(`extension/斗转星移/image/char_big_border`, (folders, files) => {
			for (let i of files) {
				this.bborder.add(i.slice(0, -4));
			}
		});
		game.getFileList('extension/斗转星移/image/char', (folders, files) => {
			for (let i of files) {
				this.xiaotouxiang.push(i.slice(0, -4));
			}
		}, () => { });
		lib.arenaReady.push(() => {
			this.allPackList = lib.config.all.characters.slice().addArray(Object.keys(lib.characterPack));
			//
			for (let i in lib.characterPack) {
				Object.assign(this.character, lib.characterPack[i]);
			}
			//
			Object.assign(this.charPack, { 'all': this.character });
			Object.assign(this.charPack, lib.characterPack);
			//
			Object.assign(this.translate, { 'all': '全部', 'all_character_config': '全部' });
			Object.assign(this.translate, lib.translate);

			this.deleteDySkin();
		});
	}
	/**屏蔽十周年UIdynamicSkin里动态皮肤代码*/
	deleteDySkin(char, skin) {
		if (!window.decadeUI || !decadeUI.dynamicSkin) return;
		if (char != undefined && skin != undefined) {
			if (decadeUI.dynamicSkin[char] && decadeUI.dynamicSkin[char][skin]) delete decadeUI.dynamicSkin[char][skin];
			return;
		}
		for (let i in lib.config[`${dzxy.dz}deletedSkin`]) {
			if (decadeUI.dynamicSkin[i]) {
				for (let j of lib.config[`${dzxy.dz}deletedSkin`][i]) {
					if (decadeUI.dynamicSkin[i][j]) delete decadeUI.dynamicSkin[i][j];
				}
			}
		}
	}
	importCSS() {
		lib.init.css(`${lib.assetURL}${this.path}css`, "banChar");
		lib.init.css(`${lib.assetURL}${this.path}css`, "chooseChar");
		lib.init.css(`${lib.assetURL}${this.path}css`, "other");
		lib.init.css(`${lib.assetURL}${this.path}css`, "public");
		lib.init.css(`${lib.assetURL}${this.path}css`, "Dsplash");
		lib.init.css(`${lib.assetURL}${this.path}css`, "layout_22");
		lib.init.css(`${lib.assetURL}${this.path}css`, "jiesuan");
		lib.init.css(`${lib.assetURL}${this.path}css`, "mvp");
	}
	importJS() {
		lib.init.js(`${lib.assetURL}${dzxy.path}plugin`, "iscroll");
	}
	/**初始化config */
	initCF(key, value) {
		if (lib.config[`${this.dz}${key}`] == undefined) game.saveExtensionConfig('斗转星移', key, value);
	}
	/**保存config */
	saveCF(key, value) {
		if (value == undefined) game.saveExtensionConfig('斗转星移', key, lib.config[`${this.dz}${key}`]);
		else game.saveExtensionConfig('斗转星移', key, value);
	}
	/**获取config */
	getCF(key) {
		return lib.config[`${dzxy.dz}${key}`];
	}
	/**获取势力颜色 */
	getGroupColor(group) {
		let groupColor = {
			wei: 'RGBA(46,88,148,0.5)',
			shu: 'RGBA(133,1,1,0.5)',
			wu: 'RGBA(94,140,49,0.5)',
			qun: 'RGBA(210,206,133,0.5)',
			shen: 'RGBA(248,213,104,0.5)',
			jin: 'RGBA(147,112,219,0.5)',
			key: 'RGBA(255,192,203,0.5)',
			western: 'RGBA(147,112,219,0.5)',
			default: 'RGBA(237,224,61,0.5)',//默认颜色，未定义势力的颜色
			close: 'RGBA(0,0,0,0.5)',//关闭势力颜色划分的颜色
		};
		let color = groupColor['default'];
		if (groupColor[group]) color = groupColor[group];
		return color;
	}
	getSkill(charID) {
		let charInfo = get.character(charID);
		let skill = charInfo[3].slice(), skill2 = [], skill3 = [];
		for (let i of skill) {
			let info = get.info(i);
			if (!info || !info.derivation) continue;
			typeof info.derivation == 'string' ? skill2.add(info.derivation) : skill2.addArray(info.derivation);
		}
		skill3 = skill.slice().addArray(skill2);
		return [skill, skill2, skill3];//0原技能1衍生技能2全部技能
	}
	/**
	 * 尝试播放语音
	 * @param {*} path 
	 */
	tryPlayAudio(path) {
		return new Promise((res) => {
			game.playAudio({
				path: path,
				onPlay: () => {
					res(true)
				},
				onError: () => {
					res(false);
				}
			})
		});
	}
	/**
	 * 
	 * 从原技能再到衍生技能，随机播放武将台词，播放失败则继续尝试下一个
	 * @param {string} ID 武将id
	 */
	async randomSkillAudio(ID, origin, skin = ID) {
		// let skills = this.getSkill(ID);
		// game.trySkillAudio(skills[2].randomGet(), ID, true);
		let skills = this.getSkill(ID).slice(0, 2);
		let skill;
		let br = false;
		//先尝试原技能，再到衍生技
		for (let i = 0; i < skills.length; i++) {
			while (skills[i].length) {
				skill = skills[i].randomGet();
				let audioList = get.Audio.skill({ skill, player: skin }).audioList;
				br = await this.randomSkillAudio2(audioList, ID, origin);
				if (br) break;
				skills[i].remove(skill);
			}
			if (br) break;
		}
	}
	async randomSkillAudio2(audioList, ID, origin) {
		Danmu.createArea();
		let br = false;
		while (audioList.length) {
			let { promise, resolve } = Promise.withResolvers();
			let random = audioList.randomGet();
			let file = random.file;
			let text = random.text;
			game[(origin && !_status.connectMode && game.hasExtension('千幻聆音')) ? 'qhly_originPlayAudio' : 'playAudio']({/*●*/
				path: file,
				onPlay: (ev) => {
					br = true;
					try {
						//王者荣耀扩展的判断
						let hok = dzxy.extVar.hok;
						let isChar_hok = hok.audioIndex?.[ID] == undefined ? false : true;
						let isOnlineAudio = ev.target.src.startsWith('https://game.gtimg.cn') ? true : false;
						if (isOnlineAudio && isChar_hok && game.hasExtension('王者荣耀') && lib.config.HOKVOICE_APPRECIATION) {
							let voice = lib.config.HOKVOICE_APPRECIATION;
							let useAudio = game.HoKHasSkin(ID);
							let audioSrc = ev.target.src.replace(/^https:/, '');
							if (useAudio) {
								let findObj = useAudio[hok.audioArr].find(item => item[hok.audioUse] == audioSrc) || {};
								if (dzxy.getCF('taiciDanmu') && origin) Danmu.addDanmu(findObj[hok.audioText]);
							} else {
								useAudio = voice[hok.audioIndex[ID]]?.[hok.audioObj];
								if (Array.isArray(useAudio)) useAudio = useAudio[0];
								if (useAudio && Array.isArray(useAudio[hok.audioArr])) {
									let findObj = useAudio[hok.audioArr].find(item => item[hok.audioUse] == audioSrc) || {};
									if (dzxy.getCF('taiciDanmu') && origin) Danmu.addDanmu(findObj[hok.audioText]);
								}
							}
						}
						else if (dzxy.getCF('taiciDanmu') && origin) Danmu.addDanmu(text);
					} catch (error) {
						console.log(error);
					}
					resolve();
				},
				onError: () => {
					br = false;
					audioList.remove(random);
					resolve();
				}
			});
			await promise;
			if (br) return br;
		}
		return br;
	}
	randomSkillAudio3(ID) {
		let skills = this.getSkill(ID);
		game.trySkillAudio(skills[2].randomGet(), ID, true);
	}
	/**
	 * 
	 * @param {HTMLDivElement} Ele 要添加事件的元素
	 * @param {number} len 滑动距离
	 */
	scroll_lr(Ele, len) {
		let step = len / 10;
		let scr = function (event, len2) {
			let startL = Ele.scrollLeft;
			if (event.deltaY < 0) {
				Ele.scrollLeft = startL - step;
			} else {
				Ele.scrollLeft = startL + step;
			}
			let change = Math.abs(Ele.scrollLeft - startL);
			if (change == 0) return;
			if (change < len2) {
				len2 -= change;
				requestAnimationFrame(() => scr(event, len2));
			}
		}
		Ele.addEventListener('wheel', (event) => {
			event.preventDefault();
			requestAnimationFrame(() => scr(event, len));
		});
	}
	isModeBeautified() {
		return lib.config[`${dzxy.dz}chooseChar_${lib.config.mode}`];
	}
	/**武将名替换 来自千幻 */
	charNameRep(str) {
		if (typeof str != 'string') return '';
		var regex = /(<([^>]+)>)/ig;
		str = str.replace(regex, "");
		str = str.toUpperCase();
		var str2 = '';
		var nobreak = false;
		var chars = [...str];
		for (var i = 0; i < chars.length; i++) {
			if (chars[i] == '`') {
				nobreak = !nobreak; continue;
			}
			str2 += chars[i];
			if (nobreak) continue;
			if (chars[i] == 'S' && chars[i + 1] == 'P') continue;
			if (chars[i] == 'T' && chars[i + 1] == 'W') continue;
			if (chars[i] == 'O' && chars[i + 1] == 'L') continue;
			if (/[0-9]/.test(chars[i]) && /[0-9]/.test(chars[i + 1])) continue;
			if (i < chars.length - 1) {
				str2 += '<br>';
			}
		}
		return str2;
	}
	/**
	 * 
	 * @param {*} id 武将id
	 * @param {*} key 要获取的数据
	 * @param {*} handle 是否要将数据进行处理
	 * @returns 
	 */
	getCharData(id, key, handle) {
		let value;
		let char = lib.config[`${this.dz}charData`][id];
		if (char && char[key] != undefined) value = char[key];
		if (handle === true) {
			switch (key) {
				case 'loutou':
					if (value == undefined || value == 'default') {
						value = dzxy.getCF('originLoutou');
					}
					break;
				case 'skinloutou':
					if (value == undefined || value == 'default') {
						value = dzxy.getCF('skinLoutou');
					}
					break;
			}
		}
		return value;
	}
	setCharData(id, key, value) {
		if (lib.config[`${this.dz}charData`][id] == undefined) lib.config[`${this.dz}charData`][id] = {};
		lib.config[`${dzxy.dz}charData`][id][key] = value;
		this.saveCF('charData');
	}
	//★ 长按触发时把事件对象传给回调，供技能提示按点击位置定位
	addLongPress(ele, func) {
		var time;
		ele.addEventListener('touchstart', (evt) => {
			time = setTimeout(() => func(evt), 500);
		});
		ele.addEventListener('touchend', (evt) => {
			clearTimeout(time);
		});
		ele.addEventListener('touchmove', (evt) => {
			clearTimeout(time);
		});
		ele.onmousedown = function (e) {
			if (e.button == 2) {
				func(e);
			}
		}
	}
	/**★ 技能提示弹窗：与选将面板的 createSkillTip 同款样式，供禁将页长按武将使用 */
	showCharSkillTip(charID, event) {
		if (!charID || !get.character(charID)) return;
		//★ 没有事件对象时给个居中位置，避免 create.skillTip 取坐标报错
		if (!event || (typeof event.clientX != 'number' && !event.touches)) {
			event = { type: 'touchstart', touches: [{ clientX: window.innerWidth / 2, clientY: 200 }] };
		}
		if (!this.skillTipBody) {
			this.skillTipBody = this.create.bigBg(document.body);
			this.skillTipBody.style.pointerEvents = 'none';
			this.skillTipBody.style.zIndex = 16;
		}
		let skills = this.getSkill(charID);
		let innerSkill = '';
		skills[0].forEach(i => {
			innerSkill += `<p><span style="color:#59e806;">${get.translation(i)}: </span><span>${get.translation(i + '_info')}</span></p>`;
		});
		skills[1].forEach(i => {
			innerSkill += `<p><span style="color:#59e806;">※${get.translation(i)}: </span><span>${get.translation(i + '_info')}</span></p>`;
		});
		this.skillTipEle?.remove();
		this.skillTipEle = this.create.skillTip(innerSkill, event, this.skillTipBody, { t: 90, b: 50 });
	}
	openCharInfoPage(charID, charImg, flag) {
		let bg = dzxy.create.bigBg(document.body, 'image/banChar/bg_ss.png');
		dzxy.create.back(bg, () => {
			bg.remove();
		});
		let frame = dzxy.create.setFrame(bg);
		// let ltStyle = {
		//   'default': '默认',
		//   'none': '无',
		//   'shousha': '手杀',
		//   'shizhounian': '十周年'
		// };
		// let item = ui.create.div('.hor-item', frame.cont);
		// ui.create.div('.mode-title', '原画露头样式', item, { 'margin-right': '63px' });
		// let item2 = ui.create.div('.hor-item', frame.cont);
		// ui.create.div('.mode-title', '皮肤露头样式', item2, { 'margin-right': '63px' });
		// let charLt = dzxy.getCharData(charID, 'loutou') || 'default';
		// let charLt2 = dzxy.getCharData(charID, 'skinloutou') || 'default';
		// for (let i in ltStyle) {
		//   let plan = new DBtn(ui.create.div(charLt == i ? '.plan-text.active' : '.plan-text', ltStyle[i], item));
		//   plan.setClick(() => {
		//     plan.active(item);
		//     dzxy.setCharData(charID, 'loutou', i);
		//     if (charImg) charImg.dataset.loutou = i == 'default' ? dzxy.getCF('originLoutou') : i;
		//   })

		//   let plan2 = new DBtn(ui.create.div(charLt2 == i ? '.plan-text.active' : '.plan-text', ltStyle[i], item2));
		//   plan2.setClick(() => {
		//     plan2.active(item2);
		//     dzxy.setCharData(charID, 'skinloutou', i);
		//   })
		// }
		let skillsBox = ui.create.div('.kdiv.left', frame.cont);
		let innerSkill = '';

		if (flag === true) {
			let yansSkills = []

			let skills = lib._cust_character[charID].skills;
			skills.forEach(skill => {
				let info = lib._cust_translate[skill + '_info'] ||""
				const replacedText = info.replace(
					/<noname-poptip poptip = (\w+)><\/noname-poptip>/g,
					(match, key) => {
						// 直接通过key从映射表取值，无匹配则返回原标签（避免替换失败）
						if (key == "rule_chihengji") {
							//拥有此标签的技能不会被其他技能无效。
							return "持恒技"
						}
						yansSkills.push(key)
						return `〖${lib._cust_translate[key]}〗` || match;
					}
				);
				innerSkill += `<p><span style="font-size:18px;font-family:shousha;color:#e1ed2e;text-shadow: none;">${lib._cust_translate[skill]}: </span><span style="font-size:18px;font-family:shousha;color:#dcf3de;text-shadow: none;">${replacedText}</span></p>`

			})
			yansSkills.forEach(skillKey => {
				let info = lib._cust_translate[skillKey + '_info'] ||""
				const replacedText = info.replace(
					/<noname-poptip poptip = (\w+)><\/noname-poptip>/g,
					(match, key) => {
						// 直接通过key从映射表取值，无匹配则返回原标签（避免替换失败）
						if (key == "rule_chihengji") {
							//拥有此标签的技能不会被其他技能无效。
							return "持恒技"
						}
						return `〖${lib._cust_translate[key]}〗` || match;
					}
				);
				console.log("skillKey", lib._cust_translate[skillKey + '_info'])
				innerSkill += `<p><span style="font-size:18px;font-family:shousha;color:#e1ed2e;text-shadow: none;">${lib._cust_translate[skillKey]}: </span><span style="font-size:18px;font-family:shousha;color:#dcf3de;text-shadow: none;">${replacedText}</span></p>`


			})
		} else {
			let skills = dzxy.getSkill(charID);
			skills[0].forEach(i => {
				innerSkill += `<p><span style="font-size:18px;font-family:shousha;color:#e1ed2e;text-shadow: none;">${get.translation(i)}: </span><span style="font-size:18px;font-family:shousha;color:#dcf3de;text-shadow: none;">${get.translation(i + '_info')}</span></p>`;
			});
			skills[1].forEach(i => {
				innerSkill += `<p><span style="font-size:18px;font-family:shousha;color:#e1ed2e;text-shadow: none;">※${get.translation(i)}: </span><span style="font-size:18px;font-family:shousha;color:#dcf3de;text-shadow: none;">${get.translation(i + '_info')}</span></p>`;
			});
		}

		skillsBox.innerHTML = innerSkill;
	}
	playAudio(ext, path) {
		let audio = document.createElement('audio');
		let ext2, path2;
		if (arguments.length == 1) { ext2 = '斗转星移'; path2 = ext; }
		else { ext2 = ext; path2 = path }
		audio.src = `${lib.assetURL}extension/${ext2}/${path2}`;
		audio.autoplay = true;
		audio.volume = lib.config.volumn_audio / 8;
		audio.onended = (event) => audio.remove();
		audio.onerror = (event) => {
			audio.remove();
		};
	}
	delay(time) {
		return new Promise(resolve => setTimeout(resolve, time != undefined ? time : 10));
	};
	getDate(date) {
		switch (date) {
			case 'nyr':
				let now = new Date();
				let year = now.getFullYear();
				let month = now.getMonth() + 1;
				let day = now.getDate();
				return { year: year, month: month, day: day }
		}
	}
	/**防抖 */
	debounce(func, delay) {
		let timer = null;
		return function (...args) {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				func.apply(this, args);
				timer = null;
			}, delay);
		};
	}
	/**节流 */
	throttle(func, delay) {
		let lastTime = 0;
		return function (...args) {
			const now = Date.now();
			if (now - lastTime >= delay) {
				func.apply(this, args);
				lastTime = now;
			}
		};
	}
	/**
	 * 删除此扩展配置
	 * dzxy.deleteDzxyConfig()
	 */
	deleteDzxyConfig() {
		let config = lib.config;
		for (let i in config) {
			if (!i.startsWith('extension_斗转星移')) continue;
			game.saveConfig(i, undefined)
		}
	}
	/**
	 * 打印此扩展配置
	 * dzxy.logConfig()
	 */
	logConfig() {
		let config = lib.config;
		let o = {}
		for (let i in config) {
			if (!i.startsWith('extension_斗转星移')) continue;
			o[i] = config[i]
		}
		console.log('dzxy-config--------------', o);
	}
	/**
	 * 序列帧动画
	 * @param {*} node div节点
	 * @param {*} imgList 帧图片数组
	 * @param {number} time 时长(毫秒)
	 * @param {number} delay 延迟(毫秒)
	 * @returns 
	 */
	async frameAnim(node, imgList, time, delay) {
		if (delay != undefined) await dzxy.delay(delay)
		let frameTime = time / imgList.length;
		for (let i of imgList) {
			node.style.backgroundImage = `url(${i})`;
			await dzxy.delay(frameTime)
		}
		return node;
	}
	/**
	 * 图片预加载
	 */
	preloadImages() {
		game.getFileList('extension/斗转星移/image/frameAnim', (folders, files) => {
			let div = ui.create.div('.hidden', ui.create.div('.hidden', document.body))
			let url = ''
			for (let i of files) {
				url += `url("${dzxy.path}image/frameAnim/${i}"),`
			}
			div.style.backgroundImage = url.slice(0, -1);
		}, () => { });
	}
	/**
	 * 判断图片是否存在
	 * @param {*} url 
	 */
	checkImageExists(url) {
		return new Promise((resolve) => {
			let img = new Image();
			img.onload = () => resolve(true);
			img.onerror = () => resolve(false);
			img.src = url;
		});
	}
	isLocked_back = false;
	lock_back() {
		this.isLocked_back = true;
		setTimeout(() => {
			this.isLocked_back = false;
		}, 10);
	}
	/**
	 * 获取武将图的露头样式
	 * @param {*} imageElement 
	 * @returns 
	 */
	getCharLoutouByImg(imageElement) {
		if (!imageElement || imageElement.naturalWidth == 0 || imageElement.naturalHeight == 0) {
			return 'none';
		}
		let imgW = imageElement.naturalWidth;
		let imgH = imageElement.naturalHeight;

		let check2 = playerConfig.adjustCharLoutou2({ src: imageElement.dataset.originSrc, imgW: imgW, imgH: imgH });
		if (check2 != null) {
			return check2;
		}
		//是这两个宽高直接判断 应该不会有人用露头模板扣原画或是随手裁出这个宽高吧
		if (imgW == 138 && imgH == 253) return 'shousha';
		if (imgW == 400 && imgH == 472) return 'shizhounian';

		if (!this.transparencyCanvas) {
			this.transparencyCanvas = document.createElement('canvas');
		}
		let canvas = this.transparencyCanvas;
		let imgUseRatio = 0.25;
		let ctx = canvas.getContext('2d', { willReadFrequently: true });
		canvas.width = 100;
		canvas.height = 166 * imgUseRatio;

		//Canvas和图片的宽高比
		let canvasRatio = canvas.width / canvas.height;
		let imageRatio = imgW / imgH / imgUseRatio;
		let x, y, drawWidth, drawHeight;
		if (canvasRatio > imageRatio) {
			//宽度铺满
			drawWidth = canvas.width;
			drawHeight = (canvas.width / imgW) * imgH;
			x = 0;
			y = 0;
		} else {
			//高度铺满
			drawHeight = canvas.height / imgUseRatio;
			drawWidth = (canvas.height / imgH) * imgW / imgUseRatio;
			x = (canvas.width - drawWidth) / 2;
			y = 0;
		}
		ctx.drawImage(imageElement, x, y, drawWidth, drawHeight);
		let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		let data = imageData.data;

		/*
		//前面的四行像素
		let area1 = [];
		for (let y = 0; y < 4; y++) {
		  let tp = 0;
		  for (let x = 0; x < canvas.width; x++) {
			let index = (y * canvas.width + x) * 4;
			let alpha = data[index + 3];
			if (alpha < 150) tp++;
		  }
		  area1.push(tp / canvas.width);
		}
		//前四行水平线透明比都小于0.1的话，可认为是不露头的了
		if (area1.every(i => i < 0.1)) return 'none'
		*/

		//从下往上找到一条水平线透明比大于0.9的
		//模板扣的十周年：9；手杀：22；
		//折中判断
		let slice1 = 18, slice2 = 5;
		//去除两侧可能有白边的情况
		let whiteEdge = 0, needWhiteEdge = 0.05;
		for (let y = canvas.height; y > 0; y--) {
			let tp = 0;
			for (let x = 0; x < canvas.width; x++) {
				let index = (y * canvas.width + x) * 4;
				let alpha = data[index + 3];
				if (alpha < 150) tp++;
			}
			if (y > 30) {
				let Ratio = tp / canvas.width;
				if (Ratio > whiteEdge) whiteEdge = Ratio;
			}
			else if (y <= 30 && tp / canvas.width >= Math.min(0.1, needWhiteEdge + whiteEdge)) {
				if (y >= slice1) return 'shousha';
				else if (y >= slice2) return 'shizhounian';
				else return 'none'
			}
		}
		return 'none';
	}
	/**
	 * 调整露头
	 * @param {*} node 
	 * @returns 
	 */
	adjustCharLoutou(node) {
		if (!node || !node.classList) return;
		let loutou = this.getCF('smartLoutou');
		let bool = false;
		let clist = node.classList;
		//武将
		let hasChar = clist.contains('wujiang-char-img');
		let hasOringinSkin = clist.contains('oringin-skin');
		//皮肤
		let hasSkin = clist.contains('pifu-skin-img');
		//原皮肤
		let isOringinSkin = hasOringinSkin && hasSkin;
		//主将和副将
		let hasPrimaryAvatar = clist.contains('primary-avatar');
		let hasDeputyAvatar = clist.contains('deputy-avatar');
		if (loutou == 'dzxy') bool = hasChar || isOringinSkin;
		else if (loutou == 'all') bool = hasPrimaryAvatar || hasDeputyAvatar || hasChar || isOringinSkin;
		if (bool) {
			let bgImage = node.style.backgroundImage;
			if (!bgImage) return node;
			let match = bgImage.match(/url\("([^"]+)"\)/);
			if (match) {
				let check1 = playerConfig.adjustCharLoutou1({ src: match[1] });
				if (check1 != null) {
					node.dataset.loutou = check1;
				}
				else {
					let ltCache = dzxy.loutouCache[match[1]];
					if (ltCache) {
						node.dataset.loutou = ltCache;
						return node;
					}
					let img = new Image();
					/*因为取消调整露头动画过渡时间需要设置
					transition-duration: 0s
					background-repeat: no-repeat
					所以只设置此扩展的*/
					let isDzxyImg = hasChar || isOringinSkin;
					if (isDzxyImg) node.style.backgroundPositionX = '-999px';
					else node.dataset.loutou = this.getCF('smartLoutou_init');
					img.onload = () => {
						node.dataset.loutou = this.getCharLoutouByImg(img);
						if (isDzxyImg) node.style.backgroundPositionX = 'center';
						img = null;
						if (!dzxy.loutouCache[match[1]] && (hasPrimaryAvatar || hasDeputyAvatar)) {
							dzxy.loutouCache[match[1]] = node.dataset.loutou;
						}
					};
					img.onerror = () => {
						node.dataset.loutou = this.getCF('smartLoutou_back');
						if (isDzxyImg) node.style.backgroundPositionX = 'center';
						img = null;
						if (!dzxy.loutouCache[match[1]] && (hasPrimaryAvatar || hasDeputyAvatar)) {
							dzxy.loutouCache[match[1]] = node.dataset.loutou;
						}
					}
					img.src = match[1];
					img.dataset.originSrc = match[1];
				}
			}
		}
		return node;
	}
}
export default window.dzxy = new Dzxy();
//自动露头
if (dzxy.getCF('smartLoutou') != 'off') {
	//setBackgroundImage
	dzxy.originSetBackgroundImage = HTMLDivElement.prototype.setBackgroundImage;
	HTMLDivElement.prototype.setBackgroundImage = function () {
		dzxy.originSetBackgroundImage.apply(this, arguments);
		dzxy.adjustCharLoutou(this);
		return this;
	}
	//setBackground
	dzxy.originSetBackground = HTMLDivElement.prototype.setBackground;
	HTMLDivElement.prototype.setBackground = function () {
		dzxy.originSetBackground.apply(this, arguments);
		dzxy.adjustCharLoutou(this);
		return this;
	}
	lib.arenaReady.push(() => {
		ui.arena.dataset.hdloutou = dzxy.getCF('smartLoutou_init') == 'none' ? 'none' : 'shizhounian';
	})
}

//避免短时间提示多条
let showTip = dzxy.debounce(() => {
	dzxy.create.bottomBarTip('斗转星移扩展已将禁将功能覆盖，请关闭该扩展的禁将功能或使用其禁将功能', document.body, 2000);
}, 300);
//修改保存配置
dzxy.originSaveConfig = game.saveConfig;
game.saveConfig = function (key, value, local, callback) {
	// if (key == 'forbidai_user') {//因为这个本体每次打开都会改，所以不提示
	// }
	if (key == 'characters') {
		if (lib.config[`${dzxy.dz}autoOpenPack`]) showTip();
	}
	else if (key.slice(-7) == '_banned') {
		if (lib.config.all.mode.includes(key.slice(0, -7)) && lib.config[`${dzxy.dz}autoOpenPack`]) showTip();
	}
	dzxy.originSaveConfig.apply(this, [key, value, local, callback])
}

//王者荣耀
// import('../../王者荣耀/assets/data/audioIndex.js').then((module) => {
// Object.assign(dzxy.extVar.hok, module);
// });
