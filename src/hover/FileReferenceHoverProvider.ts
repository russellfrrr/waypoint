import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { resolveFileReference } from '../utils/pathUtils';
import { isImportOrExportReference } from '../utils/referenceUtils';
import {
  formatErrorHoverResult,
  formatResolvedHoverResult,
  formatUnresolvedHoverResult,
} from '../utils/formatHoverResult';


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

    if (!isImportOrExportReference(document, range)) {
      return undefined;
    }

    const resolvedPath = resolveFileReference(document.fileName, fileReference);

    if (!resolvedPath) {
      return new vscode.Hover(formatUnresolvedHoverResult(fileReference));
    }

    try {
      const result = this.analyzer.analyzeFile(resolvedPath);

      return new vscode.Hover(formatResolvedHoverResult(fileReference, result));
    } catch {
      return new vscode.Hover(formatErrorHoverResult(fileReference));
    }
  }
}

const isLikelyFileReference = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
};
