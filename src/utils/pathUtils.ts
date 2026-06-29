import * as path from 'path';
import * as fs from 'fs';

const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];

export const resolveFileReference = (
  currentFilePath: string,
  fileReference: string,
): string | undefined => {
  const currentDirectory = path.dirname(currentFilePath);
  const basePath = path.resolve(currentDirectory, fileReference);

  const directFilePath = resolveDirectFilePath(basePath);

  if (directFilePath) {
    return directFilePath;
  }

  return resolveIndexFilePath(basePath);
};

const resolveDirectFilePath = (basePath: string): string | undefined => {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  for (const extension of supportedExtensions) {
    const filePath = `${basePath}${extension}`;

    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return undefined;
};

const resolveIndexFilePath = (basePath: string): string | undefined => {
  for (const extension of supportedExtensions) {
    const filePath = path.join(basePath, `index${extension}`);

    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return undefined;
};