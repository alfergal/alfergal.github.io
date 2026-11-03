import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import manifest from '../experiments/restauracion-cromatica/datos.json' with { type: 'json' };
import results from '../experiments/restauracion-cromatica/resultados.json' with { type: 'json' };
import resources from '../experiments/restauracion-cromatica/recursos.json' with { type: 'json' };

const route = '/blog/ia-colores-originales-pintura/';
const base = '/figures/restauracion-cromatica/';
const es = (value: number, precision = 6) =>
	value.toFixed(precision).replace('.', ',');
const average = (values: number[]) =>
	values.reduce((a, b) => a + b, 0) / values.length;

test('painting-level partitions, recorded metrics and article tables agree with executed evidence', async ({
	page,
}) => {
	expect(manifest).toHaveLength(20);
	expect(new Set(manifest.map((r) => r.object_id)).size).toBe(20);
	expect(new Set(manifest.map((r) => r.sha256)).size).toBe(20);
	for (const [partition, count] of [
		['train', 12],
		['validation', 4],
		['test', 4],
	] as const) {
		const ids = manifest
			.filter((r) => r.split === partition)
			.map((r) => r.object_id);
		expect(ids).toHaveLength(count);
		expect(results.split[partition]).toEqual(ids);
	}
	for (const row of manifest) {
		expect(row.is_public_domain).toBe(true);
		expect(row.license).toBe('CC0-1.0');
		expect(row.license_url).toBe(
			'https://creativecommons.org/publicdomain/zero/1.0/',
		);
		expect(new URL(row.image).hostname).toBe('images.metmuseum.org');
		expect(row.sha256).toMatch(/^[a-f0-9]{64}$/);
	}
	expect(results.records).toHaveLength(64);
	expect(results.selection.selected_epoch).toBe(39);
	const best = results.selection.history.reduce((a, b) =>
		a.validation_mae < b.validation_mae ? a : b,
	);
	expect(best.epoch).toBe(results.selection.selected_epoch);
	await page.goto(route);
	const article = await page.locator('.prose').innerText();
	for (const method of [
		'deteriorada',
		'tradicional',
		'lineal',
		'cnn',
	] as const) {
		const rows = results.records.filter((row) => row.method === method);
		expect(rows).toHaveLength(16);
		for (const key of ['mae', 'ssim', 'delta_e'] as const) {
			const summary = results.summary[method][key];
			expect(average(rows.map((r) => r[key]))).toBeCloseTo(summary.mean, 10);
			expect(article).toContain(es(summary.mean));
			expect(summary.ci95[0]).toBeLessThanOrEqual(summary.mean);
			expect(summary.ci95[1]).toBeGreaterThanOrEqual(summary.mean);
		}
		for (const intensity of results.intensities) {
			const selected = rows.filter((r) => r.intensity === intensity);
			expect(selected.map((r) => r.object_id)).toEqual(results.split.test);
			expect(article).toContain(es(average(selected.map((r) => r.delta_e)), 4));
		}
	}
	expect(results.summary.lineal.delta_e.mean).toBeLessThan(
		results.summary.cnn.delta_e.mean,
	);
});

