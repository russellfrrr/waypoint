import * as vscode from 'vscode';
import { FileAnalyzer } from './analyzer/FileAnalyzer';
import { formatAnalysisResult } from './utils/formatAnalysisResult';
import { FileReferenceHoverProvider } from './hover/FileReferenceHoverProvider';

export const activate = (context: vscode.ExtensionContext) => {
	console.log('Waypoint is now active.');

	const analyzer = new FileAnalyzer();
	const outputChannel = vscode.window.createOutputChannel('Waypoint');
	const hoverProvider = vscode.languages.registerHoverProvider(
		[
			{ language: 'typescript', scheme: 'file' },
			{ language: 'javascript', scheme: 'file' },
		],
		new FileReferenceHoverProvider()
	);

	const disposable = vscode.commands.registerCommand('waypoint.analyzeCurrentFile', () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showInformationMessage('Open a file first so Waypoint can analyze it.');
			return;
		}

		const result = analyzer.analyze(editor.document);
		const output = formatAnalysisResult(result);

		outputChannel.clear();
		outputChannel.appendLine(output);
		outputChannel.show(true);

		vscode.window.showInformationMessage(`Waypoint analyzed ${result.fileName}.`);
	});

	context.subscriptions.push(disposable, outputChannel, hoverProvider);
};

export const deactivate = () => {};
