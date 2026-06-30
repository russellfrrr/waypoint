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
		`Incoming Dependents: ${result.incomingDependents.length}`,
		`Impact: ${formatImpactLevel(result.impactLevel)}`,
		'',
		'Imports',
		'-------',
		...formatList(result.imports),
		'',
		'Exports',
		'-------',
		...formatExportList(result.exports),
		'',
		'Imported By',
		'-----------',
		...formatList(result.incomingDependents),
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

const formatImpactLevel = (impactLevel: FileAnalysisResult['impactLevel']): string => {
	if (impactLevel === 'high') {
		return 'High';
	}

	if (impactLevel === 'medium') {
		return 'Medium';
	}

	return 'Low';
};