test('draft renders eight sections, equations, tables, anchors, references and intact lightweight resources', async ({
	page,
	site,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto(route);
	await expect(page.locator('.draft-notice')).toBeVisible();
	await expect(page.locator('meta[name=robots]')).toHaveAttribute(
		'content',
		/noindex/,
	);
	await expect(page.locator('.prose h2')).toHaveCount(8);
	await expect(page.locator('.prose table')).toHaveCount(4);
	await expect(page.locator('.katex-error, math merror')).toHaveCount(0);
	expect(
		await page.locator('.katex-mathml math').count(),
	).toBeGreaterThanOrEqual(12);
	await expect(page.locator('.article-toc details')).not.toHaveAttribute(
		'open',
	);
	const references = page.locator('.prose ol').last().locator('li');
	await expect(references).toHaveCount(15);
	const hrefs = await references
		.locator('a')
		.evaluateAll((items) => items.map((a) => (a as HTMLAnchorElement).href));
	for (const doi of [
		'10.1364/OE.23.033836',
		'10.1002/col.22162',
		'10.1002/col.22164',
		'10.1002/col.22197',
		'10.1186/s40494-021-00567-4',
		'10.1186/s40494-023-00859-x',
		'10.1007/s42979-024-02823-3',
		'10.1016/j.culher.2025.06.015',
		'10.1038/s40494-025-01924-3',
	]) {
		expect(hrefs).toContain('https://doi.org/' + doi);
	}
	let total = 0;
	for (const [name, checksum] of Object.entries(resources)) {
		const bytes = await readFile(join(site.root, 'public', base, name));
		total += bytes.length;
		expect(createHash('sha256').update(bytes).digest('hex')).toBe(checksum);
		const response = await page.request.get(base + name);
		expect(response.status()).toBe(200);
		if (name.endsWith('.svg')) {
			expect(
				await page.evaluate(
					(text) => {
						const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
						return (
							!!doc.querySelector(
								'parsererror, script, foreignObject, iframe',
							) ||
							[...doc.querySelectorAll('*')].some((el) =>
								[...el.attributes].some(
									(attr) =>
										attr.name.startsWith('on') ||
										(attr.localName === 'href' && !attr.value.startsWith('#')),
								),
							)
						);
					},
					await response.text(),
				),
			).toBe(false);
		}
		const img = page.locator('.prose img[src="' + base + name + '"]');
		await expect(img).toHaveCount(1);
		await img.scrollIntoViewIfNeeded();
		await expect
			.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
			.toBeGreaterThan(0);
		await expect(img).toHaveAttribute('alt', /\S.{25}/);
		await expect(img).toHaveAttribute('loading', 'lazy');
		const ratio = await img.evaluate((el) => {
			const im = el as HTMLImageElement;
			return Math.abs(
				Number(im.getAttribute('width')) / Number(im.getAttribute('height')) -
					im.naturalWidth / im.naturalHeight,
			);
		});
		expect(ratio).toBeLessThan(0.01);
	}
	expect(total).toBeLessThan(400_000);
	for (const hash of await page
		.locator('.article-toc a')
		.evaluateAll((items) =>
			items.map((el) => (el as HTMLAnchorElement).hash.slice(1)),
		)) {
		expect(
			await page.evaluate(
				(id) => !!document.getElementById(decodeURIComponent(id)),
				hash,
			),
		).toBe(true);
	}
	expect(errors).toEqual([]);
});

test('comparison uses native keyboard controls, aligned images, no requests or idle rendering', async ({
	page,
}) => {
	await page.goto(route, { waitUntil: 'networkidle' });
	const component = page.locator('image-comparison');
	await expect(component).toHaveAttribute('data-ready', '');
	const slider = component.getByRole('slider', { name: /Porción visible/ });
	await slider.focus();
	await page.keyboard.press('ArrowRight');
	await expect(slider).toHaveValue('51');
	await expect(slider).toHaveAttribute('aria-valuetext', '51 %');
	await expect(component.locator('output')).toHaveText('51 %');
	await page.keyboard.press('End');
	await expect(slider).toHaveValue('100');
	await expect(component.locator('[data-comparison-images]')).toHaveCSS(
		'--split',
		'100%',
	);
	await page.keyboard.press('Home');
	await expect(slider).toHaveValue('0');
	await expect(slider).toBeFocused();
	const boxes = await component.locator('img').evaluateAll((images) =>
		images.map((im) => {
			const b = im.getBoundingClientRect();
			return [b.x, b.y, b.width, b.height];
		}),
	);
	expect(boxes[0]).toEqual(boxes[1]);
	await component.evaluate((el) => {
		(window as unknown as { mutations: number }).mutations = 0;
		const observer = new MutationObserver((records) => {
			(window as unknown as { mutations: number }).mutations += records.length;
		});
		observer.observe(el, { attributes: true, childList: true, subtree: true });
		setTimeout(() => observer.disconnect(), 300);
	});
	await page.waitForTimeout(350);
	expect(
		await page.evaluate(
			() => (window as unknown as { mutations: number }).mutations,
		),
	).toBe(0);
	const requests: string[] = [];
	page.on('request', (request) => requests.push(request.url()));
	await page.keyboard.press('ArrowRight');
	await expect(slider).toHaveValue('1');
	expect(requests).toEqual([]);
});

test('comparison and article remain responsive, touch friendly and accessible', async ({
	page,
	browser,
	site,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(route);
	for (const width of [320, 375, 768, 1024, 1440, 1920]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.locator('image-comparison').scrollIntoViewIfNeeded();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
			width + 'px',
		).toBe(true);
	}
	await page.setViewportSize({ width: 375, height: 812 });
	const audit = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(audit.violations).toEqual([]);
	const context = await browser.newContext({
		isMobile: true,
		hasTouch: true,
		viewport: { width: 375, height: 812 },
		reducedMotion: 'reduce',
	});
	try {
		const mobile = await context.newPage();
		await mobile.goto(site.baseURL + route);
		const slider = mobile.locator('image-comparison input');
		await slider.scrollIntoViewIfNeeded();
		const box = (await slider.boundingBox())!;
		await mobile.touchscreen.tap(
			box.x + box.width * 0.8,
			box.y + box.height / 2,
		);
		await expect(slider).not.toHaveValue('50');
		await expect(mobile.locator('image-comparison output')).toHaveText(
			(await slider.inputValue()) + ' %',
		);
	} finally {
		await context.close();
	}
});

test('without JavaScript both images remain visible, distinct and described', async ({
	browser,
	site,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 375, height: 812 },
	});
	try {
		const page = await context.newPage();
		await page.goto(site.baseURL + route);
		const component = page.locator('image-comparison');
		await expect(component.locator('input')).toBeDisabled();
		await expect(component.locator('[data-comparison-static]')).toBeVisible();
		const table = page.locator('.prose table').first();
		await expect(table).toHaveAttribute('tabindex', '0');
		await table.scrollIntoViewIfNeeded();
		await table.focus();
		await page.keyboard.press('ArrowRight');
		await expect
			.poll(() => table.evaluate((el) => el.scrollLeft))
			.toBeGreaterThan(0);
		for (const formula of await page.locator('.katex-display').all())
			await expect(formula).toHaveAttribute('tabindex', '0');
		const images = component.locator('img');
		for (const image of await images.all()) await expect(image).toBeVisible();
		const first = (await images.nth(0).boundingBox())!;
		const second = (await images.nth(1).boundingBox())!;
		expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
	} finally {
		await context.close();
	}
});

test('painting draft stays absent from production pages, RSS, sitemap and homepage bundles', async ({
	page,
	request,
	site,
}) => {
	expect(
		site.entries.find((entry) => entry.id === route.split('/')[2])?.draft,
	).toBe(true);
	expect((await request.get(site.productionURL + route)).status()).toBe(404);
	await page.goto(site.productionURL);
	await expect(
		page.locator('image-comparison, script[src*=ImageComparison]'),
	).toHaveCount(0);
	for (const name of ['index.html', 'rss.xml', 'sitemap-0.xml']) {
		const source = await readFile(join(site.output, name), 'utf8');
		expect(source).not.toContain(route);
		expect(source).not.toContain('¿Puede la inteligencia artificial recuperar');
		expect(source).not.toContain('image-comparison');
	}
});
