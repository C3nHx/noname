/**
 * @fileoverview Player动态皮肤覆写模块
 * @description 处理玩家动态皮肤的播放、停止和应用
 * @module overrides/player/dynamic-skin
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { DynamicPlayer } from "../../animation/index.js";

/**
 * 播放动态皮肤
 * @description 为玩家播放Spine动态皮肤动画
 * @param {Object|string} animation - 动画配置对象或动画名称
 * @param {string} animation.name - 动画名称
 * @param {string} [animation.action] - 动作名称
 * @param {boolean} [animation.loop=true] - 是否循环
 * @param {number} [animation.loopCount=-1] - 循环次数（-1为无限）
 * @param {number} [animation.speed=1] - 播放速度
 * @param {boolean} [animation.flipX] - X轴翻转
 * @param {boolean} [animation.flipY] - Y轴翻转
 * @param {number} [animation.opacity] - 透明度
 * @param {number|number[]} [animation.x] - X偏移
 * @param {number|number[]} [animation.y] - Y偏移
 * @param {number} [animation.scale] - 缩放
 * @param {number} [animation.angle] - 角度
 * @param {boolean} [animation.alpha] - 是否使用预乘 Alpha
 * @param {boolean} [animation.unpackPremultipliedAlpha] - 是否解包预乘 Alpha 通道
 * @param {string[]} [animation.hideSlots] - 隐藏的插槽
 * @param {string[]} [animation.clipSlots] - 裁剪的插槽
 * @param {boolean} [deputy=false] - 是否为副将动皮
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerPlayDynamic(animation, deputy) {
	deputy = deputy === true;

	if (animation === undefined) {
		return console.error("playDynamic: 参数1不能为空");
	}

	let dynamic = this.dynamic;
	if (!dynamic) {
		dynamic = new DynamicPlayer(window.decadeUIPath + "assets/dynamic/");
		dynamic.dprAdaptive = true;
		this.dynamic = dynamic;
		this.$dynamicWrap.appendChild(dynamic.canvas);
		/*● 修复：检查WebGL是否可用，不可用则回退到静态头像 */
		if (!dynamic.renderer.gl) {
			console.warn("playerPlayDynamic: WebGL不可用，无法播放动态皮肤");
			this.$dynamicWrap.removeChild(dynamic.canvas);
			this.dynamic = undefined;
			return;
		}
	} else {
		/*● 修复：双将换皮时只停当前要替换的那一侧，绝不能误停另一侧。
		  原 else-if 链在"更换副将、且副将当前为空"时会落入 else if (dynamic.primary)，
		  从而把主将动皮一并停掉，导致换副将皮 -> 主将皮消失。 */
		if (deputy) {
			if (dynamic.deputy) {
				dynamic.stop(dynamic.deputy);
				dynamic.deputy = null;
			}
		} else {
			if (dynamic.primary) {
				dynamic.stop(dynamic.primary);
				dynamic.primary = null;
			}
		}
	}

	if (typeof animation === "string") {
		animation = { name: animation };
	}

	if (this.doubleAvatar) {
		animation = adjustDoubleAvatarAnimation(animation, deputy);
	}

	if (this.$dynamicWrap.parentNode !== this) {
		this.appendChild(this.$dynamicWrap);
	}

	dynamic.outcropMask = window.decadeUI?.config?.dynamicSkinOutcrop;

	const avatar = dynamic.play(animation);
	/*● 修复：资源加载失败时回退到静态头像 */
	avatar.onError = () => {
		if (deputy) {
			dynamic.deputy = null;
		} else {
			dynamic.primary = null;
		}
		if (!dynamic.primary && !dynamic.deputy && !dynamic.background) {
			this.classList.remove("d-skin", "d-skin2");
			this.$dynamicWrap.remove();
		} else {
			if (!dynamic.primary) this.classList.remove("d-skin");
			if (!dynamic.deputy) this.classList.remove("d-skin2");
		}
	};

	if (deputy) {
		dynamic.deputy = avatar;
	} else {
		dynamic.primary = avatar;
	}

	this.classList.add(deputy ? "d-skin2" : "d-skin");
}

