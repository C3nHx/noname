import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import dzxy from "./Dzxy.js";

window.DPIXICanvas = document.createElement("canvas");
window.DPIXICanvas.id = 'dzxy-pixi-canvas';
document.body.appendChild(window.DPIXICanvas);

let otherPIXI, hasPIXI = false;
if (window.PIXI) {
  otherPIXI = window.PIXI;
  hasPIXI = true;
}
await new Promise((res => {
  lib.init.js(lib.assetURL + 'extension/斗转星移/plugin', 'pixi.min2', res);
}));
await new Promise(res => {
  lib.init.js(lib.assetURL + 'extension/斗转星移/plugin', 'pixi-spine2', res);
});
window.DPIXI = PIXI;
if (hasPIXI) window.PIXI = otherPIXI;

/**
 * 因为启动页需要播放骨骼动画十周年UI还未加载
 * 仿十周年做个对spine的简单应用
 */
class Dspine extends DPIXI.spine.Spine {
  static BUILD_ID = 0;
  constructor(spineData, position) {
    super(spineData);
    this.dzxy_id = Dspine.BUILD_ID++;
    this.initPosition(position);
  }
  initPosition(position = {}) {
    this.dzxy_name = position.filename;
    let defposition = {
      dzxy_x: [0, 0.5],
      dzxy_y: [0, 0.5],
      dzxy_angle: 0,
      dzxy_scale: 1,
      dzxy_speed: 1,
      dzxy_parent: null,
      dzxy_loop: false,
      dzxy_action: this.spineData.animations[0].name,
      dzxy_complete: null,
      dzxy_completed: false,
    }
    Object.assign(this, defposition);
    this.applyPosition(position);
    this.play();
    return this;
  }
  applyPosition(position) {
    if (typeof position == 'object') {
      if (position.x != undefined) this.dzxy_x = position.x;
      if (position.y != undefined) this.dzxy_y = position.y;
      if (position.angle != undefined) this.dzxy_angle = position.angle;
      if (position.scale != undefined) this.dzxy_scale = position.scale;
      if (position.speed != undefined) this.dzxy_speed = position.speed;
      if (position.parent != undefined) this.dzxy_parent = position.parent;
      if (position.loop != undefined) this.dzxy_loop = position.loop;
      if (position.action != undefined) this.dzxy_action = position.action;
      if (position.complete != undefined) this.dzxy_complete = position.complete;
      if (position.flipX != undefined) this.dzxy_flipX = position.flipX;//
      if (position.flipY != undefined) this.dzxy_flipY = position.flipY;//
    }
    return this;
  }
  setAction(action, loop = false) {
    if (this.skeleton.data.findAnimation(action) == null) return console.error("setAction: 未找到对应骨骼动作");
    this.state.setAnimation(0, action, loop);
    return this;
  }
  play(position) {
    this.visible = true;
    this.applyPosition(position);
    this.setAction(this.dzxy_action, this.dzxy_loop);
    this.state.timeScale = this.dzxy_speed;
    this.rotation = this.dzxy_angle;
    this.addListener_complete(this.dzxy_complete);
    dpixi.updata(this);
    return this;
  }
  addListener_complete(func) {
    if (this.dzxy_completed) return false;
    const listener = {
      complete: () => {
        if (typeof func == 'function') func(this);
        this.state.removeListener(listener);
        this.dzxy_completed = false;
      }
    };
    this.state.addListener(listener);
    this.dzxy_completed = true;
    return true;
  }
}

export class Dpixi {
  app;
  /**
   * 
   * @param {*} canvas 传入的画布 可能可以和十周年共用一张播放3.7-4.1？
   */
  constructor(canvas) {
    let app = new DPIXI.Application({
      transparent: true,
      backgroundAlpha: 0,
      resizeTo: window,
      antialias: true,
      view: canvas,
      resolution: window.devicePixelRatio || 1,
    });
    window.addEventListener('resize', dzxy.debounce(() => {
      if (!app || !app.stage) return;
      for (let i of app.stage.children) {
        this.updata(i);
      }
    }, 1000));
    this.app = app;
  }
  updata(spine) {
    let { screen } = this.app;
    let { documentZoom = 1 } = game;
    let { dzxy_x, dzxy_y, dzxy_scale, dzxy_parent } = spine;
    if (dzxy_parent) {
      let rect = dzxy_parent.getBoundingClientRect();
      let [offsetX = 0, ratioX = 0.5] = dzxy_x || [];
      let [offsetY = 0, ratioY = 0.5] = dzxy_y || [];

      spine.x = rect.left + rect.width * ratioX + offsetX;
      spine.y = rect.top + rect.height * ratioY + offsetY;
    }
    else {
      if (Array.isArray(dzxy_x) && dzxy_x.length === 2) {
        spine.x = screen.width * dzxy_x[1] + dzxy_x[0];
      }
      if (Array.isArray(dzxy_y) && dzxy_y.length === 2) {
        spine.y = screen.height * dzxy_y[1] + dzxy_y[0];
      }
    }
    if (dzxy_scale !== undefined) {
      spine.scale.set(dzxy_scale * documentZoom);
    }
    return spine;
  }
  /**
   * 加载spine使用和十周年的一样
   * @param {*} filename 文件路径  主文件夹在斗转星移/animation
   * @param {*} skelType 类型skel或json
   * @param {*} onSuccess 成功执行函数
   * @param {*} onFailure 失败执行函数
   * @returns 
   */
  async loadSpine(filename, skelType = "skel", onSuccess = null, onFailure = null) {
    const type = skelType.toLowerCase();
    const basePath = "extension/斗转星移/animation/";
    const spineResource = {
      alias: filename,
      src: `${basePath}${filename}.${type}`,
    };
    DPIXI.Assets.add(spineResource);
    let resource = await DPIXI.Assets.load(filename);
    if (resource && typeof onSuccess == 'function') {
      onSuccess();
    }
    else if (!resource) {
      if (onFailure && typeof onFailure == 'function') {
        onFailure();
      }
      else console.error('加载失败：' + filename);
    }
    return resource;
  }
  /**
   * 播放spine使用和十周年的一样
   * 如果需要复用，可以保存实例调用play(position)方法
   * @param {*} filename 文件路径  主文件夹在斗转星移/animation
   * @param {*} position 参数设置
   * @returns 
   */
  playSpine(filename, position) {
    let spineParams = { ...position, filename };
    let spineData = DPIXI.Assets.get(filename);
    if (!spineData?.spineData) {
      throw new Error(`Spine数据加载失败: ${filename}`);
    }
    let spine = new Dspine(spineData.spineData, spineParams);
    this.updata(spine);
    this.app.stage.addChild(spine);
    return spine;
  }
  stopSpine(spine) {
    const targetId = spine.dzxy_id ?? spine;
    const targetSpine = this.app.stage.children.find(child => child.dzxy_id == targetId);
    if (targetSpine) {
      targetSpine.visible = false;
      targetSpine.state.setEmptyAnimation(0, 0);
    }
  }
  stopSpineAll() {
    for (let i of this.app.stage.children) {
      i.visible = false;//处理3.6转3.8的
      i.state.setEmptyAnimation(0, 0);
    }
  }
  destroy() {
    let app = this.app;
    app.destroy({
      rendererDestroyOptions: {
        removeView: true,
      },
      children: true,
      texture: true,
      textureSource: true,
      context: true,
    });
  }
}
export let dpixi = new Dpixi(window.DPIXICanvas);

