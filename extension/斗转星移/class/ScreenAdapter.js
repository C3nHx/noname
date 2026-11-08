import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import dzxy from "./Dzxy.js";
/**自适应屏幕 */
export class ScreenAdapter {
  static list = [];
  /**
   * node:
   * parentNode:
   * scale:
   * callback:
   * @param {*} obj 
   */
  static add(obj = {}) {
    ScreenAdapter.list.push(obj);
    ScreenAdapter.resize2(obj);
  }
  static update() {
    for (let i of ScreenAdapter.list) {
      if (i.update == true) ScreenAdapter.resize2(i);
    }
  }
  static resize2(item) {
    if (!item.node) return;
    let documentZoom = game.documentZoom || 1;
    let parentWidth = item.parentNode?.clientWidth || document.body.clientWidth;
    let parentHeight = item.parentNode?.clientHeight || document.body.clientHeight;
    let childWidth, childHeight;
    if (window.inSplash) {
      childWidth = 1119;
      childHeight = 491;
    } else {
      childWidth = 1243;
      childHeight = 546;
    }
    let scale = Math.min(parentWidth / childWidth, parentHeight / childHeight) * (item.scale || 1);
    if (typeof item.callback == 'function') {
      item.callback(item.node, scale);
    }
  }
  static resize() {
    window.addEventListener('resize', dzxy.debounce(() => {
      for (let i of ScreenAdapter.list) {
        ScreenAdapter.resize2(i);
      }
    }, 700));
  }
}
dzxy.ScreenAdapter = ScreenAdapter;
ScreenAdapter.resize();
lib.arenaReady.push(() => {
  ScreenAdapter.update();
})