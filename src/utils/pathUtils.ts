import * as path from 'path';
import * as fs from 'fs';

const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];

export const resolveFileReference = (
  currentFilePath: string,
  fileReference: string,
): string | undefined => {
  const currentDirectory = path.dirname(currentFilePath);
  const basePath = path.resolve(currentDirectory, fileReference);

  for (const extension of supportedExtensions) {
    const filePath = `${basePath}${extension}`;

    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  return undefined;
};