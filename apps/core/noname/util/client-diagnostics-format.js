export const diagnosticContextKeys = Object.freeze(["version", "commit", "channel", "platform", "userAgent", "mode", "resourceMode", "buildId", "event", "step", "parentEvent", "skill", "card", "extensions", "line", "column", "element", "path", "extension", "package"]);

export function diagnosticText(value, limit = 2000) {
	return String(value ?? "")
		.replace(/\b(?:data|blob):[^\s<>"']+/gi, "[embedded URL]")
		.replace(/\b(?:https?|wss?|file):\/\/[^\s<>"']+/gi, address => {
			try {
				const url = new URL(address);
				url.username = "";
				url.password = "";
				url.search = "";
				url.hash = "";
				return url.href;
			} catch {
				return "[URL]";
			}
		})
		.replace(/([?&](?:[^=\s&]+)=)[^\s&#]*/g, "$1[redacted]")
		.replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/gi, "[redacted credential]")
		.replace(/\b(password|authorization|secret|token|key)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
		.slice(0, limit);
}
