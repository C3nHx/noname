import { lib, game, ui, get, ai, _status } from "../../../noname.js";
export class Predzxy {
  create = {
    /**全屏背景 */
    bigBg: (parentNode, imgPath, func) => {
      let bg = ui.create.div('.dz-bigBg', parentNode);
      if (typeof imgPath == 'string') bg.setBackgroundImage(`extension/斗转星移/${imgPath}`);
      else if (typeof imgPath == 'boolean' && imgPath === true) bg.style.backgroundColor = 'RGBA(0, 0, 0, 0.50)';
      if (typeof func == 'function') bg.addEventListener('click', func);
      return bg;
    },
    /**
     * 返回按钮
     * @param {HTMLDivElement} parentNode 父元素
     * @param {Function} func 点击函数
     * @returns 
     */
    back: (parentNode, func) => {
      let back = ui.create.div('.dz-backBtn', parentNode);
      back.addEventListener('click', () => dzxy.playAudio('audio/base/MidButton.mp3'));
      if (typeof func == 'function') back.addEventListener('click', func);
      return back;
    },
    /**
     * 
     * @param {*} parentNode 
     * @param {*} func 函数
     * @param {*} tip 文字提示
     * @param {*} value 默认值
     * @returns 
     */
    input: (parentNode, func, tip, value) => {
      let bg = this.create.bigBg(parentNode, true);
      bg.addEventListener('click', () => { bg.remove() });

      bg.inputFrame = ui.create.div('.dz-inputFrame', bg);
      bg.inputFrame.addEventListener('click', (e) => { e.stopPropagation() });
      bg.input = document.createElement('input');
      bg.input.placeholder = tip || '点击输入';
      if (value && typeof value == 'string') bg.input.value = value;
      bg.inputFrame.appendChild(bg.input);
      bg.input.focus();

      bg.ok = ui.create.div('.inputok', '确定', bg.inputFrame);
      if (typeof func == 'function') {
        bg.ok.addEventListener('click', func.bind(bg));
        bg.input.addEventListener('keydown', function (event) {
          event.stopPropagation();
          if (event.key === 'Enter' || event.keyCode === 13) {
            func.call(bg);
          }
        });
      }
      return bg;
    },
    /**
     * 设置容器 内容区在frame.cont
     * @param {*} parentNode 父元素
     * @param {string} width 设置宽度
     * @param {string} height 设置高度
     * @returns 
     */
    setFrame: (parentNode, width, height) => {
      let frame = ui.create.div('.dz-setFrame.dz-center', parentNode);
      if (width) frame.style.width = width;
      if (height) frame.style.height = height;
      frame.addEventListener("click", (e) => e.stopPropagation());
      frame.cont = ui.create.div(".dz-cont", frame);
      return frame;
    },
    /**
     * 底部条提示
     * @param {string} str 提示文字
     * @param {*} parentNode 父元素
     */
    bottomBarTip: (str, parentNode, delay = 500) => {
      let tip = ui.create.div('.dz-bottomBarTip', str, parentNode);
      tip.style.animation = `bottomBarTipAnim 0.5s both linear ${delay}ms`;
      setTimeout(() => { tip.remove(); }, delay + 1000);
    },
    /**
     * 确定按钮
     * @param {*} parentNode 父元素
     * @param {Function} func 点击函数
     * @returns 
     */
    ok: (parentNode, func) => {
      let ok = ui.create.div('.dz-okBtn', parentNode);
      if (typeof func == 'function') ok.addEventListener('click', func);
      return ok;
    },
    /**
     * 
     * @param {*} str 插入文字
     * @param {*} e 点击事件
     * @param {*} parentNode 
     * @param {*} offsetObj 偏移 {'l:20','r':30}与点击位置的偏移量 提示框在点击左边时左移20px 右边时30px
     * @returns 
     */
    skillTip: (str, e, parentNode, offsetObj = {}) => {
      let tip = ui.create.div('.dz-bigBg.dz-bigBg-skill', parentNode);
      tip.addEventListener('click', function (e) {
        e.stopPropagation();
        if (e.target.tagName != 'A' &&
          !e.target.closest('a') &&
          e.target.tagName != 'NONAME-POPTIP' &&
          !e.target.closest('noname-poptip')
        ) {
          this.remove();
        }
      });
      tip.frame = ui.create.div('.dz-icon-tip', tip);
      tip.frame.innerHTML = str;
      tip.frame.style.maxWidth = '330px';
      tip.frame.style.maxHeight = '180px';
      let allX = tip.clientWidth, allY = tip.clientHeight;
      let eX = e.clientX / game.documentZoom, eY = e.clientY / game.documentZoom;
      if (e.type == 'touchstart') {
        eX = e.touches[0].clientX / game.documentZoom;
        eY = e.touches[0].clientY / game.documentZoom;
      }
      let l = offsetObj.l || 0;
      let r = offsetObj.r || 0;
      let t = offsetObj.t || 0;
      let b = offsetObj.b || 0;
      // eX<allX/2?tip.frame.style.left=eX+l+'px':tip.frame.style.right=allX-eX+r+'px';
      // eY<allY/2?tip.frame.style.top=eY+t+'px':tip.frame.style.bottom=allY-eY+b+'px';
      //尽量靠左
      eX > (330 + l) ? tip.frame.style.right = allX - eX + l + 'px' : tip.frame.style.left = eX + r + 'px';
      eY < allY / 2 ? tip.frame.style.top = eY + b + 'px' : tip.frame.style.bottom = allY - eY + t + 'px';
      return tip;
    },
    /**
     * 勾选按钮
     * @param {boolean} bool 默认值
     * @param {*} parentNode 父节点
     * @param {Function} call 两个参数(bool,event)，因为基本类型更改不了，要在回调函数中手动更改
     * @returns 
     */
    checkbtn: (bool, parentNode, call) => {
      if (bool !== true) bool = false;
      let btn = ui.create.div(bool ? '.dz-checkbtn.active' : '.dz-checkbtn', parentNode);
      if (typeof call == "function") {
        btn.addEventListener('click', (event) => {
          btn.classList.toggle('active');
          bool = !bool;
          call(bool, event);
        });
      }
      return btn;
    },
    dialog: (parentNode) => {
      let freme = ui.create.div('.dz-dialog', parentNode);
      freme.cont = ui.create.div('.dz-fcont', freme);
      freme.titlex = ui.create.div('.dz-ftitle', freme);
      return freme;
    }
  };
}