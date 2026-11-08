const passwords = /* @__PURE__ */ new Map();
const storageKey = (address) => `noname:lobby-password:${address}`;
function readLobbyPassword(address) {
  try {
    return passwords.get(address) ?? sessionStorage.getItem(storageKey(address)) ?? "";
  } catch {
    return passwords.get(address) ?? "";
  }
}
function rememberLobbyPassword(address, password) {
  passwords.set(address, password);
  try {
    sessionStorage.setItem(storageKey(address), password);
  } catch {
  }
}
function forgetLobbyPassword(address) {
  passwords.delete(address);
  try {
    sessionStorage.removeItem(storageKey(address));
  } catch {
  }
}
export {
  forgetLobbyPassword,
  readLobbyPassword,
  rememberLobbyPassword
};
