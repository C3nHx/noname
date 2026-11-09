import { lib, _status } from "../../../noname.js";

/*
 * 卡槽手势隔离：
 * 在美化框的卡槽内左右滑动时，不再触发无名杀本体的「左右滑动」手势；
 * 上下滑动保持原样（不拦截）。只清掉本体的滑动起点，不阻止事件冒泡，
 * 因此卡牌点击、横向滚动等原有交互不受影响。
 */
const SLOT_SELECTOR = [
	"#shunshouDialog .hArea",
	"#shunshouDialog .eArea",
	"#shunshouDialog .jArea",
	"#shunshouDialog .buttons",
	"#ss-poxi .ss-area",
	"#ss-deckmove .ss-area",
	".ss-wugu .buttons",
	"#compare-dialog .compare-area",
	".dialog .buttons",
].join(",");

export function installSwipeGuard() {
	if (window.__ssSwipeGuard) return;
	window.__ssSwipeGuard = true;

	let startX = 0;
	let startY = 0;
	let tracking = false;
	let horizontal = false;

	const clearOrigin = function () {
		try {
			if (_status._swipeorigin) delete _status._swipeorigin;
		} catch (e) {}
	};

	document.addEventListener(
		"touchstart",
		function (e) {
			tracking = false;
			horizontal = false;
			try {
				if (!lib.config || !lib.config.swipe) return;
				if (!e.touches || e.touches.length !== 1) return;
				const t = e.target;
				if (!t || !t.closest || !t.closest(SLOT_SELECTOR)) return;
				startX = e.touches[0].clientX;
				startY = e.touches[0].clientY;
				tracking = true;
			} catch (err) {}
		},
		true
	);

	document.addEventListener(
		"touchmove",
		function (e) {
			if (!tracking || horizontal) return;
			try {
				if (!e.touches || !e.touches[0]) return;
				const adx = Math.abs(e.touches[0].clientX - startX);
				const ady = Math.abs(e.touches[0].clientY - startY);
				//●以横向为主：清掉本体的滑动起点，touchend 时就不会判定为左右滑
				if (adx >= 12 && adx > ady) {
					horizontal = true;
					clearOrigin();
				}
			} catch (err) {}
		},
		true
	);

	const end = function (e) {
		//●极快的甩动可能没有 touchmove：用结束点补判一次
		if (tracking && !horizontal) {
			try {
				const t = e.changedTouches && e.changedTouches[0];
				if (t) {
					const adx = Math.abs(t.clientX - startX);
					const ady = Math.abs(t.clientY - startY);
					if (adx >= 12 && adx > ady) horizontal = true;
				}
			} catch (err) {}
		}
		if (horizontal) clearOrigin();
		tracking = false;
		horizontal = false;
	};
	document.addEventListener("touchend", end, true);
	document.addEventListener("touchcancel", end, true);
}
