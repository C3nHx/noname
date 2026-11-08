/*一些可能需要的方法*/

//打开主页面
dzxy.Dsplash.openPage();
//打开禁将页面
dzxy.banChar.openPage();
//打开武将页面
dzxy.charPage.open();
//打开皮肤页面
dzxy.skinPage.open();

//可能需要的道具类 具体查看Props

//获取道具数量
dzxy.Props.getCount
//加减道具数量
dzxy.Props.changeCount

//加减道具数量并在右下角弹出提示
dzxy.propToast.addToast

//生成段位图
let gradeImg = new dzxy.GradeImg();
gradeImg.setParentNode('容器');

/*多个结算时*/
//斗地主结算页面延迟播放
//在自己扩展content处写
dzxy.Jiesuan.isModified = true;//表示要修改页面
//然后在合适的地方
dzxy.Jiesuan.resolve();//即可播放
// 例如在游戏结束3秒后才播放
lib.onover.push((result) => {
  setTimeout(() => {
    dzxy.Jiesuan.resolve();
  }, 3000);
});
//2v2排位的同上
dzxy.PWGrade.isModified = true;
dzxy.PWGrade.resolve();