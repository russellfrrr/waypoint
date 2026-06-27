import * as vscode from 'vscode';
import { FileAnalyzer } from './analyzer/FileAnalyzer';

export const activate = (context: vscode.ExtensionContext) => {
	console.log('Waypoint is now active.');

	const analyzer = new FileAnalyzer();
	const outputChannel = vscode.window.createOutputChannel('Waypoint');

	const disposable = vscode.commands.registerCommand('waypoint.analyzeCurrentFile', () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showInformationMessage('Open a file first so Waypoint can analyze it.');
			return;
		}

		const result = analyzer.analyze(editor.document);

		outputChannel.clear();
		outputChannel.appendLine('Waypoint Analysis');
		outputChannel.appendLine('');
		outputChannel.appendLine(`File: ${result.fileName}`);
		outputChannel.appendLine(`Path: ${result.filePath}`);
		outputChannel.appendLine(`Language: ${result.languageId}`);
		outputChannel.appendLine(`Lines: ${result.lineCount}`);
		outputChannel.appendLine('');
		outputChannel.appendLine('Imports:');

		if (result.imports.length === 0) {
			outputChannel.appendLine('- None');
		} else {
			result.imports.forEach((importName) => {
				outputChannel.appendLine(`- ${importName}`);
			});
		}

		outputChannel.appendLine('');
		outputChannel.appendLine('Exports:');

		if (result.exports.length === 0) {
			outputChannel.appendLine('- None');
		} else {
			result.exports.forEach((exportName) => {
				outputChannel.appendLine(`- ${exportName}`);
			});
		}

		outputChannel.show(true);

		vscode.window.showInformationMessage(`Waypoint analyzed ${result.fileName}.`);
	});

	context.subscriptions.push(disposable, outputChannel);
};

export const deactivate = () => {};
