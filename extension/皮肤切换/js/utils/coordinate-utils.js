export function createCoordinateUtils(skinSwitch) {
    return {
        getCoordinate: function (domNode, subtr) {
            if (!domNode && !decadeUI) return false;
            var rect = domNode.getBoundingClientRect();
            return {
                x: rect.left,
                y: decadeUI.get.bodySize().height - (subtr ? rect.bottom : 0),
                width: rect.width,
                height: rect.height,
                bodyWidth: decadeUI.get.bodySize().width,
                bodyHeight: decadeUI.get.bodySize().height,
            };
        },
        getDirection: function (dom, sl) {
            var width = document.body.clientWidth / 2;
            var pos = this.getCoordinate(dom, true);
            var isLeft = pos.x >= width ? false : true;
            if (sl) {
                if (isLeft) {
                    return { x: [0, 1.2], y: [0, 0], isLeft: isLeft };
                } else return { x: [0, -0.1], y: [0, 0], isLeft: isLeft };
            } else {
                if (isLeft) {
                    return { x: [0, 0.4], y: [0, 0.5], isLeft: isLeft };
                } else return { x: [0, 0.63], y: [0, 0.5], isLeft: isLeft };
            }
        },
    }
}

