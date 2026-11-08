export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

export function throttle(fn, delay) {
    let timer = null;
    return function (...args) {
        if (!timer) {
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null;
            }, delay);
        }
    };
}

export function isMobile() {
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|OperaMini/i.test(navigator.userAgent));
}

export function getEventCoords(e) {
    if (e.touches && e.touches.length) {
        return {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    }
    return {
        x: e.clientX,
        y: e.clientY
    };
}

export function formatParams(obj, indent = '\t') {
    if (obj === null) return 'null'
    if (typeof obj !== 'object') {
        if (typeof obj === 'string') return `"${obj}"`
        return String(obj)
    }
    if (Array.isArray(obj)) {
        return `[${obj.join(', ')}]`
    }
    
    const keys = Object.keys(obj)
    if (keys.length === 0) return '{}'
    
    const propOrder = ['x', 'y', 'angle', 'scale', 'name', 'action', 'speed', 'shizhounian', 'gongji', 'teshu', 'chuchang', 'beijing', 'qianjing', 'qhlx']
    keys.sort((a, b) => {
        const aIndex = propOrder.indexOf(a)
        const bIndex = propOrder.indexOf(b)
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return a.localeCompare(b)
    })
    
    const lines = ['{']
    keys.forEach((key, index) => {
        const value = obj[key]
        const isLast = index === keys.length - 1
        const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
        const nextIndent = indent + '\t'
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            lines.push(`${indent}\t${keyStr}: ${formatParams(value, nextIndent)}${isLast ? '' : ','}`)
        } else {
            lines.push(`${indent}\t${keyStr}: ${formatParams(value, nextIndent)}${isLast ? '' : ','}`)
        }
    })
    lines.push(`${indent}}`)
    return lines.join('\n')
}

