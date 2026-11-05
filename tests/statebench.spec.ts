import { test, expect } from './support/site';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import results from '../experiments/statebench/statebench_sensibilidad_resultados.json' with { type: 'json' };

const slug = 'ia-recordar-cambios-statebench';
const route = `/blog/${slug}/`;
const title =
	'¿Puede una IA recordar algo y aun así no comprender qué ha cambiado?';

test('StateBench draft renders equations, matching synthetic results and its SVG accessibly', async ({
	page,
	site,
	request,
}) => {
	test.skip(site.fixtureOnly, 'This check uses the editorial draft article.');
	await page.goto(new URL(route, site.baseURL).href);
	await expect(page.locator('.draft-notice')).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
		'content',
		/noindex/,
	);
	await expect(page.locator('h1')).toHaveText(title);
	await expect(page.locator('.prose table')).toHaveCount(1);
	await expect(
		page.locator('.prose .katex-error, .prose math merror'),
	).toHaveCount(0);
	expect(
		await page.locator('.prose .katex-mathml math').count(),
	).toBeGreaterThan(10);

	const image = page.locator('.prose figure img');
	await expect(image).toHaveCount(1);
	await expect(image).toHaveAttribute('alt', /mapa de calor/i);
	const figureAlt = await image.getAttribute('alt');
	const families = [
		'r_trivial',
		'aperiodic',
		'soluble',
		'general_finite',
	] as const;
	for (const [length, values] of Object.entries(results.results)) {
		for (const family of families) {
			const percent = Math.round(values[family].mean * 1000) / 10;
			const formatted = Number.isInteger(percent)
				? String(percent)
				: percent.toFixed(1).replace('.', ',');
			expect(figureAlt, `${family} ${length}`).toContain(`${formatted} %`);
		}
	}
	const formattedSeries = (family: (typeof families)[number]) =>
		Object.values(results.results).map(({ [family]: metric }) => {
			const percent = Math.round(metric.mean * 1000) / 10;
			return Number.isInteger(percent)
				? String(percent)
				: percent.toFixed(1).replace('.', ',');
		});
	expect(figureAlt).toContain(
		`R-trivial da ${formattedSeries('r_trivial')[0]} %`,
	);
	const aperiodicValues = formattedSeries('aperiodic');
	expect(figureAlt).toContain(
		`aperiódica, ${aperiodicValues.slice(0, -1).join(' %, ')} % y ${aperiodicValues.at(-1)} %`,
	);
	expect(figureAlt).toContain(
		`soluble y finita general dan ${formattedSeries('soluble')[0]} % en cada longitud`,
	);
	await expect(image.locator('..').locator('..')).toContainText('Figura 1');
	const source = await image.getAttribute('src');
	expect(source).toBe('/figures/statebench-sensibilidad.svg');
	await expect(
		page.locator('.prose a[href="https://arxiv.org/html/2611.03094v1"]'),
	).toHaveCount(1);
	await expect(
		page.locator(
			'.prose a[href="https://huggingface.co/blog/allenai/statebench"]',
		),
	).toHaveCount(1);
	await expect(
		page.locator('.prose a[href="https://github.com/allenai/state-bench"]'),
	).toHaveCount(1);
	const response = await request.get(new URL(source!, site.baseURL).href);
	expect(response.status()).toBe(200);
	const svg = await response.text();
	await image.scrollIntoViewIfNeeded();
	const svgIntegrity = await page.evaluate((text) => {
		const document = new DOMParser().parseFromString(text, 'image/svg+xml');
		return {
			invalid: Boolean(document.querySelector('parsererror')),
			rasterImage: Boolean(document.querySelector('image')),
			unsafe: Boolean(document.querySelector('script, foreignObject, iframe')),
			externalReferences: [...document.querySelectorAll('*')].some((element) =>
				[...element.attributes].some(
					(attribute) =>
						attribute.localName === 'href' && !attribute.value.startsWith('#'),
				),
			),
		};
	}, svg);
	expect(svgIntegrity).toEqual({
		invalid: false,
		rasterImage: false,
		unsafe: false,
		externalReferences: false,
	});
	await expect
		.poll(() =>
			image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
		)
		.toBeGreaterThan(0);
	const ratio = await image.evaluate((element) => {
		const image = element as HTMLImageElement;
		return image.naturalWidth / image.naturalHeight;
	});
	expect(ratio).toBeCloseTo(1140 / 624, 2);

	const text = await page.evaluate(() => {
		const nodes = document.querySelectorAll(
			'.article-header h1, .article-header .description, .prose',
		);
		return [...nodes]
			.map((node) => {
				const clone = node.cloneNode(true) as HTMLElement;
				clone
					.querySelectorAll('.katex-mathml, button')
					.forEach((item) => item.remove());
				clone.style.position = 'fixed';
				clone.style.left = '-10000px';
				document.body.append(clone);
				const visibleText = clone.innerText;
				clone.remove();
				return visibleText;
			})
			.join('\n')
			.replace(/\s+/g, ' ')
			.trim();
	});
	const visibleCharacters = Array.from(text).length;
	console.log(`StateBench visible article characters: ${visibleCharacters}`);
	expect(visibleCharacters).toBeGreaterThanOrEqual(5300);
	expect(visibleCharacters).toBeLessThanOrEqual(6000);
	expect(text).not.toContain('\u00b7');
	expect(text).toContain('no se evaluó ningún modelo neuronal.');
	expect(text).toContain('no reproduce asignaciones por paso');
	for (const width of [320, 390, 768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
			`horizontal overflow at ${width}px`,
		).toBe(true);
	}
});

test('StateBench remains excluded from production routes, RSS and sitemap', async ({
	page,
	site,
}) => {
	test.skip(site.fixtureOnly, 'This check uses the editorial draft article.');
	for (const file of (await readdir(site.output, { recursive: true })).filter(
		(file) => typeof file === 'string' && /\.(html|xml)$/.test(file),
	)) {
		const document = await readFile(join(site.output, file), 'utf8');
		expect(document, file).not.toContain(slug);
		expect(document, file).not.toContain(title);
	}
	expect(existsSync(join(site.output, 'blog', slug, 'index.html'))).toBe(false);
	await page.goto(new URL(route, site.baseURL).href);
	await expect(page.locator('.draft-notice')).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
		'content',
		/noindex/,
	);
});
