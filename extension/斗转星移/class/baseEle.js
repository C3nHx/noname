import { lib, game, ui, get, ai, _status } from "../../../noname.js";
/**
 * 在构造函数中
 * constructor(){
 *   super(mainEle)
 * }
 */
export class DEle {
  ele;
  constructor(mainEle) {
    this.ele = mainEle;
    this.ele.source = this;
  }
  setParentNode(parentNode) {
    parentNode.appendChild(this.ele);
  }
}
/**
 * 在构造函数中
 * constructor(){
 *   super(mainEle)
 * }
 */
export class DBtn extends DEle {
  setClick(func) {
    this.ele.addEventListener('click', func);
  }
  active(parentNode, selector) {
    let str = '';
    for (let i of this.ele.classList) {
      str += '.' + i;
    }
    str += '.' + 'active';
    if (selector) str = selector;
    let act = (parentNode || document.body).querySelector(str);
    if (act) act.classList.remove("active");
    this.ele.classList.add("active");
  }
}