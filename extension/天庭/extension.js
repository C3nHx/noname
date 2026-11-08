import { lib, game, ui, get, ai, _status } from '../../noname.js';

let voices = {};
try {
    const zqVoicesModule = await import('./voices.js');
    voices = (zqVoicesModule && zqVoicesModule.default) || {};
} catch (e) {
    console.warn('《天庭》扩展未找到 voices.js，已跳过语音文本配置。', e);
}

//●●联机资源同步
//房主在客机连入房间时，把本扩展 audio、character 两个文件夹里的音频/图片直接下发到客机设备，使没有安装《天庭》的客机也能正常显示武将图、播放语音。其他文件夹不下发。
const zqSyncPath = 'extension/天庭/';
const zqSyncDirs = ['character'];
//相对 zqSyncPath 的路径，这些目录不下发（character 下的 characters 子文件夹不同步）
const zqSyncExclude = ['character/characters'];
//★ 同步资源限制：单个本地文件不得超过 400KB，且只允许 jpg / jpeg / png / webp / mp3
//  防止误传超大图片或无关文件，避免客机写盘、解码时卡顿
const ZQ_SYNC_MAX_SIZE = 400 * 1024;
const ZQ_SYNC_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'mp3'];
function zqIsSyncable(rel) {
    const ext = String(rel || '').split('.').pop().toLowerCase();
    return ZQ_SYNC_EXTS.indexOf(ext) >= 0;
}

//主机端：二进制转 base64
//分片编码并在片与片之间主动让出主线程，避免单张大图一次性占用主线程造成卡顿
async function zqU8ToBase64(u8, zqYield) {
    const step = 3 * 0x4000; //每片字节数取 3 的倍数，保证分片 base64 拼接后与整体编码结果一致
    let out = '';
    let last = Date.now();
    for (let i = 0; i < u8.length; i += step) {
        const part = u8.subarray(i, i + step);
        let binary = '';
        for (let j = 0; j < part.length; j += 0x8000) {
            binary += String.fromCharCode.apply(null, part.subarray(j, j + 0x8000));
        }
        out += btoa(binary);
        if (zqYield && Date.now() - last > 6) {
            await zqYield();
            last = Date.now();
        }
    }
    return out;
}

//主机端：递归枚举目录下所有文件
async function zqGetAllFiles(dir) {
    const [folders, files] = await game.promises.getFileList(dir);
    //★ 只把允许的格式加入同步清单（后缀不符的直接跳过，不下发也不上报）
    let list = files.filter(zqIsSyncable).map(function (f) { return dir + '/' + f; });
    for (const d of folders) {
        const sub = dir + '/' + d;
        if (zqSyncExclude.indexOf(sub.slice(zqSyncPath.length)) >= 0) continue;
        list = list.concat(await zqGetAllFiles(sub));
    }
    return list;
}

//客机端执行的写入函数：只能使用自身参数与全局 lib/game/ui，不能引用主机端闭包变量
//每写完一个文件主动让出主线程，写盘期间也能处理房主同步期间发来的「游戏开始」等联机消息
const zqWriteFiles = (files, done, total, finish) => {
    if (typeof game.writeFile !== 'function' || !game.promises || typeof game.promises.writeFile !== 'function') return;
    const run = async () => {
        try {
            for (let i = 0; i < files.length; i++) {
                const rel = files[i][0];
                //★ 客机侧兜底：只接收 jpg / jpeg / png / webp / mp3，且单个不超过 400KB
                //  （房主旧版可能没做过滤，这里再拦一次，避免写入超大/无关文件）
                const zqExt = String(rel || '').split('.').pop().toLowerCase();
                if (!/^(jpg|jpeg|png|webp|mp3)$/.test(zqExt)) continue;
                try {
                    const bin = atob(files[i][1]);
                    const len = bin.length;
                    if (len > 400 * 1024) continue; //★ 超过 400KB 的文件不同步
                    const buffer = new ArrayBuffer(len);
                    const bytes = new Uint8Array(buffer);
                    for (let j = 0; j < len; j++) bytes[j] = bin.charCodeAt(j);
                    const parts = ('天庭/' + rel).split('/');
                    const name = parts.pop();
                    const dir = 'extension/' + parts.join('/');
                    if (typeof game.promises.checkFile === 'function' && (await game.promises.checkFile(dir + '/' + name)) === 1) continue;
                    await game.promises.writeFile(buffer, dir, name);
                } catch (e) {
                    console.log('天庭资源同步失败：' + rel, e);
                }
                //每写完一个文件让出主线程，避免连续写盘长时间占用主线程
                await new Promise(function (r) { setTimeout(r, 0); });
            }
            try { if (typeof game.__zqSyncTip === 'function') game.__zqSyncTip((done || 0) + files.length, total); } catch (e) { }
        } catch (e) { }
    };
    //各批文件走同一条队列串行写入，避免多批写入并发交错
    game.__zqWriteQueue = (game.__zqWriteQueue || Promise.resolve()).then(run);
    if (finish) {
        //等队列里所有文件都真正写完（包括最后一批）后再刷新武将图，
        //否则会出现图片还没落盘就刷新、个别武将图缺失的情况
        game.__zqWriteQueue.then(function () {
            setTimeout(function () {
                try { if (typeof game.__zqSyncTip === 'function') game.__zqSyncTip(1, 1); } catch (e) { }
                if (typeof game.__zqSyncRefresh === 'function') game.__zqSyncRefresh();
            }, 500);
        });
    }
};

//客机端执行的初始化函数：客机进入房间后检查缺失素材并在后台回报主机
//传输图片时带进度提示，传完后游戏内自动更新显示
const zqInitSync = (list) => {
    //悬浮同步进度提示
    if (typeof game.__zqSyncTip !== 'function') {
        game.__zqSyncTip = function (done, total) {
            try {
                if (!total) return;
                if (!ui.__zqSyncTip) {
                    ui.__zqSyncTip = ui.create.div('.resourceTip', '天庭资源同步中…', ui.window, {
                        color: 'yellow', zIndex: '10000', bottom: '0%', left: '0', width: '100%',
                        textAlign: 'center', position: 'absolute', fontSize: '16px', pointerEvents: 'none'
                    });
                }
                if (done < total) {
                    ui.__zqSyncTip.innerHTML = '天庭资源同步中…' + Math.round(100 * done / total) + '%';
                } else {
                    ui.__zqSyncTip.innerHTML = '天庭资源同步完成！';
                    setTimeout(function () {
                        try {
                            ui.__zqSyncTip.remove();
                            delete ui.__zqSyncTip;
                        } catch (e) { }
                    }, 3000);
                }
            } catch (e) { }
        };
    }
    //图片写入完成后，强制重新读取本地文件刷新武将图（无需重启）
    if (typeof game.__zqSyncRefresh !== 'function') {
        game.__zqSyncRefresh = function () {
            try {
                const players = [].concat(game.players || [], game.dead || []);
                //第一步：先清空背景。因为重复设置同一个图片地址不会触发浏览器重新加载，
                //必须先置为 none 让样式发生变更，才能真正重新读取刚写入的本地文件。
                for (const p of players) {
                    if (!p || !p.node) continue;
                    try {
                        const a = p.node.avatar;
                        if (a && a.style && a.style.backgroundImage && a.style.backgroundImage !== 'none') a.style.backgroundImage = 'none';
                    } catch (e) { }
                    try {
                        const a2 = p.node.avatar2;
                        if (a2 && a2.style && a2.style.backgroundImage && a2.style.backgroundImage !== 'none') a2.style.backgroundImage = 'none';
                    } catch (e) { }
                }
                try {
                    if (ui.fakeme && ui.fakeme.style && ui.fakeme.style.backgroundImage && ui.fakeme.style.backgroundImage !== 'none') ui.fakeme.style.backgroundImage = 'none';
                } catch (e) { }
                //第二步：下一帧再重新设置武将图（用真实武将名 name1/name2，隐藏武将时 p.name 会是 unknown）
                setTimeout(function () {
                    for (const p of [].concat(game.players || [], game.dead || [])) {
                        if (!p || !p.node) continue;
                        try {
                            if (p.name1 && p.node.avatar && typeof p.node.avatar.setBackground === 'function') p.node.avatar.setBackground(p.name1, 'character');
                        } catch (e) { }
                        try {
                            if (p.name2 && p.node.avatar2 && typeof p.node.avatar2.setBackground === 'function') p.node.avatar2.setBackground(p.name2, 'character');
                        } catch (e) { }
                    }
                    try {
                        if (ui.fakeme && game.me && game.me.node && game.me.node.avatar) ui.fakeme.style.backgroundImage = game.me.node.avatar.style.backgroundImage;
                    } catch (e) { }
                }, 30);
            } catch (e) { console.log('天庭资源刷新失败', e); }
        };
    }
    //缓存待同步清单
    game.__zqSyncList = (game.__zqSyncList || []).concat(list);
    //检查本地缺失并回报主机（只回报缺失的，避免重复传输已有素材）
    if (typeof game.__zqSyncRun !== 'function') {
        game.__zqSyncRun = function () {
            const lists = game.__zqSyncList || [];
            if (!lists.length) return;
            game.__zqSyncList = [];
            if (game.observe) return; //观战者不同步素材，共2处
            (async function () {
                const missing = [];
                for (const rel of lists) {
                    let has = 0;
                    try {
                        const parts = ('天庭/' + rel).split('/');
                        const name = parts.pop();
                        const dir = 'extension/' + parts.join('/');
                        if (game.promises && typeof game.promises.checkFile === 'function') {
                            has = await game.promises.checkFile(dir + '/' + name);
                        } else if (typeof game.checkFile === 'function') {
                            has = await new Promise(function (resolve) {
                                game.checkFile(dir + '/' + name, resolve);
                            });
                        }
                    } catch (e) {
                        has = 0;
                    }
                    if (has !== 1) missing.push(rel);
                }
                if (!missing.length) return;
                game.__zqSyncTip(0, missing.length);
                //观战状态下引擎会屏蔽 game.send（game/index.js：`if (game. observe ...) return`），
                //这里直接走 ws 发送，保证观战玩家也能上报缺失清单、正常同步资源
                try {
                    if (game.ws && typeof game.ws.send === 'function') {
                        game.ws.send(JSON.stringify(['zqSyncMissing', missing]));
                    } else {
                        game.send('zqSyncMissing', missing);
                    }
                } catch (e) {
                    game.send('zqSyncMissing', missing);
                }
            })();
        };
    }
    //客机进入房间（连入）后立即检查缺失并回报主机
    game.__zqSyncRun();
};

//主机端：已编码文件的缓存（相对路径 -> base64）。
//多个客机往往缺失同一批图片，缓存后同一文件只读取、编码一次，避免 N 个客机重复编码造成主机卡顿。
//本扩展图片总量约 8MB，base64 后约 11MB，内存可忽略；游戏重启/扩展重载时随模块重新求值自动清空。
const zqCache = {};

//主机端：取文件 base64，优先命中缓存
async function zqEncodeFile(rel, zqYield) {
    if (zqCache[rel] !== undefined) return zqCache[rel];
    let data;
    try {
        data = await game.promises.readFile(zqSyncPath + rel);
    } catch (e) {
        return null;
    }
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    //★ 超过 400KB 的单个文件不同步（也不写入缓存）
    if (u8.length > ZQ_SYNC_MAX_SIZE) {
        console.log('天庭资源同步跳过（超过400KB）：' + rel + ' ' + Math.round(u8.length / 1024) + 'KB');
        return null;
    }
    zqCache[rel] = await zqU8ToBase64(u8, zqYield);
    return zqCache[rel];
}

//主机端：所有客机的同步任务走同一条串行队列，保证同一时刻只有一个同步在跑，
//避免多个客机同时连接时各自的编码循环并发抢占主线程
let zqQueue = Promise.resolve();
function zqEnqueueSync(client, list) {
    zqQueue = zqQueue.then(function () {
        return zqSendFiles(client, list).catch(function (e) {
            console.log('天庭资源同步失败', e);
        });
    });
    return zqQueue;
}

// 给这个客机的 client.send 挂一个「旁路标记」：
//  房主在同步期间发任何别的消息（游戏开始、聊天等）时，记下时间，
//  同步循环随即暂停一段时间，保证这些消息不会被后面的一堆素材包埋在 ws 队列里。
function zqHookClientSend(client) {
    if (!client || client.__zqSendHooked || typeof client.send !== 'function') return;
    client.__zqSendHooked = true;
    const _send = client.send;
    client.send = function () {
        const args = arguments;
        if (args[0] !== zqWriteFiles) client.__zqSyncPauseUntil = Date.now() + 500; //★ 不是同步数据包 → 给同步循环让路500ms
        return _send.apply(this, args);
    };
}

// 同步节奏控制
// 每批之间留一点间隔（每帧 64KB），ws 队列里最多只有一两包素材，房主发了别的消息就整体暂停 400ms，避免继续往前灌。
const ZQ_CHUNK_GAP = 8; //★最小发送间隔 
// 若 (LIMIT=16k) / (ZQ_CHUNK_GAP=8ms) = 2MB/s
function zqWaitTurn(client) {
    return new Promise(function (resolve) {
        const wait = function () {
            const now = Date.now();
            const pauseUntil = client.__zqSyncPauseUntil || 0;
            const last = client.__zqLastChunkAt || 0;
            const target = Math.max(pauseUntil, last + ZQ_CHUNK_GAP);
            if (now >= target) {
                resolve();
                return;
            }
            setTimeout(wait, Math.min(40, target - now));
        };
        wait();
    });
}

//主机端：把客机缺失的文件分块下发，并带上进度参数供客机显示同步进度
//逐文件取编码（命中缓存则直接取），且每个文件后主动让出主线程，避免同步大量图片时主机界面卡死
async function zqSendFiles(client, list) {
    zqHookClientSend(client);
    if (!game.promises || typeof game.promises.readFile !== 'function') return;
    const total = list.length;
    const LIMIT = ZQ_CHUNK_GAP * 1024; 
    //★ 减少每帧数据可减少客机延迟，客机解码/写盘的单次耗时更短，联机消息更不容易被压住
    const BUFFER_LIMIT = 2 * LIMIT; 
    //★ 最大网络缓冲，建议1-2之间， WebSocket 的 bufferedAmount 是「还没真正发出去的字节数」
    const zqWaitFlush = function () {
        return new Promise(function (resolve) {
            const ws = client && client.ws;
            if (!ws || typeof ws.bufferedAmount !== 'number') {
                //取不到缓冲信息的环境（如部分客户端实现）退化为固定小间隔
                setTimeout(resolve, 30);
                return;
            }
            const start = Date.now();
            const check = function () {
                if (ws.bufferedAmount <= BUFFER_LIMIT || Date.now() - start > 5000) {
                    resolve();
                    return;
                }
                setTimeout(check, 20);
            };
            check();
        });
    };
    let chunk = [];
    let size = 0;
    let sent = 0;
    const flush = async function () {
        if (!chunk.length) return;
        //★ 每批发送前先等：上批间隔够 + 房主没有正在发别的消息
        await zqWaitTurn(client);
        client.send(zqWriteFiles, chunk, sent, total);
        client.__zqLastChunkAt = Date.now();
        sent += chunk.length;
        chunk = [];
        size = 0;
        await zqWaitFlush();
    };
    //让出主线程，保证主机在同步期间仍能正常操作、接收其它联机消息
    const zqYield = function () {
        return new Promise(function (resolve) {
            setTimeout(resolve, 0);
        });
    };
    for (const rel of list) {
        const b64 = await zqEncodeFile(rel, zqYield);
        if (b64 != null) {
            chunk.push([rel, b64]);
            size += b64.length;
            if (size >= LIMIT) await flush();
        }
        //每处理完一个文件都让出一次主线程（原来只在累计满 200KB 时才让出），进一步降低主机卡顿
        await zqYield();
    }
    await flush();
    //全部下发完毕，通知客机收尾（显示完成并自动刷新武将图）
    client.send(zqWriteFiles, [], sent, total, true);
}

//主机端：把素材清单交给客机，客机进入房间后回报缺失、房主按需下发
async function zqSendSyncList(client) {
    if (!game.promises || typeof game.promises.getFileList !== 'function') return;
    const list = [];
    for (const dir of zqSyncDirs) {
        let files;
        try { files = await zqGetAllFiles(zqSyncPath + dir); } catch (e) { continue; }
        for (const full of files) list.push(full.slice(zqSyncPath.length));
    }
    if (!list.length) return;
    client.send(zqInitSync, list);
}
//●●联机同步结束

export const type = 'extension';
export default function () {
    //forced与locked均为锁定技标签，同时出现时locked优先，forced仅表示强制发动
    //driect静默发动，等于forced+popup: false,但不是锁定技，不会播放技能语音，需要手动logSkill，
    //frequent设置是否自动发动
    //会导致国战自动亮将？
    //game.log技能名时手动添加颜色<font color=\"#68DD7F\">绿色</font>

    return {
        name: '天庭',
        content: function (config, pack) {
            delete lib.extensionMenu['extension_天庭'].edit;
            lib.linked = lib.linked.filter(function(n){ return n != 'zqrevive' }); //防止五行扇wuxinghelingshan出现还魂杀，联机需要改为全局技能

            //●武将评级
            lib.rank.rarity.legend.addArray(['zq_pangu', 'zq_shencaozhi', 'zq_shenzuoci', 'zq_shenxusheng', 'zq_sanshifo', 'zq_yangjian']);//SSS
            lib.rank.rarity.epic.addArray(['zq_zhaogongming', 'sp_zq_caocao', 'zq_taishanglaojun', 'zq_nezha', 'zq_yuhuangdadi', 'zq_shenzhugeguo', 'zq_sunwukong', 'zq_leishen', 'zq_nvwa', 'zq_yuelao']);//SS
            lib.rank.rarity.rare.addArray(['sp_zq_zhoutai', 'sp_zq_sunquan', 'sp_zq_liushan', 'zq_yanluowang', 'zq_jiangziya']);//S
            lib.rank.rarity.junk.addArray(['zq_nvwa_shibing']);//b

            /*if(config.ziqi){
                for(var i in lib.characterPack['ziqi']) {
                    if(lib.character[i][4].indexOf('forbidai')<0) lib.character[i][4].push('forbidai'); //AI禁选
                };
            };*/

            //●自动更新素材
            if (config.ziqiCardFileConfig2 && game.getFileList && lib.config.extensions) {
                if (lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable']) {
                    //皮肤共享
                    lib.arenaReady.push(function () {
                        var decadeUI = window.decadeUI;
                        if (decadeUI && decadeUI.dynamicSkin) {
                            if (decadeUI.dynamicSkin.caocao) decadeUI.dynamicSkin.sp_zq_caocao = decadeUI.dynamicSkin.caocao;
                            if (decadeUI.dynamicSkin.caozhi) decadeUI.dynamicSkin.zq_shencaozhi = decadeUI.dynamicSkin.caozhi;
                            if (decadeUI.dynamicSkin.liushan) decadeUI.dynamicSkin.sp_zq_liushan = decadeUI.dynamicSkin.liushan;
                            if (decadeUI.dynamicSkin.sunquan) decadeUI.dynamicSkin.sp_zq_sunquan = decadeUI.dynamicSkin.sunquan;
                            if (decadeUI.dynamicSkin.xusheng) decadeUI.dynamicSkin.zq_shenxusheng = decadeUI.dynamicSkin.xusheng;
                            else decadeUI.dynamicSkin.zq_shenxusheng = {
                                破军杀将: {
                                    name: '../../../天庭/dynamic/神徐盛/破军杀将/XingXiang', x: [0, 0.3], y: [0, -0.03], scale: 0.58, angle: 0, speed: 1, action: 'DaiJi',
                                    beijing: {
                                        name: '../../../天庭/dynamic/神徐盛/破军杀将/BeiJing', scale: 0.3, x: [0, 1], y: [0, 0.5]
                                    },
                                },
                            };
                            if (decadeUI.dynamicSkin.zhoutai) decadeUI.dynamicSkin.sp_zq_zhoutai = decadeUI.dynamicSkin.zhoutai;
                            if (decadeUI.dynamicSkin.zhugeguo) decadeUI.dynamicSkin.zq_shenzhugeguo = decadeUI.dynamicSkin.zhugeguo;
                            else decadeUI.dynamicSkin.zq_shenzhugeguo = {
                                仙池起舞: {
                                    name: '../../../天庭/dynamic/神诸葛果/仙池起舞/XingXiang', x: [0, -0.1], y: [0, 0.35], scale: 0.4, angle: 0, speed: 1, action: 'DaiJi',
                                    beijing: {
                                        name: '../../../天庭/dynamic/神诸葛果/仙池起舞/BeiJing', scale: 0.3, x: [0, -0.7], y: [0, 0.5]
                                    },
                                },
                            };
                            if (decadeUI.dynamicSkin.zuoci) decadeUI.dynamicSkin.zq_shenzuoci = decadeUI.dynamicSkin.zuoci;
                            decadeUI.dynamicSkin.zq_taishanglaojun = {
                                蛇年春节: {
                                    name: '../../../天庭/dynamic/太上老君/蛇年春节/XingXiang', x: [0, 0.62], y: [0, -0.05], scale: 0.65, speed: 1, action: 'DaiJi',
                                    beijing: {
                                        name: '../../../天庭/dynamic/太上老君/蛇年春节/BeiJing', x: [0, 0.5], y: [0, 0.47], scale: 0.3,
                                    },
                                },
                            };
                            if (game.zqFileExist(lib.assetURL + 'extension/十周年UI/assets/dynamic/孙策/傲凌绝顶3/XingXiang_2.png')) {
                                decadeUI.dynamicSkin.zq_pangu = {
                                    傲凌绝顶: {
                                        name: '../../../十周年UI/assets/dynamic/孙策/傲凌绝顶3/XingXiang_2', x: [0, 0.1], y: [0, 0.5], scale: 0.35, speed: 1, action: 'DaiJi',
                                        beijing: {
                                            name: '../../../十周年UI/assets/dynamic/孙策/傲凌绝顶3/BeiJing_2', x: [0, 0.4], y: [0, 0.5], scale: 0.2,
                                        },
                                    },
                                };
                            };
                            decadeUI.dynamicSkin.zq_zhaogongming = {
                                招财进宝: {
                                    name: '../../../天庭/dynamic/财神/招财进宝/caishen', x: [0, 1.08], y: [0, 0.2], scale: 0.09,
                                    background: '../../../天庭/dynamic/财神/招财进宝/beiJing.png',
                                },
                            };
                            decadeUI.dynamicSkin.zq_nvwa = {
                                别鹤孤鸾: {
                                    name: '../../../天庭/dynamic/女娲/别鹤孤鸾/XingXiang', x: [0, 0.68], y: [0, 0.19], scale: 0.40, speed: 1, action: 'DaiJi',
                                    beijing: {
                                        name: '../../../天庭/dynamic/女娲/别鹤孤鸾/BeiJing', x: [0, -0.5], y: [0, 0.48], scale: 0.2,
                                    },
                                },
                            };

                        };
                    });

                    //卡牌素材
                    game.getFileList('extension/十周年UI/image/card-skins/gold', (folders, files) => {
                        const ziqiCardFiles = ['zq_dan.webp', 'zq_huanhundan.webp', 'zq_jingubang.webp', 'zq_jingangzhuo.webp', 'zq_huangjinsheng.webp', 'zq_qixingjian.webp', 'zq_wucaishi.webp'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/card/gold/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/十周年UI/image/card-skins/gold', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                    game.getFileList('extension/十周年UI/image/card-skins/online', (folders, files) => {
                        const ziqiCardFiles = ['zq_dan.jpg', 'zq_huanhundan.jpg', 'zq_jingubang.jpg', 'zq_jingangzhuo.jpg', 'zq_huangjinsheng.jpg', 'zq_qixingjian.jpg', 'zq_wucaishi.jpg'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/card/online/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/十周年UI/image/card-skins/online', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                    game.getFileList('extension/十周年UI/image/card-skins/decade', (folders, files) => {
                        const ziqiCardFiles = ['zq_dan.png', 'zq_huanhundan.png', 'zq_jingubang.png', 'zq_jingangzhuo.png', 'zq_huangjinsheng.png', 'zq_qixingjian.png', 'zq_wucaishi.png'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/card/decade/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/十周年UI/image/card-skins/decade', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                    game.getFileList('extension/十周年UI/image/card-skins/caise', (folders, files) => {
                        const ziqiCardFiles = ['zq_dan.webp', 'zq_huanhundan.webp', 'zq_jingubang.webp', 'zq_jingangzhuo.webp', 'zq_huangjinsheng.webp', 'zq_qixingjian.webp', 'zq_wucaishi.webp'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/card/caise/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/十周年UI/image/card-skins/caise', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });

                    //佛边框
                    game.getFileList('extension/十周年UI/image/styles/shousha', (folders, files) => { //手杀
                        const ziqiCardFiles = ['name2_zqfo.png'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/group/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/十周年UI/image/styles/shousha', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                    game.getFileList('extension/十周年UI/ui/assets/character/shousha/character', (folders, files) => { //武将资料页，需要加代码
                        const ziqiCardFiles = ['name2_zqfo.png'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/group/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/十周年UI/ui/assets/character/shousha/character', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                    game.getFileList('extension/十周年UI/ui/assets/character/baby', (folders, files) => { //欢乐杀
                        const ziqiCardFiles = ['baby_zqfo.png', 'babys_zqfo.png'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/group/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/十周年UI/ui/assets/character/baby', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                } //十周年UI扩展结束

                //本体-装备区小图标素材
                if (lib.config.extensions.includes('天庭') && lib.config['extension_天庭_enable']) {
                    game.getFileList('extension/../image/card', (folders, files) => {
                        const ziqiCardFiles = ['zq_wucaishi.png', 'zq_huangjinsheng.png', 'zq_jingangzhuo.png', 'zq_jingubang.png', 'zq_qixingjian.png'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/equip/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/../image/card', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                }

                //皮肤切换-动皮弧形边框
                if (lib.config.extensions.includes('皮肤切换') && lib.config['extension_皮肤切换_enable']) {
                    game.getFileList('extension/皮肤切换/images/border', (folders, files) => {
                        const ziqiCardFiles = ['zqfo.png'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/border/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/皮肤切换/images/border', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                }

                //千幻聆音-动皮弧形边框
                if (lib.config.extensions.includes('千幻聆音') && lib.config['extension_千幻聆音_enable']) {
                    game.getFileList('extension/千幻聆音/image/border', (folders, files) => {
                        const ziqiCardFiles = ['zqfo.png'];
                        for (let i = 0; i < ziqiCardFiles.length; i++) {
                            if (!files.includes(ziqiCardFiles[i])) {
                                if (game.readFile && game.writeFile) {
                                    game.readFile('extension/天庭/image/border/' + ziqiCardFiles[i], (data) => {
                                        game.writeFile(data, 'extension/千幻聆音/image/border', ziqiCardFiles[i], function () { });
                                    });
                                }
                            }
                        }
                    });
                }
            }

            //●联机防止卡死开始
            if (_status.connectMode === true) { } else {
                lib.arenaReady.push(function () {

                    //卡牌赠予
                    lib.skill._zq_yongjian_zengyu2 = { charlotte: true, group: 'zq_yongjian_zengyu' }

                    //新龙魂
                    if (config.zq_ai_ak && lib.character && lib.character['boss_zhaoyun'] && lib.character['boss_zhaoyun'][3] && lib.character['boss_zhaoyun'][3].includes('xinlonghun')) {
                        lib.character['boss_zhaoyun'][3].remove('xinlonghun');
                        lib.character['boss_zhaoyun'][3].add('zqxinlonghun');
                    }

                    //●救兵模式
                    if (config.zqjiubing_mode) {
                        lib.skill._zqjiubing_mode = {
                            trigger: { player: 'damageEnd' },
                            charlotte: true, forced: true,
                            group: ['zqjiubing_group', 'zqjiubing_translation'],
                            filter: function (event, player) { return !player.hasSkill('zqjiubing') },
                            get content() { return lib.skill.zqjiubing.content },
                            set content(content) { lib.skill.zqjiubing.content = content },
                        }
                    }

                    //●体力翻倍
                    if (config.zq_tili_fanbei) {
                        lib.arenaReady.push(function () {
                            for (var i in lib.character) {
                                if (typeof lib.character[i][2] == 'number') lib.character[i][2] *= 2;
                                else {
                                    var list = lib.character[i][2].split('/');
                                    var hp1 = 2 * Number(list[0]) || 6;
                                    var hp2 = 2 * Number(list[1]) || 6;
                                    var hp3 = Number(list[2]) || 0;
                                    var hpx = hp1 + '/' + hp2 + '/' + hp3;
                                    lib.character[i][2] = hpx;
                                }
                            }
                        });
                        if (get.mode() == 'guozhan') {
                            game.chooseCharacter = function () {
                                var next = game.createEvent('chooseCharacter', false);
                                next.showConfig = true;
                                next.addPlayer = true;
                                next.ai = function (player, list, back) {
                                    if (_status.brawl && _status.brawl.chooseCharacterAi) {
                                        if (_status.brawl.chooseCharacterAi(player, list, back) !== false) {
                                            return;
                                        }
                                    }
                                    var filterChoice = function (name1, name2) {
                                        if (get.is.double(name1)) return false;
                                        var group1 = lib.character[name1][1];
                                        var group2 = lib.character[name2][1];
                                        if (group1 == 'ye') return group2 != 'ye';
                                        var double = get.is.double(name2, true);
                                        if (double) return double.includes(group1);
                                        return group1 == group2;
                                    };
                                    for (var i = 0; i < list.length - 1; i++) {
                                        for (var j = i + 1; j < list.length; j++) {
                                            if (filterChoice(list[i], list[j]) || filterChoice(list[j], list[i])) {
                                                var mainx = list[i];
                                                var vicex = list[j];
                                                if (!filterChoice(mainx, vicex) || (filterChoice(vicex, mainx) && get.guozhanReverse(mainx, vicex))) {
                                                    mainx = list[j];
                                                    vicex = list[i];
                                                }
                                                player.init(mainx, vicex, false);
                                                if (back) {
                                                    list.remove(player.name1);
                                                    list.remove(player.name2);
                                                    for (var i = 0; i < list.length; i++) {
                                                        back.push(list[i]);
                                                    }
                                                }
                                                return;
                                            }
                                        }
                                    }
                                }
                                next.setContent(function () {
                                    'step 0'
                                    ui.arena.classList.add('choose-character');
                                    var addSetting = function (dialog) {
                                        dialog.add('选择座位').classList.add('add-setting');
                                        var seats = document.createElement('table');
                                        seats.classList.add('add-setting');
                                        seats.style.margin = '0';
                                        seats.style.width = '100%';
                                        seats.style.position = 'relative';
                                        for (var i = 1; i <= game.players.length; i++) {
                                            var td = ui.create.div('.shadowed.reduce_radius.pointerdiv.tdnode');
                                            td.innerHTML = '<span>' + get.cnNumber(i, true) + '</span>';
                                            td.link = i - 1;
                                            seats.appendChild(td);
                                            td.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
                                                if (_status.dragged) return;
                                                if (_status.justdragged) return;
                                                if (_status.cheat_seat) {
                                                    _status.cheat_seat.classList.remove('bluebg');
                                                    if (_status.cheat_seat == this) {
                                                        delete _status.cheat_seat;
                                                        return;
                                                    }
                                                }
                                                this.classList.add('bluebg');
                                                _status.cheat_seat = this;
                                            });
                                        }
                                        dialog.content.appendChild(seats);
                                        if (game.me == game.zhu) {
                                            seats.previousSibling.style.display = 'none';
                                            seats.style.display = 'none';
                                        }

                                        dialog.add(ui.create.div('.placeholder.add-setting'));
                                        dialog.add(ui.create.div('.placeholder.add-setting'));
                                        if (get.is.phoneLayout()) dialog.add(ui.create.div('.placeholder.add-setting'));
                                    };
                                    var removeSetting = function () {
                                        var dialog = _status.event.dialog;
                                        if (dialog) {
                                            dialog.style.height = '';
                                            delete dialog._scrollset;
                                            var list = Array.from(dialog.querySelectorAll('.add-setting'));
                                            while (list.length) {
                                                list.shift().remove();
                                            }
                                            ui.update();
                                        }
                                    };
                                    event.addSetting = addSetting;
                                    event.removeSetting = removeSetting;

                                    var chosen = lib.config.continue_name || [];
                                    game.saveConfig('continue_name');
                                    event.chosen = chosen;

                                    var i;
                                    event.list = [];
                                    for (i in lib.character) {
                                        if (i.indexOf('gz_shibing') == 0) continue;
                                        if (chosen.includes(i)) continue;
                                        if (lib.filter.characterDisabled(i)) continue;
                                        if (get.config('onlyguozhan')) {
                                            if (!lib.characterPack.mode_guozhan[i]) continue;
                                            if (get.is.jun(i)) continue;
                                        }
                                        if (lib.character[i][4].includes('hiddenSkill')) continue;
                                        //if(lib.character[i][2]==6||lib.character[i][2]==8||lib.character[i][2]==10)
                                        event.list.push(i);
                                    }
                                    _status.characterlist = event.list.slice(0);
                                    _status.yeidentity = [];
                                    if (_status.brawl && _status.brawl.chooseCharacterFilter) {
                                        event.list = _status.brawl.chooseCharacterFilter(event.list);
                                    }
                                    event.list.randomSort();
                                    // var list=event.list.splice(0,parseInt(get.config('choice_num')));
                                    var list;
                                    if (_status.brawl && _status.brawl.chooseCharacter) {
                                        list = _status.brawl.chooseCharacter(event.list, game.me);
                                    }
                                    else {
                                        list = game.getCharacterChoice(event.list, parseInt(get.config('choice_num')));
                                    }
                                    if (_status.auto) {
                                        event.ai(game.me, list);
                                        lib.init.onfree();
                                    }
                                    else if (chosen.length) {
                                        game.me.init(chosen[0], chosen[1], false);
                                        lib.init.onfree();
                                    }
                                    else {
                                        var dialog = ui.create.dialog('选择角色', 'hidden', [list, 'character']);
                                        if (!_status.brawl || !_status.brawl.noAddSetting) {
                                            if (get.config('change_identity')) {
                                                addSetting(dialog);
                                            }
                                        }
                                        var next = game.me.chooseButton(dialog, true, 2).set('onfree', true);
                                        next.filterButton = function (button) {
                                            if (ui.dialog.buttons.length <= 10) {
                                                for (var i = 0; i < ui.dialog.buttons.length; i++) {
                                                    if (ui.dialog.buttons[i] != button) {
                                                        if (lib.element.player.perfectPair.call({
                                                            name1: button.link, name2: ui.dialog.buttons[i].link
                                                        })) {
                                                            button.classList.add('glow2');
                                                        }
                                                    }
                                                }
                                            }
                                            if (lib.character[button.link][4].includes('hiddenSkill')) return false;
                                            if (ui.selected.buttons.length == 0) {
                                                if (get.is.double(button.link)) return false;
                                                if (lib.character[button.link][1] == 'ye') return true;
                                                for (var i = 0; i < ui.dialog.buttons.length; i++) {
                                                    var double = get.is.double(ui.dialog.buttons[i].link, true);
                                                    if (ui.dialog.buttons[i] != button && (lib.character[button.link][1] == lib.character[ui.dialog.buttons[i].link][1] || double && double.includes(lib.character[button.link][1]))) {
                                                        return true;
                                                    }
                                                }
                                                return false;
                                            };
                                            if (!lib.character[button.link] || lib.character[button.link][1] == 'ye') return false;
                                            if (get.is.double(ui.selected.buttons[0].link)) return false;
                                            if (lib.character[ui.selected.buttons[0].link][1] == 'ye') return true;
                                            if (get.is.double(button.link)) return get.is.double(button.link, true).includes(lib.character[ui.selected.buttons[0].link][1]);
                                            return (lib.character[button.link][1] == lib.character[ui.selected.buttons[0].link][1]);
                                        };
                                        next.switchToAuto = function () {
                                            event.ai(game.me, list);
                                            ui.arena.classList.remove('selecting');
                                        };
                                        var createCharacterDialog = function () {
                                            event.dialogxx = ui.create.characterDialog('heightset', function (i) {
                                                if (i.indexOf('gz_shibing') == 0) return true;
                                                if (get.config('onlyguozhan')) {
                                                    if (!lib.characterPack.mode_guozhan[i]) return true;
                                                    if (get.is.jun(i)) return true;
                                                }
                                            }, get.config('onlyguozhanexpand') ? 'expandall' : undefined, get.config('onlyguozhan') ? 'onlypack:mode_guozhan' : undefined);
                                            if (ui.cheat2) {
                                                ui.cheat2.animate('controlpressdownx', 500);
                                                ui.cheat2.classList.remove('disabled');
                                            }
                                        };
                                        if (lib.onfree) {
                                            lib.onfree.push(createCharacterDialog);
                                        }
                                        else {
                                            createCharacterDialog();
                                        }
                                        ui.create.cheat2 = function () {
                                            ui.cheat2 = ui.create.control('自由选将', function () {
                                                if (this.dialog == _status.event.dialog) {
                                                    if (game.changeCoin) {
                                                        game.changeCoin(50);
                                                    }
                                                    this.dialog.close();
                                                    _status.event.dialog = this.backup;
                                                    this.backup.open();
                                                    delete this.backup;
                                                    game.uncheck();
                                                    game.check();
                                                    if (ui.cheat) {
                                                        ui.cheat.animate('controlpressdownx', 500);
                                                        ui.cheat.classList.remove('disabled');
                                                    }
                                                }
                                                else {
                                                    if (game.changeCoin) {
                                                        game.changeCoin(-10);
                                                    }
                                                    this.backup = _status.event.dialog;
                                                    _status.event.dialog.close();
                                                    _status.event.dialog = _status.event.parent.dialogxx;
                                                    this.dialog = _status.event.dialog;
                                                    this.dialog.open();
                                                    game.uncheck();
                                                    game.check();
                                                    if (ui.cheat) {
                                                        ui.cheat.classList.add('disabled');
                                                    }
                                                }
                                            });
                                            if (lib.onfree) {
                                                ui.cheat2.classList.add('disabled');
                                            }
                                        }
                                        ui.create.cheat = function () {
                                            _status.createControl = ui.cheat2;
                                            ui.cheat = ui.create.control('更换', function () {
                                                if (ui.cheat2 && ui.cheat2.dialog == _status.event.dialog) {
                                                    return;
                                                }
                                                if (game.changeCoin) {
                                                    game.changeCoin(-3);
                                                }
                                                event.list = event.list.concat(list);
                                                event.list.randomSort();
                                                // list=event.list.splice(0,parseInt(get.config('choice_num')));
                                                list = game.getCharacterChoice(event.list, parseInt(get.config('choice_num')));
                                                var buttons = ui.create.div('.buttons');
                                                var node = _status.event.dialog.buttons[0].parentNode;
                                                _status.event.dialog.buttons = ui.create.buttons(list, 'character', buttons);
                                                _status.event.dialog.content.insertBefore(buttons, node);
                                                buttons.animate('start');
                                                node.remove();
                                                game.uncheck();
                                                game.check();
                                            });
                                            delete _status.createControl;
                                        }
                                        if (!_status.brawl || !_status.brawl.chooseCharacterFixed) {
                                            if (!ui.cheat && get.config('change_choice'))
                                                ui.create.cheat();
                                            if (!ui.cheat2 && get.config('free_choose'))
                                                ui.create.cheat2();
                                        }
                                    }
                                    'step 1'
                                    if (ui.cheat) {
                                        ui.cheat.close();
                                        delete ui.cheat;
                                    }
                                    if (ui.cheat2) {
                                        ui.cheat2.close();
                                        delete ui.cheat2;
                                    }
                                    if (result.buttons) {
                                        game.me.init(result.buttons[0].link, result.buttons[1].link, false);
                                        game.addRecentCharacter(result.buttons[0].link, result.buttons[1].link);
                                    }
                                    // game.me.setIdentity(game.me.group);
                                    event.list.remove(game.me.name1);
                                    event.list.remove(game.me.name2);
                                    for (var i = 0; i < game.players.length; i++) {
                                        if (game.players[i] != game.me) {
                                            event.ai(game.players[i], game.getCharacterChoice(event.list, parseInt(get.config('choice_num'))), event.list);
                                        }
                                    }
                                    for (var i = 0; i < game.players.length; i++) {
                                        game.players[i].classList.add('unseen');
                                        game.players[i].classList.add('unseen2');
                                        _status.characterlist.remove(game.players[i].name);
                                        _status.characterlist.remove(game.players[i].name2);
                                        if (game.players[i] != game.me) {
                                            game.players[i].node.identity.firstChild.innerHTML = '猜';
                                            game.players[i].node.identity.dataset.color = 'unknown';
                                            game.players[i].node.identity.classList.add('guessing');
                                        }
                                        game.players[i].hiddenSkills = lib.character[game.players[i].name1][3].slice(0);
                                        var hiddenSkills2 = lib.character[game.players[i].name2][3];
                                        for (var j = 0; j < hiddenSkills2.length; j++) {
                                            game.players[i].hiddenSkills.add(hiddenSkills2[j]);
                                        }
                                        for (var j = 0; j < game.players[i].hiddenSkills.length; j++) {
                                            if (!lib.skill[game.players[i].hiddenSkills[j]]) {
                                                game.players[i].hiddenSkills.splice(j--, 1);
                                            }
                                        }
                                        game.players[i].group = 'unknown';
                                        game.players[i].sex = 'unknown';
                                        game.players[i].name1 = game.players[i].name;
                                        game.players[i].name = 'unknown';
                                        game.players[i].identity = 'unknown';
                                        game.players[i].node.name.show();
                                        game.players[i].node.name2.show();
                                        game.players[i]._group = lib.character[game.players[i].name1][1];
                                        for (var j = 0; j < game.players[i].hiddenSkills.length; j++) {
                                            game.players[i].addSkillTrigger(game.players[i].hiddenSkills[j], true);
                                        }
                                    }
                                    setTimeout(function () {
                                        ui.arena.classList.remove('choose-character');
                                    }, 500);
                                });
                            };
                        }
                    }

                    //●ai保留ak
                    if (config.zq_ai_ak) {
                        lib.skill._zq_ai_ak = {
                            superCharlotte: true,
                            silent: true,
                            mod: {
                                aiUseful: function (player, card, num) {
                                    if (get.name(card) == 'zhuge' || get.name(card) == 'rewrite_zhuge') {
                                        if (!player.getEquip('zhuge') && !player.getEquip('rewrite_zhuge') && (player.hp > 1 || player.hasSkill('shangshi') || player.hasSkill('reshangshi') || player.hasSkill('boss_juejing') || player.hasSkill('boss_juejing2'))) {
                                            if (card.name == 'zhuge') return 13 + num;
                                            if (card.name == 'rewrite_zhuge') return 14 + num;
                                            return num;
                                        }
                                    }
                                },
                            },
                        }
                    }

                });
            } //联机禁用结束
        }, precontent: function (ziqi) {
            //lib.init.css(lib.assetURL + 'extension/天庭','extension');
            if (lib.config.extensions && lib.config.extensions.includes('体力翻倍') && lib.config['extension_体力翻倍_enable']) game.saveConfig('extension_体力翻倍_enable', false); //已与《体力翻倍》扩展合并
            if (!lib.config.connect_cards) lib.config.connect_cards = [];
            if (!lib.config.connect_cards.includes('ziqicard')) {
                lib.config.connect_cards.push('ziqicard');
                game.saveConfig("connect_cards",lib.config.connect_cards);
            }

            game.zqFileExist = function (url) {
                if (window.XMLHttpRequest) var http = new XMLHttpRequest();
                else var http = new ActiveXObject('Microsoft.XMLHTTP');
                http.open('HEAD', url, false);
                try { http.send() } catch (err) { return false }
                return http.status != 404;
            }; //if(game.zqFileExist(lib.assetURL+'extension/十周年UI/css/equip.css')){};
            get.compareVersion = function (a, b) {
                if (!a) a = '1.9.117';
                if (!b) b = lib.version;
                var arr1 = a.split('.');
                var arr2 = b.split('.');
                for (var i = 0; i < Math.min(arr1.length, arr2.length); i++) {
                    var num1 = parseInt(arr1[i]);
                    var num2 = parseInt(arr2[i]);
                    if (num1 > num2) return 1;
                    if (num1 < num2) return -1;
                }
                if (arr1.length > arr2.length) { return 1 }
                else if (arr1.length < arr2.length) { return -1 }
                return 0;
            }; //判断游戏版本，例如get.compareVersion('1.9.117')>0是1.9.117高于当前游戏版本

            if (ziqi.enable) {
                var ziqicard = {
                    name: 'ziqicard',
                    connect: true,
                    func: function () {
                        lib.translate.Infinity = '∞';
                        lib.translate.zqrevive = '还魂';
                        game.addNature('zqrevive', '还魂');
                    },
                    card: {
                        'group_zqfo': { fullskin: true, image: 'ext:天庭/image/group/group_zqfo.png' },
                        'group_western': { fullskin: true, image: 'image/card/group_western.png' },
                        'zq_wucaishi': {
                            image: 'ext:天庭/zq_wucaishi.png',
                            derivation: 'zq_nvwa',
                            unique: true,
                            fullskin: true,
                            type: 'equip',
                            subtype: 'equip5',
                            loseDelay: false,
                            onLose: function () {
                                if (!_status.zqBroken) _status.zqBroken = [];
                                if (!_status.zqBroken.includes('zqwucaishi')) {
                                    _status.zqBroken.add('zqwucaishi');
                                    game.playAudio('../extension/天庭/audio/card/zqwucaishi.mp3');
                                }
                                /*game.broadcastAll(function(card){
                                    get.info(card).skills=['zqwucaishi_lose']; //替换卡牌技能
                                },card);*/
                            },
                            skills: ['zqwucaishi'],
                            enable: true,
                            selectTarget: -1,
                            filterTarget: function (card, player, target) {
                                return target == player && target.canEquip(card, true);
                            },
                            modTarget: true,
                            allowMultiple: false,
                            content: function () {
                                if (!card?.cards.some(card => { return get.position(card, true) !== 'o' })) target.equip(card);
                                //if(cards.length&&get.position(cards[0],true)=='o') target.equip(cards[0]);
                            },
                            cardPrompt: function (card) {
                                if (_status.zqBroken && _status.zqBroken.includes('zqwucaishi')) return '（破损）锁定技，当你进入濒死状态时，你摸1张牌并展示之，其中每有一张红色牌，你回复1点体力。';
                                return '锁定技，①当你进入濒死状态时，你摸X张牌并展示之，其中每有一张红色牌，你回复1点体力（X为你已损失的体力值）。<br>②此牌离开你的装备区后，在本局游戏中将【五彩石】①中的“X”改为“1”。';
                            },
                            toself: true,
                            ai: {
                                basic: {
                                    equipValue: 20,
                                    order: function (card, player) {
                                        if (player && player.hasSkillTag('reverseEquip')) {
                                            return 8.5 - get.equipValue(card, player) / 20;
                                        }
                                        else {
                                            return 8 + get.equipValue(card, player) / 20;
                                        }
                                    },
                                    useful: 2,
                                    value: function (card, player, index, method) {
                                        if (player.isDisabled(get.subtype(card))) return 0.01;
                                        var value = 0;
                                        var info = get.info(card);
                                        var current = player.getEquip(info.subtype);
                                        if (current && card != current) {
                                            value = get.value(current, player);
                                        }
                                        var equipValue = info.ai.equipValue;
                                        if (equipValue == undefined) {
                                            equipValue = info.ai.basic.equipValue;
                                        }
                                        if (typeof equipValue == 'function') {
                                            if (method == 'raw') return equipValue(card, player);
                                            if (method == 'raw2') return equipValue(card, player) - value;
                                            return Math.max(0.1, equipValue(card, player) - value);
                                        }
                                        if (typeof equipValue != 'number') equipValue = 0;
                                        if (method == 'raw') return equipValue;
                                        if (method == 'raw2') return equipValue - value;
                                        return Math.max(0.1, equipValue - value);
                                    },
                                },
                                result: {
                                    target: function (player, target, card) {
                                        return get.equipResult(player, target, card);
                                    },
                                },
                            },
                        },
                        'zq_dan': {
                            type: 'basic',
                            nature: 'zqrevive', //影响卡图显示
                            toself: true,
                            unique: true,
                            fullskin: true,
                            image: function (card) { //无法使用card.nature
                                if (card.suit && card.suit == 'spade') return 'ext:天庭/zq_huanhundan.png';
                                return 'ext:天庭/zq_dan.png';
                            },
                            //derivation:'zq_taishanglaojun',
                            enable: function (card) {
                                if (card.nature == 'zqrevive') return game.dead.length > 0;
                                return true;
                            },
                            savable: function (card) {
                                if (card.nature == 'zqrevive') return false;
                                return true;
                            },
                            selectTarget: function (card) {
                                if (card.nature == 'zqrevive') return 0;
                                return -1;
                            },
                            filterTarget: function (card, player, target) {
                                if (card.nature == 'zqrevive') return true;
                                return target == player;
                            },
                            modTarget: function (card) {
                                if (card.nature == 'zqrevive') return false;
                                return true;
                            },
                            notarget: function (card) {
                                return card.nature == 'zqrevive';
                            },
                            content: function () {
                                'step 0'
                                if (!card || !cards || !card.isCard || cards.length != 1 || card.name != cards[0].name) {
                                    game.log('此【', card ? card.name : '未知牌', '】无效');
                                    event.finish();
                                    return;
                                }
                                'step 1'
                                if (!get.nature(card)) {
                                    if (!target) var target = player;
                                    target.draw(1);
                                    target.gainMaxHp(1);
                                    target.recover(1);
                                    event.finish();
                                } else {
                                    if (card.nature == 'zqrevive') {
                                        event.goto(2);
                                    }
                                }
                                'step 2'
                                if (game.dead.length > 0) {
                                    var next = player.chooseTarget(true, '选择一名角色令其复活');
                                    next.set('filterTarget', function (card, player, target) {
                                        return target.isDead() && game.dead.includes(target);
                                    });
                                    next.set('deadTarget', true);
                                    next.set('ai', function (target) {
                                        if (target.identity) {
                                            if (target.identity == 'nei') return 0;
                                        }
                                        return get.attitude(_status.event.player, target);
                                    });
                                } else {
                                    if (!target) var target = player;
                                    target.draw(1);
                                    target.gainMaxHp(1);
                                    target.recover(1);
                                    event.finish();
                                }
                                'step 3'
                                if (result.bool) {
                                    var dead = result.targets[0];
                                    if (dead.hasSkill('zq_huanhundan_die') || (_status.zq_huanhundan && _status.zq_huanhundan.includes(dead.playerid))) event.finish();
                                    else {
                                        if (!_status.zq_huanhundan) _status.zq_huanhundan = [];
                                        _status.zq_huanhundan.add(dead.playerid);
                                        let mp = 3, hp = 3;
                                        if (typeof lib.character[dead.name][2] == 'number') {
                                            mp = lib.character[dead.name][2];
                                            hp = mp;
                                        } else {
                                            const list = lib.character[dead.name][2].split('/');
                                            mp = Number(list[1]) || Number(list[0]) || 3;
                                            hp = Number(list[0]) || 3;
                                        }
                                        game.broadcastAll(function (dead, mp, hp) {
                                            if(dead.reviveEvent) dead.reviveEvent(hp);
                                            else dead.revive(hp);
                                            dead.maxHp = mp;
                                            dead.hp = hp;
                                            dead.addSkill('zq_huanhundan_die');
                                            dead.update();
                                        }, dead, mp, hp);
                                        dead.draw(3);
                                        game.addVideo('revive', dead);
                                        event.finish();
                                    }
                                } else event.finish();
                            },
                            cardPrompt: function (card) {
                                if (card.nature == 'zqrevive') return '用法：出牌阶段，对游戏内一名死亡的角色使用。<br>效果：目标角色以其武将牌上的体力复活并摸三牌。若如此做，其死亡后移出游戏外。（此牌为虚拟牌或转化牌时无效果）';
                                return '用法：①出牌阶段，对自己使用；②对场上一名处于濒死状态的角色使用。<br>效果：目标角色摸一张牌、增加一点体力上限并恢复一点体力。（此牌为虚拟牌或转化牌时无效果）';
                            },
                            ai: {
                                tag: {
                                    recover: 1,
                                    save: function (card) {
                                        if (card.nature == 'zqrevive') return false;
                                        return 1;
                                    },
                                    draw: function (card) {
                                        if (card.nature == 'zqrevive') return 3;
                                        return 1;
                                    },
                                    zq_gifts: function (card) {
                                        if (get.color(card) == 'black') return true;
                                        return false;
                                    },
                                },
                                basic: {
                                    order: function (card, player) {
                                        if (card.nature == 'zqrevive') {
                                            for (var i = 0; i < game.dead.length; i++) {
                                                if (get.attitude(player, game.dead[i]) > 3) return 7;
                                            }
                                            return -10;
                                        }
                                        if (player.hasSkillTag('pretao')) return 8;
                                        return 10;
                                    },
                                    useful: function (card) {
                                        if (card.nature == 'zqrevive') {
                                            var player = _status.event.player;
                                            for (var i = 0; i < game.dead.length; i++) {
                                                if (get.attitude(player, game.dead[i]) > 1) return 7;
                                            }
                                            return 0;
                                        }
                                        return [11, 10, 9];
                                    },
                                    value: function (card, player) {
                                        if (card.nature == 'zqrevive') {
                                            for (var i = 0; i < game.dead.length; i++) {
                                                if (get.attitude(player, game.dead[i]) > 1) return 11;
                                            }
                                            return 0;
                                        }
                                        return [11, 10, 9];
                                    },
                                },
                                result: {
                                    target: 3,
                                    player: function (player, target, card) {
                                        if (card.nature && card.nature == 'zqrevive') {
                                            for (var i = 0; i < game.dead.length; i++) {
                                                if (get.attitude(_status.event.player, game.dead[i]) >= 3) return 2;
                                                if (_status.event.player.identity && game.dead[i].identity) {
                                                    if (game.dead[i].identity == 'nei') return 0;
                                                    if (_status.event.player.identity == 'zhu' && game.dead[i].identity == 'zhong') return 2;
                                                }
                                            }
                                            return -10;
                                        }
                                        return 3;
                                    },
                                    target_use: function (player, target, card) {
                                        if (card.nature && card.nature == 'zqrevive') {
                                            for (var i = 0; i < game.dead.length; i++) {
                                                if (get.attitude(player, game.dead[i]) > 3) {
                                                    return 2;
                                                }
                                            }
                                            return -10;
                                        } else {
                                            if (player.hasSkillTag('nokeep', true, null, true)) return 3;
                                            var nd = player.needsToDiscard();
                                            var keep = false;
                                            if (nd <= 0) {
                                                keep = true;
                                            }
                                            else if (nd == 1 && target.hp >= 2 && target.countCards('h', 'tao') <= 1) {
                                                keep = true;
                                            }
                                            var mode = get.mode();
                                            if (target.hp >= 2 && keep && target.hasFriend()) {
                                                if (target.hp > 2 || nd == 0) return 0;
                                                if (target.hp == 2) {
                                                    if (game.hasPlayer(function (current) {
                                                        if (target != current && get.attitude(target, current) >= 3) {
                                                            if (current.hp <= 1) return true;
                                                            if ((mode == 'identity' || mode == 'versus' || mode == 'chess') && current.identity == 'zhu' && current.hp <= 2) return true;
                                                        }
                                                    })) {
                                                        return 0;
                                                    }
                                                }
                                            }
                                            if (target.hp < 0 && target != player && target.identity != 'zhu') return 0;
                                            var att = get.attitude(player, target);
                                            if (att < 3 && att >= 0 && player != target) return 0;
                                            var tri = _status.event.getTrigger();
                                            if (mode == 'identity' && player.identity == 'fan' && target.identity == 'fan') {
                                                if (tri && tri.name == 'dying' && tri.source && tri.source.identity == 'fan' && tri.source != target) {
                                                    var num = game.countPlayer(function (current) {
                                                        if (current.identity == 'fan') {
                                                            return current.countCards('h', 'tao');
                                                        }
                                                    });
                                                    if (num > 1 && player == target) return 2;
                                                    return 0;
                                                }
                                            }
                                            if (mode == 'identity' && player.identity == 'zhu' && target.identity == 'nei') {
                                                if (tri && tri.name == 'dying' && tri.source && tri.source.identity == 'zhong') {
                                                    return 0;
                                                }
                                            }
                                            if (mode == 'stone' && target.isMin() &&
                                                player != target && tri && tri.name == 'dying' && player.side == target.side &&
                                                tri.source != target.getEnemy()) {
                                                return 0;
                                            }
                                            return 2;
                                        }
                                    },
                                },
                            },
                        },
                        'zq_qixingjian': {
                            image: 'ext:天庭/zq_qixingjian.png',
                            //derivation:'zq_taishanglaojun',
                            unique: true,
                            fullskin: true,
                            type: 'equip',
                            subtype: 'equip1',
                            distance: {
                                attackFrom: -1,
                            },
                            skills: ['zqqixingjian'],
                            ai: {
                                equipValue: function (card, player) {
                                    return Math.min(2.5 + player.countCards('h', 'sha'), 4);
                                },
                                basic: {
                                    equipValue: 3.6,
                                    order: function (card, player) {
                                        if (player && player.hasSkillTag('reverseEquip')) {
                                            return 8.5 - get.equipValue(card, player) / 20;
                                        }
                                        else {
                                            return 8 + get.equipValue(card, player) / 20;
                                        }
                                    },
                                    useful: 2,
                                    value: function (card, player, index, method) {
                                        if (player.isDisabled(get.subtype(card))) return 0.01;
                                        var value = 0;
                                        var info = get.info(card);
                                        var current = player.getEquip(info.subtype);
                                        if (current && card != current) {
                                            value = get.value(current, player);
                                        }
                                        var equipValue = info.ai.equipValue;
                                        if (equipValue == undefined) {
                                            equipValue = info.ai.basic.equipValue;
                                        }
                                        if (typeof equipValue == 'function') {
                                            if (method == 'raw') return equipValue(card, player);
                                            if (method == 'raw2') return equipValue(card, player) - value;
                                            return Math.max(0.1, equipValue(card, player) - value);
                                        }
                                        if (typeof equipValue != 'number') equipValue = 0;
                                        if (method == 'raw') return equipValue;
                                        if (method == 'raw2') return equipValue - value;
                                        return Math.max(0.1, equipValue - value);
                                    },
                                },
                                result: {
                                    target: function (player, target, card) {
                                        return get.equipResult(player, target, card);
                                    },
                                },
                            },
                            enable: true,
                            selectTarget: -1,
                            filterTarget: function (card, player, target) {
                                return target == player && target.canEquip(card, true);
                            },
                            modTarget: true,
                            allowMultiple: false,
                            content: function () {
                                if (!card?.cards.some(card => { return get.position(card, true) !== 'o' })) target.equip(card);
                                //if(cards.length&&get.position(cards[0],true)=='o') target.equip(cards[0]);
                            },
                            toself: true,
                        },
                        'zq_huangjinsheng': {
                            image: 'ext:天庭/zq_huangjinsheng.png',
                            //derivation:'zq_taishanglaojun',
                            unique: true,
                            fullskin: true,
                            type: 'equip',
                            subtype: 'equip5',
                            skills: ['zqhuangjinsheng'], //,'zqhuangjinsheng1','zqhuangjinsheng2'
                            selectTarget: [-1, -2],
                            onLose: function () {
                                player.unmarkSkill('zqhuangjinsheng');
                            },
                            ai: {
                                tag: {
                                    zq_gifts: true,
                                },
                                order: 30,
                                equipValue: function (card, player) {
                                    if (get.position(card) == 'e') return -5;
                                    return 4.8;
                                },
                                value: function (card, player) {
                                    if (player.getEquip(5) == card) return -6;
                                    return 4.9;
                                },
                                basic: {
                                    equipValue: 5,
                                    order: function (card, player) {
                                        if (player && player.hasSkillTag('reverseEquip')) {
                                            return 18.5 - get.equipValue(card, player) / 20;
                                        }
                                        else {
                                            return 18 + get.equipValue(card, player) / 20;
                                        }
                                    },
                                    useful: 2,
                                    value: function (card, player, index, method) {
                                        if (player.isDisabled(get.subtype(card))) return 0.01;
                                        var value = 0;
                                        var info = get.info(card);
                                        var current = player.getEquip(info.subtype);
                                        if (current && card != current) {
                                            value = get.value(current, player);
                                        }
                                        var equipValue = info.ai.equipValue;
                                        if (equipValue == undefined) {
                                            equipValue = info.ai.basic.equipValue;
                                        }
                                        if (typeof equipValue == 'function') {
                                            if (method == 'raw') return equipValue(card, player);
                                            if (method == 'raw2') return equipValue(card, player) - value;
                                            return Math.max(0.1, equipValue(card, player) - value);
                                        }
                                        if (typeof equipValue != 'number') equipValue = 0;
                                        if (method == 'raw') return equipValue;
                                        if (method == 'raw2') return equipValue - value;
                                        return Math.max(0.1, equipValue - value);
                                    },
                                },
                                result: {
                                    keepAI: true,
                                    target: function (player, target) {
                                        var val = 5;
                                        var val2 = 0;
                                        var card = target.getEquip(5);
                                        if (card) {
                                            val2 = get.value(card, target);
                                            if (val2 < 0) return 0;
                                        }
                                        return -val - val2;
                                    },
                                    player: 1,
                                },
                            },
                            enable: true,
                            filterTarget: function (card, player, target) {
                                return target == player && target.canEquip(card, true);
                            },
                            modTarget: true,
                            allowMultiple: false,
                            content: function () {
                                if (!card?.cards.some(card => { return get.position(card, true) !== 'o' })) target.equip(card);
                                //if(cards.length&&get.position(cards[0],true)=='o') target.equip(cards[0]);
                            },
                            toself: true,
                        },
                        'zq_jingangzhuo': {
                            image: 'ext:天庭/zq_jingangzhuo.png',
                            //derivation:'zq_taishanglaojun',
                            unique: true,
                            fullskin: true,
                            type: 'equip',
                            subtype: 'equip5',
                            skills: ['zqjingangzhuo'],
                            enable: true,
                            selectTarget: -1,
                            filterTarget: function (card, player, target) {
                                return target == player && target.canEquip(card, true);
                            },
                            modTarget: true,
                            allowMultiple: false,
                            content: function () {
                                if (!card?.cards.some(card => { return get.position(card, true) !== 'o' })) target.equip(card);
                                //if(cards.length&&get.position(cards[0],true)=='o') target.equip(cards[0]);
                            },
                            toself: true,
                            ai: {
                                basic: {
                                    equipValue: 3,
                                    order: function (card, player) {
                                        if (player && player.hasSkillTag('reverseEquip')) {
                                            return 8.5 - get.equipValue(card, player) / 20;
                                        }
                                        else {
                                            return 8 + get.equipValue(card, player) / 20;
                                        }
                                    },
                                    useful: 2,
                                    value: function (card, player, index, method) {
                                        if (player.isDisabled(get.subtype(card))) return 0.01;
                                        var value = 0;
                                        var info = get.info(card);
                                        var current = player.getEquip(info.subtype);
                                        if (current && card != current) {
                                            value = get.value(current, player);
                                        }
                                        var equipValue = info.ai.equipValue;
                                        if (equipValue == undefined) {
                                            equipValue = info.ai.basic.equipValue;
                                        }
                                        if (typeof equipValue == 'function') {
                                            if (method == 'raw') return equipValue(card, player);
                                            if (method == 'raw2') return equipValue(card, player) - value;
                                            return Math.max(0.1, equipValue(card, player) - value);
                                        }
                                        if (typeof equipValue != 'number') equipValue = 0;
                                        if (method == 'raw') return equipValue;
                                        if (method == 'raw2') return equipValue - value;
                                        return Math.max(0.1, equipValue - value);
                                    },
                                },
                                result: {
                                    target: function (player, target, card) {
                                        return get.equipResult(player, target, card);
                                    },
                                },
                            },
                        },
                        'zq_jingubang': {
                            image: 'ext:天庭/zq_jingubang.png',
                            //derivation:'zq_sunwukong',
                            unique: true,
                            fullskin: true,
                            type: 'equip',
                            subtype: 'equip1',
                            distance: {
                                attackFrom: -Infinity,
                            },
                            skills: ['zqjingubang'], //,'zqjingubang1'
                            selectTarget: -1,
                            filterTarget: function (card, player, target) {
                                return target == player && target.canEquip(card, true);
                            },
                            modTarget: true,
                            allowMultiple: false,
                            content: function () {
                                if (!card?.cards.some(card => { return get.position(card, true) !== 'o' })) target.equip(card);
                                //if(cards.length&&get.position(cards[0],true)=='o') target.equip(cards[0]);
                            },
                            toself: true,
                            enable: true,
                            ai: {
                                order: 15,
                                equipValue: function (card, player) {
                                    if (player.hp < 4 && !player.hasSkill('zqzhanfo')) return 0;
                                    if (player.countCards('h') < 2) return 0;
                                    if (player.countCards('h', 'zq_jingubang')) return 12;
                                    if (player.getStat().card.sha >= 2) return 1;
                                    return 3;
                                },
                                basic: {
                                    equipValue: 6,
                                    order: function (card, player) {
                                        if (player && player.hasSkillTag('reverseEquip')) {
                                            return 8.5 - get.equipValue(card, player) / 20;
                                        }
                                        else {
                                            return 8 + get.equipValue(card, player) / 20;
                                        }
                                    },
                                    useful: 2,
                                    value: function (card, player, index, method) {
                                        if (player.isDisabled(get.subtype(card))) return 0.01;
                                        var value = 0;
                                        var info = get.info(card);
                                        var current = player.getEquip(info.subtype);
                                        if (current && card != current) {
                                            value = get.value(current, player);
                                        }
                                        var equipValue = info.ai.equipValue;
                                        if (equipValue == undefined) {
                                            equipValue = info.ai.basic.equipValue;
                                        }
                                        if (typeof equipValue == 'function') {
                                            if (method == 'raw') return equipValue(card, player);
                                            if (method == 'raw2') return equipValue(card, player) - value;
                                            return Math.max(0.1, equipValue(card, player) - value);
                                        }
                                        if (typeof equipValue != 'number') equipValue = 0;
                                        if (method == 'raw') return equipValue;
                                        if (method == 'raw2') return equipValue - value;
                                        return Math.max(0.1, equipValue - value);
                                    },
                                },
                                result: {
                                    target: function (player, target, card) {
                                        return get.equipResult(player, target, card);
                                    },
                                },
                            },
                        },

                    },

                    skill: {
                        'zqwucaishi': {
                            audio: 'ext:天庭:0',
                            equipSkill: true,
                            forced: true,
                            trigger: {
                                player: 'dying',
                            },
                            filter: function (event, player) {
                                return player.hp <= 0;
                            },
                            content: function () {
                                'step 0'
                                if (_status.zqBroken && _status.zqBroken.includes('zqwucaishi')) var num = 1;
                                else var num = player.maxHp - player.hp;
                                if (num > 0) player.draw(num);
                                else event.finish();
                                'step 1'
                                if (result) {
                                    player.showCards(result, get.translation(player) + '发动了【五彩石】');
                                    var num = 0;
                                    for (var card of result) {
                                        if (card.suit == 'heart' || card.suit == 'diamond') num++;
                                    }
                                    if (num > 0) player.recover(num);
                                }
                            },
                        },
                        //'zqwucaishi_lose':{equipSkill:true}, //已废弃
                        'zqqixingjian': {
                            audio: 'ext:天庭:0',
                            equipSkill: true,
                            mod: {
                                aiUseful: function (player, card, num) {
                                    if (get.name(card) == 'sha') return num + 2.1;
                                    return;
                                },
                            },
                            trigger: {
                                player: 'useCardToPlayered',
                                target: 'useCardToTargeted',
                            },
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                if (event.target == player) return get.name(event.card) == 'sha' && event.target.countCards('h', function (card) {
                                    return get.name(card) == 'sha';
                                }) > 0;
                                return get.name(event.card) == 'sha';
                            },
                            content: function () {
                                'step 0'
                                var target = trigger.target;
                                if (target != player) trigger.getParent().directHit.push(target);
                                var next = target.chooseToRespond((target == player) ? '【七星剑】：你可以打出一张【杀】抵消之' : '【七星剑】：你无法使用【闪】，但你可以打出一张【杀】抵消之', function (card, player) {
                                    var name = get.name(card);
                                    return name == 'sha';
                                });
                                next.set('respondTo', [player, trigger.card]);
                                next.set('ai', function (card) {
                                    if (target != _status.event.player || ai.get.effect(_status.event.player, { name: 'sha' }, target, _status.event.player) < 0) return 1 + get.order(card);
                                    return 0;
                                });
                                next.autochoose = lib.filter.autoRespondSha;
                                'step 1'
                                if (result.bool && result.bool != false) {
                                    const audio = ['zqqixingjian1', 'zqqixingjian2'].randomGet();
                                    game.playAudio('../extension/天庭/audio/card/' + audio + '.mp3');
                                    trigger.getParent().targets.remove(trigger.target);
                                    trigger.target.logSkill('zqqixingjian');
                                    game.log(trigger.target, '打出', result.cards, '抵消了', trigger.card);
                                }
                            },
                            ai: {
                                'directHit_ai': true,
                                skillTagFilter: function (player, tag, arg) {
                                    return player != arg.target && get.name(arg.card) == 'sha';
                                },
                            },
                        },
                        'zqhuangjinsheng2': {
                            audio: 'ext:天庭:0',
                            equipSkill: true,
                            forced: true,
                            trigger: { player: 'phaseBegin' },
                            filter: function (event, player) {
                                return event.player.getEquip('zq_huangjinsheng');
                            },
                            content: function () {
                                game.playAudio('../extension/天庭/audio/card/zqhuangjinsheng.mp3');
                                if (trigger.player.getEquip('zq_huangjinsheng')) {
                                    trigger.player.gain(trigger.player.getEquip('zq_huangjinsheng'), trigger.player, 'give', 'bySelf');
                                    game.log(trigger.player, '挣脱了法宝【幌金绳】');
                                }
                            },
                        },
                        'zqhuangjinsheng1': {
                            audio: 'ext:天庭:0',
                            equipSkill: true,
                            forced: true,
                            charlotte: true,
                            trigger: { global: 'phaseAfter' },
                            filter: function (event, player) {
                                if (!_status.zqhuangjinsheng) return false;
                                var id = event.player.playerid; //回合结束角色ID
                                var card = player.getEquip('zq_huangjinsheng');
                                return _status.zqhuangjinsheng[id] && event.player == _status.zqhuangjinsheng[id] && card && card.storage.zqhuangjinsheng && card.storage.zqhuangjinsheng == id;
                            },
                            content: function () {
                                game.playAudio('../extension/天庭/audio/card/zqhuangjinsheng.mp3');
                                var id = trigger.player.playerid;
                                var card = player.getEquip('zq_huangjinsheng');
                                if (_status.zqhuangjinsheng && _status.zqhuangjinsheng[id] && trigger.player == _status.zqhuangjinsheng[id] && card && card.storage.zqhuangjinsheng && card.storage.zqhuangjinsheng == id) {
                                    game.log(_status.zqhuangjinsheng[id], '收回了法宝【幌金绳】');
                                    _status.zqhuangjinsheng[id].gain(card, player, 'give', 'bySelf');
                                    delete card.storage.zqhuangjinsheng;
                                }
                            },
                        },
                        'zqhuangjinsheng': {
                            audio: 'ext:天庭:0',
                            equipSkill: true,
                            forced: true,
                            mod: {
                                'cardEnabled2': function (card, player) {
                                    if (get.position(card) == 'h') return false;
                                },
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, 'damage')) return [0, -999];
                                    },
                                },
                            },
                            trigger: { target: ['zq_yongjian_zengyuEnd', '_yongjian_zengyuEnd', '_giftingEnd'] },
                            content: function () {
                                game.playAudio('../extension/天庭/audio/card/zqhuangjinsheng.mp3');
                                player.markSkillCharacter('zqhuangjinsheng', trigger.player, '幌金绳·缚', '无法使用、打出手牌');
                                var id = trigger.player.playerid; //主人ID
                                if (!_status.zqhuangjinsheng) _status.zqhuangjinsheng = {};
                                trigger.cards[0].storage.zqhuangjinsheng = id; //卡牌储存主人ID
                                _status.zqhuangjinsheng[id] = trigger.player; //主人名字
                            },
                            group: ['zqhuangjinsheng1', 'zqhuangjinsheng2'],
                        },
                        'zqjingangzhuo': {
                            audio: 'ext:天庭:0',
                            enable: 'phaseUse',
                            usable: 1,
                            equipSkill: true,
                            filterTarget: function (card, player, target) {
                                return target.countGainableCards(player, 'e', function (card) {
                                    return card.name != 'zq_jingangzhuo';
                                }) > 0;
                            },
                            content: function () {
                                if (target.countGainableCards(player, 'e')) {
                                    player.gainPlayerCard('e', target, true).set('filterButton', function (button) {
                                        return button.link.name != 'zq_jingangzhuo';
                                    });
                                }
                            },
                            ai: {
                                order: 10,
                                threaten: 1,
                                result: {
                                    target: function (player, target) {
                                        if (get.attitude(player, target) <= 0) return (target.countCards('e', function (card) {
                                            return get.value(card, target) > 0 && card != target.getEquip('jinhe');
                                        }) > 0) ? -1.5 : 1.5;
                                        return (target.countCards('e', function (card) {
                                            return get.value(card, target) <= 0;
                                        }) > 0) ? 1.5 : -1.5;
                                    },
                                    player: function (player, target) {
                                        if (get.attitude(player, target) <= 0 && !target.countCards('e', function (card) {
                                            return get.value(card, target) > 0 && card != target.getEquip('jinhe');
                                        })) return 0;
                                        if (get.attitude(player, target) > 1) {
                                            return (target.countCards('e', function (card) {
                                                return get.value(card, target) <= 0;
                                            }) > 0) ? 1.5 : -1.5;
                                        }
                                        return 1;
                                    },
                                },
                                tag: {
                                    gain: 1,
                                },
                            },
                        },
                        'zqjingubang': {
                            audio: 'ext:天庭:0',
                            mod: {
                                maxHandcard: function (player, num) {
                                    return num - 2;
                                },
                                cardUsable: function (card, player, num) {
                                    if (card.name == 'sha') return num + 1;
                                },
                            },
                            trigger: {
                                player: 'equipAfter',
                            },
                            forced: true,
                            equipSkill: true,
                            filter: function (event, player) {
                                return event.card.name == 'zq_jingubang';
                            },
                            content: function () {
                                player.loseHp();
                            },
                            group: 'zqjingubang1',
                        },
                        'zqjingubang1': {
                            audio: 'ext:天庭:0',
                            equipSkill: true,
                            trigger: {
                                source: 'damageBegin1',
                            },
                            filter: function (event) {
                                return event.card && event.card.name == 'sha';
                            },
                            forced: true,
                            content: function () {
                                const audio = ['zqjingubang1', 'zqjingubang2'].randomGet();
                                game.playAudio('../extension/天庭/audio/card/' + audio + '.mp3');
                                trigger.num++;
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target, current) {
                                        if (card.name == 'sha' && !target.hasSkillTag('filterDamage', null, {
                                            player: player,
                                            card: card,
                                        })) return [1, 0, 1, -3];
                                    },
                                },
                            },
                        },

                        zq_yongjian_zengyu: {
                            enable: 'phaseUse',
                            forceDie: true,
                            forceLoad: true,
                            filter: (event, player) => !lib.skill.global.includes('_gifting') && player.hasCard(card => lib.skill.zq_yongjian_zengyu.filterCard(card, player), lib.skill.zq_yongjian_zengyu.position),
                            filterCard: function (card) {
                                return get.tag(card, 'zq_gifts');
                            },
                            filterTarget: function (card, player, target) {
                                if (player == target) return false;
                                var card = ui.selected.cards[0];
                                if (get.type(card, false) == 'equip') {
                                    return target.canEquip(card, true);
                                }
                                return true;
                            },
                            discard: false,
                            lose: false,
                            delay: false,
                            check: function (card) {
                                var player = _status.event.player;
                                if (get.tag(card, 'zq_gifts') && get.type(card, false) == 'equip' && game.hasPlayer(function (current) {
                                    return current != player && current.canEquip(card, true) && !current.hasSkillTag('refuseGifts') && get.effect(current, card, player, player) > 0;
                                })) return 2;
                                if (!player.needsToDiscard()) return 0;
                                return 1 + Math.random();
                            },
                            content: function () {
                                'step 0'
                                if (event._zengyu_denied) {
                                    player.$throw(cards[0], 1000);
                                    player.lose(cards, ui.discardPile, 'visible');
                                }
                                else {
                                    if (get.type(cards[0], false) == 'equip') {
                                        player.$give(cards[0], target, false);
                                        game.delay(0.5);
                                        target.equip(cards[0]);
                                    }
                                    else {
                                        target.gain(cards, player, 'give');
                                        event.finish();
                                    }
                                }
                                'step 1'
                                game.delayx();
                            },
                            ai: {
                                order: function (item, player) {
                                    if (player.hasCard(function (card) {
                                        return get.tag(card, 'zq_gifts') && get.type(card, false) == 'equip' && game.hasPlayer(function (current) {
                                            return current != player && current.canEquip(card, true) && !current.hasSkillTag('refuseGifts') && get.effect(current, card, player, player) > 0;
                                        });
                                    }, 'h')) return 7;
                                    return 0.51;
                                },
                                result: {
                                    target: function (player, target) {
                                        var card = ui.selected.cards[0];
                                        if (!card || target.hasSkillTag('refuseGifts')) return 0;
                                        if (get.type(card, false) == 'equip') return get.effect(target, card, target, target);
                                        if (card.name == 'du') return player.hp > target.hp ? -1 : 0;
                                        if (target.hasSkillTag('nogain')) return 0;
                                        return Math.max(1, get.value(card, player) - get.value(card, target));
                                    },
                                },
                            },
                        },

                        zq_huanhundan_die: {
                            fixed: true,
                            forced: true,
                            forceDie: true,
                            charlotte: true,
                            superCharlotte: true,
                            trigger: { player: 'dieAfter' },
                            filter: function (event, player) {
                                if (_status.zq_huanhundan) return _status.zq_huanhundan.includes(event.player.playerid);
                                return false;
                            },
                            content: function () {
                                var targetd = trigger.player;
                                if (_status.currentPhase && _status.currentPhase == targetd) get.event().getParent('phaseLoop').player = targetd.getPrevious(); //修复跳过下家回合bug
                                if(game.removePlayerOL) game.removePlayerOL(targetd, { animate: false });
                                else {
                                    game.broadcastAll(function (player, targetd) {
                                        if(game.removePlayer) game.removePlayer(targetd);
                                        const players = game.players.concat(game.dead);
                                        if (player.getSeatNum() > 0) {
                                            const seatNum = player.getSeatNum();
                                            players.forEach((value) => {
                                                if (value.getSeatNum() > seatNum) value.setSeatNum(value.getSeatNum() - 1);
                                            });
                                        }
                                        if (_status.connectMode) delete lib.playerOL[targetd.playerid];
                                        targetd.classList.add('dead');
                                        targetd.classList.add('out');
                                        targetd.style.display = 'none';
                                        targetd.delete();
                                        targetd.removed = true;
                                        setTimeout(() => { targetd.removeAttribute('style') }, 500);
                                    }, player, targetd);
                                }
                                game.broadcastAll((targetd) => { game.players.remove(targetd); game.dead.remove(targetd); game.arrangePlayers() }, targetd); //修复联机不刷新上下家
                                game.log('✘', targetd, '魂飞魄散');
                            },
                        },

                    },
                    translate: {
                        //卡牌
                        zq_dan: '丹',
                        zq_dan_info: '●长生丹：<br>用法：①出牌阶段，对自己使用；②对场上一名处于濒死状态的角色使用。<br>效果：目标角色摸一张牌、增加一点体力上限并恢复一点体力。<br>●还魂丹：<br>用法：出牌阶段，对游戏内一名死亡的角色使用。<br>效果：目标角色以其武将牌上的体力复活并摸三牌。若如此做，其死亡后移出游戏外。<br>（此牌为虚拟牌或转化牌时无效果）',
                        'zq_jingangzhuo': '金刚琢',
                        'zq_jingangzhuo_info': '出牌阶段限一次，你可以从场上获得一张其他装备牌。——“太上老君的法器。',
                        'zq_huangjinsheng': '幌金绳',
                        'zq_huangjinsheng_info': '①锁定技，你无法使用、打出手牌。回合开始时，你从装备栏中获得此牌。②锁定技，当其他角色因赠予而将此牌置入你的装备栏后，该角色于当前回合结束后从你的装备栏中获得此牌。——“太上老君勒袍之绳。',
                        'zq_qixingjian': '七星剑',
                        'zq_qixingjian_info': '①锁定技，当你使用【杀】指定目标后，目标角色能且只能打出一张【杀】抵消之。②当你成为【杀】的目标后，你可以打出一张【杀】抵消之。——“太上老君炼魔之剑。',
                        'zq_jingubang': '金箍棒',
                        'zq_jingubang_info': '①锁定技，手牌上限-2。此牌进入你的装备区时，你失去一点体力。②当你使用【杀】造成伤害时，此伤害+1。出牌阶段，你可以多使用一张【杀】。——“如意金箍棒，重一万三千五百斤。',
                        'zq_wucaishi': '五彩石',
                        'zq_wucaishi_info': '锁定技，①当你进入濒死状态时，你摸X张牌并展示之，其中每有一张红色牌，你回复1点体力（X为你已损失的体力值）。<br>②此牌离开你的装备区后，在本局游戏中将【五彩石①】中的“X”改为“1”。——“传说中女娲炼石补天之时遗留下的一块五彩神石。',

                        //技能
                        'zqwucaishi': '五彩石',
                        'zqwucaishi_info': '锁定技，①当你进入濒死状态时，你摸X张牌并展示之，其中每有一张红色牌，你回复1点体力（X为你已损失的体力值）。<br>②此牌离开你的装备区后，在本局游戏中将【五彩石①】中的“X”改为“1”。',
                        'zqjingangzhuo': '金刚琢',
                        'zqjingangzhuo_info': '出牌阶段限一次，你可以从场上获得一张其他装备牌。',
                        'zqhuangjinsheng': '幌金绳',
                        'zqhuangjinsheng_info': '①锁定技，你无法使用、打出手牌。回合开始时，你从装备栏中获得此牌。②锁定技，当其他角色因赠予而将此牌置入你的装备栏后，该角色于当前回合结束后从你的装备栏中获得此牌。',
                        'zqhuangjinsheng1': '幌金绳',
                        //'zqhuangjinsheng1_info':'②锁定技，当其他角色因赠予而将此牌置入你的装备栏后，该角色于当前回合结束后从你的装备栏中获得此牌。',
                        'zqhuangjinsheng2': '幌金绳',
                        //'zqhuangjinsheng2_info':'③锁定技，回合开始时，你从装备栏中获得此牌。',
                        'zqqixingjian': '七星剑',
                        'zqqixingjian_info': '①锁定技，当你使用【杀】指定目标后，目标角色能且只能打出一张【杀】抵消之。②当你成为【杀】的目标后，你可以打出一张【杀】抵消之。',
                        'zqjingubang': '金箍棒',
                        'zqjingubang_info': '①锁定技，手牌上限-2。此牌进入你的装备区时，你失去一点体力。②锁定技，当你使用【杀】造成伤害时，此伤害+1。出牌阶段，你可以多使用一张【杀】。',
                        'zqjingubang1': '金箍棒',
                        //'zqjingubang1_info':'③锁定技，当你使用【杀】造成伤害时，此伤害+1。',

                        //赠予
                        zq_yongjian_zengyu: '赠',
                        zq_yongjian_zengyu_info: '出牌阶段，你可将一张拥有“赠”标签的手牌区装备牌置于一名其他角色的装备区内，或将一张拥有“赠”标签的手牌区非装备牌正面朝上交给一名其他角色。',
                        zq_gifts_tag: '赠',

                    }, list: [
                        ['heart', 1, 'zq_dan'],
                        ['diamond', 1, 'zq_dan'],
                        ['club', 1, 'zq_dan', null, ['gifts']],
                        ['spade', 1, 'zq_dan', 'zqrevive', ['gifts']],
                        ['club', 13, 'zq_huangjinsheng', null, ['gifts']],
                        ['spade', 13, 'zq_qixingjian'],
                        ['heart', 13, 'zq_jingangzhuo'],
                        ['diamond', 13, 'zq_jingubang'],
                        //['heart',12,'zq_wucaishi'],
                    ],
                };

                //武将
                var ziqi = {
                    name: 'ziqi',
                    connect: true,
                    func: function () {
                        lib.group.add('zqfo');
                        lib.groupnature.zqfo = 'zqfo';
                        lib.translate.zqfo = '佛';
                        lib.translate.zqfo2 = '佛门';
                        lib.translate.group_zqfo_bg = '佛';
                        lib.translate.group_zqfo = '佛势力';
                        lib.translate.group_western = '西势力';
                        //game.addGroup( 'zqfo', '佛', '佛门', { background: "#FFD700", text: "#fff8e8", border: "#aa8833", list: [] }, 'all'); //佛重新选势力，但只有人机能选出佛
                    },
                    characterSort: {
                        ziqi: {
                            'zq_tianting': ['zq_nvwa', 'zq_pangu', 'zq_zhaogongming', 'zq_sanshifo', 'zq_yuhuangdadi', 'zq_yanluowang', 'zq_sunwukong', 'zq_nezha', 'zq_leishen', 'zq_taishanglaojun', 'zq_jiangziya', 'zq_yangjian', 'zq_yuelao'],
                            'zq_shenjiang': ['zq_shenxusheng', 'zq_shenzuoci', 'zq_shencaozhi', 'zq_shenzhugeguo'],
                            'zq_tianxia': ['sp_zq_sunquan', 'sp_zq_caocao', 'sp_zq_liushan', 'sp_zq_zhoutai'],
                        },
                    },
                    characterTitle: {
                        'zq_nvwa': '大地之母',
                        'zq_leishen': '九天雷祖',
                        'zq_sunwukong': '斗战胜佛',
                        'zq_shencaozhi': '七步成诗',
                        'zq_nezha': '金环元帅',
                        'zq_shenxusheng': '势不可挡',
                        'zq_yuhuangdadi': '三界之主',
                        'zq_shenzhugeguo': '羽化飞仙',
                        'sp_zq_zhoutai': '舍命救主',
                        'zq_shenzuoci': '金丹戏侯',
                        'zq_yanluowang': '五殿阎王',
                        'zq_taishanglaojun': '道德天尊',
                        'zq_jiangziya': '愿者上钩',
                        'zq_sanshifo': '娑婆教主',
                        'sp_zq_liushan': '乐不思蜀',
                        'sp_zq_caocao': '梦中杀人',
                        'sp_zq_sunquan': '大魏吴王',
                        'zq_zhaogongming': '玄坛真君',
                        'zq_pangu': '开天辟地',
                        'zq_yangjian': '清源妙道',
                        'zq_yuelao': '月下老人',
                    },
                    character: {
                        'zq_nvwa': ['female', 'shen', 3, ['zqzaoren', 'zqbutian'], ['gzgroup:ye']],
                        'zq_yuelao': ['male', 'shen', 3, ['zqhongxian', 'zqhunbu'], ['gzgroup:ye']],
                        'zq_yangjian': ['male', 'shen', 4, ['zqxiaotian', 'zqtianyan', 'zqxuangong'], ['gzgroup:ye']],
                        'zq_pangu': ['male', 'shen', 4, ['zqkaitian', 'zqchuangshi'], ['gzgroup:ye']],
                        'zq_zhaogongming': ['male', 'shen', 3, ['zqzhaocai', 'zqzhaobao', 'zqnazhen', 'zqlishi'], ['gzgroup:ye']],
                        'sp_zq_sunquan': ['male', 'wei', 4, ['zqchengchen', 'zqwuwang'], ['gzgroup:wei']],
                        'sp_zq_caocao': ['male', 'wei', 4, ['zqjiamei', 'zqyixin', 'zqbaoqi'], ['gzgroup:wei']],
                        'sp_zq_liushan': ['male', 'shu', 1, ['zqzhengtong', 'zqanle', 'zqguixiang', 'zqtuiwei'], ['gzgroup:shu', 'zhu']],
                        'zq_sanshifo': ['male', 'zqfo', 3, ['zqsanshi'], ['gzgroup:ye']],
                        'zq_jiangziya': ['male', 'shen', 4, ['zqchuidiao', 'zqshenshi', 'zqshenbian'], ['gzgroup:ye']],
                        'zq_taishanglaojun': ['male', 'shen', 3, ['zqdanlu', 'zqlianqi'], ['gzgroup:ye']],
                        'zq_leishen': ['male', 'shen', 4, ['zqleizu', 'zqshandian', 'zqsanyan'], ['gzgroup:ye']],
                        'zq_sunwukong': ['male', 'zqfo', 5, ['zqhuoyan', 'zqzhanfo', 'zqjiubing'], ['gzgroup:ye']],
                        'zq_shencaozhi': ['male', 'shen', '2/3', ['zqqibu', 'zqchengshi'], ['gzgroup:wei']],
                        'zq_nezha': ['male', 'shen', 4, ['zqfaxiang', 'zqfabao'], ['gzgroup:ye']],
                        'zq_shenxusheng': ['male', 'shen', 4, ['zqxushi', 'zqpodi', 'zqyicheng'], ['gzgroup:wu']],
                        'zq_yuhuangdadi': ['male', 'shen', '3/12', ['zqtianma', 'zqxingshan', 'zqjide', 'zqzhengdi'], ['gzgroup:ye']],
                        'zq_shenzhugeguo': ['female', 'shen', 3, ['zqbinan', 'zqxiudao', 'zqfeisheng'], ['gzgroup:shu']],
                        'sp_zq_zhoutai': ['male', 'wu', 2, ['zqdouhun', 'zqboming', 'zqjiuzhu'], ['gzgroup:wu']],
                        'zq_shenzuoci': ['male', 'shen', 3, ['zqhuanhua', 'zqjinye', 'zqjiuding'], ['gzgroup:qun']],
                        'zq_yanluowang': ['male', 'shen', 3, ['zqmingti', 'zqguiwang'], ['gzgroup:ye']],
                    },
                    characterIntro:{
                        zq_nvwa: '大地之母：“女娲，又称娲皇，是中国上古神话中的创世女神。是华夏民族人文先始，是补天救世的英雄和抟土造人的女神，还是一个创造万物的自然之神。女娲神通广大，化生万物，被称为大地之母，是被民间广泛流传而又长久崇拜的创世神和始母神。2023.05”',
                        zq_nvwa_shibing: '士兵：“无名氏，一名被女娲创造出的人类。”',
                        zq_yuelao: '月下老人：“柴道煌，又称月下老人，简称月老，是汉族民间传说中主管婚姻的姻缘神，也就是媒神。常被塑造成一手挽着红丝线，一手携杖悬婚姻簿，鹤发童颜的仙人。依据“婚姻簿”用红丝线将姻缘命定的男女系足，从此无论如何他们都将成为夫妻。2023.09”',
                        zq_yangjian: '清源妙道：“杨戬，号清源妙道真君，俗称杨二郎。是玉鼎真人的徒弟，修成七十二变、九转玄功，无穷妙道，肉身成圣。神通广大、机智巧变，是三代弟子中的佼佼者。二郎神信仰形成于唐代，兴盛于两宋，其中劈山救母、担山赶日的传说广为流传。2023.05”',
                        zq_pangu: '开天劈地：“盘古，又称盘古氏，是中国古代神话传说中的创世神，由形如鸡卵的混沌之中孕育而生，沉睡而醒后将清浊二气上下撑开，形成了天地，最终因疲惫而倒，声与气以及身体各部分化为世间万物。2023.04”',
                        zq_zhaogongming: '玄坛真君：“赵公明，名朗，字公明，琅琊古来有之。昔者天上生十日，尧帝命羿射九日。其八坠海为仙，海上八仙是也。余一陨于天台，其身为石，太阳石是也，其精为人，赵公明是也。既长成，至峨眉山修炼，得神仙之术。商周交兵，遂受闻太师之邀下山助商，失利为姜太公所杀。姜子牙岐山封神，赵公明受封玄坛真君，其精附石，神体合一，辖招宝天尊、纳珍天尊、招财使者、利市仙官，专司人间迎祥纳福之责。2022.11”',
                        sp_zq_sunquan: '大魏吴王：“孙权，字仲谋，吴郡富春县人，孙吴开国皇帝、政治家、军事统帅。221年刘备为了夺回荆州，为关羽报仇，发动夷陵之战攻打东吴，孙权暂时向曹丕称臣，受封为吴王，于次年大破蜀军，稳固了吴国疆土。222年曹丕破盟伐吴败走。229年孙权于武昌登基为帝，国号吴。252年病逝，谥号大皇帝，庙号太祖。据崔豹《古今注》记载：孙权有六柄宝剑，称为“吴六剑”，分别名为白虹、紫电、辟邪、流星、青冥、百里。2023.03”',
                        sp_zq_caocao: '梦中杀人：“曹操，字孟德，小名阿瞒、吉利，沛国谯人。三国时期魏武帝，精兵法善诗歌，乃治世之能臣，乱世之奸雄也。曹操生性多疑，恐人暗中谋害己身，常吩咐左右：“吾梦中好杀人；凡吾睡着，汝等切勿近前。”一日，昼寝帐中，落被于地，一近侍慌取覆盖。曹操跃起拔剑斩之，复上床睡；半晌而起，佯惊问：“何人杀吾近侍？”众以实对。曹操痛哭，命厚葬之。2022.08”',
                        sp_zq_liushan: '乐不思蜀：“刘禅，字公嗣，小名阿斗。三国时期蜀汉末代皇帝，汉昭烈帝刘备之子。早期任相父诸葛亮北伐，后期不理朝政，宠信宦官黄皓。景耀六年，刘禅投降邓艾，被封为安乐公，和蜀汉大臣被迁往洛阳度过余生。西晋泰始七年去世，享年65岁，谥号为思。西晋末年，汉赵刘渊称帝，追谥刘禅为汉朝孝怀皇帝。2022.08”',
                        zq_sanshifo: '如来佛祖：“三世佛，是大乘佛教的主要崇敬对象，俗称“三宝佛”。根据印度哲学，时间和空间是混淆的，因此三世佛分为以空间计算的“横三世佛”与以时间计算的“纵三世佛”。<br>横三世佛（又名三方佛）：指中央释迦牟尼佛，东方药师佛，西方阿弥陀佛。<br>纵三世佛（又名三世佛）：指过去佛燃灯古佛，现在佛释迦牟尼佛，未来佛弥勒尊佛。<br>“如来”是佛祖的十大尊号之一，无所从来，亦无所去，故名如来。“如来佛祖”有很多，在中国一般指释迦牟尼。2023.02”',
                        zq_jiangziya: '愿者上钩：“姜子牙，名尚，字子牙，商末周初政治家、军事家、韬略家，著书《六韬》。其先祖曾辅佐夏禹治理水土有大功，受封吕地，又称吕尚。其垂钓于渭水之滨时，遇见求贤若渴的西伯侯姬昌，拜为“太师”，尊称太公望，辅佐姬昌灭商伐纣，建立周朝，后辅佐周公旦，平定内乱，开疆扩土，促成成康之治。周康王六年，病逝于镐京。历代皇帝和文史典籍尊其为兵家鼻祖、武圣、百家宗师。2022.08”',
                        zq_taishanglaojun: '太上老君：“李耳，老子原名李耳，为周代史官，创建了诸子百家之一的道家，被后世奉为道祖。《道德经》为其所作，经过张道陵重新诠释，写为《老子想尔注》，其中的老子首次成为太上老君，是大道的化身。道教中的太上老君为“三清”尊神之一的道德天尊，曾解化女娲之名炼石补天。擅长炼制法宝兵器和金丹。在《西游记》中为天庭御用铁匠，曾用八卦炉打造金刚镯、紫金红葫芦、羊脂玉净瓶、幌金绳、芭蕉扇、七星剑等多件法宝，还曾锻造过定海神珍（孙悟空的金箍棒）、九齿钉耙（现为猪八戒兵器）、紫金铃（已赠与观音菩萨）、火眼金睛（孙悟空的神通）。2022.12”',
                        zq_leishen: '九天雷祖：“闻仲，为商朝太师，帝乙托孤大臣，受纣王敬重。曾拜师截教碧游宫金灵圣母门下，坐下墨麒麟，手使雌雄鞭，头生三眼，可辨奸邪忠肝，时与黄飞虎并称为殷商文武双璧。封神一战，闻太师兵伐西岐，在绝龙岭对阵姜尚时，亡于云中子奉敕所炼的通天神火柱。后姜子牙归国封神，闻仲受封为九天应元雷声普化天尊，督率雷部二十四正神。2022.11”',
                        zq_sunwukong: '斗战胜佛：“孙悟空，又称齐天大圣，出自中国古典神魔小说《西游记》。从天地初开时的仙石中孕育而生，拜师于菩提祖师，得名孙悟空，在东海龙宫取得如意金箍棒，后大闹天庭，战胜李天王和哪吒三太子，偷吃太上老君的金丹，在八卦炉中被熏成火眼金睛。与如来佛祖的打赌斗法中失利后，保护唐僧西天取经，历经九九八十一难，取得真经修成正果，最后被封为斗战胜佛。2022.11”',
                        zq_shencaozhi: '七步成诗：“曹植，字子建，沛国谯人，三国曹魏著名文学家，建安文学代表人物。魏武帝之子，魏文帝之弟，生前曾为陈王，谥号“思”，又称陈思王。有“天下才有一石，曹子建独占八斗”的评价。更有诗家堪称“仙才”者，为曹植、李白、苏轼三人耳。”《世说新语·文学篇》:“文帝尝令东阿王七步中做诗，不成者行大法。应声便为诗，帝深有惭色。2022.11”',
                        zq_nezha: '金环元帅：“哪吒，神话传说中的神仙，梵名译作“那拏天”，号中坛元帅，佛道儒并尊的降魔天神。小时候曾闹海杀龙，流传有哪吒闹海的传说，为托塔天王李靖与殷夫人的第三太子，兄为金吒与木吒，妹为李贞英与半截观音，师为太乙真人与如来佛祖。2022.09”',
                        zq_shenxusheng: '势不可挡：“徐盛，字文向，琅邪莒县人。三国时期孙吴名将。初时因讨伐山贼有功被加为中郎将，之后于濡须口之战，独自率军击破曹操军队，刘备伐吴时，跟随陆逊攻下蜀军多处屯营；曹休伐吴时，徐盛在形势不利的情况下以少胜多，成功御敌。因前后战功，升任安东将军，任庐江太守。被陈寿盛赞为“江表之虎臣”。魏文帝曹丕伐吴时，徐盛以疑城之计退去魏军。2022.05”',
                        zq_yuhuangdadi: '三界之主：“张友仁，太上开天，执符御历，含真体道，金阙云宫，九穹御历，万道无为，大道明殿，昊天金阙，至尊玉皇，赦罪大天尊，玄穹高上帝”，居于太微玉清宫。三界至高统治者。2022.06',
                        zq_shenzhugeguo: '羽化飞仙：“诸葛果，为《历代神仙通鉴》中诸葛亮女儿的名字，此书记录从上古到明代的神仙历史，因此诸葛果不见于任何史书。成都西南有朝真观，即乘烟观。相传，诸葛果在这里修行，躲避战乱，最终修成仙道，羽化升天。2022.06”',
                        sp_zq_zhoutai: '舍命救主：“周泰，字幼平，吴国武将。早年跟随孙策。讨伐六县山贼时，周泰奋勇退敌，为保孙权，身受重伤十二处。合肥之战，曹操率大军围困孙权，周泰舍命杀敌，救出孙权后，复入敌阵救出徐盛，身中数十枪，肤如刻画。有诗云：三番救主出重围，忠勇如公世所稀。遍体疮痍犹痛饮，血痕残酒满征衣。2022.07”',
                        zq_shenzuoci: '金丹戏侯：“左慈，字元放，庐江人，自号乌角先生，东汉末年著名方士，少居天柱山，研习炼丹之术。明五经六甲，兼通星纬，传说能役使鬼神，坐致行厨。《抱朴子·金丹篇》载，左慈是葛玄之师。传其《太清丹经》、《金液丹经》及《九鼎丹经》。传闻曹操曾下令杀左慈，于是全城的人都变成了左慈，无法分辨出真假。有人杀掉一个，尸体竟化成了一捆茅草。2022.09”',
                        zq_yanluowang: '阎罗鬼王：“包拯，传说为掌管人间地狱众生灵寿命生死的鬼王，半神半鬼，家喻户晓的著名冥神，“黑白无常”、“牛头马面”两对鬼使差为其左膀右臂。《问地狱经》的记载称阎罗王生前是毗沙国的国王（民间传说为包拯）。原型为印度神话中的“阎摩罗王”，在早期佛教和印度教神话中，阎王是冥界唯一的死神之王，后来又扩编为十殿阎王。2022.07”',
                    },
                    skill: {
                        //女娲
                        zqzaoren: {
                            audio: 'ext:天庭/audio/skill/zq_nvwa:2',
                            usable: 1,
                            enable: 'phaseUse',
                            filter: function (event, player) {
                                return player.getNext()?.name != 'zq_nvwa_shibing' || player.getPrevious()?.name != 'zq_nvwa_shibing' //|| player.next?.name != 'zq_nvwa_shibing' || player.previous?.name != 'zq_nvwa_shibing';
                            },
                            onremove: true,
                            mark: true,
                            marktext: '人',
                            intro: {
                                name: '造人',
                                content: function (storage, player, skill) {
                                    if (player.storage.zqzaoren) return '共' + player.storage.zqzaoren.length + '个技能：' + get.translation(player.storage.zqzaoren);
                                    return '无记录';
                                },
                                markcount: 'mark',
                            },
                            content: function () {
                                'step 0'
                                game.broadcastAll(() => { game.arrangePlayers() }); //联机刷新上下家?
                                const n = player.getNext()?.name == 'zq_nvwa_shibing';
                                const p = player.getPrevious()?.name == 'zq_nvwa_shibing';
                                if(n && p) event.finish();
                                if(n) game.broadcastAll((player) => { player.storage.zq_zaoren_next = true }, player); //创建为上家
                                if(!n && !p) player.chooseControl('上家', '下家').set('prompt', '【造人】：请选择“士兵”的位置').set('ai', function(){ return '下家' });
                                'step 1'
                                if (result?.control && result.control == '上家') game.broadcastAll((player) => { player.storage.zq_zaoren_next = true }, player);
                                var sex1 = ['male', 'female'].randomGet();
                                game.broadcastAll((player, sex1) => {
                                    var group1 = player.group;
                                    game.addCharacter('zq_nvwa_shibing', {
                                        sex: sex1,
                                        group: group1,
                                        hp: 1,
                                        skills: [],
                                        groupInGuozhan: group1,
                                        isUnseen: true,
                                        extension: '衍生武将',
                                        translate: '士兵',
                                    });
                                    var szn = lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable'] && lib.config['extension_十周年UI_outcropSkin'] == 'shizhounian';
                                    var img = szn ? 'characters/' : '';
                                    var sex = sex1 == 'male' ? '1' : '2';
                                    lib.character['zq_nvwa_shibing'][4] = [`ext:天庭/character/${img}zq_nvwa_shibing${sex}.jpg`, 'unseen', group1];
                                }, player, sex1);
                                if (_status.characterlist) _status.characterlist.remove('zq_nvwa_shibing');
                                'step 2'
                                const ip = get.id?.() || Math.floor(Math.random() * 800000000);
                                game.broadcastAll((event, player, ip) => {
                                    let players = game.players.concat(game.dead);
                                    ui.arena.setNumber(parseInt(ui.arena.dataset.number) + 1);
                                    let position = player.storage.zq_zaoren_next ? parseInt(player.dataset.position) : parseInt(player.dataset.position)+1;
                                    if (position == 0) position = players.length;
                                    players.forEach(value => {
                                        if (parseInt(value.dataset.position) >= position) value.dataset.position = parseInt(value.dataset.position) + 1;
                                    });
                                    var zqshibingx = ui.create.player(ui.arena).addTempClass('start');
                                    zqshibingx.playerid = ip;
                                    zqshibingx._source = player || true;
                                    if (_status.connectMode) lib.playerOL[ip] = zqshibingx;
                                    else game.playerMap[ip] = zqshibingx;
                                    zqshibingx.init('zq_nvwa_shibing');
                                    game.players.push(zqshibingx);
                                    zqshibingx.dataset.position = position;
                                    game.arrangePlayers();
                                    if (player.storage.zq_zaoren_next) player.previous = zqshibingx; else player.next = zqshibingx;
                                    delete player.storage.zq_zaoren_next;
                                    event.zqshibing = zqshibingx;
                                }, event, player, ip);
                                let zqshibing = event.zqshibing;
                                if (!zqshibing.playerid) zqshibing.getId();
                                if (!_status.zqshibing_die) _status.zqshibing_die = [];
                                _status.zqshibing_die.add(zqshibing.playerid);
                                var id = player.playerid;
                                if (!_status.zqshibing_auto) _status.zqshibing_auto = {};
                                if (!_status.zqshibing_auto[id]) _status.zqshibing_auto[id] = [];
                                _status.zqshibing_auto[id].add(player.playerid, zqshibing.playerid);
                                game.log(player, '制造了', lib.translate['zq_nvwa_shibing']);
                                //初始化history和stat
                                zqshibing.actionHistory = new Array(player.actionHistory.length).fill({ useCard: [], respond: [], skipped: [], lose: [], gain: [], sourceDamage: [], damage: [], custom: [], useSkill: [] });
                                for (let i = 0; i < player.actionHistory.length; i++) { ['isRound', 'isSkipped'].forEach(key => {
                                    if (player.actionHistory[i][key]) zqshibing.actionHistory[i][key] = true;
                                })}
                                zqshibing.stat = new Array(player.stat.length).fill({ card: {}, skill: {}, triggerSkill: {} });
                                for (let i = 0; i < player.stat.length; i++) { ['isRound', 'isSkipped'].forEach(key => {
                                    if (player.stat[i][key]) zqshibing.stat[i][key] = true;
                                })}
                                //设置座次
                                let playerxs = game.players.concat(game.dead);
                                playerxs.sort((a, b) => a.dataset.position - b.dataset.position);
                                const reorder = (arr, fn) => { const i = arr.findIndex(fn); return i < 0 ? [...arr] : [...arr.slice(i), ...arr.slice(0, i)] };
                                let newPlayers = reorder(playerxs, x => x.getSeatNum() == 1);
                                for (var i = 0; i < newPlayers.length; i++) { newPlayers[i].setSeatNum(i + 1) }
                                ui.update();
                                //设置身份
                                game.broadcastAll((zqshibing, player) => {
                                    let identity = (zqshibing.identity = (identity => {
                                        switch (identity) {
                                            case 'zhu':
                                            case 'mingzhong': return 'zhong';
                                            case 'zhu_false': return 'zhong_false';
                                            case 'bZhu': return 'bZhong';
                                            case 'rZhu': return 'rZhong';
                                            case 'nei': return 'commoner'; //避免救主
                                            default: return identity;
                                        }
                                    })(player.identity));
                                    //if (get.mode() == 'doudizhu') 
                                    lib.translate['zhong'] = '忠';
                                    if (get.mode() == 'single') lib.translate['zhong'] = '先';

                                    if (player.side != null) { //对决模式，改顺序丢失身份图标
                                        zqshibing.side = player.side;
                                        //zqshibing.node.identity.innerHTML = player.node.identity.innerHTML; //导致对抗模式身份颜色错误
                                        zqshibing.node.identity.firstChild.innerHTML = player.node.identity.firstChild.innerHTML;
                                        zqshibing.node.identity.dataset.color = player.node.identity.dataset.color;
                                    }
                                    if (!lib.translate[identity]) {
                                        if (player.side == null) lib.translate[identity] = '民';
                                        else if (!zqshibing.identity) { //欢乐2v2
                                            zqshibing.identity = player.playerid;
                                            lib.translate[zqshibing.identity] = (player.side == game.me.side) ? '友' : '敌';
                                        }
                                    }

                                    const goon = player !== game.me && zqshibing !== game.me && player.node.identity.classList.contains('guessing') && !player.identityShown;
                                    if (goon) {
                                        if (zqshibing.identityShown) delete zqshibing.identityShown;
                                        if (!zqshibing.node.identity.classList.contains('guessing')) zqshibing.node.identity.classList.add('guessing');
                                    }
                                    zqshibing.setIdentity(goon ? 'cai' : undefined); //创建身份图标
                                    if (zqshibing.node.dieidentity) zqshibing.node.dieidentity.innerHTML = get.translation(zqshibing.identity + 2); //阵亡图片
                                    if (typeof player.ai?.shown === 'number' && zqshibing.ai) zqshibing.ai.shown = player.ai.shown;
                                }, zqshibing, player);
                                //修复其他模式bug
                                game.broadcastAll((zqshibing, player) => {
                                    if (get.mode() == 'guozhan') {
                                        if (zqshibing.name2 == undefined) zqshibing.name2 = zqshibing.name1;
                                    }
                                    zqshibing._trueMe = player;
                                    zqshibing.skillH = []; //幻化修复
                                    zqshibing.storage.zhibi = []; //谋攻修复
                                    zqshibing.storage.stratagem_expose = [];
                                    zqshibing.storage.stratagem_fury = 0;
                                    var szn = lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable'] && lib.config['extension_十周年UI_outcropSkin'] == 'shizhounian';
                                    var img = szn ? 'characters/' : '';
                                    lib.character['zq_nvwa_shibing'][4] = [`ext:天庭/character/${img}zq_nvwa_shibing.jpg`, 'unseen', player.group];
                                }, zqshibing, player);
                                //检测游戏胜负
                                if (get.mode() == 'single' && game.checkResult) {
                                    game.checkResult = function(){
                                        const player = game.me._trueMe || game.me;
                                        if(game.players.length==1) game.over(player.isAlive());
                                        if(game.players.some(i =>(i.isAlive() && (i===player || (i._trueMe && i._trueMe===player))))){
                                            if(game.players.every(i =>(i===player))) game.over(true);
                                        } else game.over(false);
                                    }
                                };
                                game.broadcastAll((zqshibing, player) => {
                                    zqshibing['zqzaoren'] = player;
                                    if (typeof game.checkResult === 'function') {
                                        const origin_checkResult = game.checkResult;
                                        game.checkResult = function () {
                                            const player = game.me._trueMe || game.me;
                                            if (game.players.filter(i => i !== player).every(i => i['zqzaoren'] && i['zqzaoren'] === player)) {
                                                //game.log('●游戏结束');
                                                game.over(true);
                                            }
                                            return origin_checkResult.apply(this, arguments);
                                        };
                                    }
                                    if (typeof game.checkOnlineResult === 'function') {
                                        const origin_checkOnlineResult = game.checkOnlineResult;
                                        game.checkOnlineResult = function (player) {
                                            if (game.players.filter(i => i !== player).every(i => i['zqzaoren'] && i['zqzaoren'] === player)) return true;
                                            return origin_checkOnlineResult.apply(this, arguments);
                                        };
                                    }
                                    //敌友判定
                                    if (typeof lib.element.player.getFriends === 'function') {
                                        const origin_getFriends = lib.element.player.getFriends;
                                        const getFriends = function (func, includeDie) {
                                            const player = this;
                                            return [...origin_getFriends.apply(this, arguments),
                                            ...game[includeDie ? 'filterPlayer2' : 'filterPlayer'](target => (target['zqzaoren'] || target) === (player['zqzaoren'] || player))
                                            ].filter(i => i !== player || func === true).unique().sortBySeat(player);
                                        };
                                        lib.element.player.getFriends = getFriends;
                                        [...game.players, ...game.dead].forEach(i => (i.getFriends = getFriends));
                                    }
                                    if (typeof lib.element.player.isFriendOf === 'function') {
                                        const origin_isFriendOf = lib.element.player.isFriendOf;
                                        const isFriendOf = function (player) {
                                            if ((this['zqzaoren'] || this) === (player['zqzaoren'] || player)) return true;
                                            return origin_isFriendOf.apply(this, arguments);
                                        };
                                        lib.element.player.isFriendOf = isFriendOf;
                                        [...game.players, ...game.dead].forEach(i => (i.isFriendOf = isFriendOf));
                                    }
                                    if (typeof lib.element.player.getEnemies === 'function') {
                                        const origin_getEnemies = lib.element.player.getEnemies;
                                        const getEnemies = function (func, includeDie) {
                                            if (this['zqzaoren']) return this['zqzaoren'].getEnemies(func, includeDie);
                                            else {
                                                const player = this;
                                                return [...origin_getEnemies.apply(this, arguments),
                                                ...game[includeDie ? 'filterPlayer2' : 'filterPlayer'](target => {
                                                    return origin_getEnemies.apply(this, arguments).includes(target['zqzaoren'] || target);
                                                }),
                                                ].filter(i => player != (i['zqzaoren'] || i)).unique().sortBySeat(player);
                                            }
                                        };
                                        lib.element.player.getEnemies = getEnemies;
                                        [...game.players, ...game.dead].forEach(i => (i.getEnemies = getEnemies));
                                    }
                                }, zqshibing, player);
                                //同步我的态度（单挑模式无效）
                                player.ai.modAttitudeFrom = (from, to, att) => { //修复内奸摆烂bug，女娲和士兵from对他人to
                                    if (to == player) return 114.514; //女娲和士兵对女娲to
                                    if (to.isFriendsOf(player)) return get.attitude(from, to); //女娲和士兵对女娲的队友
                                    return get.attitude(from, to) - 0.11; //女娲和士兵对女娲的敌人
                                };
                                zqshibing.ai.modAttitudeTo = (from, to, att) => { //他人from对士兵to
                                    if (from == player || from.isFriendsOf(player)) return 7.7; //女娲阵营对士兵
                                    return get.attitude(from, player) + 0.1; //非女娲阵营from对士兵
                                };
                                /*zqshibing.ai.modAttitudeFrom=(from,to,att)=>{ //被女娲的函数覆盖而失效
                                    if(to==player||to.isFriendsOf(player)) return 114.514;
                                    return get.attitude(player,to)-0.22;
                                };*/
                                zqshibing.directgain(get.cards(4));
                                game.addGlobalSkill('zqzaoren_auto');
                                game.addGlobalSkill('zqshibing_die');
                                //game.addGlobalSkill('zqshibing_over'); //联机卡死
                                //不计入左上角身份统计
                                game.broadcastAll(() => {
                                if (game.ui_identityShow_update && get.mode() == 'identity'){
                                    const oldFn = game.ui_identityShow_update;
                                    game.ui_identityShow_update = function () {
                                        oldFn.call(this);
                                        const IDENTITY_INFO = {
                                            zhu: { color: "#AE5F35", aliases: ["zhu", "rZhu", "bZhu"] },
                                            zhong: { color: "#E9D765", aliases: ["zhong", "rZhong", "bZhong", "mingzhong"] },
                                            fan: { color: "#87A671", aliases: ["fan", "rYe", "bYe"] },
                                            nei: { color: "#9581C4", aliases: ["nei", "rNei", "bNei"] },
                                            commoner: { color: "#808080", aliases: ["commoner"] },
                                        };
                                        let newStr = "";
                                        for (const [key, info] of Object.entries(IDENTITY_INFO)) {
                                            const num = game.countPlayer(p => { return info.aliases.includes(p.identity) && !p['zqzaoren'] });
                                            if (num > 0) newStr += `<font color="${info.color}">${get.translation(key)}</font> x ${num}  `;
                                        }
                                        if (game.me) {
                                            const myId = game.me.identity || "undefined";
                                            newStr += "<br>" + get.translation(`${myId}_win_option`);
                                        }
                                        game.ui_identityShow.innerHTML = `<span style="font-family:shousha; font-size: 17.0px;font-weight:500;text-align: right; line-height: 20px; color: #C1AD92;text-shadow:none;">${newStr}</span>`;
                                        game.ui_identityShowx.innerHTML = `<span style="font-family:shousha; font-size: 17.0px;font-weight:500;text-align: right; line-height: 20px; color: #2D241B; -webkit-text-stroke: 2.7px #322B20;text-shadow:none;">${newStr}</span>`;
                                    };
                                }
                                });
                                'step 3'
                                if (!_status.characterlist) {
                                    if (_status.connectMode) _status.characterlist = get.charactersOL();
                                    else {
                                        var list = [];
                                        for (var i in lib.character) {
                                            if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                            list.add(i);
                                        }
                                        _status.characterlist = list;
                                    }
                                }
                                'step 4'
                                var is_forced = function (list) {
                                    for (var i = 0; i < list.length; i++) {
                                        var info = lib.skill[list[i]];
                                        if (info && info.juexingji) return false;
                                        if (info && info.mod) {
                                            var infox = lib.translate[list[i] + '_info'];
                                            if (infox && infox.indexOf('锁定技') == -1) return false;
                                        }
                                        return get.is.locked(list[i]);
                                    }
                                }
                                var list = [];
                                for (var i = 0; i < _status.characterlist.length; i++) {
                                    var skills = lib.character[_status.characterlist[i]][3];
                                    for (var j = 0; j < skills.length; j++) {
                                        var cur = [skills[j]];
                                        game.expandSkills(cur); //获取子技能
                                        if (is_forced(cur) && !player.awakenedSkills.includes(skills[j])) list.add(skills[j]);
                                    }
                                }
                                let playerx = game.players.concat(game.dead);
                                for (var i = 0; i < list.length; i++) {
                                    for (var j of playerx) {
                                        if (j.hasSkill(list[i])) list.remove(list[i]);
                                    }
                                }
                                if (list.length && _status.zqshibing_skill && _status.zqshibing_skill[player.playerid]) {
                                    var skillz = _status.zqshibing_skill[player.playerid];
                                    if (skillz && skillz.length) { for (var i of skillz) { if (list.includes(i)) list.remove(i) } }
                                }
                                if (list.length && list.length >= 3) {
                                    game.log('搜索到' + list.length + '个锁定技');
                                    var skill = list.randomGets(3);
                                    var next = player.chooseControl(skill);
                                    next.set('prompt', '【造人】：令【' + get.translation(event.zqshibing) + '】获得下列技能中的一个');
                                    next.set('choiceList', skill.map(function (i) {
                                        if (lib.translate[i + '_info']) return '<div class="skill">【' + get.translation(i) + '】</div><div class="popup text" style="width:calc(100% - 10px);display:inline-block">' + lib.translate[i + '_info'] + '</div>';
                                    }));
                                    next.set('ai', function () {
                                        if (_status.event.controls.length == 1) return _status.event.controls[0];
                                        var iss = [];
                                        for (let i of _status.event.controls) {
                                            if (lib.translate[i + '_info'] &&
                                                (lib.translate[i + '_info'].indexOf('隐匿技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('主公技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('势力技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('标记') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('游戏开始') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('若你的武将牌') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('记录的') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('枚') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('发动') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('扑克牌') == -1)
                                            ) iss.push(i);
                                        }
                                        if (iss.length) return iss.randomGet();
                                        return _status.event.controls.slice(0).randomGet();
                                    });
                                } else {
                                    game.log('未搜索到3个以上的锁定技');
                                    event.finish();
                                }
                                'step 5'
                                if (result && result.control) {
                                    var id = player.playerid;
                                    var skill = result.control;
                                    if (!_status.zqshibing_skill) _status.zqshibing_skill = {};
                                    if (!_status.zqshibing_skill[id]) _status.zqshibing_skill[id] = [];
                                    _status.zqshibing_skill[id].add(skill);
                                    player.storage.zqzaoren = _status.zqshibing_skill[id];
                                    player.syncStorage('zqzaoren');
                                    player.markSkill('zqzaoren');
                                    //lib.character['zq_nvwa_shibing'][3]=skill;
                                    event.zqshibing.addSkill(skill);
                                    event.zqshibing.popup(skill);
                                    game.log(event.zqshibing, '获得了技能<font color=\"#68DD7F\">【' + get.translation(skill) + '】</font>');
                                }
                            },
                            ai: {
                                order: 10,
                                result: {
                                    player: 1,
                                },
                                effect: {
                                    player: function (card, player, target) {
                                        if (get.tag(card, 'recover') || get.tag(card, 'save')) {
                                            if (game.zhu && player != game.zhu && get.itemtype(target) == 'player' && target == game.zhu && !player.getFriends().includes(game.zhu)) {
                                                if (game.players.filter(i => i != player && i != game.zhu).every(i => i.identity && i.identity == 'commoner')) return [1, -30]; //不救主
                                            }
                                        }
                                    },
                                },
                            },
                        },
                        zqshibing_over: { //联机修复 //但是联机卡死
                            trigger: { global: 'dieAfter' },
                            fixed: true,
                            priority: -1,
                            direct: true,
                            forced: true,
                            charlotte: true,
                            superCharlotte: true,
                            lastDo: true,
                            forceDie: true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                return game.players.filter(i => i !== player).every(i => (i.getFriends().includes(player) || (i['zqzaoren'] && i['zqzaoren'] === player))); //场上只剩一人时跳过every直接为true
                            },
                            content: function () {
                                if (game.players.filter(i => i !== player).every(i => (i.getFriends().includes(player) || (i['zqzaoren'] && i['zqzaoren'] === player)))) {
                                    var win = player;
                                    if (game.players.filter(i => i !== player).every(i => (i['zqzaoren'] && i['zqzaoren'] === player))) {
                                        var p = game.findPlayer2(current => current['zqzaoren']);
                                        if (p && p['zqzaoren']) win = p['zqzaoren'];                                    
                                    }
                                    game.over(win === game.me || win.getFriends().includes(game.me) || (game.me.identity && game.me.identity==='commoner' && game.me.isAlive()));
                                    
                                    var winners = [win,win.getFriends()];
                                    var m = game.players.filter(i => i.identity && i.identity==='commoner' && i.isAlive());
                                    if (m) winners.add(m);
                                    game.log('<font color=\"#96CAFF\">',get.translation(winners),'</font>●获胜');
                                }
                            },
                        },
                        zqshibing_die: {
                            trigger: { player: 'dieBegin' }, //dieBefore
                            fixed: true,
                            priority: -1,
                            direct: true,
                            forced: true,
                            charlotte: true,
                            superCharlotte: true,
                            forceDie: true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                return _status.zqshibing_die?.includes(event.player.playerid);
                            },
                            content: function () {
                                var targetd = trigger.player;
                                if (_status.zqshibing_die) _status.zqshibing_die.remove(targetd.playerid);
                                var id = targetd['zqzaoren'].playerid;
                                if (_status.zqshibing_auto && _status.zqshibing_auto[id]) _status.zqshibing_auto[id].remove(targetd.playerid);
                                if (_status.characterlist) _status.characterlist.remove('zq_nvwa_shibing');
                                if (_status.currentPhase && _status.currentPhase == targetd) get.event().getParent('phaseLoop').player = targetd.getPrevious(); //修复跳过下家回合bug
                                targetd.identityShown = true;
                                if (get.mode() == 'identity') { //不执行身份奖惩
                                    trigger.set('noDieAfter', true);
                                    trigger.set('noDieAfter2', true);
                                }
                                if(game.removePlayerOL) game.removePlayerOL(targetd, { animate: false });
                                else {
                                    game.broadcastAll(function (player, targetd) {
                                        if(game.removePlayer) game.removePlayer(targetd);
                                        const players = game.players.concat(game.dead);
                                        if (player.getSeatNum() > 0) {
                                            const seatNum = player.getSeatNum();
                                            players.forEach((value) => {
                                                if (value.getSeatNum() > seatNum) value.setSeatNum(value.getSeatNum() - 1);
                                            });
                                        }
                                        if (_status.connectMode) delete lib.playerOL[targetd.playerid];
                                        targetd.classList.add('dead');
                                        targetd.classList.add('out');
                                        targetd.style.display = 'none';
                                        targetd.delete();
                                        targetd.removed = true;
                                        setTimeout(() => { targetd.removeAttribute('style') }, 500);
                                    }, player, targetd);
                                }
                                game.broadcastAll((targetd) => { game.players.remove(targetd); game.dead.remove(targetd); game.arrangePlayers() }, targetd); //修复联机不刷新上下家
                                game.log(targetd,'移出游戏');
                                trigger.cancel(); //取消击杀播报等后续结算
                                targetd.dieAfter();
                                if (_status.connectMode) game.checkOnlineResult?.(); else game.checkResult?.(); //士兵后死游戏不结束
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.mode() == 'single' && player['zqzaoren'] && player['zqzaoren'] == target) { //单挑士兵对女娲
                                            if (get.tag(card, 'recover') || get.tag(card, 'save')) return [1, 5, 1, 5];
                                            else return [0, 0, 0, 0];
                                        }
                                        if (target['zqzaoren']) {
                                            if ((get.tag(card, 'recover') || get.tag(card, 'save')) && (target == player || get.attitude(player, target) >= 0)) return [0, 0, 0, 0]; //队友不救士兵
                                            if (get.mode() == 'single' && target['zqzaoren'].isAlive() && target != player) return [0, 0, 0, 0]; //单挑不先打士兵
                                        }
                                        var num = ui.cardPile?.childNodes?.length;
                                        if (num && num < 60 && player['zqzaoren'] && target == player['zqzaoren'] && target.hasSkill('zqbutian')) { //若已觉醒补天则false
                                            var achieve = player['zqzaoren'].getExpansions('zqbutian') && player['zqzaoren'].getExpansions('zqbutian').reduce(function (num, card) {
                                                return num + get.number(card, false);
                                            }, 0) > 36;
                                            if (!achieve) return [1, 2];
                                        }
                                    },
                                },
                            },
                        },
                        zqzaoren_auto: { //把控制权给你
                            trigger: {
                                player: ['phaseAfter', 
                                    'playercontrol', 'chooseToUseBegin', 'chooseToRespondBegin', 'chooseToDiscardBegin', 'chooseToCompareBegin',
                                    'chooseButtonBegin', 'chooseCardBegin', 'chooseTargetBegin', 'chooseCardTargetBegin', 'chooseControlBegin',
                                    'chooseButtonTargetBegin', 'chooseToGiveBegin', 'chooseToGuanxingBegin', 'chooseToMoveBegin', 'chooseToPlayBeatmapBegin', 'chooseNumbersBegin',
                                    'chooseBoolBegin', 'choosePlayerCardBegin', 'discardPlayerCardBegin', 'gainPlayerCardBegin'],
                                global: ['dieBegin','dieAfter'],
                            },
                            firstDo: true,
                            forced: true,
                            priority: 999,
                            forceDie: true,
                            charlotte: true,
                            popup: false,
                            silent: true, //mode:['identity', 'guozhan', 'doudizhu', 'connect'],
                            filter: function (event, player) {
                                //if(_status.connectMode) return false; //和鬼王冲突造成奇怪bug
                                //if(player._trueMe) return false; //被其他角色控制
                                if (!_status.zqshibing_auto) return false;
                                if(player['zqzaoren']) var id = player['zqzaoren'].playerid;
                                else var id = player.playerid;
                                if (!_status.zqshibing_auto[id]) return false;
                                if (event.name == 'die') return event.player != player && _status.zqshibing_auto[id].includes(game.me.playerid) && _status.zqshibing_auto[id].includes(event.player.playerid) && _status.zqshibing_auto[id].includes(player.playerid);
                                if (event.autochoose && event.autochoose()) return false;
                                if (lib.filter.wuxieSwap(event)) return false;
                                if (_status.auto && event.name != 'phase') return false;
                                //if (!player.isUnderControl()) return false; //士兵A不能控制士兵B （是否处于主控下）
                                return _status.zqshibing_auto[id].includes(game.me.playerid) && _status.zqshibing_auto[id].includes(player.playerid);
                            },
                            content: function () {
                                if (trigger.name == 'phase' && player['zqzaoren'] && player['zqzaoren'].isAlive()) game.swapPlayerAuto(player['zqzaoren']); //event.triggername可以区分Begin还是After
                                else {
                                    if (player.isAlive() && trigger.name != 'die') game.swapPlayerAuto(player); //修复多角色同时触发控制权导致角色重叠
                                    else if (trigger.name == 'die' && trigger.player['zqzaoren']) game.swapPlayerAuto(trigger.player['zqzaoren']); //修复女娲先死，士兵死后玩家丢失
                                }
                            },
                        },
                        zqbutian: {
                            audio: 'ext:天庭/audio/skill/zq_nvwa:6',
                            trigger: {
                                player: 'dying',
                            },
                            forced: true,
                            //popup: false,
                            dutySkill: true,
                            persevereSkill: true,
                            onremove: function (player) { //修复意外失去技能后卡牌消失
                                const cards = player.getExpansions('zqbutian');
                                if (cards?.length) {
                                    game.cardsGotoOrdering(cards);
                                    for (let i of cards) {
                                        if (i.hasGaintag('zqbutian')) i.removeGaintag('zqbutian');
                                    }
                                }
                            },
                            content: function () {
                                if (!lib.inpile.includes('zq_wucaishi')) {
                                    lib.inpile.push('zq_wucaishi');
                                    event.cardx = game.createCard2('zq_wucaishi', 'heart', 12);
                                } else {
                                    event.cardx = get.cardPile(function (card) {
                                        return card.name == 'zq_wucaishi';
                                    });
                                }
                                if (!event.cardx) event.cardx = get.cardPile('zq_wucaishi', 'field');
                                if (event.cardx) player.equip(event.cardx);
                            },
                            //mark:true,
                            marktext: '石',
                            intro: {
                                name: '「石」',
                                markcount: 'expansion',
                                mark(dialog, storage, player) {
                                    if (player.getExpansions('zqbutian')) {
                                        dialog.addText('点数之和为【' + player.getExpansions('zqbutian').reduce(function (num, card) {
                                            return num + get.number(card, false);
                                        }, 0) + '】');
                                        dialog.addAuto(player.getExpansions('zqbutian'));
                                    } else return '点数之和为0';
                                }
                            },
                            derivation: ['zqwucaishi'],
                            group: ['zqbutian_effect', 'zqbutian_achieve', 'zqbutian_fail'],
                        },
                        zqbutian_effect: {
                            trigger: {
                                global: 'useCardAfter',
                            },
                            filter: function (event, player) {
                                return event.player != player && event.card && event.cards?.length && event.targets?.includes(player) && (get.position(event.card) == 'd' || get.position(event.card) == 'j');
                            },
                            check: function (event, player) {
                                var card = event.card;
                                return !(get.tag(card,'recover') || get.tag(card,'save'));
                            },
                            'prompt': function (event, player) {
                                return '是否将【' + get.translation(event.card) + '】作为「石」置于你的武将牌上？';
                            },
                            content: function () {
                                const audio = ['zqbutian1', 'zqbutian2', 'zqbutian3'].randomGet();
                                game.playAudio('../extension/天庭/audio/skill/zq_nvwa/' + audio + '.mp3');
                                var card = trigger.cards;
                                player.addToExpansion(card, 'gain2').gaintag.add('zqbutian');
                                game.log(player, '将', card, '炼成了「石」');
                                if(!player.storage.zqbutian) player.storage.zqbutian = [];
                                //for (let i of card) { if (i.name) player.storage.zqbutian.add(i.name); } //若丈八应该记录杀
                                player.storage.zqbutian.add(trigger.card.name);
                                player.addTempSkill('zqbutian_mod', { global: 'phaseAfter' });

                                //var next = game.createEvent('zqbutian_draw');
                                //next.player = player; next.target = event.targetx;
                                //next.setContent(lib.skill.zqbutian.content);
                            },
                            sourceSkill: 'zqbutian',
                        },
                        zqbutian_mod: {
                            mod: {
                                targetEnabled: function (card, player, target) {
                                    if(target.storage.zqbutian){
                                        for (let i of target.storage.zqbutian) {
                                            if (card.name && card.name == i) return false;
                                        }
                                    }
                                },
                            },
                            forced: true,
                            persevereSkill: true,
                            mark: true,
                            onremove: function (player) {
                                player.storage.zqbutian = [];
                            },
                            marktext: '补天︎',
                            intro: {
                                name: '补天',
                                content: function (storage, player) {
                                    if (player.storage.zqbutian) return '你不能成为【' + get.translation(player.storage.zqbutian) + '】的目标。';
                                    else return '无记录。';
                                },
                            },
                        },
                        zqbutian_fail: {
                            trigger: {
                                global: 'washCard',
                            },
                            filter: function (event, player) {
                                return !player.getExpansions('zqbutian') || player.getExpansions('zqbutian').reduce(function (num, card) {
                                    return num + get.number(card, false);
                                }, 0) <= 36;
                            },
                            forced: true,
                            skillAnimation: true,
                            animationColor: 'thunder',
                            content: function () {
                                game.log(player, '使命失败');
                                game.log(player, '献祭生命补天！');
                                player.awakenSkill('zqbutian');
                                player.die();
                            },
                            sourceSkill: 'zqbutian',
                        },
                        zqbutian_achieve: {
                            sourceSkill: 'zqbutian',
                            trigger: {
                                global: 'washCard',
                            },
                            filter: function (event, player) {
                                return player.getExpansions('zqbutian') && player.getExpansions('zqbutian').reduce(function (num, card) {
                                    return num + get.number(card, false);
                                }, 0) > 36;
                            },
                            forced: true,
                            skillAnimation: true,
                            animationColor: 'fire',
                            content: function () {
                                const audio = ['zqbutian4', 'zqbutian5', 'zqbutian6'].randomGet();
                                game.playAudio('../extension/天庭/audio/skill/zq_nvwa/' + audio + '.mp3');
                                player.awakenSkill('zqbutian');
                                game.log(player, '成功完成使命');
                                if (_status.zqshibing_skill && _status.zqshibing_skill[player.playerid]) {
                                    var skill = _status.zqshibing_skill[player.playerid];
                                    if (skill && skill.length) {
                                        player.addSkill(skill);
                                        player.popup(skill);
                                        game.log(player, '获得了技能<font color=\"#68DD7F\">【' + get.translation(skill) + '】</font>');
                                    }
                                }
                                const cards = player.getExpansions('zqbutian');
                                if (cards.length) {
                                    game.cardsGotoPile(cards.randomSort(), 'insert');
                                    for (let i of cards) {
                                        if (i.hasGaintag('zqbutian')) i.removeGaintag('zqbutian');
                                    }
                                }
                                /*'step 0'
                                player.awakenSkill('zqbutian');
                                game.log(player, '成功完成使命');
                                var cardAll=[];
                                if(player.getExpansions('zqbutian').length) cardAll.push([player,player.getExpansions('zqbutian')]);
                                for(var i=0;i<game.players.length;i++){
                                    if(game.players[i]!=player) cardAll.push([game.players[i],game.players[i].getCards('hej')]);
                                }
                                if(cardAll.length){
                                    game.loseAsync({cardAll}).setContent(get.info(event.name).zqLoseToCardpileMultiple); //自定义函数
                                }
                                'step 1'
                                game.cardsGotoPile(Array.from(ui.cardPile.childNodes).randomSort());
                                'step 2'
                                var sex1='female';
                                var zqshibing=game.findPlayer2(current=>(current.name1=='zq_nvwa_shibing'||current.name2=='zq_nvwa_shibing'));
                                if(zqshibing&&zqshibing.sex==sex1) sex1='male';
                            game.broadcastAll((player,sex1)=>{
                                var group1=player.group;
                                var hp1=player.hp;
                                game.addCharacter('zq_nvwa_shibing',{
                                    sex:sex1,
                                    group:group1,
                                    hp:hp1,
                                    skills:[],
                                    groupInGuozhan:group1,
                                    isUnseen:true,
                                    extension:'衍生武将',
                                    translate:'士兵',
                                });
                                if(lib.config.extensions.includes('十周年UI')&&lib.config['extension_十周年UI_enable']&&lib.config['extension_十周年UI_outcropSkin']=='shizhounian'){
                                    if(sex1=='male') lib.character['zq_nvwa_shibing'][4]=['ext:天庭/character/characters/zq_nvwa_shibing1.jpg','unseen',group1];
                                    else lib.character['zq_nvwa_shibing'][4]=['ext:天庭/character/characters/zq_nvwa_shibing2.jpg','unseen',group1];
                                } else {
                                    if(sex1=='male') lib.character['zq_nvwa_shibing'][4]=['ext:天庭/character/zq_nvwa_shibing1.jpg','unseen',group1];
                                    else lib.character['zq_nvwa_shibing'][4]=['ext:天庭/character/zq_nvwa_shibing2.jpg','unseen',group1];
                                }
                            },player,sex1);
                                if(_status.characterlist) _status.characterlist.remove('zq_nvwa_shibing');
                                'step 3'
                                game.log(player,'将武将牌替换为<font color=\"#96CAFF\">士兵</font>');
                                var name=player.name;
                                var hp2=player.maxHp;
                                if(player.name2&&player.name2=='zq_nvwa') name=player.name2;
                                if(player.name1&&player.name1=='zq_nvwa') name=player.name1;
                                player.reinit(name,'zq_nvwa_shibing');
                                player.maxHp=hp2;
                                player.update();
                                'step 4'
                                game.broadcastAll((player)=>{
                                    //lib.translate['zqwucaishi_equip']='补天';
                                    var group1=player.group;
                                    if(lib.config.extensions.includes('十周年UI')&&lib.config['extension_十周年UI_enable']&&lib.config['extension_十周年UI_outcropSkin']=='shizhounian') lib.character['zq_nvwa_shibing'][4]=['ext:天庭/character/characters/zq_nvwa_shibing.jpg','unseen',group1];
                                    else lib.character['zq_nvwa_shibing'][4]=['ext:天庭/character/zq_nvwa_shibing.jpg','unseen',group1];
                                },player);
                                //player.addSkill('zqwucaishi_equip');
                                if(_status.zqshibing_skill&&_status.zqshibing_skill[player.playerid]){
                                    var skill=_status.zqshibing_skill[player.playerid];
                                    if(skill&&skill.length){
                                        player.addSkill(skill);
                                        player.popup(skill);
                                        game.log(player,'获得了技能<font color=\"#68DD7F\">【'+get.translation(skill)+'】</font>');
                                    } //lib.character['zq_nvwa_shibing'][3]=skill;
                                }
                                'step 5'
                                var evt=_status.event.getParent('phaseUse');
                                if(evt&&evt.name=='phaseUse'){
                                    evt.skipped=true;
                                }
                                var evt=_status.event.getParent('phase');
                                if(evt&&evt.name=='phase'){
                                    evt.finish();
                                }
                                'step 6'
                                player.insertPhase();*/
                            },
                            /*zqLoseToCardpileMultiple(){
                            'step 0'
                            event.visible=true;
                            if(!event.position){
                                event.position=ui.cardPile;
                            }
                            var cards=[];
                            event.cards=cards;
                            for(var i=0;i<event.cardAll.length;i++){
                                var next=event.cardAll[i][0].lose(event.cardAll[i][1],event.position);
                                if(event.cardAll[i][1].length) game.log(event.cardAll[i][0],'将',event.cardAll[i][1],'置入了牌堆');
                                next.animate=false;
                                next.delay=false;
                                cards.addArray(event.cardAll[i][1]);
                                next.getlx=false;
                            }
                            var evt=event;
                            if(evt.animate!=false){
                                evt.cardid=lib.status.videoId++;
                                game.broadcastAll(
                                    function(list,id,cards){
                                        for(var i of list){
                                            for(var j of i[1]){
                                                j.classList.remove('glow');
                                                j.classList.remove('glows');
                                            }
                                            i[0].$throw(i[1],null,'nobroadcast');
                                        }
                                        var cardnodes=[];
                                        cardnodes._discardtime=get.time();
                                        for(var ix of list){
                                            var card=ix[1];
                                            for(var i=0;i<cards.length;i++){
                                                if(cards[i].clone){
                                                    cardnodes.push(cards[i].clone);
                                                }
                                            }
                                        }
                                        ui.todiscard[id]=cardnodes;
                                    },
                                    event.cardAll,
                                    evt.cardid,
                                    cards
                                );
                                if(lib.config.sync_speed&&cards[0]&&cards[0].clone){
                                    if(evt.delay!=false){
                                        var waitingForTransition=get.time();
                                        evt.waitingForTransition=waitingForTransition;
                                        cards[0].clone.listenTransition(function(){
                                            if(_status.waitingForTransition==waitingForTransition&&_status.paused){
                                                game.resume();
                                            }
                                            delete evt.waitingForTransition;
                                        });
                                    } else if(evt.getParent().cardTransition){
                                        delete evt.getParent().cardTransition;
                                        var waitingForTransition=get.time();
                                        evt.getParent().waitingForTransition=waitingForTransition;
                                        cards[0].clone.listenTransition(function(){
                                            if(_status.waitingForTransition==waitingForTransition&&_status.paused){
                                                game.resume();
                                            }
                                            delete evt.getParent().waitingForTransition;
                                        });
                                    }
                                }
                            }
                            'step 1'
                            if(event.delay!=false){
                                if(event.waitingForTransition){
                                    _status.waitingForTransition=event.waitingForTransition;
                                    game.pause();
                                } else {
                                    game.delayx();
                                }
                            }
                            },*/
                        },

                        //月老
                        zqhunbu: {
                            audio: 'ext:天庭/audio/skill/zq_yuelao:2',
                            preHidden: true,
                            forced: true,
                            trigger: {
                                player: 'damageEnd',
                            },
                            filter: function (event, player) {
                                return event.num > 0;
                            },
                            /*check: function (event, player) {
                                if (event.source.name2 == undefined) return true; //game.players.length<=3||get.attitude(player,event.source)>0; //伤害来源单将，队友
                                return get.attitude(player, event.source) <= 0; //双将敌人
                            },*/
                            logTarget: 'source',
                            content: function () {
                                player.addTempSkill("zqdiaoli");
                                var pp = trigger.source;
                                if (pp) {
                                if (pp.name2 && _status.characterlist) _status.characterlist.add(pp.name2);
                                if (get.mode() == 'guozhan') {
                                    if (pp.hasViceCharacter()) pp.removeCharacter(1);
                                } else {
                                    if (pp.name2) {
                                        game.broadcastAll(function (pp) {
                                            pp.smoothAvatar(true);
                                            pp.node.avatar2.classList.add('hidden');
                                            pp.classList.remove('fullskin2');
                                            pp.node.name2.innerHTML = '';
                                            pp.removeSkill(lib.character[pp.name2][3]);
                                            pp.syncSkills();
                                            game.log(pp, '移除了副将<font color=\"#8dbede\">', lib.translate[pp.name2], '</font>');
                                            delete pp.name2;
                                            if (pp == game.me && ui.fakeme) {
                                                ui.fakeme.style.backgroundImage = pp.node.avatar.style.backgroundImage;
                                            }
                                            if (pp._fujiangkuang) {
                                                if (pp._fujiangkuang.parentNode) pp._fujiangkuang.parentNode.removeChild(pp._fujiangkuang);
                                                delete pp._fujiangkuang;
                                            }
                                        }, pp);
                                    }
                                };
                                }
                                /*var next = game.createEvent('zqhunbu_zqhongxian');
                                next.target = pp;
                                next.setContent(lib.skill.zqhongxian.content);*/
                            },
                            ai: {
                                //maixie: true, 'maixie_hp': true,
                                effect: {
                                    target: function (card, player, target) {
                                        if (card.name == "lebu" && target.hasSkill('zqhunbu')) return "zeroplayertarget";
                                        if (player.hasSkillTag('jueqing', false, target)) return [1, -1];
                                        if (player.name2 != undefined && get.tag(card, 'damage')) return [1, 0, 1, -0.5]; //有副将
                                        //if (player.hasJudge('lebu')) return [1, -1]; //有乐
                                    },
                                },
                            },
                            group: 'zqhunbu2',
                        },
                        zqhunbu2: {
                            forced: true,
                            trigger: { player: "judgeEnd" },
                            filter: function (event, player) {
                                return event.card?.name == "lebu" && !event.result?.bool;
                            },
                            content: function () {
                                player.when("lebuBegin").then(function (event, trigger, player) {
                                    trigger.setContent(function (player) { player.draw(2) });
                                });
                                game.log(player, "将", trigger.card, "的效果改为摸两张牌");
                            },
                        },
                        zqdiaoli: {
                            charlotte: true,
                            init: function (player) {
                                if (player.isIn()) {
                                    game.broadcastAll((player2) => {
                                        player2.classList.add("out");
                                    }, player);
                                    game.log(player, "移出了游戏");
                                }
                            },
                            onremove: function (player) {
                                if (player.isOut()) {
                                    game.broadcastAll((player2) => {
                                        player2.classList.remove("out");
                                    }, player);
                                    game.log(player, "移回了游戏");
                                }
                            }
                        },
                        /*zqhunbu3: {
                            trigger: { player: "damageBegin4" },
                            charlotte: true,
                            forced: true,
                            content: function () {
                                trigger.cancel();
                            },
                            mark: true,
                            marktext: '婚簿',
                            intro: {
                                name: '婚簿︎', 
                                content: "防止所有伤害！",
                            },
                            ai: {
                                maixie: true,
                                maixie_hp: true,
                                nofire: true,
                                nothunder: true,
                                nodamage: true,
                                effect: {
                                    target: function (card, player, target, current) {
                                        if (get.tag(card, "damage")) return "zeroplayertarget";
                                    },
                                },
                            },
                        },*/
                        /*zqhunbu4: {
                            trigger: {
                                target: 'useCardToBefore',
                            },
                            forced: true,
                            charlotte: true,
                            priority: 15,
                            filter: function (event, player) {
                                return event.player != player && event.player.hasJudge('lebu');
                            },
                            content: function () {
                                game.log(player, '发动了<font color=\"#68DD7F\">【', lib.translate['zqhunbu'], '】</font>：', trigger.card, '对', trigger.target, '失效');
                                trigger.cancel();
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target, current) {
                                        if (player != target && player.hasJudge('lebu')) return 'zeroplayertarget';
                                    },
                                },
                            },
                            '_priority': 1500,
                        },*/
                        zqhongxian: {
                            audio: 'ext:天庭/audio/skill/zq_yuelao:6',
                            enable: 'phaseUse',
                            //usable:1,
                            filter: function (event, player) {
                                return player.countCards('he') > 0;
                            },
                            filterCard: true,
                            filterTarget: function (card, player, target) {
                                if (target.isDisabledJudge()) return false;
                                if (target.hasJudge('lebu')) return false;
                                if (!_status.characterlist) {
                                    _status.characterlist = [];
                                    if (get.mode() == 'guozhan') {
                                        for (var i in lib.characterPack.mode_guozhan) _status.characterlist.add(i);
                                    } else {
                                        if (_status.connectMode) _status.characterlist = get.charactersOL();
                                        else {
                                            for (var i in lib.character) {
                                                if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                                _status.characterlist.add(i);
                                            }
                                        }
                                    }
                                }
                                if (_status.characterlist) {
                                    for (var i = 0; i < _status.characterlist.length; i++) {
                                        if (lib.character[_status.characterlist[i]][0] && lib.character[_status.characterlist[i]][0] != target.sex) return true;
                                    }
                                }
                                return false;
                            },
                            check: function (card) {
                                return 6 - get.value(card);
                            },
                            position: 'he',
                            content: function () {
                                'step 0'
                                if (target.hasJudge('lebu') || target.isDisabledJudge()) event.finish();
                                if (!_status.characterlist) {
                                    _status.characterlist = [];
                                    if (get.mode() == 'guozhan') {
                                        for (var i in lib.characterPack.mode_guozhan) _status.characterlist.add(i);
                                    } else {
                                        if (_status.connectMode) _status.characterlist = get.charactersOL();
                                        else {
                                            for (var i in lib.character) {
                                                if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                                _status.characterlist.add(i);
                                            }
                                        }
                                    }
                                }
                                'step 1'
                                if (_status.characterlist) {
                                    for (var i of game.players) {
                                        if (i.name1) _status.characterlist.remove(i.name1);
                                        if (i.name2) _status.characterlist.remove(i.name2);
                                    }
                                }
                                event.lists = [];
                                for (var i = 0; i < _status.characterlist.length; i++) {
                                    if (lib.character[_status.characterlist[i]][0] && lib.character[_status.characterlist[i]][0] != target.sex) event.lists.add(_status.characterlist[i]);
                                }
                                'step 2'
                                if (event.lists.length > 0) {
                                    event.list = event.lists.randomGet();
                                    _status.characterlist.remove(event.list);
                                    var card = game.createCard('lebu', 'none', NaN);
                                    card.setBackground(event.list, 'character');
                                    game.log('<font color=\"#68DD7F\">【' + lib.translate['zqhongxian'] + '】</font>' + '将' + '<font color=\"#8dbede\">' + lib.translate[event.list] + '</font>' + '转化为<font color=\"#FFFF00\">乐不思蜀</font>');
                                    card.storage.zqhongxian = event.list;
                                    card._customintro = function (dialog) {
                                        dialog.add('乐不思蜀(' + lib.translate[event.list] + ')');
                                        dialog.add('<div class="text center">延时锦囊牌</div>');
                                        dialog.add('<div class="text" style="display:inline">出牌阶段，对一名其他角色使用。若判定结果不为红桃，跳过其出牌阶段，并将【' + lib.translate[event.list] + '】变更为其副将。</div>');
                                    };
                                    target.addSkill('zqhongxianx');
                                    target.addJudge(card);
                                    if (window.decadeUI) card.node.judgeMark.node.judge.style.backgroundImage = 'url("' + lib.assetURL + "extension/天庭/image/" + "lebu.png" + '")';
                                } else game.log('<font color=\"#68DD7F\">【红线】</font>没有找到与目标性别不同的武将');
                            },
                            ai: {
                                order: 8,
                                result: {
                                    target: function (player, target) { //target技能目标
                                        if (target.hasSkill('zqhunbu')) return 10;
                                        if (target.name2 != undefined) return -target.countCards('h') * 0.3; //有副将，目标收益为负
                                        return 2 - target.countCards('h') * 0.6; //单将
                                    },
                                },
                            },
                            group: ['zqhongxian_judge', 'zqhongxianx'],
                        },
                        zqhongxian_judge: {
                            trigger: {
                                global: 'judgeEnd',
                            },
                            forced: true,
                            charlotte: true,
                            forceDie: true,
                            fixed: true,
                            superCharlotte: true,
                            filter: function (event, player) {
                                var cs = event.card;
                                if (_status.characterlist && cs && cs.name == 'lebu' && cs.storage.zqhongxian && event.result.bool == true) {
                                    _status.characterlist.add(cs.storage.zqhongxian);
                                    game.playAudio('../extension/天庭/audio/die/zq_yuelao.mp3');
                                }
                                return cs && cs.name == 'lebu' && cs.storage.zqhongxian && event.result.bool == false;
                            },
                            content: function () {
                                const audio = ['zqhongxian4', 'zqhongxian5'].randomGet();
                                game.playAudio('../extension/天庭/audio/skill/zq_yuelao/' + audio + '.mp3');
                                var pp = trigger.player;
                                var chosen = trigger.card.storage.zqhongxian;
                                game.broadcastAll(function (pp, chosen) {
                                    if (get.mode() == 'guozhan') {
                                        // if (!pp.hasViceCharacter())
                                        pp.reinit(pp.name2, chosen, false);
                                    } else {
                                        if (pp.name2 != undefined) {
                                            pp.removeSkill(lib.character[pp.name2][3]);
                                            if (_status.characterlist) _status.characterlist.add(pp.name2);
                                            if (pp._fujiangkuang) {
                                                if (pp._fujiangkuang.parentNode) pp._fujiangkuang.parentNode.removeChild(pp._fujiangkuang);
                                                delete pp._fujiangkuang;
                                            }
                                        }
                                        pp.name2 = chosen;
                                        pp.classList.add('fullskin2');
                                        pp.node.avatar2.classList.remove('hidden');
                                        pp.node.avatar2.setBackground(chosen, 'character');
                                        pp.node.name2.innerHTML = get.slimName(chosen);
                                        pp.addSkill(lib.character[chosen][3]);
                                        pp.syncSkills();
                                        if (pp == game.me && ui.fakeme) {
                                            ui.fakeme.style.backgroundImage = pp.node.avatar.style.backgroundImage;
                                        }
                                    }
                                }, pp, chosen);
                                game.log(pp, '将<font color=\"#8dbede\">', lib.translate[chosen], '</font>变更为副将');
                            },
                        },
                        zqhongxianx: {
                            trigger: {
                                global: ['loseEnd', 'cardsDiscardEnd'],
                            },
                            forced: true,
                            charlotte: true,
                            forceDie: true,
                            fixed: true,
                            superCharlotte: true,
                            filter: function (event, player) {
                                var cs = event.cards;
                                for (var i = 0; i < cs.length; i++) {
                                    if (cs[i].name == 'lebu' && cs[i].storage.zqhongxian && get.position(cs[i], true) != 'o' && !cs[i].destroyed) return true;
                                }
                                return false;
                            },
                            content: function () {
                                var cs = trigger.cards;
                                for (var i = 0; i < cs.length; i++) {
                                    if (cs[i].name == 'lebu' && cs[i].storage.zqhongxian && get.position(cs[i], true) != 'o') {
                                        if (_status.characterlist) {
                                            var csx = true;
                                            var namex = cs[i].storage.zqhongxian;
                                            for (var j of game.players) {
                                                if (j.name1 && j.name1 == namex) csx = false;
                                                if (j.name2 && j.name2 == namex) csx = false;
                                            }
                                            if (csx == true) _status.characterlist.add(namex);
                                        }
                                        game.cardsGotoSpecial(cs[i]);
                                        cs[i].fix();
                                        cs[i].remove();
                                        cs[i].destroyed = true;
                                        game.log(cs[i], '(<font color=\"#8dbede\">', cs[i].storage.zqhongxian, '</font>)被销毁了');
                                    }
                                }
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.name(card) == 'lebu' && card.storage && card.storage.zqhongxian && target.name2 == undefined && target.countCards('h') < 6) return [0, 1, 1, 1]; //红线乐，单将，正收益
                                    },
                                },
                            },
                        },
                        //杨戬
                        zqxuangong: {
                            audio: 'ext:天庭/audio/skill/zq_yangjian:2',
                            trigger: {
                                source: 'damageBegin2',
                            },
                            check: function (event, player) {
                                if (event.player == player || get.attitude(player, event.player) > 0) return true;
                                return false;
                            },
                            filter: function (event, player) {
                                return event.num > 0;
                            },
                            'prompt2': function (event, player) {
                                return '即将对【' + get.translation(event.player) + '】造成[' + event.num + ']点伤害，是否防止此伤害，然后获得等量的护甲？';
                            },
                            content: function () {
                                'step 0'
                                trigger.cancel();
                                'step 1'
                                player.changeHujia(trigger.num, null, true);
                            },
                            group: ['zqxuangong1', 'zqxuangong2', 'zqxuangong3', 'zqxuangong4'],
                        },
                        zqxuangong1: {
                            trigger: {
                                player: 'useCard',
                            },
                            forced: true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                return get.type(event.card) != 'delay' && get.type(event.card) != 'equip' && get.tag(event.card, 'damage');
                            },
                            content: function () {
                                player.storage.zqxuangong = trigger.card;
                            },
                        },
                        zqxuangong2: {
                            trigger: {
                                global: ['useCard', 'respond'],
                            },
                            silent: true,
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                var respondTo = event.respondTo;
                                if (!respondTo) return false;
                                var evt = event.getParent('useCard');
                                return Array.isArray(event.respondTo) && respondTo[0] == player && evt.player == respondTo[0] && evt.card == respondTo[1] && get.type(evt.card) != 'delay' && get.type(evt.card) != 'equip' && get.tag(evt.card, 'damage'); //event.respondTo[0]是响应谁，event.respondTo[1]是响应哪张牌
                            },
                            content: function () {
                                var evt = trigger.parent;
                                while (evt.parent.name != 'useCard') evt = evt.parent; //while循环
                                if (!evt.baseDamage) evt.baseDamage = 1;
                                evt.baseDamage++;
                                if (!evt.parent.baseDamage) evt.parent.baseDamage = 1;
                                evt.parent.baseDamage++;
                                player.storage.zqxuangong = trigger.respondTo[1];
                                player.storage.zqxuangong_num = evt.baseDamage;
                                game.log(player, '●<font color=\"#68DD7F\">九转玄功</font>第[', player.storage.zqxuangong_num, ']转');
                            },
                        },
                        zqxuangong3: {
                            trigger: {
                                source: 'damageEnd',
                            },
                            forced: true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                return player.storage.zqxuangong && event.card && event.card == player.storage.zqxuangong;
                            },
                            content: function () {
                                player.storage.zqxuangong_damage = true;
                            },
                        },
                        zqxuangong4: {
                            trigger: {
                                player: 'useCardAfter',
                            },
                            forced: true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                return player.storage.zqxuangong;
                            },
                            content: function () {
                                if (trigger.card == player.storage.zqxuangong && player.storage.zqxuangong_num && !player.storage.zqxuangong_damage) {
                                    player.logSkill('zqxuangong');
                                    player.draw(player.storage.zqxuangong_num);
                                }
                                delete player.storage.zqxuangong;
                                delete player.storage.zqxuangong_num;
                                delete player.storage.zqxuangong_damage;
                            },
                        },
                        zqtianyan: {
                            forced: true,
                            onremove: true,
                            mark: true,
                            intro: {
                                mark: function (dialog, content, player) {
                                    if (player != game.me) return get.translation(player) + '观看牌堆中...';
                                    if (get.itemtype(_status.pileTop) != 'card') return '牌堆顶无牌';
                                    dialog.add([_status.pileTop]);
                                },
                            },
                        },
                        zqxiaotian: {
                            audio: 'ext:天庭/audio/skill/zq_yangjian:2',
                            usable: 1,
                            enable: 'phaseUse',
                            viewAsFilter: function (player) {
                                return player.countCards('hs') > 0;
                            },
                            viewAs: {
                                name: 'chuqibuyi',
                            },
                            filterCard: true,
                            position: 'hs',
                            check: function (card) {
                                return 7 - get.value(card);
                            },
                            ai: {
                                basic: {
                                    order: 5,
                                    useful: 2,
                                    value: 6,
                                },
                                yingbian: function (card, player, targets, viewer) {
                                    if (get.attitude(viewer, player) <= 0) return 0;
                                    if (game.hasPlayer(function (current) {
                                        return !targets.includes(current) && lib.filter.targetEnabled2(card, player, current) && get.effect(current, card, player, player) > 0;
                                    })) return 6;
                                    return 0;
                                },
                                result: {
                                    target: function (player, target, cardx) {
                                        if (player.hasSkillTag('viewHandcard', null, target, true)) return target.countCards('h', function (card) {
                                            return get.suit(card) != get.suit(cardx)
                                        }) > 0 ? -1.5 : 0;
                                        return -1.4;
                                    },
                                },
                                tag: {
                                    damage: 1,
                                },
                            },
                        },
                        //盘古
                        zqchuangshi: { //取消摸牌和获得牌
                            audio: 'ext:天庭/audio/skill/zq_pangu:6',
                            priority: 9999,
                            //direct:true,
                            forced: true,
                            firstDo: true,
                            popup: false,
                            persevereSkill: true,
                            //trigger: { player: ['gainEnd'], }, //包含draw，改成Begin装备牌有bug， //trigger.cancel(); //阻止其他技能结算
                            content: function () {},
                            init2: function (player) {
                                game.addGlobalSkill('zqchuangshi_die');
                                const cardh = player.getCards('h');
                                if (cardh) player.loseToDiscardpile(cardh); //弃置手牌
                                game.broadcastAll(function (player) {
                                    player.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).forEach(card => {
                                        card.fix();
                                        card.remove();
                                        card.destoryed = true;
                                    });
                                }, player);
                                var discardPiles = ui.discardPile.childNodes;
                                var numx = lib.config.extension_天庭_zqchuangshiNumx;
                                if (!numx) var numx = 80;
                                if (typeof Number(numx) === 'number') {
                                    if (player == game.me && _status.auto == false) var cards = Array.from(discardPiles).slice(Math.max(0, discardPiles.length - numx), discardPiles.length);
                                    else var cards = Array.from(discardPiles).slice(Math.max(0, discardPiles.length - Math.ceil(numx / 2)), discardPiles.length);
                                } else var cards = Array.from(discardPiles).slice(Math.max(0, discardPiles.length - 40), discardPiles.length);
                                if (cards) {
                                    const clone = (card) => {
                                        let newCard = ui.create.card();
                                        newCard.init(card);
                                        newCard.origin = card;
                                        return newCard;
                                    }
                                    player.loseToSpecial(cards.map(item => clone(item)), 'zqchuangshi');
                                }
                            },
                            ondisable: true,   //被封印后发动onremove部分
                            onremove: true,
                            onremove: function (player) {
                                player.removeMark('zqchuangshi_tag', player.countMark('zqchuangshi_tag'), false);
                                game.broadcastAll(function (player) {
                                    player.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).forEach(card => {
                                        card.fix();
                                        card.remove();
                                        card.destoryed = true;
                                    });
                                }, player);
                            },
                            mod: {
                                'cardEnabled2': function (card, player) {
                                    if (get.position(card) == 's' && card.hasGaintag('zqchuangshi')) {
                                        if (!player.storage.zqchuangshi_mark) player.storage.zqchuangshi_mark = [];
                                        if (player.storage.zqchuangshi_mark.length >= Math.min(5, player.hp)) return false;
                                    }
                                },
                                aiOrder: function (player, card, num) {
                                    var name = get.name(card);
                                    if (name == 'jiu' && player.storage.zqchuangshi_mark && player.hp > 0 && player.hp - player.storage.zqchuangshi_mark.length == 1) return 0.1;
                                    if (player.hasSkill('jiu') && name == 'sha') return num + 20;
                                    if (get.tag(card, 'recover') || get.tag(card, 'save')) return num + 20 + Math.pow(player.getDamagedHp(), 2);
                                    if (get.tag(card, 'draw') || name == 'huogong' || name == 'yuanjiao' || name == 'yiyi' || name == 'muniu' || name == 'xietianzi' || name == 'gz_guguoanbang') return 0.5;
                                    return num;
                                },
                            },
                            ai: {
                                tag: {
                                    nogain: true,
                                },
                                effect: {
                                    player: function (card, player, target) {
                                        if (get.tag(card, 'save') && player.getFriends().includes(target) && target.hp >= -2) return [1, 2];
                                        if (get.name(card) == 'wuxie' && player.getHistory('useCard', function (evt) {
                                            return get.name(evt.card) == 'wuxie';
                                        }).length) return -10;
                                        var name = get.name(card);
                                        if (get.tag(card, 'draw') || name == 'huogong' || name == 'yuanjiao' || name == 'yiyi' || name == 'muniu' || name == 'xietianzi' || name == 'gz_guguoanbang') return 0.1;

                                    },
                                    target: function (card, player, target) {
                                        if (target == player && get.tag(card, 'recover') && get.name(card) != 'jiu' && get.name(card) != 'taoyuan') return [1, 20];
                                    },
                                },
                            },
                            group: ['zqchuangshi2', 'zqchuangshi3', 'zqchuangshix', 'zqchuangshix2', 'zqchuangshi_lose', 'zqchuangshi_tag', 'zqchuangshi_use'],
                        },
                        zqchuangshi2: { //弃置获得的手牌
                            trigger: {
                                player: 'gainEnd',
                                global: 'roundStart', //gameDrawEnd联机不能更换手牌
                            },
                            priority: 9999,
                            firstDo: true,
                            //direct:true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                if (event.name == 'gain') return event.cards && event.cards.length;
                                return game.roundNumber == 1 && player.getCards('h');
                            },
                            content: function () {
                                if (trigger.name == 'gain' && trigger.cards?.length) var cards = trigger.cards.filter(card => get.position(card) == 'h');
                                else var cards = player.getCards('h');
                                if (cards) {
                                    game.log(player, '不能获得手牌');
                                    game.broadcastAll(function (player, cards) {
                                        game.cardsGotoOrdering(cards);
                                        game.log(cards, '掉入弃牌堆');
                                        ui.updatehl();
                                        setTimeout(function () {
                                            for (var i of game.players) { i.update() }
                                        }, 100);
                                    }, player, cards);
                                }
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqchuangshi3: { //初始手牌改为0(联机十周年报错)
                            trigger: {
                                global: 'gameDrawBegin',
                            },
                            priority: 9999,
                            //direct:true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player, card) {
                                return get.compareVersion('1.10.3') < 0;
                            },
                            content: function () {
                                var origin = trigger.num;
                                trigger.num = function (current) {
                                    if (current == player) return 0;
                                    else {
                                        if (typeof origin == 'function') return origin(current);
                                        else return origin;
                                    }
                                };
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqchuangshix: { //刷新S区创世牌
                            trigger: {
                                global: 'washCard', //phaseUseBegin , roundStart
                                player: 'phaseBefore',
                            },
                            //direct:true,
                            priority: 9999,
                            forced: true,
                            firstDo: true,
                            charlotte: true,
                            content: function () {
                                'step 0'
                                game.broadcastAll(function (player) {
                                    player.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).forEach(card => {
                                        card.fix();
                                        card.remove();
                                        card.destoryed = true;
                                    });
                                }, player);
                                'step 1'
                                var discardPiles = ui.discardPile.childNodes;
                                var numx = lib.config.extension_天庭_zqchuangshiNumx;
                                if (!numx) var numx = 80;
                                if (typeof Number(numx) === 'number') {
                                    if (player == game.me && _status.auto == false) var cards = Array.from(discardPiles).slice(Math.max(0, discardPiles.length - numx), discardPiles.length);
                                    else var cards = Array.from(discardPiles).slice(Math.max(0, discardPiles.length - Math.ceil(numx / 2)), discardPiles.length);
                                } else var cards = Array.from(discardPiles).slice(Math.max(0, discardPiles.length - 40), discardPiles.length);
                                if (cards) {
                                    const clone = (card) => {
                                        let newCard = ui.create.card();
                                        newCard.init(card);
                                        newCard.origin = card;
                                        return newCard;
                                    }
                                    player.loseToSpecial(cards.map(item => clone(item)), 'zqchuangshi');
                                }
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqchuangshix2: { //从弃牌堆获得牌或装备牌后，销毁S区一样的牌
                            trigger: {
                                global: ['gainBegin', 'equipBegin'], //原本用gainEnd防止gainBegin时取消，但是无法用get.position(i, true)判断是不是d区
                            },
                            priority: 9998,
                            firstDo: true,
                            //direct:true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                if (event.cards && event.cards.length) {
                                    for (var i of event.cards) {
                                        if (get.position(i, true) == 'd' || i.original == 'd') return true;
                                    }
                                }
                                return false;
                            },
                            content: function () {
                                if (trigger.cards && trigger.cards.length) {
                                    for (var i of trigger.cards) {
                                        if (get.position(i, true) == 'd' || i.original == 'd') {
                                            game.broadcastAll(function (player, i) {
                                                var cardd = player.getCards('s').filter(function (card) {
                                                    return card.hasGaintag('zqchuangshi') && card.name == i.name && card.suit == i.suit && card.number == i.number && card.nature == i.nature;
                                                });
                                                if (cardd.length) {
                                                    cardd[0].fix();
                                                    cardd[0].remove();
                                                    cardd[0].destoryed = true;
                                                }
                                                ui.updatehl();
                                            }, player, i);
                                        }
                                    }
                                }
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqchuangshix3: { //修改弃牌堆的牌为d区，为了防止在gainBegin时取消gain，担心引起original不准弃用
                            /*trigger: {
                                global: ['gainBegin','loseAfter'],
                            },
                            //direct:true,
                            priority: 9998,
                            firstDo: true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                if (event.cards && event.cards.length) {
                                    for (var i of event.cards) {
                                        if (get.position(i, true) == 'd') return true;
                                    }
                                }
                                return false;
                            },
                            content: function () {
                                if (trigger.cards && trigger.cards.length) {
                                    for (var i of trigger.cards) {
                                        if (get.position(i, true) == 'd') i.original = 'd';
                                    }
                                }
                            },
                            sourceSkill: 'chuangshi',*/
                        },
                        zqchuangshi_lose: { //有牌进入弃牌堆后，创世牌置于牌堆底，其他牌复制到S区，销毁超出最大显示设置的创世牌，人机托管时刷新
                            trigger: {
                                global: ['loseEnd', 'cardsDiscardEnd'],
                            },
                            priority: 9999,
                            firstDo: true,
                            //direct:true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player, card) {
                                if (event.cards && event.cards.length) {
                                    for (var i of event.cards) {
                                        if (get.position(i, true) == 'd') return true; //技能时机可以提前到进入弃牌堆前
                                    }
                                }
                                return false;
                            },
                            content: function () {
                                'step 0'
                                var cards = [];
                                for (var i of trigger.cards) {
                                    if (get.position(i, true) == 'd') {
                                        if (i.storage.zqchuangshi) {
                                            delete i.storage.zqchuangshi;
                                            ui.cardPile.appendChild(i);
                                        } else cards.push(i);
                                    }
                                }
                                game.updateRoundNumber();
                                if (cards.length) {
                                    const clone = (card) => {
                                        let newCard = ui.create.card();
                                        newCard.init(card);
                                        newCard.origin = card;
                                        return newCard;
                                    }
                                    player.loseToSpecial(cards.map(item => clone(item)), 'zqchuangshi');
                                }
                                'step 1'
                                var numx = lib.config.extension_天庭_zqchuangshiNumx;
                                if (!numx) var numx = 80;
                                if (typeof Number(numx) === 'number') {
                                    if (player == game.me && _status.auto == false) var nums = numx;
                                    else var nums = Math.ceil(numx / 2);
                                } else var nums = 40;
                                var cardsx = player.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).length - nums;
                                if (cardsx > 0) {
                                    game.broadcastAll(function (player, cardsx) {
                                        player.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).slice(0, cardsx).forEach(card => {
                                            card.fix();
                                            card.remove();
                                            card.destoryed = true;
                                        });
                                    }, player, cardsx);
                                }
                                var discardPiles = ui.discardPile.childNodes;
                                if (cardsx < -1 && discardPiles.length >= nums) {
                                    if (player == game.me && _status.auto == false) { }
                                    else {
                                        game.broadcastAll(function (player) {
                                            player.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).forEach(card => {
                                                card.fix();
                                                card.remove();
                                                card.destoryed = true;
                                            });
                                        }, player);
                                        var cards = Array.from(discardPiles).slice(Math.max(0, discardPiles.length - nums), discardPiles.length);
                                        if (cards) {
                                            const clone = (card) => {
                                                let newCard = ui.create.card();
                                                newCard.init(card);
                                                newCard.origin = card;
                                                return newCard;
                                            }
                                            player.loseToSpecial(cards.map(item => clone(item)), 'zqchuangshi');
                                        }
                                    }
                                }
                                'step 2'
                                ui.updatehl();
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqchuangshi_tag: { //用牌时替换为弃牌堆中一样的牌，同时销毁其他盘古S区的牌
                            trigger: {
                                global: ['useCardBefore', 'respondBefore'],
                            },
                            priority: 9999,
                            firstDo: true,
                            //direct:true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            onremove: true,
                            //mark:true,
                            marktext: '创世',
                            intro:{
                                content: 'mark',
                            },
                            init: function (player) {
                                player.storage.zqchuangshi_mark = [];
                            },
                            filter: function (event, player) {
                                return event.player.hasSkill('zqchuangshi_tag') && event.cards && event.cards.length;
                            },
                            content: function () {
                                if (!player.storage.zqchuangshi_mark) player.storage.zqchuangshi_mark = [];
                                if (trigger.cards && trigger.cards.length) {
                                    var cardn = [];
                                    for (var i of trigger.cards) {
                                        if (trigger.player == player) {
                                            if (get.tag(i, 'damage')) var audio = ['zqchuangshi4', 'zqchuangshi5', 'zqchuangshi6'].randomGet();
                                            else var audio = ['zqchuangshi1', 'zqchuangshi2', 'zqchuangshi3'].randomGet();
                                            game.playAudio('../extension/天庭/audio/skill/zq_pangu/' + audio + '.mp3');
                                            player.logSkill('zqchuangshix');
                                            i.storage.zqchuangshi = true;

                                            if (get.position(i, true) == 's' && i.hasGaintag('zqchuangshi')) {
                                                if (i == trigger.cards[0]) {
                                                    player.storage.zqchuangshi_mark.push(i);
                                                    player.addMark('zqchuangshi_tag', 1, false);
                                                    player.markSkill('zqchuangshi_tag');
                                                    player.syncStorage('zqchuangshi_tag');
                                                }
                                                game.broadcastAll(function (player, i) {
                                                    var cardd = get.cardPile(function (card) {
                                                        return get.position(card) == 'd' && card.name == i.name && card.suit == i.suit && card.number == i.number && card.nature == i.nature;
                                                    });
                                                    if (cardd) {
                                                        cardd.storage.zqchuangshi = true;
                                                        cardn.add(cardd);
                                                    }
                                                    i.fix();
                                                    i.remove();
                                                    i.destoryed = true;
                                                    ui.updatehl();
                                                }, player, i);
                                            }
                                        } else {
                                            game.broadcastAll(function (player, i) {
                                                var cardd = player.getCards('s').filter(function (card) {
                                                    return card.hasGaintag('zqchuangshi') && card.name == i.name && card.suit == i.suit && card.number == i.number && card.nature == i.nature;
                                                });
                                                if (cardd.length) {
                                                    cardd[0].fix();
                                                    cardd[0].remove();
                                                    cardd[0].destoryed = true;
                                                }
                                                ui.updatehl();
                                            }, player, i);
                                        }
                                    }
                                    if(cardn.length) {
                                        trigger.cards = cardn;
                                        if(trigger.card?.cards) trigger.card.cards = cardn;
                                    }
                                }
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqchuangshi_use: { //清除每回合用牌次数
                            trigger: {
                                global: 'phaseAfter',
                            },
                            priority: -2,
                            //direct:true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            content: function () {
                                player.storage.zqchuangshi_mark = [];
                                player.removeMark('zqchuangshi_tag', player.countMark('zqchuangshi_tag'), false);
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqchuangshi_die: { //死亡和技能封印后清除创世牌，复活和技能生效后获得创世牌
                            trigger: {
                                global: ['dieBegin', 'logSkill', 'revive', 
                                    'playercontrol', 'chooseToUseBegin', 'chooseToRespondBegin', 'chooseToDiscardBegin', 'chooseToCompareBegin', 'chooseButtonBegin', 'chooseCardBegin', 'chooseTargetBegin', 'chooseCardTargetBegin', 'chooseControlBegin', 'chooseBoolBegin', 'choosePlayerCardBegin', 'discardPlayerCardBegin', 'gainPlayerCardBegin', 'chooseToMoveBegin', 'chooseToPlayBeatmapBegin', 'phaseBegin', 'phaseJudgeBegin', 'phaseDrawBegin', 'phaseUseBegin', 'phaseDiscardBegin', 'phaseEnd', 'phaseAfter', 'gainEnd', 'loseEnd', 'damageEnd', 'dyingBegin'],
                            },
                            priority: -2,
                            //direct:true,
                            popup: false,
                            forced: true,
                            charlotte: true,
                            lastDo: true,
                            forceDie: true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                if (event.name == 'die') return event.player.hasSkill('zqchuangshi');
                                if (event.name == 'logSkill') {
                                    const list = player.getSkills(null, false, false).filter(skill => {
                                        if (player.getStorage('skill_blocker')) {
                                            for (var i of player.getStorage('skill_blocker')) {
                                                if (lib.skill[i] && lib.skill[i].skillBlocker && lib.skill[i].skillBlocker(skill, player)) return true;
                                            };
                                        };
                                        if (player.disabledSkills) {
                                            if (player.disabledSkills[skill] && player.disabledSkills[skill].length > 0) return true;
                                        };
                                        if (player.shixiaoedSkills) {
                                            if (player.shixiaoedSkills.includes(skill)) return true;
                                        };
                                        if (player.isTempBanned(skill)) return true;
                                        return false;
                                    });
                                    return list.includes('zqchuangshi');
                                };
                                if (!player.hasSkill('zqchuangshi')) return false;
                                var num = player.getCards('s').filter(card => card.hasGaintag('zqchuangshi'));
                                return player.hasSkill('zqchuangshi') && Math.min(20, ui.discardPile.childNodes.length) > num.length;
                            },
                            content: function () {
                                if (trigger.name == 'die') {
                                    var playercs = trigger.player;
                                    game.broadcastAll(function (playercs) {
                                        playercs.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).forEach(card => {
                                            card.fix();
                                            card.remove();
                                            card.destoryed = true;
                                        });
                                    }, playercs);
                                } else {
                                    if (trigger.name == 'logSkill') {
                                        game.broadcastAll(function (player) {
                                            player.getCards('s').filter(card => card.hasGaintag('zqchuangshi')).forEach(card => {
                                                card.fix();
                                                card.remove();
                                                card.destoryed = true;
                                            });
                                        }, player);
                                    } else {
                                        var next = game.createEvent('zqchuangshi_revive');
                                        next.player = player;
                                        next.setContent(lib.skill.zqchuangshi.init2);
                                    }
                                }
                            },
                            sourceSkill: 'chuangshi',
                        },
                        zqkaitian: {
                            audio: 'ext:天庭/audio/skill/zq_pangu:1',
                            trigger: {
                                global: 'gameStart',
                            },
                            //init:function(player){},
                            priority: 2,
                            forced: true,
                            //direct:true,
                            content: function () {
                                game.cardsGotoOrdering(get.cards(Math.ceil(ui.cardPile.childNodes.length / 2)));
                            },
                        },
                        //财神
                        zqzhaobao: { //感谢大佬Rintim代写技能：招宝、纳珍！
                            usable: 1,
                            enable: 'phaseUse',
                            audio: 'ext:天庭/audio/skill/zq_zhaogongming:2',
                            onChooseToUse(event) {
                                if (!game.online && !event.zqzhaobao_cards) {
                                    event.set('zqzhaobao_cards', get.cardPile(function (card) {
                                        return get.subtype(card) == 'equip5';
                                    }));
                                }
                            },
                            filter: function () {
                                return get.event().zqzhaobao_cards || game.hasPlayer(current => !current.isEmpty(5) && game.hasPlayer(current2 => current != current2 && !current2.isMin() && current2.isEmpty(5)));
                            },
                            chooseButton: {
                                dialog: function (event, player) {
                                    const list = [
                                        '移动场上的一张宝物牌',
                                        '从牌堆或弃牌堆中选择一张宝物牌并获得之'
                                    ];
                                    let choiceList = ui.create.dialog('【招宝】你选择一项', 'forcebutton', 'hidden');
                                    for (let i = 0; i < list.length; ++i) {
                                        let div = ui.create.div('.popup.text', {
                                            width: 'calc(100%-10px)',
                                            display: 'inline-block'
                                        }, list[i]);
                                        if (!lib.skill.zqzhaobao.chooseButton.filter({ link: i }, player)) div.style.opacity = 0.5;
                                        var next = choiceList.add(div.outerHTML);
                                        next.firstChild.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', ui.click.button);
                                        next.firstChild.link = i;
                                        /*for (var j in lib.element.button) {
                                            next[j] = lib.element.button[i];
                                        }*/
                                        choiceList.buttons.add(next.firstChild);
                                    }
                                    return choiceList;
                                },
                                filter: function (button, player) {
                                    if (button.link == 0) return game.hasPlayer(current => !current.isEmpty(5) && game.hasPlayer(current2 => current != current2 && !current2.isMin() && current2.isEmpty(5)));
                                    else return get.event().getParent().zqzhaobao_cards || get.event().zqzhaobao_cards;
                                },
                                check: function (button) {
                                    var player = _status.event.player;
                                    if (game.hasPlayer(current => !current.isEmpty(5) && game.hasPlayer(current2 => current != current2 && !current2.isMin() && current2.isEmpty(5)))) {
                                        if (!get.cardPile(card => get.subtype(card) == 'equip5')) return 1;
                                        if (game.hasPlayer(function (current) {
                                            if (current != player && get.attitude(player, current) < 0) {
                                                var es = current.getCards('e', { subtype: 'equip5' });
                                                for (var i = 0; i < es.length; i++) {
                                                    if (get.value(es[i], current) > 0) return true;
                                                }
                                            }
                                        }) && game.hasPlayer(function (current) {
                                            if (current.isEmpty(5) && (current == player || get.attitude(player, current) > 0)) return true;
                                        })) return 1;
                                    }
                                    return button.link;
                                },
                                backup: function (links) {
                                    const audio = ['zqzhaobao1', 'zqzhaobao2'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/zq_zhaogongming/' + audio + '.mp3');
                                    return lib.skill[['zqzhaobao_', ['move', 'gain'][links[0]]].join('')];
                                },
                            },
                            ai: {
                                order: 5,
                                result: {
                                    player: 1,
                                },
                            },
                        },
                        zqzhaobao_gain: {
                            content: function (event, step, source, player, target, targets, card, cards, skill, forced, num, trigger, result) {
                                'step 0'
                                event.cards = [], event.cardxs = {
                                    cardPile: [],
                                    discardPile: []
                                };
                                for (var i = 0; i < ui.cardPile.childNodes.length; i++) {
                                    var current = ui.cardPile.childNodes[i];
                                    if (get.subtype(current) == 'equip5') {
                                        event.cards.add(current);
                                        event.cardxs['cardPile'].add(current);
                                    }
                                }
                                for (var i = 0; i < ui.discardPile.childNodes.length; i++) {
                                    var current2 = ui.discardPile.childNodes[i];
                                    if (get.subtype(current2) == 'equip5') {
                                        event.cards.add(current2);
                                        event.cardxs['discardPile'].add(current2);
                                    }
                                }
                                if (event.cards.length == 0) {
                                    game.log('牌堆和弃牌堆中没有宝物牌');
                                    player.chooseControl('ok').set('dialog', ['牌堆和弃牌堆中没有宝物牌']);
                                    event.finish();
                                }
                                'step 1'
                                const bool1 = event.cardxs.cardPile.length > 0, bool2 = event.cardxs.discardPile.length > 0;
                                var next = player.chooseButton(
                                    [['【招宝】获得', bool1 && bool2 ? '牌堆或弃牌堆的' : (bool1 ? '牌堆的' : '弃牌堆的'), '一张宝物牌'].join('')].concat(
                                        bool1 && bool2 ? Object.entries(event.cardxs).reduce((result, [name, cards]) => {
                                            return result.concat([['######', name == 'cardPile' ? '牌堆' : '弃牌堆'].join(''), cards])
                                        }, []) : [event.cards]
                                    )
                                );
                                next.set('selectButton', [1, 1]);
                                next.set('complexSelect', true);
                                next.set('ai', button => get.value(button.link));
                                'step 2'
                                if (result && result.bool) {
                                    const cardxs = result.links.slice(0);
                                    player.gain(cardxs, 'draw');
                                    game.log(player, '获得了', get.cnNumber(cardxs.length), '张宝物牌');
                                }
                            },
                        },
                        zqzhaobao_move: {
                            content: function () {
                                'step 0'
                                if (event.isMine() || event.isOnline()) game.delay();
                                'step 1'
                                event.forceDie = true;
                                if (!game.hasPlayer(current => !current.isEmpty(5) && game.hasPlayer(current2 => current != current2 && !current2.isMin() && current2.isEmpty(5)))) {
                                    event.finish();
                                    return;
                                }
                                var next = player.chooseTarget(2, function (card, player, target) {
                                    if (ui.selected.targets.length) {
                                        var from = ui.selected.targets[0];
                                        if (target.isMin()) return false;
                                        var es = from.getCards('e', { subtype: 'equip5' });
                                        for (var i = 0; i < es.length; i++) {
                                            if (target.isEmpty(get.subtype(es[i]))) return true;
                                        }
                                        return false;
                                    } else return target.countCards('e', { subtype: 'equip5' }) > 0;
                                });
                                next.set('nojudge', event.nojudge || false);
                                next.set('ai', function (target) {
                                    var player = _status.event.player;
                                    var att = get.attitude(player, target);
                                    var sgnatt = get.sgn(att);
                                    if (ui.selected.targets.length == 0) {
                                        if (att > 0) {
                                            if (target.countCards('e', { subtype: 'equip5' }, function (card) {
                                                return get.value(card, target) < 0 && game.hasPlayer(function (current) {
                                                    return current != target && get.attitude(player, current) < 0 && current.isEmpty(get.subtype(card))
                                                });
                                            }) > 0) return 9;
                                        } else if (att < 0) {
                                            if (game.hasPlayer(function (current) {
                                                if (current != target && get.attitude(player, current) > 0) {
                                                    var es = target.getCards('e', { subtype: 'equip5' });
                                                    for (var i = 0; i < es.length; i++) {
                                                        if (get.value(es[i], target) > 0 && current.isEmpty(get.subtype(es[i])) && get.value(es[i], current) > 0) return true;
                                                    }
                                                }
                                            })) return -att;
                                        } return 0;
                                    }
                                    var es = ui.selected.targets[0].getCards('e', { subtype: 'equip5' });
                                    var i;
                                    var att2 = get.sgn(get.attitude(player, ui.selected.targets[0]));
                                    for (i = 0; i < es.length; i++) {
                                        if (sgnatt != 0 && att2 != 0 &&
                                            get.sgn(get.value(es[i], ui.selected.targets[0])) == -att2 &&
                                            get.sgn(get.value(es[i], target)) == sgnatt &&
                                            target.isEmpty(get.subtype(es[i]))
                                        ) return Math.abs(att);
                                    }
                                    if (i == es.length) return 0;
                                    return -att * get.attitude(player, ui.selected.targets[0]);
                                });
                                next.set('multitarget', true);
                                next.set('targetprompt', _status.event.targetprompt || ['被移走', '移动目标']);
                                next.set('prompt', event.prompt || '移动场上的一张宝物牌');
                                if (event.prompt2) next.set('prompt2', event.prompt2);
                                if (event.forced) next.set('forced', true);
                                'step 2'
                                event.result = result;
                                if (result.bool) {
                                    player.line2(result.targets, 'green');
                                    event.targets = result.targets;
                                } else event.finish();
                                'step 3'
                                game.delay();
                                'step 4'
                                if (event.targets.length == 2) {
                                    player.choosePlayerCard('e', true, function (button) {
                                        var player = _status.event.player;
                                        var targets0 = _status.event.targets0;
                                        var targets1 = _status.event.targets1;
                                        if (get.attitude(player, targets0) > 0 && get.attitude(player, targets1) < 0) {
                                            if (get.value(button.link, targets0) < 0) return 10;
                                            return 0;
                                        } else return get.equipValue(button.link);
                                    }, targets[0])
                                        .set('nojudge', event.nojudge || false)
                                        .set('targets0', targets[0])
                                        .set('targets1', targets[1])
                                        .set('filterButton', function (button) {
                                            var targets1 = _status.event.targets1;
                                            if (get.subtype(button.link) != 'equip5') return false;
                                            return targets1.isEmpty(get.subtype(button.link));
                                        });
                                } else event.finish();
                                'step 5'
                                if (result.bool && result.links.length) {
                                    var link = result.links[0];
                                    event.targets[1].equip(link);
                                    event.targets[0].$give(link, event.targets[1])
                                    event.result.card = link;
                                    event.result.position = get.position(link);
                                    game.delay();
                                }
                            },
                        },
                        zqnazhen: {
                            audio: 'ext:天庭/audio/skill/zq_zhaogongming:1',
                            usable: 1,
                            enable: 'phaseUse',
                            filter: function () {
                                return game.hasPlayer(function (current) {
                                    return current.countCards('x') > 0;
                                });
                            },
                            filterTarget: function (_card, _player, target) {
                                return target.countCards('x') > 0;
                            },
                            selectTarget: 1,
                            content: function () {
                                'step 0'
                                event.cards = {};
                                let cards = event.target.getCards('x');
                                for (let i = 0; i < cards.length; ++i) {
                                    if (!cards[i].gaintag || !cards[i].gaintag.length) continue;
                                    let names = cards[i].gaintag, skills = [];
                                    for (let j = 0; j < names.length; j++) {
                                        if (names[j] in lib.skill) {
                                            skills.push(names[j]);
                                        }
                                    }
                                    for (let j = 0; j < skills.length; ++j) {
                                        const info = get.info(skills[j]);
                                        if (info) {
                                            const name = info.sourceSkill || skills[j]
                                            if (!event.cards[name]) event.cards[name] = [];
                                            event.cards[skills[j]].push(cards[i]);
                                        }
                                    }
                                }
                                'step 1'
                                player.chooseButton([['获得', get.translation(target), '武将牌上的一张牌'].join('')].concat(
                                    Object.entries(event.cards).reduce((result, [name, cards]) => {
                                        return result.concat([['###', get.translation(name), '###', get.translation(name + '_info')].join(''), cards]);
                                    }, [])
                                )).set('ai', button => get.value(button.link));
                                'step 2'
                                if (result.bool && result.links.length) {
                                    const cardxs = result.links.slice(0);
                                    player.gain(cardxs, event.target, 'give', 'bySelf');
                                }
                            },
                            ai: {
                                order: 1,
                                result: {
                                    target: function (player, target) {
                                        if (!target.countCards('x')) return 0;
                                        const att = get.attitude(player, target);
                                        if (att > 0) return 0;
                                        return att / get.threaten(target);
                                    },
                                },
                            },
                        },
                        zqzhaocai: {
                            audio: 'ext:天庭/audio/skill/zq_zhaogongming:2',
                            trigger: {
                                global: 'phaseEnd',
                            },
                            forced: true,
                            filter: function (event, player) {
                                return event.player != player && game.hasPlayer(function (current) {
                                    return current != player && current.countCards('h') > player.countCards('h');
                                });
                            },
                            content: function () {
                                var num = game.players.filter(function (i) {
                                    return i.isMaxHandcard();
                                })[0].countCards('h') - player.countCards('h');
                                if (num > 0) player.draw(num);
                            },
                        },
                        zqlishi: {
                            trigger: {
                                global: 'phaseUseBegin',
                            },
                            forced: true,
                            direct: true,
                            audio: 'ext:天庭/audio/skill/zq_zhaogongming:4',
                            filter: function (event, player) {
                                return event.player != player;
                            },
                            content: function () {
                                'step 0'
                                if (_status.zqlishi) delete _status.zqlishi;
                                if (trigger.player.countCards('h') <= 0) event.finish();
                                else {
                                    event.numh = Math.min(trigger.player.countCards('h'), 5);
                                    trigger.player.chooseCard('h', [1, event.numh], '交给' + get.translation(player) + '至多5张手牌，回合结束后其有一半的概率返还给你双倍的牌').set('ai', function (card) {
                                        var att = get.attitude(trigger.player, player);
                                        var name = get.name(card);
                                        if (att > 1) return 5 - get.value(card);
                                        if (name == 'shan') return 0;
                                        return 2.2 - get.value(card);
                                    });
                                }
                                'step 1'
                                if (result.bool) {
                                    player.logSkill('zqlishi2');
                                    const audio = ['zqlishi1', 'zqlishi2', 'zqlishi3'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/zq_zhaogongming/' + audio + '.mp3');
                                    trigger.player.give(result.cards, player, true);
                                    _status.zqlishi = [trigger.player, result.cards.length];
                                }
                            },
                            group: 'zqlishi2',
                        },
                        zqlishi2: {
                            trigger: {
                                global: 'phaseAfter',
                            },
                            direct: true,
                            locked: true,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                return _status.zqlishi && event.player == _status.zqlishi[0] && player.countCards('h') > 0;
                            },
                            content: function () {
                                'step 0'
                                var cardx = Array.from(ui.cardPile.childNodes).randomGet();
                                _status.zqlishi[0].showCards(cardx, '【利市】展示的牌');
                                game.delay(0.5);
                                if (get.color(cardx) == 'red') {
                                    event.numh = Math.min(player.countCards('h'), 2 * _status.zqlishi[1]);
                                    player.chooseCard('h', event.numh, true, '交给' + get.translation(_status.zqlishi[0]) + '【' + event.numh + '】张牌').set('ai', function (card) {
                                        var att = get.attitude(player, _status.zqlishi[0]);
                                        if (att > 1) return 8 - get.value(card);
                                        return 3 - get.value(card);
                                    });
                                } else {
                                    delete _status.zqlishi;
                                    event.finish();
                                }
                                'step 1'
                                if (result.bool) {
                                    player.logSkill('zqlishi2');
                                    game.playAudio('../extension/天庭/audio/skill/zq_zhaogongming/zqlishi4.mp3');
                                    player.give(result.cards, _status.zqlishi[0], true);
                                }
                                delete _status.zqlishi;
                            },
                        },
                        //SP孙权
                        zqchengchen: {
                            audio: 'ext:天庭/audio/skill/sp_zq_sunquan:3',
                            direct: true,
                            locked: false,
                            forced: true,
                            trigger: {
                                player: 'phaseUseBegin',
                            },
                            filter: function (event, player) {
                                return player.countCards('h') >= 2;
                            },
                            content: function () {
                                'step 0'
                                player.chooseCardTarget({
                                    position: 'h',
                                    filterCard: true,
                                    selectCard: 2,
                                    filterTarget: function (card, player, target) {
                                        return player != target;
                                    },
                                    ai1: function (card) {
                                        if (card.name == 'du') return 20;
                                        if (get.tag(card, 'damage')) return 3 + get.value(card);
                                        return 5 - get.value(card);
                                    },
                                    ai2: function (target) {
                                        var att = get.attitude(_status.event.player, target);
                                        if (ui.selected.cards.length && ui.selected.cards[0].name == 'du') {
                                            if (target.hasSkillTag('nodu')) return 0;
                                            return 4 - att;
                                        }
                                        if (target.countCards('h') >= target.hp) return 2 - att;
                                        return -att;
                                    },
                                    prompt: get.prompt2('zqchengchen'),
                                });
                                'step 1'
                                if (result.bool) {
                                    var target = result.targets[0];
                                    var cards = result.cards;
                                    player.storage.zqchengchen_mod = target;
                                    player.logSkill('zqchengchen', target);
                                    player.addTempSkill('zqchengchen_mod', { player: 'phaseUseBefore' });
                                    player.give(cards, target);
                                }
                            },
                            group: 'zqchengchen_damage',
                        },
                        zqchengchen_mod: {
                            mod: {
                                targetEnabled: function (card, player, target, now) {
                                    if (target.storage.zqchengchen_mod && target.storage.zqchengchen_mod == player) {
                                        if (get.tag(card, 'damage')) return false;
                                    }
                                },
                            },
                            mark: true,
                            marktext: '称臣︎',
                            intro: {
                                name: '称臣︎',
                                content: function (storage, player) {
                                    if (player.storage.zqchengchen_mod) return '【' + get.translation(player.storage.zqchengchen_mod) + '】不能使用可以造成伤害的牌指定【' + get.translation(player) + '】为目标';
                                    return '【称臣】选择的角色不能使用可以造成伤害的牌指定【' + get.translation(player) + '】为目标';
                                },
                            },
                            trigger: {
                                global: 'loseEnd',
                            },
                            charlotte: true,
                            forced: true,
                            filter: function (event, player) {
                                return player.storage.zqchengchen_mod && player.storage.zqchengchen_mod == event.player && event.type == 'discard' && event.cards.filterInD('d').length > 0;
                            },
                            content: function () {
                                var cards = trigger.cards.filterInD('d');
                                if (cards) {
                                    player.gain(cards);
                                    game.log(player, '获得了', player.storage.zqchengchen_mod, '弃置的', cards);
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) {
                                        if (player.hasSkill('zqwuwang') && player.storage.zqchengchen_mod && get.tag(card, 'damage') && player.storage.zqchengchen_mod == target && player != target) return 'zeroplayertarget';
                                        //return;
                                    },
                                },
                            },
                        },
                        zqchengchen_damage: {
                            trigger: {
                                source: 'damageEnd',
                            },
                            priority: 3,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                return player.storage.zqchengchen_mod && event.player == player.storage.zqchengchen_mod && player.hasSkill('zqchengchen_mod') && event.num > 0;
                            },
                            content: function () {
                                player.removeSkill('zqchengchen_mod');
                                delete player.storage.zqchengchen_mod;
                            },
                        },
                        zqwuwang: {
                            audio: 'ext:天庭/audio/skill/sp_zq_sunquan:3',
                            derivation: 'zqliujian',
                            trigger: {
                                global: 'roundStart',
                            },
                            priority: 20,
                            juexingji: true,
                            forced: true,
                            skillAnimation: true,
                            animationColor: 'metal',
                            filter: function (event, player) {
                                return !player.hasSkill('zqwuwang_awaken') && game.roundNumber > 1;
                            },
                            content: function () {
                                player.awakenSkill('zqwuwang');
                                player.removeSkill('zqchengchen');
                                game.broadcastAll(function (player) {
                                    player.group = 'wu';
                                }, player);
                                game.log(player, '将势力改为<font color=\"#68DD7F\">【吴】</font>');
                                player.addSkill('zqliujian');
                            },
                            group: ['zqwuwang_damage', 'zqwuwang_round'],
                        },
                        zqwuwang_damage: {
                            trigger: {
                                player: 'damageEnd',
                            },
                            priority: 11,
                            forced: true,
                            popup: false,
                            charlotte: true,
                            filter: function (event, player) {
                                return !player.hasSkill('zqwuwang_awaken') && event.num > 0;
                            },
                            content: function () {
                                player.addSkill('zqwuwang_awaken');
                            },
                        },
                        zqwuwang_awaken: {
                            charlotte: true,
                        },
                        zqwuwang_round: {
                            trigger: {
                                global: 'roundStart',
                            },
                            charlotte: true,
                            forced: true,
                            priority: -1,
                            filter: function (event, player) {
                                return player.hasSkill('zqwuwang_awaken') && game.roundNumber > 1;
                            },
                            content: function () {
                                player.removeSkill('zqwuwang_awaken');
                            },
                        },
                        zqliujian: {
                            audio: 'ext:天庭/audio/skill/sp_zq_sunquan:2',
                            forced: true,
                            direct: true,
                            trigger: {
                                player: 'useCard',
                            },
                            filter: function (event, player) {
                                if (player.hasSkill('zqliujian_basic') && player.hasSkill('zqliujian_trick') && player.hasSkill('zqliujian_equip') && player.hasSkill('zqliujian_heart') && player.hasSkill('zqliujian_spade') && player.hasSkill('zqliujian_club') && player.hasSkill('zqliujian_diamond')) return false;
                                return ['heart', 'diamond', 'club', 'spade'].includes(get.suit(event.card)) && ['basic', 'trick', 'equip'].includes(get.type2(event.card)) && ['black', 'red'].includes(get.color(event.card));
                            },
                            content: function () {
                                var color = get.color(trigger.card);
                                var type = get.type2(trigger.card);
                                var suit = get.suit(trigger.card);
                                if (player.hasSkill('zqliujian_red') || player.hasSkill('zqliujian_black')) {
                                    var numd = 0;
                                    if (!player.hasSkill('zqliujian_' + color)) {
                                        player.addTempSkill('zqliujian_' + color);
                                        numd++;
                                    }
                                    if (!player.hasSkill('zqliujian_' + type)) {
                                        player.addTempSkill('zqliujian_' + type);
                                        numd++;
                                    }
                                    if (!player.hasSkill('zqliujian_' + suit)) {
                                        player.addTempSkill('zqliujian_' + suit);
                                        numd++;
                                    }
                                    if (numd > 0) {
                                        player.logSkill('zqliujian');
                                        player.draw(numd);
                                    }
                                } else {
                                    player.addTempSkill('zqliujian_' + color);
                                    player.addTempSkill('zqliujian_' + type);
                                    player.addTempSkill('zqliujian_' + suit);
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) {
                                        var type = get.type2(card);
                                        var suit = get.suit(card);
                                        if (get.tag(card, 'damage') && player != target && get.attitude(player, target) <= 0) {
                                            if (!player.hasSkill('zqliujian_' + type)) return [1, 2];
                                            if (!player.hasSkill('zqliujian_' + suit)) return [1, 2];
                                        }
                                        //return;
                                    },
                                },
                            },
                            global: 'zqliujian_wuliu',
                        },
                        zqliujian_wuliu: {
                            //equipSkill:true,
                            mod: {
                                attackFrom: function (from, to, distance) {
                                    if (from.group == 'wu') return distance - game.countPlayer(function (current) {
                                        return current.hasSkill('zqliujian');
                                    });
                                },
                            },
                        },
                        zqliujian_red: {
                            charlotte: true,
                            /*mark:true,
                            marktext:'<font color=\"#FF66FF\">红</font>︎',
                            intro:{
                                name:'红色︎',
                            },*/
                        },
                        zqliujian_black: {
                            charlotte: true,
                            /*mark:true,
                            marktext:'黑︎',
                            intro:{
                                name:'黑色︎',
                            },*/
                        },
                        zqliujian_basic: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#FFFF00\">基</font>︎', //黄色
                            intro:{
                                name: '基本牌',
                            },
                        },
                        zqliujian_trick: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#68DD7F\">锦</font>', //绿色，无名杀绿色是68DD7F
                            intro:{
                                name: '锦囊牌',
                            },
                        },
                        zqliujian_equip: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#00CCFF\">装</font>', //蓝色
                            intro:{
                                name: '装备牌',
                            },
                        },
                        zqliujian_heart: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♥</font>︎',
                            intro:{
                                name: '红桃',
                            },
                        },
                        zqliujian_spade: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♠</font>︎︎',
                            intro:{
                                name: '黑桃',
                            },
                        },
                        zqliujian_club: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♣</font>︎︎',
                            intro:{
                                name: '梅花',
                            },
                        },
                        zqliujian_diamond: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♦</font>︎︎',
                            intro:{
                                name: '方块︎︎',
                            },
                        },
                        //SP曹操
                        zqbaoqi: {
                            audio: 'ext:天庭/audio/skill/sp_zq_caocao:3',
                            forced: true,
                            trigger: {
                                player: ['useCard', 'respond'],
                            },
                            filter: function (event, player) {
                                return player.isTurnedOver() && _status.currentPhase && player != _status.currentPhase;
                            },
                            content: function () {
                                if (player.isTurnedOver()) {
                                    game.log(player, '突然睁眼');
                                    player.turnOver();
                                    if (_status.currentPhase && _status.currentPhase.hasMark('zqyixin')) _status.currentPhase.damage(_status.currentPhase.countMark('zqyixin'));
                                    //player.useCard({name:'sha'},_status.currentPhase,false);
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) { //尽量救队友
                                        if (_status.currentPhase) var pp = _status.currentPhase;
                                        if (player.isTurnedOver() && get.name(card) == 'tao' && player.getFriends().includes(target) && pp && get.attitude(player, pp) < 1 && pp.hasMark('zqyixin')) return [1, 2];
                                        //return;
                                    },
                                    target: function (card, player, target) { //攻击你有负面效果
                                        var numh = target.countCards('h');
                                        if (_status.currentPhase) {
                                            var pp = _status.currentPhase;
                                            var att = get.attitude(target, pp);
                                        }
                                        var name = get.name(card);
                                        if (pp && target.isTurnedOver() && att > 1 && pp.hasMark('zqyixin') && player == pp && pp != target) {
                                            if (target.hp > 1) return 0; //队友回合不要出牌
                                            if (get.tag(card, 'damage')) return [1, -2];
                                            return;
                                        }
                                        if (pp && player == pp && pp.hasMark('zqyixin') && target.isTurnedOver() && get.tag(card, 'damage')) {
                                            if (numh > 3 && (name == 'juedou' || name == 'nanman')) return [1, 0, 1, -1.5 * pp.countMark('zqyixin')];
                                            if (pp.countMark('zqyixin') >= pp.hp) return [1, 0, 1, -pp.countMark('zqyixin') - numh / 5];
                                            return [1, 0, 1, -numh / 5];
                                        }
                                        //return;
                                    },
                                },
                            },
                            //group:'zqbaoqi2',
                        },
                        /* zqbaoqi2:{ //已废弃
                trigger:{
                    player:'useCard1',
                },
                filter:function(event){
                    return event.getParent().name=='zqbaoqi'&&event.card&&event.card.name=='sha'&&_status.currentPhase.hasMark('zqyixin');
                },
                forced:true,
                charlotte:true,
                //firstDo:true,
                priority:10,
                temp:true,
                vanish:true,
                silent:true,
                popup:false,
                nopop:true,
                content:function(){
                    if(!trigger.baseDamage) trigger.baseDamage=1;
                    if(_status.currentPhase.hasMark('zqyixin')) trigger.baseDamage+=_status.currentPhase.countMark('zqyixin');
                },
                ai:{
                    damageBonus:true,
                    effect:{
                        target:function(card,player,target){
                            var numh=target.countCards('h');
                            var pp=_status.currentPhase;
                            var name=get.name(card);
                            if(player==pp&&pp.hasMark('zqyixin')&&target.isTurnedOver()&&get.tag(card,'damage')){
                                if(numh>3&&pp.countMark('zqyixin')>=pp.hp&&(name=='juedou'||name=='nanman')) return [1,0,1,-pp.countMark('zqyixin')];
                                return [1,0,1,-numh/8];
                            }
                            //return;
                        },
                    },
                },
                        },*/
                        zqyixin: {
                            audio: 'ext:天庭/audio/skill/sp_zq_caocao:4',
                            trigger: {
                                player: 'damageEnd',
                            },
                            priority: 3,
                            direct: true,
                            frequent: true,
                            onremove: true,
                            //mark:true,
                            marktext: '疑',
                            intro:{
                                name: '疑心',
                                content: 'mark',
                            },
                            filter: function (event, player) {
                                return event.num >= 1;
                            },
                            content: function () {
                                const audio = ['zqyixin1', 'zqyixin2'].randomGet();
                                game.playAudio('../extension/天庭/audio/skill/sp_zq_caocao/' + audio + '.mp3');
                                if (trigger.source && trigger.num >= 1) {
                                    if (!trigger.source.hasMark('zqyixin')) trigger.source.addMark('zqyixin', Math.min(3, trigger.num)); //没有则最多3
                                    else {
                                        var numk = trigger.source.countMark('zqyixin');
                                        if (numk == 1) trigger.source.addMark('zqyixin', Math.min(2, trigger.num)); //有1个最多2
                                        if (numk == 2) trigger.source.addMark('zqyixin', 1); //有2个+1
                                        if (numk > 3) trigger.source.removeMark('zqyixin', numk - 3); //超过3个的部分移除
                                    }
                                }
                            },
                            group: ['zqyixin2', 'zqyixin3'],
                        },
                        zqyixin2: {
                            trigger: {
                                global: 'phaseBegin',
                            },
                            priority: 4,
                            //direct:true,
                            //locked:false,
                            forced: true,
                            filter: function (event, player) {
                                return event.player != player;
                            },
                            content: function () {
                                'step 0'
                                if (player.storage.zqjiameiAudio) delete player.storage.zqjiameiAudio;
                                else {
                                    player.logSkill('zqyixin2');
                                    const audio = ['zqyixin3', 'zqyixin4'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/sp_zq_caocao/' + audio + '.mp3');
                                }
                                if (trigger.player.countCards('h') <= 0) {
                                    if (!trigger.player.hasMark('zqyixin') || trigger.player.countMark('zqyixin') < 3) trigger.player.addMark('zqyixin', 1);
                                    event.finish();
                                } else {
                                    event.numh = Math.ceil(trigger.player.countCards('h') / 2);
                                    trigger.player.chooseCard('h', event.numh, '将一半的手牌(向上取整)交给' + get.translation(player) + '并弃置一枚「疑」，否则你获得一枚「疑」').set('ai', function (card) {
                                        var att = get.attitude(trigger.player, player);
                                        var name = get.name(card);
                                        if (att <= 1) {
                                            if (!player.isTurnedOver()) return 0;
                                            if (!trigger.player.hasMark('zqyixin')) return 0;
                                            if (name == 'shan' || name == 'tao' || name == 'jiu' || name == 'wuxie') return 0;
                                        }
                                        if (att > 1) {
                                            if (name == 'tao' || name == 'wuxie') return 20;
                                            if (event.numh > 3) return 20 - get.value(card);
                                            return 3 - get.value(card);
                                        }
                                        if (!player.hasFriend() && trigger.player.hasMark('zqyixin') && trigger.player.countMark('zqyixin') >= trigger.player.hp) {
                                            return 20 - get.value(card);
                                        }
                                        if (event.numh == 1) return 6 - get.value(card);
                                        if (event.numh < 4) return 4 - get.value(card);
                                        return 0;
                                    });
                                }
                                'step 1'
                                if (result.bool) {
                                    trigger.player.give(result.cards, player, true);
                                    if (trigger.player.hasMark('zqyixin')) trigger.player.removeMark('zqyixin', 1);
                                } else {
                                    if (!trigger.player.hasMark('zqyixin') || trigger.player.countMark('zqyixin') < 3) trigger.player.addMark('zqyixin', 1);
                                }
                            },
                        },
                        zqyixin3: {
                            forced: true,
                            forceDie: true,
                            charlotte: true,
                            trigger: { player: 'dieAfter' },
                            content: function () {
                                for (var i of game.players) {
                                    if (i.hasMark('zqyixin')) i.removeMark('zqyixin', i.countMark('zqyixin'), false);
                                }
                            },
                        },
                        zqjiamei: {
                            audio: 'ext:天庭/audio/skill/sp_zq_caocao:3',
                            trigger: {
                                global: 'phaseBefore',
                            },
                            filter: function (event, player) {
                                game.log('    '); //隔开记录
                                return event.player != player && !player.isTurnedOver();
                            },
                            check: function (event, player) {
                                var pp = event.player;
                                if (!player.hasSkill('zqbaoqi')) return false;
                                if (player.hasJudge('lebu') && player.countCards('h', { name: 'wuxie' }) == 0 && (player.countCards('h', { name: 'shan' }) > 0 || player.countCards('h', { name: 'tao' }) > 0)) return true; //有桃闪被乐✔
                                if (get.attitude(player, pp) > 0) return false; //队友的回合
                                if (player.countCards('h') < 30 && player.countCards('h', { name: 'tao' }) > 0) return true; //有桃时手牌小于30✔
                                if (player.countCards('h') > 15) return false; //手牌不能超过15
                                if (player.countCards('h', { name: 'shan' }) > 0 || player.countCards('h', { name: 'tao' }) > 0 || player.countCards('h', { name: 'jiu' }) > 0) return true; //有闪酒桃✔
                                return false;
                                //var pp=_status.currentPhase; //还是上一回合的玩家
                                //if(player.countCards('h',{name:'shan'})==0) return true; //没有闪 //player.getPrevious()!=pp&&
                            },
                            content: function () {
                                if (!player.isTurnedOver()) {
                                    player.storage.zqjiameiAudio = true; //防止语音重叠
                                    player.turnOver();
                                    player.draw();
                                }
                            },
                        },
                        //SP刘禅            
                        zqtuiwei: {
                            audio: 'ext:天庭:0',
                            trigger: {
                                player: 'zqguixiangAfter',
                            },
                            zhuSkill: true,
                            'prompt2': function (event, player) {
                                return '是否令一名有【正统】的角色成为“主公”，并令你成为“忠臣”？';
                            },
                            filter: function (event, player) {
                                return get.mode() == 'identity' && game.zhu && player == game.zhu && game.hasPlayer(function (current) {
                                    return !current.hasSkill('zqanle') && !current.hasSkill('zqanlex') && current.hasSkill('zqzhengtong');
                                });
                            },
                            content: function () {
                                'step 0'
                                var targetx = game.players.filter(function (i) {
                                    return !i.hasSkill('zqanle') && !i.hasSkill('zqanlex') && i.hasSkill('zqzhengtong');
                                });
                                if (targetx && targetx.length) {
                                    if (targetx.length == 1) {
                                        var zqtuiwei_zhu = targetx[0];
                                        player.line(zqtuiwei_zhu);//射线
                                        game.broadcastAll(function (player, zqtuiwei_zhu) {
                                            zqtuiwei_zhu.identity = player.identity;
                                            delete player.isZhu;
                                            player.identity = 'zhong';
                                            game.zhu = zqtuiwei_zhu;
                                            zqtuiwei_zhu.showIdentity();
                                            player.showIdentity();
                                        }, player, zqtuiwei_zhu);
                                        zqtuiwei_zhu.gainMaxHp();
                                        game.log('【', player, '退位】，将“主公”让给了', zqtuiwei_zhu);
                                        event.goto(2);
                                    } else {
                                        var next = player.chooseTarget(true, '选择一名拥有【正统】的角色成为“主公”，之后你成为“忠臣”');
                                        next.set('filterTarget', function (card, player, target) {
                                            return targetx.includes(target);
                                        });
                                        next.set('ai', function (target) {
                                            return -get.attitude(_status.event.player, target);
                                        });
                                    }
                                } else event.goto(2);
                                'step 1'
                                if (result.bool) {
                                    var zqtuiwei_zhu = result.targets[0];
                                    player.line(zqtuiwei_zhu);//射线
                                    game.broadcastAll(function (player, zqtuiwei_zhu) {
                                        zqtuiwei_zhu.identity = player.identity;
                                        delete player.isZhu;
                                        player.identity = 'zhong';
                                        game.zhu = zqtuiwei_zhu;
                                        zqtuiwei_zhu.showIdentity();
                                        player.showIdentity();
                                    }, player, zqtuiwei_zhu);
                                    zqtuiwei_zhu.gainMaxHp();
                                    game.log('【', player, '退位】，选择将“主公”让给', zqtuiwei_zhu);
                                }
                                'step 2'
                                var targetx = game.players.filter(function (i) {
                                    return i.identity == 'nei';
                                });
                                if (targetx && targetx.length) {
                                    event.numn = 0;
                                    event.targetx = targetx;
                                } else {
                                    if (_status.connectMode) game.checkOnlineResult?.(); else game.checkResult?.();
                                    event.finish();
                                }
                                'step 3'
                                event.targets = event.targetx[event.numn];
                                event.numn++;
                                event.targets.chooseControl('确定', 'cancel2').set('prompt', '【退位】：是否加入“反贼”阵营？');
                                'step 4'
                                if (result.control == '确定') {
                                    var zqtuiwei_fan = event.targets;
                                    if (zqtuiwei_fan.identity != 'fan') {
                                        zqtuiwei_fan.line(player);
                                        game.broadcastAll(function (player, zqtuiwei_fan) {
                                            zqtuiwei_fan.identity = 'fan';
                                            zqtuiwei_fan.showIdentity();
                                        }, player, zqtuiwei_fan);
                                        game.log('【', player, '退位】，原内奸', zqtuiwei_fan, '选择加入“反贼”阵营');
                                    }
                                }
                                'step 5'
                                if (event.numn < event.targetx.length) event.goto(3);
                                'step 6'
                                if (_status.connectMode) game.checkOnlineResult?.(); else game.checkResult?.();
                            },
                        },
                        zqguixiang: {
                            audio: 'ext:天庭/audio/skill/sp_zq_liushan:3',
                            trigger: {
                                player: 'dying',
                            },
                            check: function (event, player) {
                                if (!player.hasFriend()) return true;
                                return (game.zhu && player == game.zhu) || !_status.currentPhase || get.attitude(player, _status.currentPhase) >= 0;
                            },
                            limited: true,
                            unique: true,
                            locked: false,
                            filter: function (event, player) {
                                return player.hp <= 0;
                            },
                            skillAnimation: true,
                            animationColor: 'thunder',
                            content: function () {
                                'step 0'
                                player.awakenSkill('zqguixiang');
                                'step 1'
                                var num = player.maxHp - player.hp;
                                if (num) player.recover(num);
                                'step 2'
                                if (_status.currentPhase && _status.currentPhase.isAlive()) _status.currentPhase.addSkill('zqzhengtong');
                            },
                            mark: true,
                            intro:{
                                content: 'limited',
                            },
                            ai: {
                                threaten: 4,
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, 'damage') && target != player && (target.hp == 1 || get.mode() == 'identity' && game.zhu && target == game.zhu && target.hp <= 2) && player.identity != 'zhong' && player.identity != 'mingzhong') return [0, 0, 1, 10]; //攻击我，拿技能正统
                                        if ((get.tag(card, 'recover') || get.tag(card, 'save')) && (target == player || get.attitude(player, target) >= 0)) {
                                            if (get.mode() == 'identity' && game.zhu && target == game.zhu) return [0, -2]; //队友不要救
                                        }
                                        //return;
                                    },
                                },
                            },
                        },
                        zqanle: {
                            audio: 'ext:天庭/audio/skill/sp_zq_liushan:4',
                            trigger: {
                                source: 'damageBegin1',
                            },
                            priority: -100,
                            lastDo: true,
                            forced: true,
                            direct: true,
                            charlotte: true,
                            persevereSkill: true,
                            //fixed:true,
                            //superCharlotte:true,
                            filter: function (event, player) {
                                return event.num > 0;
                            },
                            init2: function (player) {
                                if (player.hasSkill('zqanlex')) player.removeSkill('zqanlex');
                            },
                            ondisable: true,
                            onremove: true,
                            onremove: function (player) {
                                if (player.hasSkill('zqzhengtong')) player.addSkill('zqanlex');
                            },
                            content: function () {
                                game.playAudio('../extension/天庭/audio/skill/sp_zq_liushan/zqanle1.mp3');
                                game.log(player, '对', trigger.player, '造成的伤害-1');
                                if (trigger.num < 1) trigger.num = 0;
                                else trigger.num--;
                            },
                            group: ['zqanle1', 'zqanle_ai_jiu', 'zqanle_die'],
                            global: 'zqanle_ai',
                        },
                        zqanlex: { //相同技能
                            audio: 'ext:天庭:0',
                            trigger: {
                                source: 'damageBegin1',
                            },
                            priority: -101,
                            lastDo: true,
                            forced: true,
                            direct: true,
                            charlotte: true,
                            persevereSkill: true,
                            //fixed:true,
                            //superCharlotte:true,
                            filter: function (event, player) {
                                return event.num > 0 && !player.hasSkill('zqanle');
                            },
                            init2: function (player) {
                                if (player.hasSkill('zqanle')) player.removeSkill('zqanle');
                            },
                            ondisable: true,
                            onremove: true,
                            onremove: function (player) {
                                if (player.hasSkill('zqzhengtong')) player.addSkill('zqanle');
                            },
                            get content() { return lib.skill.zqanle.content },
                            set content(content) { lib.skill.zqanle.content = content },
                            group: ['zqanle1', 'zqanle_ai_jiu', 'zqanle_die'],
                            global: 'zqanle_ai',
                        },
                        zqanle_ai: {
                            ai: {
                                effect: {
                                    target: function (card, player, target, current) { //安乐伤害减一
                                        if ((player.hasSkill('zqanle') || player.hasSkill('zqanlex')) && get.tag(card, 'damage') && target != player) {
                                            var numx = get.tag(card, 'damage');
                                            if (numx > 1) return;
                                            if (player.hasSkillTag('jueqing', false, target)) return;
                                            //if(player.hasSkillTag('damageBonus')) return;
                                            if (player.storage.zqanle_ai_jiu) return;
                                            if (player.storage.zqanle_ai_skill) return;
                                            return 0; //return [0,0,1,1]; //没效果
                                        }
                                        //return;
                                    },
                                },
                            },
                        },
                        zqanle1: {
                            usable: 3,
                            trigger: {
                                player: 'damageBegin3',
                            },
                            firstDo: true,
                            fixed: true,
                            direct: true,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                return event.num > 0 && game.hasPlayer(function (current) {
                                    return !current.hasSkill('zqanle') && !current.hasSkill('zqanlex') && current.hasSkill('zqzhengtong');
                                });
                            },
                            content: function () {
                                'step 0'
                                var targetx = game.players.filter(function (i) {
                                    return !i.hasSkill('zqanle') && !i.hasSkill('zqanlex') && i.hasSkill('zqzhengtong');
                                });
                                if (targetx && targetx.length) {
                                    if (targetx.length == 1) {
                                        player.line(targetx[0]);//射线
                                        trigger.player = targetx[0];
                                        game.log('<font color=\"#68DD7F\">【安乐】</font>：', targetx[0], '替', player, '受到伤害');
                                        event.finish();
                                    } else {
                                        var next = player.chooseTarget(true, '选择一名有【正统】的角色替你受到伤害');
                                        next.set('filterTarget', function (card, player, target) {
                                            return targetx.includes(target);
                                        });
                                        next.set('ai', function (target) {
                                            return -get.attitude(_status.event.player, target);
                                        });
                                    }
                                } else event.finish();
                                'step 1'
                                if (result.bool) {
                                    const audio = ['zqanle2', 'zqanle3', 'zqanle4'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/sp_zq_liushan/' + audio + '.mp3');
                                    player.line(result.targets[0]);
                                    trigger.player = result.targets[0];
                                    game.log('<font color=\"#68DD7F\">【安乐】</font>：', result.targets[0], '替', player, '受到伤害');
                                }
                            },
                            ai: {
                                maixie: true,
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, 'damage') && target != player) {
                                            if (target.storage.counttrigger && target.storage.counttrigger['zqanle1'] >= 3) {
                                                if (get.attitude(player, target) < 0) return [1, -1, 1, 3]; //攻击我
                                                return;
                                            }
                                            var targetx = game.players.filter(function (i) {
                                                return i.hasSkill('zqzhengtong') && !i.hasSkill('zqanle') && !i.hasSkill('zqanlex');
                                            });
                                            if (targetx) {
                                                if (targetx.length == 1) {
                                                    if (player == targetx[0]) { //单挑
                                                        if (targetx[0].hp <= 1) return [0, 0, 1, -2];
                                                        if (game.zhu && targetx[0] == game.zhu) return;
                                                        return [0, -0.5, 1, -0.2];
                                                    }
                                                    if (get.attitude(target, targetx[0]) < 0) return [-1, 2]; //你的敌人，卖血
                                                    if (get.attitude(player, targetx[0]) < 0) return [1, -1, 1, 1]; //player的敌人，攻击你
                                                    return; //共同队友
                                                }
                                                if (targetx.length > 1) {
                                                    if (game.hasPlayer(function (current) {
                                                        var att1 = get.attitude(target, current);
                                                        var zqzhengtong = current.hasSkill('zqzhengtong') && !current.hasSkill('zqanle') && !current.hasSkill('zqanlex');
                                                        return zqzhengtong && att1 < 0;
                                                    })) return [-1, 3]; //有我的敌人，卖血
                                                    if (game.hasPlayer(function (current) {
                                                        var att2 = get.attitude(player, current);
                                                        var zqzhengtong = current.hasSkill('zqzhengtong') && !current.hasSkill('zqanle') && !current.hasSkill('zqanlex');
                                                        return zqzhengtong && att2 >= 0;
                                                    })) return [1, -1, 1, -3]; //有共同队友，不能攻击我
                                                    return [1, -1, 1, 3]; //有player的敌人，攻击我
                                                } return;
                                            } return;
                                        } return;
                                    },
                                },
                            },
                        },
                        zqanle_ai_jiu: {
                            trigger: {
                                player: 'useCardBefore',
                            },
                            popup: false,
                            forced: true,
                            fixed: true,
                            charlotte: true,
                            superCharlotte: true,
                            content: function () {
                                'step 0'
                                if (player.hasSkill('jiu') && get.name(trigger.card) == 'sha') player.storage.zqanle_ai_jiu = true;
                                else if (player.storage.zqanle_ai_jiu) delete player.storage.zqanle_ai_jiu;
                                'step 1'
                                var func = function (skill) {
                                    var info = get.info(skill);//技能信息
                                    if (!info || info.charlotte) return false;
                                    //if(!lib.translate[skill+'_info']) return false;
                                    return true;
                                };
                                var skills = [];
                                var skilln = player.getSkills(true);//已获得的技能(删掉第二个false则包括装备)
                                for (var i = 0; i < skilln.length; i++) {
                                    if (func(skilln[i])) skills.add(skilln[i]);
                                }
                                if (player.storage.zqanle_ai_skill) delete player.storage.zqanle_ai_skill;
                                if (skills) {
                                    for (let i of skills) {
                                        if (lib.translate[i + '_info'] && lib.translate[i + '_info'].indexOf('伤害+') != -1 && lib.translate[i + '_info'].indexOf('受到') == -1) return player.storage.zqanle_ai_skill = true;
                                    }
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) { //酒杀，不浪费牌
                                        var name = get.name(card);
                                        if (target && get.attitude(player, target) < 0) {
                                            if ((player.hasSkill('jiu') && name == 'sha') || (name == 'jiu' && !player.hasSkill('jiu') && player == target)) return [1, 1.4];
                                            if (player.countCards('h') > player.getHandcardLimit() && get.tag(card, 'damage')) return [1, 1.4];
                                        }
                                        //return;
                                    },
                                },
                            },
                        },
                        zqanle_die: {
                            forced: true,
                            forceDie: true,
                            charlotte: true,
                            trigger: { player: 'dieAfter' },
                            filter: function (event, player) {
                                return game.hasPlayer(function (current) {
                                    return current.hasSkill('zqzhengtong');
                                });
                            },
                            content: function () {
                                for (var i = 0; i < game.players.length; i++) {
                                    if (game.players[i].hasSkill('zqzhengtong')) {
                                        game.log(game.players[i], '失去了技能<font color=\'##68DD7F\'>【正统】</font>');
                                        game.players[i].removeSkill('zqzhengtong');
                                    }
                                }
                            },
                        },
                        zqzhengtong: {
                            audio: 'ext:天庭/audio/skill/sp_zq_liushan:3',
                            locked: true,
                            mod: {
                                cardUsable: function (card) {
                                    if (get.info(card) && get.info(card).forceUsable) return;
                                    return Infinity;
                                },
                                targetInRange: function () {
                                    return true;
                                },
                            },
                            trigger: {
                                source: 'damageEnd',
                                player: 'damageEnd',
                            },
                            frequent: true,
                            filter: function (event, player) {
                                return event.num >= 1;
                            },
                            content: function () {
                                if (trigger.num >= 1) player.draw(trigger.num);
                            },
                            ai: {
                                effect: { //不酒杀
                                    player: function (card, player, target) {
                                        var name = get.name(card);
                                        if (player == target && player.hp > 0 && name == 'jiu' && !player.hasSkill('zqanle') && !player.hasSkill('zqanlex')) return [1, -1];
                                        //return;
                                    },
                                },
                            },
                            group: ['zqzhengtong1', 'zqzhengtong2', 'zqzhengtongx'],
                        },
                        zqzhengtong1: {
                            trigger: {
                                player: 'gainEnd',
                            },
                            forced: true,
                            priority: 2,
                            filter: function (event, player) {
                                var evt = event.getParent('phaseUse');
                                return event.cards && event.cards.length && evt && evt.player == player && event.getParent().name == 'draw' && event.getParent(2).name != 'zqzhengtong';
                            },
                            content: function () {
                                if (trigger.cards && trigger.cards.length) player.addGaintag(trigger.cards, 'zqzhengtong');
                                //if(player.countDiscardableCards(player,'he')) player.chooseToDiscard('he','【正统】：弃置一张牌',true,lib.filter.cardDiscardable);
                            },
                        },
                        zqzhengtong2: {
                            mod: {
                                cardDiscardable: function (card, player) {
                                    if (card.hasGaintag('zqzhengtong')) return false;
                                },
                                'cardEnabled2': function (card, player) {
                                    if (get.itemtype(card) == 'card' && card.hasGaintag('zqzhengtong')) return false;
                                },
                            },
                            trigger: {
                                player: 'phaseUseEnd',
                            },
                            forced: true,
                            popup: false,
                            charlotte: true,
                            /*filter:function(event){
                                return event.num<0;
                            },*/
                            content: function () {
                                player.removeGaintag('zqzhengtong');
                            },
                            onremove: function (player) {
                                player.removeGaintag('zqzhengtong');
                            },
                        },
                        zqzhengtongx: {
                            trigger: {
                                source: 'damageBefore',
                            },
                            priority: 10,
                            forced: true,
                            fixed: true,
                            charlotte: true,
                            superCharlotte: true,
                            filter: function (event, player) {
                                for (var i in player.disabledSkills) {
                                    if (i == 'zqanle' || i == 'zqanlex') return true;
                                };
                                return false;
                            },
                            content: function () {
                                for (var i in player.disabledSkills) {
                                    if (i == 'zqanle') delete player.disabledSkills['zqanle'];
                                    if (i == 'zqanlex') delete player.disabledSkills['zqanlex'];
                                }
                            },
                        },
                        //三世佛如来佛祖
                        zqsanshi: {
                            audio: 'ext:天庭/audio/skill/zq_sanshifo:10',
                            trigger: {
                                global: 'useCardAfter',
                                player: 'respond',
                            },
                            locked: false,
                            zhuanhuanji: true, //没啥用的转换技标签
                            persevereSkill: true,
                            init2: function (player) {
                                player.storage.zqsanshiSkill = true;
                                player.storage.zqsanshiNum = 2;
                                player.removeSkill('zqsanshi1');
                                player.removeSkill('zqsanshi3');
                                player.addSkill('zqsanshi2');
                                if (get.mode() == 'identity') player.group = 'zqfo';
                                player.update();
                            },
                            onremove: function (player) {
                                player.removeSkill('zqsanshi1');
                                player.removeSkill('zqsanshi2');
                                player.removeSkill('zqsanshi3');
                            },
                            mod: {
                                aiOrder: function (player, card, num) {
                                    if (player.storage.zqsanshiNum) {
                                        var name = get.name(card);
                                        if (player.storage.zqsanshiNum == 1) {
                                            if (name == 'tao' || name == 'jiu' || name == 'wuzhong' || name == 'wugu' || name == 'zengbin' || name == 'gz_guguoanbang' || name == 'gz_wenheluanwu' || name == 'gz_kefuzhongyuan' || name == 'yiyi' || name == 'kaihua' || name == 'zhulu_card' || name == 'dongzhuxianji' || name == 'guaguliaodu' || name == 'diaobingqianjiang' || name == 'shezhanqunru') return Math.max(1, num - 10);
                                            else {
                                                if (player.storage.zqsanshi_eff) {
                                                    if ((player.storage.zqsanshi_eff >= 0 && get.type(card) == 'equip') || (player.storage.zqsanshi_eff < 0 && get.tag(card, 'multitarget'))) return num + 30;
                                                }
                                            }
                                        }
                                        if (player.storage.zqsanshiNum == 2) {
                                            if (name == 'tao' || name == 'jiu' || name == 'wuzhong' || name == 'wugu' || name == 'zengbin' || name == 'gz_guguoanbang' || name == 'gz_wenheluanwu' || name == 'gz_kefuzhongyuan' || name == 'yiyi' || name == 'kaihua' || name == 'zhulu_card' || name == 'dongzhuxianji' || name == 'guaguliaodu' || name == 'diaobingqianjiang' || name == 'shezhanqunru') return Math.max(10, num + 10);
                                            if (get.type(card) == 'equip') return Math.min(3, num);
                                        }
                                        if (player.storage.zqsanshiNum == 3) {
                                            if (get.type(card) == 'delay' || get.type(card) == 'equip') return num + 10;
                                        }
                                        return num;
                                    }
                                },
                            },
                            check: function (event, player, name) {
                                if (event.name != 'respond' && player.storage.zqsanshiCard && player.storage.zqsanshiNum && player.storage.zqsanshiNum == 1) {
                                    //或者写event.name=='useCard'
                                    if (event.targets && event.targets.length) {
                                        var eff = 0;
                                        for (var i of event.targets) {
                                            if (get.effect(i, player.storage.zqsanshiCard, player, i) >= 0) eff++;
                                            //你(player)对目标(i)用牌(player.storage.zqsanshiCard)，目标(i)的收益>=0
                                            else eff--;
                                        }
                                        var att = 0;
                                        for (var i of event.targets) {
                                            if (get.attitude(player, i) > 0) att++;
                                            else att--;
                                        }
                                        //game.log('目标收益是：',eff,'，队友路人数量是：',att);
                                        if (eff >= 0) return att >= 0; //非敌人角色更多
                                        else return att < 0; //敌人多
                                    }
                                }
                                return true;
                            },
                            filter: function (event, player, card, name) {
                                if (!player.storage.zqsanshiNum) {
                                    if (player.hasSkill('zqsanshi1')) player.storage.zqsanshiNum = 1;
                                    else {
                                        if (player.hasSkill('zqsanshi3')) player.storage.zqsanshiNum = 3;
                                        else player.storage.zqsanshiNum = 2;
                                    }
                                }
                                if (player.storage.zqsanshiSkill == false) return false;
                                if (event.card.storage && event.card.storage.zqsanshi) return false;
                                if (event.card.isCard && event.cards && event.cards.length) {
                                    if (event.name == 'respond' && player.storage.zqsanshiNum == 3) return true; //多余，event.targets可排除respond
                                    if (event.name != 'respond') {
                                        if (player.storage.zqsanshiNum == 1) return event.player == player && event.targets && event.targets.length > 0;
                                        if (player.storage.zqsanshiNum == 2) return event.targets && event.targets.includes(player) && get.type(event.card) != 'delay' && get.type(event.card) != 'equip';
                                        if (player.storage.zqsanshiNum == 3) return event.player == player;
                                    }
                                }
                                return false;
                            },
                            'prompt2': function (event, player) {
                                if (player.storage.zqsanshiNum) {
                                    if (player.storage.zqsanshiNum == 1) {
                                        var str = '●过去：对【' + get.translation(event.targets) + '】视为使用一张：';
                                        if (player.storage.zqsanshiCard) {
                                            if (player.storage.zqsanshiCard.name == 'sha' && player.storage.zqsanshiCard.nature) str += get.translation(player.storage.zqsanshiCard.nature);
                                            return (str + '【' + get.translation(player.storage.zqsanshiCard.name) + get.translation(player.storage.zqsanshiCard.suit) + player.storage.zqsanshiCard.number + '】。');
                                        } else return '●过去：此牌的上一张“被你使用且有目标的”实体即时牌【不存在】，是否摸一张牌？';
                                    }
                                    if (player.storage.zqsanshiNum == 2) {
                                        var str = '●现在：对【' + get.translation(event.player) + '】视为使用一张：';
                                        if (event.card.name == 'sha' && event.card.nature) str += get.translation(event.card.nature);
                                        return (str + '【' + get.translation(event.card.name) + get.translation(event.card.suit) + event.card.number + '】。');
                                    }
                                    if (player.storage.zqsanshiNum == 3) {
                                        return '●未来：展示牌堆顶的三张牌，并视为使用其中一张【即时牌】。';
                                    }
                                }
                                return '●现在：你可以视为对【此牌的使用者】使用一张此牌。';
                            },
                            content: function () {
                                'step 0'
                                if (!player.storage.zqsanshiNum) {
                                    if (player.hasSkill('zqsanshi1')) player.storage.zqsanshiNum = 1;
                                    else {
                                        if (player.hasSkill('zqsanshi3')) player.storage.zqsanshiNum = 3;
                                        else player.storage.zqsanshiNum = 2;
                                    }
                                }
                                player.changeZhuanhuanji('zqsanshi');
                                player.storage.zqsanshiSkill = false; //禁止
                                'step 1'
                                if (player.storage.zqsanshiNum == 1) {
                                    game.log('三世：形态①【过去】');
                                    player.storage.zqsanshiNum = 2;
                                    player.removeSkill('zqsanshi1');
                                    player.removeSkill('zqsanshi3');
                                    player.addSkill('zqsanshi2');
                                    game.broadcastAll((player) => {
                                        var szn = lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable'] && lib.config['extension_十周年UI_outcropSkin'] == 'shizhounian';
                                        var img = szn ? 'characters/' : '';
                                        var src = `extension/天庭/character/${img}zq_rulaifo.jpg`;
                                        if (player.name1 && player.name1 == 'zq_sanshifo') player.node.avatar.setBackgroundImage(src);
                                        if (player.name2 && player.name2 == 'zq_sanshifo') player.node.avatar2.setBackgroundImage(src);
                                    }, player);
                                    player.update();
                                    player.draw();
                                    if (!player.storage.zqsanshiCard) { //防止记录被清除
                                        event.history = player.getHistory('useCard', function (evt) {
                                            return ['basic', 'trick'].includes(get.type(evt.card)) && evt.cards.length && evt.targets.length;
                                        });
                                        if (trigger.cards.length && get.type(trigger.card) != 'delay' && get.type(trigger.card) != 'equip' && trigger.targets.length) {
                                            if (event.history.length > 1) {
                                                var cardh = event.history[event.history.length - 2].card;
                                                cardh = {
                                                    name: cardh.name,
                                                    nature: cardh.nature,
                                                    suit: cardh.suit,
                                                    number: cardh.number,
                                                };
                                                player.storage.zqsanshiCard = get.copy(cardh);
                                                player.storage.zqsanshi_eff = get.effect(player, player.storage.zqsanshiCard, player, player);
                                            }
                                        } else {
                                            if (event.history.length) {
                                                var cardh = event.history[event.history.length - 1].card;
                                                cardh = {
                                                    name: cardh.name,
                                                    nature: cardh.nature,
                                                    suit: cardh.suit,
                                                    number: cardh.number,
                                                };
                                                player.storage.zqsanshiCard = get.copy(cardh);
                                                player.storage.zqsanshi_eff = get.effect(player, player.storage.zqsanshiCard, player, player);
                                            }
                                        }
                                    }
                                    if (player.storage.zqsanshiCard) {
                                        var card = {
                                            name: player.storage.zqsanshiCard.name,
                                            nature: player.storage.zqsanshiCard.nature,
                                            suit: player.storage.zqsanshiCard.suit,
                                            number: player.storage.zqsanshiCard.number,
                                            storage: { zqsanshi: true },
                                        }
                                        for (var i of trigger.targets) {
                                            if (i.isIn()) player.useCard(get.copy(card), i, false); //&&player.canUse(card,i,false) //无中全场失败
                                        }
                                        player.storage.zqsanshiSkill = true; //允许
                                        event.finish();
                                    } else {
                                        game.log('●', player, '使用的上一张有目标的实体即时牌【不存在】');
                                        player.storage.zqsanshiSkill = true; //允许
                                        event.finish();
                                    }
                                }
                                'step 2'
                                if (player.storage.zqsanshiNum == 2) {
                                    game.log('三世：形态②【现在】');
                                    player.storage.zqsanshiNum = 3;
                                    player.removeSkill('zqsanshi1');
                                    player.removeSkill('zqsanshi2');
                                    player.addSkill('zqsanshi3');
                                    game.broadcastAll((player) => {
                                        var szn = lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable'] && lib.config['extension_十周年UI_outcropSkin'] == 'shizhounian';
                                        var img = szn ? 'characters/' : '';
                                        var src = `extension/天庭/character/${img}zq_milefo.jpg`;
                                        if (player.name1 && player.name1 == 'zq_sanshifo') player.node.avatar.setBackgroundImage(src);
                                        if (player.name2 && player.name2 == 'zq_sanshifo') player.node.avatar2.setBackgroundImage(src);
                                    }, player);
                                    player.update();
                                    player.draw();
                                    var card = {
                                        name: trigger.card.name,
                                        nature: trigger.card.nature,
                                        suit: trigger.card.suit,
                                        number: trigger.card.number,
                                        storage: { zqsanshi: true },
                                    }
                                    player.useCard(get.copy(card), trigger.player, false);
                                    player.storage.zqsanshiSkill = true; //允许
                                    event.finish();
                                }
                                'step 3'
                                if (player.storage.zqsanshiNum == 3) {
                                    game.log('三世：形态③【未来】');
                                    player.storage.zqsanshiNum = 1;
                                    player.removeSkill('zqsanshi2');
                                    player.removeSkill('zqsanshi3');
                                    player.addSkill('zqsanshi1');
                                    game.broadcastAll((player) => {
                                        var szn = lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable'] && lib.config['extension_十周年UI_outcropSkin'] == 'shizhounian';
                                        var img = szn ? 'characters/' : '';
                                        var src = `extension/天庭/character/${img}zq_randengfo.jpg`;
                                        if (player.name1 && player.name1 == 'zq_sanshifo') player.node.avatar.setBackgroundImage(src);
                                        if (player.name2 && player.name2 == 'zq_sanshifo') player.node.avatar2.setBackgroundImage(src);
                                    }, player);
                                    player.update();
                                    player.draw();
                                } else {
                                    player.storage.zqsanshiSkill = true; //允许
                                    event.finish();
                                }
                                'step 4'
                                event.cardsx = get.cards(3);
                                player.showCards(event.cardsx);
                                var next = player.chooseCardButton('选择一张即时牌并视为使用之', event.cardsx);
                                next.set('filterButton', function (button) {
                                    var card = button.link;
                                    return get.type(card) != 'delay' && get.type(card) != 'equip' && _status.event.player.hasUseTarget(card);
                                });
                                next.set('ai', function (button) {
                                    return get.value(button.link, _status.event.player);
                                });
                                'step 5'
                                if (result.bool) {
                                    event.resultCard = result.links[0];
                                } else {
                                    player.storage.zqsanshiSkill = true; //允许
                                    event.finish();
                                }
                                'step 6'
                                var card = {
                                    name: event.resultCard.name,
                                    nature: event.resultCard.nature,
                                    suit: event.resultCard.suit,
                                    number: event.resultCard.number,
                                    storage: { zqsanshi: true },
                                }
                                player.chooseUseTarget(get.copy(card), false, '###是否使用选择的牌？###视为使用一张【' + get.translation(card) + '】');
                                player.storage.zqsanshiSkill = true; //允许
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) {
                                        if (player.storage.zqsanshiNum) {
                                            if (player.storage.zqsanshiNum == 1 && player.storage.zqsanshi_eff && player.storage.zqsanshi_eff < 0 && get.tag(card, 'multitarget')) return [1, 10];
                                            if (player.storage.zqsanshiNum == 2) {
                                                var name = get.name(card);
                                                if (player == target && (name == 'tao' || name == 'jiu' || name == 'wuzhong' || name == 'wugu' || name == 'tiesuo' || name == 'zengbin' || name == 'gz_guguoanbang' || name == 'gz_wenheluanwu' || name == 'gz_kefuzhongyuan' || name == 'yiyi' || name == 'kaihua' || name == 'zhulu_card' || name == 'dongzhuxianji' || name == 'guaguliaodu' || name == 'diaobingqianjiang' || name == 'shezhanqunru')) return [1, 20];
                                            }
                                        }
                                    },
                                },
                            },
                            group: ['zqsanshi_use', 'zqsanshi_true', 'guozhan_zqfo'],
                        },
                        zqsanshi_use: { //记录最后一张牌
                            trigger: {
                                player: 'useCardAfter',
                            },
                            priority: -1,
                            direct: true,
                            charlotte: true,
                            filter: function (event, player, card) {
                                return event.cards.length && get.type(event.card) != 'delay' && get.type(event.card) != 'equip' && event.targets.length;
                                //player.hasUseTarget(event.card);
                                /*return player.getHistory('useCard',function(evt){
                                    return ['basic','trick'].includes(get.type(evt.card))&&evt.cards.length&&evt.targets.length;
                                }).length>0;*/
                            },
                            content: function () {
                                event.history = player.getHistory('useCard', function (evt) {
                                    return ['basic', 'trick'].includes(get.type(evt.card)) && evt.cards.length && evt.targets.length;
                                });
                                if (event.history.length) {
                                    var cardh = event.history[event.history.length - 1].card;
                                    cardh = {
                                        name: cardh.name,
                                        nature: cardh.nature,
                                        suit: cardh.suit,
                                        number: cardh.number,
                                    };
                                    game.broadcastAll(function(player,cardh){ //防止客机不更新标记
                                        player.storage.zqsanshiCard = get.copy(cardh);
                                    },player,cardh);
                                    player.storage.zqsanshi_eff = get.effect(player, player.storage.zqsanshiCard, player, player);
                                    game.log('●', player, '使用的最后一张有目标的实体即时牌是：【', get.translation(player.storage.zqsanshiCard.name), get.translation(player.storage.zqsanshiCard.suit), player.storage.zqsanshiCard.number, '】');
                                }
                            },
                        },
                        zqsanshi_true: { //防止因终止结算无法使用此技能
                            trigger: {
                                global: ['phaseAfter', 'phaseUseBefore', 'phaseUseEnd'],
                            },
                            priority: -1,
                            direct: true,
                            charlotte: true,
                            filter: function (event, player, card) {
                                return !player.storage.zqsanshiSkill || player.storage.zqsanshiSkill != true;
                            },
                            content: function () {
                                player.storage.zqsanshiSkill = true;
                            },
                        },
                        zqsanshi1: {
                            charlotte: true,
                            mark: true,
                            marktext: '①过去︎',
                            intro: {
                                name: '三世',
                                content: function (storage, player) { //提示最后一张牌
                                    if (player.storage.zqsanshiCard) return '●过去：当「你对任意角色使用」的实体牌结算完成后，你可以视为对此牌的所有目标角色依次使用一张：【' + get.translation(player.storage.zqsanshiCard.name) + get.translation(player.storage.zqsanshiCard.suit) + player.storage.zqsanshiCard.number + '】。';
                                    return '●过去：当「你对任意角色使用」的实体牌结算完成后，你可以视为对此牌的所有目标角色依次使用一张此牌的上一张【被你使用且有目标的实体即时牌】。';
                                },
                            },
                        },
                        zqsanshi2: {
                            charlotte: true,
                            mark: true,
                            marktext: '②现在',
                            intro:{
                                name: '三世',
                                content: '●现在：当「指定你为目标」的实体即时牌结算完成后，你可以视为对此牌的使用者使用一张【此牌】。',
                            },
                        },
                        zqsanshi3: {
                            charlotte: true,
                            mark: true,
                            marktext: '③未来',
                            intro:{
                                name: '三世',
                                content: '●未来：当「你使用或打出」的实体牌结算完成后，你可以展示牌堆顶的三张牌并视为使用其中一张【即时牌】。',
                            },
                        },
                        //姜子牙
                        zqbabu: {
                            audio: 'ext:天庭/audio/skill/zq_jiangziya:1',
                            trigger: {
                                global: 'gainEnd',
                            },
                            usable: 1,
                            'prompt2': function (event, player) {
                                return '【八部】：弃置【' + get.translation(event.player) + '】区域里的一张牌，否则其摸一张牌。';
                            },
                            filter: function (event, player) {
                                if (player == event.player) return false;
                                var evt = event.getl(player);
                                return evt && evt.cards2 && evt.cards2.length > 0;
                            },
                            check: function (event, player) {
                                if (get.attitude(player, event.player) <= 0 && event.player.countDiscardableCards(player, 'he') == 0) return false;
                                return true;
                            },
                            logTarget: 'player',
                            content: function () {
                                'step 0'
                                if (trigger.player.countDiscardableCards(player, 'hej') == 0) {
                                    trigger.player.draw();
                                    event.finish();
                                }
                                'step 1'
                                var next = player.discardPlayerCard('hej', trigger.player, '【八部】：弃置【' + get.translation(trigger.player) + '】区域的一张牌，否则其摸一张牌', lib.filter.cardDiscardable);
                                next.set('ai', function (button) {
                                    if (get.attitude(_status.event.player, trigger.player) > 0) {
                                        if (get.position(button.link) == 'j') return 20;
                                        if (get.position(button.link) == 'e' && get.equipValue(button.link) < 0) return -get.equipValue(button.link);
                                        return 0;
                                    }
                                    return;
                                });
                                'step 2'
                                if (result.bool) { } else {
                                    game.log(player, '选择令', trigger.player, '摸一张牌');
                                    trigger.player.draw();
                                }
                            },
                        },
                        zqwuyue: {
                            audio: 'ext:天庭/audio/skill/zq_jiangziya:1',
                            trigger: {
                                player: 'loseEnd',
                            },
                            usable: 1,
                            'prompt2': function (event, player) {
                                return '【五岳】：获得你弃置的牌。';
                            },
                            filter: function (event, player) {
                                var evt = event.getParent('phaseDiscard');
                                if (evt && evt.player == player) return false;
                                return event.type == 'discard' && event.cards.filterInD('d').length > 0;
                            },
                            content: function () {
                                var cards = trigger.cards.filterInD('d');
                                if (cards) {
                                    player.gain(cards);
                                    game.log(player, '获得了', cards);
                                }
                            },
                        },
                        zqtianwang: {
                            audio: 'ext:天庭/audio/skill/zq_jiangziya:3',
                            trigger: {
                                player: 'gainAfter',
                            },
                            'prompt2': function (event, player) {
                                return '【天王】：视为使用一张不计入且无次数限制的【杀】。';
                            },
                            usable: 1,
                            popup: false,
                            filter: function (event, player) {
                                var evt = event.getParent('phaseDraw');
                                if (evt && evt.player == player) return false;
                                return event.getg(player).length > 0;
                            },
                            content: function () {
                                player.chooseUseTarget({ name: 'sha' }, false, '###【天王】###选择【杀】的目标').logSkill = 'zqtianwang';
                            },
                            ai: {
                                threaten: function (player, target) {
                                    return 1.6;
                                },
                            },
                        },
                        zqshenbian: {
                            audio: 'ext:天庭/audio/skill/zq_jiangziya:2',
                            trigger: {
                                global: 'useCardAfter',
                            },
                            logTarget: 'player',
                            check: function (event, player) {
                                return get.attitude(player, event.player) < 0;
                            },
                            filter: function (event, player) {
                                return event.targets && event.targets.includes(player) && event.player != player && (event.player.hasSkill('zqtianwang') || event.player.hasSkill('zqbabu') || event.player.hasSkill('zqwuyue'));
                            },
                            content: function () {
                                'step 0'
                                trigger.player.damage();
                                'step 1'
                                if (player.countDiscardableCards(player, 'he')) player.chooseToDiscard('he', '【神鞭】：弃置一张牌', true, lib.filter.cardDiscardable);
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        if (target != player && target.hp < player.hp && target.countCards('he') > 0 && get.attitude(target, player) <= 0 && (player.hasSkill('zqtianwang') || player.hasSkill('zqbabu') || player.hasSkill('zqwuyue'))) return [1, 0, 1, -2];
                                    },
                                },
                                threaten: 2,
                                expose: 2,
                            },
                        },
                        zqshenshi: {
                            forced: true,
                            derivation: ['zqtianwang', 'zqbabu', 'zqwuyue'],
                            group: ['zqtianwang', 'zqbabu', 'zqwuyue'],
                        },
                        zqchuidiao: {
                            audio: 'ext:天庭/audio/skill/zq_jiangziya:3',
                            trigger: {
                                global: 'phaseBegin',
                            },
                            frequent: true,
                            filter: function (event, player) {
                                return event.player != player && event.player.countCards('he') > 0;
                            },
                            content: function () {
                                'step 0'
                                var list = ['zqtianwang', 'zqbabu', 'zqwuyue'];
                                var next = trigger.player.chooseControl(list, 'cancel2');
                                next.set('prompt', '【垂钓】：是否交给【' + get.translation(player) + '】一张牌，并获得一个技能（至你的下个回合开始前）？');
                                next.set('choiceList', list.map(function (i) {
                                    return '<div><div class="skill"></div><div>【' + get.translation(i) + '】' + lib.translate[i + '_info'] + '</div><br></div>';
                                }));

                                var func = function (skill) {
                                    var info = get.info(skill);//技能信息
                                    if (!info || info.charlotte) return false;
                                    if (!lib.translate[skill + '_info']) return false;
                                    return true;
                                };
                                var skills = [];
                                var skilln = trigger.player.getSkills(true, false);//已获得的技能
                                for (var i = 0; i < skilln.length; i++) {
                                    if (func(skilln[i])) skills.add(skilln[i]);
                                }

                                next.set('ai', function () {
                                    //if(get.attitude(trigger.player,player)<0&&trigger.player.inRange(player)) return 'cancel2';
                                    //if(!player.hasFriend()&&get.attitude(trigger.player,player)<0) return 'cancel2';
                                    if (get.attitude(trigger.player, player) < 0) return 'cancel2';
                                    if (trigger.player.countCards('h') < 3 && trigger.player.countCards('h') < trigger.player.getHandcardLimit()) return 'cancel2';
                                    if (trigger.player.hasSkill('zqtianwang') || trigger.player.hasSkill('zqbabu') || trigger.player.hasSkill('zqwuyue')) return 'cancel2';

                                    if (trigger.player.hasFriend()) {
                                        for (let i of skills) {
                                            if (lib.translate[i + '_info'] && lib.translate[i + '_info'].indexOf('交给你') == -1) {
                                                if (lib.translate[i + '_info'].indexOf('交给') != -1) return 'zqbabu';
                                                if (lib.translate[i + '_info'].indexOf('获得你') != -1) return 'zqbabu';
                                                //八部：没有“交给你”，且有“交给”或者“获得你”字样
                                            }
                                        }
                                    }
                                    for (let i of skills) {
                                        if (lib.translate[i + '_info'] && lib.translate[i + '_info'].indexOf('摸牌阶段') == -1 && lib.translate[i + '_info'].indexOf('获得你') == -1 && lib.translate[i + '_info'].indexOf('弃置') == -1 && lib.translate[i + '_info'].indexOf('其摸') == -1 && lib.translate[i + '_info'].indexOf('角色摸') == -1 && lib.translate[i + '_info'].indexOf('获得技能') == -1 && lib.translate[i + '_info'].indexOf('获得【') == -1) {
                                            if (lib.translate[i + '_info'].indexOf('摸') != -1) return 'zqtianwang';
                                            if (lib.translate[i + '_info'].indexOf('获得') != -1) return 'zqtianwang';
                                        }
                                        //天王：没有“摸牌阶段、获得你、弃置、其摸、角色摸、获得技能、获得【”字样，且有“摸”或者“获得”字样
                                    }
                                    for (let i of skills) {
                                        if (lib.translate[i + '_info'] && lib.translate[i + '_info'].indexOf('弃置') != -1 && lib.translate[i + '_info'].indexOf('弃牌阶段') == -1) return 'zqwuyue';
                                        //五岳：有“弃置”，且没有“弃牌阶段”字样
                                    }
                                    return _status.event.controls.slice(0).randomGet();
                                });
                                'step 1'
                                if (result.control == 'cancel2') event.finish();
                                else event.control = result.control;
                                'step 2'
                                trigger.player.chooseCard('he', '选择交给' + get.translation(player) + '的一张牌').set('ai', function (card) {
                                    var att = get.attitude(trigger.player, player);
                                    if (att > 0) return (5 + trigger.player.countCards('h')) - get.value(card);
                                    else {
                                        if (card.name == 'tao') return 0;
                                        else return 5 - get.value(card);
                                    }
                                });
                                'step 3'
                                if (result.bool) {
                                    trigger.player.give(result.cards, player, true);
                                    trigger.player.addTempSkill(event.control, { player: 'phaseBefore' });
                                    game.log(trigger.player, '从【封神榜】上获得了技能<font color=\"#68DD7F\">【', event.control, '】</font>，直到', trigger.player, '的下个回合开始前');
                                } else event.finish();
                            },
                        },
                        //老子太上老君
                        zqdanlu: {
                            derivation: 'zq_dan',
                            global: 'zq_yongjian_zengyu',
                            trigger: {
                                global: 'roundStart',
                            },
                            audio: 'ext:天庭/audio/skill/zq_taishanglaojun:2',
                            forced: true,
                            zhuanhuanji: true,
                            init2: function (player) {
                                game.broadcastAll(function (player) {
                                    player.changeZhuanhuanji('zqdanlu');
                                }, player);
                                player.update();
                            },
                            content: function () {
                                if (!lib.inpile.includes('zq_dan')) {
                                    lib.inpile.push('zq_dan');
                                    event.card1 = game.createCard2('zq_dan', 'heart', 1);
                                    event.card2 = game.createCard2('zq_dan', 'diamond', 1);
                                    event.card3 = game.createCard2('zq_dan', 'club', 1);
                                    ui.cardPile.insertBefore(event.card1, ui.cardPile.childNodes[get.rand(0, ui.cardPile.childNodes.length)]);
                                    ui.cardPile.insertBefore(event.card2, ui.cardPile.childNodes[get.rand(0, ui.cardPile.childNodes.length)]);
                                    ui.cardPile.insertBefore(event.card3, ui.cardPile.childNodes[get.rand(0, ui.cardPile.childNodes.length)]);
                                    game.broadcastAll(function (player) {
                                        game.addNature('zqrevive', '还魂');
                                        lib.translate.zqrevive = '还魂';
                                        lib.linked = lib.linked.filter(function(n){ return n != 'zqrevive' });

                                    }, player);
                                    event.card4 = game.createCard2('zq_dan', 'spade', 1, 'zqrevive');
                                    if (event.card4.nature != 'zqrevive') event.card4.nature = 'zqrevive';
                                    if (lib.config.extensions && lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable'] && lib.config.extension_十周年UI_cardPrettify != 'off') {
                                        var img = lib.config.extension_十周年UI_cardPrettify;
                                        if (img == 'caise') img = 'caise/zq_huanhundan.webp';
                                        if (img == 'decade') img = 'decade/zq_huanhundan.png';
                                        if (img == 'gold') img = 'gold/zq_huanhundan.webp';
                                        if (img == 'online') img = 'online/zq_huanhundan.jpg';
                                        if (img != lib.config.extension_十周年UI_cardPrettify) {
                                            var img2 = 'extension/天庭/image/card/' + img;
                                            if (game.zqFileExist(lib.assetURL + img2)) event.card4.setBackgroundImage(img2);
                                        }
                                    }
                                    ui.cardPile.insertBefore(event.card4, ui.cardPile.childNodes[get.rand(0, ui.cardPile.childNodes.length)]);
                                    var card3 = event.card3, card4 = event.card4;
                                    game.broadcastAll(function (card3, card4) {
                                        if (!_status.cardtag['gifts']) _status.cardtag['gifts'] = [];
                                        _status.cardtag['gifts'].push(card3.cardid, card4.cardid);
                                    }, card3, card4);
                                }
                                game.broadcastAll(function (player) {
                                    player.changeZhuanhuanji('zqdanlu');
                                }, player);
                                player.update();
                                if (player.storage.zqdanlu == false) {
                                    event.card1 = get.cardPile(function (card) {
                                        return card.name == 'zq_dan' && card.suit == 'heart';
                                    });
                                    event.card2 = get.cardPile(function (card) {
                                        return card.name == 'zq_dan' && card.suit == 'diamond';
                                    });
                                    event.card3 = get.cardPile(function (card) {
                                        return card.name == 'zq_dan' && card.suit == 'club';
                                    });
                                    event.cards = [];
                                    if (event.card1) event.cards.add(event.card1);
                                    if (event.card2) event.cards.add(event.card2);
                                    if (event.card3) event.cards.add(event.card3);
                                    if (event.cards.length > 0) player.gain(event.cards.randomGet(), 'gain2');
                                }
                                else {
                                    event.card4 = get.cardPile(function (card) {
                                        return card.name == 'zq_dan' && card.nature && card.nature == 'zqrevive';
                                    });
                                    if (event.card4) player.gain(event.card4, 'gain2');
                                }
                            },
                            mark: true,
                            marktext: '☯',
                            intro:{
                                content: function (storage) {
                                    if (storage) return '转换技，锁定技，每轮游戏开始时，阳：你获得一张长生【丹】。';
                                    return '转换技，锁定技，每轮游戏开始时，阴：你获得一张还魂【丹】。';
                                },
                            },
                        },
                        zqlianqi: {
                            derivation: ['zqjingangzhuo', 'zqhuangjinsheng', 'zqqixingjian'],
                            global: 'zq_yongjian_zengyu',
                            audio: 'ext:天庭/audio/skill/zq_taishanglaojun:3',
                            enable: 'phaseUse',
                            usable: 1,
                            position: 'he',
                            filter: function (event, player) {
                                return player.countCards('he', { type: 'equip' }) > 0;
                            },
                            filterCard: function (card) {
                                return get.type(card) == 'equip';
                            },
                            check: function (card) {
                                if (_status.event.player.isDisabled(get.subtype(card))) return 6;
                                return 5 - get.value(card);
                            },
                            content: function () {
                                'step 0'
                                player.draw();
                                'step 1'
                                var cardPile = Array.from(ui.cardPile.childNodes);
                                var discardPile = Array.from(ui.discardPile.childNodes);
                                var cardList = cardPile.concat(discardPile).filter(function (card) {
                                    return (card.name == 'zq_jingangzhuo' || card.name == 'zq_huangjinsheng' || card.name == 'zq_qixingjian') && card.gaintag != 'equipHand'; //防止十周年UI装备入手bug
                                });
                                if (cardList && cardList.length) {
                                    var next = player.chooseControl(cardList);
                                    next.set('prompt', '【炼器】：获得一张装备牌');
                                    next.set('choiceList', cardList.map(function (i) {
                                        return '<div><div class="skill"></div><div>' + get.translation(i.name) + '：' + lib.translate[i.name + '_info'] + '</div><br><br></div>';
                                    }));
                                    next.set('ai', function () {
                                        for (let i of _status.event.controls) {
                                            if (_status.event.player.hp > 2 && i.name == 'zq_huangjinsheng') return i;
                                            if (_status.event.player.hp < 3 && i.name == 'zq_qixingjian') return i;
                                        }
                                        return _status.event.controls.slice(0).randomGet();
                                    });
                                } else event.finish();
                                'step 2'
                                if (result && result.control) player.gain(result.control, 'gain2');
                            },
                            discard: false,
                            visible: true,
                            loseTo: 'discardPile',
                            prompt: '重铸一张装备牌，之后从【金刚琢、幌金绳、乾坤圈】中选择一张获得。',
                            delay: 0.5,
                            prepare: function (cards, player) {
                                player.$throw(cards, 1000);
                                game.log(player, '将', cards, '置入了弃牌堆');
                            },
                            ai: {
                                order: 31,
                                result: {
                                    player: 1,
                                },
                            },
                            group: 'zqlianqi_add',
                        },
                        zqlianqi_add: {
                            trigger: {
                                global: 'roundStart', //gameDrawAfter在联机模式早于更换手牌
                            },
                            priority: 2,
                            forced: true,
                            filter: function (event, player) {
                                return game.roundNumber == 1;
                            },
                            content: function () {
                                'step 0'
                                if (!lib.inpile.includes('zq_jingangzhuo')) {
                                    lib.inpile.push('zq_jingangzhuo');
                                    event.card1 = game.createCard2('zq_jingangzhuo', 'heart', 13);
                                } else {
                                    event.card1 = get.cardPile(function (card) {
                                        return card.name == 'zq_jingangzhuo';
                                    });
                                }
                                if (event.card1) player.gain(event.card1, 'gain2');
                                'step 1'
                                if (!lib.inpile.includes('zq_huangjinsheng')) {
                                    lib.inpile.push('zq_huangjinsheng');
                                    event.card2 = game.createCard2('zq_huangjinsheng', 'club', 13);
                                } else {
                                    event.card2 = get.cardPile(function (card) {
                                        return card.name == 'zq_huangjinsheng';
                                    });
                                }
                                if (event.card2) {
                                    var card2 = event.card2;
                                    game.broadcastAll(function (card2) {
                                        if (!_status.cardtag['gifts']) _status.cardtag['gifts'] = [];
                                        _status.cardtag['gifts'].push(card2.cardid);
                                    }, card2);
                                    player.gain(event.card2, 'gain2');
                                }
                                'step 2'
                                if (!lib.inpile.includes('zq_qixingjian')) {
                                    lib.inpile.push('zq_qixingjian');
                                    event.card3 = game.createCard2('zq_qixingjian', 'spade', 13);
                                } else {
                                    event.card3 = get.cardPile(function (card) {
                                        return card.name == 'zq_qixingjian';
                                    });
                                }
                                if (event.card3) player.gain(event.card3, 'gain2');
                            },
                        },
                        //雷神雷祖
                        zqshandian: {
                            trigger: {
                                target: 'useCardToTargeted',
                            },
                            direct: true,
                            priority: 2,
                            audio: 'ext:天庭/audio/skill/zq_leishen:4',
                            filter: function (event, player, card) {
                                return event.targets && (get.type(event.card) == 'trick' || get.type(event.card) == 'delay') && game.findPlayer2(current => event.targets.includes(current) && current.hasUseTarget(get.autoViewAs({ name: 'shandian' }, event.card)));
                            },
                            content: function () {
                                'step 0'
                                if (!trigger.targets) event.finish();
                                player.chooseControl('确定', 'cancel2').set('prompt', '【闪电】：是否将【' + get.translation(trigger.card) + '】视为【闪电】？').set('ai', function () {
                                    if (get.name(trigger.card) == 'shandian') return 1;
                                    if (ai.get.effect(player, { name: get.name(trigger.card) }, target, player) < 0) return 0;
                                    return 1;
                                });
                                'step 1'
                                if (result.control == '确定') {
                                    player.logSkill('zqshandian1');
                                    game.playAudio('../extension/天庭/audio/skill/zq_leishen/zqshandian1.mp3');
                                    var list = [];
                                    for (var i = 0; i < trigger.targets.length; i++) {
                                        if (trigger.targets[i].hasUseTarget(get.autoViewAs({ name: 'shandian' }, trigger.card))) list.push(trigger.targets[i]);
                                    }
                                    if (list.length) {
                                        trigger.getParent().all_excluded = true;
                                        trigger.getParent().targets.length = 0;
                                        list[0].addJudge({ name: 'shandian' }, trigger.cards);
                                    }
                                } else event.finish();
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        if ((get.type(card) == 'trick' || get.type(card) == 'delay') && !target.hasJudge('shandian')) return [1, 0.5];
                                    },
                                },
                            },
                            group: 'zqshandian1',
                        },
                        zqshandian1: {
                            trigger: {
                                player: 'useCardToPlayered',
                                target: 'useCardToTargeted',
                            },
                            usable: 1,
                            popup: false,
                            mod: {
                                aiValue: function (player, card, num) {
                                    if (get.suit(card) == 'spade' && get.number(card) > 1 && get.number(card) < 10) return num + 1;
                                },
                                aiUseful: function (player, card, num) {
                                    if (get.suit(card) == 'spade' && get.number(card) > 1 && get.number(card) < 10) return num + 1;
                                },
                            },
                            filter: function (event, player) {
                                if (event.getParent().triggeredTargets1.length != 1) return false;
                                if (!get.number(event.card)) return false;
                                if (!get.suit(event.card)) return false;
                                return get.suit(event.card) == 'spade' && get.number(event.card) > 1 && get.number(event.card) < 10;
                            },
                            check: function (event, player) {
                                var target = event.target;
                                var num = 0;
                                if (target != player && get.attitude(player, target) > 0) num++;
                                if (target.getPrevious() != player && get.attitude(player, target.getPrevious()) > 0) num++;
                                if (target.getNext() != player && get.attitude(player, target.getNext()) > 0) num++;
                                if (num > 1) return false;
                                return true;
                            },
                            'prompt': function (event, player) {
                                return '【闪电】：是否对【' + get.translation(event.target) + '】及其上家、下家依次造成一点雷电伤害？';
                            },
                            content: function () {
                                player.logSkill('zqshandian');
                                var target = trigger.target;
                                target.damage(1, 'thunder');
                                target.getPrevious().damage(1, 'thunder');
                                target.getNext().damage(1, 'thunder');
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target) {
                                        var num = 0;
                                        if (get.attitude(target, target.getPrevious()) > 0) num++;
                                        if (get.attitude(target, target.getNext()) > 0) num++;
                                        if (num < 2 && get.suit(card) == 'spade' && get.number(card) > 1 && get.number(card) < 10) return [1, 1];
                                    },
                                },
                            },
                        },
                        zqleizu: {
                            trigger: {
                                global: 'damageBegin4',
                            },
                            forced: true,
                            popup: false,
                            priority: Infinity,
                            audio: 'ext:天庭/audio/skill/zq_leishen:1',
                            mod: {
                                cardnature: function (card, player) {
                                    if (card.name == 'sha' && get.suit(card) == 'spade') return 'thunder';
                                },
                            },
                            filter: function (event, player) {
                                return event.nature == 'thunder';
                            },
                            content: function () {
                                trigger.source = player;
                            },
                            group: ['zqleizu1', 'zqleizu2', 'zqleizu3'],
                        },
                        'zqleizu1': {
                            trigger: {
                                source: 'damageSource',
                            },
                            forced: true,
                            popup: false,
                            filter: function (event) {
                                return event.num > 0 && event.nature == 'thunder';
                            },
                            content: function () {
                                player.logSkill('zqleizu1');
                                player.draw();
                            },
                        },
                        'zqleizu2': {
                            trigger: {
                                player: 'damageBegin4',
                            },
                            forced: true,
                            popup: false,
                            filter: function (event, player) {
                                return event.nature == 'thunder';
                            },
                            content: function () {
                                game.playAudio('../extension/天庭/audio/skill/zq_leishen/zqleizu1.mp3');
                                if (trigger.num > 0 && trigger.nature == 'thunder') trigger.cancel();
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target, current) {
                                        if (get.name(card) == 'shandian') return 'zeroplayertarget';
                                        if (get.tag(card, 'thunderDamage')) return 'zeroplayertarget';
                                    },
                                },
                            },
                        },
                        'zqleizu3': {
                            trigger: {
                                player: 'damageBegin3',
                            },
                            forced: true,
                            filter: function (event, player) {
                                return event.nature == 'fire';
                            },
                            content: function () {
                                if (trigger.nature == 'fire') trigger.num++;
                            },
                            ai: {
                                effect: {
                                    target: function (card, player, target, current) {
                                        if (get.tag(card, 'fireDamage')) return [1, -2];
                                    },
                                },
                            },
                        },
                        zqsanyan: {
                            audio: 'ext:天庭/audio/skill/zq_leishen:1',
                            enable: 'phaseUse',
                            limited: true,
                            mark: true,
                            intro:{
                                content: 'limited',
                            },
                            skillAnimation: true,
                            filterTarget: function (card, player, target) {
                                if (get.mode() == 'guozhan') return target != player && target.isUnseen(2);
                                return target != player && target.identity;
                            },
                            content: function () {
                                player.awakenSkill('zqsanyan');
                                player.line(target);//射线
                                if (get.mode() == 'guozhan') {
                                    if (target.isUnseen(0)) player.viewCharacter(event.target, 0);
                                    if (target.isUnseen(1)) player.viewCharacter(event.target, 1);
                                } else {
                                    if (target.identity) {
                                        const content = get.translation(target) + '的身份是：【' + get.translation(target.identity) + '】';
                                        const card = ui.create.identityCard(target.identity);
                                        card.style.width = '13%';
                                        player.chooseControl('ok').set('dialog', [content, card]);
                                        game.log(player, '观看了', target, '的身份牌');
                                    }
                                }
                            },
                            ai: {
                                order: 9,
                                threaten: 1,
                                result: {
                                    target: function (player, target) {
                                        if (get.mode() == 'guozhan' && target.isUnseen()) {
                                            var next = _status.event.player.getNext();
                                            if (target != next) return 10;
                                            return 9;
                                        }
                                        return -get.attitude(_status.event.player, target);
                                    },
                                    player: 1,
                                },
                            },
                        },
                        //孙悟空
                        zqzhanfo: {
                            derivation: ['zqjingubang'],
                            trigger: {
                                player: 'phaseBegin',
                            },
                            forced: true,
                            priority: 2,
                            audio: 'ext:天庭/audio/skill/zq_sunwukong:2',
                            content: function () {
                                'step 0'
                                if (!lib.inpile.includes('zq_jingubang')) {
                                    lib.inpile.push('zq_jingubang');
                                    event.card = game.createCard2('zq_jingubang', 'diamond', 13);
                                } else {
                                    event.card = get.cardPile(function (card) {
                                        return card.name == 'zq_jingubang';
                                    });
                                }
                                if (!event.card) event.card = get.cardPile('zq_jingubang', 'field');
                                if (event.card) player.gain(event.card, 'gain2');
                                'step 1'
                                var cardPile = Array.from(ui.cardPile.childNodes);
                                var discardPile = Array.from(ui.discardPile.childNodes);
                                var cardList = cardPile.concat(discardPile).filter(function (card) {
                                    return card.name == 'sha' && card.gaintag != 'equipHand'; //防止十周年UI装备入手bug
                                }).randomGets(2);
                                if (cardList && cardList.length) player.gain(cardList, 'gain2');
                            },
                            group: ['zqzhanfo1', 'guozhan_zqfo'],
                        },
                        'zqzhanfo1': {
                            trigger: {
                                player: ['loseHpBefore', 'loseHpBegin'],
                            },
                            usable: 1,
                            forced: true,
                            priority: Infinity,
                            content: function () {
                                trigger.cancel();
                            },
                        },

                        zqjiubing: {
                            trigger: {
                                player: 'damageEnd',
                            },
                            audio: 'ext:天庭/audio/skill/zq_sunwukong:3',
                            content: function () {
                                'step 0'
                                if (!_status.characterlist) {
                                    if (_status.connectMode) _status.characterlist = get.charactersOL();
                                    else {
                                        var list = [];
                                        for (var i in lib.character) {
                                            if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                            list.add(i);
                                        }
                                        _status.characterlist = list;
                                    }
                                }
                                'step 1'
                                var func = function (skill) {
                                    var info = get.info(skill);//技能信息
                                    if (!info || info.charlotte) return false;
                                    //if(!lib.translate[skill+'_info']) return false;
                                    return true;
                                };
                                var skilln = [];
                                var skills = player.getSkills(true, false);//已获得的技能
                                for (var i = 0; i < skills.length; i++) {
                                    if (func(skills[i])) skilln.add(skills[i]);
                                }
                                var identity = player.group;
                                if (!identity || (identity != 'wei' && identity != 'shu' && identity != 'wu' && identity != 'qun' && identity != 'jin')) var identity = ['wei', 'shu', 'wu', 'qun', 'jin'].randomGet();
                                var lists = [];
                                for (var i = 0; i < _status.characterlist.length; i++) {
                                    if (player.hasSkill('zqjiubing')) {
                                        if (lib.character[_status.characterlist[i]][1] == 'shen' || lib.character[_status.characterlist[i]][1] == 'zqfo') lists.add(_status.characterlist[i]); //筛选神佛
                                    } else {
                                        if (lib.character[_status.characterlist[i]][1] == identity) lists.add(_status.characterlist[i]); //筛选其他势力
                                    }
                                    for (var j = 0; j < skilln.length; j++) {
                                        if (lib.character[_status.characterlist[i]][3].includes(skilln[j])) lists.remove(_status.characterlist[i]);
                                    }
                                }
                                if (lists.length) {
                                    if (player.hasSkill('zqjiubing')) game.log('搜索到' + lists.length + '个神、佛势力武将');
                                    else game.log('搜索到' + lists.length + '个【' + get.translation(identity) + '】势力武将');
                                    var char = lists.randomGet();
                                    if (lib.character[char][3].length == 0) {
                                        game.log('部分情况（如：幻化之战）清空了所有武将技能，无法获取。');
                                        event.finish();
                                    } else {
                                        game.log(player, '搬来了救兵：<font color=\"#96CAFF\">' + get.translation(char) + '</font>');
                                        var list = lib.character[char][3].filter(function (i) { //获取技能
                                            return func(i) && !player.hasSkill(i);
                                        });
                                        if (list.length) {
                                            var next = player.chooseControl(list);
                                            next.set('prompt', '【救兵】：选择【' + get.translation(char) + '】的一个技能获得之');
                                            next.set('choiceList', list.map(function (i) {
                                                //return '<div class="skill">【'+get.translation(i).slice(0,2)+'】</div><div>'+get.skillInfoTranslation(i,player,false)+'</div>';
                                                if (lib.translate[i + '_info']) return '<div class="skill">【' + get.translation(i) + '】</div><div class="popup text" style="width:calc(100% - 10px);display:inline-block">' + lib.translate[i + '_info'] + '</div>';
                                            }));
                                            next.set('ai', function () {
                                                if (_status.event.controls.length == 1) return _status.event.controls[0];
                                                var iss = [];
                                                for (let i of _status.event.controls) {
                                                    if (lib.translate[i + '_info'] &&
                                                        (lib.translate[i + '_info'].indexOf('隐匿技') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('主公技') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('势力技') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('标记') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('游戏开始') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('若你的武将牌') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('记录的') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('枚') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('发动') == -1) &&
                                                        (lib.translate[i + '_info'].indexOf('扑克牌') == -1)
                                                    ) iss.push(i);
                                                }
                                                if (iss.length) return iss.randomGet();
                                                return _status.event.controls.slice(0).randomGet();
                                            });
                                        }
                                    }
                                } else {
                                    game.log('没有找到救兵');
                                    event.finish();
                                }
                                'step 2'
                                if (result && result.control) {
                                    var skill = result.control;
                                    player.addTempSkill(skill, skill + 'After');
                                    if (!player.storage.jiubing) player.storage.jiubing = [];
                                    player.storage.jiubing.add(skill);
                                    player.popup(skill); //显示一下
                                    player.update();
                                    game.log(player, '获得了技能<font color=\"#68DD7F\">【' + get.translation(skill) + '】</font>');
                                    //game.log(player,'拥有的<font color=\"#68DD7F\">【救兵】</font>技能：<font color=\"#68DD7F\">【',player.storage.jiubing,'】</font>');
                                    var infos = get.info(skill);
                                    if (infos.group) player.storage.jiubing.addArray(infos.group);
                                }
                            },
                            group: ['zqjiubing_group', 'zqjiubing_translation'],
                        },
                        zqjiubing_group: {
                            trigger: {
                                player: ['logSkill', 'useSkill'],
                            },
                            charlotte: true,
                            direct: true,
                            priority: -1,
                            filter: function (event, player) {
                                return player.storage.jiubing && player.storage.jiubing.includes(event.skill);
                            },
                            content: function () {
                                'step 0'
                                const skillt = trigger.skill;
                                if (!player.storage.jiubing) player.storage.jiubing = [];
                                if (player.storage.jiubing.includes(skillt) && player.hasSkill(skillt)) {
                                    player.removeSkill(skillt);
                                    player.storage.jiubing.remove(skillt);
                                    var infos = get.info(skillt);
                                    if (infos.group) player.storage.jiubing.remove(infos.group);
                                    game.log(player, '失去了<font color=\"#68DD7F\">【救兵】</font>中的技能：<font color=\"#68DD7F\">【', skillt, '】</font>');
                                }
                                'step 1'
                                var func = function (skill) {
                                    var info = get.info(skill);
                                    if (!info || info.charlotte) return false; //if(!lib.translate[skill+'_info']) return false;
                                    return true;
                                };
                                var skilln = [];
                                var skills = player.getSkills(true, false);
                                for (var i = 0; i < skills.length; i++) {
                                    if (func(skills[i]) && player.storage.jiubing.includes(skills[i])) skilln.add(skills[i]);
                                }
                                if (skilln.length) {
                                    for (var i = 0; i < skilln.length; i++) {
                                        var infos = get.info(skilln[i]);
                                        if (infos.group && infos.group.includes(trigger.skill)) { //子技能包含发动的技能时，移除对应主技能
                                            player.removeSkill(skilln[i]);
                                            player.storage.jiubing.remove(skilln[i]);
                                            player.storage.jiubing.remove(infos.group);
                                            game.log(player, '失去了<font color=\"#68DD7F\">【救兵】</font>中的技能：<font color=\"#68DD7F\">【', skilln[i], '】</font>');
                                        }
                                    }
                                }
                            },
                        },
                        zqjiubing_translation: {
                            trigger: {
                                player: ['logSkill', 'useSkill'],
                            },
                            charlotte: true,
                            direct: true,
                            priority: -2,
                            filter: function (event, player) {
                                return player.storage.jiubing;
                            },
                            content: function () {
                                if (player.storage.jiubing?.length) {
                                    for (let i of player.storage.jiubing) {
                                        if (player.hasSkill(i) && get.translation(trigger.skill) == get.translation(i)) {
                                            player.removeSkill(i);
                                            player.storage.jiubing.remove(i);
                                            game.log(player, '失去了<font color=\"#68DD7F\">【救兵】</font>中的技能：<font color=\"#68DD7F\">【', i, '】</font>');
                                        }
                                    }
                                }
                            },
                        },
                        zqhuoyan: {
                            audio: 'ext:天庭/audio/skill/zq_sunwukong:2',
                            enable: 'phaseUse',
                            usable: 1,
                            filterTarget: function (card, player, target) {
                                if (target == player) return false;
                                if (target.countCards('h') == 0) return false;
                                return true;
                            },
                            content: function () {
                                player.viewHandcards(target);
                            },
                            ai: {
                                order: 9,
                                threaten: 1,
                                result: {
                                    target: -0.5,
                                    player: 1,
                                },
                            },
                        },
                        //神曹植
                        zqchengshi: {
                            audio: 'ext:天庭/audio/skill/zq_shencaozhi:3',
                            /* trigger:{
                                player:'useCard',
                            },
                            onremove:true,
                            frequent:true,
                        intro:{
                            content:'已记录花色：$',
                        },
                        filter:function(event,player){
                            return player==event.getParent('phase').player&&!player.getStorage('zqchengshi').includes(event.card.suit);
                        },
                        content:function(){
                            player.markAuto('zqchengshi',[trigger.card.suit]);
                        },*/
                            group: ['zqchengshi2', 'zqchengshi3'], //'zqchengshi1',
                        },
                        /*zqchengshi1:{ //削弱删除
                        trigger:{
                            player:'useCard',
                        },
                        usable:1,
                        frequent:true,
                        filter:function(event,player){
                            return player==event.getParent('phase').player&&player.countMark('zqchengshi')==4;
                        },
                    content:function (){
                    'step 0'
                    event.current=player.next;
                    event.currented=[];
                    'step 1'
                    event.currented.push(event.current);
                    event.current.animate('target');
                    event.current.chooseCard('he','成诗：交给'+get.translation(player)+'一张牌，或失去一点体力').set('ai',function(card){
                        if(event.current.getCards('he').length==0) return false;
                        var att=get.attitude(event.current,player);
                        if(att>0) return 1;
                        else{
                            if(card.name=='tao') return 0;
                            else return 20-get.value(card);
                        }
                    });
                    'step 2'
                    if(result.bool==false){
                        event.current.loseHp();
                        game.log('【',event.current,'选择了：自愧不如】。');
                    }
                    else{
                        event.current.give(result.cards,player,true);
                        game.log('【',event.current,'选择了：拍案叫绝】。');
                    }
                    'step 3'
                    event.current=event.current.next;
                    if(event.current!=player&&!event.currented.includes(event.current)){
                        game.delay(0.5);
                        event.goto(1);
                    }
                    },
                        },*/
                        zqchengshi2: {
                            trigger: {
                                player: 'phaseAfter',
                            },
                            charlotte: true,
                            direct: true,
                            content: function () {
                                if (player.getStorage('zqchengshi').includes('heart')) player.unmarkAuto('zqchengshi', ['heart']);
                                if (player.getStorage('zqchengshi').includes('spade')) player.unmarkAuto('zqchengshi', ['spade']);
                                if (player.getStorage('zqchengshi').includes('club')) player.unmarkAuto('zqchengshi', ['club']);
                                if (player.getStorage('zqchengshi').includes('diamond')) player.unmarkAuto('zqchengshi', ['diamond']);
                                player.unmarkAuto('zqchengshi', [player.getStorage('zqchengshi')]);
                            },
                        },
                        zqchengshi3: {
                            trigger: {
                                player: 'phaseBegin',
                            },
                            direct: true,
                            filter: function (event, player) {
                                return !player.hasSkill('zqqibu_chengshi');
                            },
                            content: function () {
                                'step 0'
                                var h = [];
                                var cardh = player.getCards('h').filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                for (var i = 0; i < cardh.length; i++) {
                                    h.add(cardh[i].suit);
                                }
                                player.chooseControl('确定', 'cancel2').set('prompt', '【七步】：展示手牌和牌堆顶的七张牌并使用其中至多4张。若使用的牌的原本花色不足4种，你减少一点体力上限').set('ai', function () {
                                    if (h.length > 2) return 0;
                                    if (h.length > 1 && player.maxHp > 1) return 0;
                                    return 1;
                                });
                                'step 1'
                                if (result.control == 'cancel2') event.finish();
                                'step 2'
                                player.logSkill('zqqibu');
                                player.removeSkill('zqqibu_heart');
                                player.removeSkill('zqqibu_spade');
                                player.removeSkill('zqqibu_club');
                                player.removeSkill('zqqibu_diamond');
                                'step 3'
                                player.addTempSkill('zqqibu_chengshi');
                            },
                        },
                        zqqibu: {
                            mod: {
                                aiUseful: function (player, card, num) {
                                    if (player.getHandcardLimit() > 1 && get.name(card) == 'shan') return 0; //手牌上限
                                },
                            },
                            trigger: {
                                player: 'damageEnd',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shencaozhi:3',
                            direct: true,
                            locked: false,
                            filter: function (event, player) {
                                return !player.hasSkill('zqqibu_chengshi');
                            },
                            content: function () {
                                'step 0'
                                var h = [];
                                var cardh = player.getCards('h').filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                for (var i = 0; i < cardh.length; i++) {
                                    h.add(cardh[i].suit);
                                }
                                player.chooseControl('确定', 'cancel2').set('prompt', '【七步】：展示手牌和牌堆顶的七张牌并使用其中至多4张。若使用的牌的原本花色不足4种，你减少一点体力上限').set('ai', function () {
                                    if (h.length > 1) return 0;
                                    if (player.hp < 2) return 0; //1血或者阴兵状态
                                    if (!player.hasSkill('zqchengshi')) return 0; //孙悟空发动
                                    return 1;
                                });
                                'step 1'
                                if (result.control == 'cancel2') event.finish();
                                'step 2'
                                player.logSkill('zqqibu');
                                player.removeSkill('zqqibu_heart');
                                player.removeSkill('zqqibu_spade');
                                player.removeSkill('zqqibu_club');
                                player.removeSkill('zqqibu_diamond');
                                'step 3'
                                player.addTempSkill('zqqibu_chengshi');
                            },
                            ai: {
                                maixie: true,
                                'maixie_hp': true,
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, 'damage')) {
                                            if (player.hasSkillTag('jueqing', false, target)) return [1, -2];//target指的自己
                                            if (!target.hasFriend()) return;
                                            if (target.hasSkill('zqqibu_chengshi')) return;
                                            var num = target.getCards('h').length;
                                            if (target.hp > 1) return [1, num * 0.3];
                                        }
                                    },
                                },
                            },
                            group: 'zqqibux',
                        },
                        zqqibux: {
                            mark: true,
                            init: function (player) {
                                player.storage.zqqibux = 0;
                            },
                            intro: {
                                content: function (storage) {
                                    if (storage > 0) return '手牌上限+' + storage;
                                    if (storage < 0) if (player.storage.zqqibux == 'number') return '手牌上限' + storage;
                                    return '手牌上限无变化';
                                },
                            },
                            mod: {
                                maxHandcard: function (player, num) {
                                    return num + player.storage.zqqibux;
                                },
                            },
                            charlotte: true,
                            onremove: true,
                        },
                        zqqibu_chengshi: { //七步成诗
                            init: function (player) {
                                player.storage.listx = [];
                            },
                            locked: false,
                            mod: {
                                aiValue: function (player, card, num) {
                                    if (player.storage.listx.length < 4) {
                                        if (!player.storage.listx.includes(card.suit) && (card.name == 'wuzhong' || card.name == 'shunshou' || card.name == 'wugu' || card.name == 'yiyi')) return num + 30;
                                        else {
                                            if (!player.storage.listx.includes(card.suit) && (card.name != 'shan' && card.name != 'wuxie')) return num + 20;
                                            else return num;
                                        }
                                    }
                                    else return num;
                                },
                            },
                            trigger: {
                                player: ['damageEnd', 'phaseBegin'],
                            },
                            direct: true,
                            charlotte: true,
                            filter: function (event, player) {
                                return !player.hasSkill('zqqibu_heart') && !player.hasSkill('zqqibu_spade') && !player.hasSkill('zqqibu_club') && !player.hasSkill('zqqibu_diamond');
                            },
                            content: function () {
                                'step 0'
                                event.num = 1;
                                var cards = get.cards(7);
                                player.storage.cs = cards;
                                if (player.countCards('h') > 0) {
                                    player.showHandcards();
                                    game.delay(2);
                                }
                                //ai需要调用：
                                var cardx = cards.filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                event.cardx = cardx;
                                player.storage.list = [];
                                player.storage.listx = [];
                                for (var i = 0; i < event.cardx.length; i++) {
                                    player.storage.listx.add(event.cardx[i].suit);
                                }
                                game.cardsGotoOrdering(cards);
                                game.log(player, '展示【牌堆顶】的7张牌：', player.storage.cs);
                                game.delay(2);
                                'step 1'
                                var cards2 = player.storage.cs.filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                var cards3 = player.getCards('h').filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                //ai需要调用：
                                for (var i = 0; i < cards3.length; i++) {
                                    player.storage.listx.add(cards3[i].suit);
                                }
                                game.log('展示的牌中包含的花色种类：', player.storage.listx);
                                if (cards2.length || cards3.length) {
                                    if (cards2.length == 0) {
                                        var next = player.chooseButton(['是否使用其中一张牌？', cards3]);
                                    }
                                    if (cards3.length == 0) {
                                        var next = player.chooseButton(['是否使用其中一张牌？', cards2]);
                                    }
                                    if (cards2.length && cards3.length) {
                                        var next = player.chooseButton(['是否使用其中一张牌？', cards2, '手牌区', cards3]);
                                    }
                                    next.set('ai', function (button) {
                                        var card = button.link;
                                        if (player.storage.listx.length == 4) {
                                            if (!player.storage.list.includes(card.suit)) {
                                                if (player.getUseValue(card) < 1) return 2;
                                                else return 2 + player.getUseValue(card);
                                            }
                                            else return 1;
                                        }
                                        else {
                                            if (!player.storage.list.includes(card.suit) && (card.name == 'wuzhong' || card.name == 'shunshou' || card.name == 'wugu' || card.name == 'yiyi')) return 30;
                                            else {
                                                if (player.storage.cs.includes(card)) return 10 + player.getUseValue(card);
                                                else return player.getUseValue(card);
                                            }
                                        }
                                    });
                                } else event.goto(3);
                                'step 2'
                                if (result.bool) {
                                    var card = result.links[0];
                                    player.chooseUseTarget(true, card, false);
                                    player.storage.cs.remove(card);
                                    player.storage.list.add(card.suit);
                                    var suit = card.suit;
                                    if (['heart', 'diamond', 'club', 'spade'].includes(suit)) {
                                        if (!player.hasSkill('zqqibu_' + suit)) player.addTempSkill('zqqibu_' + suit);
                                    }
                                }
                                'step 3'
                                event.num++;
                                if (event.num <= 4) {
                                    event.goto(1);
                                }
                                'step 4'
                                if (player.hasSkill('zqqibu_heart') && player.hasSkill('zqqibu_spade') && player.hasSkill('zqqibu_club') && player.hasSkill('zqqibu_diamond')) {
                                    if (player.hasSkill('zqchengshi')) {
                                        var cards2 = player.storage.cs.filter(function (i) {
                                            return player.hasUseTarget(i);
                                        });
                                        player.storage.zqqibux++;
                                        player.markSkill('zqqibux');
                                        player.syncStorage('zqqibux');
                                        player.logSkill('zqchengshi'); //播放语音
                                        game.log(player, '作诗成功！获得了：', cards2);
                                        player.gain(cards2);
                                    }
                                } else {
                                    if (player.maxHp > 1) game.log(player, '作诗失败！割发代首');
                                    else game.log(player, '作诗失败！被拖出去斩了');
                                    if (player.maxHp > 0) player.loseMaxHp();
                                }
                                'step 5'
                                player.removeSkill('zqqibu_heart');
                                player.removeSkill('zqqibu_spade');
                                player.removeSkill('zqqibu_club');
                                player.removeSkill('zqqibu_diamond');
                                //player.removeSkill('zqqibu_none');
                                player.removeSkill('zqqibu_chengshi');
                            },
                        },
                        zqqibu_heart: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♥</font>︎',
                            intro:{
                                name: '红桃',
                            },
                        },
                        zqqibu_spade: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♠</font>︎︎',
                            intro:{
                                name: '黑桃',
                            },
                        },
                        zqqibu_club: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♣</font>︎︎',
                            intro:{
                                name: '梅花',
                            },
                        },
                        zqqibu_diamond: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♦</font>︎︎',
                            intro:{
                                name: '方块︎︎',
                            },
                        },
                        /*zqqibu_none:{
                            charlotte:true,
                            mark:true,
                            marktext:'◎︎',
                            intro:{
                                name:'无花色',
                            },
                        },*/
                        //哪吒
                        zqfabao3: {
                            trigger: {
                                global: 'useCardToPlayered',
                            },
                            priority: 6,
                            direct: true,
                            filter: function (event, player) {
                                return event.card.name == 'sha' && event.target == player && player.countCards('he', function (card) {
                                    return get.type(card) == 'basic';
                                });
                            },
                            logTarget: 'player',
                            content: function () {
                                'step 0'
                                var next = player.chooseToDiscard('【风火轮】：弃置一张基本牌，令此杀对你无效', lib.filter.cardDiscardable, { type: 'basic' });
                                next.set('ai', function (card) {
                                    return 1;
                                });
                                'step 1'
                                if (result.bool) {
                                    const audio = ['zqfabao4', 'zqfabao5'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/zq_nezha/' + audio + '.mp3');
                                    trigger.getParent().targets.remove(player);
                                    player.logSkill('zqfabao3');
                                    game.log(player, '脚踏【风火轮】躲开了', trigger.target, '的攻击。');
                                }
                            },
                        },
                        zqfabao2: {
                            shaRelated: true,
                            trigger: {
                                global: 'useCardToPlayered',
                            },
                            filter: function (event, player) {
                                return event.card.name == 'sha' && event.target != player && (player.countCards('he', function (card) {
                                    return get.type(card) == 'equip';
                                }) || (player.getExpansions('zqfaxiang').length > 0));
                            },
                            direct: true,
                            logTarget: 'player',
                            content: function () {
                                'step 0'
                                var list = ['弃置装备牌', '移去「武」', 'cancel2'];
                                if (player.countCards('he', function (card) {
                                    return get.type(card) == 'equip';
                                }) <= 0) list.shift();
                                if (player.getExpansions('zqfaxiang').length <= 0) list.splice(1, 1);
                                player.chooseControl(list).set('prompt', '【乾坤圈】：弃置一张装备牌或者移去一张「武」。那之后，你令【' + get.translation(trigger.target) + '】弃置装备区的一张牌，否则你对其造成1点伤害').set('ai', function () {
                                    if (trigger.target.countCards('e', function (card) {
                                        return get.equipValue(card, player) < 0;
                                    })) return 'cancel2';

                                    if ((get.attitude(player, trigger.target) < 0) && ((player.countCards('he', function (card) {
                                        return get.type(card) == 'equip';
                                    })) - (player.countCards('h', function (card) {
                                        return get.subtype(card) == 'equip1';
                                    })) > 0)) return '弃置装备牌';

                                    if (get.attitude(player, trigger.target) < 0 && player.getExpansions('zqfaxiang').length > 4) return '移去「武」';
                                    return 'cancel2';
                                });
                                'step 1'
                                if (result.control == 'cancel2') event.finish();
                                else {
                                    if (result.control == '弃置装备牌') event.goto(4);
                                    if (result.control == '移去「武」') event.goto(2);
                                }
                                'step 2'
                                var next = player.chooseCardButton('移去「武」', player.getExpansions('zqfaxiang'));
                                next.set('ai', function (card) {
                                    if ((get.attitude(_status.event.player, trigger.target) >= 0) || (card.name == 'zhuge' || card.name == 'qinggang')) return 0;
                                    else return 1;
                                });
                                'step 3'
                                if (result.bool && result.links.length) {
                                    const audio = ['zqfabao2', 'zqfabao3'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/zq_nezha/' + audio + '.mp3');
                                    var card = result.links[0];
                                    player.loseToDiscardpile(card);
                                    player.syncStorage('zqfaxiang');
                                    player.updateMarks('zqfaxiang');
                                    for (var i = 0; i < 5; i++) {
                                        var car = player.getExpansions('zqfaxiang');
                                        if (car[i]) {
                                            player.removeAdditionalSkill('zqfaxiang' + i);
                                        }
                                    }
                                    event.goto(6);
                                }
                                else event.finish();
                                'step 4'
                                var next = player.chooseToDiscard('he', '弃置一张装备牌。那之后，令【' + get.translation(trigger.target) + '】弃置装备区的一张牌，否则你对其造成1点伤害', lib.filter.cardDiscardable, { type: 'equip' });
                                next.set('ai', function (card) {
                                    if ((get.attitude(_status.event.player, trigger.target) >= 0) || (get.subtype(card) == 'equip1')) return 0;
                                    else return 1;
                                });
                                'step 5'
                                if (result.bool) event.goto(6);
                                else event.finish();
                                'step 6'
                                const audio = ['zqfabao2', 'zqfabao3'].randomGet();
                                game.playAudio('../extension/天庭/audio/skill/zq_nezha/' + audio + '.mp3');
                                player.logSkill('zqfabao2', trigger.target);
                                var next = trigger.target.chooseToDiscard('e', '弃置装备区的一张牌，否则受到1点伤害。');
                                next.set('ai', function (card) {
                                    return 1;
                                });
                                'step 7'
                                if (result.bool) {
                                    game.log(trigger.target, '的装备挡下了【乾坤圈】的攻击后破碎。');
                                }
                                else {
                                    trigger.target.damage();
                                    game.log(player, '丢出【乾坤圈】击中了', trigger.target, '。');
                                }
                                'step 8'
                                for (var i = 0; i < 5; i++) {
                                    var car = player.getExpansions('zqfaxiang');
                                    if (car[i]) {
                                        player.addAdditionalSkill('zqfaxiang' + i, get.info(car[i]).skills);
                                    }
                                }
                            },
                            ai: {
                                expose: 1,
                                result: {
                                    player: 0,
                                    target: -2,
                                },
                                skillTagFilter: function (player, tag, arg) {
                                    if (arg.card.name != 'sha') return false;
                                },
                            },
                        },
                        zqfabao1: {
                            shaRelated: true,
                            trigger: {
                                global: 'useCardToPlayered',
                            },
                            priority: 2,
                            filter: function (event, player) {
                                return event.card.name == 'sha' && event.target != player && player.countCards('h', function (card) {
                                    return get.type2(card) == 'trick';
                                });
                            },
                            direct: true,
                            logTarget: 'player',
                            preHidden: true,
                            content: function () {
                                'step 0'
                                var next = player.chooseToDiscard('【混天绫】：弃置一张锦囊牌，令【' + get.translation(trigger.target) + '】不可闪避此杀，并获得其装备区的一张牌。', lib.filter.cardDiscardable, { type: ['trick', 'delay'] });
                                next.set('ai', function (card) {
                                    if (get.attitude(_status.event.player, trigger.target) < 0 && trigger.target.countCards('h') > 0) return 1;
                                    return 0;
                                });
                                'step 1'
                                if (result.bool) {
                                    player.logSkill('zqfabao1', trigger.target);
                                    game.playAudio('../extension/天庭/audio/skill/zq_nezha/zqfabao1.mp3');
                                    trigger.getParent().directHit.add(trigger.target);
                                    game.log(player, '使用【混天绫】捆绑了', trigger.target, '。');
                                    if (trigger.target.countCards('e') > 0) {
                                        player.gainPlayerCard(true, trigger.target, 'e').set('ai', function (card) {
                                            return get.subtype(card) == 'equip1';
                                        });
                                        game.log(player, '使用【混天绫】夺走了', trigger.target, '的一件装备。');
                                    };
                                };
                            },
                            ai: {
                                'directHit_ai': true,
                                expose: 1,
                                result: {
                                    player: 0,
                                    target: -2,
                                },
                                skillTagFilter: function (player, tag, arg) {
                                    if (arg.card.name != 'sha') return false;
                                },
                            },
                        },
                        zqfaxiang_lose: { //意外失去[武]后，刷新法相视为技
                            trigger: {
                                player: ['loseEnd'],
                            },
                            priority: -1,
                            direct: true,
                            forced: true,
                            charlotte: true,
                            lastDo: true,
                            //forceDie:true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                if (!player.hasSkill('zqfaxiang')) return false;
                                if (event.cards.length <= 0) return false;
                                var listfx = [];
                                for (var i = 0; i < 5; i++) {
                                    if (player.additionalSkills['zqfaxiang' + i]) listfx.push(i);
                                }
                                return listfx && listfx.length > player.getExpansions('zqfaxiang').length;
                            },
                            content: function () {
                                'step 0'
                                for (var i = 0; i < 5; i++) {
                                    if (player.additionalSkills['zqfaxiang' + i]) player.removeAdditionalSkill('zqfaxiang' + i);
                                }
                                'step 1'
                                for (var i = 0; i < 5; i++) {
                                    var car = player.getExpansions('zqfaxiang');
                                    if (car[i]) player.addAdditionalSkill('zqfaxiang' + i, get.info(car[i]).skills);
                                }
                            },
                        },
                        zqfaxiang_bug: { //技能封印后清除武器牌技能，技能生效后恢复
                            trigger: {
                                global: ['logSkill',
                                    'playercontrol', 'chooseToUseBegin', 'chooseToRespondBegin', 'chooseToDiscardBegin', 'chooseToCompareBegin', 'chooseButtonBegin', 'chooseCardBegin', 'chooseTargetBegin', 'chooseCardTargetBegin', 'chooseControlBegin', 'chooseBoolBegin', 'choosePlayerCardBegin', 'discardPlayerCardBegin', 'gainPlayerCardBegin', 'chooseToMoveBegin', 'chooseToPlayBeatmapBegin', 'phaseBegin', 'phaseJudgeBegin', 'phaseDrawBegin', 'phaseUseBegin', 'phaseDiscardBegin', 'phaseEnd', 'phaseAfter', 'gainEnd', 'loseEnd', 'damageEnd', 'dyingBegin'],
                            },
                            priority: -2,
                            direct: true,
                            forced: true,
                            charlotte: true,
                            lastDo: true,
                            forceDie: true,
                            silent: true,
                            popup: false,
                            filter: function (event, player) {
                                if (player.getExpansions('zqfaxiang').length <= 0) return false;
                                const list = player.getSkills(null, false, false).filter(skill => {
                                    if (player.getStorage('skill_blocker')) {
                                        for (var i of player.getStorage('skill_blocker')) {
                                            if (lib.skill[i] && lib.skill[i].skillBlocker && lib.skill[i].skillBlocker(skill, player)) return true;
                                        };
                                    };
                                    if (player.disabledSkills) {
                                        if (player.disabledSkills[skill] && player.disabledSkills[skill].length > 0) return true;
                                    };
                                    if (player.shixiaoedSkills) {
                                        if (player.shixiaoedSkills.includes(skill)) return true;
                                    };
                                    if (player.isTempBanned(skill)) return true;
                                    return false;
                                });
                                for (var i = 0; i < 5; i++) {
                                    var car = player.getExpansions('zqfaxiang');
                                    var listfx = player.additionalSkills['zqfaxiang' + i];
                                    if (car[i]) {
                                        if (listfx) return !player.hasSkill('zqfaxiang') || list.includes('zqfaxiang'); //封印
                                        return !list.includes('zqfaxiang'); //解封
                                    }
                                }
                                return false;
                            },
                            content: function () {
                                if (player.hasSkill('zqfaxiang')) {
                                    for (var i = 0; i < 5; i++) {
                                        var car = player.getExpansions('zqfaxiang');
                                        if (car[i]) player.addAdditionalSkill('zqfaxiang' + i, get.info(car[i]).skills);
                                    }
                                } else {
                                    for (var i = 0; i < 5; i++) {
                                        var car = player.getExpansions('zqfaxiang');
                                        if (car[i]) player.removeAdditionalSkill('zqfaxiang' + i);
                                    }
                                }
                            },
                        },
                        zqfaxiang: {
                            trigger: {
                                player: 'useCardToPlayer',
                            },
                            direct: true,
                            forced: true,
                            audio: 'ext:天庭/audio/skill/zq_nezha:2',
                            mod: {
                                aiValue: function (player, card, num) {
                                    if (get.subtype(card) == 'equip1') return 13;
                                },
                                aiUseful: function (player, card, num) {
                                    if (get.subtype(card) == 'equip1') return 13;
                                },
                            },
                            //ondisable:true,   //被封印后执行onremove部分，本体报错
                            onremove: true,
                            onremove: function (player) {
                                for (var i = 0; i < 5; i++) {
                                    var car = player.getExpansions('zqfaxiang');
                                    if (car[i]) {
                                        player.loseToDiscardpile(car[i]);
                                        player.removeAdditionalSkill('zqfaxiang' + i);
                                    }
                                }
                            },
                            init2: function (player) {
                                game.addGlobalSkill('zqfaxiang_bug');
                            },
                            //mark:true,
                            marktext: '武',
                            intro:{
                                content: 'expansion',
                                markcount: 'expansion',
                            },
                            filter: function (event, player, card) {
                                return event.target == player && get.subtype(event.card) == 'equip1' && player.getExpansions('zqfaxiang').length < 5;
                            },
                            content: function () {
                                'step 0'
                                game.playAudio('../extension/天庭/audio/skill/zq_nezha/zqfaxiang1.mp3');
                                player.addToExpansion(trigger.cards, 'gain2').gaintag.add('zqfaxiang');
                                player.draw(2);
                                'step 1'
                                for (var i = 0; i < 5; i++) {
                                    var car = player.getExpansions('zqfaxiang');
                                    if (car[i]) {
                                        game.log(car[i]);
                                        player.addAdditionalSkill('zqfaxiang' + i, get.info(car[i]).skills);
                                    }
                                }
                            },
                            ai: {
                                threaten: 1.3,
                                effect: {
                                    player: function (card, player) {
                                        if (get.subtype(card) == 'equip1') return [3, 3];
                                    },
                                },
                            },
                            group: ['zqfaxiangx', 'zqfaxiang_lose'],
                        },
                        zqfaxiangx: {
                            trigger: {
                                player: 'phaseDrawBegin2',
                            },
                            direct: true,
                            filter: function (event, player) {
                                return !event.numFixed && player.getExpansions('zqfaxiang').length > 0;
                            },
                            content: function () {
                                player.logSkill('zqfaxiangx');
                                game.playAudio('../extension/天庭/audio/skill/zq_nezha/zqfaxiang2.mp3');
                                trigger.num += player.getExpansions('zqfaxiang').length;
                            },
                            mod: {
                                /*maxHandcard:function(player,num){
                                    return num+=player.getExpansions('zqfaxiang').length;
                                },*/
                                attackFrom: function (from, to, distance) {
                                    return distance - from.getExpansions('zqfaxiang').length;
                                },
                            },
                        },
                        zqfabao: {
                            audio: 'ext:天庭/audio/skill/zq_nezha:5',
                            group: ['zqfabao1', 'zqfabao2', 'zqfabao3'],
                        },
                        //阎罗王
                        zqmingti: {
                            mod: {
                                maxHandcardBase: function (player, num) {
                                    return player.maxHp;
                                },
                            },
                            trigger: {
                                player: 'damageBegin4',
                            },
                            audio: 'ext:天庭/audio/skill/zq_yanluowang:1',
                            forced: true,
                            filter: function (event, player) {
                                return event.num > 0 && !event.nature;
                            },
                            content: function () {
                                trigger.cancel();
                            },
                            ai: {
                                fire: true,
                                thunder: true,
                                effect: {
                                    player: function (card, player) {
                                        if (card.name == 'tengjia' || card.name == 'shandian') return [-1, -35];
                                    },
                                    target: function (card, player, target, current) {
                                        if (get.tag(card, 'damage') && !get.tag(card, 'natureDamage')) return 'zeroplayertarget';
                                    },
                                },
                            },
                        },
                        zqguiwang: {
                            derivation: 'zqyinbing',
                            trigger: {
                                global: 'dieBefore',
                            },
                            audio: 'ext:天庭/audio/skill/zq_yanluowang:1',
                            priority: -1,
                            locked: false,
                            //forceDie:true,
                            init2: function (player) {
                                player.ai.modAttitudeFrom = function (from, to) {
                                    if (_status.currentPhase && _status.currentPhase['zqguiwang'] && player.getEnemies().includes(to)) return get.attitude(from, to) - 10;
                                    if (game.zhu && to == game.zhu) return get.attitude(from, to) - 0.1;
                                    return get.attitude(from, to) - 0.5;
                                };
                            },
                            filter: function (event, player) {
                                return event.player != player && event.player.hp <= 0 && !event.player.hasSkill('zqyinbing');
                            },
                            check: function (event, player) {
                                if (player.identity == 'fan' && event.player.identity == 'zhu') return false;
                                return true;
                            },
                            logTarget: 'player',
                            content: function () {
                                if (trigger.player.hp <= 0 && !trigger.player.hasSkill('zqyinbing')) {
                                    if (trigger.player.maxHp > 0) trigger.player.loseMaxHp();
                                    trigger.player['zqguiwang'] = player;
                                    game.addGlobalSkill('zqyinbing_over');
                                    trigger.player.addSkill('zqyinbing');
                                }
                            },
                            ai: {
                                respondTao: true,
                                save: true,
                                expose: 0.2,
                                threaten: 4,
                                result: {
                                    player: 10,
                                    target: 1,
                                },
                                effect: { //鬼王内不救主
                                    player: function (card, player, target) {
                                        if (game.zhu && player != game.zhu && get.itemtype(target) == 'player' && target == game.zhu && !player.getFriends().includes(game.zhu)) {
                                            if (game.players.filter(i => i != player && i != game.zhu).every(i => (i.identity && i.identity == 'commoner') || i.hasSkill('zqyinbing'))) {
                                                if (get.tag(card, 'recover') || get.tag(card, 'save')) return [1, -30];
                                                if (get.tag(card, 'damage') && target != player) return [1, 30];
                                            }
                                        }
                                    },
                                },
                            },
                            group: ['zqguiwang1'],
                        },
                        'zqguiwang1': { //控制阴兵1
                            direct: true,
                            trigger: {
                                global: 'phaseBeginStart',
                            },
                            filter: function (event, player) {
                                return player != event.player && !event.player._trueMe && event.player.hasSkill('zqyinbing');
                            },
                            logTarget: 'player',
                            skillAnimation: true,
                            animationColor: 'key',
                            content: function () {
                                trigger.player._trueMe = player;
                                game.addGlobalSkill('zqguiwang_auto'); //控制阴兵
                                if (trigger.player == game.me) {
                                    game.notMe = true;
                                    if (!_status.auto) ui.click.auto();
                                }
                                trigger.player.addSkill('zqguiwang2'); //控制阴兵
                            },
                        },
                        'zqguiwang2': { //控制阴兵2
                            trigger: {
                                player: ['phaseAfter', 'dieAfter'],
                                global: 'phaseBefore',
                            },
                            lastDo: true,
                            charlotte: true,
                            forceDie: true,
                            forced: true,
                            locked: false,
                            silent: true,
                            content: function () {
                                player.removeSkill('zqguiwang2');
                            },
                            onremove: true,
                            onremove: function (player) {
                                if (player == game.me) {
                                    if (!game.notMe) game.swapPlayerAuto(player._trueMe)
                                    else delete game.notMe;
                                    if (_status.auto) ui.click.auto();
                                }
                                delete player._trueMe;
                            },
                            popup: false,
                        },
                        zqguiwang_auto: { //控制阴兵3
                            firstDo: true,
                            trigger: {
                                player: [
                                    'playercontrol', 'chooseToUseBegin', 'chooseToRespondBegin', 'chooseToDiscardBegin', 'chooseToCompareBegin',
                                    'chooseButtonBegin', 'chooseCardBegin', 'chooseTargetBegin', 'chooseCardTargetBegin', 'chooseControlBegin',
                                    'chooseButtonTargetBegin', 'chooseToGiveBegin', 'chooseToGuanxingBegin', 'chooseToMoveBegin', 'chooseToPlayBeatmapBegin', 'chooseNumbersBegin',
                                    'chooseBoolBegin', 'choosePlayerCardBegin', 'discardPlayerCardBegin', 'gainPlayerCardBegin'
                                ],
                            },
                            forced: true,
                            locked: false,
                            priority: 100,
                            forceDie: true,
                            popup: false,
                            filter: function (event, player) {
                                //if(_status.connectMode===true) return false;
                                if (event.autochoose && event.autochoose()) return false;
                                if (lib.filter.wuxieSwap(event)) return false;
                                if (_status.auto || !player.isUnderControl()) return false;
                                return true;
                            },
                            content: function () {
                                game.swapPlayerAuto(player);
                            },
                        },
                        zqyinbing: { //铁锁封印
                            forced: true,
                            priority: 5,
                            audio: 'ext:天庭/audio/skill/zq_yanluowang:4',
                            init: function (player) {
                                game.addGlobalSkill('zqyinbing_over');
                                if (player.hp > 0) {
                                    player.removeSkill('zqyinbing');
                                    delete player['zqguiwang'];
                                    if (player.hasSkill('zqyinbing3')) player.removeSkill('zqyinbing3'); //解封技能
                                    player.logSkill('zqyinbing');
                                } else {
                                    player.addSkill('zqyinbing3');
                                    player.storage.zqyinbingHp = player.hp;
                                    if (!player.isLinked()) player.link(true);
                                    if (get.mode() == 'identity' || get.mode() == 'th_mougong') {
                                        game.broadcastAll(function (player) {
                                            player.showIdentity();
                                        }, player, game.me);
                                        game.log('<font color=\"#68DD7F\">【阴兵】</font>：', player, '的身份是【', player.identity, '】');
                                    }
                                    if (get.mode() == 'guozhan') player.showCharacter(2);
                                }
                            },
                            ondisable: true,
                            onremove: true,
                            onremove: function (player) {
                                if (player.hp <= 0) player.die();
                                delete player['zqguiwang'];
                            },
                            trigger: {
                                player: 'linkBefore',
                                global: 'phaseBefore',
                            },
                            filter: function (event, player) {
                                if (event.name == 'link') return player.isLinked();
                                return event.name != 'phase' && !player.isLinked();
                            },
                            content: function () {
                                if (trigger.name != 'link') player.link(true);
                                else trigger.cancel();
                            },
                            mod: {
                                aiValue: function (player, card, num) {
                                    if (!player.getEquip(1) && get.subtype(card) == 'equip1') return num + 10;
                                },
                                aiUseful: function (player, card, num) {
                                    if (!player.getEquip(1) && get.subtype(card) == 'equip1') return num + 10;
                                },
                            },
                            ai: {
                                effect: { //阴兵用装备，免伤
                                    target: function (card, player, target, current) {
                                        if (_status.currentPhase && _status.currentPhase == target) {
                                            if ((get.tag(card, 'recover') || get.tag(card, 'save')) && player['zqguiwang'] && !player['zqguiwang'].getFriends().includes(target)) return 'zeroplayertarget'; //只救鬼王的队友
                                        }
                                        if (target == player && (get.subtype(card) == 'equip4' || (get.subtype(card) == 'equip1' && !target.getEquip(1)))) return [1, -30];
                                        if (!get.tag(card, 'recover') && !get.tag(card, 'save') && !get.tag(card, 'loseCard') && !player['zqguiwang'] && target != player) return 'zeroplayertarget'; //活人的牌只有桃和过河对你有效，其他牌无效
                                        if (!get.tag(card, 'recover') && !get.tag(card, 'save') && player['zqguiwang'] && _status.currentPhase && _status.currentPhase == player && target != player) return 'zeroplayertarget'; //死人的回合内只有桃对你有效，其他牌无效
                                    },
                                    player: function (card, player, target) {
                                        if (_status.currentPhase && _status.currentPhase == player) {
                                            if (get.tag(card, 'damage') && get.tag(card, 'multitarget')) return [1, 30]; //群伤
                                            if ((get.tag(card, 'recover') || get.tag(card, 'save')) && player['zqguiwang'] && !player['zqguiwang'].getFriends().includes(target)) return 0; //只救鬼王的队友
                                        }
                                    },
                                },
                            },
                            group: ['zqyinbing1', 'zqyinbing2', 'zqyinbing_die'],
                        },
                        'zqyinbing1': { //免死
                            trigger: {
                                player: ['dyingBefore', 'die', 'dieBegin', 'dieEnd', 'dieAfter'],
                            },
                            forced: true,
                            forceDie: true,
                            priority: -3,
                            charlotte: true,
                            filter: function (event, player) {
                                return player.hp <= 0;
                            },
                            content: function () {
                                const hp = player.storage.zqyinbingHp || 0;
                                trigger.cancel();
                                if (player.isDead()) {
                                    game.broadcastAll(function (player, hp) {
                                        if(player.reviveEvent) player.reviveEvent(hp);
                                        else player.revive(hp);
                                        player.hp = hp;
                                        player.update();
                                    }, player, hp);
                                    game.log(player, '当前的体力值为[' + player.hp + ']');
                                } else player.storage.zqyinbingHp = player.hp;
                            },
                        },
                        'zqyinbing2': { //脱离阴兵
                            trigger: {
                                player: ['recoverEnd', 'changeHp', 'revive'],
                            },
                            direct: true,
                            forced: true,
                            priority: 4,
                            charlotte: true,
                            content: function () {
                                if (player.hp > 0) {
                                    player.removeSkill('zqyinbing');
                                    player.removeSkill('zqyinbing3');
                                    player.logSkill('zqyinbing2');
                                }
                            },
                        },
                        'zqyinbing3': { //封印技能
                            init: function (player, skill) {
                                player.addSkillBlocker(skill);
                            },
                            onremove: true,
                            onremove: function (player, skill) {
                                player.removeSkillBlocker(skill);
                            },
                            charlotte: true,
                            skillBlocker: function (skill, player) {
                                return !lib.skill[skill].persevereSkill && !lib.skill[skill].charlotte && !get.is.locked(skill, player);
                            },
                            mark: true,
                            intro: {
                                content: function (storage, player, skill) {
                                    var list = player.getSkills(null, false, false).filter(function (i) {
                                        return lib.skill.zqyinbing3.skillBlocker(i, player);
                                    });
                                    if (list.length) return '失效技能：' + get.translation(list);
                                    return '无失效技能';
                                },
                            },
                        },
                        'zqyinbing_over': { //判定胜负
                            trigger: {
                                global: ['phaseBegin', 'dieBegin', 'dieAfter'], //'zqguiwangAfter',//单挑SP周泰无法使用斗魂
                            },
                            forced: true,
                            popup: false,
                            priority: -2,
                            charlotte: true,
                            //logTarget:'player',
                            content: function () {
                                if (_status.mode && _status.mode == 'purple') {
                                    if ((game.rZhu['zqguiwang'] || game.rZhu.isDead()) && (game.bZhu['zqguiwang'] || game.bZhu.isDead())) {
                                        if (game.players.filter(i => !i['zqguiwang']).every(i => i.identity == 'rYe' || i.identity == 'bYe')) game.over(game.me.identity == 'rYe' || game.me.identity == 'bYe');
                                        else game.over('游戏平局');
                                    } else {
                                        if (game.players.filter(i => !i['zqguiwang']).every(i => i.identity != 'rYe' && i.identity != 'bYe')) {
                                            if (game.rZhu['zqguiwang'] || game.rZhu.isDead()) game.over(['bZhu', 'bZhong', 'rNei'].includes(game.me.identity));
                                            if (game.bZhu['zqguiwang'] || game.bZhu.isDead()) game.over(['rZhu', 'rZhong', 'bNei'].includes(game.me.identity));
                                        }
                                    }
                                } else {
                                    if (game.zhu && game.zhu.isZhu && game.zhu['zqguiwang']) {
                                        if (typeof game.showIdentity === 'function') game.showIdentity();
                                        if (game.players.filter(i => !i['zqguiwang'] && i.identity && i.identity != 'commoner').every(i => i.identity && i.identity == 'nei' && game.players.filter(i => !i['zqguiwang'] && i.identity && i.identity == 'nei').length == 1)) game.over(!game.me['zqguiwang'] && (game.me.identity == 'nei' || game.me.identity == 'commoner'));
                                        else game.over(game.me.identity == 'fan' || (game.me.identity == 'commoner' && !game.me['zqguiwang']));
                                    } else {
                                        if (player.identity) {
                                            if (!player['zqguiwang'] && player.identity != 'commoner' && game.players.filter(i => !i['zqguiwang'] && i != player && i.identity != 'commoner').every(i => player.getFriends().includes(i))) {
                                                if (typeof game.showIdentity === 'function') game.showIdentity();
                                                game.over((game.me.identity != 'commoner' && (player.getFriends().includes(game.me) || game.me == player)) || (game.me.identity == 'commoner' && !game.me['zqguiwang']));
                                            }
                                        } else {
                                            if (!player['zqguiwang'] && game.players.filter(i => !i['zqguiwang'] && i != player).every(i => player.getFriends().includes(i))) game.over(player.getFriends().includes(game.me) || game.me == player);
                                        }
                                    }
                                }
                            },
                        },
                        'zqyinbing_die': { //记录体力，鬼王死亡后移除阴兵
                            trigger: {
                                player: 'changeHp',
                                global: 'dieAfter',
                            },
                            priority: 10,
                            forced: true,
                            popup: false,
                            charlotte: true,
                            filter(event, player) {
                                if (event.name == 'die') return player['zqguiwang'] && event.player == player['zqguiwang'];
                                return true;
                            },
                            content: function () {
                                game.log(player, '的体力值为[' + player.hp + ']');
                                if (trigger.name == 'die') player.removeSkill('zqyinbing');
                            },
                        },

                        //神左慈
                        zqjinye: {
                            trigger: {
                                player: 'damageEnd',
                            },
                            frequent: true,
                            priority: 5,
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:1',
                            filter: function (event, player) {
                                return event.num > 0;
                            },
                            content: function () {
                                'step 0'
                                if (!player.storage.zqjinye) player.storage.zqjinye = [];
                                var next = player.chooseTarget('【金液】：选择一名角色，令其一个技能失效至其下个回合结束');
                                next.set('filterTarget', function (card, player, target) {
                                    if (player.storage.zqjinye && player.storage.zqjinye.includes(target)) return false;
                                    //if(target.hasSkillTag('zqfengyin')) return false;
                                    for (var i in target.disabledSkills) {
                                        if (target.disabledSkills[i].includes('zqfengyin')) return false;
                                    }
                                    var list = [];
                                    var func = function (skill) {
                                        var info = get.info(skill);
                                        if (!info || info.charlotte || info.persevereSkill) return false; //排除持恒技
                                        if (!lib.translate[skill + '_info']) return false; //排除无描述的技能
                                        return true;
                                    };
                                    var skills = target.getSkills(null, false, true); //3是过滤失效技能
                                    if (skills) {
                                        for (var i = 0; i < skills.length; i++) {
                                            if (func(skills[i])) list.add(skills[i]);
                                        }
                                    }
                                    return list.length > 0//&&target!=player;
                                });
                                next.set('ai', function (target) {
                                    if (target == player) return -99;
                                    return 0.5 - get.attitude(player, target);
                                });
                                'step 1'
                                if (result.targets) {
                                    var target = result.targets[0];
                                    var list = [];
                                    var func = function (skill) {
                                        var info = get.info(skill);//技能信息
                                        if (!info || info.charlotte || info.persevereSkill) return false;//排除空技能、状态技和持恒技
                                        if (!lib.translate[skill + '_info']) return false; //排除无描述的技能
                                        return true;
                                    };
                                    var skills = target.getSkills(null, false, true); //3是过滤失效技能
                                    if (skills) {
                                        for (var i = 0; i < skills.length; i++) {
                                            if (func(skills[i])) list.add(skills[i]);
                                        }
                                    }
                                    event.targetx = target;
                                    if (player.storage.zqjinye) player.storage.zqjinye.push(target);
                                    var next = player.chooseControl(list, 'cancel2');
                                    next.set('prompt', '令【' + get.translation(target) + '】的一个技能失效至其下个回合结束');
                                    next.set('choiceList', list.map(function (i) {
                                        if (lib.translate[i + '_info']) return '<div class="skill">【' + get.translation(i) + '】</div><div class="popup text" style="width:calc(100% - 10px);display:inline-block">' + lib.translate[i + '_info'] + '</div>';
                                    }));
                                    next.set('ai', function () {
                                        if (_status.event.controls.length == 1) return _status.event.controls[0];
                                        var iss = [];
                                        for (let i of _status.event.controls) {
                                            if (!target.tempSkills[i] && //排除临时技能
                                                lib.translate[i + '_info'] &&
                                                (lib.translate[i + '_info'].indexOf('觉醒技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('隐匿技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('主公技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('势力技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('标记') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('游戏开始') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('若你的武将牌') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('记录的') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('枚') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('发动') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('扑克牌') == -1)
                                            ) iss.push(i);
                                        }
                                        if (iss.length) return iss.randomGet();
                                        return _status.event.controls.slice(0).randomGet();
                                    });
                                }
                                'step 2'
                                if (result && result.control && event.targetx) {
                                    if (result.control == 'cancel2') event.goto(0);
                                    else {
                                        event.targetx.disableSkill('zqfengyin', result.control);
                                        event.targetx.addTempSkill('zqfengyin2', { player: 'phaseBeforeStart' });
                                        event.targetx.markSkill('zqfengyin');
                                        game.log(player, '选择了', event.targetx, '的技能', '#g【' + get.translation(result.control) + '】');
                                    }
                                }
                                'step 3'
                                delete player.storage.zqjinye;
                            },
                            ai: {
                                threaten: 2,
                                result: {
                                    player: 1,
                                },
                            },
                        },
                        zqfengyin2: {
                            charlotte: true,
                            onremove: true,
                            onremove: function (player, skill) {
                                player.addTempSkill('zqfengyin', { player: 'phaseAfter' });
                            },
                            /*mark: true,
                            intro: {
                                content: function (storage, player, skill) {
                                    var list = [];
                                    for (var i in player.disabledSkills) {
                                        if (player.disabledSkills[i].includes('zqfengyin')) list.push(i);
                                    };
                                    if (list.length) {
                                        var str = '失效技能：';
                                        for (var i = 0; i < list.length; i++) {
                                            if (lib.translate[list[i] + '_info']) str += get.translation(list[i]) + '、';
                                        };
                                        return str.slice(0, str.length - 1);
                                    };
                                },
                            },*/
                        },
                        zqfengyin: {
                            onremove: true,
                            onremove: function (player, skill) {
                                player.enableSkill(skill);
                            },
                            mark: true,
                            charlotte: true,
                            intro: {
                                content: function (storage, player, skill) {
                                    var list = [];
                                    for (var i in player.disabledSkills) {
                                        if (player.disabledSkills[i].includes(skill)) list.push(i);
                                    };
                                    if (list.length) {
                                        var str = '失效技能：';
                                        for (var i = 0; i < list.length; i++) {
                                            if (lib.translate[list[i] + '_info']) str += get.translation(list[i]) + '、';
                                        };
                                        return str.slice(0, str.length - 1);
                                    };
                                },
                            },
                        },
                        zqjiuding: {
                            trigger: {
                                global: 'roundStart',
                            },
                            frequent: true,
                            priority: 5,
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:1',
                            onremove: true,
                            mark: true,
                            marktext: '九鼎',
                            intro: {
                                name: '九鼎',
                                markcount: 'mark',
                                content: function (storage, player, skill) {
                                    if (player.storage.zqjiuding) return '共' + player.storage.zqjiuding.length + '个限定技：' + get.translation(player.storage.zqjiuding);
                                    return '已获得技能太清';
                                },
                            },
                            init2: function (player) {
                                player.storage.zqjiuding = [];
                            },
                            filter: function (event, player) {
                                var skillx = player.getSkills(null, false, false).filter(function (skill) {
                                    var info = lib.skill[skill];
                                    return info && info.limited;
                                });
                                if (skillx && skillx.length && skillx.length >= 9 && player.hasSkill('zqtaiqing')) return false;
                                return true;
                            },
                            content: function () {
                                'step 0'
                                if (!_status.characterlist) {
                                    if (_status.connectMode) _status.characterlist = get.charactersOL();
                                    else {
                                        var list = [];
                                        for (var i in lib.character) {
                                            if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                            list.add(i);
                                        }
                                        _status.characterlist = list;
                                    }
                                }
                                'step 1'
                                var skillx = player.getSkills(null, false, false).filter(function (skill) {
                                    var info = lib.skill[skill];
                                    return info && info.limited;
                                });
                                if (skillx && skillx.length && skillx.length >= 9 && !player.hasSkill('zqtaiqing')) {
                                    player.addSkill('zqtaiqing');
                                    delete player.storage.zqjiuding;
                                    player.update();
                                } else {
                                    var is_limited = function (list) {
                                        for (var i = 0; i < list.length; i++) {
                                            var info = lib.skill[list[i]];
                                            if (info && info.limited) return true;
                                        }
                                        return false;
                                    }
                                    var list = [];
                                    for (var i = 0; i < _status.characterlist.length; i++) {
                                        var skills = lib.character[_status.characterlist[i]][3];
                                        for (var j = 0; j < skills.length; j++) {
                                            var cur = [skills[j]];
                                            game.expandSkills(cur);
                                            if (is_limited(cur) && !player.awakenedSkills.includes(skills[j]) && !player.hasSkill(skills[j])) {
                                                list.push(skills[j]);
                                            }
                                        }
                                    }
                                    if (skillx.length && list.length) {
                                        for (let i of skillx) {
                                            for (let j of list) {
                                                if (get.translation(i) == get.translation(j)) list.remove(j);
                                            }
                                        }
                                    }
                                    if (list.length) {
                                        game.log('搜索到' + list.length + '个限定技');
                                        var skill = list.randomGet();
                                        player.addSkill([skill], true);
                                        player.popup(skill);
                                        game.log(player, '获得了技能<font color=\"#68DD7F\">【' + get.translation(skill) + '】</font>');
                                        var skillx = player.getSkills(null, false, false).filter(function (skill) {
                                            var info = lib.skill[skill];
                                            return info && info.limited;
                                        });
                                        player.storage.zqjiuding = skillx;
                                        player.syncStorage('zqjiuding');
                                        player.markSkill('zqjiuding');
                                    } else game.log('未搜索到限定技');
                                }
                            },
                            ai: {
                                threaten: 2,
                                result: {
                                    player: 10,
                                },
                            },
                            derivation: ['zqtaiqing'],
                        },
                        zqtaiqing: {
                            trigger: {
                                player: 'dieBefore',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:1',
                            limited: true,
                            mark: true,
                            intro:{
                                content: 'limited',
                            },
                            skillAnimation: true,
                            animationColor: 'fire',
                            filter: function (event, player) {
                                return player.maxHp > 0;
                            },
                            content: function () {
                                'step 0'
                                player.awakenSkill('zqtaiqing');
                                trigger.cancel();
                                player.recover(player.maxHp - player.hp);
                                'step 1'
                                if (player.isLinked()) player.link();
                                if (player.isTurnedOver()) player.turnOver();
                                //if(player.countCards('j')) player.discardPlayerCard(player,'j',true);
                                'step 2'
                                if (!_status.characterlist) {
                                    if (_status.connectMode) _status.characterlist = get.charactersOL();
                                    else {
                                        var list = [];
                                        for (var i in lib.character) {
                                            if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                            list.add(i);
                                        }
                                        _status.characterlist = list;
                                    }
                                }
                                'step 3'
                                var is_limited = function (list) {
                                    for (var i = 0; i < list.length; i++) {
                                        var info = lib.skill[list[i]];
                                        if (info && info.limited) return true;
                                    }
                                    return false;
                                }
                                var list = ['zqtaiqing'];
                                for (var i = 0; i < _status.characterlist.length; i++) {
                                    var skills = lib.character[_status.characterlist[i]][3];
                                    for (var j = 0; j < skills.length; j++) {
                                        var cur = [skills[j]];
                                        game.expandSkills(cur);
                                        if (is_limited(cur) && (player.awakenedSkills.includes(skills[j]) || player.hasSkill(skills[j]))) {
                                            list.push(skills[j]);
                                        }
                                    }
                                }
                                if (list.length) {
                                    player.removeSkill([list], true);
                                    for (let i of list) { player.restoreSkill(i) }
                                    game.log(player, '失去了所有限定技');
                                }
                            },
                            ai: {
                                save: true,
                                threaten: 2,
                                result: {
                                    player: 10,
                                },
                            },
                        },
                        zqhuanhua: {
                            trigger: {
                                target: 'useCardToTarget',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:3',
                            frequent: true,
                            preHidden: true,
                            filter: function (event, player) {
                                return (event.card.name == 'sha' || event.card.name == 'juedou');
                            },
                            content: function () {
                                'step 0'
                                if (trigger.player != player && game.filterPlayer().length < 3) event.goto(1);
                                else {
                                    player.storage.zqhuanhua_player = trigger.player;
                                    player.storage.zqhuanhua_card = trigger.card;
                                    var next = player.chooseTarget('至多选择两名角色，将此牌的目标随机转移给你或其中一名，若取消则此牌有一半的概率对你无效', [1, 2]);
                                    next.set('filterTarget', function (card, player, target) {
                                        if (target != player && target != player.storage.zqhuanhua_player) {
                                            if (lib.filter.targetEnabled(player.storage.zqhuanhua_card, player.storage.zqhuanhua_player, target)) return true;
                                        }
                                        return false;
                                    });
                                    next.set('ai', function (target) {
                                        return -get.attitude(_status.event.player, target);
                                    });
                                }
                                'step 1'
                                var evt = trigger.getParent();
                                if (result && result.bool) {
                                    if (result.targets.length > 1) player.line(result.targets);
                                    else player.line(result.targets[0]);
                                    if (result.targets.length == 1) {
                                        var list1 = [result.targets[0]];
                                        game.log(player, '将【', list1, '】幻化成自己');
                                        if (Math.random() > 1 / 2) {
                                            var t1 = list1.randomGet();
                                            evt.targets.remove(player);
                                            evt.targets.push(t1);
                                            trigger.player.line(t1);
                                            game.log(trigger.player, '猜错目标攻击了【', t1, '】');
                                        } else game.log(trigger.player, '破除了', player, '的<font color=\"#68DD7F\">【幻化】</font>');
                                    } else {
                                        var list2 = [result.targets[0], result.targets[1]];
                                        game.log(player, '将【', list2, '】幻化成自己');
                                        if (Math.random() > 1 / 3) {
                                            var t2 = list2.randomGet();
                                            evt.targets.remove(player);
                                            evt.targets.push(t2);
                                            trigger.player.line(t2);
                                            game.log(trigger.player, '猜错目标攻击了【', t2, '】');
                                        } else game.log(trigger.player, '破除了', player, '的<font color=\"#68DD7F\">【幻化】</font>');
                                    }
                                } else {
                                    game.log(player, '幻化出一道“分身”');
                                    if (Math.random() > 1 / 2) {
                                        evt.targets.remove(player);
                                        game.log(trigger.player, '猜错目标攻击了“分身”');
                                    } else game.log(trigger.player, '破除了', player, '的<font color=\"#68DD7F\">【幻化】</font>');
                                }
                            },
                            ai: {
                                'maixie_defend': true,
                                effect: {
                                    target: function (card, player, target) {
                                        if (card.name != 'sha' && card.name != 'juedou') return;
                                        if (!player.hasFriend()) return;
                                        if (card.name == 'sha' || card.name == 'juedou') return [1, 1];
                                    },
                                },
                                threaten: 2,
                                expose: 2,
                            },
                        },
                        //SP周泰
                        zqdouhun: {
                            mod: {
                                maxHandcardFinal: function (player, num) {
                                    return 4;
                                },
                            },
                            trigger: {
                                global: 'gameStart',
                                player: 'enterGame',
                            },
                            forced: true,
                            unique: true,
                            audio: 'ext:天庭/audio/skill/sp_zq_zhoutai:1',
                            init2: function (player) {
                                player.storage.zqdouhun_maxHp = player.maxHp;
                                if (player.maxHp > 1) player.loseMaxHp(player.maxHp - 1);
                            },
                            content: function () {
                                if (player.maxHp > 1) player.loseMaxHp(player.maxHp - 1);
                            },
                            group: ['zqdouhun0', 'zqdouhun1'],
                        },
                        'zqdouhun0': {
                            trigger: {
                                player: ['gainMaxHpBefore', 'loseMaxHpBefore'],
                            },
                            filter: function (event, player) {
                                return player.maxHp == 1;
                            },
                            forced: true,
                            priority: Infinity,
                            content: function () {
                                trigger.cancel();
                                player.maxHp = 1;
                            },
                        },
                        'zqdouhun1': {
                            unique: true,
                            frequent: true,
                            priority: 3,
                            trigger: {
                                player: 'dieBegin',
                            },
                            forced: true,
                            //limited:true,
                            skillAnimation: true,
                            content: function () {
                                'step 0'
                                //player.awakenSkill('zqdouhun1');
                                trigger.cancel();
                                'step 1'
                                player.removeSkill('zqdouhun');
                                'step 2'
                                player.maxHp = player.storage.zqdouhun_maxHp;
                                'step 3'
                                if (game.zhu && player == game.zhu) {
                                    if (player.name1 == 'sp_zq_zhoutai' || player.name2 == 'sp_zq_zhoutai') player.maxHp++;
                                }
                                'step 4'
                                player.update();
                                player.recover(2 - player.hp);
                            },
                        },
                        zqboming: {
                            //audio:['buqu',2],
                            audio: 'ext:天庭/audio/skill/sp_zq_zhoutai:4',
                            trigger: {
                                player: 'dying',
                            },
                            onremove: true,
                            direct: true,
                            forced: true,
                            priority: 3,
                            filter: function (event, player) {
                                return player.hp <= 0 && player.maxHp > 0;
                            },
                            content: function () {
                                'step 0'
                                var card = get.cards()[0];
                                event.card = card;
                                player.chooseTarget('选择获得「危」的角色', true, function (card, player, target) {
                                    return player.inRange(target) || target == player;
                                }).set('ai', function (target) {
                                    if (player.getExpansions('zqboming')?.length==0 || player.hasSkill('zqdouhun')) return target == player;
                                    return -get.attitude(player, target);
                                }).animate = false;
                                'step 1'
                                if (result.targets) {
                                    player.logSkill('zqboming');
                                    var target = result.targets[0];
                                    target.addToExpansion(card, 'gain2').gaintag.add('zqboming');
                                    game.log(target, '将', card, '置于武将牌上，称为「危」');
                                    for (var x = 0; x < game.filterPlayer().length; x++) {
                                        var cards = game.filterPlayer()[x].getExpansions('zqboming'), num = get.number(card);
                                        target.showCards(cards, '危');
                                        for (var i = 0; i < cards.length; i++) {
                                            if (num == get.number(cards[i])) target.die();
                                        }
                                    }
                                }
                                'step 2'
                                var suit = get.suit(card);
                                if (suit != 'spade' && player.hp <= 0) player.recover(1 - player.hp);
                            },
                            //mark:true,
                            marktext: '危',
                            intro:{
                                content: 'expansion',
                                markcount: 'expansion',
                            },
                            ai: {
                                save: true,
                                expose: 0.2,
                                result: {
                                    player: 1,
                                },
                            },
                            //group: 'zqboming1',
                        },
                        /*'zqboming1': { //移除其他人的危，考虑多个周泰需要共用，注释
                            trigger: {
                                player: 'dieBegin',
                            },
                            direct: true,
                            forced: true,
                            content: function () {
                                for (var a = 0; a < game.filterPlayer().length; a++) {
                                    var cards = game.filterPlayer()[a].getExpansions('zqboming');
                                    for (var b = 0; b < cards.length; b++) {
                                        game.filterPlayer()[a].loseToDiscardpile(cards[b]);
                                    }
                                }
                            },
                        },*/
                        zqjiuzhu: {
                            trigger: {
                                global: 'phaseBefore',
                                player: 'enterGame',
                            },
                            audio: 'ext:天庭/audio/skill/sp_zq_zhoutai:1',
                            forced: true,
                            locked: false,
                            filter: function (event) {
                                return game.players.length > 1 && (event.name != 'phase' || game.phaseNumber == 0);
                            },
                            content: function () {
                                'step 0'
                                player.chooseTarget('请选择【救主】的目标', lib.translate.zqjiuzhu_info, true, function (card, player, target) {
                                    return target != player && (!player.storage.zqjiuzhu2 || !player.storage.zqjiuzhu2.includes(target));
                                }).set('ai', function (target) {
                                    var att = get.attitude(_status.event.player, target);
                                    if (att > 0) return att + 1;
                                    if (att == 0) return Math.random();
                                    return att;
                                }).animate = false;
                                'step 1'
                                if (result.bool) {
                                    var target = result.targets[0];
                                    if (!player.storage.zqjiuzhu2) player.storage.zqjiuzhu2 = [];
                                    player.storage.zqjiuzhu2.push(target);
                                }
                            },
                            group: 'zqjiuzhu2',
                        },
                        'zqjiuzhu2': {
                            charlotte: true,
                            trigger: {
                                global: 'dying',
                            },
                            forced: true,
                            filter: function (event, player) {
                                if (event.player.isDead() || !player.storage.zqjiuzhu2 || !player.storage.zqjiuzhu2.includes(event.player)) return false;
                                if (event.player.hp <= 0 && player.countCards('he') > 0) return true;
                                return event, player.isDying();
                            },
                            logTarget: 'player',
                            content: function () {
                                'step 0'
                                var target = trigger.player;
                                if (!target.storage.xianfu_mark) target.storage.xianfu_mark = [];
                                target.markSkill('zqjiuzhu_mark');
                                'step 1'
                                player.chooseControl('确定', 'cancel2').set('prompt', '【救主】：弃置一张牌并失去1点体力，令【' + get.translation(trigger.player) + '】将体力回复至1点').set('ai', function () {
                                    if (get.attitude(player, trigger.player) >= 0) return 0;
                                    return 1;
                                });
                                'step 2'
                                if (result.control == '确定') {
                                    player.chooseToDiscard(1, 'he', get.prompt('zqjiuzhu2'), '弃置1张牌', lib.filter.cardDiscardable).set('ai', function (card) {
                                        return 1;
                                    });
                                }
                                'step 3'
                                if (result.bool) {
                                    player.loseHp();
                                    trigger.player.recover(1 - trigger.player.hp);
                                } else event.finish();
                            },
                            ai: {
                                respondTao: true,
                                threaten: 1.6,
                                expose: 0.2,
                            },
                            group: 'zqjiuzhu3',
                        },
                        'zqjiuzhu3': {
                            trigger: {
                                global: 'dieBegin',
                            },
                            silent: true,
                            filter: function (event, player) {
                                return event.player == player || player.storage.zqjiuzhu2 && player.storage.zqjiuzhu2.includes(player);
                            },
                            content: function () {
                                if (player == trigger.player) lib.skill.zqjiuzhu2.onremove(player);
                                else player.storage.zqjiuzhu2.remove(event.player);
                            },
                            forced: true,
                            popup: false,
                        },
                        'zqjiuzhu_mark': {
                            mark: true,
                            marktext: '主',
                            intro:{
                                name: '救主的目标',
                                content: '进入濒死状态时，SP周泰可以弃置1张牌并失去一点体力，令你脱离濒死状态。',
                            },
                        },
                        //神诸葛果
                        zqbinan: {
                            mod: {
                                globalTo: function (from, to, distance) {
                                    return distance + 3;
                                },
                                globalFrom: function (from, to, distance) {
                                    return distance + 3;
                                },
                            },
                        },
                        zqxiudao: {
                            trigger: {
                                global: 'phaseEnd',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shenzhugeguo:3',
                            frequent: true,
                            filter: function (event, player) {
                                var num = event.player.getHistory('useCard', function (evt) {
                                    return evt.targets.includes(player);
                                }).length;
                                return num == 0 || event.player.isAlive();
                            },
                            content: function () {
                                var num = trigger.player.getHistory('useCard', function (evt) {
                                    return evt.targets.includes(player);
                                }).length;
                                if (num == 0) {
                                    var list = player.getSkills(null, false, false).filter(function (skill) {
                                        var info = lib.skill[skill];
                                        return info && info.juexingji && !player.awakenedSkills.includes(skill);
                                    });
                                    if (list.length > 0) {
                                        player.storage.zqxiudaox++;
                                        player.markSkill('zqxiudaox');
                                        player.syncStorage('zqxiudaox');
                                    }
                                } else player.draw();
                            },
                            group: 'zqxiudaox',
                        },
                        zqxiudaox: {
                            mark: true,
                            init: function (player) {
                                player.storage.zqxiudaox = 0;
                            },
                            intro: {
                                content: function (storage) {
                                    if (storage > 0) return '手牌上限+' + storage;
                                    if (storage < 0) if (player.storage.zqxiudaox == 'number') return '手牌上限' + storage;
                                    return '手牌上限无变化';
                                },
                            },
                            mod: {
                                maxHandcard: function (player, num) {
                                    return num + player.storage.zqxiudaox;
                                },
                            },
                            charlotte: true,
                            onremove: true,
                        },
                        zqfeisheng: {
                            derivation: 'zqxianshu',
                            trigger: {
                                player: 'phaseZhunbeiBegin',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shenzhugeguo:1',
                            unique: true,
                            juexingji: true,
                            forced: true,
                            skillAnimation: true,
                            animationColor: 'metal',
                            filter: function (event, player) {
                                return player.getHandcardLimit() >= 7;
                            },
                            content: function () {
                                player.awakenSkill('zqfeisheng');
                                player.removeSkill('zqbinan');
                                player.addSkill('zqxianshu');
                            },
                        },
                        zqxianshu: {
                            trigger: {
                                global: 'useCardAfter',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shenzhugeguo:2',
                            filter: function (event, player, card) {
                                return get.type(event.card) != 'delay' && get.type(event.card) != 'equip' && player.hasUseTarget(event.card) && event.player.getHistory('useCard', function (evt) {
                                    return ['basic', 'trick'].includes(get.type(evt.card)) && player.hasUseTarget({
                                        name: evt.card.name,
                                        nature: evt.card.nature,
                                        isCard: true,
                                    });
                                }).length > 0 && player.countCards('h') > 0 && event.cards.length > 0;
                            },
                            direct: true,
                            content: function () {
                                'step 0'
                                player.chooseToDiscard('h', get.prompt('zqxianshu'), '是否也使用一张【' + get.translation(trigger.card) + '】。', lib.filter.cardDiscardable).set('ai', function (card) {
                                    if (trigger.card.name == 'shan' || trigger.card.name == 'wuxie') return 0;
                                    if (trigger.card.name != 'shan' && get.value(trigger.card) >= 10) return 10 - get.value(card);
                                    if (trigger.card.name != 'shan' && get.value(trigger.card) >= 8) return 8 - get.value(card);
                                    if (trigger.card.name != 'shan' && (get.value(trigger.card) >= 6.5 || (trigger.card.name == 'sha' && player.countCards('h') > 3))) return 6.5 - get.value(card);
                                    return 0;
                                });
                                'step 1'
                                if (result.bool) {
                                    player.addSkill('zqxianshu_max');
                                    player.logSkill('zqxianshu');
                                    player.chooseUseTarget({ name: trigger.card.name, nature: trigger.card.nature }, false, 'nodistance');
                                }
                                else event.finish();
                                'step 2'
                                player.removeSkill('zqxianshu_max');
                            },
                        },
                        'zqxianshu_max': {
                            mod: {
                                cardUsable: function (card) {
                                    if (get.info(card) && get.info(card).forceUsable) return;
                                    return Infinity;
                                },
                                targetInRange: function () {
                                    return true;
                                },
                                aiOrder: function (player, card, num) {
                                    var name = get.name(card);
                                    if (name == 'tao') return num + 7 + Math.pow(player.getDamagedHp(), 2);
                                    if (name == 'sha') return num + 6;
                                },
                            },
                        },
                        //玉皇大帝
                        zqtianma: {
                            trigger: {
                                global: 'gameStart',
                            },
                            audio: 'ext:天庭:0',
                            forced: true,
                            content: function () {
                                game.playAudio('../extension/天庭/audio/skill/zq_yuhuangdadi/zqzhengdi1.mp3');
                                player.disableEquip('equip3');
                                player.disableEquip('equip4');
                            },
                            mod: {
                                globalTo: function (from, to, distance) {
                                    return distance + 1;
                                },
                                globalFrom: function (from, to, distance) {
                                    return distance - 1;
                                },
                            },
                            group: 'zqtianma_add',
                        },
                        zqtianma_add: {
                            enable: 'phaseUse',
                            position: 'he',
                            filter: function (event, player) {
                                return player.countCards('he', { subtype: ['equip3', 'equip4', 'equip6'] }) > 0;
                            },
                            filterCard: function (card) {
                                return get.subtype(card) == 'equip3' || get.subtype(card) == 'equip4' || get.subtype(card) == 'equip6';
                            },
                            check: function (card) {
                                if (_status.event.player.isDisabled(get.subtype(card))) return 5;
                                return 3 - get.value(card);
                            },
                            content: function () {
                                player.draw();
                            },
                            discard: false,
                            visible: true,
                            loseTo: 'discardPile',
                            prompt: '将一张坐骑牌置入弃牌堆并摸一张牌',
                            delay: 0.5,
                            prepare: function (cards, player) {
                                player.$throw(cards, 1000);
                                game.log(player, '将', cards, '置入了弃牌堆');
                            },
                            ai: {
                                order: 15,
                                result: {
                                    player: 10,
                                },
                            },
                        },
                        zqxingshan: {
                            trigger: {
                                player: 'phaseBegin',
                            },
                            audio: 'ext:天庭:0',
                            direct: true,
                            priority: 3,
                            filter: function (event, player) {
                                return (player.maxHp > 1);
                            },
                            content: function () {
                                'step 0'
                                player.chooseControl('确定', 'cancel2').set('prompt', '【行善】：减少一点体力上限令场上所有角色各摸一张牌。之后，你随机获得一张【积德】未记录过牌名的非装备牌').set('ai', function () {
                                    if (!player.hasJudge('lebu') && (18 - player.countMark('zqjide')) < player.maxHp) return 0;
                                    return 1;
                                });
                                'step 1'
                                if (result.control == '确定') {
                                    var target = game.filterPlayer();
                                    if (player.maxHp > 0) player.loseMaxHp();
                                    game.asyncDraw(target);
                                }
                                else event.finish();
                                'step 2'
                                var card = get.cardPile(function (card) {
                                    return get.type2(card) != 'equip' && !player.getStorage('zqjide').includes(card.name);
                                });
                                if (card) {
                                    player.gain(card, 'gain2');
                                }
                                else event.finish();
                            },
                            ai: {
                                expose: 0.2,
                                threaten: 2,
                            },
                        },
                        zqjide: {
                            trigger: {
                                player: 'useCardBegin',
                            },
                            audio: 'ext:天庭/audio/skill/zq_yuhuangdadi:1',
                            forced: true,
                            filter: function (event, player) {
                                return get.type2(event.card) != 'equip' && !player.getStorage('zqjide').includes(event.card.name);
                            },
                            content: function () {
                                player.markAuto('zqjide', [trigger.card.name]);
                                player.draw();
                            },
                            onremove: true,
                            //mark:true,
                            marktext: '德',
                            intro:{
                                content: '已记录牌名：$',
                            },
                            ai: {
                                threaten: 2,
                                effect: {
                                    player: function (card, player) {
                                        if (get.type2(card) != 'equip' && !player.getStorage('zqjide').includes(card.name)) return [2, 3];
                                    },
                                },
                            },
                        },
                        zqzhengdi: {
                            trigger: {
                                player: ['useCardBegin', 'useCardEnd', 'useCardAfter'],
                            },
                            audio: 'ext:天庭/audio/skill/zq_yuhuangdadi:1',
                            forced: true,
                            skillAnimation: true,
                            animationColor: 'metal',
                            filter: function (event, player) {
                                return player.countMark('zqjide') >= 18;
                            },
                            content: function () {
                                if (typeof game.showIdentity === 'function') game.showIdentity();
                                var winners = player.getFriends();
                                game.over(player == game.me || winners.includes(game.me));
                                game.log('●获胜阵营：', player, '<font color=\"#96CAFF\">、</font>', winners);
                            },
                        },
                        //神徐盛
                        zqxushi: {
                            audio: 'ext:天庭:0',
                            trigger: {
                                source: 'damageEnd',
                            },
                            onremove: true,
                            init: function (player) {
                                player.storage.zqxushi = 0;
                            },
                            mark: true,
                            marktext: '破',
                            intro:{
                                name: '破',
                                content: 'mark',
                            },
                            frequent: true,
                            content: function () {
                                player.storage.zqxushi += 1;
                                player.syncStorage('zqxushi');
                            },
                        },
                        zqpodi: {
                            //audio:['repojun',2],
                            audio: 'ext:天庭/audio/skill/zq_shenxusheng:2',
                            trigger: {
                                player: 'useCardToPlayered',
                            },
                            direct: true,
                            filter: function (event, player) {
                                if (event.cards.length < 1 && !get.number(event.card)) return false;
                                return event.target != player && event.target.countCards('he') && event.targets.length == 1 && (get.number(event.card) || get.number(event.cards[0]));
                            },
                            content: function () {
                                'step 0'
                                if (trigger.cards.length < 1 && !get.number(trigger.card)) event.finish();
                                if (trigger.target != player && trigger.target.countCards('he') && trigger.targets.length == 1 && (get.number(trigger.card) || get.number(trigger.cards[0]))) {
                                    var next = player.choosePlayerCard(trigger.target, 'he', [1, Math.min((get.number(trigger.card) || get.number(trigger.cards[0])), trigger.target.countCards('he'))], get.prompt('zqpodi', trigger.target));
                                    next.cardx = trigger.card;
                                    next.set('ai', function (button) {
                                        var numx = _status.event.target.countCards('he');
                                        var name2 = get.name(_status.event.cardx);
                                        if (get.attitude(_status.event.player, _status.event.target) > 0) return 0;
                                        if (name2 == 'sha' && button.link == _status.event.target.getEquip(2)) return 25;
                                        if ((name2 == 'shunshou' || name2 == 'guohe' || name2 == 'huogong') && ui.selected.buttons.length + 1 >= numx) return 0;
                                        //return get.value(button.link); //注释后无法优先选防具，不注释bug更严重，ai盖牌总数减半
                                    });
                                } else event.finish();
                                'step 1'
                                if (result.bool) {
                                    var target = trigger.target;
                                    player.logSkill('zqpodi', target);
                                    game.log(player, '将', target, '的【', result.cards.length, '】张牌扣置于其武将上');
                                    target.addTempSkill('zqpodi2');
                                    target.addToExpansion(result.cards, 'forceAuto', target).gaintag.add('zqpodi2');
                                }
                            },
                            ai: {
                                'unequip_ai': true,
                                'directHit_ai': true,
                                skillTagFilter: function (player, tag, arg) {
                                    if (get.attitude(player, arg.target) > 0) return false;
                                    if (tag == 'directHit_ai') return get.number(arg.card) >= arg.target.countCards('he');
                                    if (arg && arg.target.getEquip(2)) return true;
                                    return false;
                                },
                            },
                            group: 'zqpodi3'
                        },
                        'zqpodi3': {
                            trigger: {
                                player: 'useCardToPlayer',
                            },
                            direct: true,
                            filter: function (event, player) {
                                return event.targets.length == 1; //&&player.countMark('zqxushi')>0
                            },
                            content: function () {
                                player.addTempSkill('zqpodi4', 'useCardAfter');
                            },
                            ai: {
                                threaten: 0.5,
                            },
                        },
                        'zqpodi4': {
                            trigger: {
                                source: 'damageBegin1',
                            },
                            direct: true,
                            filter: function (event, player, card) {
                                return event.card && event.player != player;
                            },
                            content: function () {
                                trigger.num += player.countMark('zqxushi');
                            },
                        },
                        'zqpodi2': {
                            trigger: {
                                global: 'phaseEnd',
                            },
                            //locked:true,
                            forced: true,
                            popup: false,
                            charlotte: true,
                            filter: function (event, player) {
                                return player.getExpansions('zqpodi2').length > 0;
                            },
                            content: function () {
                                'step 0'
                                var cards = player.getExpansions('zqpodi2');
                                player.gain(cards, 'draw');
                                game.log(player, '收回了' + get.cnNumber(cards.length) + '张置于武将上的牌');
                                'step 1'
                                player.removeSkill('zqpodi2');
                            },
                            //mark:true,
                            intro: {
                                markcount: 'expansion',
                                mark: function (dialog, storage, player) {
                                    var cards = player.getExpansions('zqpodi2');
                                    if (player.isUnderControl(true)) dialog.addAuto(cards);
                                    else return '共有' + get.cnNumber(cards.length) + '张牌';
                                },
                            },
                        },
                        zqyicheng: { //清除所有标记
                            //audio:['pojun',2],
                            audio: 'ext:天庭/audio/skill/zq_shenxusheng:2',
                            trigger: {
                                player: 'phaseJieshuBegin',
                            },
                            forced: true,
                            frequent: true,
                            preHidden: true,
                            filter: function (event, player) {
                                return !player.getHistory('sourceDamage').length;
                            },
                            content: function () {
                                'step 0'
                                if (player.countCards('h') < player.maxHp) player.drawTo(player.maxHp);
                                'step 1'
                                for (var i in player.storage) {
                                    //if(lib.skill[i]) game.log('●',lib.skill[i].marktext);
                                    if (typeof player.storage[i] === 'number' && lib.skill[i] && lib.skill[i].marktext) player.removeMark(i, player.storage[i], true);
                                }
                                'step 2'
                                player.addTempSkill('zqyicheng2', { player: 'phaseBegin' });
                            },
                        },
                        zqyicheng2: {
                            mod: {
                                targetEnabled: function (card, player, target, now) {
                                    if (card.name == 'sha') return false;
                                },
                            },
                            mark: true, //是否显示标记，player.markSkill('技能名');显示标记，用于联机同步标记
                            onremove: true, //失去技能时移除标记
                            marktext: '疑城︎', //标记名字，没有则显示技能名
                            intro:{ //点击标记的弹窗内容
                                name: '疑城',
                                content: '你不能成为【杀】的目标。', //可用函数
                            },
                        },
                        //龙魂优化ai
                        zqxinlonghun: {
                            audio: 'longhun',
                            enable: ['chooseToUse', 'chooseToRespond'],
                            prompt: '将♦牌当做杀，♥牌当做桃，♣牌当做闪，♠牌当做无懈可击使用或打出',
                            mod: {
                                aiUseful: function (player, card, num) {
                                    if (get.type(card) == 'basic' && get.suit(card) != 'heart') return 1;
                                    if (get.type(card) != 'basic' && get.suit(card) == 'spade' && (get.name(card) != 'guohe' && get.name(card) != 'zhuge' && get.name(card) != 'rewrite_zhuge')) return 2;
                                },
                            },
                            viewAs: function (cards, player) {
                                var name = false;
                                var nature = null;
                                switch (get.suit(cards[0], player)) {
                                    case 'club': name = 'shan'; break;
                                    case 'diamond': name = 'sha'; nature = 'fire'; break;
                                    case 'spade': name = 'wuxie'; break;
                                    case 'heart': name = 'tao'; break;
                                }
                                if (name) return { name: name, nature: nature };
                                return null;
                            },
                            check: function (card) {
                                var player = _status.event.player;
                                if (_status.event.type == 'phase') {
                                    var max = 0;
                                    var name2;
                                    var list = ['sha', 'tao'];
                                    var map = { sha: 'diamond', tao: 'heart' }
                                    for (var i = 0; i < list.length; i++) {
                                        var name = list[i];
                                        if (player.countCards('hs', function (card) {
                                            return (name != 'sha' || get.value(card) < 10) && get.suit(card, player) == map[name];
                                        }) > 0 && player.getUseValue({ name: name, nature: name == 'sha' ? 'fire' : null }) > 0) {
                                            var temp = get.order({ name: name, nature: name == 'sha' ? 'fire' : null });
                                            if (temp > max) {
                                                max = temp;
                                                name2 = map[name];
                                            }
                                        }
                                    }
                                    if (name2 == get.suit(card, player)) return ((!player.getEquip('zhuge') && !player.getEquip('rewrite_zhuge') && (card.name == 'zhuge' || card.name == 'rewrite_zhuge')) ? 0 : 1);
                                    return 0;
                                }
                                return ((!player.getEquip('zhuge') && !player.getEquip('rewrite_zhuge') && (card.name == 'zhuge' || card.name == 'rewrite_zhuge')) ? 0 : 1);
                            },
                            position: 'hs',
                            filterCard: function (card, player, event) {
                                event = event || _status.event;
                                var filter = event._backup.filterCard;
                                var name = get.suit(card, player);
                                if (name == 'club' && filter({ name: 'shan', cards: [card] }, player, event)) return true;
                                if (name == 'diamond' && filter({ name: 'sha', cards: [card], nature: 'fire' }, player, event)) return true;
                                if (name == 'spade' && filter({ name: 'wuxie', cards: [card] }, player, event)) return true;
                                if (name == 'heart' && filter({ name: 'tao', cards: [card] }, player, event)) return true;
                                return false;
                            },
                            filter: function (event, player) {
                                var filter = event.filterCard;
                                if (filter({ name: 'sha', nature: 'fire' }, player, event) && player.countCards('hs', { suit: 'diamond' })) return true;
                                if (filter({ name: 'shan' }, player, event) && player.countCards('hs', { suit: 'club' })) return true;
                                if (filter({ name: 'tao' }, player, event) && player.countCards('hs', { suit: 'heart' })) return true;
                                if (filter({ name: 'wuxie' }, player, event) && player.countCards('hs', { suit: 'spade' })) return true;
                                return false;
                            },
                            ai: {
                                respondSha: true,
                                respondShan: true,
                                effect: {
                                    player: function (card, player) {
                                        var list = 0;
                                        for (var i = 0; i < game.players.length; i++) {
                                            if (get.attitude(player, game.players[i]) < 0) {
                                                if (player.inRange(game.players[i])) list++;
                                                if (game.players[i].hasSkill('zqyicheng2')) list--;
                                                if (game.players[i].hasSkill('kongcheng') && game.players[i].countCards('h') == 0) list--;
                                            }
                                        }
                                        if (list > 0 && (player.getEquip('zhuge') || player.getEquip('rewrite_zhuge')) && get.name(card) == 'sha') return [2, 3];
                                        //如果list>0、且你装备(ak或马钧强化的ak)、且是杀时，更倾向于使用
                                        if (list > 0 && card.name == 'zhuge' && !player.getEquip(1)) return [3, 3];
                                        if (list > 0 && player.getEquip('zhuge') && card.name == 'zhuge') return [3, 3];
                                        if (!player.getEquip('zhuge') && !player.getEquip('rewrite_zhuge') && get.type(card) == 'equip' && card.name != 'zhuge') return [2, 3];
                                        if ((player.getEquip('zhuge') || player.getEquip('rewrite_zhuge')) && get.type2(card) == 'trick') return [2, 3];
                                        if ((player.getEquip('zhuge') || player.getEquip('rewrite_zhuge')) && get.type(card) == 'equip' && get.subtype(card) != 'equip1') return [2, 3];
                                    },
                                },
                                skillTagFilter: function (player, tag) {
                                    var name;
                                    switch (tag) {
                                        case 'respondSha': name = 'diamond'; break;
                                        case 'respondShan': name = 'club'; break;
                                        case 'save': name = 'heart'; break;
                                    }
                                    if (!player.countCards('hs', { suit: name })) return false;
                                },
                                order: function (item, player) {
                                    if (player && _status.event.type == 'phase') {
                                        var max = 0;
                                        var list = ['sha', 'tao'];
                                        var map = { sha: 'diamond', tao: 'heart' }
                                        for (var i = 0; i < list.length; i++) {
                                            var name = list[i];
                                            if (player.countCards('hs', function (card) {
                                                return (name != 'sha' || get.value(card) < 10) && get.suit(card, player) == map[name];
                                            }) > 0 && player.getUseValue({ name: name, nature: name == 'sha' ? 'fire' : null }) > 0) {
                                                var temp = get.order({ name: name, nature: name == 'sha' ? 'fire' : null });
                                                if (temp > max) max = temp;
                                            }
                                        }
                                        max /= 1.1;
                                        return max;
                                    }
                                    return 2;
                                },
                            },
                            hiddenCard: function (player, name) {
                                if (name == 'wuxie' && _status.connectMode && player.countCards('hs') > 0) return true;
                                if (name == 'wuxie') return player.countCards('hs', { suit: 'spade' }) > 0;
                                if (name == 'tao') return player.countCards('hs', { suit: 'heart' }) > 0;
                            },
                        },
                        guozhan_zqfo: {
                            popup: false,
                            charlotte: true,
                            superCharlotte: true,
                            init2: function (player) {
                                if (get.mode() == 'guozhan') {
                                    if (player.name1 && lib.character[player.name1] && lib.character[player.name1][1] && lib.character[player.name1][1] == 'zqfo') lib.character[player.name1][1] = 'ye';
                                    if (player.name2 && lib.character[player.name2] && lib.character[player.name2][1] && lib.character[player.name2][1] == 'zqfo') lib.character[player.name2][1] = 'ye';
                                }
                            },
                        },
                    },
                    translate: {
                        ...voices,
                        '#sp_zq_zhoutai:die': '已经…尽力了……',
                        '#sp_zq_liushan:die': '快乐的日子，何其短暂……',
                        '#sp_zq_sunquan:die': '自古许多忧，英雄…老来愁……',
                        '#sp_zq_caocao:die': '尔等，算什么忠臣！',
                        '#zq_shenzuoci:die': '红尘看破，驾鹤仙升。',
                        '#zq_shenzhugeguo:die': '仙缘已了，魂入轮回。',
                        '#zq_shenxusheng:die': '盛只恨，不能再为主公…破敌制胜了……',
                        '#zq_shencaozhi:die': '一身轻松，待来生……',
                        '#zq_sunwukong:die': '呃，师～傅～啊……',
                        '#zq_sanshifo:die': '万物皆无常，有生…必有灭……',
                        '#zq_zhaogongming:die': '无意凡事争斗……',
                        '#zq_yuhuangdadi:die': '快去请如来佛祖！！！',
                        '#zq_yuelao:die': '思而不得……',
                        '#zq_yanluowang:die': '阴阳两隔，公道不灭……',
                        '#zq_yangjian:die': '人终有一死……',
                        '#zq_taishanglaojun:die': '金丹难成，大道难修……',
                        '#zq_pangu:die': '我该休息了……',
                        '#zq_nvwa:die': '神明终将隐去……',
                        '#zq_nezha:die': '啊……',
                        '#zq_leishen:die': '向死，方生……',
                        '#zq_jiangziya:die': '人心不古啊！',

                        'zq_nvwa': '女娲',
                        'zq_nvwa_ab': '女娲',
                        'zq_nvwa_shibing': '士兵',
                        'zq_nvwa_shibing_ab': '士兵',
                        'zq_yuelao': '柴道煌',
                        'zq_yuelao_ab': '月老',
                        'zq_yangjian': '杨戬',
                        'zq_yangjian_ab': '杨戬',
                        'zq_pangu': '盘古',
                        'zq_pangu_ab': '盘古',
                        'zq_zhaogongming': '赵公明',
                        'zq_zhaogongming_ab': '财神',
                        'sp_zq_sunquan': 'SP孙权',
                        'sp_zq_sunquan_ab': 'SP孙权',
                        'sp_zq_caocao': 'SP曹操',
                        'sp_zq_caocao_ab': 'SP曹操',
                        'sp_zq_liushan': 'SP刘禅',
                        'sp_zq_liushan_ab': 'SP刘禅',
                        'zq_sanshifo': '三世佛',
                        'zq_sanshifo_ab': '如来佛祖',
                        'zq_jiangziya': '姜子牙',
                        'zq_jiangziya_ab': '姜子牙',
                        'zq_taishanglaojun': '太上老君',
                        'zq_taishanglaojun_ab': '太上老君',
                        'zq_leishen': '闻仲',
                        'zq_leishen_ab': '雷祖',
                        'zq_shencaozhi': '神曹植',
                        'zq_shencaozhi_ab': '神曹植',
                        'zq_nezha': '哪吒',
                        'zq_nezha_ab': '哪吒',
                        'zq_shenxusheng': '神徐盛',
                        'zq_shenxusheng_ab': '神徐盛',
                        'zq_yuhuangdadi': '张友仁',//资料页名字，可搜索
                        'zq_yuhuangdadi_ab': '玉皇大帝',//自由选将名字
                        'zq_shenzhugeguo': '神诸葛果',
                        'zq_shenzhugeguo_ab': '神诸葛果',
                        'sp_zq_zhoutai': 'SP周泰',
                        'sp_zq_zhoutai_ab': 'SP周泰',
                        'zq_shenzuoci': '神左慈',
                        'zq_shenzuoci_ab': '神左慈',
                        'zq_yanluowang': '包拯',
                        'zq_yanluowang_ab': '阎罗王',
                        'zq_sunwukong': '孙悟空',
                        'zq_sunwukong_ab': '孙悟空',

                        //武将包
                        'zq_tianting': '神话天庭',
                        'zq_shenjiang': '天兵天将',
                        'zq_tianxia': '天下苍生',

                        //技能
                        zqzaoren: '造人',
                        'zqzaoren_info': '出牌阶段限一次，若你的上家或下家不为<b>士兵</b>，你可以在你与其之间创造一名<b>士兵</b>（体力值1，初始手牌4，性别随机，势力、阵营和胜利条件与你一致，由你操控且死亡时移出游戏外），之后你从三个“场上角色未拥有且你未记录的”锁定技中选择一个记录，并令<b>士兵</b>获得之。',
                        zqbutian_achieve: '补天',
                        zqbutian_fail: '补天',
                        zqbutian_effect: '补天',
                        zqbutian_mod: '补天',
                        //zqwucaishi_equip:'补天',
                        'zqwucaishi_equip_info': '持恒技，当你濒死时，获得并使用【五彩石】。',
                        zqbutian: '补天',
                        'zqbutian_info': '使命技，持恒技，你濒死时，获得并使用【五彩石】。其他角色对你使用的牌结算完成或进入判定区后，你可以将此牌置于你的武将牌上，称为「石」，若如此做，你本回合不能成为与此牌同名的牌的目标。<b>①使命</b>：牌堆洗牌时，「石」的点数之和＞36。<b>②成功</b>：你获得【造人】记录的技能，并将「石」洗牌置于牌堆顶。<b>③失败</b>：你死亡。',
                        zqhongxian: '红线',
                        'zqhongxian_info': '你可以弃一张牌并选择一名判定区内没有【乐不思蜀】的角色，随机将一张与其性别不同的武将牌视为【乐不思蜀】置于其判定区内。此牌判定生效后变更为其副将，不因此效果而离开判定区时，改为放回武将牌堆。',
                        zqhunbu: '婚簿',
                        'zqhunbu_info': '锁定技，【乐不思蜀】对你判定生效后的效果改为你摸两张牌。当你受到伤害后，你于本回合视为移出游戏并移除伤害来源的副将。',
                        zqxiaotian: '哮天',
                        'zqxiaotian_info': '出牌阶段限一次，你可以将一张手牌当【出其不意】使用。',
                        zqtianyan: '天眼',
                        'zqtianyan_info': '锁定技，牌堆顶的一张牌始终对你可见。',
                        zqxuangong: '玄功',
                        'zqxuangong_info': '当你造成伤害时，你可以防止此伤害，然后获得等量的护甲。当你使用的伤害类即时牌被任意角色使用、打出的牌响应后，此牌的伤害值基数+1；若此牌未造成伤害，你可以在此牌结算完成后，摸此牌的伤害值基数张牌。',
                        zqkaitian: '开天',
                        'zqkaitian_info': '锁定技，游戏开始时，你将牌堆上方一半的牌置入弃牌堆（向上取整）。',
                        zqchuangshi: '创世',
                        'zqchuangshi_info': '锁定技，持恒技，你废除手牌区。每回合你可以如手牌般使用、打出弃牌堆中的至多X张牌（X为你的体力值，且至多为5）。你使用、打出牌时，这些牌直到进入牌堆前标记为「创世」，当「创世」牌进入弃牌堆时，改为置于牌堆底。<br/>（ps：默认最多显示80张「创世」牌，你可以在《天庭》扩展中重新设置。）',
                        zqchuangshi2: '创世',
                        zqchuangshi3: '创世',
                        zqchuangshix: '创世',
                        zqchuangshi_tag: '创世',
                        zqchuangshi_use: '创世',
                        zqchuangshi_lose: '创世',
                        zqzhaocai: '招财',
                        'zqzhaocai_info': '锁定技，其他角色的回合结束时，若你不是手牌最多的角色，你摸牌至手牌数与手牌最多的一名角色相同。',
                        zqzhaobao: '招宝',
                        'zqzhaobao_info': '出牌阶段限一次，你可以选择一项：①移动场上的一张宝物牌；②从牌堆或弃牌堆中选择一张宝物牌并获得之。',
                        zqzhaobao_backup: '招宝',
                        zqzhaobao_move: '招宝',
                        zqzhaobao_gain: '招宝',
                        zqnazhen: '纳珍',
                        'zqnazhen_info': '出牌阶段限一次，你可以选择一名武将牌上有牌的角色，获得其武将牌上的一张牌。',
                        zqlishi: '利市',
                        'zqlishi_info': '其他角色的出牌阶段开始时，其可以交给你X张手牌（X为任意值，且至多为5）。若如此做，该角色于其回合结束后，亮出牌堆中间位置的随机一张牌，若此牌为红色，则直到你没有手牌为止，你交给其2X张手牌。',
                        zqlishi2: '利市',
                        //zqchengchen_mod:'测试',
                        zqchengchen: '称臣',
                        'zqchengchen_info': '出牌阶段开始时，你可以交给一名其他角色两张手牌。若如此做，直到你的下个出牌阶段开始或者你对其造成伤害之前，其不能使用可以造成伤害的牌指定你为目标，你获得其因弃置而进入弃牌堆的牌。',
                        zqwuwang: '吴王',
                        'zqwuwang_info': '觉醒技，每轮游戏结束时，若你本轮未受到过伤害，你将势力改为「吴」，失去技能【称臣】并获得【六剑】。',
                        zqwuwang_damage: '吴王',
                        zqwuwang_round: '吴王',
                        zqliujian: '六剑',
                        'zqliujian_info': '锁定技，所有吴势力角色的攻击范围+1。当你使用一张非无色牌时，若此牌的①颜色②类别③花色中每有一项与你本回合使用的所有其他非无色牌均不同，你摸一张牌。',
                        zqjiamei: '假寐',
                        'zqjiamei_info': '其他角色的回合开始前，若你的武将牌正面向上，你可以翻面并摸一张牌。',
                        zqyixin: '疑心',
                        'zqyixin_info': '当你受到1点伤害后，令伤害来源获得一枚「疑」标记。此外，其他角色的回合开始时，其须选择一项：①将一半的手牌（向上取整）交给你，并弃置一枚「疑」；②获得一枚「疑」。（每名角色最多可获得三枚「疑」）',
                        zqyixin2: '疑心',
                        zqyixin3: '疑心',
                        zqbaoqi: '暴起',
                        'zqbaoqi_info': '锁定技，你的回合外，当你使用或打出牌时，若你的武将牌背面向上，你翻面，并对当前回合角色造成X点伤害。（X为其拥有的「疑」的数量）',
                        //'zqbaoqi_info':'锁定技，你的回合外，当你使用或打出牌时，若你的武将牌为背面朝上，将你的武将牌翻面，并视为对当前回合角色使用一张伤害+X的【杀】。（X为其拥有的「疑」的数量）',
                        zqzhengtong: '正统',
                        'zqzhengtong_info': '锁定技，你使用牌没有距离和次数限制。当你造成或者受到1点伤害后，摸一张牌。出牌阶段，你不能使用、打出、弃置你于此阶段内不因此技能而摸到的牌。',
                        'zqzhengtong1': '正统',
                        'zqzhengtong2': '正统',
                        'zqanle1': '安乐',
                        zqanle: '安乐',
                        'zqanle_info': '锁定技，持恒技，<b>当你造成伤害时，此伤害减一，你不能失去此技能。</b>每回合限三次，当你受到伤害时，若场上有拥有【正统】且没有【安樂】的角色，你将此伤害转移给其中一名角色。你死亡后所有角色失去【正统】。',
                        zqanlex: '安乐',
                        'zqanlex_info': '锁定技，持恒技，<b>当你造成伤害时，此伤害减一，你不能失去此技能。</b>每回合限三次，当你受到伤害时，若场上有拥有【正统】且没有【安樂】的角色，你将此伤害转移给其中一名角色。你死亡后所有角色失去【正统】。',
                        'zqanle_die': '安乐',
                        'zqanle_ai_jiu': '安乐',
                        zqguixiang: '归降',
                        'zqguixiang_info': '限定技，当你进入濒死状态时，你可以将体力回复至体力上限，并令当前回合角色获得【正统】。',
                        zqtuiwei: '退位',
                        'zqtuiwei_info': '主公技，当你发动【归降】后，可以令一名其他拥有技能【正统】的角色增加1点体力上限并成为主公，你成为忠臣。之后，场上所有内奸可以亮出身份并成为反贼。',
                        zqsanshi: '三世',
                        'zqsanshi_info': '转换技，持恒技，此技能转换形态时，你摸一张牌。因此技能而使用的牌不计入且无次数限制。<br/>●现在：当「指定你为目标」的实体即时牌结算完成后，你可以视为对此牌的使用者使用一张【此牌】。<br/>●未来：当「你使用或打出」的实体牌结算完成后，你可以展示牌堆顶的三张牌并视为使用其中一张【即时牌】。<br/>●过去：当「你对任意角色使用」的实体牌结算完成后，你可以视为对此牌指定的目标角色依次使用一张此牌的上一张【被你使用且有目标的实体即时牌】。<br/>※即时牌：基本牌和非延时锦囊牌。',
                        zqchuidiao: '垂钓',
                        'zqchuidiao_info': '其他角色的回合开始时，其可以交给你一张牌，然后从【天王】、【八部】、【五岳】中选择一个技能直到其下个回合开始前获得。',
                        zqshenshi: '神使',
                        'zqshenshi_info': '锁定技，你视为拥有技能【天王】、【八部】和【五岳】。',
                        zqshenbian: '神鞭',
                        'zqshenbian_info': '当其他角色对你使用的牌结算完成后，若其拥有【天王】、【八部】、【五岳】中的任意技能，你可以对其造成1点伤害。若如此做，你弃置一张牌。',
                        zqtianwang: '天王',
                        'zqtianwang_info': '每回合限一次，当你于摸牌阶段外获得牌后，你可以视为使用一张不计入且无次数限制的【杀】。',
                        zqbabu: '八部',
                        'zqbabu_info': '每回合限一次，当其他角色获得你的牌后，你可以弃置其区域里的一张牌，或者令其摸一张牌。',
                        zqwuyue: '五岳',
                        'zqwuyue_info': '每回合限一次，当你的牌于弃牌阶段外因弃置而进入弃牌堆后，你可以获得之。',
                        zqdanlu: '丹炉',
                        'zqdanlu_info': '锁定技，转换技，每轮游戏开始时，你从牌堆和弃牌堆中获得一张：阳：长生【丹】；阴：还魂【丹】。<br/>若游戏中没有【丹】，你将三张长生【丹】和一张还魂【丹】加入牌堆。',
                        zqlianqi: '炼器',
                        'zqlianqi_info': '分发起始手牌后，你获得【金刚琢】、【幌金绳】、【七星剑】。出牌阶段限一次，你可以重铸一张装备牌，之后从【金刚琢】、【幌金绳】、【七星剑】中选择一张并从牌堆和弃牌堆中获得之。',
                        zqlianqi_add: '炼器',
                        zqleizu: '雷祖',
                        'zqleizu_info': '锁定技，你视为所有雷电伤害的来源。当你造成雷电伤害后，摸一张牌。你的♠【杀】均视为雷【杀】。当你受到雷电伤害时，防止此伤害；当你受到火焰伤害时，此伤害+1。',
                        'zqleizu1': '雷祖',
                        'zqleizu2': '雷祖',
                        'zqleizu3': '雷祖',
                        zqshandian: '闪电',
                        'zqshandian_info': '①当你成为锦囊牌的目标后，若此牌指定的目标中有角色可以成为【闪电】的目标，你可以将此牌视为【闪电】并置于其中首个可以成为【闪电】目标的角色的判定区内。②每回合限一次，当你使用（或者成为）♠2～9的牌指定（的）唯一目标后，可以对目标角色和其上家、下家依次造成一点雷电伤害。',
                        'zqshandian1': '闪电',
                        zqsanyan: '三眼',
                        'zqsanyan_info': '限定技，出牌阶段，你可以观看一名其他角色的身份和武将牌。',
                        zqhuoyan: '火眼',
                        'zqhuoyan_info': '出牌阶段限一次，你可以观看一名其他角色的手牌。',
                        zqzhanfo: '战佛',
                        'zqzhanfo_info': '锁定技，每回合限一次，你不会失去体力。回合开始时，你从场上、牌堆和弃牌堆中获得【金箍棒】和两张【杀】。（若本局游戏没有金箍棒，则将其加入游戏）',
                        'zqzhanfo1': '战佛',
                        'zqzhanfo2': '战佛',
                        zqjiubing: '救兵',
                        'zqjiubing_info': '当你受到伤害后，你可以随机获得一张未加入游戏的神、佛势力武将牌，然后选择该武将牌的一个你未拥有的技能并获得之。你以此法获得的技能在发动一次后失去，并弃置对应的武将牌。',
                        zqqibu: '七步',
                        'zqqibu_info': '当你受到伤害后，可以展示手牌区并亮出牌堆顶的七张牌。若如此做，你可以使用其中至多4张牌（不计入且无次数限制）。若你以此法使用的牌的原本花色少于4种，你减1点体力上限。此技能结算完成前不能再次发动。',
                        zqqibux: '成诗',
                        zqchengshi: '成诗',
                        'zqchengshi_info': '回合开始时，你可以无条件发动【七步】。当你因【七步】而使用的牌的原本花色达到4种时，手牌上限+1，并获得【七步】亮出的牌中未被使用且可以使用的牌。',
                        //zqchengshi1:'成诗',
                        zqchengshi2: '成诗',
                        zqchengshi3: '七步',
                        zqfaxiang: '法相',
                        'zqfaxiang_info': '锁定技，当你使用武器牌时，若「武」的数量小于5，将其置于武将上，称为「武」，之后摸两张牌。你视为拥有武将上称为「武」的武器牌的效果，且攻击范围+X。摸牌阶段，你多摸X张牌。（X为「武」的数量）',
                        'zqfaxiangx': '法相',
                        zqfabao: '法宝',
                        'zqfabao_info': '当一名角色成为【杀】的目标后，你可以发动以下效果：①混天绫：若该角色不为你，弃置一张锦囊牌，令其不能使用【闪】响应此【杀】，并获得其装备区的一张牌。②乾坤圈：弃置一张装备牌或移去一张「武」。之后，令其弃置装备区的一张牌，否则你对其造成1点伤害。③风火轮：弃置一张基本牌，令此【杀】对你无效。',
                        'zqfabao1': '混天绫',
                        'zqfabao2': '乾坤圈',
                        'zqfabao3': '风火轮',
                        zqmingti: '冥体',
                        'zqmingti_info': '锁定技，防止你受到的无属性伤害，你的手牌上限为你的体力上限。',
                        zqguiwang: '鬼王',
                        'zqguiwang_info': '其他角色死亡前，你可以令其减少1点体力上限并获得技能【阴兵】，直到其体力值大于0或者你死亡。拥有【阴兵】的角色回合即将开始时，此回合改为由你操控。',
                        zqguiwang_mark: '鬼王',
                        'zqguiwang1': '鬼王',
                        //'zqguiwang2':'鬼王',
                        zqyinbing: '阴兵',
                        'zqyinbing_info': '锁定技，你不进入濒死状态且不会死亡。你明置身份和武将牌。你始终处于横置状态且非锁定技失效。你在判断游戏结束的条件是否满足时视为已死亡。',
                        'zqyinbing1': '阴兵',
                        'zqyinbing2': '阴兵',
                        'zqyinbing3': '阴兵',//失去技能
                        'zqyinbing_over': '阴兵',
                        //'zqyinbing_die':'体力',
                        zqhuanhua: '幻化',
                        'zqhuanhua_info': '当你成为【杀】或【决斗】的目标时，你可以选择一项：<b>①</b>令此牌有一半的概率对你无效；<b>②</b>选择至多两名角色（不能是你和此牌的使用者），将其和你的武将牌洗牌并随机抽取一张，之后将此牌的目标转移给抽到的角色。',
                        zqjinye: '金液',
                        'zqjinye_info': '你受到伤害后，可以选择一名角色，令其一个技能失效至其下个回合结束，在此期间其不能成为此技能的目标。',
                        zqjiuding: '九鼎',
                        'zqjiuding_info': '每轮游戏开始时，若你拥有的<b>限定技</b>少于九个，你随机获得一个未拥有的<b>限定技</b>；否则你获得技能【太清】。',
                        zqtaiqing: '太清',
                        'zqtaiqing_info': '限定技，你死亡前，你可以防止之并将体力回复至上限，之后你复原武将牌，失去所有<b>限定技</b>并视之为未发动过。',
                        zqfengyin: '封印',
                        zqfengyin2: '封印',
                        zqdouhun: '斗魂',
                        'zqdouhun_info': '锁定技，你的手牌上限视为4，体力上限始终为1。你死亡时，防止之并失去此技能，之后你将体力回复至2点。',
                        'zqdouhun0': '斗魂',
                        'zqdouhun1': '斗魂',
                        zqboming: '搏命',
                        'zqboming_info': '锁定技，你濒死时，须选择你或攻击范围内的一名角色，将牌堆顶的一张牌置入其武将牌上，称为「危」。若此牌点数与其他任意一张「危」相同，该角色死亡；若此牌的花色不为♠，你回复至1点体力。',
                        'zqboming1': '搏命',
                        zqjiuzhu: '救主',
                        'zqjiuzhu_info': '游戏开始时，你选择一名其他角色，每当其濒死时，你可以弃一张牌并失去1点体力，令其回复至1点体力。',
                        'zqjiuzhu2': '救主',
                        'zqjiuzhu3': '救主',
                        'zqjiuzhu_mark': '救主',
                        zqbinan: '避难',
                        'zqbinan_info': '锁定技，你与其他角色互相计算距离时+3。',
                        zqxiudao: '修道',
                        'zqxiudao_info': '每名角色回合结束后，若你本回合成为过其使用牌的目标，你摸一张牌；否则，若你有未触发的觉醒技，你的手牌上限+1。',
                        zqxiudaox: '修道',
                        zqfeisheng: '飞升',
                        'zqfeisheng_info': '觉醒技，准备阶段，若你的手牌上限不小于7，失去【避难】并获得【仙术】。',
                        zqxianshu: '仙术',
                        'zqxianshu_info': '当一张非虚拟的「基本牌或普通锦囊牌」结算完成后，你可以弃置一张手牌，视为使用一张虚拟的、无距离和次数限制的同名牌。',
                        'zqxianshu_max': '仙术',
                        'zqxianshu_max_info': '你使用牌无距离和次数限制',
                        zqtianma: '天马',
                        'zqtianma_info': '锁定技，其他角色计算与你的距离时+1，你计算与其他角色的距离时-1。游戏刚开始时，你废除坐骑栏。出牌阶段，你可以重铸坐骑牌。',
                        zqtianma_add: '天马',
                        zqxingshan: '行善',
                        'zqxingshan_info': '你的回合开始时，若体力上限大于1，可以减少一点体力上限令场上所有角色各摸一张牌。之后，你从牌堆或弃牌堆中随机获得一张【积德】未记录过牌名的非装备牌。',
                        zqjide: '积德',
                        'zqjide_info': '锁定技，每种牌名限一次，当你使用或打出一张非装备牌时，记录此牌名，然后摸一张牌。',
                        zqzhengdi: '证帝',
                        'zqzhengdi_info': '锁定技，当你【积德】记录的牌名达到18种时，己方阵营获得游戏的胜利。',
                        zqxushi: '蓄势',
                        'zqxushi_info': '当你造成伤害后，获得一个标记「破」。',
                        zqpodi: '破敌',
                        'zqpodi_info': '①你使用牌仅指定一名其他角色为目标后，可以将其至多X张牌扣置于其武将上（X为此牌点数）。若如此做，当前回合结束后，其获得这些牌。②你使用牌对其他角色造成伤害时，若此牌目标数为1，伤害值+「破」的数量。',
                        'zqpodi2': '破敌',
                        'zqpodi3': '破敌',
                        'zqpodi4': '破敌',
                        zqyicheng: '疑城',
                        'zqyicheng_info': '锁定技，回合结束时，若你本回合没有造成过伤害，你将手牌摸至体力上限，并清除武将上除「武将上的牌」和「记录的牌名」以外的所有标记，且直到你的下个回合开始前，你不能成为【杀】的目标。',
                        'zqyicheng2': '疑城',
                        'zqxinlonghun': '龙魂',
                        zqxinlonghun_info: '（天庭优化AI）你可以将你的手牌按下列规则使用或打出：红桃当【桃】，方块当火【杀】，梅花当【闪】，黑桃当【无懈可击】。',
                    },
                };

                //势力属性(共2处，此处单机，另一处联机)
                if (typeof ziqi.func === 'function') ziqi.func();
                if (typeof ziqicard.func === 'function') ziqicard.func();
                //加载武将卡牌
                lib.translate.ziqi = '天庭';
                lib.translate.ziqicard = '天庭卡牌';
                lib.translate['ziqi_character_config'] = '天庭';
                lib.translate['ziqicard_card_config'] = '天庭卡牌';
                //●lib.config.all.characters.push('ziqi');
                lib.config.all.cards.push('ziqicard');
                //if(!lib.config.cards.includes('ziqicard')) lib.config.cards.push('ziqicard');
                if (!lib.config.ziqiCharacters) {
                    lib.config.characters.push('ziqi');
                    game.saveConfig('characters', lib.config.characters);
                    game.saveConfig('ziqiCharacters', 'ziqi');
                }
                game.import('card', function () { return ziqicard });
                game.import('character', function () {
                    { for (var i in ziqi.character) { ziqi.character[i][4].push('die:ext:天庭/audio/die/' + i + '.mp3') } };
                    if (lib.config.extensions.includes('十周年UI') && lib.config['extension_十周年UI_enable'] && lib.config['extension_十周年UI_outcropSkin'] == 'shizhounian') {
                        if (lib.device || lib.node || typeof game.getFileList === "function") { for (var i in ziqi.character) { ziqi.character[i][4].push('ext:天庭/character/characters/' + i + '.jpg') } }
                        else { for (var i in ziqi.character) { ziqi.character[i][4].push('db:extension-天庭/character/characters:' + i + '.jpg') } }
                    } else {
                        if (lib.device || lib.node || typeof game.getFileList === "function") { for (var i in ziqi.character) { ziqi.character[i][4].push('ext:天庭/character/' + i + '.jpg') } }
                        else { for (var i in ziqi.character) { ziqi.character[i][4].push('db:extension-天庭/character:' + i + '.jpg') } }
                    }
                    return ziqi;
                });

                //●●联机同步，客机进入房间后回报缺失素材清单，房主只下发缺失的部分（带进度提示，传完自动刷新显示）
                lib.message.server.zqSyncMissing = function (missing) {
                    if (lib.node && lib.node.observing && lib.node.observing.includes(this)) return; //观战者game.observe不同步素材，共2处
                    if (Array.isArray(missing) && missing.length) {
                        //多个客机同时同步时排队串行执行；配合编码缓存，后到的客机几乎只做发送
                        zqEnqueueSync(this, missing);
                    }
                };

                const _oldServerInit = lib.message.server.init;
                lib.message.server.init = function (version, config, banned_info) {
                    this.send((packs) => {
                        for (const p of packs) {
                            const pack = p;
                            if (typeof pack.func === 'function') pack.func();
                            for (const key in pack) {
                                if (key in lib) lib[key] = Object.assign(lib[key], pack[key]);
                            }
                        }
                    }, [ziqi, ziqicard])
                    //客机进入房间后回报缺失、房主按需下发，图片传完自动刷新显示
                    zqSendSyncList(this).catch(function (e) { console.log('天庭资源同步失败', e); });
                    return _oldServerInit.call(this, version, config, banned_info);
                }
            };
        },
        editable: false,
        help: {}, config: {
            ziqi_jie_info: {
                name: '-----扩展功能(重启生效)-----',
                clear: true,
            },
            zq_tili_fanbei: {
                name: '<font color=\"#FFFF00\">体力翻倍</font>',
                intro: '开启后，所有武将体力上限和体力值翻倍。',
                init: false,
            },
            zqjiubing_mode: {
                name: '<font color=\"#96CAFF\">救兵模式</font>',
                intro: '开启后，所有武将获得技能【救兵】。',
                init: false,
            },
            zq_ai_ak: {
                name: '<font color=\"#ADEAEA\">人机保留AK</font>',
                intro: '开启后，所有武将ai不会丢弃诸葛连弩和马钧强化版诸葛连弩，改善部分武将如高达一号，张春华等弃置AK情况。',
                init: true,
            },
            ziqiCardFileConfig2: {
                'name': '<b><font color=\'#ADEAEA\'>自动导入卡牌素材</font>',
                'init': true,
                'intro': '<font color=\'#ADEAEA\'>开启后将自动检测并导入大将军金卡、武将势力边框、装备区小图标等图片素材</font>',
            },
            zq_close_characters: {
                name: '<b><font color=\"pink\">仅开启天庭武将包',
                intro: '点击关闭其他武将，仅保留天庭扩展的武将',
                init: false,
                onclick: function () {
                    if (lib.config.extension_天庭_zq_close_characters == false) {
                        game.saveConfig('extension_天庭_zq_close_characters', true);
                        game.saveConfig('ziqiCharacters', lib.config.characters);
                        lib.config.characters = ['ziqi'];
                        game.saveConfig('ziqiConnect_characters', lib.config.connect_characters);
                        lib.config.all.characters.remove('ziqi');
                    } else {
                        game.saveConfig('extension_天庭_zq_close_characters', false);
                        if (lib.config.ziqiCharacters) lib.config.characters = lib.config.ziqiCharacters;
                        if (lib.config.ziqiConnect_characters) lib.config.all.characters = lib.config.ziqiConnect_characters;
                        else lib.config.all.characters = ['old', 'diy', 'key'];
                    }
                    game.saveConfig('characters', lib.config.characters);
                    game.saveConfig('connect_characters', lib.config.all.characters);
                    game.reload();
                },
            },
            zqchuangshiNumx: {
                name: '<font color=\"#99FF75\">盘古创世最大牌数(人机减半)</font>',
                init: '80',
                item: {
                    30: '<font color=\"#99FF75\">30张</font>',
                    40: '<font color=\"#99FF75\">40张</font>',
                    50: '<font color=\"#99FF75\">50张</font>',
                    60: '<font color=\"#99FF75\">60张</font>',
                    80: '<font color=\"#99FF75\">80张</font>',
                    100: '<font color=\"#99FF75\">100张</font>',
                    160: '<font color=\"#99FF75\">160张</font>',
                },
            },
            /*ziqiCardFileConfig:{
                name: '<div><button id="ziqiCardFileConfig" onclick="ziqi.ziqiCardFileConfig()">★一键导入大将军金卡素材</button> </div>' + '<br><font color=\'#FFFF00\'>★导入大将军金卡、武将势力边框、装备区小图标等图片素材，需要安装十周年UI等相关扩展并开启卡牌美化功能</font><br>',
                clear: true,
            },*/
        }, package: {
            intro: '●本扩展武将可以联机时使用。●123网盘中有卡图可以彩印。<br>查看《天庭》武将包请前往武将列表最下方。<br>' + '<img style=width:225px src=' + lib.assetURL + 'extension/天庭/image/images/123.jpg>' + '<img style=width:225px src=' + lib.assetURL + 'extension/天庭/image/images/quake.jpg>' + '<br>功能介绍：<br>1.<font color=\"#FFFF00\">【体力翻倍】</font>：所有武将的体力值和体力上限翻倍。<br>2.<font color=\"#96CAFF\">【救兵模式】</font>：所有武将获得技能<font color=\"#96CAFF\">【救兵】</font>：锁定技，当你受到伤害后，随机从一张未加入游戏的同势力武将牌上选择一个你未拥有的技能并获得。你以此法获得的技能在发动一次后失去。(若武将牌均暗置，或势力不是<font color=\"#96CAFF\">[魏/蜀/吴/群/晋]</font>之一，则随机获得。)<br>3.<font color=\"#ADEAEA\">【保留AK】</font>：人机不会丢弃诸葛连弩，并优化高达一号AI。',
            author: "<img style='width:30px; height:28px;' src='extension/天庭/ziqi.png'> <font color=\'#FFFF00\'> 子琪</font><br>版本：v2.4.1<br>BUG反馈：QQ1198857570",
            diskURL: '',
            forumURL: '',
            version: '',
        }, files: { 'character': [/*'zq_nezha.jpg'*/], 'card': [], 'skill': [] }, connect: true
    }
}