import { FileAnalysisResult } from '../types';

export const formatAnalysisResult = (result: FileAnalysisResult): string => {
	const lines = [
		'Waypoint Analysis',
		'=================',
		'',
		`File: ${result.fileName}`,
		`Path: ${result.relativePath}`,
		`Language: ${result.languageId}`,
		`Lines: ${result.lineCount}`,
		`Status: ${result.analysisStatus}`,
		'',
		'Imports',
		'-------',
		...formatList(result.imports),
		'',
		'Exports',
		'-------',
		...formatExportList(result.exports),
	];

	return lines.join('\n');
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