export type FileAnalysisResult = {
  fileName: string;
  filePath: string;
  languageId: string;
  lineCount: number;
  imports: string[];
  exports: string[];
};