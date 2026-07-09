export type ExportedDeclaration = {
  name: string;
  kind: string;
  details: string[];
};

export type FileReference = {
  filePath: string;
  relativePath: string;
};

export type FilePurpose = {
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
};

export type AnalysisStatus = 'parsed' | 'unsupported' | 'too-large';
export type ImpactLevel = 'low' | 'medium' | 'high';

export type StaticFileAnalysis = {
  fileName: string;
  filePath: string;
  relativePath: string;
  languageId: string;
  lineCount: number;
  purpose: FilePurpose;
  imports: string[];
  outgoingDependencies: FileReference[];
  exports: ExportedDeclaration[];
  incomingDependents: FileReference[];
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

export type DependencyGraphNode = {
  filePath: string;
  relativePath: string;
};

export type DependencyGraphEdge = {
  from: FileReference;
  to: FileReference;
};

export type DependencyGraph = {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  truncated: boolean;
};

export type GitActivityDay = {
  date: string;
  commits: number;
};

export type GitChangedFile = {
  relativePath: string;
  changes: number;
};

export type GitActivity = {
  days: GitActivityDay[];
  topChangedFiles: GitChangedFile[];
  available: boolean;
  error?: string;
};

export type FileAnalysisResult = {
  staticAnalysis: StaticFileAnalysis;
  aiInsight?: AiInsight;
};
