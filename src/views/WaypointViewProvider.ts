import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { FileAnalysisResult } from '../types';

type WaypointTreeItem = {
  label: string;
  value?: string;
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
    const hasChildren = Boolean(item.children?.length);
    const label = item.value ? `${item.label}: ${item.value}` : item.label;

    const treeItem = new vscode.TreeItem(
      label,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.tooltip = label;

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
    {
      label: 'File',
      children: [
        { label: 'Current file', value: staticAnalysis.fileName },
        { label: 'Path', value: staticAnalysis.relativePath },
        { label: 'Lines', value: String(staticAnalysis.lineCount) },
        { label: 'Status', value: staticAnalysis.analysisStatus },
      ],
    },
    {
      label: 'Metrics',
      children: [
        { label: 'Impact', value: formatImpactLevel(staticAnalysis.impactLevel) },
        { label: 'Imports', value: String(staticAnalysis.imports.length) },
        { label: 'Exports', value: String(staticAnalysis.exports.length) },
        { label: 'Used by', value: `${staticAnalysis.incomingDependents.length} files` },
      ],
    },
    {
      label: 'Imports',
      children: formatStringItems(staticAnalysis.imports),
    },
    {
      label: 'Exports',
      children: formatExportItems(staticAnalysis.exports),
    },
    {
      label: 'Imported By',
      children: formatStringItems(staticAnalysis.incomingDependents),
    },
    {
      label: 'AI Insight',
      children: [{ label: 'Not available yet' }],
    },
  ];
};

const formatStringItems = (items: string[]): WaypointTreeItem[] => {
  if (items.length === 0) {
    return [{ label: 'None' }];
  }

  return items.map((item) => ({ label: item }));
};

const formatExportItems = (
  items: FileAnalysisResult['staticAnalysis']['exports']
): WaypointTreeItem[] => {
  if (items.length === 0) {
    return [{ label: 'None' }];
  }

  return items.map((item) => ({
    label: item.name,
    value: item.kind,
  }));
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