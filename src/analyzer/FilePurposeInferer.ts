import * as path from 'path';
import { FilePurpose, StaticFileAnalysis } from '../types';

type PurposeSignal = {
  summary: string;
  evidence: string;
  strength: number;
};

const weakPurpose: FilePurpose = {
  summary: 'No strong file purpose inferred from static signals.',
  confidence: 'low',
  evidence: ['Static signals were too generic or limited.'],
};

export class FilePurposeInferer {
  public infer(staticAnalysis: Omit<StaticFileAnalysis, 'purpose'>): FilePurpose {
    const signals = [
      getFolderSignal(staticAnalysis),
      getExportShapeSignal(staticAnalysis),
      getReuseSignal(staticAnalysis),
      getFileNameSignal(staticAnalysis),
    ].filter((signal): signal is PurposeSignal => Boolean(signal));

    if (signals.length === 0) {
      return weakPurpose;
    }

    const strongestSignal = signals.reduce((best, signal) =>
      signal.strength > best.strength ? signal : best
    );

    return {
      summary: strongestSignal.summary,
      confidence: getConfidence(signals),
      evidence: signals.map((signal) => signal.evidence),
    };
  }
}

const getFolderSignal = (
  staticAnalysis: Omit<StaticFileAnalysis, 'purpose'>
): PurposeSignal | undefined => {
  const folderParts = staticAnalysis.relativePath
    .split(/[\\/]/)
    .slice(0, -1)
    .map((part) => part.toLowerCase());

  const folderName = folderParts.at(-1);

  if (!folderName) {
    return undefined;
  }

  if (['components'].includes(folderName)) {
    return {
      summary: 'Appears to define a UI component or component-related module.',
      evidence: `Located in ${folderName} folder.`,
      strength: 3,
    };
  }

  if (['api', 'controllers'].includes(folderName)) {
    return {
      summary: 'Appears to handle API or request/response logic.',
      evidence: `Located in ${folderName} folder.`,
      strength: 3,
    };
  }

  if (['services'].includes(folderName)) {
    return {
      summary: 'Appears to manage shared application state.',
      evidence: `Located in ${folderName} folder.`,
      strength: 3,
    };
  }

  if (['hooks'].includes(folderName)) {
    return {
      summary: 'Appears to define reusable hook logic.',
      evidence: `Located in ${folderName} folder.`,
      strength: 2,
    };
  }

  if (['models', 'schemas', 'types'].includes(folderName)) {
    return {
      summary: 'Appears to define data shapes, schemas, or type contracts.',
      evidence: `Located in ${folderName} folder.`,
      strength: 3,
    };
  }

  if (['repositories'].includes(folderName)) {
    return {
      summary: 'Appears to handle persistence or data-access logic.',
      evidence: `Located in ${folderName} folder.`,
      strength: 3,
    };
  }

  if (['middleware'].includes(folderName)) {
    return {
      summary: 'Appears to define middleware or request pipeline logic.',
      evidence: `Located in ${folderName} folder.`,
      strength: 3,
    };
  }

  if (folderParts.some((part) => ['tests', '__tests__'].includes(part))) {
    return {
      summary: 'Appears to contain tests or test support code.',
      evidence: 'Located in a test-related folder.',
      strength: 3,
    };
  }

  return undefined;
};

const getExportShapeSignal = (
  staticAnalysis: Omit<StaticFileAnalysis, 'purpose'>
): PurposeSignal | undefined => {
  const exports = staticAnalysis.exports;

  if (exports.length === 0) {
    return undefined;
  }

  const typeLikeExports = exports.filter((item) =>
    ['type', 'interface'].includes(item.kind)
  );

  if (typeLikeExports.length === exports.length) {
    return {
      summary: 'Appears to define shared type contracts or data shapes.',
      evidence: `Exports ${exports.map((item) => `${item.name} (${item.kind})`).join(', ')}.`,
      strength: 3,
    };
  }

  if (exports.some((item) => item.kind === 'class')) {
    return {
      summary: 'Appears to define class-based behavior or an object abstraction.',
      evidence: `Exports ${exports.map((item) => `${item.name} (${item.kind})`).join(', ')}.`,
      strength: 2,
    };
  }

  if (exports.some((item) => item.kind === 'function' || item.kind === 'const')) {
    return {
      summary: 'Appears to provide reusable functions or values.',
      evidence: `Exports ${exports.map((item) => `${item.name} (${item.kind})`).join(', ')}.`,
      strength: 2,
    };
  }

  return undefined;
};

const getReuseSignal = (
  staticAnalysis: Omit<StaticFileAnalysis, 'purpose'>
): PurposeSignal | undefined => {
  const dependentCount = staticAnalysis.incomingDependents.length;

  if (dependentCount >= 10) {
    return {
      summary: 'Appears to be a widely reused module in this codebase.',
      evidence: `Used by ${dependentCount} files.`,
      strength: 3,
    };
  }

  if (dependentCount >= 3) {
    return {
      summary: 'Appears to be reused by multiple files.',
      evidence: `Used by ${dependentCount} files.`,
      strength: 2,
    };
  }

  return undefined;
};

const getFileNameSignal = (
  staticAnalysis: Omit<StaticFileAnalysis, 'purpose'>
): PurposeSignal | undefined => {
  const baseName = path.basename(staticAnalysis.fileName, path.extname(staticAnalysis.fileName)).toLowerCase();

  if (baseName === 'index') {
    return {
      summary: 'Appears to be an index or barrel module that gathers exports.',
      evidence: 'Filename is index.',
      strength: 2,
    };
  }

  if (baseName.includes('config')) {
    return {
      summary: 'Appears to define configuration values or setup.',
      evidence: `Filename includes "${baseName}".`,
      strength: 2,
    };
  }

  if (baseName.includes('schema')) {
    return {
      summary: 'Appears to define schema or validation-related logic.',
      evidence: `Filename includes "${baseName}".`,
      strength: 2,
    };
  }

  if (baseName.includes('store')) {
    return {
      summary: 'Appears to manage application state or store logic.',
      evidence: `Filename includes "${baseName}".`,
      strength: 2,
    };
  }

  if (baseName.includes('service')) {
    return {
      summary: 'Appears to contain service-layer logic.',
      evidence: `Filename includes "${baseName}".`,
      strength: 2,
    };
  }

  return undefined;
};

const getConfidence = (signals: PurposeSignal[]): FilePurpose['confidence'] => {
  const totalStrength = signals.reduce((sum, signal) => sum + signal.strength, 0);

  if (totalStrength >= 6) {
    return 'high';
  }

  if (totalStrength >= 3) {
    return 'medium';
  }

  return 'low';
};
