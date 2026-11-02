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
		'.professional-links a',
		'.blog-heading',
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
	await expect(page.locator('.hero-links')).toHaveCSS(
		'border-top-width',
		'0px',
	);
	await expect(page.locator('.blog-section')).toHaveCSS(
		'border-top-width',
		'0px',
	);
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
	await expect(page.locator('pre code')).toHaveCSS('font-family', /monospace/);
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
