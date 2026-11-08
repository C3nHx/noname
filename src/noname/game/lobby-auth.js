/** @type {Map<string, string>} */
const passwords = new Map();
const storageKey = address => `noname:lobby-password:${address}`;

export function readLobbyPassword(address) {
	try {
		return passwords.get(address) ?? sessionStorage.getItem(storageKey(address)) ?? "";
	} catch {
		return passwords.get(address) ?? "";
	}
}

export function rememberLobbyPassword(address, password) {
	passwords.set(address, password);
	try {
		sessionStorage.setItem(storageKey(address), password);
	} catch {}
}

export function forgetLobbyPassword(address) {
	passwords.delete(address);
	try {
		sessionStorage.removeItem(storageKey(address));
	} catch {}
}
