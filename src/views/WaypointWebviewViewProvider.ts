import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { GitActivityAnalyzer } from '../analyzer/GitActivityAnalyzer';
import { getGraphNeighborhood, WorkspaceGraphAnalyzer } from '../analyzer/WorkspaceGraphAnalyzer';
import { AiInsightService } from '../ai/AiInsightService';
import { DependencyGraph, ExportedDeclaration, FileAnalysisResult, FileReference, GitActivity } from '../types';

export type WebviewState = 'empty' | 'loading' | 'ready' | 'error';

export class WaypointWebviewViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private messageListener: vscode.Disposable | undefined;
  private currentResult: FileAnalysisResult | undefined;
  private graph: DependencyGraph | undefined;
  private gitActivity: GitActivity | undefined;
  private aiError: string | undefined;
  private state: WebviewState = 'empty';

  public constructor(
    private readonly analyzer: FileAnalyzer,
    private readonly aiInsightService?: AiInsightService,
    private readonly graphAnalyzer = new WorkspaceGraphAnalyzer(),
    private readonly gitActivityAnalyzer = new GitActivityAnalyzer()
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.view.webview.options = {
      enableScripts: true,
    };
    this.messageListener?.dispose();
    this.messageListener = this.view.webview.onDidReceiveMessage((message: unknown) => {
      if (!isOpenFileMessage(message)) {
        if (isGenerateAiMessage(message)) {
          void this.generateAiInsight();
        }

        return;
      }

      void vscode.commands.executeCommand('waypoint.openFile', message.filePath);
    });
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
      const [graph, gitActivity] = await Promise.all([
        this.graphAnalyzer.analyze(),
        this.gitActivityAnalyzer.analyze(),
      ]);
      this.graph = getGraphNeighborhood(graph, this.currentResult.staticAnalysis.filePath);
      this.gitActivity = gitActivity;
      this.aiError = undefined;
      this.state = 'ready';
    } catch {
      this.currentResult = undefined;
      this.state = 'error';
    }

    this.render();
  }

  public async generateAiInsight(): Promise<void> {
    if (!this.currentResult || !this.aiInsightService) {
      return;
    }

    this.aiError = undefined;
    this.render();

    const result = await this.aiInsightService.generateInsight(this.currentResult);

    if (result.insight) {
      this.currentResult = {
        ...this.currentResult,
        aiInsight: result.insight,
      };
    }

    this.aiError = result.error;
    this.render();
  }

  private render(): void {
    if (!this.view) {
      return;
    }

    this.view.webview.html = getWebviewHtml(
      this.state,
      this.currentResult,
      this.aiError,
      this.graph,
      this.gitActivity
    );
  }
}

