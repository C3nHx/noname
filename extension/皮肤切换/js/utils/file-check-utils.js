export function createFileCheckUtils(game, skinSwitch) {
    return {
        qhly_checkFileExist: function (path, callback) {
            //●电脑端纯浏览器里 lib.node.fs 为 undefined, 有 node fs 就走 game.checkFile(读盘), 否则退化为浏览器 HEAD 探测 (URL = lib.assetURL + path, 与 game.playAudio 最终解析一致)。
            try {
                if (lib.node && lib.node.fs && typeof lib.node.fs.existsSync === 'function') {
                    game.checkFile(path, (result) => callback(result === 0 || result === 1));
                    return;
                }
            } catch (e) {}
            try {
                var url = lib.assetURL + (path && path.charAt(0) === '/' ? path.slice(1) : path);
                var xhr = new XMLHttpRequest();
                xhr.open('HEAD', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        callback(xhr.status >= 200 && xhr.status < 400);
                    }
                };
                xhr.onerror = function () { callback(false); };
                xhr.send();
            } catch (e2) {
                callback(false);
            }
        },
        checkFilesExistAndReturnOne: function (paths, callback) {
            let tryCheck = (index) => {
                if (index >= paths.length) return callback(null)
                skinSwitch.qhly_checkFileExist(paths[index], (exists) => {
                    if (exists) return callback(paths[index])
                    tryCheck(index + 1)
                })
            }
            tryCheck(0)
        },
        isMobile: function () {
            return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|OperaMini/i.test(navigator.userAgent));
        },
    }
}

