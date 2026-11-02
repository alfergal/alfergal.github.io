import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
const execute = promisify(execFile);

test('all environment variants and generated artifacts are ignored; only the sanitized example is allowed', async () => {
	const ignored = [
		'.env',
		'.env.local',
		'.env.production',
		'.env.development',
		'.env.test',
		'.env.production.local',
		'.envrc',
		'.env.example.backup',
		'src/.env.local',
		'public/.env.production',
		'node_modules/package/index.js',
		'dist/index.html',
		'.astro/content.json',
		'.qa/graph-rest.png',
		'test-results/result.json',
		'playwright-report/index.html',
		'editing.tmp',
		'editing.swp',
		'editing~',
		'src/content/blog/qa-verification-leftover.mdx',
	];
	const { stdout } = await execute('git', [
		'check-ignore',
		'--no-index',
		...ignored,
	]);
	expect(stdout.trim().split('\n').sort()).toEqual([...ignored].sort());
	const result = await execute('git', [
		'check-ignore',
		'--no-index',
		'.env.example',
	])
		.then(() => 0)
		.catch((error: { code: number }) => error.code);
	expect(result).toBe(1);
	expect(await readFile('.env.example', 'utf8')).not.toMatch(
		/^[A-Z_]+\s*=\s*\S+/m,
	);
});

test('Git candidates, staged changes and public assets contain no detected secrets or forbidden files', async () => {
	const { stdout } = await execute(process.execPath, [
		'scripts/check-repository.mjs',
	]);
	expect(stdout).toContain('Repository checks passed');
});

test('project is private and background startup instructions agree', async () => {
	const pkg = JSON.parse(await readFile('package.json', 'utf8'));
	const launch = JSON.parse(await readFile('.vscode/launch.json', 'utf8'));
	expect(pkg.private).toBe(true);
	expect(pkg.scripts.dev).toBe('astro dev --background');
	expect(launch.configurations[0].command).toBe('npm run dev');
	for (const file of ['README.md', 'AGENTS.md'])
		expect(await readFile(file, 'utf8')).toContain('npm run dev');
});
