import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { MainFrame, MainFrameTopBtn, Character } from "./Banchar.js";
import { DBtn, DEle } from "./baseEle.js";
import dzxy from "./Dzxy.js";
import { Props } from "./public.js";
import { ScreenAdapter } from "./ScreenAdapter.js";
/**武将2 */
export class Character2 extends DBtn {
  constructor(ID,flag) {
    super(ui.create.div('.wujiang-char-base-back'));
    this.initEle(ID,flag);
  }
  hasFramex = false;
  hasHp = false;
  initEle(ID,flag) {
    this.ID = ID;
    this.name = get.translation(this.ID);
    let char = flag === true ? lib._cust_character[this.ID]:dzxy.character[this.ID];
    // 换将需要 加了一层 小头像武将的没做处理
    this.ele2 = ui.create.div('.wujiang-char-base-back2', this.ele);
    this.framey = ui.create.div('.wujiang-char-framey', this.ele2);//选
    this.framex = ui.create.div('.wujiang-char-framex', this.ele2);//选
    this.frame = ui.create.div('.wujiang-char-frame', this.ele2);
    this.groupEle = ui.create.div('.wujiang-char-group.hidden', this.ele2);
    this.charImg = ui.create.div('.wujiang-char-img', this.ele2);

    this.isSkin = false;
    let charLt;
    if (!game.hasExtension('千幻聆音')||flag===true) {
      charLt = dzxy.getCharData(ID, 'loutou', true);
      this.charImg.setBackground(ID, 'character');
    }
    else {
      let skin = lib.config.qhly_skinset.skin[ID];
      if (skin && !dzxy.getCF('chooseCharNoSkin')) {
        charLt = dzxy.getCharData(ID, 'skinloutou', true);
        this.charImg.setBackground(ID, 'character');
        this.isSkin = true;
      } else {
        charLt = dzxy.getCharData(ID, 'loutou', true);
        this.charImg.qhly_origin_setBackground?.(ID, 'character')
      }
    }
    // this.charImg.qhly_origin_setBackground?.(this.ID, 'character') || this.charImg.setBackground(this.ID, 'character');
    // let charLt = dzxy.getCharData(ID, 'loutou', true);
    // this.charImg.dataset.loutou = charLt;
	if (flag===true){
    this.nameEle = ui.create.div('.wujiang-char-name', lib._cust_translate[this.name], this.ele2);
		
	}else{
    this.nameEle = ui.create.div('.wujiang-char-name', dzxy.charNameRep(this.name), this.ele2);
	    
	}
    this.change = ui.create.div('.dz_change_chr_free', this.ele2);//选
    if (!this.hasFramex) this.hideFramex();
    if (!this.hasFramey) this.hideFramey();
    this.hideChange();

    let double = get.is.double(this.ID, true);
    let group;
    if (double) group = `${double[0]}_${double[1]}`;
    else {
      group = char?.[1] != undefined ? char[1] : 'unknow';
	  if (flag===true){
	      group = char.group
	  }
    }
    if (dzxy.sborder.includes(group)) {
      this.frame.setBackgroundImage(`${dzxy.path}/image/char_small_border/chara_face_frame_${group}.png`);
    }
    else {
      if (group == 'jin') {
        this.frame.setBackgroundImage(`${dzxy.path}/image/char_small_border_back/chara_face_frame_gz_ye.png`);
        this.groupEle.innerHTML = `<div style="color: #c66dc6;position: relative;">${get.translation(group)}</div>`
      }
      else {
        let groupList = double || [group];
        this.groupEle.innerHTML = `
        <div style="position: relative;">${get.translation(groupList[0])}</div>
        <div class="${groupList.length > 1 ? '' : 'hidden'}" style="margin: -6px 0;position: relative;left: 9%;transform:rotate(-26deg)">\\</div>
        <div class="${groupList.length > 1 ? '' : 'hidden'}" style="position: relative;">${get.translation(groupList[1])}</div>
        `;
      }
      this.groupEle.show();
    }
    if (double) this.nameEle.style.top = '30%';

    let hp = char?.[2] != undefined ? char[2] : '';
    hp = String(hp).split('/');
    while (hp.length < 3) {
      hp.push('0');
    }
    this.hpArea = ui.create.div('.wujiang-char-hpArea', this.ele2);
    this.hpImg = ui.create.div('.wujiang-char-hpImg', this.hpArea);
    this.hpImg.dataset.color = 'green';
    this.hpText = ui.create.div('.wujiang-char-hpText', this.hpArea);
    this.hpText.innerHTML = `
      <div class="${hp[1] != '0' ? '' : 'not-display'}" style="position: relative;">${hp[1]}</div>
      <div class="${hp[1] != '0' ? '' : 'not-display'}" style="margin: -6px 0;position: relative;left: 9%;transform:rotate(-26deg)">\\</div>
      <div style="position: relative;">${hp[0]}</div>
    `
    this.hpHujia = ui.create.div('.wujiang-char-hpHujia', hp[2], this.hpArea);
    if (hp[2] == '0') this.hpHujia.hide();
    if (!this.hasHp) this.hideHp();

    this.self = ui.create.div('.wujiang-char-table_self', this.ele2);
    this.recommend = ui.create.div('.wujiang-char-recommend', this.ele2);
    if (!this.hasSelf) this.hideSelf();
    if (!this.hasRecommend) this.hideRecommend();

  }
  /**隐匿 */
  unknow() {
    this.ele2.classList.add('char-unknow');
  }
  hideChange() {
    this.change.hide();
  }
  showChange(func) {
    this.change.show();
    if (typeof func == 'function') this.change.addEventListener('click', func);
  }
  hideFramex() {
    this.hasFramex = false;
    this.framex.hide();
  }
  showframex() {
    this.hasFramex = true;
    this.framex.show();
  }
  hideFramey() {
    this.hasFramey = false;
    this.framey.hide();
  }
  showframey() {
    this.hasFramey = true;
    this.framey.show();
  }
  hideHp() {
    this.hasHp = false;
    this.hpArea.hide();
  }
  showHp() {
    this.hasHp = true;
    this.hpArea.show();
  }
  showSelf() {
    this.hasSelf = true;
    this.self.show();
  }
  hideSelf() {
    this.hasSelf = false;
    this.self.hide();
  }
  showRecommend() {
    this.hasRecommend = true;
    this.recommend.show();
  }
  hideRecommend() {
    this.hasRecommend = false;
    this.recommend.hide();
  }
  addLongPress() {
    dzxy.addLongPress(this.ele, () => {
      let page = lib.config[`${dzxy.dz}charInfoPage`];
      if (page == 'qianhuan' && game.qhly_open) game.qhly_open(this.ID, 'skill');
      else dzxy.openCharInfoPage(this.ID, this.charImg);
    });
  }
  addTouchWhitening() {
    if (!this.whiteMask) this.whiteMask = ui.create.div('.white-mask', this.ele);
    this.ele.addEventListener('touchstart', () => {
      if (this.ele.classList.contains('dz_selected')) return;
      this.whiteMask.classList.add('anim')
      setTimeout(() => {
        this.whiteMask.classList.remove('anim')
      }, 600);
    });
  }
}
/**
 * 主公
 * 未知武将未处理
 */
