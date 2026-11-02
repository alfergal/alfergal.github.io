import { test, expect, type TestSite } from './support/site';
import { verifyBuild } from './support/build';
import { blogCategories } from '../src/data/blog';
import AxeBuilder from '@axe-core/playwright';

const articleFor = (site: TestSite) =>
	site.entries.find((entry) => entry.id === 'demostracion-articulo-tecnico') ??
	site.entries[0];
const routesFor = (site: TestSite) => [
	'/',
	...(articleFor(site) ? [`/blog/${articleFor(site)!.id}/`] : []),
];

test('one personal homepage preserves identity, metadata and a minimal footer without navigation', async ({
	page,
	site,
}) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('Alberto Fernández Gálvez');
	await expect(page.locator('.hero-alias')).toHaveCount(0);
	await expect(page.locator('main')).not.toContainText('@alfergal');
	await expect(page.locator('.hero-role')).toHaveText(
		'Data Scientist | Machine Learning | Python & SQL',
	);
	await expect(page.locator('.wordmark')).toHaveText('af.');
	await expect(page.locator('.graph-network')).toBeVisible();
	await expect(
		page.locator(
			'.graph-network text, nav, button, input, select, .timeline, .skills-grid',
		),
	).toHaveCount(0);
	await expect(page.locator('.hero a')).toHaveText(['GitHub', 'LinkedIn']);
	await expect(page.locator('.hero a').nth(0)).toHaveAttribute(
		'href',
		'https://github.com/alfergal',
	);
	await expect(page.locator('.hero a').nth(1)).toHaveAttribute(
		'href',
		'https://www.linkedin.com/in/alberto-fernandez-galvez',
	);
	await expect(page.locator('footer')).toContainText(
		'Alberto Fernández Gálvez',
	);
	await expect(page.locator('footer a')).toHaveCount(0);
	await expect(page.locator('main h2')).toHaveText('Blog');
	for (const route of routesFor(site)) {
		expect((await page.goto(route))?.status()).toBe(200);
		await expect(page.locator('main h1')).toHaveCount(1);
		await expect(page.locator('meta[name=author]')).toHaveAttribute(
			'content',
			'Alberto Fernández Gálvez',
		);
		await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
			'href',
			`https://alfergal.github.io${route}`,
		);
		await expect(page.locator('meta[name=description]')).toHaveAttribute(
			'content',
			/.+/,
		);
		await expect(page.locator('nav, aside')).toHaveCount(0);
	}
});

test('dark theme is permanent and the site creates no storage or cookies', async ({
	page,
	context,
}) => {
	for (const colorScheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme });
		await page.goto('/');
		expect(
			await page
				.locator('body')
				.evaluate((el) => getComputedStyle(el).backgroundColor),
		).toBe('rgb(8, 15, 38)');
		await expect(page.locator('meta[name=color-scheme]')).toHaveAttribute(
			'content',
			'dark',
		);
		expect(
			await page.evaluate(() => ({
				local: localStorage.length,
				session: sessionStorage.length,
			})),
		).toEqual({ local: 0, session: 0 });
	}
	expect(await context.cookies()).toEqual([]);
});

test('obsolete pages return 404 unless an article slug has been deliberately reused', async ({
	request,
	site,
}) => {
	for (const route of [
		'/about/',
		'/blog/',
		'/cv/',
		'/research/',
		'/research/reproducibility/',
		'/projects/',
		'/talks/',
		'/contact/',
		'/privacy/',
		'/blog/first-post/',
		'/blog/using-mdx/',
	]) {
		if (site.entries.some((entry) => route === `/blog/${entry.id}/`)) continue;
		expect((await request.get(route)).status(), route).toBe(404);
	}
});

test('the integrated blog lists the collection in date order with readable metadata', async ({
	page,
	site,
}) => {
	await page.goto('/');
	await expect(page.locator('.post-card h3 a')).toHaveText(
		site.entries.map((entry) => entry.title),
	);
	for (const entry of site.entries) {
		const link = page.locator(`h3 a[href="/blog/${entry.id}/"]`);
		const card = page.locator('.post-card').filter({ has: link });
		await expect(card.locator('time')).toHaveAttribute(
			'datetime',
			/\d{4}-\d{2}-\d{2}/,
		);
		await expect(card.locator('.article-meta')).toContainText(
			/\d+ min de lectura/,
		);
		await expect(card.locator('.draft-label')).toHaveCount(entry.draft ? 1 : 0);
		expect(blogCategories).toContain(entry.category);
		await expect(card.locator('.article-meta')).toContainText(entry.category);
	}
	if (!site.entries.length)
		await expect(page.locator('.blog-empty')).toBeVisible();
});

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
	test(`readable responsive homepage and article at ${width}px`, async ({
		page,
		site,
	}) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		for (const route of routesFor(site)) {
			await page.goto(route);
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
				`${width}px ${route}`,
			).toBe(true);
			expect(
				await page
					.locator('h1, h2, h3')
					.evaluateAll((elements) =>
						elements
							.filter((el) => el.scrollWidth > el.clientWidth + 1)
							.map((el) => el.textContent),
					),
				`${width}px ${route}`,
			).toEqual([]);
			if ([375, 768, 1440].includes(width))
				await page.screenshot({
					path: `.qa/redesign-${route === '/' ? 'home' : 'article'}-${width === 375 ? 'mobile' : width === 1440 ? 'desktop' : 'tablet'}.png`,
					fullPage: true,
					animations: 'disabled',
				});
		}
	});
}

test('links work without JavaScript and keyboard users can skip to main content', async ({
	browser,
	baseURL,
	page,
	site,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 375, height: 812 },
	});
	const noJS = await context.newPage();
	await noJS.goto(`${baseURL}/`);
	const entry = articleFor(site);
	if (entry) {
		await noJS.locator(`.post-card a[href="/blog/${entry.id}/"]`).click();
		await expect(noJS.locator('h1')).toHaveText(entry.title);
		await noJS.locator('.back-link').first().click();
	}
	await expect(noJS.locator('h1')).toHaveText('Alberto Fernández Gálvez');
	await context.close();
	await page.goto('/');
	await page.keyboard.press('Tab');
	await expect(
		page.getByRole('link', { name: 'Saltar al contenido' }),
	).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('main')).toBeFocused();
});

test('production matches published content, resolves links and excludes every draft', async ({
	page,
	request,
	site,
}) => {
	await verifyBuild(site, page, request);
});

for (const colorScheme of ['light', 'dark'] as const) {
	test(`WCAG accessibility with ${colorScheme} system preference`, async ({
		page,
		site,
	}) => {
		await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
		for (const route of routesFor(site)) {
			await page.goto(route);
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(results.violations, route).toEqual([]);
		}
	});
}
