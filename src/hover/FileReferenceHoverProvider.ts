import * as vscode from 'vscode';
import { resolveFileReference } from '../utils/pathUtils';

export class FileReferenceHoverProvider implements vscode.HoverProvider {
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

    return new vscode.Hover(`Waypoint file reference\n\nReference: \`${fileReference}\`\n\nResolved: \`${resolvedPath}\``);
  }
}

const isLikelyFileReference = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
};