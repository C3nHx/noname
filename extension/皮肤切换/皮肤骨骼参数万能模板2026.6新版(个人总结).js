//本模板由"大脑过载"收集总结并整理
//1.骨骼文件放在十周年UI/assets/dynamic对应武将皮肤下。文件夹命名方式为武将名称/皮肤名称，例如蔡文姬/以身证道，下面各种参数的武将名称和皮肤名称请根据武将和皮肤自行更换。
//2.骨骼参数在十周年UI/src/skins/dynamicskin.js上面写，注意括号，输入法必须调成英文！输入法必须调成英文！输入法必须调成英文！
//3.骨骼位置调整(x轴y轴,比例scale和角度angle)建议用皮肤切换自带的编辑动皮参数功能，调整好后直接复制参数然后在dynamicskin.js对应位置自行替换。个人意见，皮肤切换若有saveSkinParams.js建议删掉。
//4.若骨骼有黑线可以尝试写上预乘参数alpha: true, //预乘
//5.个人意见，不推荐自动共享，建议删掉自动共享代码，当然你也可以不删
//6.新增（须更新皮肤切换）：ol或十周年动皮出现花屏须加上unpackPremultipliedAlpha: true,alpha: true,
//7.新增（须更新皮肤切换）：json:true和version可以不用写了，现在能自动识别版本
举个例子：
export const dynamicSkinConfig = {

zuoci: {//左慈  //这里写武将名，不知道的在无名杀character文件夹里查询，注意和千幻sanguoskin对应武将名称保持一致
			微妙玄通:{//这里写皮肤名，注意与十周年UI里的dynamic对应动皮名称和千幻sanguoskin静皮对应名称保持一致
				name: '左慈/微妙玄通/xingxiang',
				version:"4.0",
				x: [0,0.48],
				y: [0,0.33],
				scale: 1.2,
				angle: 0,
                //speed: 1,
				beijing: {
					name: '左慈/微妙玄通/beijing',
					version:"4.0",
					scale: 1.2,
					x: [0, 0.48],
					y: [0, 0.33]
				},
			},
			},

};
export function setupDynamicSkin() {
	if (!window.decadeUI) return;

	decadeUI.dynamicSkin = { ...dynamicSkinConfig };

	// 动皮共享
	const dynamicSkinExtend = {
	
        //左慈 左边是你要共享的动皮给的武将，右边是你写好的有动皮的武将，与上面保持一致
        re_zuoci: decadeUI.dynamicSkin.zuoci,
        //把左慈的动皮分享给界左慈
        
};decadeUI.get.extend(decadeUI.dynamicSkin, dynamicSkinExtend);
}

