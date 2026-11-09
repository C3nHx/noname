export function l2dInit(skinSwitch) {
    skinSwitch.waitUntil(() => {
        return window.decadeModule
    },
        skinSwitch.overrideExtL2dMenuItem)
}

