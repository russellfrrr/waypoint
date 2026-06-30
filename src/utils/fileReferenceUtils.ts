import * as vscode from 'vscode';

export type FileReferenceAtPosition = {
  range: vscode.Range;
  value: string;
}

export const getFileReferenceAtPosition = (
  document: vscode.TextDocument,
  position: vscode.Position
): FileReferenceAtPosition | undefined => {
  const range = document.getWordRangeAtPosition(position, /['"][^'"]+['"]/);

  if (!range) {
    return undefined;
  }

  const text = document.getText(range);
  const value = text.slice(1, -1);

  if (!isLikelyFileReference(value)) {
    return undefined;
  }

  return { range, value };
};

const isLikelyFileReference = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
};