//这里是各服动皮格式，找到骨骼对应的服套模板即可
            皮肤名称:{//手杀骨骼 包括XingXiang,BeiJing,部分有攻击音效的重命名为XingXiang.mp3放在皮肤切换/audio/effect,跟十周年UI/assets/dynamicskin一致的对应武将皮肤位置
				name: '武将名称/皮肤名称/XingXiang',
				x: [0,0.5],
				y: [0,0.5],
				scale: 0.5,
				angle: 0,
                //speed: 1,
				//action: 'DaiJi',
				beijing: {
					name: '武将名称/皮肤名称/BeiJing',
					scale: 0.3,
					x: [0, 0.4],
					y: [0, 0.5]
				},
			},
			
			皮肤名称2: {//十周年普通骨骼 伪动,包括daiji,daiji2,chuchang,beijing
				name: '武将名称/皮肤名称2/daiji2',
				x: [0, 0.5],
				y: [0, 0.5],
				scale: 0.88,
				angle: 0,
                //speed: 1,
                shizhounian: true,
                chuchang: {//回合开始播放
					name: '武将名称/皮肤名称2/chuchang',
					scale: 0.6,
					action: 'play',
				},
				gongji: {//攻击出框
					name: '武将名称/皮肤名称2/chuchang',
					scale: 0.6,
					action: 'play',
				},
				beijing: {
					name: '武将名称/皮肤名称2/beijing',
					x: [0, 0.5],
					y: [0, 0.5],
					scale: 0.4,
				},
			},
			
            皮肤名称3: {//十周年特殊骨骼 真动,带技能和攻击动作，受击和指示线 包括daiji,daiji2,chuchang,chuchang2,beijing,shouji,shouji2
				name: '武将名称/皮肤名称3/daiji2',
				teshu: 'play2',//待机特殊动作，如吕玲绮战场绝版摸腿，
				shan: 'play3',//闪避动作
				x: [0, 0.5],
				y: [0, 0.5],
				scale: 0.88,
				angle: 0,
                //speed: 1,
                shizhounian: true,
                chuchang: {//回合开始播放
					name: '武将名称/皮肤名称3/chuchang',
					action: 'play',
					scale: 0.7,
				},
				gongji: {//攻击出框
					name: '武将名称/皮肤名称3/chuchang2',
					action: 'gongji',
					scale: 0.8,
				},
				teshu: {//技能出框
					name: '武将名称/皮肤名称3/chuchang2',
					action: 'jineng',
					scale: 0.8,
				},
				beijing: {
					name: '武将名称/皮肤名称3/beijing',
					x: [0, 0.5],
					y: [0, 0.5],
					scale: 0.4,
				},
				zhishixian: {
					name: '武将名称/皮肤名称3/shouji2',//指示线
					scale: 0.5,
					speed: 0.8,
					delay: 0.4,
					effect: {
						name: '武将名称/皮肤名称3/shouji',//击中爆炸特效
						scale: 0.65,
						speed: 0.6,
						delay: 0.45,
					},
				},
			},
        
        皮肤名称4:{//ol普通动皮 带json 包括xingxiang,beijing,若不是json格式则去掉json:true,
				name: '武将名称/皮肤名称4/xingxiang',
				version:"4.0",
				json: true,
				x: [0,0.4],
				y: [0,0.5],
				scale: 0.6,
				angle: 0,
                //speed: 1,
				beijing: {
					name: '武将名称/皮肤名称4/beijing',
					version:"4.0",
					json: true,
					scale: 0.48,
					x: [0, 0.5],
					y: [0, 0.5]
				},
			},
			
			
        皮肤名称5:{//ol新版动皮带json 真动,包括前景qianjing,xingxiang,beijing 带前景入场,技能,攻击动作,互动动作，少部分带技能爆炸特效,若不是json则去掉json:true,
				name: '武将名称/皮肤名称5/daiji',
				version:"4.0",
				json: true,
				x: [0,0.51],
				y: [0,0.38],
				scale: 0.84,
				angle: 0,
                //speed: 1,
                qianjing: {//前景
					name: '武将名称/皮肤名称5/qianjing',
					x: [0, 0.5],
					y: [0, 0.5],
					scale: 0.6,
					version: "4.0",
					json: true,
					ss_jinchang: 'ChuChang',
					action: 'DaiJi',
				},
				beijing: {
					name: '武将名称/皮肤名称5/beijing',
					version:"4.0",
					json: true,
					scale: 0.6,
					x: [0, 0.5],
					y: [0, 0.5]
				},
				gongji: {//攻击出框，有就写，没有就不写
					name: '武将名称/皮肤名称5/xingxiang',
					version:"4.0",
					json: true,
					action: 'GongJi',
					scale: 0.8,
				},
				hudong: {//互动出框，目前包括除闪外的响应牌，有就写，没有就不写
					name: '武将名称/皮肤名称5/xingxiang',
					version:"4.0",
					json: true,
					action: 'HuDong',
					scale: 0.8,
				},
				teshu: {//技能出框，有就写，没有就不写
					name: '武将名称/皮肤名称5/xingxiang',
					version:"4.0",
					json: true,
					action: 'JiNeng',
					scale: 0.8,
					whitelist:["武将技能"],//此处写武将技能名，在本体character里自行查找
				},
			},
			
     
        
        皮肤名称7: {//十周年主界面骨骼 一般是zhujiemian_武将名称拼音，骨骼文件名自行修改
				name: '武将名称/皮肤名称7/zhujiemian_wuhuangpusong1',
				version:"4.0",				
				x: [0,0.54],
				y: [0,0.16],
				scale: 0.4,
               //speed: 1,
				beijing: {
					name: '武将名称/皮肤名称7/zhujiemian_wuhuangpusong2',
			     	x: [0,1.27],
				    y: [0,0.37],
				    scale: 0.4,
				},
			},
			
			皮肤名称8:{//欢乐三国杀普通骨骼 包括daiji,beijing.png 骨骼文件名自行修改
				name: '武将名称/皮肤名称8/daiji',
				x: [0,0.58],
				y: [0,0.56],
				scale: 0.3,
                version:"4.0",
                background: '武将名称/皮肤名称8/beijing.png',
			},
			
			皮肤名称8: {//欢乐三国杀特殊骨骼 类似于十周年特殊骨骼（带技能和攻击动作，受击和指示线，指示线有就写）包括daiji,chuchang,chusha,jineng,static_bg.png
				name: '武将名称/皮肤名称8/daiji',				
				x: [0, 0.69],
				y: [0, 0.42],
				scale: 0.45,
				angle: 0,
				version:"4.0",
                //speed: 1,
                shizhounian: true,
                chuchang: {//回合开始播放
					name: '武将名称/皮肤名称8/chuchang',
					version:"4.0",
					scale: 0.6,
				},
				gongji: {//攻击出框
					name: '武将名称/皮肤名称8/chusha',
					version:"4.0",
					scale: 0.6,
				},
				huanshashan: {//闪避特效，类似十周年，没有就不写
					name: '武将名称/皮肤名称8/shanbi',
					version:"4.0",
					scale: 0.6,
				},
				teshu: {//技能出框
					name: '武将名称/皮肤名称8/jineng',
					version:"4.0",
					scale: 0.6,
				},
				zhishixian: {
					name: '武将名称/皮肤名称8/dandao',//指示线,注意version
					version:"3.6",
					json:true,
					scale: 0.5,
					speed: 1,
					effect: {
						name: '武将名称/皮肤名称8/shouji',//击中爆炸特效，注意version
						version:"3.6",
				     	json:true,
						scale: 0.65,
						speed: 0.6,
						delay: 0.45,
					},
				},
				background: '武将名称/皮肤名称8/static_bg.png',				
			},
			
			皮肤名称8: {//欢乐三国杀特殊骨骼 类似于十周年特殊骨骼（带技能和攻击动作，受击和指示线，指示线有就写）包括daiji,chuchang,chusha,jineng(有时候是jineng1),static_bg.png，部分动皮带jineng2
				name: '武将名称/皮肤名称8/daiji',				
				x: [0, 0.69],
				y: [0, 0.42],
				scale: 0.45,
				angle: 0,
				version:"4.0",
                //speed: 1,
                shizhounian: true,
                chuchang: {//回合开始播放
					name: '武将名称/皮肤名称8/chuchang',
					version:"4.0",
					scale: 0.6,
				},
				gongji: {//攻击出框
					name: '武将名称/皮肤名称8/chusha',
					version:"4.0",
					scale: 0.6,
				},
				huanshashan: {//闪避特效，类似十周年，没有就不写
					name: '武将名称/皮肤名称8/shanbi',
					version:"4.0",
					scale: 0.6,
				},
				zhishixian: {
					name: '武将名称/皮肤名称8/dandao',//指示线,注意version
					version:"3.6",
					json:true,
					scale: 0.5,
					speed: 1,
					effect: {
						name: '武将名称/皮肤名称8/shouji',//击中爆炸特效,注意version
						version:"3.6",
				     	json:true,
						scale: 0.65,
						speed: 0.6,
						delay: 0.45,
					},
				},
				special: {//可根据武将技能名写，武将技能名称自行去查
					技能1: {
						name: '武将名称/皮肤名称8/jineng1',
						version:"4.0",
						scale: 0.5,
					},
					技能2: {
						name: '武将名称/皮肤名称8/jineng2',
						version:"4.0",
						scale: 0.5,
					},
					condition: {
						技能名称1: {
						    version:"4.0",
							play: '技能1',
						},
						技能名称2: {
						    version:"4.0",
							play: '技能2',
						},
					},
				},
				background: '武将名称/皮肤名称8/static_bg.png',				
			},
			
			
			
			皮肤名称9:{//微信三国杀新版骨骼 包括XingXiang,ShouJi，lihui 带进场特效。骨骼文件名自行修改，没有受击指示线就不写 从皓月共此皮肤开始chuchang,gongji绑在LiHui里了故补充一下参数
				name: '武将名称/皮肤名称9/CaoCao01_LiHui',
				x: [0,0.61],
				y: [0,0.36],
				scale: 0.2,
				version:"4.0",
				angle: 0,
                //speed: 1,
				//action: 'DaiJi',
				gongji: {
					name: '武将名称/皮肤名称9/CaoCao01_LiHui_XingXiang',
					scale: 0.5,
					action: 'GongJi',
				},
				zhishixian: {//受击爆炸特效，有就写，没有就不写
					name: '武将名称/皮肤名称9/CaoCao01_ShouJi',//指示线
					scale: 0.5,
					speed: 0.8,
					delay: 0.4,
					effect: {
						name: '武将名称/皮肤名称9/CaoCao01_ShouJi',//击中爆炸特效
						scale: 0.5,
						speed: 0.8,
						delay: 0.25,
					},
				},
				background: '武将名称/皮肤名称9/beijing.png',
			},
			
			皮肤名称10:{//极略普通骨骼 主要是json,骨骼文件名自行修改
				name: 'JiLue/武将名称/皮肤名称10/zhugedan_001',
				json: true,
				x: [0,0.54],
				y: [0,0.46],
				scale: 0.38,
				angle: 0,
                //speed: 1,
			},
			
			皮肤名称11:{//极略皮肤骨骼 主要是json,包括role,skill,骨骼文件名自行修改
				name: 'JiLue/武将名称/皮肤名称11/guanyu_001',
				json: true,
				x: [0,0.68],
				y: [0,0.36],
				scale: 0.58,
				angle: 0,
                //speed: 1,
				chuchang: {
					name: 'JiLue/武将名称/皮肤名称11/role',
				    json: true,
				    action: 'in',//播放动作，请自行在皮肤切换查看spine里查看
					scale: 0.45,
				},
				gongji: {
					name: 'JiLue/武将名称/皮肤名称11/role',
				    json: true,
				    action: 'in',//播放动作，请自行在皮肤切换查看spine里查看
					scale: 0.45,
				},	
				special: {//可根据武将技能名写，武将技能名称自行去极略/character里查
					技能1: {
						name: 'JiLue/武将名称/皮肤名称11/skill',
						json: true,
				        action: '465',//播放动作，请自行在皮肤切换查看spine里查看
				     	scale: 1.5,
					},
					condition: {
						技能名称1: {
						    json: true,
							play: '技能1',
						},
					},
				},
			},
			
