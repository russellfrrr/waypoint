import * as vscode from 'vscode';

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

    return new vscode.Hover(`Waypoint detected file reference: \`${fileReference}\``);
  }
}

const isLikelyFileReference = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
};