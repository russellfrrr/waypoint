import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { resolveFileReference } from '../utils/pathUtils';
import { isImportOrExportReference } from '../utils/referenceUtils';
import {
  formatErrorHoverResult,
  formatResolvedHoverResult,
  formatUnresolvedHoverResult,
} from '../utils/formatHoverResult';
import { getFileReferenceAtPosition } from '../utils/fileReferenceUtils';

export class FileReferenceHoverProvider implements vscode.HoverProvider {
  public constructor(private readonly analyzer: FileAnalyzer) {}

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const fileReference = getFileReferenceAtPosition(document, position);

    if (!fileReference) {
      return undefined;
    }

    if (!isImportOrExportReference(document, fileReference.range)) {
      return undefined;
    }

    const resolvedPath = resolveFileReference(document.fileName, fileReference.value);

    if (!resolvedPath) {
      return new vscode.Hover(formatUnresolvedHoverResult(fileReference.value));
    }

    try {
      const result = await this.analyzer.analyzeFile(resolvedPath);

      return new vscode.Hover(formatResolvedHoverResult(fileReference.value, result));
    } catch {
      return new vscode.Hover(formatErrorHoverResult(fileReference.value));
    }
  }
}