如果十周年，ol动皮花屏了，可在参数里添加（须更新至最新皮肤切换）
unpackPremultipliedAlpha: true,
alpha: true,
例如
岁稔年丰: {
				name: '张琪瑛/岁稔年丰/daiji2',
				x: [0, 0.5],
				y: [0, 0.35],
				scale: 1.15,
				angle: 0,
                //speed: 1,
                unpackPremultipliedAlpha: true,
				alpha: true,
                shizhounian: true,
                chuchang: {
					name: '张琪瑛/岁稔年丰/chuchang',
					scale: 0.7,
					action: 'play',
				},
				gongji: {
					name: '张琪瑛/岁稔年丰/chuchang',
					scale: 0.9,
					action: 'play',
				},
				beijing: {
					name: '张琪瑛/岁稔年丰/beijing',
					x: [0, 0.5],
					y: [0, 0.5],
					scale: 0.3,
				},
			},
			
			
			
//关于同名异构武将动皮共享，前面为要共享动皮的武将，后面为写了动皮参数的武将
//例如
const dynamicSkinExtend = {
//关羽
        re_guanyu: decadeUI.dynamicSkin.guanyu,//界关羽
        sb_guanyu: decadeUI.dynamicSkin.guanyu,//谋关羽
        ol_sb_guanyu: decadeUI.dynamicSkin.guanyu,//ol谋关羽
}

