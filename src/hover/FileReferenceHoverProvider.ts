import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { resolveFileReference } from '../utils/pathUtils';
import { FileAnalysisResult } from '../types';

export class FileReferenceHoverProvider implements vscode.HoverProvider {
  public constructor(private readonly analyzer: FileAnalyzer) {}

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position, /['"][^'"]+['"]/);

    if (!range) {
      return undefined;
    }

    const text = document.getText(range);
    const fileReference = text.slice(1, -1);

    if (!isLikelyFileReference(fileReference)) {
      return undefined;
    }

    const resolvedPath = resolveFileReference(document.fileName, fileReference);

    if (!resolvedPath) {
      return new vscode.Hover(`Waypoint file reference\n\nReference: \`${fileReference}\`\n\nResolved: not found`);
    }

    const result = this.analyzer.analyzeFile(resolvedPath);

    return new vscode.Hover([
      'Waypoint file reference',
      '',
      `Reference \`${fileReference}\``,
      `File: \`${result.fileName}\``,
      `Imports:`,
      ...formatHoverList(result.imports),
      '',
      `Exports:`,
      ...formatExportHoverList(result.exports),
    ].join('\n\n'));
  }
}

const isLikelyFileReference = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
};

const formatHoverList = (items: string[]): string[] => {
  if (items.length === 0) {
    return ['- None'];
  }

  return items.map((item) => `- ${item}`);
};

const formatExportHoverList = (items: FileAnalysisResult['exports']): string[] => {
  if (items.length === 0) {
    return ['- None'];
  }

  return items.map((item) => `- ${item.name} (${item.kind})`);
};