import * as vscode from 'vscode';
import { FileAnalyzer } from './analyzer/FileAnalyzer';

export const activate = (context: vscode.ExtensionContext) => {
	console.log('Waypoint is now active.');

	const analyzer = new FileAnalyzer();

	const disposable = vscode.commands.registerCommand('waypoint.analyzeCurrentFile', () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showInformationMessage('Open a file first so Waypoint can analyze it.');
			return;
		}

		const result = analyzer.analyze(editor.document);

		vscode.window.showInformationMessage(`Waypoint analyzed ${result.fileName}: ${result.imports.length} imports, ${result.exports.length} exports`);
	});

	context.subscriptions.push(disposable);
};

export const deactivate = () => {};
