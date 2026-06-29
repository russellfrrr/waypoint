export type ExportedDeclaration = {
  name: string;
  kind: string;
}

export type FileAnalysisResult = {
  fileName: string;
  filePath: string;
  languageId: string;
  lineCount: number;
  imports: string[];
  exports: ExportedDeclaration[];
};