export const getWebviewHtml = (
  state: WebviewState,
  result: FileAnalysisResult | undefined,
  aiError?: string,
  graph?: DependencyGraph,
  gitActivity?: GitActivity
): string => {
  const body = result && state === 'ready'
    ? renderAnalysis(result, aiError, graph, gitActivity)
    : renderState(state);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waypoint Deep Analysis</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.45;
    }

    .page {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
    }

    .state-page {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 16px;
    }

    .hero,
    .section,
    .metric,
    .symbol,
    .state-card,
    .notice {
      border: 1px solid var(--vscode-sideBarSectionHeader-border);
      border-radius: 8px;
      background: var(--vscode-editor-background);
    }

    .hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px;
    }

    .eyebrow {
      margin: 0 0 6px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-transform: uppercase;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.15;
      overflow-wrap: anywhere;
    }

    h2 {
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 700;
    }

    .path,
    .muted {
      color: var(--vscode-descriptionForeground);
    }

    .path {
      margin-top: 6px;
      overflow-wrap: anywhere;
    }

    .badge {
      flex: 0 0 auto;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-low {
      color: var(--vscode-testing-iconPassed, var(--vscode-editorInfo-foreground));
      background: color-mix(in srgb, var(--vscode-testing-iconPassed, var(--vscode-editorInfo-foreground)) 14%, transparent);
    }

    .badge-medium {
      color: var(--vscode-testing-iconQueued, var(--vscode-editorWarning-foreground));
      background: color-mix(in srgb, var(--vscode-testing-iconQueued, var(--vscode-editorWarning-foreground)) 16%, transparent);
    }

    .badge-high {
      color: var(--vscode-testing-iconFailed, var(--vscode-editorError-foreground));
      background: color-mix(in srgb, var(--vscode-testing-iconFailed, var(--vscode-editorError-foreground)) 14%, transparent);
    }

    .section {
      padding: 12px;
    }

    .state-card {
      width: 100%;
      padding: 16px;
    }

    .state-card h1 {
      margin-bottom: 8px;
      font-size: 18px;
    }

    .notice {
      padding: 10px 12px;
      color: var(--vscode-editorWarning-foreground);
      background: color-mix(in srgb, var(--vscode-editorWarning-foreground) 10%, transparent);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .metric {
      min-width: 0;
      padding: 10px;
    }

    .metric span,
    .meta-row span {
      display: block;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }

    .metric strong {
      display: block;
      margin-top: 4px;
      font-size: 15px;
    }

    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 10px;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding-left: 18px;
    }

    li,
    code {
      overflow-wrap: anywhere;
    }

    code {
      color: var(--vscode-textPreformat-foreground);
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    .symbol-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .symbol {
      padding: 10px;
      background: var(--vscode-sideBar-background);
    }

    .symbol-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .symbol-header strong {
      overflow-wrap: anywhere;
    }

    .symbol-header span {
      flex: 0 0 auto;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }

    h3 {
      margin: 12px 0 6px;
      font-size: 12px;
    }

    button {
      font: inherit;
    }

    .link-button,
    .file-link,
    .primary-button {
      border: 0;
      color: var(--vscode-textLink-foreground);
      background: transparent;
      cursor: pointer;
      text-align: left;
    }

    .link-button {
      align-self: flex-start;
      border-radius: 4px;
      padding: 4px 0;
      font-weight: 700;
    }

    .file-link {
      padding: 0;
      overflow-wrap: anywhere;
    }

    .primary-button {
      margin-top: 10px;
      border-radius: 4px;
      padding: 6px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      text-align: center;
    }

    .link-button:hover,
    .file-link:hover {
      color: var(--vscode-textLink-activeForeground);
      text-decoration: underline;
    }

    .primary-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .ai-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .error-text {
      color: var(--vscode-errorForeground);
    }
  </style>
</head>
<body>
  ${body}
  <script>
    const vscode = acquireVsCodeApi();

    document.addEventListener('click', (event) => {
      const actionTarget = event.target.closest('[data-action]');

      if (actionTarget) {
        vscode.postMessage({
          type: actionTarget.dataset.action,
        });
        return;
      }

      const target = event.target.closest('[data-file]');

      if (!target) {
        return;
      }

      vscode.postMessage({
        type: 'openFile',
        filePath: target.dataset.file,
      });
    });
  </script>
</body>
</html>`;
};

const renderAnalysis = (
  result: FileAnalysisResult,
  aiError: string | undefined,
  graph: DependencyGraph | undefined,
  gitActivity: GitActivity | undefined
): string => {
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

    <button class="link-button" type="button" data-file="${escapeHtml(analysis.filePath)}">
      Open current file
    </button>

    ${renderStatusNotice(analysis.analysisStatus)}

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
      ${renderAiInsight(result, aiError)}
    </section>
  </main>`;
};

const renderAiInsight = (result: FileAnalysisResult, aiError: string | undefined): string => {
  if (result.aiInsight) {
    return `<div class="ai-card">
      <p>${escapeHtml(result.aiInsight.summary)}</p>
      <div class="meta-row">
        <span>Confidence</span>
        <strong>${formatConfidence(result.aiInsight.confidence)}</strong>
      </div>
      <h3>Responsibilities</h3>
      ${renderStringList(result.aiInsight.responsibilities, 'No responsibilities returned.')}
      <h3>Change Risk</h3>
      <p>${escapeHtml(result.aiInsight.changeRisk)}</p>
      <h3>Evidence</h3>
      ${renderStringList(result.aiInsight.evidence, 'No AI evidence returned.')}
    </div>`;
  }

  if (aiError) {
    return `<p class="error-text">${escapeHtml(aiError)}</p>
      <button class="primary-button" type="button" data-action="generate-ai">Try again</button>`;
  }

  return `<p class="muted">Optional. Uses your own API key when configured.</p>
    <button class="primary-button" type="button" data-action="generate-ai">Generate AI insight</button>`;
};

const renderState = (state: WebviewState): string => {
  return `<main class="state-page">
    <section class="state-card">
      <p class="eyebrow">Waypoint Deep Analysis</p>
      <h1>${escapeHtml(getStateMessage(state))}</h1>
      <p class="muted">${escapeHtml(getStateDetail(state))}</p>
    </section>
  </main>`;
};

const renderStatusNotice = (
  status: FileAnalysisResult['staticAnalysis']['analysisStatus']
): string => {
  if (status === 'parsed') {
    return '';
  }

  if (status === 'too-large') {
    return `<section class="notice">
      This file was resolved, but it is too large for detailed static analysis.
    </section>`;
  }

  return `<section class="notice">
    This file was resolved, but Waypoint only performs detailed parsing for JavaScript and TypeScript files.
  </section>`;
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
      <button class="file-link" type="button" data-file="${escapeHtml(item.filePath)}">
        ${escapeHtml(item.relativePath)}
      </button>
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
    return 'Analyzing current file';
  }

  if (state === 'error') {
    return 'Could not analyze the current file.';
  }

  return 'Open a file to see Waypoint analysis.';
};

const getStateDetail = (state: WebviewState): string => {
  if (state === 'loading') {
    return 'Waypoint is reading imports, exports, dependencies, purpose signals, and impact.';
  }

  if (state === 'error') {
    return 'Try another JavaScript or TypeScript file, or refresh the Deep Analysis view.';
  }

  return 'Select a JavaScript or TypeScript file to generate a Deep Analysis report.';
};

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const isOpenFileMessage = (
  message: unknown
): message is { type: 'openFile'; filePath: string } => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const candidate = message as { type?: unknown; filePath?: unknown };

  return candidate.type === 'openFile' && typeof candidate.filePath === 'string';
};

const isGenerateAiMessage = (
  message: unknown
): message is { type: 'generate-ai' } => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const candidate = message as { type?: unknown };

  return candidate.type === 'generate-ai';
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
