"use strict";

/**
 * @fileoverview 动态皮肤配置模块
 */
 var bianshenhp = 2;
import { lib, game, ui, get, ai, _status } from "noname";

/**
 * @type {Object.<string, Object>}
 * @description 动态皮肤配置表，按武将名和皮肤名组织
 */
export const dynamicSkinConfig = {
    	caocao: {//曹操
			雄吞天下:{
				name: '曹操/雄吞天下/XingXiang',
				x: [0,0.11],
				y: [0,0.15],
				scale: 0.62,
				angle: 0,
                speed: 1,
				action: 'DaiJi',
				beijing: {
					name: '曹操/雄吞天下/BeiJing',
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5]
				},
			},
    	},

        caozhi: {//曹植
			七步绝章: {
				name: '曹植/七步绝章/daiji2',
				x: [0, 0.3],
				y: [0, 0.5],
				scale: 0.9,
				angle: 0,
                shizhounian: true,
                chuchang: {
					name: '曹植/七步绝章/chuchang',
					scale: 0.55,
					action: 'play',
				},
				gongji: {
					name: '曹植/七步绝章/chuchang',
					scale: 0.7,
					action: 'play',
				},
				beijing: {
					name: '曹植/七步绝章/beijing',
					x: [0, -0.5],
					y: [0, 0.5],
					scale: 0.4,
				},
			},
        },

        liushan: {//刘禅
			虚拟天团: {
				name: '刘禅/虚拟天团/daiji2',
				x: [0, 0.47],
				y: [0, 0.38],
				scale: 1,
				angle: -15,
                shizhounian: true,
                chuchang: {
					name: '刘禅/虚拟天团/chuchang',
					scale: 0.6,
					action: 'play',
				},
				gongji: {
					name: '刘禅/虚拟天团/chuchang',
					scale: 0.8,
					action: 'play',
				},
				beijing: {
					name: '刘禅/虚拟天团/beijing',
					x: [0, 0.5],
					y: [0, 0.5],
					scale: 0.3,
					angle: -15,
				},
			},
        },

        sunquan: {//孙权
			吴王六剑:{
				name: '孙权/吴王六剑/XingXiang',
				x: [0,0.5],
				y: [0,0.2],
				scale: 0.48,
				angle: 0,
                speed: 1,
				action: 'DaiJi',
				beijing: {
					name: '孙权/吴王六剑/BeiJing',
					scale: 0.25,
					x: [0, 0.4],
					y: [0, 0.5]
				},
			},
        },

        sunce: {//孙策
            傲凌绝顶:{
                name: '孙策/傲凌绝顶3/XingXiang_2',
                x: [0,0.1],
                y: [0,0.5],
                scale: 0.35,
                speed: 1,
				action: 'DaiJi',
                beijing: {
                    name: '孙策/傲凌绝顶3/BeiJing_2',
                    x: [0, 0.4],
                    y: [0, 0.5],
                    scale: 0.2,
                },
            },
        },

        zuoci: {//左慈
			役使鬼神:{
				name: '左慈/役使鬼神/XingXiang',
				x: [0,0.98],
				y: [0,0.00],
				scale: 0.7,
				angle: 20,
                speed: 1,
				action: 'DaiJi',
				beijing: {
					name: '左慈/役使鬼神/BeiJing',
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5]
				},
			},
        },

};

/**
 * 设置动态皮肤模块
 * @returns {void}
 */
export function setupDynamicSkin() {
	if (!window.decadeUI) return;

	decadeUI.dynamicSkin = { ...dynamicSkinConfig };

	// 动皮共享
	const dynamicSkinExtend = {

        //曹操
        re_caocao: decadeUI.dynamicSkin.caocao,
        sb_caocao: decadeUI.dynamicSkin.caocao,
        wechat_caocao: decadeUI.dynamicSkin.caocao,
        wechat_re_caocao: decadeUI.dynamicSkin.caocao,
        dc_caocao: decadeUI.dynamicSkin.caocao,
        old_caocao: decadeUI.dynamicSkin.caocao,
        tw_caocao: decadeUI.dynamicSkin.caocao,
        jd_sb_caocao: decadeUI.dynamicSkin.caocao,
        yj_caocao: decadeUI.dynamicSkin.caocao,
        jsrg_caocao: decadeUI.dynamicSkin.caocao,
        yxs_caocao: decadeUI.dynamicSkin.caocao,

        //曹植
        re_caozhi: decadeUI.dynamicSkin.caozhi,
        dc_caozhi: decadeUI.dynamicSkin.caozhi,
        wechat_caozhi: decadeUI.dynamicSkin.caozhi,
        ps_caozhi: decadeUI.dynamicSkin.caozhi,

        //刘禅
        ol_liushan: decadeUI.dynamicSkin.liushan,
        re_liushan: decadeUI.dynamicSkin.liushan,

        //孙权
        re_sunquan: decadeUI.dynamicSkin.sunquan,
        sb_sunquan: decadeUI.dynamicSkin.sunquan,
        re_sunquan: decadeUI.dynamicSkin.sunquan,
        dc_sunquan: decadeUI.dynamicSkin.sunquan,
        xin_sunquan: decadeUI.dynamicSkin.sunquan,
        ty_sunquan: decadeUI.dynamicSkin.sunquan,
        jd_sb_sunquan: decadeUI.dynamicSkin.sunquan,
        shen_sunquan: decadeUI.dynamicSkin.sunquan,
        junk_sunquan: decadeUI.dynamicSkin.sunquan,

        //孙策
        re_sunce: decadeUI.dynamicSkin.sunce,
        re_sunben: decadeUI.dynamicSkin.sunce,
        sb_sunce: decadeUI.dynamicSkin.sunce,
		sp_sunce: decadeUI.dynamicSkin.sunce,
		dc_sunce: decadeUI.dynamicSkin.sunce,
		jsrg_sunce: decadeUI.dynamicSkin.sunce,
		old_shen_sunce: decadeUI.dynamicSkin.shen_sunce,

        //左慈
        re_zuoci: decadeUI.dynamicSkin.zuoci,
		old_zuoci: decadeUI.dynamicSkin.zuoci,
		ns_zuoci: decadeUI.dynamicSkin.zuoci,

	};

	decadeUI.get.extend(decadeUI.dynamicSkin, dynamicSkinExtend);
}