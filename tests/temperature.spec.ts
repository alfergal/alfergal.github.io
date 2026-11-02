import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sweep from '../src/data/roc_auc_temperature.json' with { type: 'json' };
import results from '../experiments/roc-auc-calibracion/resultados.json' with { type: 'json' };

const route = '/blog/roc-auc-calibracion-probabilidades/';
const figures = [
	[
		'01-curvas-roc.svg',
		'17b5ac06cf89c3c082c2c95a0d0668d893cb76682721fc9843617dcfa7792ced',
	],
	[
		'02-calibracion.svg',
		'e824de048963a5acb038c50b5688fc8e9facaa5e40b2085c61eb2ddbec9693ee',
	],
	[
		'03-transformaciones.svg',
		'bdd998d8cef08a86eacaae2baac8da8b545c6471f8cab58575de716b354bbfd5',
	],
	[
		'04-temperatura-metricas.svg',
		'65eea748eb23157106f085f717489c6663ac66b394f35317f7ab576fed9fcaba',
	],
	[
		'05-antes-despues.svg',
		'8feda254a6ddbef0e436b1fab776a5a313dc0333f675dc742223754065699cea',
	],
];

test('precomputed temperatures agree with experiment outputs and preserve discrimination', async () => {
	expect(sweep).toHaveLength(51);
	const keys = [
		'roc_auc',
		'average_precision',
		'brier',
		'log_loss',
		'ece_15_quantile',
	] as const;
	const reference = results.scores.reference_true_probabilities;
	for (const [index, row] of sweep.entries()) {
		expect(row.temperature).toBe(Number((0.5 + index * 0.05).toFixed(2)));
		for (const key of keys) {
			expect(Number.isFinite(row[key])).toBe(true);
			expect(row[key]).toBeGreaterThanOrEqual(0);
		}
		expect(row.roc_auc).toBeCloseTo(reference.roc_auc, 8);
		expect(row.average_precision).toBeCloseTo(reference.average_precision, 8);
		const computed = Object.entries(results.temperature_sweep).find(
			([temperature]) => Number(temperature) === row.temperature,
		)?.[1];
		if (computed)
			for (const key of keys)
				expect(Math.abs(row[key] - computed[key])).toBeLessThanOrEqual(5e-9);
	}
	expect(results.n_calibration + results.n_test).toBe(results.n_total);
	expect(sweep.find((row) => row.temperature === 1)!.brier).toBeLessThan(
		sweep[0].brier,
	);
});

test('the draft renders mathematics, tables, five intact safe SVGs and the original scientific references', async ({
	page,
	site,
}) => {
	await page.goto(route);
	await expect(page.locator('meta[name=robots]')).toHaveAttribute(
		'content',
		/noindex/,
	);
	await expect(page.locator('.draft-notice')).toBeVisible();
	await expect(page.locator('.katex-error, math merror')).toHaveCount(0);
	expect(await page.locator('.katex-mathml math').count()).toBeGreaterThan(25);
	await expect(page.locator('.prose table')).toHaveCount(2);
	const text = await page.locator('.prose').innerText();
	for (const key of ['roc_auc', 'brier', 'log_loss'] as const) {
		for (const metrics of Object.values(results.scores))
			expect(text).toContain(metrics[key].toFixed(6).replace('.', ','));
	}
	for (const [name, checksum] of figures) {
		const url = `/figures/roc-auc-calibracion/${name}`;
		const image = page.locator(`.prose figure img[src="${url}"]`);
		await image.scrollIntoViewIfNeeded();
		await expect
			.poll(() =>
				image.evaluate((img) => (img as HTMLImageElement).naturalWidth),
			)
			.toBeGreaterThan(0);
		await expect(image).toHaveAttribute('alt', /\S.{20}/);
		await expect(image.locator('..').locator('figcaption')).toContainText(
			'Figura',
		);
		const bytes = await readFile(join(site.root, 'public', url));
		expect(createHash('sha256').update(bytes).digest('hex')).toBe(checksum);
		const response = await page.request.get(url);
		expect(response.status()).toBe(200);
		const integrity = await page.evaluate(
			(source) => {
				const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
				return {
					invalid: !!xml.querySelector('parsererror'),
					executable: !!xml.querySelector('script, foreignObject, iframe'),
					external: [...xml.querySelectorAll('*')].some((el) =>
						[...el.attributes].some(
							(attribute) =>
								attribute.localName === 'href' &&
								!attribute.value.startsWith('#'),
						),
					),
					viewBox: xml.documentElement.getAttribute('viewBox'),
				};
			},
			await response.text(),
		);
		expect(integrity).toMatchObject({
			invalid: false,
			executable: false,
			external: false,
		});
		expect(integrity.viewBox).toMatch(/^0 0 \d/);
	}
	const references = page
		.locator('.prose h3')
		.filter({ hasText: 'Referencias científicas' })
		.locator('xpath=following-sibling::ol[1]')
		.locator('a');
	await expect(references).toHaveCount(10);
	const links = await references.evaluateAll((items) =>
		items.map((item) => item.getAttribute('href')),
	);
	expect(links).toContain('https://proceedings.mlr.press/v70/guo17a.html');
	expect(links).toContain('https://doi.org/10.1007/s10994-023-06336-7');
	expect(links.every((link) => link?.startsWith('https://'))).toBe(true);
	const anchors = await page
		.locator('.article-toc a')
		.evaluateAll((items) =>
			items.map((item) => (item as HTMLAnchorElement).hash.slice(1)),
		);
	for (const id of anchors)
		expect(
			await page.evaluate(
				(id) => !!document.getElementById(decodeURIComponent(id)),
				id,
			),
		).toBe(true);
});

