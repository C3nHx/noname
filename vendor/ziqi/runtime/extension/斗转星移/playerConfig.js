export default {
  /**
   * 自定义调整露头1
   * 调整没有延迟，但无法访问图片宽高
   * @returns none:不露头；shizhounian：十周年露头；shousha：手杀露头
   * 
   */
  adjustCharLoutou1(img) {
    //图片路径
    const { src } = img;
    /*
    let lastIndex_xg=src.lastIndexOf('/');
    //file武将文件带后缀
    let file=lastIndex_xg!=-1?src.slice(lastIndex_xg + 1):src;
    let lastIndex_d=file.lastIndexOf('.');
    //charID武将ID
    let charID=lastIndex_d!=-1?file.slice(0,lastIndex_d):file;

    //示例 其他需自行配置
    //将在斗转星移扩展下的武将露头类型设置为不露头，不影响该扩展皮肤在千幻的十周年露头
    if (src.startsWith('extension/斗转星移')) return 'none';
    //武将ID为caocao的露头类型设置为手杀露头
    if (charID=='caocao') return 'shousha';
    */
    return null;
  },
  /**
   * 自定义调整露头2
   * 调整有延迟，可以访问图片宽高
   * @returns none:不露头；shizhounian：十周年露头；shousha：手杀露头
   */
  adjustCharLoutou2(img) {
    //图片路径，宽，高
    const { src, imgW, imgH } = img;
    return null;
  }
}