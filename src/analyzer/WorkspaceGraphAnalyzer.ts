import * as fs from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';
import * as vscode from 'vscode';
import { DependencyGraph, DependencyGraphEdge, FileReference } from '../types';
import { getWorkspaceRelativePath, resolveFileReference } from '../utils/pathUtils';

const maxWorkspaceFilesToScan = 300;
const maxEdgesToReturn = 600;

export class WorkspaceGraphAnalyzer {
  private readonly project = new Project();

  public async analyze(): Promise<DependencyGraph> {
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
      '**/{node_modules,dist,build,out,.git}/**',
      maxWorkspaceFilesToScan
    );
    const nodesByPath = new Map<string, FileReference>();
    const edges: DependencyGraphEdge[] = [];
    let truncated = files.length >= maxWorkspaceFilesToScan;

    for (const file of files) {
      const currentFile = createFileReference(file.fsPath);
      nodesByPath.set(normalizePath(currentFile.filePath), currentFile);

      for (const dependency of this.getDependencies(currentFile.filePath)) {
        nodesByPath.set(normalizePath(dependency.filePath), dependency);
        edges.push({
          from: currentFile,
          to: dependency,
        });

        if (edges.length >= maxEdgesToReturn) {
          truncated = true;
          break;
        }
      }

      if (edges.length >= maxEdgesToReturn) {
        break;
      }
    }

    return {
      nodes: Array.from(nodesByPath.values()),
      edges,
      truncated,
    };
  }

  private getDependencies(filePath: string): FileReference[] {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const sourceFile = this.project.createSourceFile(filePath, text, {
        overwrite: true,
      });

      return sourceFile.getImportDeclarations()
        .map((importDeclaration) => importDeclaration.getModuleSpecifierValue())
        .filter((value) => value.startsWith('./') || value.startsWith('../'))
        .map((value) => resolveFileReference(filePath, value))
        .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath))
        .map(createFileReference);
    } catch {
      return [];
    }
  }
}

export const getGraphNeighborhood = (
  graph: DependencyGraph,
  filePath: string
): DependencyGraph => {
  const normalizedFilePath = normalizePath(filePath);
  const edges = graph.edges.filter((edge) =>
    normalizePath(edge.from.filePath) === normalizedFilePath ||
    normalizePath(edge.to.filePath) === normalizedFilePath
  );
  const nodesByPath = new Map<string, FileReference>();

  for (const edge of edges) {
    nodesByPath.set(normalizePath(edge.from.filePath), edge.from);
    nodesByPath.set(normalizePath(edge.to.filePath), edge.to);
  }

  return {
    nodes: Array.from(nodesByPath.values()),
    edges,
    truncated: graph.truncated,
  };
};

const createFileReference = (filePath: string): FileReference => ({
  filePath,
  relativePath: getWorkspaceRelativePath(filePath),
});

const normalizePath = (filePath: string): string => {
  return path.normalize(filePath).toLowerCase();
};
