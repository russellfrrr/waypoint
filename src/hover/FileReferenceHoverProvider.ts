import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { resolveFileReference } from '../utils/pathUtils';
import { FileAnalysisResult } from '../types';
import { Node, Project, SyntaxKind } from 'ts-morph';


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
      const markdown = new vscode.MarkdownString();

      markdown.appendMarkdown('**Waypoint File Reference**\n\n');
      markdown.appendMarkdown(`\`${fileReference}\`\n\n`);
      markdown.appendMarkdown('Resolved: not found');

      return new vscode.Hover(markdown);
    }

    try {
      const result = this.analyzer.analyzeFile(resolvedPath);

      const markdown = new vscode.MarkdownString();

      markdown.appendMarkdown('**Waypoint File Reference**\n\n');
      markdown.appendMarkdown(`\`${fileReference}\` -> \`${result.fileName}\`\n\n`);
      markdown.appendMarkdown(`Lines: ${result.lineCount}\n\n`);

      if (!result.canParse) {
        markdown.appendMarkdown('Waypoint resolved this file, but it is not a JavaScript or TypeScript source file.');

        return new vscode.Hover(markdown);
      }

      markdown.appendMarkdown('**Imports**\n\n');
      markdown.appendMarkdown(formatHoverList(result.imports).join('\n'));
      markdown.appendMarkdown('\n\n');

      markdown.appendMarkdown('**Exports**\n\n');
      markdown.appendMarkdown(formatExportHoverList(result.exports).join('\n'));

      return new vscode.Hover(markdown);
    } catch (err) {
      const markdown = new vscode.MarkdownString();

      markdown.appendMarkdown('**Waypoint File Reference**\n\n');
      markdown.appendMarkdown(`\`${fileReference}\`\n\n`);
      markdown.appendMarkdown('Could not analyze this file.');

      return new vscode.Hover(markdown);
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

    const stringLiteral = node.getFirstAncestorByKind(SyntaxKind.StringLiteral);

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
