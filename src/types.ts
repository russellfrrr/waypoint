export type ExportedDeclaration = {
  name: string;
  kind: string;
}

export type AnalysisStatus = 'parsed' | 'unsupported' | 'too-large';

export type FileAnalysisResult = {
  fileName: string;
  filePath: string;
  relativePath: string;
  languageId: string;
  lineCount: number;
  imports: string[];
  exports: ExportedDeclaration[];
  incomingDependents: string[];
  analysisStatus: AnalysisStatus;
};