export class GameZhu extends DEle {
  constructor() {
    super(ui.create.div('.dz_game_chr_info_bg'));
    this.skillInfo = ui.create.div('.dz_game_chr_skill_info', this.ele);
  }
  zhuList = [];
  add(ID) {
    this.zhuList.push(ID);
    let len = this.zhuList.length;
    if (len > 1) {
      this.ele.style.width = '555px';
      this.skillInfo.style.width = 'calc(100% - 240px)';
    }
    this[`frameAdj${len}`] = ui.create.div('.dz_game_chr_bk_adj', this.ele);
    this[`zhu${len}`] = new Character2(ID);
    this[`zhu${len}`].showHp();
    this[`zhu${len}`].setParentNode(this['frameAdj' + len]);
    this[`zhu${len}`].ele.style.top = '-10%';
    if (dzxy.character[ID]?.hasHiddenSkill) this[`zhu${len}`].unknow();
  }
  showSkill() {
    let innerSkill = '';
    this.zhuList.forEach(zhu => {
      if (dzxy.character[zhu]?.hasHiddenSkill) return;
      let skill = dzxy.getSkill(zhu);
      skill[0].forEach(i => {
        innerSkill += `<p><span style="color:#e1ed2e;">${get.translation(i)}: </span><span>${get.translation(i + '_info')}</span></p>`;
      });
      skill[1].forEach(i => {
        innerSkill += `<p><span style="color:#e1ed2e;">※${get.translation(i)}: </span><span>${get.translation(i + '_info')}</span></p>`;
      });
    });
    this.skillInfo.innerHTML = innerSkill;
  }
}
/**选将框容器 */
export class SelChrFrame extends DEle {
  constructor(str) {
    super(ui.create.div('.dz_game_sel_chr_listx'));
    this.contx = ui.create.div('.dz_game_sel_chr_list', this.ele);
    this.cont = ui.create.div('.sle_content', this.contx);
    this.cont.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    dzxy.scroll_lr(this.contx, 70);
    this.IScroll = new IScroll(this.contx, {
      scrollX: true,
      scrollY: false,
      bounceSoft: 1,
    });
    //this.IScroll.refresh();
    this.header = ui.create.div('.list_header.dz-text-shadow-ss', str || '', this.ele);
  }
}


/**
 * 选将功能的实现
 */
