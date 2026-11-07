import { lib, game, ui, get, ai, _status } from "../../noname.js";
import dzxy from "./class/Dzxy.js";
import { banChar } from "./class/Banchar.js";
import { ChooseChar_mod } from "./class/ChooseChar_mod.js";
import { ChooseChar } from "./class/ChooseChar.js";
import { PWGrade, GradeImg } from "./class/PWGrade.js";
import { Other } from "./class/other.js";
import { charPage, skinPage } from "./class/Char_skin.js";
import { Dsplash } from "./class/Dsplash.js";
import { Character3 } from "./class/Mvp.js"
//自用
// import { personalModule } from "./personalModule/ext.js";


game.import("extension",function(){return {name:"斗转星移",content:function(config,pack){
  Other.addSkill();
  banChar.checkReload();
  ChooseChar_mod.modify();
  PWGrade.addSkill();
  PWGrade.pushGameOver();

  dzxy.Jiesuan.isModified = true;
  dzxy.PWGrade.isModified = true;
  if (!lib.config.extension_斗转星移_backupBancharData && lib.config.new_tutorial) { dzxy.backupBancharData(); game.saveConfig("extension_斗转星移_backupBancharData", true) }/*●*/
},prepare:function(){
  banChar.modCharPack();
},precontent:function(){
  delete lib.extensionMenu['extension_斗转星移'].edit;/*●*/
  dzxy.updateVersion();
  dzxy.preloadImages();
  dzxy.importCSS();
  dzxy.importJS();
  dzxy.initData();

  ChooseChar.initRecentChseChar();

  PWGrade.importCSS();
  PWGrade.initData();
  GradeImg.loadTX();
  
  Other.subscribe();
  // game.saveConfig("show_splash", "init");
  //自用
  // personalModule.start();
},config:{
  
  //lib.config[`${dzxy.dz}`]

  /**
   * 禁将功能
   */
  "lineSeparator1": {
    name: '<div class="dz-menu-lineSeparator">禁将功能</div>',
    intro: "",
    clear: true,
  },
  "autoOpenPack": {
    "name": "开启禁将(点击方案一上方的设置,选游戏模式才生效)",
    "init": true,
    "intro": "禁用除联机模式之外的武将，需要在禁将面板中点击“方案一”上方的绿色设置按钮,选择游戏模式才可生效，此开关会导致在本体开启或关闭武将包失效",/*●*/
  },
  "addBanCharToTopMenu": {
    "name": "将禁将加入顶部菜单栏",
    "init": true,
    "intro": "将禁将加入顶部菜单栏",
  },
  "banCharGroupColor": {
    "name": "禁将势力颜色",
    "init": false,
    "intro": "开启禁将势力颜色划分",
  },
  "xiaotouxiang": {
    "name": "手杀小头像读取",
    "intro": `禁将界面显示手杀样式小头像(需要手动往扩展内image/char补充素材)`,
    "init": false,
  },

  /**
   * 选将美化功能
   */
  "lineSeparator2": {
    name: '<div class="dz-menu-lineSeparator">选将美化</div>',
    intro: "",
    clear: true,
  },
  "chooseChar_identity": {
    "name": "身份场美化",
    "init": true,/*●*/
  },
  "chooseChar_versus": {
    "name": "对决-欢乐美化",
    "init": true,/*●*/
  },
  "PWsettlement": {
    "name": "对决-排位结算动画",
    "init": true,/*●*/
  },
  "PWOptimization": {
    "name": "对决-排位布局优化",
    "init": true,/*●*/
    "intro": "排位布局优化及查看队友手牌，需要开启对决选将美化并且仅在十周年ui手杀样式下生效",
  },
  "chooseChar_doudizhu": {
    "name": "斗地主-欢乐美化",
    "init": true,/*●*/
  },
  "settlement_doudizhu": {
    "name": "斗地主-结算动画",
    "init": true,
  },
  "aiForcedToRob": {
    "name": "斗地主-欢乐AI必抢地主",
    "init": false,
  },
  "recentCharFreq": {
    "name": "自由选将最近武将的变动频率",
    "init": "50",
    "intro": "数字越小排在前面的武将变动频率越高",
    "item": {
      "1": "1",
      "10": "10",
      "30": "30",
      "50": "50",
      "70": "70",
      "100": "100",
    },
  },
  /**
   * ●排位功能
   */
  /*"lineSeparator4": {
    name: '<div class="dz-menu-lineSeparator">排位功能</div>',
    intro: "",
    clear: true,
  },*/
  /*"PWhideDialog": {
    "name": "隐藏游戏结算框",
    "init": false,
  },*/
  // "loutouStyle":{
  //   "name":"露头样式",
  //   "init":"shizhounian",
  //   "item":{
  //     "yuanhua": "原画",
  //     "shizhounian": "十周年",
  //     "shousha": "手杀",
  //   },
  // },
  // "originLoutou":{
  //   "name":"原画露头样式",
  //   "init":"none",
  //   "item":{
  //     "none": "无",
  //     "shizhounian": "十周年",
  //     "shousha": "手杀",
  //   },
  // },
  // "skinLoutou":{
  //   "name":"皮肤露头样式",
  //   "init":"none",
  //   "item":{
  //     "none": "无",
  //     "shizhounian": "十周年",
  //     "shousha": "手杀",
  //   },
  // },
  // "gameloutou":{
  //   "name":"将此扩展露头应用到对局",
  //   "init": false,
  // },
  "lineSeparator3": {
    name: '<div class="dz-menu-lineSeparator">露头功能</div>',
    intro: "",
    clear: true,
  },
  "smartLoutou": {
    "name": "智能露头",
    "init": "all",
    "item": {
      "dzxy": "仅此扩展",
      "all": "此扩展与局内武将",
      "off": "关闭",
    },
    "intro": "自动将武将图调整到合适状态(并不一定准确)",
  },
  "smartLoutou_init": {
    "name": "智能露头-初始露头",
    "init": "none",
    "item": {
      "none": "无",
      "shizhounian": "十周年",
      "shousha": "手杀",
    },
    "intro": "设置为你当前大部分武将的露头样式即可",
  },
  "smartLoutou_back": {
    "name": "智能露头-背景露头",
    "init": "none",
    "item": {
      "none": "无",
      "shizhounian": "十周年",
      "shousha": "手杀",
    },
    "intro": "设置为武将底图(没原画显示的小黑)露头样式即可，建议使用手杀的底图露头",
  },
  "skinLoutou": {
    name: "皮肤露头样式",
    init: "none",
    item: {
      "none": "无",
      "shizhounian": "十周年",
      "shousha": "手杀",
    },
  },
  "qianhuanSkinDir": {
    name: "千幻皮肤目录",
    init: "sanguoskin",
    item: {
      "sanguoskin": "sanguoskin",
      "sanguolutouskin": "sanguolutouskin",
    },
  },
  "lineSeparator5": {
    name: '<div class="dz-menu-lineSeparator">武将和皮肤页面</div>',
    intro: "",
    clear: true,
  },
  "charInfoPage": {
    "name": "武将信息页面",
    "init": "qianhuan",/*●*/
    "item": {
      "default": "默认",
      "qianhuan": "千幻聆音",
    },
  },
  "chooseCharNoSkin": {
    "name": "选将界面使用原皮肤",
    "init": true,/*●*/
  },
  "delSkinTip": {
    "name": "删除皮肤时需再次确定",
    "init": true,
    intro: "开启后点击<删除皮肤>会弹出一个确认框，关闭后点击<删除皮肤>就会立刻删除",
  },
  "addSkinToTopMenu": {
    "name": "将皮肤页面加入顶部菜单栏",
    "init": false,
  },
  "taiciDanmu": {
    "name": "台词弹幕",
    "intro": "此扩展播放的台词时上方会出现弹幕",
    "init": false,/*●*/
  },
  /*●全部移动到底部*/
  "openDsplashPage": {
    name: '<button class="dz-menu-config-btn">打开启动页</button>',
    clear: true,
    onclick() {
      Dsplash.openPage();
    }
  },
  "openBancharpage": {
    name: '<button class="dz-menu-config-btn">打开禁将页面</button>',
    clear: true,
    onclick() {
      banChar.openPage();
    }
  },
  "backupBancharData": {
    name: '<button class="dz-menu-config-btn">点击备份所有模式禁将数据</button>',
    clear: true,
    onclick() { dzxy.backupBancharData() }
  },
  /*启动页中有
  "openCharPage": {
    name: '<button class="dz-menu-config-btn">打开武将页面</button>',
    clear: true,
    onclick() {
      charPage.open();
    }
  },
  "openSkinPage": {
    name: '<button class="dz-menu-config-btn">打开皮肤页面</button>',
    clear: true,
    onclick() {
      skinPage.open();
    }
  },
  "splashMod": {
    "name": "启动页修改",
    "init": false,
    "intro": "设置在【本体菜单-选项-外观-启动页】",
    onclick(item) {
      this.classList.remove('on');
      alert('请在【本体菜单-选项-外观-启动页】进行设置');
    },
  },*/
},help:{

},package:{
  character: {
    character: {
    },
    translate: {
    },
  },
  card: {
    card: {
    },
    translate: {
    },
    list: [],
  },
  skill: {
    skill: {
    },
    translate: {
    },
  },
  intro: (function () {
    let str = '';
    let list = [
      ['版本号：' + (lib.config[`extension_斗转星移_version`] || '未知')],
      ['注意：启用禁将功能后所有模式的禁用武将都将直接更改，首次使用请注意备份好游戏数据', 'color:red;font-size:14px;'],
      ['启动页修改功能请在【本体菜单-选项-外观-启动页】进行设置'],/*●*/
      ['感谢流年,虹色百合,守缺的禁将思路及代码改善;' +
        '某个不为人知的萌新提供的武将小头像功能;' +
        '寰宇星城,西瓜以及各扩展的调用和参考;' +
        '各玩家的bug反馈'
      ],
    ];
    for (let i of list) {
      if (i.length == 1) str += `<span>•${i[0]}<br></span>`;
      else str += `<span style="${i[1]}">•${i[0]}<br></span>`;
    }
    return str;
  })(),
  author: "星鲨（子琪懒人包版）",/*●*/
  diskURL: "",
  forumURL: "",
  version: "1.0",
},files:{"character":[],"card":[],"skill":[],"audio":[]}}
});
