import * as vscode from 'vscode';
import { FileAnalysisResult } from '../types';

export const formatResolvedHoverResult = (
  fileReference: string,
  result: FileAnalysisResult
): vscode.MarkdownString => {
  const markdown = new vscode.MarkdownString();
  const staticAnalysis = result.staticAnalysis;

  markdown.isTrusted = true;

  markdown.appendMarkdown('**Waypoint Quick Insight**\n\n');
  markdown.appendMarkdown(`\`${fileReference}\` -> \`${staticAnalysis.fileName}\`\n\n`);
  markdown.appendMarkdown(`**Path:** \`${staticAnalysis.relativePath}\`\n\n`);
  markdown.appendMarkdown(`**Impact:** ${formatImpactText(staticAnalysis)}\n\n`);
  markdown.appendMarkdown(`**Purpose:** ${staticAnalysis.purpose.summary}\n\n`);
  markdown.appendMarkdown(`**${formatPrimaryExport(staticAnalysis)}**\n\n`);
  markdown.appendMarkdown(`**Stats:** ${formatImportExportCounts(staticAnalysis)}\n\n`);
  markdown.appendMarkdown(`**Used by:** ${formatDependentCount(staticAnalysis.incomingDependents.length)}\n\n`);
  markdown.appendMarkdown(
    `[Open referenced file](command:waypoint.openFile?${encodeCommandArgument(staticAnalysis.filePath)})`
  );

  if (staticAnalysis.analysisStatus === 'too-large') {
    markdown.appendMarkdown('\n\nWaypoint resolved this file, but it is too large to analyze.');
    return markdown;
  }

  if (staticAnalysis.analysisStatus === 'unsupported') {
    markdown.appendMarkdown(
      '\n\nWaypoint resolved this file, but it is not a JavaScript or TypeScript source file.'
    );
    return markdown;
  }

  return markdown;
};

export const formatUnresolvedHoverResult = (
  fileReference: string
): vscode.MarkdownString => {
  const markdown = new vscode.MarkdownString();

  markdown.appendMarkdown('**Waypoint Quick Insight**\n\n');
  markdown.appendMarkdown(`\`${fileReference}\`\n\n`);
  markdown.appendMarkdown('Resolved: not found');

  return markdown;
};

export const formatErrorHoverResult = (
  fileReference: string
): vscode.MarkdownString => {
  const markdown = new vscode.MarkdownString();

  markdown.appendMarkdown('**Waypoint Quick Insight**\n\n');
  markdown.appendMarkdown(`\`${fileReference}\`\n\n`);
  markdown.appendMarkdown('Could not analyze this file.');

  return markdown;
};

const encodeCommandArgument = (value: string): string => {
  return encodeURIComponent(JSON.stringify(value));
};

const formatImpactText = (
  staticAnalysis: FileAnalysisResult['staticAnalysis']
): string => {
  return `${formatImpactLevel(staticAnalysis.impactLevel)} (${formatDependentCount(
    staticAnalysis.incomingDependents.length
  )})`;
};

const formatPrimaryExport = (
  staticAnalysis: FileAnalysisResult['staticAnalysis']
): string => {
  const primaryExport = staticAnalysis.exports[0];

  if (!primaryExport) {
    return 'Primary export: None';
  }

  return `Primary export: ${primaryExport.name} (${primaryExport.kind})`;
};

const formatImportExportCounts = (
  staticAnalysis: FileAnalysisResult['staticAnalysis']
): string => {
  return `${formatCount(staticAnalysis.imports.length, 'import')}, ${formatCount(
    staticAnalysis.outgoingDependencies.length,
    'resolved dependency'
  )}, ${formatCount(
    staticAnalysis.exports.length,
    'export'
  )}`;
};

const formatDependentCount = (count: number): string => {
  return formatCount(count, 'file');
};

const formatCount = (count: number, singularLabel: string): string => {
  const label = count === 1 ? singularLabel : `${singularLabel}s`;

  return `${count} ${label}`;
};

const formatImpactLevel = (
  impactLevel: FileAnalysisResult['staticAnalysis']['impactLevel']
): string => {
  if (impactLevel === 'high') {
    return 'High';
  }

  if (impactLevel === 'medium') {
    return 'Medium';
  }

  return 'Low';
};
