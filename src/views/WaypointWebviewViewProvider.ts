import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { FileAnalysisResult } from '../types';

type WebviewState = 'empty' | 'loading' | 'ready' | 'error';

export class WaypointWebviewViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private currentResult: FileAnalysisResult | undefined;
  private state: WebviewState = 'empty';

  public constructor(private readonly analyzer: FileAnalyzer) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.view.webview.options = {
      enableScripts: true,
    };
    this.render();
  }

  public async refresh(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      this.currentResult = undefined;
      this.state = 'empty';
      this.render();
      return;
    }

    this.state = 'loading';
    this.render();

    try {
      this.currentResult = await this.analyzer.analyze(editor.document);
      this.state = 'ready';
    } catch {
      this.currentResult = undefined;
      this.state = 'error';
    }

    this.render();
  }

  private render(): void {
    if (!this.view) {
      return;
    }

    this.view.webview.html = getWebviewHtml(this.state, this.currentResult);
  }
}

const getWebviewHtml = (
  state: WebviewState,
  result: FileAnalysisResult | undefined
): string => {
  const body = result && state === 'ready'
    ? `<main><h1>${escapeHtml(result.staticAnalysis.fileName)}</h1></main>`
    : `<main><p>${getStateMessage(state)}</p></main>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waypoint Deep Analysis</title>
</head>
<body>
  ${body}
</body>
</html>`;
};

const getStateMessage = (state: WebviewState): string => {
  if (state === 'loading') {
    return 'Analyzing current file...';
  }

  if (state === 'error') {
    return 'Could not analyze the current file.';
  }

  return 'Open a file to see Waypoint analysis.';
};

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};
