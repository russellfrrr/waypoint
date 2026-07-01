import * as vscode from 'vscode';
import { FileAnalyzer } from './analyzer/FileAnalyzer';
import { formatAnalysisResult } from './utils/formatAnalysisResult';
import { FileReferenceHoverProvider } from './hover/FileReferenceHoverProvider';
import { WaypointViewProvider } from './views/WaypointViewProvider';

export const activate = (context: vscode.ExtensionContext) => {
	console.log('Waypoint is now active.');

	const analyzer = new FileAnalyzer();
	const waypointViewProvider = new WaypointViewProvider(analyzer);
	const waypointTreeView = vscode.window.createTreeView('waypoint.deepAnalysis', {
		treeDataProvider: waypointViewProvider,
	});
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

	const analyzeCurrentFileCommand = vscode.commands.registerCommand('waypoint.analyzeCurrentFile', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showInformationMessage('Open a file first so Waypoint can analyze it.');
			return;
		}

		const result = await analyzer.analyze(editor.document);
		const output = formatAnalysisResult(result);

		outputChannel.clear();
		outputChannel.appendLine(output);
		outputChannel.show(true);

		vscode.window.showInformationMessage(`Waypoint analyzed ${result.staticAnalysis.fileName}.`);
	});

	const openFileCommand = vscode.commands.registerCommand(
		'waypoint.openFile',
		async (filePath: string) => {
			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document);
		}
	);

	const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(() => {
		void waypointViewProvider.refresh();
	});

	void waypointViewProvider.refresh();

	context.subscriptions.push(
		analyzeCurrentFileCommand,
		openFileCommand,
		outputChannel,
		hoverProvider,
		waypointTreeView,
		activeEditorListener
	);
};

export const deactivate = () => {};
