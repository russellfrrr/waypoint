import * as vscode from 'vscode';
import { FileAnalysisResult } from '../types';

export const formatResolvedHoverResult = (
  fileReference: string,
  result: FileAnalysisResult
): vscode.MarkdownString => {
  const markdown = new vscode.MarkdownString();
  markdown.isTrusted = true;

  markdown.appendMarkdown('**Waypoint File Reference**\n\n');
  markdown.appendMarkdown(`\`${fileReference}\` -> \`${result.fileName}\`\n\n`);
  markdown.appendMarkdown(`Path: \`${result.relativePath}\`\n\n`);
  markdown.appendMarkdown(`[Open referenced file](command:waypoint.openFile?${encodeCommandArgument(result.filePath)})\n\n`);
  markdown.appendMarkdown(`Lines: ${result.lineCount}\n\n`);

  if (result.analysisStatus === 'too-large') {
    markdown.appendMarkdown('Waypoint resolved this file, but it is too large to analyze.');
    return markdown;
  }

  if (result.analysisStatus === 'unsupported') {
    markdown.appendMarkdown(
      'Waypoint resolved this file, but it is not a JavaScript or TypeScript source file.'
    );
    return markdown;
  }

  markdown.appendMarkdown('**Imports**\n\n');
  markdown.appendMarkdown(formatList(result.imports).join('\n'));
  markdown.appendMarkdown('\n\n');

  markdown.appendMarkdown('**Exports**\n\n');
  markdown.appendMarkdown(formatExportList(result.exports).join('\n'));
  markdown.appendMarkdown('\n\n');

  markdown.appendMarkdown('**Imported By**\n\n');
  markdown.appendMarkdown(formatList(result.incomingDependents).join('\n'));

  return markdown;
};

export const formatUnresolvedHoverResult = (
  fileReference: string
): vscode.MarkdownString => {
  const markdown = new vscode.MarkdownString();
  markdown.isTrusted = true;

  markdown.appendMarkdown('**Waypoint File Reference**\n\n');
  markdown.appendMarkdown(`\`${fileReference}\`\n\n`);
  markdown.appendMarkdown('Resolved: not found');

  return markdown;
};

export const formatErrorHoverResult = (
  fileReference: string
): vscode.MarkdownString => {
  const markdown = new vscode.MarkdownString();

  markdown.appendMarkdown('**Waypoint File Reference**\n\n');
  markdown.appendMarkdown(`\`${fileReference}\`\n\n`);
  markdown.appendMarkdown('Could not analyze this file.');

  return markdown;
};

const encodeCommandArgument = (value: string): string => {
  return encodeURIComponent(JSON.stringify(value));
};

const formatList = (items: string[]): string[] => {
  if (items.length === 0) {
    return ['- None'];
  }

  return items.map((item) => `- ${item}`);
};

const formatExportList = (items: FileAnalysisResult['exports']): string[] => {
  if (items.length === 0) {
    return ['- None'];
  }

  return items.map((item) => `- ${item.name} (${item.kind})`);
};
