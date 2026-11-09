import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { DEle } from "./baseEle.js";
import dzxy from "./Dzxy.js";
import { Props } from "./public.js";
export class GradeImg extends DEle {
  constructor() {
    super(ui.create.div('.duanwei-ditu'));
    this.init();
  }
  init() {
    /**玩家段位 */
    this.pGrade = lib.config[`${dzxy.dz}playerGrade`];
    /**玩家所处段位的这一级 */
    this.current = this.getGrade(this.pGrade[0]);
    this.caidai = ui.create.div('.jj_grade_bg3', this.ele);
    this.jjGradeBg1 = ui.create.div('.jj_grade_bg1', this.ele);
    this.jjGradeBg2 = ui.create.div('.jj_grade_bg2', this.jjGradeBg1);
    /*段位图*/
    this.jjGrade = ui.create.div('.jj_grade_chuanshuo', this.jjGradeBg2);
    this.jjGrade.setBackgroundImage(`extension/斗转星移/image/paiwei/jj_grade_${this.current.id}.png`);
    /**段位文字 */
    this.jjGradeText = ui.create.div('.jj_grade_text', this.jjGradeBg2);
    this.updateGradeText();
    /*星*/
    this.jjStars = ui.create.div('.jj-stars', this.jjGradeBg2);
    for (let i = 0; i < this.current.starsPerLevel; i++) {
      let jjStarOff = ui.create.div('.jj_star_off', this.jjStars);
      if (i + 1 <= this.pGrade[2]) jjStarOff.classList.add('star_on');
    }
    /*士气*/
    this.jjMoraleDitu = ui.create.div('.jj_morale_ditu', this.ele);
    this.morale = ui.create.div('.jj_morale', '士气', this.jjMoraleDitu);
    this.publicProgressbarBg = ui.create.div('.public-progressbar-bg', this.jjMoraleDitu);
    /*进度条*/
    this.jjMoraleBar = ui.create.div('.jj_morale_bar', this.publicProgressbarBg);
    let ratio = Math.min(100, lib.config[`${dzxy.dz}playerScore`] / this.current.maxScore * 100);
    this.jjMoraleBar.style.clipPath = `polygon(0% 0%, ${ratio}% 0%, ${ratio}% 100%, 0% 100%)`;
    /**保护分 */
    this.jjMoraleProtect = ui.create.div('.jj_morale_protect_mark', this.publicProgressbarBg);
    this.jjMoraleProtect.style.left = this.current.score / this.current.maxScore * 100 - 7 + '%';
    /*文字*/
    this.jjMoraleText = ui.create.div('.jj_morale_text', `${lib.config[`${dzxy.dz}playerScore`]}/${this.current.maxScore}`, this.publicProgressbarBg);
  }
  /**数值加星 */
  addStar() {
    let next = this.getGrade(this.pGrade[0] + 1);
    this.pGrade[2]++;
    if (this.pGrade[2] > this.current.starsPerLevel) {
      this.pGrade[2] = 1;
      this.current.index == this.grade.CS ? this.pGrade[1]++ : this.pGrade[1]--;
    }
    if (this.pGrade[1] < 1) {
      if (this.current.index != this.grade.DS && this.current.index != this.grade.CS) {
        this.pGrade[1] = next.levels;
        this.pGrade[0]++;
      }
      if (this.current.index == this.grade.DS) this.pGrade[0]++;
    }
    this.current = this.getGrade(this.pGrade[0]);
    dzxy.saveCF('playerGrade');
  };
  /**数值减星 */
  removeStar() {
    if (this.isLowestGrade(this.pGrade)) return;
    let next = this.getGrade(this.pGrade[0] - 1);
    this.pGrade[2]--;
    if (this.pGrade[2] < 0) {
      this.pGrade[2] = this.current.starsPerLevel - 1;
      this.current.index == this.grade.CS ? this.pGrade[1]-- : this.pGrade[1]++;
    }
    if (this.current.index == this.grade.CS) {
      if (this.pGrade[1] < 0) {
        this.pGrade[1] = 1;
        this.pGrade[0]--;
        this.pGrade[2] = next.starsPerLevel - 1;
      }
    }
    else if (this.pGrade[1] > this.current.levels) {
      this.pGrade[1] = 1;
      this.pGrade[0]--;
      this.pGrade[2] = next.starsPerLevel - 1;
    }
    this.current = this.getGrade(this.pGrade[0]);
    dzxy.saveCF('playerGrade');
  };
  /**加星带动画 */
  async addStarAnim(num = 1, addScore = Math.floor(Math.random() * 10) + 30) {
    let add = async () => {
      let starOff = this.ele.querySelector('.jj_star_off:not(.star_on)');
      let before = this.pGrade.slice();
      this.addStar();
      if (starOff) {
        dcdAnim.playSpine(GradeImg.tx.SSXF_paiweisai_eff_shengxing, { parent: starOff, scale: 0.55, x: [0, 0.5], y: [0, 0.6] });
        starOff.classList.add('star_on');
        if (this.pGrade[0] == this.grade.CS) this.updateGradeText();
        await GradeImg.dalay(600);
      }
      else {
        dcdAnim.playSpine(GradeImg.tx.SSXF_paiweisai_eff_shengxingkuang, { parent: this.jjGradeText, scale: 0.65, x: [0, 0.5], y: [0, 0.5] });
        this.updateGradeText();
        await GradeImg.dalay(500);
        if ((before[1] == 1 && before[0] != this.grade.CS) || before[0] == this.grade.CS) {
          dcdAnim.playSpine(GradeImg.tx.SSXF_paiweisai_eff_shengjie, { parent: this.jjGradeBg2, scale: 0.7, x: [0, 0.5], y: [0, 0.5] });
          await GradeImg.dalay(800);
        }
        this.jjGrade.setBackgroundImage(`extension/斗转星移/image/paiwei/jj_grade_${this.current.id}.png`);
        await GradeImg.dalay(300);

        this.jjStars.innerHTML = '';
        for (let i = 0; i < this.current.starsPerLevel; i++) {
          let jjStarOff = ui.create.div('.jj_star_off', this.jjStars);
        }
        starOff = this.ele.querySelector('.jj_star_off:not(.star_on)');
        dcdAnim.playSpine(GradeImg.tx.SSXF_paiweisai_eff_shengxing, { parent: starOff, scale: 0.55, x: [0, 0.5], y: [0, 0.6] });
        if (starOff) starOff.classList.add('star_on');
        await GradeImg.dalay(600);
      }
      return new Promise(res => res());
    }
    await GradeImg.dalay(900);
    for (let i = 0; i < num; i++) {
      await add();
    }
    lib.config[`${dzxy.dz}playerScore`] += addScore;
    this.updateMorale();
    await GradeImg.dalay(1000);
    if (lib.config[`${dzxy.dz}playerScore`] > this.current.maxScore) {
      lib.config[`${dzxy.dz}playerScore`] = 0;
      this.updateMorale();
      await add();
    }
    dzxy.saveCF('playerScore');
  }
  /**掉星带动画 */
  async removeStarAnim(num = 1, addScore = Math.floor(Math.random() * 10) + 30) {
    let remove = async () => {
      let p = new Promise(res => res());
      if (this.isLowestGrade(this.pGrade)) return p;
      if (lib.config[`${dzxy.dz}playerScore`] > this.current.score) {
        lib.config[`${dzxy.dz}playerScore`] = 0;
        return p;
      }
      let starOn = this.ele.querySelectorAll('.star_on');
      this.removeStar();
      if (starOn.length) {
        await GradeImg.dalay(600);
        starOn[starOn.length - 1].classList.remove('star_on');
        if (this.pGrade[0] == this.grade.CS) this.updateGradeText();
      }
      else {
        await GradeImg.dalay(300);
        dcdAnim.playSpine(GradeImg.tx.SSXF_paiweisai_eff_shengxingkuang, { parent: this.jjGradeText, scale: 0.65, x: [0, 0.5], y: [0, 0.5] });
        this.updateGradeText();
        await GradeImg.dalay(600);
        this.jjGrade.setBackgroundImage(`extension/斗转星移/image/paiwei/jj_grade_${this.current.id}.png`);
        await GradeImg.dalay(300);

        this.jjStars.innerHTML = '';
        for (let i = 0; i < this.current.starsPerLevel; i++) {
          let jjStarOn = ui.create.div('.jj_star_off.star_on', this.jjStars);
        }
        starOn = this.ele.querySelectorAll('.star_on');
        await GradeImg.dalay(600);
        if (starOn.length) starOn[starOn.length - 1].classList.remove('star_on');
      }
      return p;
    }
    for (let i = 0; i < num; i++) {
      await remove();
    }
    await GradeImg.dalay(200);
    lib.config[`${dzxy.dz}playerScore`] += addScore;
    dzxy.saveCF('playerScore');
    this.updateMorale();
  }
  /**延迟 */
  static dalay(time) {
    return new Promise(resolve => setTimeout(resolve, time != undefined ? time : 10));
  };
  /**特效 */
  static tx = {
    SS_pve_jiesuanWin: {//胜利结算
      name: "../../../斗转星移/animation/paiwei/SS_pve_jiesuanWin",
      // loop: true,
    },
    SSXF_paiweisai_eff_shengxing: {//升星
      name: "../../../斗转星移/animation/paiwei/SSXF_paiweisai_eff_shengxing",
    },
    SS_pve_jiesuanLose: {//失败结算
      name: "../../../斗转星移/animation/paiwei/SS_pve_jiesuanLose",
      // loop: true,
    },
    SSXF_paiweisai_eff_shengjie: {//升阶
      name: "../../../斗转星移/animation/paiwei/SSXF_paiweisai_eff_shengjie",
    },
    SSXF_paiweisai_eff_shengxingkuang: {//升星框
      name: "../../../斗转星移/animation/paiwei/SSXF_paiweisai_eff_shengxingkuang",
    },
  };
  /**加载 */
  static loadTX() {
    lib.arenaReady.push(() => {
      for (let i in GradeImg.tx) {
        if (window.dcdAnim) dcdAnim.loadSpine(GradeImg.tx[i].name, "skel", function () { });
      }
    });
  };
  /**结算动画 */
  settlement(result) {
    let anim;
    if (result == 1) {//赢
      anim = dcdAnim.playSpine(GradeImg.tx.SS_pve_jiesuanWin, { loop: true, scale: 0.5, x: [0, 0.5], y: [0, 0.82] });
    }
    else if (result == -1) {//输
      anim = dcdAnim.playSpine(GradeImg.tx.SS_pve_jiesuanLose, { loop: true, scale: 0.5, x: [0, 0.5], y: [0, 0.82] });
    }
    else if (result == 0) {//平局
    }
    if (anim) {
      anim.loop = true;
      anim.oncomplete = function () {
        anim.setAction('play2', 0);
      }
    }
    return anim;
  };
  /**更新士气 */
  updateMorale() {
    let ratio = Math.min(100, lib.config[`${dzxy.dz}playerScore`] / this.current.maxScore * 100);
    this.jjMoraleBar.style.clipPath = `polygon(0% 0%, ${ratio}% 0%, ${ratio}% 100%, 0% 100%)`;
    this.jjMoraleText.innerHTML = `${lib.config[`${dzxy.dz}playerScore`]}/${this.current.maxScore}`;
  }
  /**更新段位文字 */
  updateGradeText() {
    let text = this.pGrade[0] != this.grade.CS ? `${this.current.name}${this.pGrade[1]}` : `${this.current.name}X${this.pGrade[1] * this.current.starsPerLevel + this.pGrade[2]}`;
    this.jjGradeText.innerHTML = text;
  }
  /**段位的大段 */
  grade = {
    CS: 6,
    DS: 5,
    FC: 4,
    HJ: 3,
    BY: 2,
    QT: 1,
  };
  /**
   * 段位表
   * index大段标识 levels每个大段有多少小段 starsPerLevel每小段多少星 score达到时保分 maxScore最大保护分
   */
  gradeList = [
    { index: this.grade.QT, id: 'qingtong', name: '青铜', levels: 3, starsPerLevel: 3, score: 150, maxScore: 300 },
    { index: this.grade.BY, id: 'baiyin', name: '白银', levels: 4, starsPerLevel: 4, score: 200, maxScore: 350 },
    { index: this.grade.HJ, id: 'huangjin', name: '黄金', levels: 5, starsPerLevel: 5, score: 240, maxScore: 400 },
    { index: this.grade.FC, id: 'feicui', name: '翡翠', levels: 5, starsPerLevel: 5, score: 270, maxScore: 450 },
    { index: this.grade.DS, id: 'dashi', name: '大师', levels: 5, starsPerLevel: 5, score: 300, maxScore: 500 },
    { index: this.grade.CS, id: 'chuanshuo', name: '传说', levels: 5, starsPerLevel: 5, score: 385, maxScore: 550 },
  ];
  /** 段位继承表*/
  inheritList = (() => {
    let list = new Map();
    //星数没作用顺便写上去而已 只看大段和小段
    //数据未经过处理 需要增加的话要严格按段位高低从上往下排
    //[此段位(包含)以上的],[结算后的段位]
    list.set([this.grade.FC, 4, 0], [this.grade.HJ, 3, 0]);//翡翠4（包含）以上的掉到黄金3
    list.set([this.grade.HJ, 5, 0], [this.grade.BY, 3, 0]);//黄金5（包含）-翡翠4（不包含）的掉到黄金3
    list.set([this.grade.QT, 3, 0], [this.grade.QT, 3, 0]);//青铜3（包含）-黄金5（不包含）的掉到青铜3
    return list;
  })();
  /**获取段位 */
  getGrade(index) {
    return this.gradeList.find(i => i.index == index);
  };
  /**获取最低段位 */
  getLowestGrade() {
    let grade = this.getGrade(this.grade.QT);
    return [this.grade.QT, grade.levels, 0];
  };
  /** 判断是否为最低段位*/
  isLowestGrade(list) {
    if (list.length != 3) return false;
    let Lowest = this.getLowestGrade();
    for (let i = 0; i < Lowest.length; i++) {
      if (list[i] != Lowest[i]) return false;
    }
    return true;
  };
  /** 段位继承更新*/
  async inheritUpdate() {
    let currentTime = PWGrade.getYearMonth();
    dzxy.saveCF('pwInheritTime', currentTime);
    //继承后的段位
    let after = this.getLowestGrade();
    for (let [key, value] of this.inheritList) {
      if (this.pGrade[0] > key[0]) {
        after = value.slice();
        break;
      }
      else if (this.pGrade[0] == key[0]) {
        if (this.pGrade[0] == this.grade.CS ? this.pGrade[1] >= key[1] : this.pGrade[1] <= key[1]) {
          after = value.slice();
          break;
        }
      }
    }
    await GradeImg.dalay(800);
    dcdAnim.playSpine(GradeImg.tx.SSXF_paiweisai_eff_shengjie, { parent: this.jjGradeBg2, scale: 0.7, x: [0, 0.5], y: [0, 0.5] });
    await GradeImg.dalay(600);

    lib.config[`${dzxy.dz}playerGrade`] = after;
    dzxy.saveCF('playerGrade');
    this.pGrade = after;
    this.current = this.getGrade(this.pGrade[0]);
    this.updateGradeText();
    this.jjStars.innerHTML = '';
    for (let i = 0; i < this.current.starsPerLevel; i++) {
      let jjStarOff = ui.create.div('.jj_star_off', this.jjStars);
    }
    this.jjGrade.setBackgroundImage(`extension/斗转星移/image/paiwei/jj_grade_${this.current.id}.png`);

    await GradeImg.dalay(200);
    lib.config[`${dzxy.dz}playerScore`] = 0;
    dzxy.saveCF('playerScore');
    this.updateMorale();
  }
}
dzxy.GradeImg = GradeImg;


