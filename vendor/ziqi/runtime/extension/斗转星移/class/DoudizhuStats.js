import { lib, get, game } from "../../../noname.js";

class DoudizhuStats {
  constructor() {
    // 初始化数据结构
    this.statsData = {
      totalGames: 0,                // 总场次
      currentStreak: 0,             // 当前连胜数
      maxStreak: 0,                 // 历史最高连胜
      weeklyMaxStreak: 0,           // 本周内的最高连胜
      lastResetDate: this.getStartOfWeek(new Date()), // 本周统计开始日期
      gameHistory: []               // 游戏历史，用于计算周数据
    };
    
    // 从localStorage加载数据
    this.loadFromLocalStorage();
    // 检查是否需要重置周统计（跨周了）
    this.checkWeekReset();
  }
  
  /**
   * 获取本周的开始日期（周一的0点）
   */
  getStartOfWeek(date) {
    const day = date.getDay() || 7; // 转换为周一为1，周日为7
    const diff = date.getDate() - day + 1;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }
  
  /**
   * 检查是否需要重置周统计（如果当前已不在同一周）
   */
  checkWeekReset() {
    const currentStartOfWeek = this.getStartOfWeek(new Date());
    const lastReset = new Date(this.statsData.lastResetDate);
    
    // 如果已进入新的一周，重置周统计
    if (currentStartOfWeek > lastReset) {
      this.statsData.weeklyMaxStreak = 0;
      this.statsData.lastResetDate = currentStartOfWeek;
      // 清理上周的历史数据
      this.statsData.gameHistory = [];
      this.saveToLocalStorage();
    }
  }
  
  /**
   * 从localStorage加载数据
   */
  loadFromLocalStorage() {
    const savedData = localStorage.getItem('doudizhuStats');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // 合并保存的数据
        this.statsData = { ...this.statsData, ...parsedData };
        
        // 确保日期对象正确解析
        if (this.statsData.lastResetDate) {
          this.statsData.lastResetDate = new Date(this.statsData.lastResetDate);
        }
      } catch (e) {
        console.error('加载斗地主统计数据失败:', e);
        this.resetStats();
      }
    }
  }
  
  /**
   * 将数据保存到localStorage
   */
  saveToLocalStorage() {
    try {
      const dataToSave = { ...this.statsData };
      // 日期对象转换为字符串保存
      dataToSave.lastResetDate = dataToSave.lastResetDate.toISOString();
      localStorage.setItem('doudizhuStats', JSON.stringify(dataToSave));
    } catch (e) {
      console.error('保存斗地主统计数据失败:', e);
    }
  }
  
  /**
   * 记录一场游戏结果
   * @param {boolean} isWin - 是否获胜
   * @param {Date} [date] - 游戏日期，默认为当前日期
   */
  recordGame(isWin, date = new Date()) {
    // 检查是否需要重置周统计
    this.checkWeekReset();
    
    // 增加总场次
    this.statsData.totalGames++;
    
    // 记录游戏结果到历史
    this.statsData.gameHistory.push({
      isWin,
      timestamp: date.toISOString()
    });
    
    // 更新连胜记录
    if (isWin) {
      this.statsData.currentStreak++;
      
      // 更新历史最高连胜
      if (this.statsData.currentStreak > this.statsData.maxStreak) {
        this.statsData.maxStreak = this.statsData.currentStreak;
      }
      
      // 更新本周最高连胜
      if (this.statsData.currentStreak > this.statsData.weeklyMaxStreak) {
        this.statsData.weeklyMaxStreak = this.statsData.currentStreak;
      }
    } else {
      // 输了，重置当前连胜
      this.statsData.currentStreak = 0;
    }
    
    // 保存数据
    this.saveToLocalStorage();
  }
  
  /**
   * 获取统计数据
   * @returns {Object} 统计数据对象
   *    totalGames               // 总场次
      currentStreak            // 当前连胜数
      maxStreak              // 历史最高连胜
      weeklyMaxStreak        // 本周内的最高连胜
   */
  getStats() {
    return {
      totalGames: this.statsData.totalGames,
      currentStreak: this.statsData.currentStreak,
      maxStreak: this.statsData.maxStreak,
      weeklyMaxStreak: this.statsData.weeklyMaxStreak,
      weekStartDate: this.statsData.lastResetDate
    };
  }
  
  /**
   * 打印统计数据
   */
  printStats() {
    const stats = this.getStats();
    const weekStart = new Date(stats.weekStartDate).toLocaleDateString();
    
    console.log(`斗地主统计数据：`);
    console.log(`总场次：${stats.totalGames}`);
    console.log(`当前连胜：${stats.currentStreak}`);
    console.log(`历史最高连胜：${stats.maxStreak}`);
    console.log(`本周（${weekStart}起）最高连胜：${stats.weeklyMaxStreak}`);
  }
  
  /**
   * 重置所有统计数据
   */
  resetStats() {
    this.statsData = {
      totalGames: 0,
      currentStreak: 0,
      maxStreak: 0,
      weeklyMaxStreak: 0,
      lastResetDate: this.getStartOfWeek(new Date()),
      gameHistory: []
    };
    this.saveToLocalStorage();
    console.log('所有统计数据已重置');
  }
  
  /**
   * 单独重置周统计数据
   */
  resetWeeklyStats() {
    this.statsData.weeklyMaxStreak = 0;
    this.statsData.lastResetDate = this.getStartOfWeek(new Date());
    this.statsData.gameHistory = [];
    this.saveToLocalStorage();
    console.log('本周统计数据已重置');
  }
}
let doudizhuStats = new DoudizhuStats();
export default doudizhuStats;
// 示例用法
// const stats = new DoudizhuStats();
// 
// // 模拟一些游戏记录
// stats.recordGame(true);   // 赢，当前连胜1
// stats.recordGame(true);   // 赢，当前连胜2
// stats.recordGame(true);   // 赢，当前连胜3
// stats.recordGame(false);  // 输，当前连胜0
// stats.recordGame(true);   // 赢，当前连胜1
// 
// // 打印统计结果
// stats.printStats();
