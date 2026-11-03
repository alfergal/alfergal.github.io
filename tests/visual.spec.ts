import { test, expect } from './support/site';
import { palette } from '../src/data/theme';

const rgb = (hex: string) =>
	`rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

test('the new palette and system serif stack apply consistently without font downloads', async ({
	page,
}) => {
	const fontRequests: string[] = [];
	page.on('request', (request) => {
		if (/\.(?:woff2?|ttf|otf)(?:\?|$)/.test(request.url()))
			fontRequests.push(request.url());
	});
	await page.goto('/');
	for (const [name, color] of Object.entries(palette)) {
		expect(
			await page
				.locator('html')
				.evaluate(
					(el, name) =>
						getComputedStyle(el).getPropertyValue(`--palette-${name}`).trim(),
					name,
				),
		).toBe(color);
	}
	for (const selector of [
		'body',
		'.hero h1',
		'.hero-role',
		'.hero-description',
		'.footer-links a',
		'.section-heading',
		'.article-meta',
		'.site-footer',
	]) {
		await expect(page.locator(selector).first()).toHaveCSS(
			'font-family',
			'Cambria, Caladea, Georgia, serif',
		);
	}
	await expect(page.locator('meta[name=theme-color]')).toHaveAttribute(
		'content',
		palette.background,
	);
	await expect(page.locator('body')).toHaveCSS(
		'background-color',
		rgb(palette.background),
	);
	await expect(page.locator('.hero-links')).toHaveCount(0);
	await expect(page.locator('.hero-alias')).toHaveCount(0);
	expect(fontRequests).toEqual([]);
});

test('graph colors change while geometry and physics remain covered by the original regression tests', async ({
	page,
}) => {
	await page.goto('/');
	await expect(page.locator('.graph-edge').first()).toHaveCSS(
		'stroke',
		rgb(palette.blue),
	);
	const colors = await page
		.locator('.graph-dot')
		.evaluateAll((dots) =>
			[...new Set(dots.map((dot) => getComputedStyle(dot).fill))].sort(),
		);
	expect(colors).toEqual(
		[rgb(palette.blue), rgb(palette.pink), rgb(palette.white)].sort(),
	);
});

test('the article keeps monospace code and syntax colors within the new palette', async ({
	page,
	site,
}) => {
	const demo = site.entries.find(
		(entry) => entry.id === 'demostracion-articulo-tecnico',
	);
	test.skip(
		!demo,
		'The editorial demonstration may eventually be replaced by real articles.',
	);
	await page.goto(`/blog/${demo!.id}/`);
	await expect(page.locator('h1')).toHaveCSS(
		'font-family',
		'Cambria, Caladea, Georgia, serif',
	);
	await expect(page.locator('.prose')).toHaveCSS(
		'font-family',
		'Cambria, Caladea, Georgia, serif',
	);
	await expect(page.locator('pre code').first()).toHaveCSS(
		'font-family',
		/monospace/,
	);
	const colors = await page
		.locator('pre span[style*="color"]')
		.evaluateAll((spans) => [
			...new Set(spans.map((span) => getComputedStyle(span).color)),
		]);
	for (const color of colors)
		expect([
			rgb(palette.white),
			rgb(palette.blue),
			rgb(palette.pink),
		]).toContain(color);
	await expect(page.locator('.katex-error')).toHaveCount(0);
	await expect(page.locator('.katex-display')).toBeVisible();
});

test('the development demonstration exercises all callouts and five named code languages without public content', async ({
	page,
	site,
}) => {
	const demo = site.entries.find(
		(entry) => entry.id === 'demostracion-articulo-tecnico',
	);
	test.skip(
		!demo,
		'The editorial demonstration can be replaced with a real article.',
	);
	expect(demo!.draft).toBe(true);
	await page.goto(`/blog/${demo!.id}/`);
	for (const kind of [
		'note',
		'important',
		'warning',
		'tip',
		'result',
		'limitation',
	]) {
		await expect(page.locator(`.callout[data-kind="${kind}"]`)).toBeVisible();
	}
	expect(
		await page
			.locator('pre[data-language]')
			.evaluateAll((blocks) =>
				blocks.map((block) => block.getAttribute('data-language')),
			),
	).toEqual(['python', 'sql', 'bash', 'typescript', 'json']);
	await expect(page.locator('.code-toolbar button')).toHaveCount(5);
	await expect(page.locator('.article-toc')).toBeVisible();
	await expect(page.locator('meta[name=robots]')).toHaveAttribute(
		'content',
		/noindex/,
	);
	await expect(page.locator('.reading-progress')).toHaveCount(1);
	expect(
		(
			await page.request.get(`${site.productionURL}/blog/${demo!.id}/`)
		).status(),
	).toBe(404);
});
