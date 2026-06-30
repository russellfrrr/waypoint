import { FileAnalysisResult } from '../types';

export const formatAnalysisResult = (result: FileAnalysisResult): string => {
	const staticAnalysis = result.staticAnalysis;

	const lines = [
		'Waypoint Analysis',
		'=================',
		'',
		'Static Analysis',
		'---------------',
		`File: ${staticAnalysis.fileName}`,
		`Path: ${staticAnalysis.relativePath}`,
		`Language: ${staticAnalysis.languageId}`,
		`Lines: ${staticAnalysis.lineCount}`,
		`Status: ${staticAnalysis.analysisStatus}`,
		`Incoming Dependents: ${staticAnalysis.incomingDependents.length}`,
		`Impact: ${formatImpactLevel(staticAnalysis.impactLevel)}`,
		'',
		'Imports',
		'-------',
		...formatList(staticAnalysis.imports),
		'',
		'Exports',
		'-------',
		...formatExportList(staticAnalysis.exports),
		'',
		'Imported By',
		'-----------',
		...formatList(staticAnalysis.incomingDependents),
		'',
		'AI Insight',
		'----------',
		'Not available yet.',
	];

	return lines.join('\n');
};

const formatList = (items: string[]): string[] => {
	if (items.length === 0) {
		return ['- None'];
	}

	return items.map((item) => `- ${item}`);
};

const formatExportList = (items: FileAnalysisResult['staticAnalysis']['exports']): string[] => {
	if (items.length === 0) {
		return ['- None'];
	}

	return items.map((item) => `- ${item.name} (${item.kind})`);
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
