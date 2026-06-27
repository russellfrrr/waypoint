import * as vscode from 'vscode';

export const activate = (context: vscode.ExtensionContext) => {
	console.log('Waypoint is now active.');

	const disposable = vscode.commands.registerCommand('waypoint.analyzeCurrentFile', () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showInformationMessage('Open a file first so Waypoint can analyze it.');
			return;
		}

		const document = editor.document;
		const fileName = document.fileName;
		const languageId = document.languageId;
		const lineCount = document.lineCount;

		vscode.window.showInformationMessage(`Waypoint found: ${fileName} (${languageId}, ${lineCount} lines)`);
	});

	context.subscriptions.push(disposable);
};

export const deactivate = () => {};