export class PWGrade {
  static importCSS() {
    lib.init.css(`${lib.assetURL}${dzxy.path}css`, "pwGrade");
  };
  //初始化数据
  //玩家段位[大段，小段，x颗星]
  //开始是用总共多少星记录的，后面发现像青铜二满星和青铜一0星这样的显示处理不了    青铜二满星==青铜一0星
  static initData() {
    dzxy.initCF('playerGrade', [1, 3, 0]);
    dzxy.initCF('playerScore', 0);
    dzxy.initCF('pwInheritTime', PWGrade.getYearMonth());
  };
  //获取年月
  static getYearMonth() {
    let time = new Date();
    let year = time.getFullYear();
    let month = time.getMonth();
    return [year, month];
  };
  /**
   * 
   * @param {number} starNum 要加多少颗星 默认1
   * @param {number} score 要加多少分 默认30~40
   */
  /*●*/
  static win(starNum, score) {
    ui.dialog?.classList.add("dialog-hide"); ui.control?.classList.add("dialog-hide");
    let bigBg = dzxy.create.bigBg(ui.arena, false); bigBg.style.zIndex = 7;
    let bigBg2 = dzxy.create.bigBg(document.body, true); bigBg2.style.zIndex = 6;
    bigBg.listen(() => {
      bigBg.remove(); bigBg2.remove();
      dcdAnim.stopSpine(anim);
      ui.control?.classList.remove("dialog-hide");
      ui.dialog?.classList.remove("dialog-hide");
    });
    let gradeImg = new GradeImg();
    let anim = gradeImg.settlement(1);
    gradeImg.addStarAnim(starNum, score);
    gradeImg.setParentNode(bigBg);
    const funcBtns = ui.create.div(".js-func-btns", bigBg);
    const btnAgain = ui.create.div(".js-btn", "", funcBtns, game.reload);
    btnAgain.setBackgroundImage('extension/斗转星移/image/jiesuan/seeyouagain.png');
    btnAgain.style.backgroundSize = "contain";
    btnAgain.style.backgroundRepeat = "no-repeat";
    btnAgain.style.backgroundPosition = "center";
    btnAgain.style.backgroundOrigin = "content-box";
    btnAgain.style.zIndex = "7";
  }
  /**
   * 
   * @param {number} starNum 要掉多少颗星 默认1
   * @param {number} score 要掉多少分 默认30~40
   */
  /*●*/
  static lose(starNum, score) {
    ui.dialog?.classList.add("dialog-hide"); ui.control?.classList.add("dialog-hide");
    let bigBg = dzxy.create.bigBg(ui.arena, false); bigBg.style.zIndex = 7;
    let bigBg2 = dzxy.create.bigBg(document.body, true); bigBg2.style.zIndex = 6;
    bigBg.listen(() => {
      bigBg.remove(); bigBg2.remove();
      dcdAnim.stopSpine(anim);
      ui.control?.classList.remove("dialog-hide");
      ui.dialog?.classList.remove("dialog-hide");
    });
    let gradeImg = new GradeImg();
    let anim = gradeImg.settlement(-1);
    gradeImg.removeStarAnim(starNum, score);
    gradeImg.setParentNode(bigBg);
    const funcBtns = ui.create.div(".js-func-btns", bigBg);
    const btnAgain = ui.create.div(".js-btn", "", funcBtns, game.reload);
    btnAgain.setBackgroundImage('extension/斗转星移/image/jiesuan/seeyouagain.png');
    btnAgain.style.backgroundSize = "contain";
    btnAgain.style.backgroundRepeat = "no-repeat";
    btnAgain.style.backgroundPosition = "center";
    btnAgain.style.backgroundOrigin = "content-box";
    btnAgain.style.zIndex = "7";
  }

