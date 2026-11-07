export function createRendererMessage() {
    return {
        rendererOnMessage: {
            dynamicEvents: {},
            onmessage: function (e) {
                let _this = skinSwitch.rendererOnMessage
                let data = e.data

                if (typeof data !== "object") return
                if (data) {
                    let id = data.id
                    let type = data.type
                    if (id in _this.dynamicEvents && type in _this.dynamicEvents[id]) {
                        _this.dynamicEvents[id][type](data)
                    }
                }
            },
            addListener: function (player, type, callback, bind) {
                let id = player.dynamic.id
                let renderer = player.dynamic.renderer
                if (renderer.onmessage !== this.onmessage) {
                    renderer.onmessage = this.onmessage
                }
                if (!(id in this.dynamicEvents)) {
                    this.dynamicEvents[id] = {}
                }
                this.dynamicEvents[id][type] = callback.bind(bind || player)
            }
        }
    };
}

