export type ExportedDeclaration = {
  name: string;
  kind: string;
};

export type AnalysisStatus = 'parsed' | 'unsupported' | 'too-large';
export type ImpactLevel = 'low' | 'medium' | 'high';

export type StaticFileAnalysis = {
  fileName: string;
  filePath: string;
  relativePath: string;
  languageId: string;
  lineCount: number;
  imports: string[];
  exports: ExportedDeclaration[];
  incomingDependents: string[];
  impactLevel: ImpactLevel;
  analysisStatus: AnalysisStatus;
};

export type AiInsight = {
  summary: string;
  responsibilities: string[];
  changeRisk: string;
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
};

export type FileAnalysisResult = {
  staticAnalysis: StaticFileAnalysis;
  aiInsight?: AiInsight;
};
