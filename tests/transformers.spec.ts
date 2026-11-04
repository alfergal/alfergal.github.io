import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const article = '/blog/puede-transformer-predecir-mejor-arima-estadistica/';
const title =
	'¿Puede un Transformer predecir mejor que 50 años de estadística?';

test('Transformer article renders in development, stays under 9,000 visible characters and remains a production draft', async ({
	page,
	request,
	site,
}) => {
	const response = await page.goto(`${site.baseURL}${article}`);
	expect(response?.status()).toBe(200);
	await expect(page.locator('.draft-notice')).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
		'content',
		/noindex/,
	);
	await expect(page.locator('.article-header h1')).toHaveText(title);
	await expect(page.locator('.article-header .description')).toHaveText(
		'ARIMA frente a Transformers: un experimento matemático sobre los límites de la predicción temporal.',
	);
	await expect(page.locator('.prose h2')).toHaveCount(6);
	await expect(page.locator('.article-toc summary')).toHaveText(
		'En este artículo',
	);
	await expect(page.locator('.article-toc details')).not.toHaveAttribute(
		'open',
	);
	await expect(page.locator('.prose figure')).toHaveCount(4);
	await expect(page.locator('.experiment-plot svg')).toHaveCount(4);
	expect(
		await page.locator('.experiment-plot svg text').count(),
	).toBeGreaterThan(20);
	await expect(page.locator('.prose table')).toHaveCount(1);
	await expect(page.locator('.prose pre code')).toContainText('phi ** h * x');
	await expect(page.locator('.katex-display')).toHaveCount(4);
	await expect(page.locator('.katex-error, .katex-mathml merror')).toHaveCount(
		0,
	);
	await expect(page.locator('.prose a[href^="https://"]')).toHaveCount(9);

	const visibleCharacters = await page.locator('.prose').evaluate((body) => {
		const heading =
			document.querySelector('.article-header h1')?.textContent ?? '';
		const subtitle =
			document.querySelector('.article-header .description')?.textContent ?? '';
		let text = (body as HTMLElement).innerText;
		for (const node of body.querySelectorAll('.katex-mathml')) {
			const hiddenMath = (node as HTMLElement).innerText;
			if (hiddenMath && text.includes(hiddenMath))
				text = text.replace(hiddenMath, '');
		}
		const svgLabels = Array.from(body.querySelectorAll('svg text'))
			.map((node) => node.textContent?.trim() ?? '')
			.filter((label) => label && !text.includes(label));
		return Array.from([heading, subtitle, text, ...svgLabels].join('\n'))
			.length;
	});
	console.log(`[article-chars] ${visibleCharacters}`);
	expect(
		visibleCharacters,
		`Rendered article has ${visibleCharacters} Unicode code points`,
	).toBeLessThanOrEqual(9000);

	for (const width of [320, 768, 1440]) {
		await page.setViewportSize({ width, height: 960 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
			`Page overflows at ${width}px`,
		).toBe(true);
		if (width < 640) {
			expect(
				await page
					.locator('.experiment-plot')
					.first()
					.evaluate((node) => node.scrollWidth > node.clientWidth),
			).toBe(true);
		}
	}
	await page.setViewportSize({ width: 1440, height: 960 });
	const accessibility = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(accessibility.violations).toEqual([]);

	const production = await request.get(`${site.productionURL}${article}`);
	expect(production.status()).toBe(404);
	const outputFiles = await readdir(site.output, { recursive: true });
	expect(outputFiles).not.toContain(
		`blog/${article.split('/').filter(Boolean).at(-1)}/index.html`,
	);
	for (const file of outputFiles.filter((entry) =>
		/\.(?:html|xml)$/.test(entry),
	)) {
		const text = await readFile(join(site.output, file), 'utf8');
		expect(text).not.toContain(title);
		expect(text).not.toContain(
			'puede-transformer-predecir-mejor-arima-estadistica',
		);
	}
});
