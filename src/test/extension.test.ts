import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveFileReference } from '../utils/pathUtils';

suite('Path Utilities', () => {
	let tempDirectory: string;
	let currentFilePath: string;

	setup(() => {
		tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-'));
		currentFilePath = path.join(tempDirectory, 'src', 'current.ts');

		fs.mkdirSync(path.dirname(currentFilePath), { recursive: true });
		fs.writeFileSync(currentFilePath, '');
	});

	teardown(() => {
		fs.rmSync(tempDirectory, { recursive: true, force: true });
	});

	test('resolves typescript files without extensions', () => {
		const targetPath = path.join(tempDirectory, 'src', 'parser.ts');

		fs.writeFileSync(targetPath, '');

		assert.strictEqual(resolveFileReference(currentFilePath, './parser'), targetPath);
	});

	test('resolves folder index files', () => {
		const targetDirectory = path.join(tempDirectory, 'src', 'components');
		const targetPath = path.join(targetDirectory, 'index.ts');

		fs.mkdirSync(targetDirectory, { recursive: true });
		fs.writeFileSync(targetPath, '');

		assert.strictEqual(resolveFileReference(currentFilePath, './components'), targetPath);
	});

	test('resolves files with explicit extensions', () => {
		const targetPath = path.join(tempDirectory, 'src', 'config.json');

		fs.writeFileSync(targetPath, '{}');

		assert.strictEqual(resolveFileReference(currentFilePath, './config.json'), targetPath);
	});

	test('returns undefined when a file reference cannot be resolved', () => {
		assert.strictEqual(resolveFileReference(currentFilePath, './missing'), undefined);
	});
});