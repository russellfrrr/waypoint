import { Node, Project, SyntaxKind } from 'ts-morph';
import * as vscode from 'vscode';

const project = new Project();

export const isImportOrExportReference = (
  document: vscode.TextDocument,
  range: vscode.Range
): boolean => {
  const sourceFile = project.createSourceFile(
    document.fileName,
    document.getText(),
    { overwrite: true }
  );

  const offset = document.offsetAt(range.start);
  const node = sourceFile.getDescendantAtPos(offset);

  if (!node) {
    return false;
  }

  const stringLiteral = Node.isStringLiteral(node) ? node : node.getFirstAncestorByKind(SyntaxKind.StringLiteral);

  if (!stringLiteral) {
    return false;
  }

  const parent = stringLiteral.getParent();

  return Node.isImportDeclaration(parent) || Node.isExportDeclaration(parent);
};