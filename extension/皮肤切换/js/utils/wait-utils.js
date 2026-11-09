export function createWaitUtils() {
    return {
        waitUntil: function (conditionFunc, execFunc) {
            if (conditionFunc()) {
                execFunc()
            } else {
                requestAnimationFrame(() => {
                    skinSwitch.waitUntil(conditionFunc, execFunc)
                })
            }
        }
    };
}

