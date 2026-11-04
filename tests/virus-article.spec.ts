import { test, expect } from './support/site';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const slug = 'ia-lenguaje-de-los-virus';
const route = '/blog/' + slug + '/';
const title = '¿Está aprendiendo la IA a leer el lenguaje de los virus?';

test('the Spanish scientific draft renders its article, equations and figures in development', async ({
	page,
	site,
	request,
}) => {
	await page.goto(new URL(route, site.baseURL).href);
	await expect(page.locator('.draft-notice')).toBeVisible();
	await expect(page.locator('h1')).toHaveText(title);
	await expect(page.locator('.article-header .description')).toHaveText(
		'De descubrir secuencias desconocidas a estudiar su evolución: los modelos fundacionales que están transformando la virología.',
	);
	await expect(page.locator('.prose h2')).toHaveCount(7);
	await expect(page.locator('.prose table')).toHaveCount(2);
	await expect(page.locator('.prose .katex-display')).toHaveCount(2);
	await expect(page.locator('.prose .katex-error')).toHaveCount(0);
	await expect(page.locator('.prose figure')).toHaveCount(4);
	await expect(page.locator('.prose figure img[alt=""]')).toHaveCount(0);
	await expect(page.locator('.prose figure img')).toHaveCount(4);

	for (const image of await page.locator('.prose figure img').all()) {
		const source = await image.getAttribute('src');
		expect(source).toBeTruthy();
		expect((await request.get(new URL(source!, site.baseURL).href)).status()).toBe(200);
	}

	const renderedText = await page
		.locator('.article-header, .prose')
		.evaluateAll((elements) =>
			elements.map((element) => (element as HTMLElement).innerText).join('\n'),
		);
	const visibleCharacterCount = Array.from(renderedText).length;
	console.log('Visible article characters:', visibleCharacterCount);
	expect(visibleCharacterCount).toBeGreaterThanOrEqual(7000);
	expect(visibleCharacterCount).toBeLessThanOrEqual(8000);
	expect(renderedText).not.toContain('\u00b7');

	for (const width of [320, 390, 768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
			'horizontal overflow at ' + width + 'px',
		).toBe(true);
	}

	const toc = page.locator('.article-toc details');
	await expect(toc).toHaveCount(1);
	await expect(toc).not.toHaveAttribute('open', '');
	await toc.locator('summary').click();
	await expect(toc.locator('nav')).toBeVisible();
});

test('the draft is excluded from all production discovery surfaces and remains noindex', async ({
	page,
	site,
}) => {
	const htmlFiles = (await readdir(site.output, { recursive: true })).filter(
		(file) => typeof file === 'string' && /\.(html|xml)$/.test(file),
	);
	for (const file of htmlFiles) {
		const document = await readFile(join(site.output, file), 'utf8');
		expect(document, file).not.toContain(slug);
		expect(document, file).not.toContain(title);
	}
	expect(existsSync(join(site.output, 'blog', slug, 'index.html'))).toBe(false);

	await page.goto(new URL(route, site.baseURL).href);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
		'content',
		/noindex/,
	);
	await expect(page.locator('.draft-notice')).toBeVisible();
});