export class ChooseChar {
  /**当前选择的武将 */
  selectedList = [];
  selectedList_ui = [];
  skillTipEle;
  /**删除技能提示 */
  deleteSkillTip() {
    this.skillTipEle?.remove();
    delete this.skillTipEle;
  }
  /**创建确定按钮 */
  createOK(parentNode) {
    let okBtn = dzxy.create.ok(parentNode, () => {
      this.createOK_click();
    });
    if (this.requireNum == 1) okBtn.hide();
    okBtn.classList.add('dz-gray');
    okBtn.style.position = 'absolute';
    okBtn.style.top = ' calc(44% + 223px)';
    okBtn.style.right = '4%';
    return okBtn;
  }
  /**确定按钮的点击函数*/
  createOK_click() {
    let UIsel = [];
    this.selectedList.forEach(char => {
      UIsel.add({ link: char.ID });
    });
    ui.selected.buttons.addArray(UIsel);
    game.check();
    ui.click.control.call(ui.confirm.firstChild);
    this.addRecentChar(this.selectedList);
    this.clearPage();
  }
  /**清除整个页面 */
  clearPage() {
    this.bigBg.remove();
    delete this.bigBg;
    if (this.subBg) {
      this.subBg.remove();
      delete this.subBg;
    }
    if (this.skillTipBody) {
      this.skillTipBody.remove();
      delete this.skillTipBody;
    }
  }
  /**获取换将时剩余武将 */
  getRepChar() {
    if (this.allRepChar == undefined) {
      // this.allRepChar = Object.keys(lib.character).filter(c => !lib.character[c][4] || !lib.character[c][4].includes('unseen'));
      this.allRepChar = Object.keys(lib.character).filter(c => {
        return !lib.filter.characterDisabled(c);
      });
    }
    let list = this.allRepChar.slice();
    let currentChars = this.bigBg.querySelectorAll('.wujiang-char-base-back');
    let list2 = [];
    for (let i of currentChars) {
      if (i.source && i.source.ID) list2.add(i.source.ID);
    }
    if (list.length > list2.length) list.removeArray(list2);
    return list;
  }
  /**主函数 */
  openPage(dialog, requireNum) {
    dialog.classList.add('dialog-hide');
    this.dialog = dialog;
    /**需要选择的武将数量 */
    this.requireNum = requireNum;
    /**页面主背景 */
    this.bigBg = dzxy.create.bigBg(document.body, 'image/chooseCharacter/ol_bg.jpg', () => {
      this.deleteSkillTip();
    });
    this.bigBg.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    });
    this.bigBg.style.zIndex = '8';
    ScreenAdapter.add({
      node: this.bigBg,
      callback: (node, scale) => {
        node.style.zoom = scale;
      }
    });
    /**选多个武将 进入游戏的确定按钮 */
    this.okBtn = this.createOK(this.bigBg);
    if (game.me == game.zhu) {
      this.createZhuPage();
    } else {
      this.createNoZhuPage();
    }
  }
  /**主公的页面 */
  createZhuPage() {
    let selChrFrame = new SelChrFrame('主公武将');
    selChrFrame.ele.style.bottom = 'calc(50% + 24px)';
    selChrFrame.setParentNode(this.bigBg);

    let selChrFrame2 = new SelChrFrame('可选武将');
    selChrFrame2.ele.style.top = '50%';
    selChrFrame2.setParentNode(this.bigBg);

    let free = this.FreeSelect();
    free.setParentNode(selChrFrame2.cont);

    this.dialog.buttons.forEach(i => {
      const isZhu = dzxy.character[i.link][4]?.includes('zhu');
      const ch = new Character2(i.link);
      ch.showHp();
      ch.showframex();
      ch.addTouchWhitening();
      ch.addLongPress();
      if (isZhu) {
        ch.setParentNode(selChrFrame.cont);
      } else {
        ch.setParentNode(selChrFrame2.cont);
        this.setCharChange(ch);
      }
      ch.setClick(event => this.selectChar(ch, event));
    });
    this.createIdentityTip();
    //● 改动：身份标记进页面自动展开，2秒后折叠
    this.autoExpand(this.identityTip.querySelector('.dz_sel_identitys'));
    this.okBtn.style.top = 'calc(50% + 223px)';
    setTimeout(() => {
      selChrFrame.IScroll.refresh();
      selChrFrame2.IScroll.refresh();
    }, 10);
  }
  /**为武将加换将 */
  setCharChange(ch) {
    ch.showChange(evt => {
      evt.stopPropagation();
      dzxy.playAudio('audio/base/huan.mp3');
      this.deleteSkillTip();
      ch.ele2.remove();
      delete ch.ele2;
      ch.ele.classList.remove('dz_selected');
      if (this.selectedList.includes(ch)) this.selectedList.remove(ch);
      ch.initEle(this.getRepChar().randomGet());
      this.checkOK();
    });
  }
  /**非主公的页面 */
  createNoZhuPage() {
    this.zhuArea = new GameZhu();
    if (game.zhu.name1) this.zhuArea.add(game.zhu.name1);
    if (game.zhu.name2) this.zhuArea.add(game.zhu.name2);
    this.zhuArea.showSkill();
    this.zhuArea.setParentNode(this.bigBg);

    let selChrFrame = new SelChrFrame('可选武将');
    selChrFrame.ele.style.top = '44%';
    selChrFrame.setParentNode(this.bigBg);

    let free = this.FreeSelect();
    free.setParentNode(selChrFrame.cont);

    this.dialog.buttons.forEach(i => {
      let ch = new Character2(i.link);
      ch.showHp();
      ch.showframex();
      ch.addLongPress();
      ch.addTouchWhitening();
      ch.setParentNode(selChrFrame.cont);
      this.setCharChange(ch);
      ch.setClick(event => this.selectChar(ch, event));
    });
    this.createIdentityTip();
    this.createMap();
    this.identityTip.style.bottom = '6%';
    //● 改动：身份标记进页面自动展开，2秒后折叠
    this.autoExpand(this.identityTip.querySelector('.dz_sel_identitys'));
    //● 改动：右上角座位标记进页面自动展开，2秒后折叠
    this.autoExpand(this.mapbg.figs);
    setTimeout(() => {
      selChrFrame.IScroll.refresh();
    }, 10);
  }
  /**调整确定按钮的亮灭 */
  checkOK() {
    if (this.selectedList.length == this.requireNum && this.requireNum != 1) {
      this.okBtn.classList.remove('dz-gray');
      if (this.okBtn2) this.okBtn2.classList.remove('dz-gray');
    }
    else {
      this.okBtn.classList.add('dz-gray');
      if (this.okBtn2) this.okBtn2.classList.add('dz-gray');
    }
  }
  /**身份提示 */
  createIdentityTip() {
    this.identityTip = ui.create.div('.dz_sel_identity_tip.dz-wcenter.dz-text-shadow-ss2', this.bigBg);
    let innerTip = `
    <span>你的身份是</span>
      <div class='dz_sel_identitys'>
        <div class='dz_sel_identity'>主公</div>
      </div>
    <span>，请选择你的武将</span>
    `;
    this.identityTip.innerHTML = innerTip;
    let identitys = this.bigBg.querySelector('.dz_sel_identitys');
    identitys.addEventListener('click', (e) => {
      identitys.classList.add('active');
    });

    let first = identitys.firstElementChild;
    first.innerHTML = get.translation(game.me.identity + '2');
    first.setAttribute('data-identity', game.me.identity);

    let setting = this.dialog.querySelectorAll('.add-setting'), td;
    //选身份
    if (setting[1]) td = setting[1].querySelectorAll('.tdnode');
    if (td && td[0] && td[0].link == 'random') for (let i of td) {
      let idHD = ui.create.div('.dz_sel_identity.hd', get.translation(i.link + '2'), identitys);
      idHD.addEventListener('click', (e) => {
        e.stopPropagation();
        first.innerHTML = get.translation(i.link + '2');
        first.setAttribute('data-identity', i.link);
        identitys.classList.remove('active');
        this.bigBg.remove();

        let event = new Event(lib.config.touchscreen ? 'touchend' : 'click');
        i.dispatchEvent(event);
      });
    }
  }
  //● 新增：自动展开选项，delay毫秒后自动折叠
  autoExpand(node, delay = 2000) {
    if (!node) return;
    node.classList.add('active');
    setTimeout(() => {
      if (!node.isConnected) return;
      node.classList.remove('active');
    }, delay);
  }
  /**右上角地图 */
  createMap() {
    let mapbg = ui.create.div('.dz_little_map_bg', this.bigBg);
    mapbg.textArea = ui.create.div('.dz_little_map_ID_cont.dz-wcenter', mapbg);
    mapbg.textEle = ui.create.div('.dz_sel_identity', get.translation(game.me.identity + '2'), mapbg.textArea);
    mapbg.textEle.setAttribute('data-identity', game.me.identity);

    mapbg.figs = ui.create.div('.dz_little_map_figs', mapbg);
    mapbg.figs.addEventListener('click', (evt) => {
      evt.stopPropagation();
      if (game.me == game.zhu) {
        dzxy.create.bottomBarTip('主公身份不可选座位', this.bigBg);
        return;
      }
      mapbg.figs.classList.toggle('active');
    });
    mapbg.fig = ui.create.div('.map_fig', mapbg.figs);
    mapbg.fig.setAttribute('data-identity', game.me.identity);
    mapbg.fig.text = ui.create.div('.dz_text.dz-text-shadow-ss2', mapbg.fig);
    mapbg.fig.text.innerHTML = get.distance(game.zhu, game.me, 'absolute') + 1;

    // 选座位
    let setting = this.dialog.querySelectorAll('.add-setting'), td;
    td = setting[3]?.querySelectorAll('.tdnode');
    if (td && td[0] && typeof td[0].link == 'number') {
      for (let i of td) {
        let figHD = ui.create.div('.map_fig.hd', mapbg.figs);
        figHD.addEventListener('click', (evt) => {
          evt.stopPropagation();
          mapbg.fig.text.innerHTML = i.link + 1;
          mapbg.figs.classList.remove('active');
          let event = new Event(lib.config.touchscreen ? 'touchend' : 'click');
          i.dispatchEvent(event);
          mapbg.other?.remove();
          this.createMap_other();
        });
        figHD.text = ui.create.div('.dz_text.dz-text-shadow-ss2', String(i.link + 1), figHD);
      }
    }
    this.mapbg = mapbg;
    this.createMap_other();
    return mapbg;
  }
  createMap_other() {
    let other = ui.create.div('.dz_little_map_figs_other', this.mapbg);
    this.mapbg.other = other;
    let players = game.players.slice().remove(game.me);
    let middle = (players.length - 1) / 2;
    let odd = players.length % 2 == 0 ? false : true;

    for (let i = players.length - 1; i >= 0; i--) {
      let top = 0;
      let outside = 0;
      let figs = ui.create.div('.dz_little_map_figs', other);
      switch (players.length) {
        case 1:
          break;
        case 2:
          break;
        case 3:
          if (i == 0 || i == players.length - 1) { top = 25; outside = 13; }
          break;
        case 4:
          if (i == 0 || i == players.length - 1) { top = 25; outside = 5; }
          break;
        case 5:
          if (i == 0 || i == players.length - 1) { top = 25; outside = 0; }
          break;
        case 6:
          if (i == 0 || i == players.length - 1) { top = 25; outside = 0; }
          break;
        default:
          if (i == 0 || i == players.length - 1) { top = 22; outside = 0; }
          else if (i == 1 || i == players.length - 2) { top = 7; outside = 0; }
          break;
      }
      figs.style.top = `${top}px`;
      if (i < middle) figs.style.left = `${outside}px`;
      else figs.style.left = `${-outside}px`;

      figs.fig = ui.create.div('.map_fig', figs);
      if (players[i] != game.zhu) figs.fig.classList.add('dz-gray');
      figs.text = ui.create.div('.dz_text.dz-text-shadow-ss2', figs.fig);
      figs.text.innerHTML = get.distance(game.zhu, players[i], "absolute") + 1;
      figs.player = players[i];
    }
    return other;
  }
  /**主界面的技能偏移 */
  tipoffset1 = [90, 50];
  /**点将界面的技能偏移 */
  tipoffset2 = [30, 30];
  /**技能提示 */
  createSkillTip(char, event) {
    if (!this.skillTipBody) {
      this.skillTipBody = dzxy.create.bigBg(document.body);
      this.skillTipBody.style.pointerEvents = 'none';
      this.skillTipBody.style.zIndex = 16;
    }
    let skills = dzxy.getSkill(char.ID);
    let innerSkill = '';
    skills[0].forEach(i => {
      innerSkill += `<p><span style="color:#59e806;">${get.translation(i)}: </span><span>${get.translation(i + '_info')}</span></p>`;
    });
    skills[1].forEach(i => {
      innerSkill += `<p><span style="color:#59e806;">※${get.translation(i)}: </span><span>${get.translation(i + '_info')}</span></p>`;
    });
    let par = this.isfree ? this.subBg : this.bigBg;
    let tipoffset = this.isfree ? this.tipoffset2 : this.tipoffset1;
    this.skillTipEle = dzxy.create.skillTip(innerSkill, event, this.skillTipBody, {
      t: tipoffset[0],
      b: tipoffset[1],
    });
  }
  /**选中武将 */
  selectChar(char, event) {
    event.stopPropagation();
    this.deleteSkillTip();
    if (!char.ele.classList.contains('dz_selected')) {
      char.ele.classList.add('dz_selected');
      char.isSkin ? dzxy.randomSkillAudio(char.ID, false) : dzxy.randomSkillAudio(char.ID, true);
      this.selectedList.push(char);
      this.createSkillTip(char, event);
    }
    else {
      if (this.requireNum == 1) {
        ui.selected.buttons.add({ link: char.ID });
        game.check();
        if (!lib.config.auto_confirm) ui.click.control.call(ui.confirm.firstChild);
        this.addRecentChar([char]);
        this.clearPage();
      }
      else {
        char.ele.classList.remove('dz_selected');
        this.selectedList.remove(char);
      }
    }
    if (this.selectedList.length > this.requireNum) {
      this.selectedList[0].ele.classList.remove('dz_selected');
      if (this.subBg) {
        this.subBg.querySelectorAll('.dz_selected').forEach(c => {
          if (c.source?.ID === this.selectedList[0].ID) {
            c.classList.remove('dz_selected');
          }
        });
      }
      this.selectedList.shift();
    }
    this.checkOK();
  }
  /**进去自由选将界面时对已选武将的处理 */
  handleSelected1() {
    /**备份主界面的选将 */
    this.backCharList = this.selectedList;
    this.selectedList = [];
  }
  /**退出自由选将界面时对已选武将的处理 */
  handleSelected2() {
    while (this.selectedList.length > 0) {
      this.selectedList.shift().ele.classList.remove('dz_selected');
    }
    this.subBg.querySelectorAll('.dz_selected').forEach(c => {
      c.classList.remove('dz_selected');
    });
    this.selectedList = this.backCharList;
  }
  /**自由选将 */
  FreeSelect() {
    let free = new DBtn(ui.create.div('.wujiang-char-base-back'));
    free.frame = ui.create.div('.dz_game_chr_bg_sg', free.ele);
    free.setClick(() => {
      this.isfree = true;
      this.handleSelected1();
      this.checkOK();
      this.deleteSkillTip();
      //背景
      if (this.subBg) {
        this.subBg.show();
        return;
      }
      this.subBg = dzxy.create.bigBg(document.body, 'image/chooseCharacter/ol_bg.jpg', () => this.deleteSkillTip());
      this.subBg.addEventListener('touchmove', (e) => {
        e.stopPropagation();
      });
      ScreenAdapter.add({
        node: this.subBg,
        scale: 1,
        callback: (node, scale) => {
          node.style.zoom = scale;
        }
      });
      this.okBtn2 = this.createOK(this.subBg);
      //返回
      dzxy.create.back(this.subBg, () => {
        this.isfree = false;
        this.handleSelected2();
        this.checkOK();
        this.subBg.hide();
      });

      let frame = new MainFrame();
      frame.clearCont = () => {
        frame.mainCont.innerHTML = '';
      };
      frame.ele.style.transform = 'translate(-50%, -50%)';
      frame.ele.style.width = '910px';
      frame.ele.style.height = '408px';
      frame.main.style.height = '335px';
      let titlex = ui.create.div('.dz-title', '自由选将', frame.ele); titlex.style.cssText = 'position:absolute;top:-65px;left:50%;transform:translateX(-50%);font-size:28px;font-family:shousha;color:#FFD27F;text-shadow:0px 0px 2px black,0px 0px 2px black;z-index:5;'; //●标题
      frame.setParentNode(this.subBg);

      let This = this;
      async function packClick(packBtn) {
        //全部武将按钮特殊处理
        let inputText;
        let p = new Promise((res) => {
          if (packBtn.ID == 'all') {
            dzxy.create.input(This.subBg, function () {
              if (!this.input.value.length) {
                this.remove();
                res();
              }
              inputText = this.input.value.split(' ');
              this.remove();
              res();
            }, '请输入武将名进行搜索，多个之间用空格隔开', '');
          } else {
            res();
          };
        });
        await p;
        //●点击武将包时若字母筛选展开则模拟点击展开按钮收起
        let openBtn = frame.ele.querySelector('.fy-btn');
        if (openBtn && !namecaptDiv.classList.contains('hidden')) openBtn.click();
        else frame.topCont.classList.remove('dz-break');

        frame.clearCont();
        packBtn.active();
        for (let i of packBtn.charList) {
          //全部武将按钮特殊处理
          if (inputText) {
            let find = inputText.some(j => String(get.translation(i)).indexOf(j) != -1 || String(i).indexOf(j) != -1);
            if (!find) continue;
          }
          //处理最近的武将
          if (!lib.character[i]) continue;
          let captx = getCapt(i);
          let char = new Character(i);
          char.capt = captx;
          char.notban();
          This.selectedList.forEach(c => {
            if (c.ID == char.ID) char.ele.classList.add('dz_selected');
          });
          if (namecaptFilter && namecaptFilter != captx) char.notDisplay();
          char.setParentNode(frame.mainCont);
          char.setClick((event) => {
            This.selectChar(char, event);
          });
        }
      }
      //字母筛选>
      let namecaptDiv = ui.create.div('.search-filter-area.chooseChar', this.subBg);
      namecaptDiv.hide(); //●默认隐藏，点击展开按钮才显示
      let namecaptFilter = null;
      var namecapt = [];
      var getCapt = function (str) {
        var capt;
        if (str.indexOf("_") == -1) {
          capt = str[0];
        } else {
          capt = str[str.lastIndexOf("_") + 1];
        }
        capt = capt.toLowerCase();
        if (!/[a-z]/i.test(capt)) {
          capt = "自定义";
        }
        return capt;
      };
      //<
      //遍历开启的武将包
      let allCharList = [];
      for (let pack of lib.config.characters) {
        if (!dzxy.charPack[pack]) continue;
        let packallchar = Object.keys(dzxy.charPack[pack]);
        let packBtn = new MainFrameTopBtn(pack, dzxy.translate[pack + '_character_config']);
        frame.topAddBtn(packBtn);
        packBtn.charList = packallchar.filter(i => {
          // if (dzxy.character[i] && dzxy.character[i][4] && dzxy.character[i][4].includes('unseen')) return false;
          // return !lib.config.banned.includes(i);
          if (!lib.character[i] || lib.filter.characterDisabled2(i) || lib.config.banned.includes(i)) return false;
          if (namecapt.indexOf(getCapt(i)) == -1) {
            namecapt.push(getCapt(i));
          }
          return true;
        });
        allCharList.addArray(packBtn.charList);
        packBtn.charList2 = packallchar.slice();
        packBtn.setClick(() => {
          packClick(packBtn);
        });
        packBtn.setText();
      }
      //全部
      (function () {
        let packBtn = new MainFrameTopBtn('all', '全部');
        frame.topAddBtn(packBtn, 0);
        packBtn.charList = allCharList;
        packBtn.charList2 = allCharList;
        packBtn.setText();
        packBtn.setClick(() => {
          packClick(packBtn);
        });
      })();
      //最近
      (function () {
        let packBtn = new MainFrameTopBtn('recent', '最近');
        frame.topAddBtn(packBtn, 0);
        //● 最近分类：除了本扩展自己的最近武将，再并入无名杀本体 game.addRecentCharacter 记录的武将
        let recentCharList = lib.config[`${dzxy.dz}RecentChseChar`]['charList'].slice();
        try {
          const nzmRecent = get.config('recentCharacter');
          if (Array.isArray(nzmRecent)) {
            for (let id of nzmRecent) {
              if (typeof id != 'string' || !lib.character[id]) continue;
              if (!recentCharList.includes(id)) recentCharList.push(id);
            }
          }
        } catch (e) { }
        packBtn.charList = recentCharList;
        packBtn.setText();
        packBtn.setClick(() => {
          packClick(packBtn);
        });
        packClick(packBtn);
      })();
      //展开
      (function () {
        let open = ui.create.div('.fy-btn', '展开', frame.ele, {
          'position': 'absolute',
          'top': '-66px',
          'left': '-15px',
        });
        open.addEventListener('click', () => {
          frame.topCont.classList.toggle('dz-break');
          /*●*/
          if (namecaptDiv.classList.contains('hidden')) {
            namecaptDiv.show();
            open.innerHTML = '收起';
          } else {
            namecaptDiv.hide();
            open.innerHTML = '展开';
            //收起时清除字母筛选
            if (namecaptFilter) {
              namecaptFilter = null;
              namecaptDiv.querySelectorAll('.char-name-btn').forEach(b => b.classList.remove('active'));
              let allChar = This.subBg.querySelectorAll('.jj-char-base-back');
              for (let ch of allChar) {
                ch.source.display();
              }
            }
          }

        });
      })();
      //字母筛选>
      namecapt.sort(function (a, b) {
        return a > b ? 1 : -1;
      });
      namecapt.forEach(i => {
        let btn = new DBtn(ui.create.div('.char-name-btn', i, namecaptDiv));
        btn.setClick(() => {
          if (btn.ele.classList.contains("active")) {
            btn.ele.classList.remove("active");
            namecaptFilter = null;
            let allChar = this.subBg.querySelectorAll('.jj-char-base-back');
            for (let ch of allChar) {
              ch.source.display();
            }
          }
          else {
            btn.active(namecaptDiv);
            namecaptFilter = i;
            let allChar = this.subBg.querySelectorAll('.jj-char-base-back');
            for (let ch of allChar) {
              if (ch.source.capt != i) ch.source.notDisplay();
              else ch.source.display();
            }
          }
        });
      });
    });
    return free;
  }
  /**
   * 增加到最近
   * @param {Array} list 武将数组 [{ID:xxx}]
   */
  addRecentChar(list) {
    let listx = list.slice().reverse();
    for (let i of listx) {
      let charID;
      if (typeof i == "string") charID = i;
      else if (typeof i == "object" && typeof i.ID == "string") charID = i.ID;
      if (!dzxy.character[charID]) continue;
      let data = lib.config[`${dzxy.dz}RecentChseChar`];
      data.recentCharList.unshift(charID);
      data.charList.remove(charID);
      let freqNum = Number(lib.config[`${dzxy.dz}recentCharFreq`]);
      while (data.recentCharList.length > freqNum) data.recentCharList.pop();

      let charNum = {};
      for (let j of data.recentCharList) {
        if (charNum[j] == undefined) charNum[j] = 0;
        charNum[j]++;
      }
      let index;
      for (index = 0; index < data.charList.length; index++) {
        let cID = data.charList[index];
        if (!charNum[cID] || (charNum[cID] && charNum[cID] <= charNum[charID])) {
          break;
        }
      }
      data.charList.splice(index, 0, charID);
      if (data.charList.length > data.maxNum) data.charList = data.charList.slice(0, data.maxNum);
      dzxy.saveCF('RecentChseChar', data);
    }
    //● 选将后同步加入无名杀本体的「最近武将」（game.addRecentCharacter）
    try {
      let nzmIDs = list.map(i => (typeof i == 'string' ? i : i && i.ID)).filter(id => typeof id == 'string' && lib.character[id]);
      if (nzmIDs.length && typeof game.addRecentCharacter == 'function') game.addRecentCharacter.apply(game, nzmIDs);
    } catch (e) { }
  }
  /**初始化自由选将的最近页面 */
  static initRecentChseChar() {
    dzxy.initCF('RecentChseChar', {
      maxNum: 50,
      charList: [],
      recentCharList: [],
    });
  }
}
export class ChooseChar_doudizhu extends ChooseChar {
  openPage(dialog, requireNum) {
    dialog.classList.add('dialog-hide');
    this.dialog = dialog;
    /**需要选择的武将数量 */
    this.requireNum = requireNum;
    /**页面主背景 */
    this.bigBg = dzxy.create.bigBg(document.body, 'image/chooseCharacter/ol_bg.jpg', () => {
      this.deleteSkillTip();
    });
    this.bigBg.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    });
    this.bigBg.style.zIndex = '8';
    ScreenAdapter.add({
      node: this.bigBg,
      callback: (node, scale) => {
        node.style.zoom = scale;
      }
    });
    /**选多个武将 进入游戏的确定按钮 */
    this.okBtn = this.createOK(this.bigBg);
    this.createNoZhuPage();
    this.zhuArea.ele.hide();
    //● 改动：斗地主模式玩家是主公（地主）时，不自动展开右上角座位地图
    if (game.me == game.zhu) this.mapbg.figs.classList.remove('active');
  }
  updateLayout() {
    let num = get.distance(game.zhu, game.me, "absolute");
    let map = {
      0: 'zhu1',
      1: 'nong2',
      2: 'nong3',
    }
    let strNum = String(num);
    if (map[strNum]) ui.arena.dataset.layoutDoudizhu = map[strNum];
  }
}
export class ChooseChar_doudizhu_huanle extends ChooseChar_doudizhu {
  openPage(...args) {
    super.openPage(...args);
    this.createRemainHJK();
  }
  /**为武将加换将 */
  setCharChange(ch) {
    ch.showChange(evt => {
      evt.stopPropagation();
      let hjk = Props.getCount('huanjiangka');
      if (hjk <= 0) {
        dzxy.create.bottomBarTip('换将卡不足', this.bigBg);
        return;
      }
      dzxy.playAudio('audio/base/huan.mp3');
      this.deleteSkillTip();
      ch.ele2.remove();
      delete ch.ele2;
      ch.ele.classList.remove('dz_selected');
      if (this.selectedList.includes(ch)) this.selectedList.remove(ch);
      ch.initEle(this.getRepChar().randomGet());
      Props.changeCount('huanjiangka', -1);
      this.updataRemainHJK();
      dzxy.create.bottomBarTip('使用道具换将卡成功', this.bigBg);
      this.checkOK();
    });
  }
  createRemainHJK() {
    this.remain_hjk = ui.create.div('.remain_huanjiangka', this.bigBg);
    this.updataRemainHJK();
  }
  updataRemainHJK() {
    let hjk = Props.getCount('huanjiangka');
    let hld = Props.getCount('huanledou');
    this.remain_hjk.innerHTML = `<p>当前换将卡<span style="font-weight: bolder;color: #d1e7e7;">${hjk}</span></p>
    <p>当前欢乐豆<span style="font-weight: bolder;color: #d1e7e7;">${hld}</span></p>
    `;
  }
}
/**对决 */
export class ChooseChar_versus extends ChooseChar {
  openPage(dialog, requireNum) {
    dialog.classList.add('dialog-hide');
    this.dialog = dialog;
    this.requireNum = requireNum;
    this.selectedList = new Array(this.requireNum).fill(0);
    this.bigBg = dzxy.create.bigBg(document.body, 'image/chooseCharacter/ol_bg.jpg', () => {
      this.deleteSkillTip();
    });
    this.bigBg.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    });
    this.bigBg.style.zIndex = '8';
    ScreenAdapter.add({
      node: this.bigBg,
      callback: (node, scale) => {
        node.style.zoom = scale;
      }
    });
    this.okBtn = this.createOK(this.bigBg);
    this.okBtn.hide();
    // 创建第一行可选武将
    let selChrFrame = this.createSelChrFrame('可选武将', '40%');
    this.selChrFrame = selChrFrame;

    let free = this.FreeSelect();
    free.ele.classList.add('jj-char-base-back');
    free.setParentNode(this.selChrFrame.cont);

    this.addCharactersToFrame(selChrFrame, 1);

    // 创建第二行替补武将
    let selChrFrame2 = this.createSelChrFrame('替补武将', 'calc(40% + 150px)');
    this.selChrFrame2 = selChrFrame2;

    this.addCharactersToFrame(selChrFrame2, 2);
    //非替补模式
    if (!_status.replacetwo) {
      selChrFrame.ele.style.top = '53%';
      selChrFrame2.ele.hide();
    }
    this.createIdentityTip();
    this.createMap();
    //● 改动：行动顺序标记进页面自动展开，2秒后折叠
    this.autoExpand(this.identityTip.querySelector('.dz_sel_identitys'));
    this.createShowChar();
  }

  createSelChrFrame(title, topPosition) {
    let selChrFrame = new SelChrFrame(title);
    selChrFrame.ele.style.top = topPosition;
    selChrFrame.ele.style.height = '120px';
    selChrFrame.cont.style.justifyContent = 'center';
    selChrFrame.setParentNode(this.bigBg);
    selChrFrame.charList = [];
    return selChrFrame;
  }
  addCharactersToFrame(selChrFrame, row) {
    let btns = this.dialog.buttons.slice();
    for (let i = 0; i < btns.length; i++) {
      let ch = new Character(btns[i].link);
      ch.row = row;
      ch.index = i;
      ch.setParentNode(selChrFrame.cont);
      selChrFrame.charList.push(ch);
      ch.showFrame();
      ch.setClick((event) => {
        this.selectChar(ch, event);
      });
    }
  }

  //显示上面的两个武将
  createShowChar() {
    this.showArea = ui.create.div('.tt-show-char-area', this.bigBg);
    //替补
    if (!_status.replacetwo) {
      this.showArea.style.top = '11%';
      this.showArea.style.transform = 'translateX(-50%) scale(1.1)';
    }
    /**自己武将 */
    this.showChar1 = new Character2();
    this.showChar1.showSelf();
    this.showChar1.showframex();
    this.showChar1.showHp();
    this.showChar1.ele.style.position = 'relative'
    this.showChar1.setParentNode(this.showArea);
    this.showChar1.setClick(() => {
      if (this.showChar1.ele.classList.contains('dz_selected')) {
        let UIsel = [];
        this.selectedList.forEach(char => {
          UIsel.add({ link: char.ID });
        });
        //替补选4个1和3才是初始武将
        if (this.requireNum == 4) {
          let t = UIsel[1];
          UIsel[1] = UIsel[2];
          UIsel[2] = t;
        }
        ui.selected.buttons.addArray(UIsel);
        game.check();
        if (!lib.config.auto_confirm || this.requireNum > 1) ui.click.control.call(ui.confirm.firstChild);
        this.addRecentChar(this.selectedList);
        this.clearPage();
      }
    })
    //代替队友选将 
    if (get.config("two_assign")) {
      this.initCharNum = 2;
      let ch = this.selChrFrame.charList.randomGet();
      this.selectedList[1] = ch;
      ch.showSelfSel('other');
      ch.sel = true;
      this.selChrFrame2.charList[ch.index].notDisplay();
      /**队友武将 */
      this.showChar2 = new Character2(ch.ID);
      this.showChar2.showframex();
      this.showChar2.showHp();
      this.showChar2.ele.style.position = 'relative'
      this.showChar2.showRecommend();
      this.showChar2.recommend.addEventListener('click', () => {
        this.recommend = !this.recommend;
        this.showChar2.recommend.classList.toggle('active');
      });
      this.showChar2.setParentNode(this.showArea);
    }
    this.repCharNum = this.requireNum - this.initCharNum;
  }
  /**初始武将个数 */
  initCharNum = 1;
  /**替补武将个数 */
  repCharNum;
  tipoffset1 = [30, 30];
  /**选择武将 */
  selectChar(char, event) {
    event.stopPropagation();
    this.deleteSkillTip();
    if (!char.row) {
      super.selectChar(char, event);
      return;
    }
    //第一行的武将
    if (char.row == 1) {
      let find = this.selectedList.slice(this.initCharNum).find(i => i && i.ID == char.ID);
      if (find) {
        dzxy.create.bottomBarTip('该武将已被选中', this.bigBg);
        return;
      }
      if (!this.recommend) this.createSkillTip(char, event);
      dzxy.randomSkillAudio(char.ID, true);
      //推荐
      if (this.recommend) {
        if (char.sel) {
          if (char != this.selectedList[1]) this.swapChar();
          else this.showChar2.recommend.classList.remove('active');
          this.recommend = false;
          return;
        }
        this.showChar2.ele2.remove();
        this.showChar2.initEle(char.ID);
        this.recommend = false;
        this.showChar2.recommend.addEventListener('click', () => {
          this.recommend = !this.recommend;
          this.showChar2.recommend.classList.toggle('active');
        });
        if (this.selectedList[1]) {
          this.selectedList[1].hideSelfSel();
          this.selectedList[1].sel = false;
          this.selChrFrame2.charList[this.selectedList[1].index].display();
        }
        this.selectedList[1] = char;
        char.showSelfSel('other');
        char.sel = true;
      }
      else {//自己的
        if (char.sel) return;
        if (this.selectedList[0]) {
          this.selectedList[0].hideSelfSel();
          this.selectedList[0].sel = false;
          this.selChrFrame2.charList[this.selectedList[0].index].display();
        }
        this.showChar1.ele2.remove();
        this.showChar1.initEle(char.ID);
        this.selectedList[0] = char;
        char.showSelfSel('self');
        char.sel = true;
      }
      this.selChrFrame2.charList[char.index].notDisplay();
    }
    else if (char.row == 2) {//第二行的武将
      //帮选只能第一行
      if (this.recommend) {
        this.recommend = false;
        this.showChar2.recommend.classList.remove('active');
      }
      //被选状态就取消
      if (char.sel) {
        let index = this.selectedList.findIndex(i => i && i.ID == char.ID);
        this.selectedList[index].hideSelfSel();
        this.selectedList[index].sel = false;
        this.selectedList[index] = 0;
      }
      else {//找到替补部分的空位删除，补新选的在后面
        dzxy.randomSkillAudio(char.ID, true);
        let delIndex = this.initCharNum;
        for (let i = delIndex; i < this.selectedList.length; i++) {
          if (this.selectedList[i] == 0) { delIndex = i; break; }
        }
        if (this.selectedList[delIndex]) {
          this.selectedList[delIndex].hideSelfSel();
          this.selectedList[delIndex].sel = false;
        }
        this.selectedList.splice(delIndex, 1);
        this.selectedList.push(char);
        char.showSelfSel();
        char.sel = true;
      }
    }
    //检测确定
    let ok = this.selectedList.every(i => i && i.ID);
    if (ok) this.showChar1.ele.classList.add('dz_selected');
    else this.showChar1.ele.classList.remove('dz_selected');
  }
  swapChar() {
    if (!get.config("two_assign")) return;
    [this.selectedList[0], this.selectedList[1]] = [this.selectedList[1], this.selectedList[0]];
    this.selectedList[0].showSelfSel('self');
    this.selectedList[1].showSelfSel('other');
    this.showChar1.ele2.remove();
    this.showChar1.initEle(this.selectedList[0].ID);
    this.showChar2.ele2.remove();
    this.showChar2.initEle(this.selectedList[1].ID);
    this.showChar2.recommend.addEventListener('click', () => {
      this.recommend = !this.recommend;
      this.showChar2.recommend.classList.toggle('active');
    });
  }
  createIdentityTip() {
    this.identityTip = ui.create.div('.dz_sel_identity_tip.dz-wcenter.dz-text-shadow-ss2', this.bigBg);
    if (!_status.replacetwo) {
      this.identityTip.style.bottom = '10%';
    }
    let innerTip = `
    <span>你是</span>
      <div class='dz_sel_identitys'>
        <div class='dz_sel_identity'>第一个</div>
      </div>
    <span>行动，请选择你的武将</span>
    `;
    this.identityTip.innerHTML = innerTip;
    let identitys = this.bigBg.querySelector('.dz_sel_identitys');
    identitys.addEventListener('click', (e) => {
      identitys.classList.add('active');
    });

    let first = identitys.firstElementChild, cur = _status.firstAct;
    this.pos = 1;
    while (cur != game.me) {
      cur = cur.next;
      this.pos++;
    }

    first.innerHTML = `第${get.cnNumber(Number(this.pos), true)}个`
    first.setAttribute('data-identity', 'zhu');

    let setting = this.dialog.querySelectorAll('.add-setting'), td;
    //选身份
    if (setting[1]) td = setting[1].querySelectorAll('.tdnode');
    if (td && td[0] && typeof td[0].link == 'number') for (let i of td) {
      let cnNum = get.cnNumber(Number(i.link + 1), true);
      let idHD = ui.create.div('.dz_sel_identity.hd', cnNum, identitys);
      idHD.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pos = Number(i.link + 1);
        first.innerHTML = `第${cnNum}个`
        first.setAttribute('data-identity', 'zhu');
        identitys.classList.remove('active');
        // this.bigBg.remove();
        let event = new Event(lib.config.touchscreen ? 'touchend' : 'click');
        i.dispatchEvent(event);
        this.mapbg.remove();
        this.createMap();
      });
    }
  }
  createMap() {
    let mapbg = ui.create.div('.dz_little_map_bg', this.bigBg);
    mapbg.textArea = ui.create.div('.dz_little_map_ID_cont.dz-wcenter', mapbg);
    mapbg.textEle = ui.create.div('.dz_sel_identity', (this.pos == 1 || this.pos == 4) ? '龙队' : '虎队', mapbg.textArea);
    mapbg.textEle.setAttribute('data-identity', 'zhu');

    mapbg.figs = ui.create.div('.dz_little_map_figs', mapbg);
    mapbg.fig = ui.create.div('.map_fig', mapbg.figs);
    // mapbg.fig.setAttribute('data-identity', 'zhu');
    mapbg.fig.text = ui.create.div('.dz_text.dz-text-shadow-ss2', mapbg.fig);
    mapbg.fig.text.innerHTML = get.distance(_status.firstAct, game.me, 'absolute') + 1;
    this.mapbg = mapbg;
    this.createMap_other();
    return mapbg;
  }
  createMap_other() {
    super.createMap_other();
    let seatTexts = this.mapbg.other.querySelectorAll('.dz_little_map_figs')
    for (let i of seatTexts) {
      if (i.player.side != game.me.side) i.fig.classList.add('dz-gray');
      i.text.innerHTML = get.distance(_status.firstAct, i.player, "absolute") + 1;
    }
  }
}
