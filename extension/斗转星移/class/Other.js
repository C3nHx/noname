import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { DEle } from "./baseEle.js";
export class Other {
  static addSkill() {
    //调整对局武将露头
    // if (lib.config[`${dzxy.dz}gameloutou`]) {
    //   lib.skill._dzxy_gameloutou = {
    //     trigger: {
    //       global: 'gameDrawBefore',
    //       player: ['changeSkillsEnd', 'changeCharacterEnd'],
    //     },
    //     charlotte: true,
    //     forced: true,
    //     charLt: function (name, node) {
    //       if (!name || !node) return;
    //       //没有千幻就是原画
    //       if (!game.hasExtension('千幻聆音')) {
    //         let loutou = dzxy.getCharData(name, 'loutou', true);
    //         dzxy.setDcdLoutou(node, loutou);
    //       }
    //       else {
    //         let skin = lib.config.qhly_skinset.skin[name];
    //         if (skin) {
    //           let loutou = dzxy.getCharData(name, 'skinloutou', true);
    //           dzxy.setDcdLoutou(node, loutou);
    //         } else {
    //           let loutou = dzxy.getCharData(name, 'loutou', true);
    //           dzxy.setDcdLoutou(node, loutou);
    //         }
    //       }
    //     },
    //     content: function () {
    //       lib.skill._dzxy_gameloutou.charLt(player.name1, player.node.avatar);
    //       lib.skill._dzxy_gameloutou.charLt(player.name2, player.node.avatar2);
    //     },
    //   };
    // }
  }
  static subscribe() {
    dzxy.setDcdLoutou = (node, style) => {
      if (style == 'none') {
        // node.style.height = '100%';
        // node.style.clipPath = 'none';
        node.dataset.loutou = 'none';
      }
      else if (style == 'shousha') {
        node.dataset.loutou = 'shousha';
      }
      else if (style == 'shizhounian') {
        node.dataset.loutou = 'shizhounian';
        // node.style.height = '183px';
        // node.style.clipPath = 'url(#duol-clip)';
        // node.style.webkitClipPath = 'url(#duol-clip)';
      }
    };
    //先简单处理
    //调整对局武将露头
    // if (lib.config[`${dzxy.dz}gameloutou`]) {
    //   lib.announce.subscribe("qhlyChangeSkin", (data) => {
    //     //武将名 data.characterName
    //     //皮肤名 data.skinName
    //     let name = data.characterName;
    //     let name2 = name;
    //     //关于国战武将特别配置。
    //     if (name2.indexOf('gz_') < 0) {
    //       name2 = 'gz_' + name2;
    //     } else {
    //       name2 = name.slice(3);
    //     }

    //     var players = game.players;
    //     if (players) {
    //       players = players.slice(0);
    //     }
    //     if (game.dead) {
    //       players = players.concat(game.dead);
    //     }
    //     players = players.filter(function (player) {
    //       if (player.name1 == name || player.name2 == name) {
    //         return true;
    //       }
    //       return player.name1 == name2 || player.name2 == name2;
    //     });
    //     if (!players.length) return;

    //     for (var player of players) {
    //       if (player.name1 == name || player.name1 == name2) {
    //         if (data.skinName) {
    //           let loutou = dzxy.getCharData(player.name1, 'skinloutou', true);
    //           dzxy.setDcdLoutou(player.node.avatar, loutou);
    //         } else {
    //           let loutou = dzxy.getCharData(player.name1, 'loutou', true);
    //           dzxy.setDcdLoutou(player.node.avatar, loutou);
    //         }
    //       }
    //       else if (player.name2 == name || player.name2 == name2) {
    //         if (data.skinName) {
    //           let loutou = dzxy.getCharData(player.name2, 'skinloutou', true);
    //           dzxy.setDcdLoutou(player.node.avatar2, loutou);
    //         } else {
    //           let loutou = dzxy.getCharData(player.name2, 'loutou', true);
    //           dzxy.setDcdLoutou(player.node.avatar2, loutou);
    //         }
    //       }
    //     }
    //   });
    // }//if
  }
  static longPressSkillTip() {
    let time, tipNode;
    let createTip = (evt) => {
      if (!evt.target.classList.contains('skillitem') && !evt.target.parentNode?.classList.contains('skillitem')) return;
      if (!evt.target.closest('.skill-control')) return;
      let skill = evt.target.dataset.id || evt.target.parentNode?.dataset.id;
      if (!skill) return;
      let innerSkill = '';
      innerSkill += `<p><span style="color:#59e806;">${get.translation(skill, 'skill')}: </span><span>${get.skillInfoTranslation(skill, game.me)}</span></p>`;
      let info = get.info(skill), exSkills = [];
      if (info && info.derivation) {
        typeof info.derivation == 'string' ? exSkills.add(info.derivation) : exSkills.addArray(info.derivation);
      }
      for (let i of exSkills) {
        innerSkill += `<p><span style="color:#59e806;">※${get.translation(i, 'skill')}: </span><span>${get.translation(i, 'info')}</span></p>`;
      }
      tipNode = dzxy.create.skillTip(innerSkill, evt, document.body);
      tipNode.classList.remove('dz-bigBg-skill');
    }
    document.body.addEventListener('touchstart', (evt) => {
      time = setTimeout(() => {
        createTip(evt);
      }, 500);
    });
    document.body.addEventListener('touchend', (evt) => {
      clearTimeout(time);
    });
    document.body.addEventListener('touchmove', (evt) => {
      clearTimeout(time);
    });
    document.body.addEventListener('mousedown', (evt) => {
      time = setTimeout(() => {
        createTip(evt);
      }, 500);
    });
    document.body.addEventListener('mouseup', (evt) => {
      clearTimeout(time);
    });
    document.body.addEventListener('mouseleave', (evt) => {
      clearTimeout(time);
    });
  }
}
Other.longPressSkillTip();
export class Danmu {
  static danmuArea;
  static createArea() {
    if (!Danmu.danmuArea) Danmu.danmuArea = ui.create.div('.dz-danmu-area', document.body);
  }
  static track = [
    { index: 0, useful: true },
    { index: 1, useful: true },
    { index: 2, useful: true }
  ];
  static addDanmu(text) {
    if (typeof text != 'string') return;
    let useful = Danmu.track.filter(i => i.useful == true);
    if (useful.length) {
      let random = useful.randomGet();
      let dm = ui.create.div('.dz-danmu', text, Danmu.danmuArea);
      dm.style.top = random.index * 25 + Math.random() * 15 + 'px';
      Danmu.track[random.index]['useful'] = false;
      setTimeout(() => {
        Danmu.track[random.index]['useful'] = true;
      }, 1000);
      setTimeout(() => {
        dm.remove();
      }, 10000);
    }

  }
}


export class Timebar extends DEle {
  constructor(text, runtime, delaytime, callback) {
    super(ui.create.div('.dz_timebar_area'));
    this.reset(text, runtime, delaytime, callback);
  }
  reset(text, runtime, delaytime, callback) {
    this.ele.innerHTML = '';
    if (typeof runtime != "number") runtime = 50000;
    if (typeof delaytime != "number") delaytime = 0;
    this.text = ui.create.div('.dz-text-shadow-ss.dz_timebar_text', text, this.ele);
    this.timebar2 = ui.create.div('.dz_sel_timebar_bg2', this.ele);
    this.timebar = ui.create.div('.timebar_bg', this.timebar2);
    this.timebar.style.animationDuration = runtime + 'ms';
    this.timebar.style.animationDelay = delaytime + 'ms';
    if (typeof callback == "function") {
      // 等后面需要的话再写 还要清除
      // this.timer=setTimeout(callback, runtime + delaytime);
    }
  }
}