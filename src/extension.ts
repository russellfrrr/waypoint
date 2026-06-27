import * as vscode from 'vscode';

export const activate = (context: vscode.ExtensionContext) => {
	console.log('Waypoint is now active.');

	const disposable = vscode.commands.registerCommand('waypoint.analyzeCurrentFile', () => {
		vscode.window.showInformationMessage('Waypoint will analyze the current file soon.');
	});

	context.subscriptions.push(disposable);
};

export const deactivate = () => {};
