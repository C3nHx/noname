import { getDefaultExportFromCjs } from "./_commonjsHelpers.js";
import { __require as requireLib } from "../node_modules/.pnpm/jszip@2.7.0/node_modules/jszip/lib/index.js";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var libExports = requireLib();
const JSZip = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
const index = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: JSZip
}, [libExports]);
export {
  JSZip as default,
  index as i
};
