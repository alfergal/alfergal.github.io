import { test, expect } from './support/site';
import { designViolations } from './support/design-policy';
import AxeBuilder from '@axe-core/playwright';

const routes = [
	'/',
	'/en/',
	'/blog/',
	'/en/blog/',
	'/contacto/',
	'/en/contact/',
	'/404.html',
];

for (const width of [320, 768, 1440]) {
	test(`pages and all article previews respect the design rules at ${width}px`, async ({
		page,
		site,
	}) => {
		test.setTimeout(90_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const urls = [
			...routes.map((path) => site.productionURL + path),
			...site.entries.map((entry) => site.baseURL + entry.path),
		];
		for (const url of urls) {
			await page.goto(url);
			// Include expanded native navigation and JS code labels, not just the first screen.
			const summary = page.locator('.article-toc summary');
			if (await summary.count()) await summary.click();
			const code = page.locator('pre.astro-code');
			if (await code.count())
				await expect(page.locator('.code-toolbar')).toHaveCount(
					await code.count(),
				);
			expect(await designViolations(page), url).toEqual([]);
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
				url,
			).toBe(true);
			await expect(page.locator('body')).toHaveCSS(
				'font-family',
				'Cambria, Caladea, Georgia, serif',
			);
		}
	});
}

test('homepage sections stay aligned and accessible', async ({
	page,
	site,
}) => {
	test.setTimeout(90_000);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await expect(page.locator('.profile-section')).toHaveCount(2);
	await expect(page.locator('.education-section')).toBeVisible();
	await expect(page.locator('.latest-articles')).toBeVisible();
	for (const width of [320, 768, 1440]) {
		await page.setViewportSize({ width, height: 1000 });
		const hero = await page.locator('.hero h1').boundingBox();
		const section = await page
			.locator('.profile-section h2')
			.first()
			.boundingBox();
		expect(Math.abs(hero!.x - section!.x)).toBeLessThan(1);
	}
	for (const path of [
		'/',
		'/en/',
		'/blog/',
		'/en/blog/',
		'/contacto/',
		'/en/contact/',
	]) {
		await page.goto(site.baseURL + path);
		const result = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(result.violations, path).toEqual([]);
	}
	for (const entry of site.entries) {
		await page.goto(site.baseURL + entry.path);
		const result = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(result.violations, entry.path).toEqual([]);
	}
});

test('native pages and code metadata obey the rules without JavaScript', async ({
	browser,
	site,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 375, height: 900 },
	});
	try {
		const page = await context.newPage();
		for (const path of [
			...routes,
			...site.entries.map((entry) => entry.path),
		]) {
			await page.goto(site.baseURL + path);
			expect(await designViolations(page), path).toEqual([]);
		}
	} finally {
		await context.close();
	}
});

test('policy catches textual and graphical dividers without rejecting scientific notation or control borders', async ({
	page,
}) => {
	await page.setContent(`<style>
		.meta::after { content: '\u00b7'; }
		.line { border-top: 1px solid black; }
		.gradient { width: 100px; height: 1px; background: linear-gradient(black, gray); }
		.pseudo::after { content: ''; display: block; width: 100px; height: 1px; background: linear-gradient(black, gray); }
		td, button { border: 1px solid black; }
	</style>
	<p>Fecha \u00b7 Lectura</p><p class="meta">Python</p><hr>
	<div class="gradient"></div><section class="line">Section</section><div class="pseudo">Title</div>
	<svg width="100" height="2"><path d="M0 1H100" stroke="black"/></svg>
	<table><tbody><tr><td>1</td></tr></tbody></table><button>Control</button>
	<span class="katex">x\u00b7y</span><pre><code>x = 'a\u00b7b'</code></pre>
	<figure><svg width="100" height="100"><path d="M0 50H100"/></svg></figure>`);
	expect(await designViolations(page)).toEqual(
		expect.arrayContaining([
			'middle-dot: p',
			'middle-dot: p.meta::after',
			'separator: hr',
			'horizontal-border: section.line',
			'pseudo-line: div.pseudo::after',
			'svg-line: svg',
			'gradient-line: div.gradient',
		]),
	);
	expect(
		(await designViolations(page)).some((issue) =>
			/td|button|katex|code|figure/.test(issue),
		),
	).toBe(false);
});
