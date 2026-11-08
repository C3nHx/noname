import { lib, game, ui, get, ai, _status } from '../../noname.js';
import { packs } from "./character/character.js";
import { aReady } from "./character/aReady.js";
import { bundledSettingKeys, bundledAiBans as forbidaiList, applyBundledAiBans } from '../../noname/util/bundled-config.js';
export const type = 'extension';
export default function () {
	if(!lib.config.asset_version) game.saveConfig('asset_version', '无');//不再提示是否下载图片和字体素材
	const githubUrl = 'https://pd.qq.com/s/sydwvfnk?b=9';
	const copyHandler = `navigator.clipboard.writeText('${githubUrl}').then(() => alert('已成功复制，粘贴到浏览器打开')).catch(() => alert('复制失败，请截图保存二维码'))`;

/*function createCollapseTitle(key, title, color = "orange") {
	return {
		clear: true,
		name: `<span style='color:${color}'><font size='4'>${title}（点击折叠）▽</font></span>`,
		onclick() {
			const endId = key + "_end";
			const isCollapsed = !lib.config[key];
			if (isCollapsed) {
				lib.config[key] = [];
				let next = this.nextSibling;
				while (next) {
					const idEl = next.querySelector?.("[id]");
					if (idEl?.id === endId) break;
					lib.config[key].push(next);
					next = next.nextSibling;
				}
				this.innerHTML = `<span style='color:${color}'><font size='4'>${title}（点击展开）▷</font></span>`;
				lib.config[key].forEach(el => (el.style.display = "none"));
			} else {
				this.innerHTML = `<span style='color:${color}'><font size='4'>${title}（点击折叠）▽</font></span>`;
				lib.config[key].forEach(el => (el.style.display = ""));
				delete lib.config[key];
			}
		},
	};
}
function createCollapseEnd(key) {
	return {
		clear: true, name: `<span id='${key}_end'></span>`,
	};
}*/

window.zqjc = {
    url: lib.assetURL + "extension/懒人包",
    copy: function (sdir/*源*/, fn/*名*/, ddir/*目标*/, callback) {
        game.ensureDirectory(ddir, function () {
            game.readFile(sdir + '/' + fn, function (data) {
                game.writeFile(data, ddir, fn, callback || function () {});
            });
        });
    },

    importFileConfig: async function () {
        if (window.isImportingConfig) return;
        window.isImportingConfig = true;
        try {
            const preset = JSON.parse(await game.promises.readFileAsText('game/config.json'));
            const appearanceKeys = new Set(bundledSettingKeys);
            for (const [key, value] of Object.entries(preset)) {
                if (appearanceKeys.has(key)) {
                    await game.promises.saveConfig(key, value);
                }
            }
            await game.promises.saveConfig('version', lib.version);
            alert('懒人包推荐设置已恢复，即将重启游戏。');
            game.reload();
        } finally { window.isImportingConfig = false; }
    },
};

	if(!lib.config.new_tutorial){
		lib.onfree.push(function(){
			if(localStorage.getItem('gplv3_noname_alerted')){
			    game.saveConfig('new_tutorial',true);
			    game.saveConfig('hall_ip',lib.config.hall_ip,'connect');
			    game.saveConfig('last_ip', lib.config.hall_ip);
			    game.saveConfig('image_background_random', true);
			    if(lib.config.extensions.includes('斗转星移')) game.saveConfig("extension_斗转星移_backupBancharData", true)
			    alert("●欢迎来到无名杀【子琪懒人包】！\nQQ群：156708431。QQ频道：noname8diy\n软件完全免费！若您已付费，请立即申请退款！");
			    if(ui.dialog) ui.dialog.close();
			    while (ui.controls.length) {
					ui.controls[0].close();
				}
				if(ui.auto) ui.auto.show();
			    ui.background.style.zIndex = "7";
			    ui.background.setBackgroundImage("../../image/background/ol_bg.jpg");
			    if(ui.arena&&ui.arena.classList) ui.arena.classList.remove("only_dialog");
		    	//if(ui.dialog){
			    var stepx=function(){
					ui.create.dialog('<font size=6><b>懒人包注意事项</b></font>');
					ui.dialog.add('<div class="ss-note-bg"><div class="text center"><font size=5>'+
					'①出现报错先尝试【重启游戏】！</br>'+
					'②【时钟】按钮功能已变更到屏幕【左上角问号】图标！</br>'+
					'③使用官方离线包更新游戏可能导致此软件无法使用。</br>'+
					'④在懒人包基础上进行的美化修改建议做好文件备份。</br>'+
					'⑤软件免费，禁止倒卖！内置扩展均已获得作者同意。</br>'+
					'●感谢柴油鹿鹿、月萧/凌梦对懒人包美化提供帮助！</font></div></div>');
					//●用行内 !important 设置底图：优先级高于任何样式表，主题覆盖不掉
					var box=ui.dialog&&ui.dialog.querySelector?ui.dialog.querySelector('.ss-note-bg'):null;
					if(box){
						box.style.setProperty('box-shadow','inset 0 0 0 999px rgba(0,0,0,0.5)','important');
						box.style.setProperty('border','1px solid rgba(255,255,255,0.25)','important');
						box.style.setProperty('border-radius','12px','important');
						box.style.setProperty('padding','14px 18px','important');
						//●留出左右各 12px 的间距，否则右边缘贴住对话框被裁掉，右侧圆角看不见
						box.style.setProperty('box-sizing','border-box','important');
						box.style.setProperty('width','calc(100% - 24px)','important');
						box.style.setProperty('margin','10px auto','important');
					}
			   	};
			   	stepx();
		    	//} else setTimeout(game.resume(), 100);
			    if(ui.control){
			        ui.create.control('<b>确定</b>',function(){
			            game.reload();
			            var node = this;
			    	    node.firstChild.innerHTML = "<b>重启(3)</b>";
						setTimeout(function () {
							node.firstChild.innerHTML = "<b>重启(2)</b>";
							setTimeout(function () {
								node.firstChild.innerHTML = "<b>重启(1)</b>";
								setTimeout(function () {
								    node.firstChild.innerHTML = "<b>重启中</b>";
								    //setTimeout(function () { game.reload() }, 1000);
							    }, 1000);
							}, 1000);
						}, 1000); 
				   })
				};
				setTimeout(function () { ui.update() }, 100);
				//ui.controls[0].style.setProperty("z-index", "114514", "important");
			} else game.reload();
		});
	} else if(lib.version!=lib.config.version) game.saveConfig("version", lib.version);

	return {
		name: "懒人包",
		editable: false,
        connect: false,
	    content: function (config, pack) {
	    	delete lib.extensionMenu['extension_懒人包'].delete;
		    delete lib.extensionMenu['extension_懒人包'].edit;
		    //delete lib.extensionMenu['extension_懒人包'].enable;

		    const zqHpStyle = function() {
		    	var style = ui.css.hp_style;
		    	ui.css.hp_style = lib.init.css(lib.assetURL + "theme/style/hp", lib.config.hp_style);
		    	style.remove();
		    	if (ui.css.hp_stylesheet1) ui.css.hp_stylesheet1.remove();
		    	if (ui.css.hp_stylesheet2) ui.css.hp_stylesheet2.remove();
		    	if (ui.css.hp_stylesheet3) ui.css.hp_stylesheet3.remove();
		    	if (ui.css.hp_stylesheet4) ui.css.hp_stylesheet4.remove();
		    	delete ui.css.hp_stylesheet1;
		    	delete ui.css.hp_stylesheet2;
		    	delete ui.css.hp_stylesheet3;
		    	delete ui.css.hp_stylesheet4;
		    }
	        if (get.mode() == 'guozhan' && lib.config.extension_十周年UI_enable && lib.config.extension_十周年UI_newDecadeStyle == "off") {
		        if (lib.config.hp_style != 'xinglass') {
		            game.saveConfig('hp_style', 'xinglass');
		            zqHpStyle?.();
		        }
		    } else if (lib.config.hp_style == 'xinglass') {
		        game.saveConfig('hp_style', 'glass');
		        zqHpStyle?.();
		    }
	    }, 
        precontent: function () {
		    if(lib.config.extensions.includes('斗转星移') && lib.config.extensions.includes('假装无敌') && lib.config.extension_假装无敌_enable) {
		        game.saveConfig("extension_假装无敌_enable",false); //已被斗转星移和奇妙工具扩展取代
			    alert("懒人包的假装无敌已被【斗转星移】和【奇妙工具】扩展取代，您可以删除假装无敌扩展！");
		    }
		    if (lib.config.extension_懒人包_zq_mark_identity) {
		    	game.saveConfig('qhly_funcLoadInPrecontent', true); game.saveConfig('extension_千幻聆音_qhly_funcLoadInPrecontent', true); //千幻-联机动皮
		        game.saveConfig("auto_mark_identity", true, true); //自动标记身份
		    }
            /*if(lib.config.szn_ui_connect&&!_status.connectMode){ //客机重连关闭十周年UI后重新开启
                game.saveConfig("szn_ui_connect",false);
                if(lib.config.extensions.includes('十周年UI')&&!lib.config.extension_十周年UI_enable) game.saveConfig("extension_十周年UI_enable",true);
            }*/
            if (!lib.config.extension_十周年UI_enable || ["chess", "tafang"].includes(lib.config.mode)) game.saveConfig("show_round_menu", true);

            applyBundledAiBans(lib, game.saveConfig.bind(game));

           	lib.onfree.push(function(){
            	if(_status.connectMode) setTimeout(() => {
            		if (!game.ws){
            			var _info = lib.config.reconnect_info;
            			if(_info && _info[1]){
            				game.onlineID = _info[1];
            				if(typeof _info[2]=="string"){ game.roomId = _info[2]; game.roomIdServer = true; }
            			}
            			game.connect(get.config('hall_ip', 'connect') || lib.config.hall_ip);
            		}
            	}, 200);
            });

			var originalInited = lib.message.server.inited;
			lib.message.server.inited = function() {
				originalInited.apply(this, arguments);
				ui.create.toast(this.nickname ? '玩家 <span style="font-weight: bold; color: rgb(126, 180, 255)">' +get.plainText(this.nickname)+ "</span> 进入房间！" : "有玩家进入你的房间！");
				game.playAudio('../extension/懒人包/audio/Ciallo.mp3');
				if (lib.configOL.gameStarted) this.send("gameStart");
			};

			var deniedMsg = {
				version:   "加入失败：双方游戏版本不一致",
				key:       "网络延迟或游戏版本过低，请更新或重试", //进入大厅
				gaming:   "加入失败：游戏已开始",
				number:   "加入失败：房间已满",
				banned:   "加入失败：房间拒绝你加入",
				extension: "加入失败：房间禁止使用扩展！是否关闭所有扩展？",
				offline:   null,
			};
			const forkDenied = lib.message.client.denied;
            lib.message.client.denied = function(reason) {
                if (reason === 'lobby_auth' || reason === 'lobby_timeout') return forkDenied.apply(this, arguments);
				switch (reason) {
					case "version":
					case "key":
						alert(deniedMsg[reason]);
						game.saveConfig("tmp_owner_roomId");
						game.saveConfig("tmp_user_roomId");
						game.saveConfig("reconnect_info");
						break;
					case "gaming":
					case "number":
					case "banned":
						alert(deniedMsg[reason]);
						break;
					case "offline":
						if (_status.paused && _status.event.name == "game") setTimeout(game.resume, 500);
						break;
					case "extension":
						if (confirm(deniedMsg.extension)) {
							let libexts = lib.config.extensions;
							for (let i = 0; i < libexts.length; i++) game.saveConfig("extension_" + libexts[i] + "_enable", false);
						}
						break;
					default:
					alert(reason);
				}
				game.ws.close();
				if (_status.connectDenied) _status.connectDenied();
			};

//●手气卡，出自云中守望扩展
if(lib.config.extension_懒人包_swReplaceHandcards){
if(!(lib.config.extensions?.contains('云中守望')&&lib.config['extension_云中守望_enable'])){
game.swReplaceHandcards = function(...args) {
	var next = game.createEvent("replaceHandcards");
	for (var i = 0; i < arguments.length; i++) {
		if(Array.isArray(arguments[i])) {
			next.players = arguments[i];
		}
		else if(typeof arguments[i] === "number") {
			next.num = arguments[i];
		}
	}
	if(!next.num) {
		next.num = 1;
	}
	next.setContent("swReplaceHandcards");
	return next;
}
lib.element.content.swReplaceHandcards = async function(event, trigger, player) {
	const players = event.players;
	function singlePromise(player) {
		const choose = function(player) {
			return player.chooseBool().set("ai", () => false).set("prompt", "Ciallo～(∠・ω )⌒☆是否更换手牌？").set("prompt2", `剩余${player.swReplaceHandcards || 0}次`);
		}
		const send = (player, prompt2) => {
			player.chooseBool().set("ai", () => false).set("prompt", "Ciallo～(∠・ω )⌒☆是否更换手牌？").set("prompt2", prompt2);
			game.resume();
		};
		const sendback = (result, player) => {
			if (result && result.bool) {
				/*otherPile主要是针对那些用专属牌堆，不从一般牌堆摸牌的角色（如陈寿），该属性目前只有两个键值对，且都为函数
				 *getCards函数与获得牌相关，只传入要获得的牌数num作为参数
				 *discard与手气卡换牌后弃置牌相关，只传入要弃置的牌card作为参数
				 */
				const hs = player.getCards("h"),
					cards = [],
					otherGetCards = event.otherPile?.[player.playerid]?.getCards,
					otherDiscacrd = event.otherPile?.[player.playerid]?.discard;
				//先弃牌
				game.broadcastAll(
					function (player, hs, otherDiscacrd) {
						game.addVideo("lose", player, [get.cardsInfo(hs), [], [], []]);
						for (var i = 0; i < hs.length; i++) {
							hs[i].removeGaintag(true);
							if (otherDiscacrd) {
								otherDiscacrd(hs[i]);
							} else {
								hs[i].discard(false);
							}
						}
					},
					player,
					hs,
					otherDiscacrd
				);
				//再摸牌，先看有没有专属牌堆
				if (otherGetCards) {
					cards.addArray(otherGetCards(hs.length));
				} else {
					cards.addArray(get.cards(hs.length));
				}
				//添加标记相关
				//event.gaintag支持函数、字符串、数组。数组就是添加一连串的标记；函数的返回格式为[[cards1,gaintag1],[cards2,gaintag2]...]
				if (event.gaintag?.[player.playerid]) {
					const gaintag = event.gaintag[player.playerid];
					const list = typeof gaintag == "function" ? gaintag(hs.length, cards) : [[cards, gaintag]];
					game.broadcastAll(
						(player, list) => {
							for (let i = list.length - 1; i >= 0; i--) {
								player.directgain(list[i][0], null, list[i][1]);
							}
						},
						player,
						list
					);
				} else {
					player.directgain(cards);
				}
				player._start_cards = cards;
			}
		};
		const { promise, resolve } = Promise.withResolvers();
		if (player.isOnline()) {
			player.send(send, player, `剩余${player.swReplaceHandcards || 0}次`);
			player.wait((result, player) => {
				sendback(result, player);
				resolve(result?.bool);
			});
		} else if (player.isMine()) {
			const next = choose(player);
			const solver = (result, player) => {
				sendback(result, player);
				resolve(result?.bool);
			};
			if (_status.connectMode) {
				game.me.wait(solver);
			}
			next.forResult().then(result => {
				if (_status.connectMode) {
					game.me.unwait(result, player);
				} else {
					solver(result, player);
				}
			});
		} else {
			const next = choose(player);
			next.forResult().then(result => {
				sendback(result, player);
				resolve(result?.bool);
			});
		}
		return promise;
	}

	const num = event.num;
	players.forEach(p => p.swReplaceHandcards = num);
	let active = players.map(p => ({
		player: p,
		promise: singlePromise(p),
	}));
	while (active.length > 0) {
		const { result, current, index } = await Promise.race(
			active.map((t, i) =>
				t.promise.then(bool => ({
					result: bool,
					current: t.player,
					index: i,
				}))
			)
		);
		active.splice(index, 1);
		if (result && current.swReplaceHandcards > 1) {
			current.swReplaceHandcards--;
			active.push({
				player: current,
				promise: singlePromise(current),
			});
		}
	}

	players.forEach(p => delete p.swReplaceHandcards);
}

lib.skill._swReplaceHandCards = {
	ruleSkill: true,
	direct: true,
	lastDo: true,
	priority: -99999,
	superCharlotte: true,
	trigger: {
		player: "gameDrawAfter",
	},
	filter(event, player, name) {
		return _status.connectMode;
	},
	async content(event, trigger, player) {
		// 删除旧的手气卡事件
		if (get.event()?.getParent("game")?.next?.lastItem?.name === "replaceHandcards") {
			get.event().getParent("game").next.lastItem.finish();
		}
		await game.swReplaceHandcards(game.filterPlayer(), parseInt(3));
	},
}
}
};
            //★ 联机大厅：在自己创建的房间显示房主的游戏版本号（1.11.6+）
            (function () {
                const ZQ_SEP = "\u200b"; //零宽空格，不占显示宽度
                //① 发送钩子：建房 / 修改房间设置时，给配置副本的 mode 加上「版本号标记」
                if (game.send && !game.send._zqRoomVer) {
                    const _send = game.send;
                    const _mark = function (config) {
                        if (!config || typeof config !== "object" || !config.mode) return config;
                        const copy = Object.assign({}, config); //只在副本上改，绝不动真实的 lib.configOL
                        let label = "";
                        try {
                            //用真实模式算出该房间显示用的模式名（含「双将」「欢乐斗地主」等细节）
                            label = get.modetrans(Object.assign({}, config), false);
                        } catch (e) { }
                        //去掉开头的「N人」：大厅里没装本扩展的玩家会自己再加一次人数，避免重复
                        label = String(label || config.mode).replace(/^[0-9一二三四五六七八九十]+人/, "");
                        copy.mode = label + ZQ_SEP + " " + lib.version;
                        return copy;
                    };
                    const _sendWrap = function () {
                        const a = Array.prototype.slice.call(arguments);
                        try {
                            if (a[0] === "server" && a[1] === "create" && a[5] && typeof a[5] === "object") a[5] = _mark(a[5]);
                            else if (a[0] === "server" && a[1] === "config" && a[2] && typeof a[2] === "object") a[2] = _mark(a[2]);
                        } catch (e) { }
                        return _send.apply(this, a);
                    };
                    _sendWrap._zqRoomVer = true;
                    game.send = _sendWrap;
                }
            })();


            //★ 联机模式使用默认昵称时，直接弹出输入框让玩家改名
            lib.onfree.push(function () {
                if (!_status.connectMode) return;
                //if (window._zqNickChecked) return; //每次启动只处理一次
                window._zqNickChecked = true;
                setTimeout(async function () {
                    let nick = "";
                    try {
                        if (get.connectNickname) nick = get.connectNickname();
                    } catch (e) { }
                    if (!nick) nick = String(lib.config.connect_nickname || "");
                    nick = String(nick).trim();
                    if (!["请修改昵称", "无名玩家", "※请修改昵称", "※无名玩家"].includes(nick)) return;
                    if (ui.dialog && ui.dialog.classList.contains("popped")) return; //别打断正在显示的其他弹窗
                    const hasStar = nick.startsWith("※");
                    // const body = nick.replace(/^※+/, "").trim();
                    const val = await game.promises.prompt("检测到默认昵称" + nick + "，请修改：");
                    let name = String(val == null ? "" : val).replace(/<br>/g, "").replace(/^※+/, "").trim();
                    if (!name) return;
                    name = name.slice(0, 12);
                    game.saveConfig("connect_nickname", name);
                    game.saveConfig("connect_nickname", name, "connect");
                    if (hasStar) lib.config.connect_nickname = `※${typeof lib.config.connect_nickname == "string" ? lib.config.connect_nickname.slice(0, 12) : "无名玩家"}`;
                    //alert("联机昵称已改为" + name + "");
                }, 1000);
            });

        },
        config: {
			zqJoinUsQQ: {
			    name:`<a href="javascript:void(0)" onclick="${copyHandler}" style="color: #FFFACD;">点击复制无名杀懒人包频道地址</a>`,
				clear: true
			},
			//tutorial_title: createCollapseTitle("tutorial_title", "奇妙工具", "gold"),
			//tutorial_title_end: createCollapseEnd("tutorial_title"),
			swReplaceHandcards: {
			    name: '<b><font color=\"#80FFFF\">联机手气卡',
			    intro: '云中守望扩展的联机手气卡功能，默认3次',
			    init: true,
			},
			zq_mark_identity: {
			    name: '<font color=\'pink\'>强制标记身份</font>',
			    intro: '强制开启标记身份功能',
			    init: true,
                onclick: function (item) {
                    game.saveConfig('extension_懒人包_zq_mark_identity', item);
                    game.saveConfig('auto_mark_identity', item, true);
                },
			},
			zq_aiforbidai_characters: {
			    name: '<b><font color=\"#99FF75\">部分武将AI禁选',
			    intro: '部分武将禁止AI使用，点击下方查看禁用列表',
			    init: true,
			    onclick: function (item) {
			        game.saveConfig('extension_懒人包_zq_aiforbidai_characters', item);
			        applyBundledAiBans(lib, game.saveConfig.bind(game));
			    },
			},
			zq_aiforbidai_characters2: {
			    name: '<ins><font color=\"#FFFACD\">点击查看AI禁选列表</ins>',
			    onclick: function () {
			    	var intro = 'AI禁选列表：' + get.translation(forbidaiList);
			    	window.confirm(intro);
			    },
				clear: true
			},
			"x": {
				"name": "<font color=\"#FFFF00\">懒人包内置扩展均已获得作者同意</font>",
				"init": "x",
				"unfrequent": true,
				"item": {
					"x": " ",
				},
				"textMenu": function (node, link) {
					lib.setScroll(node.parentNode);
					node.parentNode.style.transform = "translate(-150px,-50px)";
					node.parentNode.style.height = "500px";
					node.parentNode.style.width = "355px";//宽度
					if (link) {
							node.innerHTML = "<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/plus.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/sznui.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/mz1.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/mz2.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/ssui.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/jzwd.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/jzwd2.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/qnss.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/wmbd1.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/wmbd2.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/wmbd3.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/jishou.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/pfqh.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/qianhuan.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/dzxy.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/qmgj.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/txcs.jpg>"+
							"<img style=width:338px src=" + lib.assetURL + "extension/懒人包/shouquan/zymh.jpg>";
					}
				},
			},
			importFileConfig2: {
				name: "<div><button id='importFileConfig' color=\"blacktext\" onclick='zqjc.importFileConfig()'>👉点击导入懒人包默认设置</button> </div>" + "<br/>★注意！每次使用" + "<font color=\"pink\">官方离线包更新</font>" + "后，懒人包默认设置会丢失，显示异常。<br/>【此扩展】将自动还原懒人包默认设置文件，或者点击上面按钮，将懒人包" + "<font color=\"#96CAFF\">默认设置文件</font>" + "重新导入游戏。<br/>在懒人包基础上进行美化修改的文件建议做好备份，并点击【设置→选项→其他】导出游戏设置备份。",
				clear: true
			},
		}, help: {}, arenaReady: function(){ return { ...aReady } }, package: {
			...packs,
			author: "子琪<br/>",
			intro:"懒人包用户请勿删除此扩展！"+"<br/><img style=width:225px src=" + lib.assetURL + "extension/懒人包/weixin.jpg>",
			diskURL: "",
			forumURL: "",
			version: "2.5",
		},
	}
}
