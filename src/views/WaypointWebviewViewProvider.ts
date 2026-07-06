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
    ? renderAnalysis(result)
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

const renderAnalysis = (result: FileAnalysisResult): string => {
  const analysis = result.staticAnalysis;

  return `<main class="page">
    <section class="hero">
      <div>
        <p class="eyebrow">Waypoint Deep Analysis</p>
        <h1>${escapeHtml(analysis.fileName)}</h1>
        <p class="path">${escapeHtml(analysis.relativePath)}</p>
      </div>
      <span class="badge badge-${analysis.impactLevel}">${formatImpactLevel(analysis.impactLevel)} impact</span>
    </section>

    <section class="section">
      <h2>Likely Purpose</h2>
      <p>${escapeHtml(analysis.purpose.summary)}</p>
      <div class="meta-row">
        <span>Confidence</span>
        <strong>${formatConfidence(analysis.purpose.confidence)}</strong>
      </div>
    </section>

    <section class="metrics-grid">
      ${renderMetric('Lines', String(analysis.lineCount))}
      ${renderMetric('Imports', String(analysis.imports.length))}
      ${renderMetric('Exports', String(analysis.exports.length))}
      ${renderMetric('Used by', formatFileCount(analysis.incomingDependents.length))}
    </section>
  </main>`;
};

const renderMetric = (label: string, value: string): string => {
  return `<article class="metric">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
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

const formatFileCount = (count: number): string => {
  return count === 1 ? '1 file' : `${count} files`;
};

const formatImpactLevel = (
  impactLevel: FileAnalysisResult['staticAnalysis']['impactLevel']
): string => {
  if (impactLevel === 'high') {
    return 'High';
  }

  if (impactLevel === 'medium') {
    return 'Medium';
  }

  return 'Low';
};

const formatConfidence = (
  confidence: FileAnalysisResult['staticAnalysis']['purpose']['confidence']
): string => {
  if (confidence === 'high') {
    return 'High';
  }

  if (confidence === 'medium') {
    return 'Medium';
  }

  return 'Low';
};
