import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) =>
	execFileSync('git', args, {
		cwd: root,
		encoding: 'utf8',
		maxBuffer: 10 * 1024 * 1024,
	});
const files = [
	...new Set(
		git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
			.split('\0')
			.filter(Boolean),
	),
];
const problems = [];
const forbidden =
	/(?:^|\/)(?:node_modules|dist|\.astro|\.qa|test-results|playwright-report)(?:\/|$)|(?:^|\/)\.env(?!\.example$)[^/]*$|\.(?:tmp|swp|pem|key)$|~$/;
const patterns = [
	['private key', /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
	[
		'GitHub token',
		/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
	],
	['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
	[
		'credential literal',
		/(?:api[_-]?key|secret|password|passwd|access[_-]?token)\s*[=:]\s*["'][^"'\s]{8,}["']/i,
	],
	['credential URL', /https?:\/\/[^\s/:]+:[^\s/@]+@/i],
];
function inspect(name, buffer, source) {
	if (buffer.includes(0)) return;
	buffer
		.toString('utf8')
		.split(/\r?\n/)
		.forEach((line, index) => {
			for (const [rule, pattern] of patterns)
				if (pattern.test(line))
					problems.push(`${source}: ${name}:${index + 1}: ${rule}`);
		});
}
for (const file of files) {
	if (forbidden.test(file)) problems.push(`Forbidden Git candidate: ${file}`);
	try {
		inspect(file, await readFile(join(root, file)), 'working tree');
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}
}
// A staged secret must not be hidden by a later safe edit in the working tree.
for (const file of git(
	'diff',
	'--cached',
	'--name-only',
	'--diff-filter=ACMR',
	'-z',
)
	.split('\0')
	.filter(Boolean)) {
	inspect(
		file,
		execFileSync('git', ['show', `:${file}`], {
			cwd: root,
			maxBuffer: 10 * 1024 * 1024,
		}),
		'index',
	);
}
for (const file of git(
	'ls-files',
	'--cached',
	'--ignored',
	'--exclude-standard',
)
	.split('\n')
	.filter(Boolean))
	problems.push(`Ignored but already tracked: ${file}`);
async function walk(directory) {
	return (
		await Promise.all(
			(await readdir(directory, { withFileTypes: true })).map((entry) =>
				entry.isDirectory()
					? walk(join(directory, entry.name))
					: [join(directory, entry.name)],
			),
		)
	).flat();
}
for (const file of await walk(join(root, 'src/content/blog'))) {
	if (/(?:^|\/)qa-verification-/.test(file))
		problems.push(
			`Legacy test fixture in editorial content: ${relative(root, file)}`,
		);
}
for (const file of await walk(join(root, 'public'))) {
	const name = relative(root, file);
	if (/(?:^|\/)\.env[^/]*$|\.(?:pem|key|tmp|swp)$/.test(name))
		problems.push(`Private or temporary public asset: ${name}`);
	inspect(name, await readFile(file), 'public asset');
}
if (problems.length) {
	// Print locations and rule names only; never echo credential values.
	console.error(problems.join('\n'));
	process.exitCode = 1;
} else
	console.log(
		`Repository checks passed (${files.length} tracked/untracked candidates; staged changes and public assets checked).`,
	);