  static inherit() {
    //大页面
    let bigBg = dzxy.create.bigBg(ui.arena, false);
    let gradeImg = new GradeImg();
    gradeImg.setParentNode(bigBg)
    gradeImg.inheritUpdate();
    setTimeout(() => {
      bigBg.remove();
    }, 3200);
  }
  /**是否修改结算页面 */
  static isModified = false;
  static promise;
  static resolve;
  //对局结束
  static pushGameOver() {
    if (!lib.config[`${dzxy.dz}PWsettlement`]) return;
    lib.onover.push(async (result) => {
      if (lib.config.mode == 'versus' && get.config('versus_mode', 'versus') == 'two' && window.dcdAnim) {
        if (PWGrade.isModified) await PWGrade.promise;
        if (ui.dialog && lib.config[`${dzxy.dz}PWhideDialog`]) ui.dialog.classList.add('dialog-hide');
        //平局是null  十周年ui的投降也是null,只能设置成不赢就输了
        if (result == true) {
          let jiaxing = 1;
          let jiaxingka = Props.getCount('paiweijiaxingka');
          if (jiaxingka > 0) {
            jiaxing = 2;
            Props.changeCount('paiweijiaxingka', -1);
          }
          PWGrade.win(jiaxing);
        }
        else PWGrade.lose();
      }
    });
  };
  static addSkill() {
    lib.skill._gradeUpdate = {
      trigger: {
        global: 'gameDrawBefore',
      },
      priority: 999,
      firstDo: true,
      charlotte: true,
      forced: true,
      grade: PWGrade,
      filter: function (event, player) {
        if (lib.config.mode != 'versus' || !window.dcdAnim) return false;
        let currentTime = lib.skill._gradeUpdate.grade.getYearMonth();
        for (let i = 0; i < currentTime.length; i++) {
          if (lib.config[`${dzxy.dz}pwInheritTime`][i] != currentTime[i]) return true;
        }
        return false;
      },
      content: function () {
        lib.skill._gradeUpdate.grade.inherit();
        game.delay(6)
      },
    };
  }
}
let { promise, resolve } = Promise.withResolvers();
PWGrade.promise = promise;
PWGrade.resolve = resolve;
dzxy.PWGrade = PWGrade;