//动皮专属卡牌音效 代码加在皮肤名称里面，卡牌语音放在对应位置
audio: {
					card: '钟会/潜蛟觊天/audio',//卡牌语音，有就写，没有就不写
					skill: '钟会/潜蛟觊天/audio',//技能语音，一般双形态动皮会用这个
				},

        
//变身情况 变身播放骨骼一般放在皮肤切换/effect/transform下
//限定技 
special: {
					限定技: {
						name: 'baosanniang/凤舞龙翔2',//变身后的武将与皮肤
					},
					condition: {
						xiandingji: {
							transform: "限定技",
							effect: 'juexing_baosanniang',//变身播放骨骼
						},						
					},
				},
	
//觉醒技
special: {
					觉醒技: {
						name: 'zhonghui/潜蛟觊天2',//变身后的武将与皮肤
					},
					condition: {
						juexingji: {
							transform: "觉醒技",
							effect: 'shaohui',//变身播放骨骼
						},
					},
				},	
				
//使命技成功
special: {
					使命成功: {
						name: 'zhonghui/潜蛟觊天2',//变身后的武将与皮肤
					},
					condition: {
						shimingjiSuccess: {
							transform: "使命成功",
							effect: 'shaohui',//变身播放骨骼
						},
					},
				},					
				
//使命技失败
special: {
					使命失败: {
						name: 'zhonghui/潜蛟觊天2',//变身后的武将与皮肤
					},
					condition: {
						shimingjiFail: {
							transform: "使命失败",
							effect: 'shaohui',//变身播放骨骼
						},
					},
				},										
	
