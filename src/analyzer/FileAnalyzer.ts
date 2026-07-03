import * as fs from 'fs';
import * as path from 'path';
import { Project, Node, SourceFile } from 'ts-morph';
import * as vscode from 'vscode';
import { FileAnalysisResult } from '../types';
import { getWorkspaceRelativePath, resolveFileReference } from '../utils/pathUtils';
import { WorkspaceDependencyAnalyzer } from './WorkspaceDependencyAnalyzer';

const maxAnalyzableFileSizeBytes = 500 * 1024;


export class FileAnalyzer {
  private readonly project = new Project();
  private readonly workspaceDependencyAnalyzer = new WorkspaceDependencyAnalyzer();

  public async analyze(document: vscode.TextDocument): Promise<FileAnalysisResult> {
    return this.analyzeText(document.fileName, document.getText(), document.languageId, document.lineCount);
  }

  public async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    const stats = fs.statSync(filePath);
    const languageId = getLanguageIdFromFilePath(filePath);

    if (stats.size > maxAnalyzableFileSizeBytes) {
      const incomingDependents = await this.workspaceDependencyAnalyzer.findIncomingDependents(filePath);

      return {
        staticAnalysis: {
          fileName: path.basename(filePath),
          filePath,
          relativePath: getWorkspaceRelativePath(filePath),
          languageId,
          lineCount: 0,
          imports: [],
          outgoingDependencies: [],
          exports: [],
          incomingDependents,
          impactLevel: getImpactLevel(incomingDependents.length),
          analysisStatus: 'too-large',
        },
      };
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const lineCount = text.split(/\r?\n/).length;

    return this.analyzeText(filePath, text, languageId, lineCount);
  }

  private async analyzeText(
    filePath: string,
    text: string,
    languageId: string,
    lineCount: number
  ): Promise<FileAnalysisResult> {
    const incomingDependents = await this.workspaceDependencyAnalyzer.findIncomingDependents(filePath);

    if (!canParseWithTypeScript(filePath)) {
      return {
        staticAnalysis: {
          fileName: path.basename(filePath),
          filePath,
          relativePath: getWorkspaceRelativePath(filePath),
          languageId,
          lineCount,
          imports: [],
          outgoingDependencies: [],
          exports: [],
          incomingDependents,
          impactLevel: getImpactLevel(incomingDependents.length),
          analysisStatus: 'unsupported',
        },
      };
    }
    
    const sourceFile = this.project.createSourceFile(filePath, text, { overwrite: true });
    const imports = getImportPaths(sourceFile);

    return {
      staticAnalysis: {
        fileName: path.basename(sourceFile.getFilePath()),
        filePath: sourceFile.getFilePath(),
        relativePath: getWorkspaceRelativePath(sourceFile.getFilePath()),
        languageId,
        lineCount,
        imports,
        outgoingDependencies: getOutgoingDependencies(imports, sourceFile.getFilePath()),
        exports: Array.from(sourceFile.getExportedDeclarations()).map(([name, declarations]) => {
          const declaration = declarations[0];

          return {
            name,
            kind: declaration ? getDeclarationKind(declaration) : 'unknown',
          };
        }),
        incomingDependents,
        impactLevel: getImpactLevel(incomingDependents.length),
        analysisStatus: 'parsed',
      },
    };
  }
}

const getLanguageIdFromFilePath = (filePath: string): string => {
  const extension = path.extname(filePath);

  if (extension === '.ts' || extension === '.tsx' || extension === '.mts' || extension === '.cts') {
    return 'typescript';
  }

  if (extension === '.js' || extension === '.jsx' || extension === '.mjs' || extension === '.cjs') {
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

  return ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'].includes(extension);
};

const getImportPaths = (sourceFile: SourceFile): string[] => {
  return sourceFile.getImportDeclarations().map((importDeclaration) =>
    importDeclaration.getModuleSpecifierValue()
  );
};

const getOutgoingDependencies = (
  imports: string[],
  currentFilePath: string
): FileAnalysisResult['staticAnalysis']['outgoingDependencies'] => {
  return imports
    .filter((importPath) => isRelativeImport(importPath))
    .map((importPath) => resolveFileReference(currentFilePath, importPath))
    .filter((filePath): filePath is string => Boolean(filePath))
    .map((filePath) => ({
      filePath,
      relativePath: getWorkspaceRelativePath(filePath),
    }));
};

const isRelativeImport = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
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

const getImpactLevel = (incomingDependentCount: number): 'low' | 'medium' | 'high' => {
	if (incomingDependentCount >= 10) {
		return 'high';
	}

	if (incomingDependentCount >= 3) {
		return 'medium';
	}

	return 'low';
};
