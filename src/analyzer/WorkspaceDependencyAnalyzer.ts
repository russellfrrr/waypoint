import * as fs from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';
import * as vscode from 'vscode';
import { getWorkspaceRelativePath, resolveFileReference } from '../utils/pathUtils';

const maxWorkspaceFilesToScan = 500;
const maxDependentsToReturn = 20;

export class WorkspaceDependencyAnalyzer {
  private readonly project = new Project();

  public async findIncomingDependents(targetFilePath: string): Promise<string[]> {
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
      '**/{node_modules,dist,build,out,.git}/**',
      maxWorkspaceFilesToScan
    );

    const normalizedTargetPath = normalizePath(targetFilePath);
    const dependents: string[] = [];

    for (const file of files) {
      const currentFilePath = file.fsPath;

      if (normalizePath(currentFilePath) === normalizedTargetPath) {
        continue;
      }

      if (this.importsTargetFile(currentFilePath, normalizedTargetPath)) {
        dependents.push(getWorkspaceRelativePath(currentFilePath));
      }

      if (dependents.length >= maxDependentsToReturn) {
        break;
      }
    }

    return dependents;
  }

  private importsTargetFile(
    currentFilePath: string,
    normalizedTargetPath: string
  ): boolean {
    try {
      const text = fs.readFileSync(currentFilePath, 'utf8');
      const sourceFile = this.project.createSourceFile(currentFilePath, text, {
        overwrite: true,
      });

      return sourceFile.getImportDeclarations().some((importDeclaration) => {
        const importPath = importDeclaration.getModuleSpecifierValue();

        if (!isRelativeImport(importPath)) {
          return false;
        }

        const resolvedPath = resolveFileReference(currentFilePath, importPath);

        return resolvedPath ? normalizePath(resolvedPath) === normalizedTargetPath : false;
      });
    } catch {
      return false;
    }
  }
}

const isRelativeImport = (value: string): boolean => {
  return value.startsWith('./') || value.startsWith('../');
};

const normalizePath = (filePath: string): string => {
  return path.normalize(filePath).toLowerCase();
};