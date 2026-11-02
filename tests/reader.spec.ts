import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const article = '/blog/qa-verification-new/';

test('featured posts and useful filters exclude drafts and never duplicate an article', async ({
	page,
	site,
}) => {
	await page.goto(site.productionURL);
	await expect(page.locator('.featured-posts .post-card')).toHaveCount(1);
	const published = site.entries.filter((entry) => !entry.draft);
	await expect(page.locator('.post-card')).toHaveCount(published.length);
	const urls = await page
		.locator('.post-card h3 a')
		.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
	expect(new Set(urls).size).toBe(urls.length);
	await page
		.getByRole('combobox', { name: 'Categoría', exact: true })
		.selectOption('Machine Learning');
	await expect(page.locator('.post-card:visible')).toHaveCount(2);
	await page
		.getByRole('combobox', { name: 'Etiqueta', exact: true })
		.selectOption('Statistics');
	await expect(page.locator('.post-card:visible')).toHaveCount(1);
	await page
		.getByRole('combobox', { name: 'Categoría', exact: true })
		.selectOption('Software Engineering');
	await expect(page.getByRole('status')).toHaveText('0 publicaciones');
	await expect(page.locator('.featured-posts')).toBeHidden();
	await page.goto(`${site.productionURL}/?tag=Python#blog`);
	await expect(page.locator('.post-card:visible')).toHaveCount(2);
	const a11y = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(a11y.violations).toEqual([]);
});

test('article headings generate an accessible desktop index and mobile disclosure with active anchors', async ({
	page,
	site,
}) => {
	await page.goto(`${site.productionURL}${article}`);
	const toc = page.locator('.article-toc');
	const links = toc.locator('a');
	await expect(links).toHaveCount(4);
	await expect(toc.locator('details')).toHaveAttribute('open', '');
	await links.last().click();
	await expect(page).toHaveURL(/#referencias$/);
	await expect(links.last()).toHaveAttribute('aria-current', 'location');
	await page.setViewportSize({ width: 375, height: 812 });
	await expect(toc.locator('details')).not.toHaveAttribute('open');
	await toc.locator('summary').focus();
	await page.keyboard.press('Enter');
	await expect(links.first()).toBeVisible();
	await page.goto(`${site.productionURL}/blog/qa-verification-old/`);
	await expect(page.locator('.article-toc')).toHaveCount(0);
});

test('code toolbar copies exact text, announces success and survives clipboard failure', async ({
	page,
	context,
	site,
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto(`${site.productionURL}${article}`);
	await expect(page.locator('.code-toolbar')).toContainText(
		'python · prueba.py',
	);
	const code = await page.locator('pre code').textContent();
	await page.getByRole('button', { name: /Copiar código/ }).click();
	await expect(page.locator('.code-toolbar [role=status]')).toHaveText(
		'Código copiado',
	);
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
	await page.evaluate(() =>
		Object.defineProperty(navigator.clipboard, 'writeText', {
			configurable: true,
			value: async () => {
				throw new Error('blocked');
			},
		}),
	);
	await page.getByRole('button', { name: /Copiar código/ }).click();
	await expect(page.locator('.code-toolbar [role=status]')).toContainText(
		'Selecciona el código',
	);
	await expect(page.locator('pre')).toHaveAttribute('tabindex', '0');
});

test('published series preserve explicit order, skip drafts and show previous and next', async ({
	page,
	site,
}) => {
	await page.goto(`${site.productionURL}${article}`);
	const series = page.getByRole('navigation', { name: 'Serie de artículos' });
	expect(
		await series
			.locator('ol a')
			.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
	).toEqual([
		'/blog/qa-verification-old/',
		article,
		'/blog/qa-verification-third/',
	]);
	await expect(series.locator('[aria-current=page]')).toHaveAttribute(
		'href',
		article,
	);
	await expect(series.locator('[rel=prev]')).toHaveAttribute(
		'href',
		'/blog/qa-verification-old/',
	);
	await expect(series.locator('[rel=next]')).toHaveAttribute(
		'href',
		'/blog/qa-verification-third/',
	);
	await page.goto(`${site.productionURL}/blog/qa-verification-fourth/`);
	await expect(page.locator('.series-navigation')).toHaveCount(0);
});

test('related articles rank shared tags before category and series and exclude self and drafts', async ({
	page,
	site,
}) => {
	await page.goto(`${site.productionURL}${article}`);
	const related = page.locator('.related-posts h3 a');
	expect(
		await related.evaluateAll((links) =>
			links.map((link) => link.getAttribute('href')),
		),
	).toEqual([
		'/blog/qa-verification-third/',
		'/blog/qa-verification-fourth/',
		'/blog/qa-verification-old/',
	]);
});

test('reading progress tracks article content, callouts render in MDX and Markdown, dates agree with SEO and sitemap', async ({
	page,
	site,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(`${site.productionURL}${article}`);
	await expect(
		page.getByRole('complementary', { name: 'Limitación metodológica' }),
	).toContainText('datos son ficticios');
	await expect(page.locator('.article-header .article-meta')).toContainText(
		'Actualizado:',
	);
	const schema = await page
		.locator('script[type="application/ld+json"]')
		.evaluate((el) => JSON.parse(el.textContent!));
	expect(schema.datePublished).toBe('2021-01-01T00:00:00.000Z');
	expect(schema.dateModified).toBe('2021-02-01T00:00:00.000Z');
	expect(schema.image).toBe('https://alfergal.github.io/og-image.png');
	expect(await readFile(join(site.output, 'sitemap-0.xml'), 'utf8')).toContain(
		'<lastmod>2021-02-01',
	);
	await page
		.locator('.prose')
		.evaluate((el) =>
			window.scrollTo(
				0,
				scrollY + el.getBoundingClientRect().bottom - innerHeight,
			),
		);
	await expect
		.poll(() =>
			page
				.locator('.reading-progress span')
				.evaluate((el) => parseFloat((el as HTMLElement).style.width)),
		)
		.toBeGreaterThan(99);
	const audit = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(audit.violations).toEqual([]);
	await page.goto(`${site.productionURL}/blog/qa-verification-third/`);
	await expect(page.getByRole('complementary', { name: 'Nota' })).toContainText(
		'Nota de prueba',
	);
	await expect(page.locator('.article-header .article-meta')).not.toContainText(
		'Actualizado:',
	);
	expect(errors).toEqual([]);
});

test('article features degrade gracefully without JavaScript and do not load the graph', async ({
	browser,
	page,
	site,
}) => {
	const scripts: string[] = [];
	page.on('request', (request) => {
		if (request.resourceType() === 'script') scripts.push(request.url());
	});
	await page.goto(`${site.productionURL}${article}`);
	expect(scripts.some((url) => /GraphNetwork|graph-network/.test(url))).toBe(
		false,
	);
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const noJS = await context.newPage();
		await noJS.goto(`${site.productionURL}${article}`);
		await expect(noJS.locator('.article-toc a')).toHaveCount(4);
		await expect(noJS.locator('pre code')).toBeVisible();
		await expect(noJS.locator('.series-navigation')).toBeVisible();
		await expect(noJS.locator('button')).toHaveCount(0);
	} finally {
		await context.close();
	}
});
