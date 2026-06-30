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
			{ language: 'typescriptreact', scheme: 'file' },
			{ language: 'javascriptreact', scheme: 'file' },
		],
		new FileReferenceHoverProvider(analyzer)
	);

	const analyzeCurrentFileCommand = vscode.commands.registerCommand('waypoint.analyzeCurrentFile', () => {
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

	const openFileCommand = vscode.commands.registerCommand(
		'waypoint.openFile',
		async (filePath: string) => {
			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document);
		}
	);

	context.subscriptions.push(analyzeCurrentFileCommand, openFileCommand, outputChannel, hoverProvider);
};

export const deactivate = () => {};