//转换技
special:{
					转换技:{
						name:'xuyou/附势而为2',//变身后的武将与皮肤
					},
					condition:{
						zhuanhuanji:{
							transform:'转换技',
							effect:'shaohui',//变身播放骨骼
						},
					},
				},							
        
//击杀变身 主要集中在ol相关动皮
special: {
					击杀: {//此处不写就是不变身
					},
					jisha: {//击杀播放骨骼
						name: 'sp蔡文姬/花好月圆/JiSha',
						x: [0, 0.54],
						version:"4.0",
						scale: 0.9,
						speed: 1,
						delay: 2,
					},
					condition: {
						jisha: {
							transform: "击杀",
							play: 'jisha',
						},
					},
				},        

//低血量变身 主要是十周年动皮半血变身
special: {
					低血量变身: {
						hp: 2,
						name: 'caochun/虎啸龙渊2', //变身后的武将与皮肤
					},
					condition: {
						lowhp: {
							transform: ['低血量变身'],
							recover: false, //恢复体力是否变回去，一般不变回去
						},
					},
				},
				
//使用技能变身 主要是ol动皮				
special: {
					技能: {
						name: 'caoxiancaohua/锦瑟良缘2',
					},
					condition: {				
						liangyuan: {//武将技能名字，在charactar里对应武将包文件夹下自行查
							transform: ['技能'],
							effect: {//变身播放骨骼
								name: 'caoxiancaohua',//变身骨骼名称，在皮肤切换/effect/transform里
								json:'true',//不是json格式就不写
								scale: 0.8,
								speed: 0.7,								
								version: "4.0",
							},														
						},
					},
				},
				
//转换对应势力变身 
special: {
                势力变身: {
                    group: 'wu',//势力名
                    name: 'db_wenyang/破云翔宇2'
                },
                condition: {
                    changeGroup: {
                        transform: "势力变身",
                        effect: 'shaohui',
                        },
                    },
                },				

//回合开始变身                
special: {
                // 回合内形态（一念佛魔2）
                phaseBeginTransform: {
                    name: 'zerong/一念佛魔2', //变身后骨骼
                },
                condition: {
                    // 回合开始变身
                    phaseBegin: {
                        transform: 'phaseBeginTransform',
                       // play: 'transformEffect', // 可选：播放特效
                       // audio: 'phaseBegin_audio' // 可选：播放音效
                    },
                },
            },           
            
//回合结束变身
special: {
                // 回合外形态（一念佛魔）
                phaseEndTransform: {
                    name: 'zerong/一念佛魔', //变身后骨骼
                },
                condition: {
                    // 回合结束变身
                    phaseEnd: {
                        transform: 'phaseEndTransform',
                        //play: 'transformEffect', // 可选：播放特效
                        //audio: 'phaseEnd_audio' // 可选：播放音效
                    },
                },
            },                 

//根据造成伤害量变身
special: {
              造成伤害量: {
                 damage: n,  // 累计造成n(随便多少)点伤害时触发变身
                 name: 'guanyu/圣垂千古2',
              },
              condition: {
                 inflictDamage: {
                       transform: ['造成伤害量'],  // 可以设置多个变身阶段
                       effect: 'shaohui',  // 可选：变身特效
                       // play: 'effectName',  // 可选：播放特效
                       //audio: '语音文件名'  // 可选：播放语音
                 },
              },
          },      