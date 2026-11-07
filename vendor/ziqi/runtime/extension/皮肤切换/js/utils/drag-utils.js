export function createDragUtils(lib) {
    return {
        initEditBoxDrag: function (editBox, dragHandle) {
            if (!editBox || !dragHandle) return;

            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialLeft = 0;
            let initialTop = 0;
            const downEvent = lib.config.touchscreen ? 'touchstart' : 'mousedown';
            const moveEvent = lib.config.touchscreen ? 'touchmove' : 'mousemove';
            const upEvent = lib.config.touchscreen ? 'touchend' : 'mouseup';
            const getEventCoords = (e) => {
                if (e.touches && e.touches.length > 0) {
                    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
                return { x: e.clientX, y: e.clientY };
            };
            const startDrag = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                const coords = getEventCoords(e);
                startX = coords.x;
                startY = coords.y;
                const rect = editBox.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                editBox.classList.add('dragging');
                editBox.style.position = 'fixed';
                editBox.style.left = initialLeft + 'px';
                editBox.style.top = initialTop + 'px';
                editBox.style.transform = 'none';
                document.addEventListener(moveEvent, handleDrag, { passive: false });
                document.addEventListener(upEvent, stopDrag);
            };

            const handleDrag = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const coords = getEventCoords(e);
                const deltaX = coords.x - startX;
                const deltaY = coords.y - startY;
                const newLeft = initialLeft + deltaX;
                const newTop = initialTop + deltaY;
                const maxLeft = window.innerWidth - editBox.offsetWidth;
                const maxTop = window.innerHeight - editBox.offsetHeight;

                const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
                const constrainedTop = Math.max(0, Math.min(newTop, maxTop));

                editBox.style.left = constrainedLeft + 'px';
                editBox.style.top = constrainedTop + 'px';
            };
            const stopDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                editBox.classList.remove('dragging');
                document.removeEventListener(moveEvent, handleDrag);
                document.removeEventListener(upEvent, stopDrag);
            };
            const resetPosition = () => {
                editBox.style.position = '';
                editBox.style.left = '';
                editBox.style.top = '';
                editBox.style.transform = '';
            };

            dragHandle.addEventListener(downEvent, startDrag);
            let clickCount = 0;
            dragHandle.addEventListener('click', (e) => {
                e.stopPropagation();
                clickCount++;
                setTimeout(() => {
                    if (clickCount === 2) {
                        resetPosition();
                    }
                    clickCount = 0;
                }, 300);
            });
        }
    };
}

