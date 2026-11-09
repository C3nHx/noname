export function createTouchUtils(lib, ui, _status) {
    return {
        allowTouchEvent: function (status) {
            let thunderForbidTouch = function () {
                _status.th_swipe_up = lib.config.swipe_up;
                lib.config.swipe_up = ''
                _status.th_swipe_down = lib.config.swipe_down;
                lib.config.swipe_down = ''
                _status.th_swipe_left = lib.config.swipe_left;
                lib.config.swipe_left = ''
                _status.th_swipe_right = lib.config.swipe_right;
                lib.config.swipe_right = ''
                _status.th_gamePause = ui.click.pause
                ui.click.pause = () => { }
            }

            let thunderAllowTouch = function () {
                if (_status.th_swipe_up) {
                    lib.config.swipe_up = _status.th_swipe_up
                    lib.config.swipe_down = _status.th_swipe_down
                    lib.config.swipe_left = _status.th_swipe_left
                    lib.config.swipe_right = _status.th_swipe_right
                    ui.click.pause = _status.th_gamePause
                }
            }
            if (status) {
                thunderAllowTouch()
            } else {
                thunderForbidTouch()
            }
        }
    };
}

