import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { FileAnalysisResult, FileReference } from '../types';

type WaypointTreeItemKind = 'section' | 'row' | 'file';

type WaypointTreeItem = {
  label: string;
  value?: string;
  filePath?: string;
  icon?: vscode.ThemeIcon;
  kind?: WaypointTreeItemKind;
  children?: WaypointTreeItem[];
};

export class WaypointViewProvider implements vscode.TreeDataProvider<WaypointTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<WaypointTreeItem | undefined>();

  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private currentResult: FileAnalysisResult | undefined;
  private isLoading = false;

  public constructor(private readonly analyzer: FileAnalyzer) {}

  public async refresh(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      this.currentResult = undefined;
      this.isLoading = false;
      this.onDidChangeTreeDataEmitter.fire(undefined);
      return;
    }

    this.isLoading = true;
    this.onDidChangeTreeDataEmitter.fire(undefined);

    try {
      this.currentResult = await this.analyzer.analyze(editor.document);
    } catch {
      this.currentResult = undefined;
    } finally {
      this.isLoading = false;
      this.onDidChangeTreeDataEmitter.fire(undefined);
    }
  }

  public getTreeItem(item: WaypointTreeItem): vscode.TreeItem {
    const tooltip = item.value ? `${item.label}: ${item.value}` : item.label;
    const collapsibleState = item.kind === 'section'
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.None;

    const treeItem = new vscode.TreeItem(item.label, collapsibleState);

    treeItem.tooltip = tooltip;

    if (item.value) {
      treeItem.description = item.value;
    }

    if (item.icon) {
      treeItem.iconPath = item.icon;
    }

    if (item.filePath) {
      treeItem.command = {
        command: 'waypoint.openFile',
        title: 'Open File',
        arguments: [item.filePath],
      };
    }

    return treeItem;
  }

  public getChildren(item?: WaypointTreeItem): WaypointTreeItem[] {
    if (item) {
      return item.children ?? [];
    }

    if (this.isLoading) {
      return [{ label: 'Analyzing current file...' }];
    }

    if (!this.currentResult) {
      return [{ label: 'Open a file to see Waypoint analysis.' }];
    }

    return createAnalysisTreeItems(this.currentResult);
  }
}

const createAnalysisTreeItems = (result: FileAnalysisResult): WaypointTreeItem[] => {
  const staticAnalysis = result.staticAnalysis;

  return [
    createSection('File', 'file', [
      createFileRow('Current file', staticAnalysis.fileName, staticAnalysis.filePath),
      createFileRow('Path', staticAnalysis.relativePath, staticAnalysis.filePath),
      createRow('Lines', String(staticAnalysis.lineCount)),
      createRow('Status', staticAnalysis.analysisStatus),
    ]),
    createSection('Metrics', getImpactIcon(staticAnalysis.impactLevel), [
      createRow('Impact', formatImpactLevel(staticAnalysis.impactLevel)),
      createRow('Imports', String(staticAnalysis.imports.length)),
      createRow('Depends on', formatFileCount(staticAnalysis.outgoingDependencies.length)),
      createRow('Exports', String(staticAnalysis.exports.length)),
      createRow('Used by', formatFileCount(staticAnalysis.incomingDependents.length)),
    ]),
    createSection('Purpose', 'info', [
      createRow('Likely purpose', staticAnalysis.purpose.summary),
      createRow('Confidence', formatConfidence(staticAnalysis.purpose.confidence)),
      ...formatEvidenceItems(staticAnalysis.purpose.evidence),
    ]),
    createSection('Imports', 'arrow-down', formatImportItems(staticAnalysis.imports)),
    createSection('Depends On', 'references', formatDependencyItems(staticAnalysis.outgoingDependencies)),
    createSection('Exports', 'symbol-key', formatExportItems(staticAnalysis.exports)),
    createSection('Imported By', 'graph', formatImportedByItems(staticAnalysis.incomingDependents)),
    createSection('AI Insight', 'sparkle', [
      createRow('Status', 'Not available yet'),
    ]),
  ];
};

const createSection = (
  label: string,
  icon: string,
  children: WaypointTreeItem[]
): WaypointTreeItem => {
  return {
    label,
    icon: new vscode.ThemeIcon(icon),
    kind: 'section',
    children,
  };
};

const createRow = (
  label: string,
  value: string
): WaypointTreeItem => {
  return {
    label,
    value,
    kind: 'row',
  };
};

const createFileRow = (
  label: string,
  value: string,
  filePath: string
): WaypointTreeItem => {
  return {
    label,
    value,
    filePath,
    kind: 'file',
  };
};

const formatImportItems = (items: string[]): WaypointTreeItem[] => {
  if (items.length === 0) {
    return [createRow('No imports found', '')];
  }

  return items.map((item) => createRow('import', item));
};

const formatEvidenceItems = (items: string[]): WaypointTreeItem[] => {
  if (items.length === 0) {
    return [createRow('Evidence', 'None')];
  }

  return items.map((item) => createRow('Evidence', item));
};

const formatExportItems = (
  items: FileAnalysisResult['staticAnalysis']['exports']
): WaypointTreeItem[] => {
  if (items.length === 0) {
    return [createRow('No exports found', '')];
  }

  return items.flatMap((item) => [
    createRow('export', `${item.name}: ${item.kind}`),
    ...item.details.map((detail) => createRow('detail', detail)),
  ]);
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

const formatDependencyItems = (items: FileReference[]): WaypointTreeItem[] => {
  if (items.length === 0) {
    return [createRow('No outgoing dependencies found', '')];
  }

  return items.map((item) => ({
    label: 'depends on',
    value: item.relativePath,
    filePath: item.filePath,
    kind: 'file',
  }));
};

const formatImportedByItems = (items: FileReference[]): WaypointTreeItem[] => {
  if (items.length === 0) {
    return [createRow('Not imported by any files', '')];
  }

  return items.map((item) => ({
    label: 'used by',
    value: item.relativePath,
    filePath: item.filePath,
    kind: 'file',
  }));
};

const formatFileCount = (count: number): string => {
  return count === 1 ? '1 file' : `${count} files`;
};

const getImpactIcon = (
  impactLevel: FileAnalysisResult['staticAnalysis']['impactLevel']
): string => {
  if (impactLevel === 'high') {
    return 'warning';
  }

  if (impactLevel === 'medium') {
    return 'graph';
  }

  return 'info';
};