/**
 * 调整双将模式下的动画配置
 * @param {Object} animation - 原动画配置
 * @param {boolean} deputy - 是否为副将
 * @returns {Object} 调整后的动画配置
 * @private
 */
function adjustDoubleAvatarAnimation(animation, deputy) {
	const result = { ...animation };

	if (Array.isArray(result.x)) {
		result.x = [...result.x];
		result.x[1] += deputy ? 0.25 : -0.25;
	} else {
		if (result.x === undefined) {
			result.x = [0, deputy ? 0.75 : 0.25];
		} else {
			result.x = [result.x, deputy ? 0.25 : -0.25];
		}
	}

	result.clip = {
		x: [0, deputy ? 0.5 : 0],
		y: 0,
		width: [0, 0.5],
		height: [0, 1],
		clipParent: true,
	};

	return result;
}

/**
 * 停止动态皮肤
 * @description 停止玩家的动态皮肤动画
 * @param {boolean} [primary=false] - 是否停止主将动皮
 * @param {boolean} [deputy=false] - 是否停止副将动皮
 * @returns {void}
 * @this {Object} 玩家对象
 * @example
 */
export function playerStopDynamic(primary, deputy) {
	const dynamic = this.dynamic;
	if (!dynamic) {
		/*● 修复：dynamic对象已销毁时，手动移除残留的d-skin类 */
		this.classList.remove("d-skin", "d-skin2");
		return;
	}

	primary = primary === true;
	deputy = deputy === true;

	if (primary && dynamic.primary) {
		dynamic.stop(dynamic.primary);
		dynamic.primary = null;
	} else if (deputy && dynamic.deputy) {
		dynamic.stop(dynamic.deputy);
		dynamic.deputy = null;
	} else if (!primary && !deputy) {
		dynamic.stopAll();
		dynamic.primary = null;
		dynamic.deputy = null;
		dynamic.background = null; /*● 修复：同时清理背景动画引用*/
	}

	if (!dynamic.offscreen && dynamic.renderer) {
		cleanupSkeletonReferences(dynamic.renderer, this);
	}

	if (!dynamic.primary && !dynamic.deputy && !dynamic.background) { /*● 修复：检查背景动画是否也已停止*/
		this.classList.remove("d-skin", "d-skin2");
		this.$dynamicWrap.remove();
		/*● 修复：完全停止后销毁DynamicPlayer释放WebGL context，并减少计数 */
		this.dynamic = undefined;
		if (decadeUI.CUR_DYNAMIC > 0) decadeUI.CUR_DYNAMIC--;
	} else {
		/*● 修复：单独移除已停止的动皮类，避免残留类导致静态头像被隐藏 */
		if (!dynamic.primary) this.classList.remove("d-skin");
		if (!dynamic.deputy) this.classList.remove("d-skin2");
	}
}

/**
 * 清理AnimationPlayer中skeleton对当前玩家的引用
 * @param {AnimationPlayer} renderer - 动画播放器实例
 * @param {Object} player - 玩家对象
 * @private
 */
function cleanupSkeletonReferences(renderer, player) {
	if (!renderer.spine || !renderer.spine.skeletons) return;

	for (const skeleton of renderer.spine.skeletons) {
		if (skeleton.node && skeleton.node.referNode === player) {
			skeleton.completed = true;
			skeleton.node = undefined;
		}
	}
}

