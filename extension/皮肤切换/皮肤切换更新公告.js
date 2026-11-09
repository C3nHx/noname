//工程化完工
//播放方法
// 方式1: 传入特效名称字符串和位置对象
skinSwitch.chukuangWorkerApi.playEffect('特效名称', { 
    parent: element,  // DOM元素，特效会跟随这个元素
    follow: true      // 是否跟随父元素移动(新加的)
})

// 方式2: 传入特效对象和位置对象
skinSwitch.chukuangWorkerApi.playEffect({
    name: '特效名称',
    version: '3.6',  // 可选，默认3.6
}, {
    parent: element,
    x: 0.5, 
    y: 0.5, 
    follow: true
})

// 播放到第二个画布
skinSwitch.chukuangWorkerApi.playEffect2('特效名称', { parent: element })

// 停止指定名称的特效
skinSwitch.chukuangWorkerApi.stopEffect('特效名称')

// 停止指定ID的特效
skinSwitch.chukuangWorkerApi.stopEffect({ name: '特效名称', id: 123 })

// 停止第二个画布的特效
skinSwitch.chukuangWorkerApi.stopEffect2('特效名称')

// 清除指定特效
skinSwitch.chukuangWorkerApi.clearEffect('特效名称')
skinSwitch.chukuangWorkerApi.clearEffect2('特效名称')

// 清除所有特效
skinSwitch.chukuangWorkerApi.clearAllEffects()
skinSwitch.chukuangWorkerApi.clearAllEffects2()


// 方式1: 传入特效名称字符串
skinSwitch.chukuangWorkerApi.preloadEffect('特效名称')

// 方式2: 传入特效对象
skinSwitch.chukuangWorkerApi.preloadEffect({
    name: '../../../皮肤切换/effects/transform/default',
    version: '3.6',  // 可选，默认3.6
    json: false  // 可选，false表示.skel格式，true表示.json格式
})
skinSwitch.chukuangWorkerApi.preloadEffect2('特效名称')
skinSwitch.chukuangWorkerApi.preloadEffect2({
    name: '../../../皮肤切换/effects/transform/default',
    version: '3.6',
    json: false
})


// 方式1: 传入字符串数组
skinSwitch.chukuangWorkerApi.preloadEffects([
    '特效1',
    '特效2',
    '特效3'
])

// 方式2: 传入对象数组
skinSwitch.chukuangWorkerApi.preloadEffects([
    {
        name: '../../../皮肤切换/effects/transform/default',
        version: '3.6',
        json: false
    },
    {
        name: '../../../皮肤切换/effects/transform/huanfu',
        version: '3.6',
        json: false
    }
])

//preloadEffects	批量预加载特效	playEffect
//preloadEffects2	批量预加载特效	playEffect2


//十周年UI动皮参数dynamicskin.js播放新加
daijiteshu: '标签名字',特殊动作;
daijishan: '标签名字',闪动作;
//使用参考
杨柳依依: {
				name: "柳婒/杨柳依依/daiji2",
				daijiteshu: 'play3',
				daijishan: 'play2',
				x: [0, 0.5],
				y: [0, 0.5],
				scale: 0.86,
				shizhounian: true,

usePrimaryPlayerPos: true，让ai出框和自己的位置一样方便谋司马懿的皮肤技能出框
enemyScale: 0.8,默认ai是0.6十周年参数，方便调整一些人调整大小，0.8不一定是写0.8，看自己需求(没办法遇到脑子有问题的了)
//使用参考
teshu: {
					name: '谋司马懿/隐龙如晦/chuchang2',
					action: 'jineng',
					x: [0, 0.489],
					y: [0, 0.471],
					scale: 0.81,
					enemyScale: 0.8,
					usePrimaryPlayerPos: true,
				},

//适配欢杀闪是单独骨骼
//使用参考
huanshashan: {
					name: '曹宪/凌华映阙/shanbi',
					action: "play",
					x: [0, 0.539],
					y: [0, 0.626],
					angle: 0,
					scale: 0.38,
					version: "4.0",
				},
offsetY: -190,调整十周年参数ai出框高度的
//使用参考
chuchang: {
					name: "柏灵筠/芳原罗黛/chuchang",
					x: [0, 0.794],
					y: [0, 0.085],
					scale: 0.97,
					action: "play",
					offsetY: -190,
				},
//修复卡牌语音换皮肤会消失的问题
//修复转换技子技能不能触发的问题
//新加一个开关可以让不是回合的武将皮肤可以触发攻击出框
//修复游戏开始时技能出框不触发的问题的


260122 ck: true - 强制出框（即使 name 与主骨骼相同）
20260131皮肤切换（编辑动皮调整修改跟随参数和节点跟随参数）
260209 皮肤切换_修复转换成伤害牌播放的是攻击的出框的问题
260214 皮肤切换_修复编辑和前景不能调整的问题，新加onlinetrue,用于ol皮肤