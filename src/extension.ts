import * as vscode from 'vscode';

// Called once when extension is activated
export function activate(context: vscode.ExtensionContext) {
	const cleanEditor = ((textEditor: vscode.TextEditor | undefined) => {
		const startTime = Date.now();
		if (textEditor === undefined) {return;};
		const fileNameLength = textEditor.document.fileName.length;
		if (textEditor.document.fileName.slice(fileNameLength-3, fileNameLength) !== ".NC") {return;}
		// const replacerIndexs: Array<RegExpExecArray | null> = [];
		// for (const replacer of replacers) {
		// 	replacerIndexs.push(replacer[0].exec(documentText));
		// }
		const textRange = textEditor.document.validateRange(new vscode.Range(0, 0, textEditor.document.lineCount, 99999999999999999999999));

		const nl = `(\r\n?|\n)`;

		const toolMatch = new RegExp(`\\( T\\d+ \\| .* \\|`, "g");

		let cleanText = textEditor.document.getText()
		.replace(new RegExp('N\\d+\\s', "g"), "")
		.replace(new RegExp(`A0\\.`, "g"), "")
		.replace(new RegExp(` G48 `, "g"), "")
		.replace(new RegExp(`G0 Z25.${nl}M5${nl}G91 G28 Z0. M9${nl}${nl}M01`, "g"), "G0 Z200. M9\nM5\nM01\n")
		.replace(new RegExp(`M5${nl}G91 G28 Z0. M9${nl}${nl}M01`, "g"), 			"G0 Z200. M9\nM5\nM01\n")
		.replace(new RegExp(`G0 Z25.${nl}M5${nl}G91 G28 Z0. M9${nl}G28 X0. Y0.${nl}M30${nl}%`, "g"), 	"G0 Z200. M9\nM5\nG91 G28 Y0.\nM30\n%")
		.replace(new RegExp(`M5${nl}G91 G28 Z0. M9${nl}G28 X0. Y0.${nl}M30${nl}%`, "g"), 				"G0 Z200. M9\nM5\nG91 G28 Y0.\nM30\n%")
		.replace(new RegExp(`M5${nl}G91 G28 Z0.${nl}G28 X0. Y0.${nl}M30${nl}%`, "g"), 					"G0 Z200. M9\nM5\nG91 G28 Y0.\nM30\n%");
		
		let match: null | RegExpMatchArray = [];
		while ((match = toolMatch.exec(cleanText)) !== null) {
			const toolID = match[0].slice(2, match[0].indexOf(" |"));
			const toolName = match[0].slice(match[0].indexOf("| ")+2, match[0].lastIndexOf(" |"));
			cleanText = cleanText.replace(new RegExp(`${toolID} M6${nl}`, "g"), `${toolID} M6 (${toolName})\n`);
		}

		if (cleanText !== textEditor.document.getText()) {
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
