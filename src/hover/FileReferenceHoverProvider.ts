import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { resolveFileReference } from '../utils/pathUtils';
import { Node, Project, SyntaxKind } from 'ts-morph';
import {
  formatErrorHoverResult,
  formatResolvedHoverResult,
  formatUnresolvedHoverResult,
} from '../utils/formatHoverResult';


export class FileReferenceHoverProvider implements vscode.HoverProvider {
  private readonly project = new Project();

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

    if (!this.isImportOrExportReference(document, range)) {
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

  private isImportOrExportReference(
    document: vscode.TextDocument,
    range: vscode.Range
  ): boolean {
    const sourceFile = this.project.createSourceFile(
      document.fileName,
      document.getText(),
      { overwrite: true }
    );

    const offset = document.offsetAt(range.start);
    const node = sourceFile.getDescendantAtPos(offset);

    if (!node) {
      return false;
    }

    const stringLiteral = Node.isStringLiteral(node)
      ? node
      : node.getFirstAncestorByKind(SyntaxKind.StringLiteral);

    if (!stringLiteral) {
      return false;
    }

    const parent = stringLiteral.getParent();

    return Node.isImportDeclaration(parent) || Node.isExportDeclaration(parent);
  }
}

const isLikelyFileReference = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
};
