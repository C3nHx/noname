import { lib, game, ui, get, ai, _status } from "../../../noname.js";

export function ssNumberPick() {
	//●联机模式下禁用手杀选数：不安装自绘数字面板，也不改写本体的 chooseNumbers / chooseControl
	//  （放在 installed 标记之前，联机时不会占用标记，回到单机后仍能正常安装）
	if (_status.connectMode) return;
	if (window.__ssNumberPickInstalled) return;
	window.__ssNumberPickInstalled = true;

	const IMG = lib.assetURL + "extension/自用美化/image/";

	//●shuzibg.png 框内偏移：先把背景放大到超过边框（否则 100% 100% 铺满时 background-position 无效），再用位置做平移
	//  例：BG_SIZE = "112% 112%"，BG_POS = "calc(50% + 6px) calc(50% - 3px)"（右移6px、上移3px）
	const BG_SIZE = "100% 105%";
	const BG_POS = "center calc(50% + 2.8px)";

	const injectCss = function () {
		if (document.getElementById("ss-numberpick-style")) return;
		const style = document.createElement("style");
		style.id = "ss-numberpick-style";
		style.textContent =
			".ss-numwrap{display:flex;flex-direction:column;align-items:center;gap:6px;margin-right:12px;flex-shrink:0;background:none !important;border:none !important;box-shadow:none !important;padding:0 !important;transition:none !important;animation:none !important;}" +
			".ss-numrow{position:relative;width:150px;height:50px;background-size:" + BG_SIZE + ";background-position:" + BG_POS + ";background-repeat:no-repeat;background-image:url('" + IMG + "shuzi/shuzibg.png');transition:none !important;animation:none !important;}" +
			//●布局：减号在左、数值居中、加号在右
			".ss-numval{width:35px;height:33.5px;left:50%;margin-left:-17.5px;top:8px;text-align:center;font-size:23.5px;line-height:34px;background-size:100% 100%;background-image:url('" + IMG + "game_choose_label_bg.png');font-family:'shousha';color:#fcfcbf;position:absolute;transition:none !important;animation:none !important;}" +
			".ss-numminus{width:40px;height:40px;left:4px;top:5px;background-position:center;background-repeat:no-repeat;background-size:80% 80%;background-image:url('" + IMG + "shuzi/jianhao.png');position:absolute;cursor:pointer;transition:none !important;animation:none !important;}" +
			".ss-numplus{width:40px;height:40px;right:4px;top:5px;background-position:center;background-repeat:no-repeat;background-size:80% 80%;background-image:url('" + IMG + "shuzi/jiahao.png');position:absolute;cursor:pointer;transition:none !important;animation:none !important;}" +
			".ss-numdisable{pointer-events:none;filter:grayscale(100%);}";
		document.head.appendChild(style);
	};

	const CN_UNITS = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

	const numOfCn = function (c) {
		if (/^\d+$/.test(c)) return parseInt(c, 10);
		if (c === "十") return 10;
		if (c.length === 2 && c[0] === "十" && CN_UNITS[c[1]] && c[1] !== "两") return 10 + CN_UNITS[c[1]];
		if (c.length === 2 && CN_UNITS[c[0]] && c[0] !== "两" && c[1] === "十") return CN_UNITS[c[0]] * 10;
		if (c.length === 3 && CN_UNITS[c[0]] && c[0] !== "两" && c[1] === "十" && CN_UNITS[c[2]] && c[2] !== "两") return CN_UNITS[c[0]] * 10 + CN_UNITS[c[2]];
		const v = CN_UNITS[c];
		return v != null ? v : NaN;
	};

	const isNumControl = function (c) {
		if (c === "cancel2") return true;
		return !isNaN(numOfCn(c));
	};

	const isNumControls = function (controls) {
		if (!Array.isArray(controls) || controls.length < 2) return false;
		const nums = controls.filter((c) => c !== "cancel2");
		if (!nums.length) return false;
		return controls.every(isNumControl) && nums.every((c) => !isNaN(numOfCn(c)));
	};

	const parseItem = function (item, event, index) {
		if (Array.isArray(item)) {
			let arr;
			if (["asc", "sort"].includes(item[0])) arr = item.slice(1).slice().sort((a, b) => a - b);
			else if (item[0] == "desc") arr = item.slice(1).slice().sort((a, b) => b - a);
			else arr = item.slice();
			return { seq: arr };
		}
		const min = item.min || 0;
		let max = item.max || 9;
		const base = item.base || 1;
		if (event.optionSum) {
			max = Math.min(max, event.optionSum - event.numbers.reduce((sum, num) => sum + num, 0) + event.numbers[index]);
		}
		return { min, max, base, seq: null };
	};

	const neighbors = function (state, event) {
		const cur = event.numbers[state.index];
		const p = parseItem(state.item, event, state.index);
		if (p.seq) {
			const i = p.seq.indexOf(cur);
			if (i < 0) return { prev: null, next: null };
			return { prev: i > 0 ? p.seq[i - 1] : null, next: i < p.seq.length - 1 ? p.seq[i + 1] : null };
		}
		let prev = null;
		for (let n = cur - p.base; n >= p.min; n -= p.base) {
			if (event.filterSelect(n, state.index, event)) {
				prev = n;
				break;
			}
		}
		let next = null;
		for (let n = cur + p.base; n <= p.max; n += p.base) {
			if (event.filterSelect(n, state.index, event)) {
				next = n;
				break;
			}
		}
		return { prev, next };
	};

	const refreshRow = function (state, event) {
		state.val.innerHTML = event.numbers[state.index];
		const { prev, next } = neighbors(state, event);
		state.minus.classList.toggle("ss-numdisable", prev == null);
		state.plus.classList.toggle("ss-numdisable", next == null);
	};

	const buildPicker = function (event) {
		const wrap = ui.create.div(".ss-numwrap");
		const rows = [];
		event.list.forEach((item, index) => {
			const row = ui.create.div(".ss-numrow", wrap);
			const minus = ui.create.div(".ss-numminus", row);
			const plus = ui.create.div(".ss-numplus", row);
			const val = ui.create.div(".ss-numval", row);
			const state = { item, index, minus, plus, val };
			minus.addEventListener("click", () => {
				const { prev } = neighbors(state, event);
				if (prev == null) return;
				event.numbers[state.index] = prev;
				rows.forEach((s) => refreshRow(s, event));
				if (state.onchange) state.onchange();
			});
			plus.addEventListener("click", () => {
				const { next } = neighbors(state, event);
				if (next == null) return;
				event.numbers[state.index] = next;
				rows.forEach((s) => refreshRow(s, event));
				if (state.onchange) state.onchange();
			});
			rows.push(state);
		});
		//●选数条原始尺寸（每行150×50，行间距6），塞进确认栏后按确认按钮高度缩放
		wrap.ssNumBaseH = event.list.length * 50 + Math.max(0, event.list.length - 1) * 6;
		wrap.ssNumBaseW = 150;
		return { wrap, rows };
	};

	const removeDom = function (event) {
		if (event.__ssNumTimer) {
			clearInterval(event.__ssNumTimer);
			delete event.__ssNumTimer;
		}
		if (event.__ssNumDom) {
			if (event.__ssNumDom.parentNode) event.__ssNumDom.remove();
			delete event.__ssNumDom;
		}
	};

	//●直接塞进十周年UI的确认/取消栏（ui.confirm 就是 .control 容器），
	//  由十周年UI的确认栏 flex 布局负责纵向对齐；这里只控制大小和间距。
	//  注意：选数条是确认栏的兄弟节点而不是子节点，否则会把确认栏本身撑宽，导致“确定”被推右。
	const attachPicker = function (event) {
		try {
			const wrap = event.__ssNumDom;
			if (!wrap) return;
			const container = ui.control;
			const bar = ui.confirm;
			const okBtn = bar && bar.childNodes && bar.childNodes.length ? bar.childNodes[0] : null;
			if (container && bar && bar.parentNode === container && okBtn) {
				//●插到确认栏前面，和它平级，这样确认栏宽度不变，始终可以真正居中
				if (!container.contains(wrap) || wrap.nextSibling !== bar) container.insertBefore(wrap, bar);
				wrap.classList.remove("control");
				const nh = wrap.ssNumBaseH || 50;
				const nw = wrap.ssNumBaseW || 150;
				//●高度与确认按钮一致，可整体缩放（__ssNumScale 仅用于微调）
				const scale = ((okBtn.offsetHeight || 38) / nh) * (window.__ssNumScale || 1.5);
				wrap.style.position = "static";
				wrap.style.left = "auto";
				wrap.style.top = "auto";
				wrap.style.right = "auto";
				wrap.style.bottom = "auto";
				wrap.style.transform = "none";
				wrap.style.flex = "0 0 auto";
				wrap.style.alignSelf = "center";
				wrap.style.margin = "0 20px 5px 0";/*●*/
				wrap.style.width = nw + "px";
				wrap.style.height = nh + "px";
				wrap.style.zoom = scale;
				wrap.style.opacity = "1";
				wrap.style.visibility = "visible";
				wrap.style.pointerEvents = "auto";
				//●让确认栏按“排除选数条”的宽度重新居中
				if (ui.updatec) ui.updatec();
				return;
			}
			//兜底：没有确认栏时居中显示
			if (wrap.parentNode !== document.body) document.body.appendChild(wrap);
			wrap.style.position = "absolute";
			wrap.style.left = "50%";
			wrap.style.top = "auto";
			wrap.style.bottom = "12%";
			wrap.style.transform = "translateX(-50%)";
			wrap.style.visibility = "visible";
		} catch (e) {}
	};

	const scheduleAttach = function (event) {
		attachPicker(event);
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => attachPicker(event));
		[60, 160, 360].forEach((t) => setTimeout(() => attachPicker(event), t));
		//●确认栏在确定/取消之间切换时可能重建或替换子节点，选数条会被一起移除，这里定时补回去
		if (!event.__ssNumTimer) {
			event.__ssNumTimer = setInterval(() => attachPicker(event), 200);
		}
	};

	const updateConfirm = function (event) {
		if (event.filterOk(event)) {
			if (event.forced) ui.create.confirm("o");
			else ui.create.confirm("oc");
		} else {
			if (!event.forced) ui.create.confirm("c");
			else if (ui.confirm) ui.confirm.close();
		}
		scheduleAttach(event);
	};

	const origChooseNumbers = lib.element.content.chooseNumbers;
	lib.element.content.chooseNumbers = async function (event, trigger, player) {
		if (
			lib.config.extension_自用美化_numberPick === false ||
			_status.connectMode ||
			!lib.config.extension_十周年UI_enable ||
			lib.config.extension_十周年UI_newDecadeStyle !== "off" ||
			_status.connectMode ||
			typeof event.isMine !== "function" ||
			!event.isMine() ||
			!Array.isArray(event.list) ||
			!event.list.length
		) {
			return origChooseNumbers.apply(this, arguments);
		}
		let result;
		if (!Array.isArray(event.numbers)) event.numbers = [];
		if (!event.numbers.length) {
			event.list.forEach((item, index) => {
				if (Array.isArray(item)) {
					if (["asc", "sort"].includes(item[0])) event.numbers.push(item.slice(1).sort((a, b) => a - b)[0]);
					else if (item[0] == "desc") event.numbers.push(item.slice(1).sort((a, b) => b - a)[0]);
					else event.numbers.push(item[0]);
				} else {
					event.numbers.push(item.min || 0);
				}
			});
		}
		result = await new Promise((resolve) => {
			_status.imchoosing = true;
			event.settleed = false;
			//●本体是无条件创建 dialog；这里只在有 prompt 时创建，会让"只有 prompt2"的选择框在
			//  下一行 addText 时读到 undefined 而报错，所以恢复成无条件创建
			event.dialog = ui.create.dialog(event.prompt || "请调整以下数值", "hidden");
			if (event.prompt2) {
				event.dialog.addText(event.prompt2);
			}
			event.switchToAuto = () => {
				if (!event.filterOk(event)) {
					if (!event.forced) event._result = { bool: false };
					else event._result = "ai";
				} else {
					event._result = "ai";
				}
				removeDom(event);
				if (event.dialog && event.dialog.close) event.dialog.close();
				if (ui.confirm) ui.confirm.close();
				game.resume();
				_status.imchoosing = false;
				resolve(event._result);
			};
			injectCss();
			const { wrap, rows } = buildPicker(event);
			event.__ssNumDom = wrap;
			if (event.dialog) {
				event.dialog.open();
			}
			rows.forEach((state) => {
				refreshRow(state, event);
				state.onchange = () => updateConfirm(event);
			});
			event.custom.replace.confirm = (bool) => {
				if (bool) event._result = { bool: true, numbers: event.numbers.slice() };
				else event._result = { bool: false };
				removeDom(event);
				if (event.dialog && event.dialog.close) event.dialog.close();
				if (ui.confirm) ui.confirm.close();
				game.resume();
				_status.imchoosing = false;
				resolve(event._result);
			};
			updateConfirm(event);
			game.pause();
			game.countChoose();
			event.choosing = true;
		});
		if (event.time) {
			game.broadcastAll((time) => {
				lib.configOL.choose_timeout = time;
			}, event.time);
		}
		if ((!result || result == "ai" || (event.forced && !result.bool)) && event.processAI) {
			const numbers = event.processAI(event);
			if (typeof numbers == "boolean") {
				if (numbers == true) result = { bool: true, numbers: event.numbers };
				else result = { bool: false };
			} else if (Array.isArray(numbers)) {
				result = { bool: true, numbers };
			} else {
				result = { bool: false };
			}
		}
		event.result = result;
	};

	const origChooseControl = lib.element.content.chooseControl;
	if (Array.isArray(origChooseControl)) {
		//●addDialog 的展示逻辑与本体 dialogcontrol 分支保持一致：
		//  "cards" 用 addSmall，其余交给 dialog.add；最后补一个占位撑开对话框
		const ssShowAddDialog = function (event, open) {
			if (!event.addDialog || event.dialogcontrol) return;
			if (!event.dialog) {
				event.dialog = ui.create.dialog(event.prompt || "hidden", "hidden");
				//●回退本体时本体不会再走 prompt2 分支，这里补上；自绘分支后面自己会加，避免重复
				if (!open && event.prompt2) event.dialog.addText(event.prompt2, Boolean(event.prompt2.length <= 20 || event.centerprompt2));
			}
			for (const _item of event.addDialog) {
				if (get.itemtype(_item) == "cards") event.dialog.addSmall(_item);
				else event.dialog.add(_item);
			}
			event.dialog.add(ui.create.div(".placeholder.slim"));
			if (open) event.dialog.open();
		};
		const ssControlStep = function (event, player) {
			if (event.arrangeSkill) {
				return origChooseControl[0].call(this, event, player);
			}
			try {
				console.log("[SS-NUM] chooseControl numeric", JSON.stringify(event.controls));
			} catch (e) {}
			if (event.hsskill && _status.prehidden_skills.includes(event.hsskill) && event.controls.includes("cancel2")) {
				event.result = { bool: true, control: "cancel2" };
				return;
			}
			const hasCancel = event.controls.includes("cancel2");
			const rawControls = event.controls.filter((c) => c !== "cancel2");
			const nums = rawControls.map(numOfCn);
			const numToControl = new Map();
			for (let i = 0; i < rawControls.length; i++) {
				if (!numToControl.has(nums[i])) numToControl.set(nums[i], rawControls[i]);
			}
			const min = Math.min(...nums);
			const max = Math.max(...nums);
			event.numbers = [numToControl.has(1) ? 1 : min];
			event.list = [{ min, max }];
			event.filterSelect = (n) => numToControl.has(n);
			event.filterOk = () => numToControl.has(event.numbers[0]);
			event.forced = !hasCancel;
			if (event.prompt) {
				event.dialog = ui.create.dialog(event.prompt);
			}
			//●本体只在 dialogcontrol 分支里处理 addDialog；数字按钮走的是普通分支，
			//  不补这段就会只剩数字按钮、看不见 addDialog 传入的牌/文字
			ssShowAddDialog(event, true);
			if (event.prompt2) {
				event.dialog.addText(event.prompt2, Boolean(event.prompt2.length <= 20 || event.centerprompt2));
			}
			injectCss();
			const { wrap, rows } = buildPicker(event);
			event.__ssNumDom = wrap;
			rows.forEach((state) => refreshRow(state, event));
			event.custom.replace.confirm = (bool) => {
				if (bool) {
					const c = numToControl.get(event.numbers[0]);
					event.result = { bool: true, control: c, links: get.links([c]) };
				} else {
					const c = hasCancel ? "cancel2" : event.controls[0];
					event.result = { bool: false, control: c, links: get.links([c]) };
				}
				delete event.numbers;
				delete event.list;
				removeDom(event);
				if (ui.confirm) ui.confirm.close();
				game.resume();
			};
			ui.create.confirm(hasCancel ? "oc" : "o");
			scheduleAttach(event);
			game.pause();
			game.countChoose();
			event.choosing = true;
		};
		lib.element.content.chooseControl = [
			async function (event, trigger, player) {
				if (
					lib.config.extension_自用美化_numberPick !== false &&
					!_status.connectMode &&
					lib.config.extension_十周年UI_enable &&
					lib.config.extension_十周年UI_newDecadeStyle === "off" &&
					!_status.connectMode &&
					typeof event.isMine === "function" &&
					event.isMine() &&
					isNumControls(event.controls) &&
					!event.sortcard &&
					!event.dialogcontrol &&
					!event.choiceList &&
					!event.seperate
				) {
					return ssControlStep.call(this, event, player);
				}
				//●回退本体时也要把 addDialog 预先塞进 event.dialog：本体普通分支只负责 open()，
				//  不预先创建就会让 addDialog 传入的牌完全不可见
				try {
					//●联机模式（含单机时安装过、随后进入联机的情况）不改写本体的 addDialog 展示
					if (!_status.connectMode && event.isMine()) ssShowAddDialog(event, false);
				} catch (e) {}
				return origChooseControl[0].apply(this, arguments);
			},
			origChooseControl[1]
		];
	}
}
