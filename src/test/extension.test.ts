import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileAnalyzer } from '../analyzer/FileAnalyzer';
import { parseGitLog } from '../analyzer/GitActivityAnalyzer';
import { getGraphNeighborhood } from '../analyzer/WorkspaceGraphAnalyzer';
import { DependencyGraph, FileAnalysisResult, GitActivity } from '../types';
import { resolveFileReference } from '../utils/pathUtils';
import { isImportOrExportReference } from '../utils/referenceUtils';
import { getWebviewHtml } from '../views/WaypointWebviewViewProvider';

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

suite('Reference Utilities', () => {
	const createDocument = async (content: string): Promise<vscode.TextDocument> => {
		return vscode.workspace.openTextDocument({
			content,
			language: 'typescript',
		});
	};

	const getRangeForText = (
		document: vscode.TextDocument,
		text: string
	): vscode.Range => {
		const startOffset = document.getText().indexOf(text);

		assert.notStrictEqual(startOffset, -1);

		const start = document.positionAt(startOffset);
		const end = document.positionAt(startOffset + text.length);

		return new vscode.Range(start, end);
	};

	test('detects import declarations', async () => {
		const document = await createDocument("import { Parser } from './parser';");
		const range = getRangeForText(document, "'./parser'");

		assert.strictEqual(isImportOrExportReference(document, range), true);
	});

	test('detects named export declarations', async () => {
		const document = await createDocument("export { Parser } from './parser';");
		const range = getRangeForText(document, "'./parser'");

		assert.strictEqual(isImportOrExportReference(document, range), true);
	});

	test('detects export-all declarations', async () => {
		const document = await createDocument("export * from './parser';");
		const range = getRangeForText(document, "'./parser'");

		assert.strictEqual(isImportOrExportReference(document, range), true);
	});

	test('ignores random relative strings', async () => {
		const document = await createDocument("const randomPath = './parser';");
		const range = getRangeForText(document, "'./parser'");

		assert.strictEqual(isImportOrExportReference(document, range), false);
	});
});

suite('File Analyzer', () => {
	let tempDirectory: string;
	let currentFilePath: string;

	setup(() => {
		tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-'));
		currentFilePath = path.join(tempDirectory, 'symbols.ts');

		fs.writeFileSync(currentFilePath, [
			'export const makeParser = <T>(value: T): T => value;',
			'export class UserService {',
			'  login(): void {}',
			'  logout(): void {}',
			'}',
		].join('\n'));
	});

	teardown(() => {
		fs.rmSync(tempDirectory, { recursive: true, force: true });
	});

	test('extracts useful details for exported symbols', async () => {
		const analyzer = new FileAnalyzer();
		const result = await analyzer.analyzeFile(currentFilePath);
		const exports = result.staticAnalysis.exports;

		const makeParserExport = exports.find((item) => item.name === 'makeParser');
		const userServiceExport = exports.find((item) => item.name === 'UserService');

		assert.ok(makeParserExport);
		assert.ok(userServiceExport);
		assert.deepStrictEqual(makeParserExport.details, [
			'signature: makeParser<T>(value: T): T',
		]);
		assert.deepStrictEqual(userServiceExport.details, [
			'methods: login, logout',
		]);
	});
});

