import { test, expect } from './support/site';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const coverNames = [
	'roc-calibracion',
	'restoration-split',
	'transformers-estadistica',
	'teoria-grafos',
	'editorial-neutral',
];

test('editorial cover sources have consistent, text-free 16:10 WebP exports', async () => {
	for (const name of coverNames) {
		const path = join('src/assets/blog-covers', `${name}.webp`);
		const data = await readFile(path);
		const metadata = await sharp(data).metadata();
		expect(metadata.format, name).toBe('webp');
		expect(metadata.width, name).toBe(1600);
		expect(metadata.height, name).toBe(1000);
		expect(data.byteLength, name).toBeLessThan(250_000);
	}

	for (const name of [
		'roc-calibracion',
		'transformers-estadistica',
		'teoria-grafos',
		'editorial-neutral',
	]) {
		const svg = await readFile(
			join('src/assets/blog-covers', `${name}.svg`),
			'utf8',
		);
		expect(svg).toContain('viewBox="0 0 1600 1000"');
		expect(svg).not.toMatch(/<text\b|<filter\b/i);
		expect(svg).toContain('#080F26');
		expect(svg).toContain('#A9D6F5');
		expect(svg).toContain('#F2A7C6');
	}

	const painting = await readFile(
		'src/content/blog/ia-colores-originales-pintura.mdx',
		'utf8',
	);
	expect(painting).toContain(
		"cover: '../../assets/blog-covers/restoration-split.webp'",
	);
	expect(painting).toContain('objeto 436534, CC0');
	expect(painting).toContain('no representa una restauración histórica');
	expect(painting).toContain('draft: true');
});

test('development Blog previews use accessible optimized covers at 16:10', async ({
	page,
	site,
}) => {
	test.skip(site.fixtureOnly, 'This preview uses editorial draft articles.');
	await page.goto('/blog/');
	const paintingCard = page.locator(
		'.post-card:has(a[href="/blog/ia-colores-originales-pintura/"])',
	);
	const image = paintingCard.locator('.article-card-cover img');
	await expect(image).toHaveAttribute('alt', /Roses.*sintético/);
	await expect(image).toHaveAttribute('loading', 'lazy');
	await expect(image).toHaveAttribute('width', '1600');
	await expect(image).toHaveAttribute('height', '1000');
	await expect(paintingCard.locator('.post-card-category')).toBeVisible();
	await expect(paintingCard.locator('h3 a')).toBeVisible();
	await expect(paintingCard.locator('> p')).toBeVisible();
	await expect(paintingCard.locator('.article-meta time')).toBeVisible();
	await expect(paintingCard.locator('.draft-label')).toBeVisible();
	await expect(paintingCard.locator('a')).toHaveCount(1);
	const dimensions = await image.boundingBox();
	expect(dimensions).not.toBeNull();
	expect(dimensions!.width / dimensions!.height).toBeCloseTo(1.6, 1);
});
