// 引入全局api描述

/**
 * @typedef { {name?: string, fileName?: string, documentation?: string, type?: string, constructors?: DocEntry[], parameters?: DocEntry[], returnType?: string, instanceMembers?: DocEntry[], staticMembers?: DocEntry[]} } DocEntry
 */

import "../../game/typescript.js";
import { lib, game } from "../../noname.js";
/**
 * @type { import("typescript") }
 */
const ts = globalThis.ts;

/**
 * @type { SMap<string> }
 */
const files = {};

/**
 * Generate documentation for all classes in a set of .ts files
 * @param { string[] } fileNames
 * @param { import("typescript").CompilerOptions } options
 */
function generateDocumentation(fileNames, options) {
	const host = ts.createCompilerHost(options);
	host.readFile = (fileNameToRead) => {
		// console.log('host.readFile', fileNameToRead);
		if (fileNameToRead.includes("electron.asar/renderer/")) {
			fileNameToRead =
				"node_modules/typescript/lib/" +
				fileNameToRead.slice(
					fileNameToRead.indexOf("electron.asar/renderer/") + 23
				);
		}
		// console.log("host.readFile", fileNameToRead);
		return files[fileNameToRead];
	};
	host.writeFile = (fileName, contents) => (files[fileName] = contents);

	// Build a program using the set of root file names in fileNames
	let program = ts.createProgram(fileNames, options, host);

	// Get the checker, we will use it to find more about classes
	let checker = program.getTypeChecker();
	/**
	 * @type { DocEntry[]  }
	 */
	let output = [];

	// Visit every sourceFile in the program
	for (const sourceFile of program.getSourceFiles()) {
		if (!sourceFile.isDeclarationFile) {
			// Walk the tree to search for classes
			ts.forEachChild(sourceFile, visit);
		}
	}

	// print out the doc
	// console.log(output);
	return output;

	/**
	 * visit nodes finding exported classes
	 * @param { import("typescript").Node } node
	 */
	function visit(node) {
		// Only consider exported nodes
		if (!isNodeExported(node)) {
			return;
		}

		if (ts.isClassDeclaration(node) && node.name) {
			// This is a top level class, get its symbol
			let symbol = checker.getSymbolAtLocation(node.name);
			if (symbol) {
				output.push(serializeClass(symbol));
			}
			// No need to walk any further, class expressions/inner declarations
			// cannot be exported
		} else if (ts.isModuleDeclaration(node)) {
			// This is a namespace, visit its children
			ts.forEachChild(node, visit);
		}
	}

	/**
	 * Serialize a symbol into a json object
	 * @param { import("typescript").Symbol } symbol
	 * @returns { DocEntry }
	 */
	function serializeSymbol(symbol) {
		return {
			name: symbol.getName(),
			documentation: ts.displayPartsToString(
				symbol.getDocumentationComment(checker)
			),
			type: checker.typeToString(
				checker.getTypeOfSymbolAtLocation(
					symbol,
					symbol.valueDeclaration
				)
			),
		};
	}

	/**
	 * Serialize a class symbol information
	 * @param { import("typescript").Symbol } symbol
	 */
	function serializeClass(symbol) {
		let details = serializeSymbol(symbol);

		// 获取类声明节点
		const classDecl = symbol.valueDeclaration; // as ts.ClassDeclaration | undefined;
		if (!classDecl) return details; // 如果找不到类声明，则直接返回

		// 分别处理实例成员和静态成员
		details.instanceMembers = getClassMembers(
			classDecl,
			/*isStatic*/ false
		);
		details.staticMembers = getClassMembers(classDecl, /*isStatic*/ true);

		// Get the construct signatures
		let constructorType = checker.getTypeOfSymbolAtLocation(
			symbol,
			symbol.valueDeclaration
		);
		details.constructors = constructorType
			.getConstructSignatures()
			.map(serializeSignature);
		return details;
	}

	/**
	 * @param { import("typescript").ClassDeclaration } classDecl
	 * @param { boolean} isStatic
	 */
	function getClassMembers(classDecl, isStatic) {
		/**
		 * @type { DocEntry[] }
		 */
		const members = [];

		for (const member of classDecl.members) {
			if (
				(isStatic &&
					ts.isPropertyDeclaration(member) &&
					member.modifiers?.some(
						(mod) => mod.kind === ts.SyntaxKind.StaticKeyword
					)) ||
				(!isStatic &&
					(ts.isPropertyDeclaration(member) ||
						ts.isMethodDeclaration(member)))
			) {
				const symbol = checker.getSymbolAtLocation(member.name);
				if (symbol) {
					/**
					 * @type { DocEntry[] }
					 */
					const memberDetail = {
						name: symbol.getName(),
						documentation: ts.displayPartsToString(
							symbol.getDocumentationComment(checker)
						),
					};

					if (ts.isPropertyDeclaration(member)) {
						memberDetail.type = checker.typeToString(
							checker.getTypeOfSymbolAtLocation(symbol, member)
						);
					} else if (ts.isMethodDeclaration(member)) {
						/**
						 * @type { import("typescript").Signature }
						 */
						const signature =
							checker.getSignatureFromDeclaration(member);
						memberDetail.type = checker.typeToString(
							signature.getReturnType()
						);
						memberDetail.parameters = signature.parameters.map(
							(p) => ({
								name: p.getName(),
								type: checker.typeToString(
									checker.getTypeOfSymbolAtLocation(
										p,
										p.valueDeclaration
									)
								),
								documentation: ts.displayPartsToString(
									p.getDocumentationComment(checker)
								),
							})
						);
					}

					members.push(memberDetail);
				}
			}
		}

		return members;
	}

	/**
	 * Serialize a signature (call or construct)
	 * @param { import("typescript").Signature } signature
	 */
	function serializeSignature(signature) {
		return {
			parameters: signature.parameters.map(serializeSymbol),
			returnType: checker.typeToString(signature.getReturnType()),
			documentation: ts.displayPartsToString(
				signature.getDocumentationComment(checker)
			),
		};
	}

	/**
	 * True if this is visible outside this file, false otherwise
	 * @param { import("typescript").Node } node
	 * @returns { boolean }
	 */
	function isNodeExported(node) {
		return (
			(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !==
				0 ||
			(!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
		);
	}
}

/**
 * 获取某一目录下的所有文件
 *
 * @author Rintim
 * @param dir 要遍历的目录（请勿使用..表示上级目录）
 * @param includeFolder 结果是否包含目录本身
 * @param depth 遍历的层数
 * @returns {Promise<string[]>}
 */
const traverseFolder = function (dir, includeFolder = false, depth = Infinity) {
	if (typeof dir == "undefined")
		throw new Error("You must give a Directory path");
	if (/\.\./.test(dir)) throw new Error('Cannot parse ".." in Noname');
	if (!/^.+\/$/.test(dir)) dir = dir + "/";
	if (typeof includeFolder == "undefined") includeFolder = false;
	if (typeof depth != "number") depth = Infinity;

	if (depth <= 0) return Promise.resolve([]);

	/**
	 * 遍历用到的递归函数
	 *
	 * @param {string[]} result - 储存各文件的数组
	 * @param {string[]} records - 记录层级的数组
	 * @param {Function} resolve - Promise的resolve函数
	 */
	function content(result, records, resolve) {
		game.getFileList(dir + records.join("/"), (folders, files) => {
			// 或许只有能被读取的目录才算是目录
			if (includeFolder && records.length) result.add(records.join("/"));

			for (const file of files) {
				result.add(records.concat(file).join("/"));
			}

			let promises = new Array();
			// @ts-ignore
			if (records.length + 1 < depth)
				for (const folder of folders)
					promises.add(
						new Promise((resolve) =>
							content(result, records.concat(folder), resolve)
						)
					);

			Promise.all(promises).then(() => resolve(result));
		}, () => {
			resolve(result);
		});
	}

	return new Promise((resolve) => {
		content([], [], resolve);
	});
};

export const init = async () => {
	const batchSize = 10; // 每次处理的文件数量
	let processedCount = 0; // 已处理文件的数量
	let allResults = []; // 存储所有的文件读取结果

	// 读取noname文件夹下的文件
	const nonamePromises = (await traverseFolder("noname", false)).map(
		async (path) => {
			const fullPath = `noname/${path}`;
			return game.promises
				.readFileAsText(fullPath)
				.then((content) => [fullPath, content]);
		}
	);

	// 读取类型定义文件夹下的文件
	const nonameTypingsPromises = (
		await traverseFolder("node_modules/@types/noname-typings", false)
	).map(async (path) => {
		return game.promises
			.readFileAsText(`node_modules/@types/noname-typings/${path}`)
			.then((content) => {
				return [`node_modules/noname-typings/${path}`, content];
			});
	});

	const allPromises = [...nonamePromises, ...nonameTypingsPromises];

	const { promise, resolve, reject } = Promise.withResolvers();

	async function processNextBatch(promises) {
		try {
			const batchPromises = promises.slice(
				processedCount,
				processedCount + batchSize
			);
			const results = await Promise.all(batchPromises);
			allResults = allResults.concat(results);
			processedCount += batchSize;

			if (processedCount < promises.length) {
				// 如果还有文件未处理，则请求下一帧继续处理
				requestAnimationFrame(() => processNextBatch(promises));
			} else {
				// 所有文件都处理完毕
				return handleAllResults();
			}
		} catch (error) {
			console.error("Error processing file batch:", error);
			reject(error);
		}
	}

	async function handleAllResults() {
		// 将结果存储到 files 对象中
		const nonameContent = await game.promises.readFileAsText("noname.js");
		let root = "";
		if (globalThis.require && globalThis.__dirname) {
			const path = require("path");
			root = path.join(__dirname, "./").replace(/\\/g, "/");
		} else if (lib.assetURL.length > 0) {
			root = lib.assetURL;
		}
		files[`${root}noname.js`] = nonameContent;
		allResults.forEach(([path, content]) => {
			// if (path.startsWith("node_modules/noname-typings/nonameModules/")) {
			// 	files[`${root}${path.slice(42)}`] = content;
			// }
			files[`${root}${path}`] = content;
		});

		const outPut = generateDocumentation(Object.keys(files), {
			typeRoots: [`${root}node_modules/noname-typings`],
			types: [`${root}node_modules/noname-typings/index.d.ts`],
			allowJs: true,
			module: ts.ModuleKind.ES2015,
			target: ts.ScriptTarget.ES2020,
			inlineSourceMap: true,
			resolveJsonModule: true,
			esModuleInterop: true,
			declaration: true,
			emitDeclarationOnly: true,
		});
		resolve(outPut);
		// console.log(outPut);
		// console.log(files);
	}

	// 开始处理第一批文件
	processNextBatch(allPromises);
	return promise;
};