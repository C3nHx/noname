佛势力武将边框素材需要自己动手放入其他扩展对应位置。
1.border_zq_fo.png图片文件复制到假装无敌 /images /border_zq_fo.png，用于手杀MVP页面显示。

2.name2_zq_fo.png图片文件需要复制到以下位置：
    ①十周年UI /image /decorations /name2_zq_fo.png，用于手杀武将边框样式中显示佛势力。
    ②手杀ui /character /images /SSSC /name2_zq_fo.png，用于长按弹窗的手杀武将信息中显示佛势力。
    ③无名补丁 /group /name2_zq_fo.png，用于开启选将美化功能后，选将时显示佛势力，但无名补丁扩展还需要添加一点代码才能生效，否则还是显示群，方法：（如果实在不会，可以直接用添加好代码的文件替换无名补丁扩展的同名文件）

        第一步，打开无名补丁扩展的extension.js文件，搜索if(config.xindchoose)就会看的下面代码，加上zq_fo:'zq_fo'(位置如下文)：

if(config.xindchoose){//选将的将框
lib.groupnature={//这里修改控制武将边框的代码。shen的后缀是shen（本体里神的nature是thunder，和晋一样，这里修改后不用再改本体了。给扩展武将加边框，请在下面按格式填写你喜欢的属性，然后在style.css里按例子填写边框样式图片的调用。
    shen:'shen',//素材放到无名补丁/group文件夹里
    wei:'water',
    shu:'soil',
    wu:'wood',
    qun:'metal',
    western:'thunder',
    key:'key',
    jin:'thunder',
    ye:'ye',
    zq_fo:'zq_fo',  //添加到这里
};

        第二步，打开无名补丁扩展的style.css文件，搜索data-nature="keymm"就会看的下面代码：(把下文中的第二段代码复制添加上)

.button.character.newstyle>.identity[data-nature="keymm"]{
	background-image: url('group/key.png') !important;
	background-size: 100% 100% !important;
}
/*这里开始复制*/
.button.character.newstyle>.identity[data-nature="zq_fo"]{ /*添加这一段，用于读取佛势力图片素材*/
	background-image: url('group/name2_zq_fo.png') !important;
	background-size: 100% 100% !important;
}
/*结束复制*/