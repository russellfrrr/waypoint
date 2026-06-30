import * as fs from 'fs';
import * as path from 'path';
import { Project, Node } from 'ts-morph';
import * as vscode from 'vscode';
import { FileAnalysisResult } from '../types';
import { getWorkspaceRelativePath } from '../utils/pathUtils';

const maxAnalyzableFileSizeBytes = 500 * 1024;


export class FileAnalyzer {
  private readonly project = new Project();

  public analyze(document: vscode.TextDocument): FileAnalysisResult {
    return this.analyzeText(document.fileName, document.getText(), document.languageId, document.lineCount);
  }

  public analyzeFile(filePath: string): FileAnalysisResult {
    const stats = fs.statSync(filePath);
    const languageId = getLanguageIdFromFilePath(filePath);

    if (stats.size > maxAnalyzableFileSizeBytes) {
      return {
        fileName: path.basename(filePath),
        filePath,
        relativePath: getWorkspaceRelativePath(filePath),
        languageId,
        lineCount: 0,
        imports: [],
        exports: [],
        analysisStatus: 'too-large',
      };
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const lineCount = text.split(/\r?\n/).length;

    return this.analyzeText(filePath, text, languageId, lineCount);
  }

  private analyzeText(
    filePath: string,
    text: string,
    languageId: string,
    lineCount: number
  ): FileAnalysisResult {
    if (!canParseWithTypeScript(filePath)) {
      return {
        fileName: path.basename(filePath),
        filePath,
        relativePath: getWorkspaceRelativePath(filePath),
        languageId,
        lineCount,
        imports: [],
        exports: [],
        analysisStatus: 'unsupported',
      };
    }
    
    const sourceFile = this.project.createSourceFile(filePath, text, { overwrite: true });

    return {
      fileName: path.basename(sourceFile.getFilePath()),
      filePath: sourceFile.getFilePath(),
      relativePath: getWorkspaceRelativePath(sourceFile.getFilePath()),
      languageId,
      lineCount,
      imports: sourceFile.getImportDeclarations().map((importDeclaration) =>
        importDeclaration.getModuleSpecifierValue()
      ),
      exports: Array.from(sourceFile.getExportedDeclarations()).map(([name, declarations]) => {
        const declaration = declarations[0];

        return {
          name,
          kind: declaration ? getDeclarationKind(declaration) : 'unknown',
        };
      }),
      analysisStatus: 'parsed',
    };
  }
}

const getLanguageIdFromFilePath = (filePath: string): string => {
  const extension = path.extname(filePath);

  if (extension === '.ts' || extension === '.tsx') {
    return 'typescript';
  }

  if (extension === '.js' || extension === '.jsx') {
    return 'javascript';
  }

  if (extension === '.json') {
		return 'json';
	}

	if (extension === '.css') {
		return 'css';
	}

	if (extension === '.scss') {
		return 'scss';
	}

	if (extension === '.svg') {
		return 'svg';
	}

  return 'plaintext';
};

const canParseWithTypeScript = (filePath: string): boolean => {
  const extension = path.extname(filePath);

  return ['.ts', '.tsx', '.js', '.jsx'].includes(extension);
};

const getDeclarationKind = (node: Node): string => {
  if (Node.isFunctionDeclaration(node)) {
    return 'function';
  }

  if (Node.isClassDeclaration(node)) {
    return 'class';
  }

  if (Node.isInterfaceDeclaration(node)) {
    return 'interface';
  }

  if (Node.isTypeAliasDeclaration(node)) {
    return 'type';
  }

  if (Node.isVariableDeclaration(node)) {
    return 'const';
  }

  if (Node.isEnumDeclaration(node)) {
    return 'enum';
  }

  return node.getKindName();
};