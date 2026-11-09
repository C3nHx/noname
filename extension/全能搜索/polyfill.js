if (!("scrollBehavior" in document.documentElement.style)) {
	const Element = window.HTMLElement || window.Element;
	Object.defineProperty(Element.prototype, "scrollTo", {
		enumerable: false,
		configurable: true,
		writable: true,
		value: function () {
			let left = 0;
			let top = 0;
			if (arguments.length > 1) {
				left = arguments[0];
				top = arguments[1];
			} else {
				left = arguments[0].left;
				top = arguments[0].top;
			}
			this.scrollLeft = left;
			this.scrollTop = top;
		},
	});
}

if (!("includes" in Array.prototype)) {
	Object.defineProperty(Array.prototype, "includes", {
		enumerable: false,
		configurable: true,
		writable: true,
		value: function (searchElement, fromIndex) {
			if (this == null) {
				throw new TypeError('"this" is null or not defined');
			}
			var o = Object(this);
			var len = o.length >>> 0;
			if (len === 0) {
				return false;
			}
			var n = fromIndex | 0;
			var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
			while (k < len) {
				if (o[k] === searchElement) {
					return true;
				}
				k++;
			}
			return false;
		},
	});
}

if (!("allSettled" in Promise)) {
	Object.defineProperty(Promise, "allSettled", {
		enumerable: false,
		configurable: true,
		writable: true,
		value: function (arr) {
			var P = this;
			return new P(function (resolve, reject) {
				if (Object.prototype.toString.call(arr) !== "[object Array]") {
					return reject(
						new TypeError(
							typeof arr +
								" " +
								arr +
								" " +
								" is not iterable(cannot read property Symbol(Symbol.iterator))"
						)
					);
				}
				var args = Array.prototype.slice.call(arr);
				if (args.length === 0) return resolve([]);
				var arrCount = args.length;

				function resolvePromise(index, value) {
					if (typeof value === "object") {
						var then = value.then;
						if (typeof then === "function") {
							then.call(
								value,
								function (val) {
									args[index] = {
										status: "fulfilled",
										value: val,
									};
									if (--arrCount === 0) {
										resolve(args);
									}
								},
								function (e) {
									args[index] = {
										status: "rejected",
										reason: e,
									};
									if (--arrCount === 0) {
										resolve(args);
									}
								}
							);
						}
					}
				}

				for (var i = 0; i < args.length; i++) {
					resolvePromise(i, args[i]);
				}
			});
		},
	});
}

if (!String.prototype.matchAll) {
	Object.defineProperty(String.prototype, "matchAll", {
		enumerable: false,
		configurable: true,
		writable: true,
		value: function (regex) {
			if (typeof regex === "string") {
				regex = new RegExp(regex, "g");
			} else if (!regex.global) {
				throw new Error(
					"The provided regular expression must have the 'g' flag."
				);
			}

			let matches = [];
			let match;

			while ((match = regex.exec(this)) !== null) {
				matches.push(match[0]);
			}

			return matches;
		},
	});
}
