import { test, expect, listedEntries } from './support/site';
import { verifyBuild, xmlValues } from './support/build';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const article = '/blog/qa-verification-new/';
test('isolated collections preview all entries in date order and expose publication metadata', async ({
	page,
	site,
}) => {
	expect(site.fixtureOnly).toBe(true);
	await page.goto('/');
	await expect(page.locator('.post-card h3 a')).toHaveText(
		listedEntries(site.entries).map((entry) => entry.title),
	);
	await page.goto(article);
	const entry = site.entries.find((item) => item.id === 'qa-verification-new')!;
	await expect(page.locator('.article-category')).toHaveText(entry.category);
	await expect(page.locator('.tags li')).toHaveText(entry.tags);
	const schema = await page
		.locator('script[type="application/ld+json"]')
		.evaluate((el) => JSON.parse(el.textContent ?? '{}'));
	expect(schema.author.name).toBe('Alberto Fernández Gálvez');
	expect(schema.author.url).toBe('https://alfergal.github.io/');
	await expect(page.locator('.draft-notice, meta[name=robots]')).toHaveCount(0);
	for (const entry of site.entries.filter((entry) => entry.draft)) {
		await page.goto(`/blog/${entry.id}/`);
		await expect(page.locator('.draft-notice')).toBeVisible();
		await expect(page.locator('meta[name=robots]')).toHaveAttribute(
			'content',
			/noindex/,
		);
	}
});

test('published Markdown and MDX build correctly while explicit and default drafts stay absent', async ({
	page,
	request,
	site,
}) => {
	await verifyBuild(site, page, request);
	const rss = await (await request.get(`${site.baseURL}/rss.xml`)).text();
	expect(await xmlValues(page, rss, 'item link')).toHaveLength(
		site.entries.filter((entry) => !entry.draft).length,
	);
	for (const marker of [
		'BORRADOR_EXPLICITO_SOLO_TEST',
		'BORRADOR_IMPLICITO_SOLO_TEST',
	]) {
		for (const file of ['index.html', 'rss.xml', 'sitemap-0.xml'])
			expect(await readFile(join(site.output, file), 'utf8')).not.toContain(
				marker,
			);
	}
});

test('the patched math stack renders inline formulas, sums, fractions and matrices in development and production', async ({
	page,
	site,
}) => {
	for (const base of [site.baseURL, site.productionURL]) {
		const errors: string[] = [];
		const record = (error: Error) => errors.push(error.message);
		page.on('pageerror', record);
		await page.goto(`${base}${article}`);
		await expect(page.locator('.katex')).toHaveCount(3);
		await expect(page.locator('.katex-display')).toHaveCount(2);
		await expect(
			page.locator('.katex-error, .katex-mathml merror'),
		).toHaveCount(0);
		await expect(page.locator('.katex-mathml math')).toHaveCount(3);
		await expect(page.locator('pre.astro-code')).toBeVisible();
		await expect(page.locator('table')).toBeVisible();
		await expect(
			page.getByRole('img', { name: /Gráfico sintético/ }),
		).toBeVisible();
		for (const width of [320, 768, 1440]) {
			await page.setViewportSize({ width, height: 1000 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
			).toBe(true);
		}
		expect(errors).toEqual([]);
		page.off('pageerror', record);
	}
});

test('fixtures and build output stay outside the editorial checkout', async ({
	site,
}) => {
	expect(relative(process.cwd(), site.root).startsWith('..')).toBe(true);
	expect(site.output.startsWith(`${site.root}/`)).toBe(true);
	const editorial = await readdir('src/content/blog', { recursive: true });
	expect(
		editorial.filter((file) => file.startsWith('qa-verification-')),
	).toEqual([]);
});
