import * as fs from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';
import * as vscode from 'vscode';
import { FileAnalysisResult } from '../types';


export class FileAnalyzer {
  private readonly project = new Project();

  public analyze(document: vscode.TextDocument): FileAnalysisResult {
    return this.analyzeText(document.fileName, document.getText(), document.languageId, document.lineCount);
  }

  public analyzeFile(filePath: string): FileAnalysisResult {
    const text = fs.readFileSync(filePath, 'utf8');
    const lineCount = text.split(/\r?\n/).length;
    const languageId = getLanguageIdFromFilePath(filePath);

    return this.analyzeText(filePath, text, languageId, lineCount);
  }

  private analyzeText(
    filePath: string,
    text: string,
    languageId: string,
    lineCount: number
  ): FileAnalysisResult {
    const sourceFile = this.project.createSourceFile(filePath, text, { overwrite: true });

    return {
      fileName: path.basename(sourceFile.getFilePath()),
      filePath: sourceFile.getFilePath(),
      languageId,
      lineCount,
      imports: sourceFile.getImportDeclarations().map((importDeclaration) => 
        importDeclaration.getModuleSpecifierValue()
      ),
      exports: Array.from(sourceFile.getExportedDeclarations().keys()),
    };
  }
}

const getLanguageIdFromFilePath = (filePath: string): string => {
  const extension = path.extname(filePath);

  if (extension === '.ts' || extension === '.tsx') {
    return 'typescript';
  }

  if (extension === ' .js' || extension === '.jsx') {
    return 'javascript';
  }

  return 'plaintext';
};
