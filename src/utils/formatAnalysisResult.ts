import { FileAnalysisResult } from '../types';

export const formatAnalysisResult = (result: FileAnalysisResult): string => {
	const lines = [
		'Waypoint Analysis',
		'',
		`File: ${result.fileName}`,
		`Path: ${result.filePath}`,
		`Language: ${result.languageId}`,
		`Lines: ${result.lineCount}`,
		'',
		'Imports:',
		...formatList(result.imports),
		'',
		'Exports:',
		...formatList(result.exports),
	];

	return lines.join('\n');
};

const formatList = (items: string[]): string[] => {
	if (items.length === 0) {
		return ['- None'];
	}

	return items.map((item) => `- ${item}`);
};