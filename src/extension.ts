import * as vscode from 'vscode';

// Called once when extension is activated
export function activate(context: vscode.ExtensionContext) {
	const cleanEditor = ((textEditor: vscode.TextEditor | undefined) => {
		if (textEditor === undefined) {return;};
		const fileNameLength = textEditor.document.fileName.length;
		if (textEditor.document.fileName.slice(fileNameLength-3, fileNameLength) !== ".NC") {return;}

		const textRange = textEditor.document.validateRange(new vscode.Range(0, 0, textEditor.document.lineCount, 99999999999999999999999));

		// Replace/remove the static matches
		let cleanText = textEditor.document.getText()
		.replace(/\r\n/g, "\n")
		.replace(new RegExp('N\\d+\\s', "g"), "")
		.replace(new RegExp(`A0\\.\\s?`, "g"), "")
		.replace(new RegExp(`G49`, "g"), "")
		.replace(new RegExp(`G0 Z25.\nM5\nG91 G28 Z0. M9\n\nM01`, "g"), "G0 Z200. M9\nM5\nM01\n")
		.replace(new RegExp(`M5\nG91 G28 Z0. M9\n\nM01`, "g"), 			"G0 Z200. M9\nM5\nM01\n")
		.replace(new RegExp(`G0 Z25.\nM5\nG91 G28 Z0. M9\nG28 X0. Y0.\\s?\nM30\n%`, "g"), 	"G0 Z200. M9\nM5\nG91 G28 Y0.\nM30\n%")
		.replace(new RegExp(`M5\nG91 G28 Z0. M9\nG28 X0. Y0.\\s?\nM30\n%`, "g"), 				"G0 Z200. M9\nM5\nG91 G28 Y0.\nM30\n%")
		.replace(new RegExp(`M5\nG91 G28 Z0.\nG28 X0. Y0.\\s?\nM30\n%`, "g"), 					"G0 Z200. M9\nM5\nG91 G28 Y0.\nM30\n%");

		const toolMatch = new RegExp(`\\( T\\d+ \\| .* \\|`, "g");

		// Postfix the names of each tool using the tools at the top of the file
		let match: null | RegExpMatchArray = null;

		// For each tool found at the top of the top of the file.
		while ((match = toolMatch.exec(cleanText)) !== null) {
			if (match.index === toolMatch.lastIndex) {toolMatch.lastIndex++;}

			// Replace every instance of `TID M6` with `TID M6 (NAME)`
			const toolID = match[0].slice(2, match[0].indexOf(" |"));
			const toolName = match[0].slice(match[0].indexOf("| ")+2, match[0].lastIndexOf(" |"));
			cleanText = cleanText.replace(new RegExp(`${toolID} M6\n`, "g"), `${toolID} M6 (${toolName})\n`);
		}

		// For each tool change lookup what the next tool to be used is and add it below.
		const toolLookaheadMatch = new RegExp(`(T\\d+ M6 .*\n)(?!(T\\d+))`, "g"); // Regex for finding tools that have not got a tool load set below it
		const nextToolMatch = new RegExp(`T\\d+ M6`, "g"); // Regex to find the next tool that is used

		// Add next tools
		match = null;
		// Store the first tool used here so it can be appended to the end of the file
		let firstTool: undefined | string = undefined;

		// For each tool that doesnt have a lookahead set
		while ((match = toolLookaheadMatch.exec(cleanText)) !== null) {
			if (firstTool === undefined) {
				// If this is the first tool store it
				firstTool = (match[0].match(/T\d+/g)||"")[0];
			}
			if (match.index === toolLookaheadMatch.lastIndex) {toolLookaheadMatch.lastIndex++;}

			// Set the nextToolMatch lastIndex to the current tools lastIndex so it searches for tools after the current one. Thus finding the next tool
			nextToolMatch.lastIndex = toolLookaheadMatch.lastIndex;
			let nextTool: RegExpMatchArray | string[] | null = nextToolMatch.exec(cleanText);

			if (nextTool === null) {
				// If nextTool is null then we are at the end of the file, set the nextTool to be equal to the firstTool
				nextTool = [`${firstTool} M6`];
			}

			// The new tool string is the old one with a newline behind it plus the lookahead tool
			const newStr = `\n${match[0]}${nextTool[0].replace(" M6", "")}\n`;
			// Find the instance of this tool which does not have a lookahead set (to account for multiple uses of the same tool)
			const replaceRegex = new RegExp(`${match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!(T\d+))`, "g");
			cleanText = cleanText.replace(replaceRegex, newStr);
		}

		if (cleanText !== textEditor.document.getText().replace(/\r\n/g, "\n")) {
			textEditor.edit(editor => {
				editor.replace(
					textRange, 
					cleanText
				);
			});
			vscode.window.showInformationMessage(`Cleaned "${textEditor?.document.fileName.split(new RegExp("//|\\\\")).slice(-1).pop()}"...`);
		}
	});
	vscode.window.visibleTextEditors.forEach(cleanEditor);
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(cleanEditor));
}

// this method is called when your extension is deactivated
export function deactivate() {}
