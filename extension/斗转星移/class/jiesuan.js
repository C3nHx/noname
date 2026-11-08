import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { DBtn, DEle } from "./baseEle.js";
import { Props } from "./public.js";
import { Dsplash } from "./Dsplash.js";
import { GradeImg } from "./PWGrade.js";
import doudizhuStats from "./DoudizhuStats.js";
export class Jiesuan extends DEle {
	constructor(result, winJP, loseHLD) {
		super(ui.create.div(".js-ditu"));
		this.init(result);
		this.settle(winJP, loseHLD);
		this.createBtns();
	}
	init(result) {
		this.ele.addEventListener("click", e => {
			e.stopPropagation();
		});
		this.result = result;
		let mode = get.mode();
		let submode = get.config(mode + "_mode", mode);
		//欢乐斗地主连胜统计
		if (mode == "doudizhu" && submode == "huanle") {
			// 如果 bool 为 true 那么 游戏胜利 如果 bool 为 false 那么 游戏失败 如果都不是 那么 游戏平局
			if (result === true) {
				doudizhuStats.recordGame(true);
			} else if (result === false) {
				doudizhuStats.recordGame(false);
			}
		}
		if (this.result) {
			this.xuanzhuanguang = ui.create.div(".js-xuanzhuanguang", this.ele);
			this.jinpai = ui.create.div(".js-shenglizhejinpaipai", this.ele);
			this.jinpaix = ui.create.div(".js-shenglizhejinpaipai.light", this.jinpai);
			this.shengli = ui.create.div(".js-shengli-ditu", this.ele);
			//欢乐斗地主
			let currentStreak = doudizhuStats.getStats().currentStreak;
			if (mode == "doudizhu" && submode == "huanle" && currentStreak > 1) {
				let num = ui.create.div(".gold-text", this.shengli);
				num.innerText = currentStreak;
				let lian = ui.create.div(".gold-text", this.shengli);
				lian.innerText = "连";
				let sheng = ui.create.div(".gold-text", this.shengli);
				sheng.innerText = "胜";
			} else {
				ui.create.div(".sheng", this.shengli);
				ui.create.div(".li", this.shengli);
			}

			this.caidai_right = ui.create.div(".js-caidai", this.ele);
			this.caidai_left = ui.create.div(".js-caidai.left", this.ele);
		} else {
			// this.anim = dcdAnim.playSpine(GradeImg.tx.SS_pve_jiesuanLose, { scale: 0.73, x: [0, 0.5], y: [0, 0.65] });
			// this.anim.loop = true;
			// this.anim.oncomplete = () => {
			//   this.anim.setAction('play2', 0);
			// }
			this.xuanzhuanguang = ui.create.div(".js-lose-bglight", this.ele);
			this.jinpai = ui.create.div(".js-pingjuzhehuipaipai", this.xuanzhuanguang);

			this.liefeng = ui.create.div(".js-lose-liefeng", this.jinpai);
			dzxy.frameAnim(this.liefeng, ["extension/斗转星移/image/frameAnim/LieFeng1_00001.png", "extension/斗转星移/image/frameAnim/LieFeng1_00003.png", "extension/斗转星移/image/frameAnim/LieFeng1_00005.png", "extension/斗转星移/image/frameAnim/LieFeng1_00007.png", "extension/斗转星移/image/frameAnim/LieFeng1_00009.png", "extension/斗转星移/image/frameAnim/LieFeng1_00011.png", "extension/斗转星移/image/frameAnim/LieFeng1_00013.png", "extension/斗转星移/image/frameAnim/LieFeng1_00014.png"], 500);
			this.shibai = ui.create.div(".js-shibai-ditu", this.jinpai);
			ui.create.div(".shi", this.shibai);
			ui.create.div(".bai", this.shibai);

			this.shibaix = ui.create.div(".js-shibai-ditu.dy", this.jinpai);
			dzxy.frameAnim(this.shibaix, ["extension/斗转星移/image/frameAnim/shibaisguang_00000.png", "extension/斗转星移/image/frameAnim/shibaisguang_00002.png", "extension/斗转星移/image/frameAnim/shibaisguang_00004.png", "extension/斗转星移/image/frameAnim/shibaisguang_00006.png", "extension/斗转星移/image/frameAnim/shibaisguang_00008.png", "extension/斗转星移/image/frameAnim/shibaisguang_00010.png", "extension/斗转星移/image/frameAnim/shibaisguang_00012.png", "extension/斗转星移/image/frameAnim/shibaisguang_00014.png", ""], 400, 300);
		}
		return this;
	}
	settle(winJP, loseHLD) {
		let JP = Props.getCount("jinpiao"),
			HLD = Props.getCount("huanledou");
		this.resultBg = ui.create.div(".js-result-bg", this.ele);
		if (this.result) this.resultBg.classList.add("shengli");
		this.resultBg.innerHTML = `
      <div class="js-result-box">
        <div class="res-item">
        </div>
        <div class="res-item">
          <div class="xiaohao">参赛消耗：<img class="jinpiao" src="extension/斗转星移/image/icon/huanledou.png" style="height: 27px;margin-right: 12px;">${loseHLD}</div>
        </div>
        <div class="res-item">
          <div class="shengyu">
            当前<img src="extension/斗转星移/image/icon/huanledou.png" style="height: 27px;">：${HLD}&nbsp&nbsp&nbsp&nbsp
            当前<img src="extension/斗转星移/image/icon/jinpiao.png" style="height: 27px;">：${JP}
          </div>
        </div>
      </div>
    `;
		let items = this.ele.querySelectorAll(".res-item");
		let title = this.result ? winJP : loseHLD;
		let icon = this.result ? "jinpiao" : "huanledou";
		let countStr = (title >= 0 ? "+" : "") + String(title);
		let baseSrc = "extension/斗转星移/image/num/";
		items[0].innerHTML = `<img class="jinpiao" src="extension/斗转星移/image/icon/${icon}.png" style="height: 50px;"></img>`;
		for (let i of countStr) {
			let img = document.createElement("img");
			img.className = "number";
			img.src = `${baseSrc}game_result_num${i}.png`;
			items[0].appendChild(img);
		}
		if (!this.result) items[1].hide();
		return this;
	}
	/*●*/
	createBtns() {
		this.funcBtns = ui.create.div(".js-func-btns", this.ele);
		//ui.create.div(".js-btn", "主页", this.funcBtns, () => { window.location.reload(); });
		let again = ui.create.div(".js-btn", "", this.funcBtns, game.reload);
		again.setBackgroundImage('extension/斗转星移/image/jiesuan/seeyouagain.png');
		again.style.backgroundSize = "contain";
        again.style.backgroundRepeat = "no-repeat";
        again.style.backgroundPosition = "center";
        again.style.backgroundOrigin = "content-box";
	}

