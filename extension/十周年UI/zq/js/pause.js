//历史记录栏美化
"use strict";
decadeModule.import(function (lib, game, ui, get, ai, _status) {
if (lib.config.extension_十周年UI_pause) {
		lib.init.css(lib.assetURL + "extension/十周年UI/zq/css", "pause");
		//★ 暗置/隐匿武将小头像：原来用纯黑渐变（代码实现）占位，改为显示素材 zq/image/pause/unknown.png
		var UNSEEN_AVATAR = 'url("extension/十周年UI/zq/image/pause/unknown.png")';
		//暗置/隐匿小头像统一走这里：换图并打标记，交给 pause.css 按原图比例完整居中显示
		function setUnknownAvatar(el) {
			el.style.backgroundImage = UNSEEN_AVATAR;
			el.classList.add("unknown_avatar");
		}
		//★ 记录顺序修正：未暂停的记录栏与暂停记录框都按 旧→新 从上往下显示，与无名杀原本的顺序一致
		if (!game._pauseLogOrderFixed) {
			game._pauseLogOrderFixed = true;
			var reverseLogChildren = function (box) {
				if (!box) return;
				var children = Array.prototype.slice.call(box.children);
				for (var n = children.length - 1; n >= 0; n--) box.appendChild(children[n]);
			};
			//★ 扩展载入时若已有记录，引擎默认是“最新在前”，先翻一次成“旧→新”
			reverseLogChildren(ui.arenalog);
			reverseLogChildren(ui.sidebar);
			var rawGameLog = game.log;
			game.log = function () {
				// 记录栏（#arenalog）超出高度时会被引擎自动裁剪：写入前先恢复“最新在前”，避免裁掉最新的一条
				reverseLogChildren(ui.arenalog);
				var sidebarFirst = ui.sidebar ? ui.sidebar.firstChild : null;
				var result = rawGameLog.apply(this, arguments);
				// 写入后再翻回“旧→新”
				reverseLogChildren(ui.arenalog);
				// 暂停记录框（#sidebar）不会自动裁剪：把刚插到最前面的新记录直接挪到末尾，保持“旧→新”
				if (ui.sidebar) {
					var node = ui.sidebar.firstChild;
					while (node && node !== sidebarFirst) {
						var next = node.nextSibling;
						ui.sidebar.appendChild(node);
						node = next;
					}
				}
				return result;
			};
		}
	ui.click.pauseClick = function (e) {
		event.stopPropagation(); // 阻止事件冒泡

		if (_status.dragged || !game.getIdentityList || _status.video || this.parentNode.forceShown) return;
		_status.clicked = true;
		var identityList;
		try {
			identityList = game.getIdentityList(this.parentNode);
		} catch (error) {}
		if (!identityList) {
			if (get.mode() == "guozhan") {
				identityList = {
					wei: "魏",
					shu: "蜀",
					wu: "吴",
					qun: "群",
					jin: "晋",
					ye: "野",
				};
				if (_status.forceKey) identityList["key"] = "键";
			}
		}
		if (!identityList) return;
		if (!this.classList.contains("guessing")) return;

		if (!window.pauseContainer) {
			if (window.decadeUI && decadeUI.element) {
				window.pauseContainer = decadeUI.element.create("identity-mark-box");
			} else {
				window.pauseContainer = ui.create.div(".identity-mark-box");
			}
			window.pauseContainer.ondeactive = function () {
				window.pauseContainer.remove();
				_status.clicked = false;
				if (!ui.arena.classList.contains("menupaused")) game.resume2();
			};
		}

		var index = 0;
		var node;
		var nodes = window.pauseContainer.childNodes;
		for (const key in identityList) {
			node = nodes[index];
			if (!node) {
				if (window.decadeUI && decadeUI.element) {
					node = decadeUI.element.create("identity-mark-item", window.pauseContainer);
				} else {
					node = ui.create.div(".identity-mark-item", window.pauseContainer);
				}
				node.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
					event.stopPropagation(); // 阻止事件冒泡

					var headbg = this.parentNode.parentNode;
					var identity = headbg.querySelector(".identity");
					var seat = Number(headbg.getAttribute("data-seat-num"));
					var targets = game.players.concat(game.dead).filter(function (current) {
						return current.getSeatNum() == seat;
					});
					if (targets.length) {
						var tar = targets[0];
						for (var element of tar.childNodes) {
							if (element.classList.contains("identity")) {
								if (element.classList.contains("guessing")) {
									if (get.mode() == "guozhan") {
										// 修改player的身份
										tar.setIdentity(this.link);
										// 修改headbg的身份
										var group_dict = {
											unknown: "unknown",
											wei: "cnty0",
											shu: "cnty1",
											wu: "cnty2",
											qun: "cnty3",
											jin: "cnty4",
											ye: "cnty5",
											key: "cnty6",
										};
										var group = tar.group;
										if (group in group_dict) identity.setBackgroundImage(`extension/十周年UI/zq/image/pause/game_hist_gz_${group_dict[group]}.png`);
										else identity.setBackgroundImage(`extension/十周年UI/zq/image/pause/game_hist_gz_${group_dict["unknown"]}.png`);
										// 修改namebg的颜色
										var namebgs = headbg.querySelectorAll(".char>.namebg");
										if (namebgs.length) {
											for (var namebg of namebgs) {
												if (game.dead.includes(tar)) namebg.style.filter = "grayscale(0%)";
												if (tar.group == "wei") namebg.style.backgroundColor = "rgba(46, 88, 148, 0.5)";
												else if (tar.group == "shu") namebg.style.backgroundColor = "rgba(133, 1, 1, 0.5)";
												else if (tar.group == "wu") namebg.style.backgroundColor = "rgba(94, 140, 49, 0.5)";
												else if (tar.group == "shen") namebg.style.backgroundColor = "rgba(248, 213, 104, 0.5)";
												else if (tar.group == "jin" || tar.group == "ye" || tar.group == "western") namebg.style.backgroundColor = "rgba(147, 112, 219, 0.5)";
												else namebg.style.backgroundColor = "rgba(210, 206, 133, 0.5)";
											}
										}
									} else {
										// 修改player的身份
										tar.setIdentity(this.link);
										// 修改headbg的身份
										var style = window.getComputedStyle(element);
										var backgroundImage = style.backgroundImage;
										backgroundImage = decodeURIComponent(backgroundImage); // 将经过URL编码的字符串转换回其原始的UTF-8字符串
										var url = backgroundImage.replace(/url\([""]?(.*?)[""]?\)/i, "$1");
										url = url.slice(lib.assetURL.length);
										identity.setBackgroundImage(url);
									}
								}
								break;
							}
						}
					}
					window.pauseContainer.remove();
					_status.clicked = false;
				});
			} else {
				node.style.display = "";
			}

			node.link = key;
			node.player = this.parentNode;
			node.innerText = identityList[key];
			index++;
		}

		while (index < nodes.length) {
			nodes[index].style.display = "none";
			index++;
		}

		game.pause2();
		setTimeout(
			function (player) {
				player.appendChild(window.pauseContainer);
			},
			0,
			this.parentNode
		);
	};
	ui.create.pause = function () {
		if (_status.pausing) return;
		ui.click.shortcut(false);
		var node = ui.create.div(".pausedbg", ui.window);
		node.style.backgroundColor = "rgba(0,0,0,0.5)";
		node.style.backgroundSize = "100% 100%";
		var node_resume = ui.create.div(".resumedbg", node);
		node_resume.style.backgroundSize = "100% 100%";
		_status.pausing = true;
		setTimeout(function () {
			_status.pausing = false;
		}, 500);
		if (lib.config.touchscreen) {
			setTimeout(function () {
				node_resume.addEventListener("touchend", function () {
					node.addEventListener("touchend", ui.click.resume);
				});
			}, 500);
		} else {
			node.addEventListener("click", ui.click.resume);
		}
		if (!lib.config.touchscreen) {
			node.oncontextmenu = ui.click.resume;
		}
		return node;
	};
	ui.click.pause = function () {
		if (_status.paused2 || _status.pausing || _status.nopause || !ui.pause) return;
		if (!_status.video) {
			if (ui.pause.classList.contains("hidden")) return;
			if (!_status.gameStarted) return;
		}
		ui.system.hide();
		game.pause2();
		// ● 新增：统一刷新记录行显隐的辅助函数。filterNames 为 null 时显示全部记录；否则只显示文本包含这些名字的记录。
		//   关键修复：对“分隔线”（空白记录行）做“不连续”限制——只有当上一条“可见”的记录不是分隔线时，才显示当前这条分隔线。
		//   这样点头像筛选后，中间被隐藏的回合所残留的多条空分隔线，不会连成一大串（解决“分隔线出现太多”）
		var applySidebarDisplay = function (filterNames) {
			var prevShownIsSep = false;
			var seenContent = false; // ● 新增：筛选模式下，是否已经出现过“可见的普通记录”（用于去掉筛选结果最顶部那条多余的分隔线）
			for (var element of ui.sidebar.children) {
				// 已被标记的“进入XX阶段”记录始终隐藏，不参与显示计算
				if (element.classList.contains("recg-hide")) continue;
				var text = element.textContent || "";
				var isSep = text.trim().length == 0;
				var show;
				// ● 改动：筛选时（filterNames 有值）分隔线还必须“前面已经有可见记录”才显示，从而去掉最顶部那条多余的分隔线
				if (isSep) show = !prevShownIsSep && (!filterNames || seenContent);
				else show = !filterNames || filterNames.some(function (name) { return text.indexOf(name) >= 0; });
				element.style.display = show ? "block" : "none";
				if (show) {
					prevShownIsSep = isSep;
					if (!isSep) seenContent = true;
				}
			}
		};
		applySidebarDisplay(null);
		var node = ui.create.pause();
		if (!node) return;
		node.addTempClass("start");
		var historybg = ui.create.div(".historybg", node);
		// ● 改动：点击记录框本身不关闭暂停界面，只有点记录框以外的空白区域才关闭（阻止点击/触摸事件冒泡到 .pausedbg 上的关闭逻辑）
		historybg.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
			e.stopPropagation();
		});
		// ● 改动：右键点记录框也不关闭暂停界面（桌面上 .pausedbg 绑定了 oncontextmenu 关闭，此处一并拦截，保证与左键行为一致）
		historybg.addEventListener("contextmenu", function (e) {
			e.stopPropagation();
		});
		var columnbox = ui.create.div(".content", node);
		if (get.mode() == "guozhan") columnbox.classList.add("guozhan");
		// 获取场上所有角色
		var player_list = [];
		var click = [];
		for (var player of game.players) {
			player_list.add(player);
			if (player.getElementsByClassName("yinni").length > 0) {
				player.name = "yinni";
				lib.translate.yinni = "主将";
			}
		}
		if (game.dead.length > 0) {
			for (var player of game.dead) {
				player_list.add(player);
			}
		}
		player_list.sort(function (a, b) {
			return a.getSeatNum() - b.getSeatNum();
		});
		for (var tar of player_list) {
			var headbg = ui.create.div(".headbg", columnbox);
			if (get.mode() == "guozhan") headbg.classList.add("guozhan");
			headbg.setAttribute("data-seat-num", tar.getSeatNum());
			var char = ui.create.div(".char", headbg);
			if (get.mode() == "guozhan") {
				if (tar == game.me) char.style.backgroundImage = tar.node.avatar.style.backgroundImage;
				else if (tar.isUnseen(0)) setUnknownAvatar(char); //★ 暗置主将改用 unknown.png
				else char.style.backgroundImage = tar.node.avatar.style.backgroundImage;
				var char_biaoji = ui.create.div(".char_biaoji", char);
				char_biaoji.innerHTML = "主";
			} else if (tar.isUnseen(0)) {
				if (tar.name2 && !tar.isUnseen(1)) char.style.backgroundImage = tar.node.avatar2.style.backgroundImage;
				else setUnknownAvatar(char); //★ 身份场暗置/隐匿小头像改用 unknown.png（无副将或双暗置时）
			} else char.style.backgroundImage = tar.node.avatar.style.backgroundImage;
			var namebg = ui.create.div(".namebg", char);
			if (game.dead.includes(tar)) char.style.filter = "grayscale(100%)";
			if (game.dead.includes(tar)) namebg.style.filter = "grayscale(0%)";
			if (tar.group == "wei") namebg.style.backgroundColor = "rgba(46, 88, 148, 0.5)";
			else if (tar.group == "shu") namebg.style.backgroundColor = "rgba(133, 1, 1, 0.5)";
			else if (tar.group == "wu") namebg.style.backgroundColor = "rgba(94, 140, 49, 0.5)";
			else if (tar.group == "shen") namebg.style.backgroundColor = "rgba(248, 213, 104, 0.5)";
			else if (tar.group == "jin" || tar.group == "ye" || tar.group == "western") namebg.style.backgroundColor = "rgba(147, 112, 219, 0.5)";
			else namebg.style.backgroundColor = "rgba(210, 206, 133, 0.5)";
			var name = document.createElement("span");
			name.classList.add("name");
			if (get.mode() == "guozhan") name.innerHTML = tar != game.me && tar.isUnseen(0) ? "未知将" : get.translation(tar.name1);
			else name.innerHTML = get.translation(tar.name);
			namebg.appendChild(name);
			if (name.innerHTML === "未知将") namebg.style.backgroundColor = "transparent"; //★ 未知将：名称底图改为透明
			if (get.mode() == "guozhan") {
				var gzchar = ui.create.div(".char", headbg);
				gzchar.classList.add("guozhan");
				if (tar == game.me) gzchar.style.backgroundImage = tar.node.avatar2.style.backgroundImage;
				else if (tar.isUnseen(1)) setUnknownAvatar(gzchar); //★ 暗置副将改用 unknown.png
				else gzchar.style.backgroundImage = tar.node.avatar2.style.backgroundImage;
				var gzchar_biaoji = ui.create.div(".char_biaoji", gzchar);
				gzchar_biaoji.innerHTML = "副";
				var gznamebg = ui.create.div(".namebg", gzchar);
				if (game.dead.includes(tar)) gzchar.style.filter = "grayscale(100%)";
				if (game.dead.includes(tar)) gznamebg.style.filter = "grayscale(0%)";
				if (tar.group == "wei") gznamebg.style.backgroundColor = "rgba(46, 88, 148, 0.5)";
				else if (tar.group == "shu") gznamebg.style.backgroundColor = "rgba(133, 1, 1, 0.5)";
				else if (tar.group == "wu") gznamebg.style.backgroundColor = "rgba(94, 140, 49, 0.5)";
				else if (tar.group == "shen") gznamebg.style.backgroundColor = "rgba(248, 213, 104, 0.5)";
				else if (tar.group == "jin" || tar.group == "ye" || tar.group == "western") gznamebg.style.backgroundColor = "rgba(147, 112, 219, 0.5)";
				else gznamebg.style.backgroundColor = "rgba(210, 206, 133, 0.5)";
				var gzname = document.createElement("span");
				gzname.classList.add("name");
				gzname.innerHTML = tar != game.me && tar.isUnseen(1) ? "未知将" : get.translation(tar.name2);
				gznamebg.appendChild(gzname);
				if (gzname.innerHTML === "未知将") gznamebg.style.backgroundColor = "transparent"; //★ 未知将：名称底图改为透明
				var seatNum = ui.create.div(".seat_num", headbg);
			}
			var headbg_selected = ui.create.div(".headbg_selected", headbg);
			if (get.mode() == "guozhan") headbg_selected.classList.add("guozhan");
			headbg_selected.addEventListener("click", function () {
				event.stopPropagation(); // 阻止事件冒泡

				var selected = this.parentNode.querySelector(".light");
				if (selected) {
					selected.classList.remove("light");
					click.remove(selected);
					event.link = this;
				}
				if (selected == this) {
					// 调整显示内容：显示全部记录；分隔线仍按“不连续”规则去重
					applySidebarDisplay(null);
				} else {
					if (click[0]) {
						click[0].classList.remove("light");
						click.remove(click[0]);
						event.link = null;
					}
					click.add(this);
					this.classList.add("light");
					event.link = this;
					// 调整显示内容
					var seat = Number(this.parentNode.getAttribute("data-seat-num"));
					var targets = game.players.concat(game.dead).filter(function (current) {
						return current.getSeatNum() == seat;
					});
					if (targets.length) {
						var current = targets[0];
						var names = [current.name, current.name1, current.name2];
						names = [...new Set(names)];
						names = names.map(name => get.translation(name)).filter(name => name.length > 0);
						// ● 改动：改用统一的显示刷新函数。筛选后残留的多条空分隔线会被去重成“相邻只保留一条”，不再连成一大串
						applySidebarDisplay(names);
					}
				}
			});
			// 获取猜测身份
			var identity = ui.create.div(".identity", headbg);
			if (get.mode() == "guozhan") identity.classList.add("guozhan");
			for (var element of tar.childNodes) {
				if (element.classList.contains("identity")) {
					if (["identity", "guozhan"].includes(get.mode())) {
						if (element.classList.contains("guessing")) identity.classList.add("guessing");
					}
					if (get.mode() == "guozhan") {
						var group_dict = {
							unknown: "unknown",
							wei: "cnty0",
							shu: "cnty1",
							wu: "cnty2",
							qun: "cnty3",
							jin: "cnty4",
							ye: "cnty5",
							key: "cnty6",
						};
						var group = tar.group;
						if (tar == game.me) {
							// 如果该玩家是玩家本人，则显示真实身份
							group = tar.trueIdentity ? tar.trueIdentity : lib.character[tar.name1][1];
						}
						if (group in group_dict) identity.setBackgroundImage(`extension/十周年UI/zq/image/pause/game_hist_gz_${group_dict[group]}.png`);
						else identity.setBackgroundImage(`extension/十周年UI/zq/image/pause/game_hist_gz_${group_dict["unknown"]}.png`);
					} else {
						var style = window.getComputedStyle(element);
						var backgroundImage = style.backgroundImage;
						var url = backgroundImage.replace(/url\([""]?(.*?)[""]?\)/i, "$1");
						url = url.slice(lib.assetURL.length);
						identity.setBackgroundImage(url);
					}
					break;
				}
			}
			// 身份场选身份
			if (["identity", "guozhan"].includes(get.mode())) {
				identity.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.pauseClick);
			}
		}
		// ● 改动：场上武将较多时，左侧头像列表可上下滚动（否则最下面的头像点不到）
		if (columnbox.childNodes.length) {
			var firstIdentity = columnbox.querySelector(".identity");
			var overX = 0;
			var overY = 0;
			if (firstIdentity) {
				var contentRect = columnbox.getBoundingClientRect();
				var identityRect = firstIdentity.getBoundingClientRect();
				// ● 改动：身份标记向左、向上溢出头像列，用内边距预留空间，避免被滚动容器裁掉
				overX = Math.max(0, Math.ceil(contentRect.left - identityRect.left) + 1);
				overY = Math.max(0, Math.ceil(contentRect.top - identityRect.top) + 1);
			}
			var isGuozhanList = columnbox.classList.contains("guozhan");
			//●新增：读取 CSS 里的 --avatarTopOffset（见 pause.css），使 CSS 与这里始终用同一个值，避免 CSS 改了却被下面的行内样式覆盖
			var avatarTopOffset = parseFloat(window.getComputedStyle(node).getPropertyValue("--avatarTopOffset")) || 0;
			var topPercent = ((isGuozhanList ? 1.8 : 2.7) + avatarTopOffset).toFixed(1) + "%";//●改动：原为写死的 1.8%/2.7%，现在叠加整列头像下移量
			var leftPercent = isGuozhanList ? "16.8%" : "29.2%";
			columnbox.style.overflowY = "auto";
			columnbox.style.overflowX = "hidden";
			// ● 改动：保持头像视觉位置不变——容器向外挪出溢出量，再把内边距补回来
			if (overX > 0) {
				columnbox.style.paddingLeft = overX + "px";
				columnbox.style.setProperty("left", "calc(" + leftPercent + " - " + overX + "px)", "important");
			}
			if (overY > 0) {
				columnbox.style.paddingTop = overY + "px";
				columnbox.style.setProperty("top", "calc(" + topPercent + " - " + overY + "px)", "important");
			}
			columnbox.style.height = "calc(100% - " + topPercent + " - 1%)";
		}
		ui.sidebar3.innerHTML = "";
		if (lib.config.show_discardpile) {
			for (var i = 0; i < ui.discardPile.childNodes.length; i++) {
				var div = ui.create.div(ui.sidebar3);
				div.innerHTML = get.translation(ui.discardPile.childNodes[i]);
				ui.sidebar3.insertBefore(div, ui.sidebar3.firstChild);
			}
		}
		historybg.appendChild(ui.sidebar);
		// ● 改动：让历史记录按时间“从旧到新”排列，最新的记录显示在最下面；原引擎 game.log() 每来一条新记录都用 insertBefore 插到最前面，所以显示时最新记录一直压在最上面（是反的）
		if (ui.sidebar.children.length) {
			var logNodes = Array.prototype.slice.call(ui.sidebar.children);
			// ● 新增：给“空白记录”打标记。本体在每名角色回合开始前会 game.log() 打一条空记录（见 noname 的 phase 事件），
			//   这里把内容为空白的记录节点加上 recg-sep 类；配合 pause.css 里的规则，只在记录框内把这条空行显示成图2那样的分隔线，
			//   正常对战时（记录栏不在记录框内）不受影响
			for (var m = 0; m < logNodes.length; m++) {
				var sepText = logNodes[m].textContent.trim();
				if (!sepText) logNodes[m].classList.add("recg-sep");
				// ● 新增：给“某某进入了XX阶段”这类记录打标记（本体 phase 事件里 game.log(player,"进入了准备/判定/摸牌/出牌/弃牌/结束阶段")）。
				//   配合 pause.css 的规则，只在记录框里隐藏这类记录；正常对战的记录栏不受影响
				else if (sepText.indexOf("进入了") >= 0 && sepText.indexOf("阶段") >= 0) {
					logNodes[m].classList.add("recg-hide");
					// ● 新增：同时用带 !important 的行内样式直接隐藏，双保险——万一 CSS 选择器没匹配上也能隐藏。
					//   注意：下面三处筛选循环都会跳过 recg-hide 节点，不会再把它的 display 覆盖成 block，所以这里设的隐藏不会被冲掉
					logNodes[m].style.setProperty("display", "none", "important");
				}
			}
			//★ 改动：_logSeq 的记录方向随之调整——DOM 现在已是“旧→新”，新产生的记录按“从旧到新”补号，
			// 保证排序后仍保持“旧→新”，与上面 game.log 的统一顺序一致
			var maxSeq = 0;
			for (var i = 0; i < logNodes.length; i++) {
				if (typeof logNodes[i]._logSeq == "number" && logNodes[i]._logSeq > maxSeq) maxSeq = logNodes[i]._logSeq;
			}
			var freshLogs = logNodes.filter(function (n) {
				return typeof n._logSeq != "number";
			});
			for (var j = 0; j < freshLogs.length; j++) {
				freshLogs[j]._logSeq = maxSeq + j + 1;
			}
			// ● 改动：按序号从小到大（旧→新）重新挂载，使最新的记录落在最底部
			logNodes.sort(function (a, b) {
				return a._logSeq - b._logSeq;
			});
			for (var k = 0; k < logNodes.length; k++) ui.sidebar.appendChild(logNodes[k]);
			// ● 新增：排序（旧→新）完成后再按逻辑顺序刷新一次显隐并去重，避免被隐藏的“进入XX阶段”记录把两条分隔线挤到一起
			applySidebarDisplay(null);
		}
		node.appendChild(ui.sidebar3);
		ui.historybar.classList.add("paused");
		ui.arena.classList.add("paused");
		ui.window.classList.add("touchinfohidden");
		ui.time.hide();
		if (game.onpause) {
			game.onpause();
		}
		if (ui.sidebar.childNodes.length && ui.sidebar.scrollHeight > ui.sidebar.offsetHeight) {
			ui.sidebar.scrollTop = ui.sidebar.scrollHeight - ui.sidebar.clientHeight;
		}
		// 创建滚轮
		// ● 改动：删除读取 pausescrollsize 设置来定位滚轮的逻辑；滚轮位置改由 CSS 固定（.pausedbg > .scrollbar 的 left）
		var scrollbar = ui.create.div(".scrollbar", node);
		var scrollbutton = ui.create.div(".scrollbutton", scrollbar);
		scrollbutton.classList.add("bottom");
		ui.sidebar.scrollTop = ui.sidebar.scrollHeight - ui.sidebar.clientHeight; // 设置初始位置为最底部
		const scrollbarHeight = scrollbar.clientHeight;
		ui.sidebar.addEventListener("scroll", function () {
			const scrollHeight = ui.sidebar.scrollHeight; // 滚动框窗口总高度
			const clientHeight = ui.sidebar.clientHeight; // 滚动框展示窗口高度
			const scrollTop = ui.sidebar.scrollTop; // 从滚动框顶部开始到当前位置的长度
			// 设置按钮的大小
			const buttonHeight = (scrollbarHeight * clientHeight) / scrollHeight;
			scrollbutton.style.height = `${Math.max(2, buttonHeight).toFixed(1)}px`;
			// 设置按钮的位置
			const buttonPos = (scrollbarHeight - scrollbutton.clientHeight) * (scrollTop / (scrollHeight - clientHeight));
			scrollbutton.style.top = `${buttonPos}px`;
		});
	};
}
}); //★ 手杀记录：结束 decadeModule.import 包装
