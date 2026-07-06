import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { ExportedDeclaration, FileAnalysisResult, FileReference } from '../types';

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
      ${renderMetric('Depends on', formatFileCount(analysis.outgoingDependencies.length))}
      ${renderMetric('Exports', String(analysis.exports.length))}
      ${renderMetric('Used by', formatFileCount(analysis.incomingDependents.length))}
    </section>

    <section class="section">
      <h2>Evidence</h2>
      ${renderStringList(analysis.purpose.evidence, 'No evidence available yet.')}
    </section>

    <section class="section">
      <h2>Imports</h2>
      ${renderStringList(analysis.imports, 'No imports found.')}
    </section>

    <section class="section">
      <h2>Depends On</h2>
      ${renderFileReferenceList(analysis.outgoingDependencies, 'No outgoing dependencies found.')}
    </section>

    <section class="section">
      <h2>Exports</h2>
      ${renderExportList(analysis.exports)}
    </section>

    <section class="section">
      <h2>Imported By</h2>
      ${renderFileReferenceList(analysis.incomingDependents, 'Not imported by any files.')}
    </section>

    <section class="section">
      <h2>AI Insight</h2>
      <p class="muted">Not available yet. Static analysis is the foundation.</p>
    </section>
  </main>`;
};

const renderMetric = (label: string, value: string): string => {
  return `<article class="metric">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
};

const renderStringList = (items: string[], emptyText: string): string => {
  if (items.length === 0) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul class="list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
};

const renderFileReferenceList = (items: FileReference[], emptyText: string): string => {
  if (items.length === 0) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul class="list">${items.map((item) => `
    <li>
      <code>${escapeHtml(item.relativePath)}</code>
    </li>
  `).join('')}</ul>`;
};

const renderExportList = (items: ExportedDeclaration[]): string => {
  if (items.length === 0) {
    return '<p class="muted">No exports found.</p>';
  }

  return `<div class="symbol-list">${items.map((item) => `
    <article class="symbol">
      <div class="symbol-header">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.kind)}</span>
      </div>
      ${renderStringList(item.details, 'No additional symbol details found.')}
    </article>
  `).join('')}</div>`;
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