/**
 * 应用动态皮肤
 * @description 根据配置自动应用玩家的动态皮肤
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerApplyDynamicSkin() {
	const decadeUI = window.decadeUI;
	if (typeof game.qhly_changeDynamicSkin === "function") {
		if (this.name1) {
			game.qhly_changeDynamicSkin(this, undefined, this.name1, false, true);
		}
		if (this.doubleAvatar && this.name2) {
			game.qhly_changeDynamicSkin(this, undefined, this.name2, true, true);
		}
		return;
	}

	if (!decadeUI?.config?.dynamicSkin || _status.mode === null) {
		return;
	}

	decadeUI.CUR_DYNAMIC ??= 0;
	decadeUI.MAX_DYNAMIC ??= calculateMaxDynamic();

	if (!this.dynamic && decadeUI.CUR_DYNAMIC >= decadeUI.MAX_DYNAMIC) {
		return;
	}

	const dskins = decadeUI.dynamicSkin;
	if (!dskins) return;

	const avatars = this.doubleAvatar && this.name2 ? [this.name1, this.name2] : [this.name1];

	let increased = false;

	avatars.forEach((name, index) => {
		const skins = dskins[name];
		if (!skins) return;

		const skinKeys = Object.keys(skins);
		if (!skinKeys.length) return;

		const skin = skins[skinKeys[0]];
		if (!skin?.name) return;

		const animation = buildAnimationConfig(skin);

		/*● 调整加载顺序：先加载背景，再加载角色动皮，避免角色出现时背景尚未就绪。*/
		let dynamic = this.dynamic;
		if (!dynamic) {
			dynamic = new DynamicPlayer(window.decadeUIPath + "assets/dynamic/");
			dynamic.dprAdaptive = true;
			this.dynamic = dynamic;
			this.$dynamicWrap.appendChild(dynamic.canvas);
			/*● 修复：检查WebGL是否可用，不可用则回退到静态头像 */
			if (!dynamic.renderer.gl) {
				console.warn(`playerApplyDynamicSkin: WebGL不可用，无法显示${name}的动态皮肤`);
				this.$dynamicWrap.removeChild(dynamic.canvas);
				this.dynamic = undefined;
				return;
			}
		}

		/*● 修复：beijing是Spine动画配置对象，应通过DynamicPlayer播放动态背景，而非CSS静态图片*/
		if (skin.beijing) {
			const bgAnimation = buildAnimationConfig(skin.beijing);
			if (dynamic.background) {
				dynamic.stop(dynamic.background);
			}
			dynamic.background = dynamic.play(bgAnimation);
		} else if (typeof skin.background === "string" && skin.background) { /*● 兼容：background为字符串路径时作为静态图片背景*/
			if (dynamic.background) {
				dynamic.stop(dynamic.background);
				dynamic.background = null;
			}
			this.$dynamicWrap.style.backgroundImage = `url("${window.decadeUIPath}assets/dynamic/${skin.background}")`;
		} else {
			if (dynamic.background) { /*● 无背景配置时清理已有背景*/
				dynamic.stop(dynamic.background);
				dynamic.background = null;
			}
			this.$dynamicWrap.style.removeProperty("background-image");
		}

		this.playDynamic(animation, index === 1);

		if (!increased) {
			increased = true;
			decadeUI.CUR_DYNAMIC++;
		}
	});
}

/**
 * 计算最大动皮数量
 * @returns {number} 最大数量
 * @private
 */
function calculateMaxDynamic() {
	const isMobile = window.decadeUI?.isMobile?.() ?? false;
	/*● 修复：降低上限，避免WebGL上下文超限导致动皮无法渲染 */
	const baseCount = isMobile ? 2 : 4;
	return baseCount;
}

/**
 * 构建动画配置
 * @param {Object} skin - 皮肤配置
 * @returns {Object} 动画配置
 * @private
 */
function buildAnimationConfig(skin) {
	const animation = {
		name: skin.name,
		action: skin.action,
		loop: true,
		loopCount: -1,
		speed: skin.speed ?? 1,
		filpX: skin.filpX,
		filpY: skin.filpY,
		opacity: skin.opacity,
		x: skin.x,
		y: skin.y,
		scale: skin.scale,
		angle: skin.angle,
		hideSlots: skin.hideSlots,
		clipSlots: skin.clipSlots,
	};

	if (skin.alpha !== undefined) {
		animation.alpha = skin.alpha;
	}
	if (skin.unpackPremultipliedAlpha !== undefined) {
		animation.unpackPremultipliedAlpha = skin.unpackPremultipliedAlpha;
	}

	if (skin.player || skin._transform !== undefined) {
		animation.player = {
			...(skin.player || {}),
			...(skin._transform !== undefined && { _transform: skin._transform }),
		};
	}

	return animation;
}
