import { lib, game, ui, get, ai, _status } from "../../noname.js";
/*
    "#0000": "0000",
*/
let ziqiVoice = {
    //SP周泰
    "#sp_zq_zhoutai/zqdouhun1": "战如熊虎，不惜驱命。",
    "#sp_zq_zhoutai/zqboming1": "还不够！",
    "#sp_zq_zhoutai/zqboming2": "我绝不会倒下！",
    "#sp_zq_zhoutai/zqboming3": "哼，这点小伤算什么？",
    "#sp_zq_zhoutai/zqboming4": "百战之身，奋勇驱前！",
    "#sp_zq_zhoutai/zqjiuzhu1": "两肋插刀，愿赴此躯！",
    //SP刘禅
    "#sp_zq_liushan/zqzhengtong1": "匡扶汉室！",
    "#sp_zq_liushan/zqzhengtong2": "众将军出力！",
    "#sp_zq_liushan/zqzhengtong3": "可放手一搏！",
    "#sp_zq_liushan/zqanle1": "哼～打打杀杀，真没意思。",
    "#sp_zq_liushan/zqanle2": "和平的日子，真美好。",
    "#sp_zq_liushan/zqanle3": "安乐侯，永保安乐，足矣！",
    "#sp_zq_liushan/zqanle4": "木秀于林风必摧之，龙潜于野万事可期。",
    "#sp_zq_liushan/zqguixiang1": "大业于我为浮云，唯愿保全性命于乱世。",
    "#sp_zq_liushan/zqguixiang2": "朕之江山，在午夜，在乐厅，在媚娘酒窝间。",
    "#sp_zq_liushan/zqguixiang3": "若能保全汉室血脉，天下人皆视朕为豕犬又如何？",
    //SP孙权
    "#sp_zq_sunquan/zqchengchen1": "不急一时，且看时局变幻。",
    "#sp_zq_sunquan/zqchengchen2": "思谋成略，方可找到必胜之法。",
    "#sp_zq_sunquan/zqchengchen3": "等待时机，再战不迟。",
    "#sp_zq_sunquan/zqwuwang1": "胸有天下者，必可得其国。",
    "#sp_zq_sunquan/zqwuwang2": "泰然处之，方能大事可成。",
    "#sp_zq_sunquan/zqwuwang3": "聪明仁智，乃孤为君之道。",
    "#sp_zq_sunquan/zqliujian1": "身处巅峰，揽天下大势！",
    "#sp_zq_sunquan/zqliujian2": "位居至尊，掌至高之权。",
    //SP曹操
    "#sp_zq_caocao/zqjiamei1": "孤好梦中杀人！",
    "#sp_zq_caocao/zqjiamei2": "吾有良将在侧，有何惧怕？",
    "#sp_zq_caocao/zqjiamei3": "为谋霸业，小损无妨！",
    "#sp_zq_caocao/zqyixin1": "大胆逆贼！",
    "#sp_zq_caocao/zqyixin2": "吾麾下无人乎？",
    "#sp_zq_caocao/zqyixin3": "展现你们忠心的时候到了。",
    "#sp_zq_caocao/zqyixin4": "良将辅佐，山河长青。",
    "#sp_zq_caocao/zqbaoqi1": "宁叫我负天下人，休叫天下人负我！",
    "#sp_zq_caocao/zqbaoqi2": "奸掠逐鹿原，雄才扫狼烟！",
    "#sp_zq_caocao/zqbaoqi3": "宁我负人，无人负我！",
    //神左慈
    "#zq_shenzuoci/zqhuanhua1": "哼！肉眼凡胎，岂能窥视仙人变幻？",
    "#zq_shenzuoci/zqhuanhua2": "万物苍生，幻化由心。",
    "#zq_shenzuoci/zqhuanhua3": "世间万物，贫道皆可化为其形。",
    "#zq_shenzuoci/zqjinye1": "大成若缺，损亦无妨。",
    "#zq_shenzuoci/zqjiuding1": "吐故纳新，施法天地。",
    "#zq_shenzuoci/zqjiuding21": "尘身土塑，唯魂魄难得。",
    "#zq_shenzuoci/zqtaiqing1": "枯木发荣，朽木逢春。",
    //神诸葛果
    "#zq_shenzhugeguo/zqxiudao1": "祈以七星。",
    "#zq_shenzhugeguo/zqxiudao2": "凤羽飞烟。",
    "#zq_shenzhugeguo/zqxiudao3": "乘化仙尘。",
    "#zq_shenzhugeguo/zqfeisheng1": "我自快意，化入天穹飞逍遥。",
    "#zq_shenzhugeguo/zqxianshu1": "岂无仙术乎？",
    "#zq_shenzhugeguo/zqxianshu2": "此乃仙人之物。",
    //神徐盛
	"#zq_shenxusheng/zqpodi1": "犯大吴疆土者，盛必击而破之！",
	"#zq_shenxusheng/zqpodi2": "若敢来犯，必叫你大败而归！",
	"#zq_shenxusheng/zqyicheng1": "大军在此！汝等休想前进一步！",
	"#zq_shenxusheng/zqyicheng2": "敬请，养精蓄锐！",
    //神曹植
    "#zq_shencaozhi/zqqibu1": "借君一壶酒，七步亦成诗。",
    "#zq_shencaozhi/zqqibu2": "弦急悲声发，聆我慷慨言。",
    "#zq_shencaozhi/zqqibu3": "远眺洛神步，静拾落花情。",
    "#zq_shencaozhi/zqchengshi1": "妙笔趁酒兴，文章竟自成。",
    "#zq_shencaozhi/zqchengshi2": "俯仰各有志，得酒诗自成。",
    "#zq_shencaozhi/zqchengshi3": "千杯何来醉，青词信笔游。",
    //孙悟空
    "#zq_sunwukong/zqhuoyan1": "此处，可有什么妖怪不成？",
    "#zq_sunwukong/zqhuoyan2": "这里山势险峻，只怕藏有妖精。",
    "#zq_sunwukong/zqzhanfo1": "嘿嘿嘿嘿，你们几个打累了吧？该俺老孙耍耍了。诶～",
    "#zq_sunwukong/zqzhanfo2": "一个筋斗云，俺就能十万八千里。",
    "#zq_sunwukong/zqjiubing1": "土地山神，你们都出来见俺！",
    "#zq_sunwukong/zqjiubing2": "风雨雷电四神，快快显身出来！",
    "#zq_sunwukong/zqjiubing3": "俺老孙神通广大，就是玉皇大帝的凌霄宝殿，俺也去坐过。哼哼～",
    //三世佛
    "#zq_sanshifo/zqsanshi1": "普度众生。",
    "#zq_sanshifo/zqsanshi2": "普施善果。",
    "#zq_sanshifo/zqsanshi3": "善恶到头终有报。",
    "#zq_sanshifo/zqsanshi4": "善哉善哉。",
    "#zq_sanshifo/zqsanshi5": "万象轮回。",
    "#zq_sanshifo/zqsanshi6": "无嗔无狂。",
    "#zq_sanshifo/zqsanshi7": "无色无相。",
    "#zq_sanshifo/zqsanshi8": "五蕴皆空。",
    "#zq_sanshifo/zqsanshi9": "悟彻菩提。",
    "#zq_sanshifo/zqsanshi10": "一花一世界，一木一浮生。",
    //赵公明
    "#zq_zhaogongming/zqzhaocai1": "钱？要多少有多少。",
    "#zq_zhaogongming/zqzhaocai2": "钱不是万能的，但没钱是万万不能的。",
    "#zq_zhaogongming/zqzhaobao1": "自古得道者多助。",
    "#zq_zhaogongming/zqzhaobao2": "钱只是手段，从来都不是目的。",
    "#zq_zhaogongming/zqnazhen1": "钱财，乃身外之物。",
    "#zq_zhaogongming/zqlishi1": "拿去花，别客气。",
    "#zq_zhaogongming/zqlishi2": "有钱就是这么任性。",
    "#zq_zhaogongming/zqlishi3": "乐善好施，仗义疏财。",
    "#zq_zhaogongming/zqlishi4": "君子爱财，取之有道。",
    //玉帝
    "#zq_yuhuangdadi/zqjide1": "哈哈哈哈～",
    "#zq_yuhuangdadi/zqzhengdi1": "众卿平身。",
    //月老
    "#zq_yuelao/zqhongxian1": "桃花劫！",
    "#zq_yuelao/zqhongxian2": "桃之夭夭，灼灼其华。",
    "#zq_yuelao/zqhongxian3": "单身，限制了你的想象力。",
    "#zq_yuelao/zqhongxian4": "桃李春风，不如一眼回眸。",
    "#zq_yuelao/zqhongxian5": "花开十里不多，红颜一人正好。",
    "#zq_yuelao/zqhongxian6": "看得穿的叫命运，看不透的是自己。",
    "#zq_yuelao/zqhunbu1": "生命漫长无涯，似桃花片刻凋零。",
    "#zq_yuelao/zqhunbu2": "花开有时，重逢无期。",
    //阎罗王
    "#zq_yanluowang/zqguiwang1": "断骨勾魂，索命归府！",
    "#zq_yanluowang/zqmingti1": "青面獠牙，百毒不侵！",
    "#zq_yanluowang/zqyinbing1": "沉沦吧！在这无边的恐惧！",
    "#zq_yanluowang/zqyinbing2": "我要你三更死，谁敢留你到五更？",
    "#zq_yanluowang/zqyinbing3": "猛鬼食人，择魂而噬！",
    "#zq_yanluowang/zqyinbing4": "进我地府者，为我所管！",
    //杨戬
    "#zq_yangjian/zqxiaotian1": "来这儿，乖狗狗！",
    "#zq_yangjian/zqxiaotian2": "小心点，我的武器长了眼。",
    "#zq_yangjian/zqxuangong1": "将大局逆转吧！",
    "#zq_yangjian/zqxuangong2": "看破根源的奥秘！",
    //太上老君
    "#zq_taishanglaojun/zqdanlu1": "草木精炼，万物化丹。",
    "#zq_taishanglaojun/zqdanlu2": "白日青山，飞升化仙。",
    "#zq_taishanglaojun/zqlianqi1": "炼化妙物，逆者可斩。",
    "#zq_taishanglaojun/zqlianqi2": "炼化之妙，性定而归寂静。",
    "#zq_taishanglaojun/zqlianqi3": "痴人总被仙缘误，一颗凡心锁铜壶。",
    //盘古
    "#zq_pangu/zqkaitian1": "开天辟地，万物新生！",
    "#zq_pangu/zqchuangshi1": "颠倒乾坤！",
    "#zq_pangu/zqchuangshi2": "开辟新生！",
    "#zq_pangu/zqchuangshi3": "破晓未来！",
    "#zq_pangu/zqchuangshi4": "挡我者死！",
    "#zq_pangu/zqchuangshi5": "由神来打破！",
    "#zq_pangu/zqchuangshi6": "啊！！！",
    //女娲
    "#zq_nvwa/zqzaoren1": "黄泥削作骨，吹气以为神。",
    "#zq_nvwa/zqzaoren2": "拓土造人，万物化生。",
    "#zq_nvwa/zqbutian1": "五色蕴华。",
    "#zq_nvwa/zqbutian2": "归于尘！",
    "#zq_nvwa/zqbutian3": "凝五方！",
    "#zq_nvwa/zqbutian4": "百川归位！",
    "#zq_nvwa/zqbutian5": "凝群生之力，再定乾坤！",
    "#zq_nvwa/zqbutian6": "万灵之终，绝非此时！",
    //哪吒
    "#zq_nezha/zqfaxiang1": "手下败将，我正找你呢！",
    "#zq_nezha/zqfaxiang2": "BGM",
    "#zq_nezha/zqfabao1": "混天绫！",
    "#zq_nezha/zqfabao2": "尝尝我的乾坤圈！",
    "#zq_nezha/zqfabao3": "看圈！嘿！",
    "#zq_nezha/zqfabao4": "风火轮！",
    "#zq_nezha/zqfabao5": "哎哎哎，来抓我呀。",
    //雷祖
    "#zq_leishen/zqleizu1": "世间雷霆，皆为我用！",
    "#zq_leishen/zqshandian1": "电闪雷鸣，改天换日！",
    "#zq_leishen/zqshandian2": "雷霆天降，可击四海！",
    "#zq_leishen/zqshandian3": "雷霆之诛，灭军毁城！",
    "#zq_leishen/zqshandian4": "五雷轰顶，碾碎一切！",
    "#zq_leishen/zqsanyan1": "相信人心？我们离那样的世界还太远。",
    //姜子牙
    "#zq_jiangziya/zqchuidiao1": "神明常忘己，亦曾为人也。",
    "#zq_jiangziya/zqchuidiao2": "自为人族，竭尽全力。",
    "#zq_jiangziya/zqchuidiao3": "凡人常以己所不解，强谓之执。",
    "#zq_jiangziya/zqshenbian1": "学会敬畏！",
    "#zq_jiangziya/zqshenbian2": "无妄的挣扎。",
    "#zq_jiangziya/zqtianwang1": "哈！",
    "#zq_jiangziya/zqtianwang2": "呀！",
    "#zq_jiangziya/zqtianwang3": "嘿！",
    "#zq_jiangziya/zqbabu1": "封！",
    "#zq_jiangziya/zqwuyue1": "生生不息！",
};
function zqGetVoice(obj) {
    let result = {};
    for (let key in obj) {
        const value = obj[key];
        let newkey = '';
        if (key.includes(':die')) {
            newkey = `#ext:天庭/audio/die/${key.replace('#', '')}`;
        } else {
            newkey = `#ext:天庭/audio/skill/${key.replace('#', '')}`;
        }
        result[newkey] = value;
    }
    return result;
}
/**
 * 角色台词
 */
const voices = zqGetVoice(ziqiVoice);
export default voices;