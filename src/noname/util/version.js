export function parseVersion(value) {
	const text = String(value).replace(/^v/, "");
	const fork = /^(\d+(?:\.\d+)*)-([a-z][a-z0-9-]*)\.([1-9]\d*)$/i.exec(text);
	if (!fork && !/^\d+(?:[.-]\d+)*$/.test(text)) {
		throw new Error(`Invalid version: ${text}`);
	}
	const parts = (fork ? fork[1] : text).split(/[.-]/).map(Number);
	const revision = fork ? Number(fork[3]) : 0;
	if (parts.some(part => !Number.isSafeInteger(part)) || !Number.isSafeInteger(revision)) {
		throw new Error(`Version component is out of range: ${text}`);
	}
	return { parts, fork: fork ? fork[2].toLowerCase() : null, revision };
}

export function checkVersion(left, right) {
	const first = parseVersion(left);
	const second = parseVersion(right);
	for (let index = 0; index < Math.max(first.parts.length, second.parts.length); index++) {
		const difference = (first.parts[index] ?? 0) - (second.parts[index] ?? 0);
		if (difference) return difference > 0 ? 1 : -1;
	}
	if (first.fork && second.fork && first.fork !== second.fork) {
		throw new Error("Cannot compare revisions from different forks");
	}
	return first.revision === second.revision ? 0 : first.revision > second.revision ? 1 : -1;
}
