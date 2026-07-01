import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { FileAnalysisResult } from '../types';

type WaypointTreeItem = {
  label: string;
  value?: string;
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
    const treeItem = new vscode.TreeItem(
      item.value ? `${item.label}: ${item.value}` : item.label,
      vscode.TreeItemCollapsibleState.None
    );

    treeItem.tooltip = item.value ? `${item.label}: ${item.value}` : item.label;

    return treeItem;
  }

  public getChildren(): WaypointTreeItem[] {
    if (this.isLoading) {
      return [{ label: 'Analyzing current file...' }];
    }

    if (!this.currentResult) {
      return [{ label: 'Open a file to see Waypoint analysis.' }];
    }

    const staticAnalysis = this.currentResult.staticAnalysis;

    return [
      { label: 'Current file', value: staticAnalysis.fileName },
      { label: 'Path', value: staticAnalysis.relativePath },
      { label: 'Lines', value: String(staticAnalysis.lineCount) },
      { label: 'Impact', value: formatImpactLevel(staticAnalysis.impactLevel) },
      { label: 'Imports', value: String(staticAnalysis.imports.length) },
      { label: 'Exports', value: String(staticAnalysis.exports.length) },
      { label: 'Used by', value: `${staticAnalysis.incomingDependents.length} files` },
      { label: 'AI Insight', value: 'Not available yet' },
    ];
  }
}

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