	/**是否修改结算页面 */
	static isModified = false;
	static promise;
	static resolve;
	/** 封装好的完整使用方法 */
	static async use(result, winJP, loseHLD) {
		if (!dzxy.getCF("settlement_doudizhu")) return;
		if (Jiesuan.isModified) await Jiesuan.promise;
		ui.dialog?.classList.add("dialog-hide");
		ui.control?.classList.add("dialog-hide");
		let bg = dzxy.create.bigBg(ui.window, false);
		bg.classList.add("js-bg");
		bg.style.zIndex = 7;
		dzxy.ScreenAdapter.add({
			node: bg,
			callback: (node, scale) => {
				node.style.zoom = scale;
			},
		});
		bg.backBtn = dzxy.create.back(bg, () => {
			ui.dialog?.classList.toggle("dialog-hide");
			ui.control?.classList.toggle("dialog-hide");
			bg.jiesuan.ele.classList.toggle("dialog-hide");
		});
		bg.jiesuan = new Jiesuan(result, winJP, loseHLD);
		bg.jiesuan.setParentNode(bg);
		/*●*/
        let bigBg = dzxy.create.bigBg(document.body, true); bigBg.style.zIndex = 6;
		bigBg.listen(() => {
		    bg.remove(); bigBg.remove();
		    ui.control?.classList.remove("dialog-hide");
		    ui.dialog?.classList.remove("dialog-hide");
        })

		return bg;
	}
}
let { promise, resolve } = Promise.withResolvers();
Jiesuan.promise = promise;
Jiesuan.resolve = resolve;
dzxy.Jiesuan = Jiesuan;