test('temperature input displays every one of the 51 exact precomputed rows without network calculations', async ({
	page,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto(route, { waitUntil: 'networkidle' });
	const component = page.locator('temperature-explorer');
	const slider = component.locator('input[type=range]');
	await expect(component).toHaveAttribute('data-ready', '');
	const requests: string[] = [];
	page.on('request', (request) => {
		if (['fetch', 'xhr'].includes(request.resourceType()))
			requests.push(request.url());
	});
	for (const row of sweep) {
		await slider.evaluate((input, temperature) => {
			(input as HTMLInputElement).value = String(temperature);
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}, row.temperature);
		await expect(component.locator('[data-temp-value]')).toHaveText(
			row.temperature.toFixed(2).replace('.', ','),
		);
		await expect(component.locator('.temp-stats dd')).toHaveText(
			[row.roc_auc, row.brier, row.log_loss].map((value) => value.toFixed(6)),
		);
		const path = await component.locator('[data-temp-curve]').getAttribute('d');
		expect(path?.match(/[ML]/g)).toHaveLength(101);
		expect(path).toContain('L200.00 120.00');
		expect(path).not.toMatch(/NaN|Infinity/);
	}
	expect(requests).toEqual([]);
	expect(errors).toEqual([]);
});

test('keyboard controls all temperatures, keeps focus and announces current values', async ({
	page,
}) => {
	await page.goto(route);
	const component = page.locator('temperature-explorer');
	const slider = component.getByRole('slider', { name: 'Temperatura T:' });
	await slider.focus();
	await page.keyboard.press('ArrowRight');
	await expect(slider).toHaveValue('1.05');
	await expect(slider).toHaveAttribute('aria-valuetext', '1,05');
	await expect(component.locator('[data-temp-status]')).toContainText(
		'Temperatura 1,05. ROC-AUC',
	);
	await page.keyboard.press('End');
	await expect(slider).toHaveValue('3');
	await expect(component.locator('[data-temp-brier]')).toHaveText(
		sweep.at(-1)!.brier.toFixed(6),
	);
	await page.keyboard.press('Home');
	await expect(slider).toHaveValue('0.5');
	await expect(slider).toBeFocused();
	await expect(component.locator('[data-temp-loss]')).toHaveText(
		sweep[0].log_loss.toFixed(6),
	);
});

test('article and explorer remain accessible and responsive without animation dependencies', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(route);
	for (const width of [320, 375, 768, 1024, 1440, 1920]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.locator('temperature-explorer').scrollIntoViewIfNeeded();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
			`${width}px`,
		).toBe(true);
	}
	const audit = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(audit.violations).toEqual([]);
});

test('without JavaScript the explorer retains the real reference and disables the inactive slider', async ({
	browser,
	site,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 375, height: 812 },
	});
	try {
		const page = await context.newPage();
		await page.goto(`${site.baseURL}${route}`);
		const component = page.locator('temperature-explorer');
		await expect(component.locator('input')).toBeDisabled();
		await expect(component.locator('[data-temp-auc]')).toHaveText(
			sweep[10].roc_auc.toFixed(6),
		);
		await expect(component.locator('[data-temp-static]')).toContainText('T=1');
		await expect(component.locator('svg')).toBeVisible();
	} finally {
		await context.close();
	}
});

test('the article and temperature bundle stay excluded from production, homepage, feeds and sitemap', async ({
	page,
	request,
	site,
}) => {
	const entry = site.entries.find((entry) => entry.id === route.split('/')[2]);
	expect(entry?.draft).toBe(true);
	expect((await request.get(`${site.productionURL}${route}`)).status()).toBe(
		404,
	);
	await page.goto(site.productionURL);
	await expect(
		page.locator('temperature-explorer, script[src*=TemperatureExplorer]'),
	).toHaveCount(0);
	for (const name of ['index.html', 'rss.xml', 'sitemap-0.xml']) {
		const source = await readFile(join(site.output, name), 'utf8');
		expect(source).not.toContain(entry!.title);
		expect(source).not.toContain(route);
		expect(source).not.toContain('temperature-explorer');
	}
});
