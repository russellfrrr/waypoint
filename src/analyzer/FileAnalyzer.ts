import * as path from 'path';
import { ImportDeclaration, Project } from 'ts-morph';
import * as vscode from 'vscode';
import { FileAnalysisResult } from '../types';


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
      imports: sourceFile.getImportDeclarations().map((importDeclaration) =>
        importDeclaration.getModuleSpecifierValue()
      ),
      exports: Array.from(sourceFile.getExportedDeclarations().keys()),
    };
  }
}
