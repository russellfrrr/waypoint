import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { GitActivity } from '../types';

const execFileAsync = promisify(execFile);
const maxRecentCommits = 80;

export class GitActivityAnalyzer {
  public async analyze(): Promise<GitActivity> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return {
        days: [],
        topChangedFiles: [],
        available: false,
        error: 'No workspace folder is open.',
      };
    }

    try {
      const { stdout } = await execFileAsync('git', [
        'log',
        `-${maxRecentCommits}`,
        '--date=short',
        '--pretty=format:commit:%ad',
        '--name-only',
      ], {
        cwd: workspaceFolder.uri.fsPath,
      });

      return parseGitLog(stdout);
    } catch (error) {
      return {
        days: [],
        topChangedFiles: [],
        available: false,
        error: error instanceof Error ? error.message : 'Git activity is unavailable.',
      };
    }
  }
}

export const parseGitLog = (value: string): GitActivity => {
  const commitsByDay = new Map<string, number>();
  const fileChanges = new Map<string, number>();

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('commit:')) {
      const date = line.replace('commit:', '');
      commitsByDay.set(date, (commitsByDay.get(date) ?? 0) + 1);
      continue;
    }

    fileChanges.set(line, (fileChanges.get(line) ?? 0) + 1);
  }

  return {
    days: Array.from(commitsByDay.entries())
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topChangedFiles: Array.from(fileChanges.entries())
      .map(([relativePath, changes]) => ({ relativePath, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 8),
    available: true,
  };
};