suite('Deep Analysis Webview', () => {
	const createResult = (): FileAnalysisResult => ({
		staticAnalysis: {
			fileName: '<script>alert("x")</script>.ts',
			filePath: path.join('C:', 'project', 'src', 'parser.ts'),
			relativePath: 'src/parser.ts',
			languageId: 'typescript',
			lineCount: 12,
			purpose: {
				summary: 'Appears to provide parser helpers.',
				confidence: 'medium',
				evidence: ['Exports parse (function).'],
			},
			imports: ['./types'],
			outgoingDependencies: [
				{
					filePath: path.join('C:', 'project', 'src', 'types.ts'),
					relativePath: 'src/types.ts',
				},
			],
			exports: [
				{
					name: 'parse',
					kind: 'function',
					details: ['signature: parse(value: string): Parser'],
				},
			],
			incomingDependents: [],
			impactLevel: 'low',
			analysisStatus: 'parsed',
		},
	});

	test('renders a report with escaped analysis details', () => {
		const html = getWebviewHtml('ready', createResult(), undefined, createGraph(), createGitActivity());

		assert.ok(html.includes('Waypoint Deep Analysis'));
		assert.ok(html.includes('Likely Purpose'));
		assert.ok(html.includes('Depends On'));
		assert.ok(html.includes('Dependency Graph'));
		assert.ok(html.includes('Commit Activity'));
		assert.ok(html.includes('signature: parse(value: string): Parser'));
		assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;.ts'));
		assert.strictEqual(html.includes('<script>alert("x")</script>.ts'), false);
	});

	test('renders an empty state without an analysis result', () => {
		const html = getWebviewHtml('empty', undefined);

		assert.ok(html.includes('Open a file to see Waypoint analysis.'));
		assert.ok(html.includes('Select a JavaScript or TypeScript file'));
	});

	const createGraph = (): DependencyGraph => ({
		nodes: [
			{
				filePath: path.join('C:', 'project', 'src', 'parser.ts'),
				relativePath: 'src/parser.ts',
			},
			{
				filePath: path.join('C:', 'project', 'src', 'types.ts'),
				relativePath: 'src/types.ts',
			},
		],
		edges: [
			{
				from: {
					filePath: path.join('C:', 'project', 'src', 'parser.ts'),
					relativePath: 'src/parser.ts',
				},
				to: {
					filePath: path.join('C:', 'project', 'src', 'types.ts'),
					relativePath: 'src/types.ts',
				},
			},
		],
		truncated: false,
	});

	const createGitActivity = (): GitActivity => ({
		days: [
			{ date: '2026-07-01', commits: 2 },
			{ date: '2026-07-02', commits: 1 },
		],
		topChangedFiles: [
			{ relativePath: 'src/parser.ts', changes: 3 },
		],
		available: true,
	});
});

suite('Workspace Graph Analyzer', () => {
	test('returns only edges connected to the target file', () => {
		const targetFilePath = path.join('C:', 'project', 'src', 'target.ts');
		const unrelatedFilePath = path.join('C:', 'project', 'src', 'unrelated.ts');
		const graph: DependencyGraph = {
			nodes: [],
			edges: [
				{
					from: { filePath: targetFilePath, relativePath: 'src/target.ts' },
					to: { filePath: path.join('C:', 'project', 'src', 'dep.ts'), relativePath: 'src/dep.ts' },
				},
				{
					from: { filePath: unrelatedFilePath, relativePath: 'src/unrelated.ts' },
					to: { filePath: path.join('C:', 'project', 'src', 'other.ts'), relativePath: 'src/other.ts' },
				},
			],
			truncated: false,
		};

		const neighborhood = getGraphNeighborhood(graph, targetFilePath);

		assert.strictEqual(neighborhood.edges.length, 1);
		assert.strictEqual(neighborhood.nodes.length, 2);
	});
});

suite('Git Activity Analyzer', () => {
	test('parses commits by day and top changed files', () => {
		const activity = parseGitLog([
			'commit:2026-07-01',
			'src/a.ts',
			'src/b.ts',
			'commit:2026-07-01',
			'src/a.ts',
			'commit:2026-07-02',
			'src/c.ts',
		].join('\n'));

		assert.deepStrictEqual(activity.days, [
			{ date: '2026-07-01', commits: 2 },
			{ date: '2026-07-02', commits: 1 },
		]);
		assert.strictEqual(activity.topChangedFiles[0].relativePath, 'src/a.ts');
		assert.strictEqual(activity.topChangedFiles[0].changes, 2);
	});
});
