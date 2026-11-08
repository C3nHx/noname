export function createExtensionConfig(lib, game, skinSwitch) {
    return {
        "GXNR": {
            "name": "更新内容",
            "init": "xin",
            "unfrequent": true,
            "item": {
                "xin": "点击查看",
            },
            "textMenu": function (node, link) {
                lib.setScroll(node.parentNode);
                node.parentNode.style.transform = "translateY(-100px)";
                node.parentNode.style.height = "200px";
                node.parentNode.style.width = "320px";
                switch (link) {
                    case "xin":
                        node.innerHTML = "<img style=width:100% src=" + lib.assetURL + "extension/皮肤切换/gengxin/1.06_更新.png>"
                        break;
                }
            },
        },
        "previewDynamic": {
            name: "<div><button onclick='skinSwitch.previewDynamic()'>预览spine动画(资源文件放入asset文件中)</button></div>",
            clear: true
        },
        "resetArchiveDynamicSkin": {
            name: "<button id='resetDynamicBtn' class='engBtn' type='button' onclick='skinSwitch.resetDynamicData()' >重置动皮存档</button>",
            intro: "当你更换的dynamicSkin.js与上一个版本内容差距较大时，需重置",
            clear: true
        },
        "showEditMenu": {
            "name": "编辑动态皮肤加入顶部菜单",
            "init": false,
            "intro": "将编辑动态皮肤参数界面加入顶部菜单栏",
        },
        "showPreviewDynamicMenu": {
            name: "预览spine加入顶部菜单",
            "init": false,
            "intro": "将预览动态皮肤参数界面加入顶部菜单栏",
        },
        "hideHuanFu": {
            name: "隐藏更换动皮按钮",
            "init": false,
            "intro": "如果安装了千幻雷修,可以隐藏更换动皮按钮",
        },
        'useDynamic': {
            name: "使用出框功能",
            "init": true,
            "intro": "如果设备不支持离屏渲染或者使用EngEx或D扩展出框, 请关闭此出框功能",
        },
        'isAttackFlipX': {
            name: "AI出框是否翻转X轴",
            "init": false,
            "intro": "AI在屏幕左侧(中央往左小于50%)出框是否翻转X轴, 也可以在动皮参数处添加参数控制单个动皮的出框翻转",
        },
        'cugDynamicBg': {
            name: "是否裁剪动态背景",
            "init": false,
            "intro": "为了更好的适配动皮露头, 在待机处可以裁剪动态背景",
        },
        'genDynamicSkin': {
            name: "<div><button onclick='skinSwitch.genDynamicSkin()'>转换D动态参数(生成的新文件在扩展文件夹下)</button></div>",
            clear: true
        },
        'genDyTempFile': {
            name: "<div><button onclick='skinSwitch.genDyTempFile()'>自动生成动皮模板参数</button></div>",
            clear: true,
            info: '动皮文件夹结构是 --> 武将中文名(武将id也行)/皮肤名称/骨骼  <--- 形式的话, 可以自动根据当前已填写的参数动态生成动皮模板'
        },
        'previewSkinsDynamic': {
            name: "预览角色使用动皮",
            "init": true,
            "intro": "预览皮肤使用动皮",
        },
        'clickPlayerDynamic': {
            name: "点击角色换肤",
            "init": true,
            "intro": "点击角色弹出换肤功能",
        },
        'showTopArc': {
            name: "显示顶部圆弧",
            "init": true,
            "intro": "是否显示顶部圆弧",
            onchange: function (value) {
                window.showTopArc = value;
                game.players.concat(game.dead).forEach(function (player) {
                    if (player) skinSwitch.skinSwitchCheckYH(player);
                });
            }
        },
        'allowNonCurrentPhaseAttack': {
            name: "允许非当前回合玩家出框攻击",
            "init": false,
            "intro": "开启后，非当前回合玩家使用攻击牌时也会触发出框攻击效果",
        },
    }
}

