export function initChromeFix() {
    (function () {
        const CHROME_VERSION = (function () {
            const userAgent = navigator.userAgent;
            const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
            return chromeMatch ? parseInt(chromeMatch[1]) : 0;
        })();
        const RECT_KEYS = ['bottom', 'height', 'left', 'right', 'top', 'width', 'x', 'y'];
        const MIN_VERSION = 128;
        const ENHANCED_VERSION = 140;

        function getDocumentZoom() {
            return window.documentZoom || window.devicePixelRatio || 1;
        }
        function parseTransformScale(element) {
            try {
                const computedStyle = window.getComputedStyle(element);
                const transform = computedStyle.transform;

                if (transform && transform !== 'none') {
                    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch && scaleMatch[1]) {
                        const scale = parseFloat(scaleMatch[1]);
                        return isNaN(scale) ? 1 : scale;
                    }
                }
            } catch (error) {
            }
            return 1;
        }
        function createScaledRect(rect, scale) {
            const scaledRect = {};
            RECT_KEYS.forEach(key => {
                scaledRect[key] = rect[key] / scale;
            });
            return scaledRect;
        }
        function createFixedGetBoundingClientRect() {
            const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

            return function getBoundingClientRect() {
                const rect = originalGetBoundingClientRect.call(this);
                const documentZoom = getDocumentZoom();

                if (CHROME_VERSION >= ENHANCED_VERSION) {
                    const transformScale = parseTransformScale(this);
                    const totalScale = documentZoom * transformScale;
                    return createScaledRect(rect, totalScale);
                }

                return createScaledRect(rect, documentZoom);
            };
        }
        if (CHROME_VERSION >= MIN_VERSION) {
            try {
                HTMLElement.prototype.getBoundingClientRect = createFixedGetBoundingClientRect();
            } catch (error) {
            }
        }
    })();
}

