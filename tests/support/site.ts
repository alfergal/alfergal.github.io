import { test as base, expect } from '@playwright/test';
import {
	cp,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	symlink,
} from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { slug } from 'github-slugger';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const execute = promisify(execFile);
export const repository = process.cwd();
const astroPackage = JSON.parse(
	readFileSync(join(repository, 'node_modules/astro/package.json'), 'utf8'),
) as { bin: { astro: string } };
const cli = join(repository, 'node_modules/astro', astroPackage.bin.astro);
export interface Entry {
	id: string;
	title: string;
	category: string;
	tags: string[];
	draft: boolean;
	date: number;
}
export async function readEntries(root: string): Promise<Entry[]> {
	const directory = join(root, 'src/content/blog');
	const files = await readdir(directory, { recursive: true });
	return (
		await Promise.all(
			files
				.filter((file) => /\.(md|mdx)$/.test(file))
				.map(async (file) => {
					const { frontmatter: data } = parseFrontmatter(
						await readFile(join(directory, file), 'utf8'),
					);
					return {
						// Match Astro's glob-loader default slug generation, including nested files.
						id: data.slug
							? String(data.slug)
							: file
									.replace(/\\/g, '/')
									.replace(/\.(md|mdx)$/, '')
									.split('/')
									.map((part) => slug(part))
									.join('/')
									.replace(/\/index$/, ''),
						title: String(data.title),
						category: String(data.category),
						tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
						draft: data.draft !== false,
						date: new Date(data.pubDate).valueOf(),
					};
				}),
		)
	).sort((a, b) => b.date - a.date || a.id.localeCompare(b.id));
}
export interface TestSite {
	root: string;
	output: string;
	baseURL: string;
	productionURL: string;
	entries: Entry[];
	fixtureOnly: boolean;
}
export async function runAstro(root: string, ...args: string[]) {
	try {
		return await execute(process.execPath, [cli, ...args], {
			cwd: root,
			timeout: 60_000,
			maxBuffer: 2 * 1024 * 1024,
			env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
		});
	} catch (error) {
		const failure = error as Error & { stdout?: string; stderr?: string };
		throw new Error(
			`Astro ${args.join(' ')} failed in the isolated test project:\n${failure.stdout ?? ''}\n${failure.stderr ?? ''}`,
			{ cause: error },
		);
	}
}

async function withSite(
	fixtureOnly: boolean,
	use: (site: TestSite) => Promise<void>,
) {
	// No source, build or runtime state is shared with the editorial project.
	const root = await mkdtemp(join(tmpdir(), 'alfergal-test-'));
	const started: ('dev' | 'preview')[] = [];
	try {
		await cp(join(repository, 'src'), join(root, 'src'), {
			recursive: true,
			filter: (source) =>
				!fixtureOnly ||
				!relative(join(repository, 'src'), source)
					.replace(/\\/g, '/')
					.startsWith('content/blog'),
		});
		await cp(join(repository, 'public'), join(root, 'public'), {
			recursive: true,
		});
		for (const file of ['astro.config.mjs', 'package.json', 'tsconfig.json'])
			await cp(join(repository, file), join(root, file));
		await symlink(
			join(repository, 'node_modules'),
			join(root, 'node_modules'),
			'dir',
		);
		if (fixtureOnly) {
			await mkdir(join(root, 'src/content/blog'), { recursive: true });
			await cp(
				join(repository, 'tests/fixtures/blog'),
				join(root, 'src/content/blog'),
				{ recursive: true },
			);
		}
		await runAstro(root, 'build');
		const urls: string[] = [];
		for (const command of ['dev', 'preview'] as const) {
			// Record ownership before starting so teardown also covers partial startup failures.
			started.push(command);
			await runAstro(
				root,
				command,
				'--background',
				'--host',
				'127.0.0.1',
				'--port',
				'0',
			);
			const state = JSON.parse(
				await readFile(join(root, `.astro/${command}.json`), 'utf8'),
			) as { url: string };
			urls.push(state.url);
		}
		await use({
			root,
			output: join(root, 'dist'),
			baseURL: urls[0],
			productionURL: urls[1],
			entries: await readEntries(root),
			fixtureOnly,
		});
	} finally {
		const stopped = await Promise.allSettled(
			started.map((command) => runAstro(root, command, 'stop')),
		);
		// Do not remove runtime state if a server could still be running.
		const failures = stopped.filter((result) => result.status === 'rejected');
		if (!failures.length) await rm(root, { recursive: true, force: true });
		else
			throw new Error(
				`Failed to stop an owned test server. Runtime state retained at ${root}.`,
			);
	}
}

export const test = base.extend<{}, { site: TestSite }>({
	site: [
		async ({}, use, workerInfo) =>
			withSite(workerInfo.project.name === 'content', use),
		{ scope: 'worker', timeout: 120_000 },
	],
	baseURL: async ({ site }, use) => use(site.baseURL),
});
export { expect };
