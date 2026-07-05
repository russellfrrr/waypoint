import { FileAnalysisResult, FileReference } from '../types';

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
		'Purpose',
		'-------',
		`Likely Purpose: ${staticAnalysis.purpose.summary}`,
		`Confidence: ${formatConfidence(staticAnalysis.purpose.confidence)}`,
		'Evidence:',
		...formatList(staticAnalysis.purpose.evidence),
		'',
		'Imports',
		'-------',
		...formatList(staticAnalysis.imports),
		'',
		'Depends On',
		'----------',
		...formatFileReferenceList(staticAnalysis.outgoingDependencies),
		'',
		'Exports',
		'-------',
		...formatExportList(staticAnalysis.exports),
		'',
		'Imported By',
		'-----------',
		...formatFileReferenceList(staticAnalysis.incomingDependents),
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

	return items.flatMap((item) => [
		`- ${item.name} (${item.kind})`,
		...item.details.map((detail) => `  - ${detail}`),
	]);
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

const formatConfidence = (
	confidence: FileAnalysisResult['staticAnalysis']['purpose']['confidence']
): string => {
	if (confidence === 'high') {
		return 'High';
	}

	if (confidence === 'medium') {
		return 'Medium';
	}

	return 'Low';
};

const formatFileReferenceList = (items: FileReference[]): string[] => {
  if (items.length === 0) {
    return ['- None'];
  }

  return items.map((item) => `- ${item.relativePath}`);
};
