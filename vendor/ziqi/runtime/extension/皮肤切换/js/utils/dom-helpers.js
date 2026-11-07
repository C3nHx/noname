export function createDomHelpers() {
    return {
        refreshDomList: function (domList, activeClass, activeItem) {
            for (let dom of domList) {
                if (dom === activeItem) {
                    dom.classList.add(activeClass)
                } else {
                    dom.classList.remove(activeClass)
                }
            }
        }
    };
}

