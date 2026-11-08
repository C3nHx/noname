/** @type {Map<string, string>} */
const passwords = new Map();
const storagePrefix = "noname:lobby-password:";
const storageKey = address => `${storagePrefix}${address}`;
const storageNames = ["localStorage", "sessionStorage"];

export function readLobbyPassword(address) {
	if (passwords.has(address)) return passwords.get(address);
	for (const name of storageNames) {
		try {
			const password = globalThis[name].getItem(storageKey(address));
			if (password !== null) return password;
		} catch {}
	}
	return "";
}

export function rememberLobbyPassword(address, password) {
	passwords.set(address, password);
	for (const name of storageNames) {
		try {
			globalThis[name].setItem(storageKey(address), password);
		} catch {}
	}
}

export function forgetLobbyPassword(address) {
	passwords.delete(address);
	for (const name of storageNames) {
		try {
			globalThis[name].removeItem(storageKey(address));
		} catch {}
	}
}

export function forgetAllLobbyPasswords() {
	passwords.clear();
	for (const name of storageNames) {
		try {
			const storage = globalThis[name];
			for (let i = storage.length - 1; i >= 0; i--) {
				const key = storage.key(i);
				if (key?.startsWith(storagePrefix)) storage.removeItem(key);
			}
		} catch {}
	}
}
