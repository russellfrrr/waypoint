import * as vscode from 'vscode';
import { FileAnalyzer } from './analyzer/FileAnalyzer';
import { formatAnalysisResult } from './utils/formatAnalysisResult';
import { FileReferenceHoverProvider } from './hover/FileReferenceHoverProvider';
import { WaypointWebviewViewProvider } from './views/WaypointWebviewViewProvider';
import { AiSettingsService } from './ai/AiSettingsService';
import { AiInsightService } from './ai/AiInsightService';

export const activate = (context: vscode.ExtensionContext) => {
	console.log('Waypoint is now active.');

	const analyzer = new FileAnalyzer();
	const aiSettingsService = new AiSettingsService(context.secrets);
	const aiInsightService = new AiInsightService(aiSettingsService);
	const waypointViewProvider = new WaypointWebviewViewProvider(analyzer, aiInsightService);
	const waypointWebviewView = vscode.window.registerWebviewViewProvider(
		'waypoint.deepAnalysis',
		waypointViewProvider
	);
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

	const refreshDeepAnalysisCommand = vscode.commands.registerCommand(
		'waypoint.refreshDeepAnalysis',
		() => {
			void waypointViewProvider.refresh();
		}
	);

	const setApiKeyCommand = vscode.commands.registerCommand(
		'waypoint.setApiKey',
		async () => {
			const apiKey = await vscode.window.showInputBox({
				prompt: 'Enter your AI API key. Waypoint stores it in VS Code SecretStorage.',
				password: true,
				ignoreFocusOut: true,
			});

			if (!apiKey) {
				return;
			}

			await aiSettingsService.setApiKey(apiKey);
			vscode.window.showInformationMessage('Waypoint AI API key saved securely.');
			void waypointViewProvider.refresh();
		}
	);

	const clearApiKeyCommand = vscode.commands.registerCommand(
		'waypoint.clearApiKey',
		async () => {
			await aiSettingsService.clearApiKey();
			vscode.window.showInformationMessage('Waypoint AI API key cleared.');
			void waypointViewProvider.refresh();
		}
	);

	const generateAiInsightCommand = vscode.commands.registerCommand(
		'waypoint.generateAiInsight',
		() => {
			void waypointViewProvider.generateAiInsight();
		}
	);

	const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(() => {
		void waypointViewProvider.refresh();
	});

	void waypointViewProvider.refresh();

	context.subscriptions.push(
		analyzeCurrentFileCommand,
		openFileCommand,
		refreshDeepAnalysisCommand,
		setApiKeyCommand,
		clearApiKeyCommand,
		generateAiInsightCommand,
		outputChannel,
		hoverProvider,
		waypointWebviewView,
		activeEditorListener
	);
};

export const deactivate = () => {};
