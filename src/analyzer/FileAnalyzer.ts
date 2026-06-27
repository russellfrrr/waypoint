import * as path from 'path';
import { Project } from 'ts-morph';
import * as vscode from 'vscode';

export type FileAnalysisResult = {
  fileName: string;
  filePath: string;
  languageId: string;
  lineCount: number;
};

export class FileAnalyzer {
  private readonly project = new Project();

  public analyze(document: vscode.TextDocument): FileAnalysisResult {
    const sourceFile = this.project.createSourceFile(
      document.fileName,
      document.getText(),
      { overwrite: true }
    );

    return {
      fileName: path.basename(sourceFile.getFilePath()),
      filePath: sourceFile.getFilePath(),
      languageId: document.languageId,
      lineCount: document.lineCount,
    };
  }
}
