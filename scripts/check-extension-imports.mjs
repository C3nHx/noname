import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ts = createRequire(import.meta.url)("typescript");

export async function checkExtensionImports(root, names) {
	root = path.resolve(root);
	const entries = new Map();
	const visited = new Set();
	const pending = names.map(name => path.join(root, "extension", name, "extension.js"));
	async function checkCase(target) {
		const relative = path.relative(root, target);
		if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Module is outside the deployment: ${target}`);
		let directory = root;
		for (const segment of relative.split(path.sep)) {
			if (!entries.has(directory)) entries.set(directory, new Set(await fs.readdir(directory)));
			if (!entries.get(directory).has(segment)) throw new Error(`Module path does not exist with exact case: ${relative}`);
			directory = path.join(directory, segment);
		}
	}
	while (pending.length) {
		const file = pending.pop();
		if (visited.has(file)) continue;
		await checkCase(file);
		visited.add(file);
		const source = ts.createSourceFile(file, await fs.readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
		for (const node of source.statements) {
			if (!(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) || !node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
			const specifier = node.moduleSpecifier.text;
			if (!specifier.startsWith(".")) continue;
			const target = path.resolve(path.dirname(file), specifier);
			try {
				await checkCase(target);
			} catch (error) {
				throw new Error(`${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${error.message}`);
			}
			if (target.startsWith(path.join(root, "extension") + path.sep) && /\.[cm]?[jt]s$/.test(target)) pending.push(target);
		}
	}
	return visited.size;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	const root = path.resolve(process.argv[2]);
	const config = JSON.parse(await fs.readFile(path.join(root, "game/config.json"), "utf8"));
	console.log("Checked extension module paths:", await checkExtensionImports(root, config.extensions));
}
