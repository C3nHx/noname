import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { DBtn, DEle } from "./baseEle.js";
import victoryAudio from "../victoryAudio.js";
import { ScreenAdapter } from "./ScreenAdapter.js";
/**武将3 */
export class Character3 extends DBtn {
  constructor(ID) {
    super(ui.create.div(".mvp-char-base"));
    this.initEle(ID);
  }
  initEle(ID) {
    this.ID = ID;
    this.name = get.translation(this.ID);
    let char = dzxy.character[this.ID];
    this.frameTop = ui.create.div(".mvp-char-frameTop", this.ele);
    this.charImg = ui.create.div(".mvp-char-img", this.ele);
    this.frame = ui.create.div(".mvp-char-frame", this.ele);
    if (dzxy.bborder.includes(char?.[1])) {
      this.frame.setBackgroundImage(
        `${dzxy.path}/image/char_big_border/${char[1]}.png`,
      );
      this.frameTop.setBackgroundImage(
        `${dzxy.path}/image/char_big_border/${char[1]}_top.png`,
      );
    }
    this.nameEle = ui.create.div(
      ".mvp-char-name",
      dzxy.charNameRep(this.name),
      this.ele,
    );
    this.stars = ui.create.div(".mvp-char-star-area", this.ele);
    for (let i = 0; i < 4; i++) {
      ui.create.div(".mvp-char-star", this.stars);
    }
  }
}
export class Mvp {
  async open() {
    let mvp = this.getMvp();
    let player = mvp.player;

    let bigBg = dzxy.create.bigBg(document.body, true);
    ScreenAdapter.add({
      node: bigBg,
      callback: (node, scale) => {
        node.style.zoom = scale;
      },
    });
    bigBg.classList.add("page-mvp");
    bigBg.classList.add("pre-show");

    /*●*/
    bigBg.listen(() => {
      bigBg.remove();
      ui.control?.classList.remove("dialog-hide");
      if (lib.config.mode == "identity" && typeof game.getJiaojialulu == "function") dzxy.Jiesuan.resolve();
      else {
        ui.dialog?.classList.remove("dialog-hide");
        if (lib.config.mode == "versus") dzxy.PWGrade.resolve();
        else dzxy.Jiesuan.resolve();
      }
    });

    //mvp图片路径
    let match =
      player.node.avatar.style.backgroundImage.match(/url\("([^"]+)"\)/);
    let lastIndex_d = match[1].lastIndexOf(".");
    let pathList = match[1].slice(0, lastIndex_d).split("/");
    let isOringinSkin =
      pathList.indexOf(player.skin.name) == pathList.length - 1;

    // bigBg.setBackgroundImage(`${dzxy.path}image/1.jpg`);
    let char = new Character3(player.name1);
    char.charImg.dataset.loutou = player.node.avatar.dataset.loutou;
    char.charImg.style.backgroundImage =
      player.node.avatar.style.backgroundImage;
    //大图
    let datu = "";
    if (isOringinSkin) {
      datu = `extension/千幻聆音/sanguoyuanhua/${player.name1}/${player.skin.name}.jpg`;
    } else {
      let skinName = pathList[pathList.length - 1];
      datu = `extension/千幻聆音/sanguoyuanhua/${player.name1}/${skinName}.jpg`;
    }
    let exist = await dzxy.checkImageExists(datu);
    if (exist) {
      char.charImg.setBackgroundImage(datu);
      char.charImg.dataset.loutou = "none";
    }
    //●页面
    let name;
    if (typeof game.getJiaojialulu == "function") name = player == game.me ? (window._getRzczUserName ? window._getRzczUserName() : (lib.config.connect_nickname ? lib.config.connect_nickname : '无名玩家')) : (player.nickname ? player.nickname : get.translation(player.name1));
    else name = player == game.me ? (typeof lib.config.connect_nickname == "string" ? lib.config.connect_nickname.slice(0, 12) : "无名玩家") : get.translation(player.name1);

    bigBg.innerHTML = /*html*/ `
    <div class='mvp-design-bg dz-center'>
      <div class='mvp-piaodai1'></div>
      <div class='mvp-piaodai2'></div>
      <div class='mvp-back-light'></div>
      <div class='mvp-quanchangzuijia'></div>
      <div class='mvp-player-info-area'>
        <div class='mvp-player-info-guanjie'></div>
        <div class='mvp-player-info-text'>
          <p>玩家昵称</p>
          <p>${name}</p>
          <p>技术分：${mvp.all}</p>
        </div>
        <div class='mvp-player-info-benren'></div>
      </div>
      <div class='mvp-score-area'></div>
      <div class='mvp-char-light'></div>
    </div>`;
    let scoreArea = bigBg.querySelector(".mvp-score-area");
    let o = {
      攻击分数: mvp.damage,
      受击分数: mvp.damaged,
      治疗分数: mvp.cure,
      辅助分数: mvp.help,
      局势分数: mvp.state,
    };

    let str = "";
    for (let i in o) {
      str += `<p>${i}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${o[i]}</p>`;
    }
    scoreArea.innerHTML = str;
    char.setParentNode(bigBg.firstElementChild);
    //胜利语音
    await dzxy.delay(600);
    bigBg.classList.remove("pre-show");

    let mvpVictoryAudio = `ext:千幻聆音/sanguoaudio/${player.name1}/`;
    let filename = "victory";
    if (isOringinSkin) {
      //原皮
      filename +=
        player.name1 == player.skin.name ? `` : `_${player.skin.name}`;
      mvpVictoryAudio = `${mvpVictoryAudio}${filename}.mp3`;
      let play1 = await dzxy.tryPlayAudio(mvpVictoryAudio);
      if (play1) return;
      if (victoryAudio[player.name1]?.[player.skin.name]) {
        mvpVictoryAudio = victoryAudio[player.name1][player.skin.name];
      }
      let play2 = await dzxy.tryPlayAudio(mvpVictoryAudio);
      if (!play2) dzxy.randomSkillAudio(player.name1, true, player.skin.name);
    } else {
      let skinName = pathList[pathList.length - 1];
      mvpVictoryAudio = `${mvpVictoryAudio}${skinName}/${filename}.mp3`;
      let play1 = await dzxy.tryPlayAudio(mvpVictoryAudio);
      if (play1) return;
      if (victoryAudio[player.name1]?.[skinName]) {
        mvpVictoryAudio = victoryAudio[player.name1][skinName];
      }
      let play2 = await dzxy.tryPlayAudio(mvpVictoryAudio);
      if (!play2) dzxy.randomSkillAudio(player.name1, false, player.skin.name);
    }
  }
  getMvp() {
    let list = [];
    for (let i of game.players) {
      let pscoreMap = {
        player: i,
        damage: 0,
        damaged: 0,
        cure: 0,
        help: 0,
        state: 0,
        all: 0,
      };
      pscoreMap.state += 100;
      pscoreMap.cure += i.dzxy_mvp?.cure || 0;
      pscoreMap.help += i.dzxy_mvp?.help || 0;
      for (let j of i.stat) {
        if (j.damage != undefined) {
          pscoreMap.damage += j.damage * 3;
        }
        if (j.damaged != undefined) {
          pscoreMap.damaged += j.damaged * 1;
        }
        if (j.kill != undefined) {
          pscoreMap.kill += j.kill * 3;
        }
      }
      list.push(pscoreMap);
    }
    list.forEach((i) => {
      i.all = i.damage + i.damaged + i.cure + i.help + i.state;
    });
    let max = list[0];
    for (let i of list) {
      if (i.all > max.all) max = i;
    }
    return max;
  }
}

