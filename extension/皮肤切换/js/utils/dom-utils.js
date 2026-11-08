export function isHide(dom) {
    return [...dom.classList].includes('hidden-adjust')
}

export function hide(dom) {
    if (![...dom.classList].includes('hidden-adjust')) {
        dom.classList.add('hidden-adjust')
    }
}

export function show(dom) {
    if ([...dom.classList].includes('hidden-adjust')) {
        dom.classList.remove('hidden-adjust')
    }
}

export function toggleShow(dom, onShowCallback, onHideCallback) {
    if ([...dom.classList].includes('hidden-adjust')) {
        dom.classList.remove('hidden-adjust')
        if (onShowCallback) onShowCallback()
    } else {
        dom.classList.add('hidden-adjust')
        if (onHideCallback) onHideCallback()
    }
}