//●lib.arenaReady.push(() => { ui.create.system("mvp", () => { new Mvp().open() }) });
//分数计算
dzxy.mvp_score_init = false;
lib.skill._mvp_score_init = {
  trigger: {
    global: "phaseBefore",
    player: "enterGame",
  },
  charlotte: true,
  forced: true,
  filter(event, player) {
    return (
      !dzxy.mvp_score_init && (event.name != "phase" || game.phaseNumber == 0)
    );
  },
  content() {
    game.players.forEach((p) => {
      if (!p.dzxy_mvp)
        p.dzxy_mvp = {
          cure: 0,
          help: 0,
        };
    });
    dzxy.mvp_score_init = true;
  },
};
//攻击分数用本体的

//治疗分
lib.skill._mvp_cure = {
  trigger: {
    player: "recoverAfter",
  },
  charlotte: true,
  forced: true,
  content() {
    try {
      if (trigger.source) {
        trigger.source.dzxy_mvp.cure += trigger.num * 3;
      } else if (trigger.player) {
        trigger.player.dzxy_mvp.cure += trigger.num * 3;
      }
    } catch (error) {
      console.error("治疗分计算错误:", error);
    }
  },
};
//辅助分
lib.skill._mvp_help = {
  trigger: {
    player: "gainAfter",
  },
  charlotte: true,
  forced: true,
  content() {
    try {
      let par1 = trigger.getParent("phaseDraw", true);
      let par2 = trigger.getParent("draw", true);
      //给牌
      if (
        trigger.giver &&
        trigger.giver.getFriends().includes(trigger.player)
      ) {
        trigger.giver.dzxy_mvp.help += trigger.cards.length;
      } else if (par1) {
        //摸牌阶段额外摸牌
        par1.player.dzxy_mvp.help += par1.num > 2 ? par1.num - 2 : 0;
      } else if (par2) {
        //其他摸牌
        par2.player.dzxy_mvp.help += par2.num;
      }
    } catch (error) {
      console.error("辅助分计算错误:", error);
    }
  },
};

lib.onover.push(async () => {
  if (_status.lastPhasedPlayer) {
    ui.create.system("mvp", () => { new Mvp().open() });/*●*/
    ui.dialog?.classList.add("dialog-hide");
    ui.control?.classList.add("dialog-hide");
    let time = 0;
    await new Promise((res) => {
      if (_status.skillaudio.length == 0) res();
      setInterval(() => {
        if (_status.skillaudio.length == 0) res();
        time += 100;
        if (time > 3000) res();
      }, 100);
    });
    new Mvp().open();
  }
});
