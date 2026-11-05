import { test, expect } from './support/site';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const coverNames = [
	'roc-calibracion',
	'restoration-split',
	'transformers-estadistica',
	'teoria-grafos',
	'editorial-neutral',
];
const suppliedCovers = [
	{
		file: 'restauracion-pinturas.webp',
		article: 'ia-colores-originales-pintura.mdx',
		slug: 'ia-colores-originales-pintura',
		alt: 'Ilustración digital de un rostro pintado, dividido entre una versión agrietada y envejecida y otra con color; no es una obra histórica.',
		hash: 'a6c21fd458b2eebd189f1b76a80ad574dd1dd66975d0a80024f6a89219665693',
	},
	{
		file: 'roc-auc-calibracion.webp',
		article: 'roc-auc-calibracion-probabilidades.mdx',
		slug: 'roc-auc-calibracion-probabilidades',
		alt: 'Ilustración conceptual de dos curvas ROC azul y rosa junto a una diagonal de referencia; no muestra datos experimentales.',
		hash: 'c3b7d2c62e0948e4567123a797c8b9c4be32c6800ace3dab08b7b95eaeb9483a',
	},
	{
		file: 'estadistica-vs-transformer-boxeo.webp',
		article: 'puede-transformer-predecir-mejor-arima-estadistica.mdx',
		slug: 'puede-transformer-predecir-mejor-arima-estadistica',
		alt: 'Ilustración conceptual de un robot con guantes de boxeo frente a una pantalla de series temporales y gráficos genéricos.',
		hash: 'aca07301160939ff26531fde474efc69eb8ae942c61bf0a37a4edc9d46eacf0f',
	},
	{
		file: 'grafos-arista.webp',
		article: 'una-arista-cambia-red-resistencia-efectiva.mdx',
		slug: 'una-arista-cambia-red-resistencia-efectiva',
		alt: 'Ilustración de una red de nodos azules conectados y una arista resaltada en rosa.',
		hash: 'f84207d3133ef5a28e9efebd081699c5b4d5494a435b352ff974fa6176baf78a',
	},
	{
		file: 'virus-bacteriofago.webp',
		article: 'ia-lenguaje-de-los-virus.mdx',
		slug: 'ia-lenguaje-de-los-virus',
		alt: 'Ilustración conceptual de un bacteriófago estilizado azul y rosa, con cápside geométrica, cola y una hélice central no basada en una estructura concreta.',
		hash: 'e40589bac82ae5c18b0523426008e654fde615f76cd274ea33b1d1f1025ec634',
	},
	{
		file: 'statebench-memoria-estado.webp',
		article: 'ia-recordar-cambios-statebench.mdx',
		slug: 'ia-recordar-cambios-statebench',
		alt: 'Secuencia de estados azules que atraviesa una red de operaciones y termina en estados rosas; una conexión interrumpida representa una actualización perdida.',
		hash: '574dcdca2d288478e68f1d15efdbe7a3d06d78ada6baa4ad9e0f731786a148e1',
		width: 1600,
		height: 1000,
	},
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

	for (const cover of suppliedCovers) {
		const data = await readFile(join('src/assets/blog-covers', cover.file));
		const metadata = await sharp(data).metadata();
		expect(metadata.format, cover.file).toBe('webp');
		expect(metadata.width, cover.file).toBe(cover.width ?? 1280);
		expect(metadata.height, cover.file).toBe(cover.height ?? 800);
		expect(data.byteLength, cover.file).toBeLessThan(250_000);
		expect(createHash('sha256').update(data).digest('hex'), cover.file).toBe(
			cover.hash,
		);
	}
	expect(new Set(suppliedCovers.map((cover) => cover.file)).size).toBe(6);

	const editableSeriesCover = await readFile(
		'src/assets/blog-covers/series-temporales-transformers.svg',
		'utf8',
	);
	expect(editableSeriesCover).toContain('viewBox="0 0 1600 1000"');
	expect(editableSeriesCover).not.toMatch(/<text\b/i);

	const painting = await readFile(
		'src/content/blog/ia-colores-originales-pintura.mdx',
		'utf8',
	);
	for (const cover of suppliedCovers) {
		const article = await readFile(
			join('src/content/blog', cover.article),
			'utf8',
		);
		expect(article).toContain(
			`cover: '../../assets/blog-covers/${cover.file}'`,
		);
		expect(article).toContain(`es: '${cover.alt}'`);
		expect(article).toMatch(/coverAlt:[\s\S]*?en: '[^']+'/);
		expect(article).not.toMatch(
			/coverCredit:[\s\S]*?(?:Ilustración editorial conceptual generada digitalmente|Digitally generated conceptual editorial illustration)/,
		);
		expect(article).toContain('draft: true');
	}
	const paintingFrontmatter = painting.split('---')[1];
	expect(paintingFrontmatter).not.toContain('The Metropolitan Museum of Art');
	expect(paintingFrontmatter).not.toContain('objeto 436534, CC0');
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
	await expect(image).toHaveAttribute('alt', /rostro pintado.*envejecida/);
	await expect(image).toHaveAttribute('loading', 'lazy');
	await expect(image).toHaveAttribute('width', '1280');
	await expect(image).toHaveAttribute('height', '800');
	await expect(paintingCard.locator('figcaption')).toHaveCount(0);
	await expect(image).toHaveAttribute('alt', /no es una obra histórica/);
	await expect(paintingCard).not.toContainText('Metropolitan Museum');
	await expect(paintingCard.locator('.post-card-category')).toBeVisible();
	await expect(paintingCard.locator('h3 a')).toBeVisible();
	await expect(paintingCard.locator('> p')).toBeVisible();
	await expect(paintingCard.locator('.article-meta time')).toBeVisible();
	await expect(paintingCard.locator('.draft-label')).toBeVisible();
	await expect(paintingCard.locator('a')).toHaveCount(1);
	const dimensions = await image.boundingBox();
	expect(dimensions).not.toBeNull();
	expect(dimensions!.width / dimensions!.height).toBeCloseTo(1.6, 1);
	const virusCard = page.locator(
		'.post-card:has(a[href="/blog/ia-lenguaje-de-los-virus/"])',
	);
	const virusCover = virusCard.locator('.article-card-cover img');
	await expect(virusCover).toHaveAttribute(
		'alt',
		/Ilustración conceptual de un bacteriófago/,
	);
	await expect(virusCover).toHaveAttribute('loading', 'lazy');
	await expect(virusCover).toHaveAttribute('width', '1280');
	await expect(virusCover).toHaveAttribute('height', '800');
	await expect(virusCard.locator('figcaption')).toHaveCount(0);
	const statebenchCard = page.locator(
		'.post-card:has(a[href="/blog/ia-recordar-cambios-statebench/"])',
	);
	const statebenchCover = statebenchCard.locator('.article-card-cover img');
	await expect(statebenchCover).toHaveAttribute(
		'alt',
		/Secuencia de estados azules que atraviesa una red de operaciones/,
	);
	await expect(statebenchCover).toHaveAttribute('loading', 'lazy');
	await expect(statebenchCover).toHaveAttribute('width', '1600');
	await expect(statebenchCover).toHaveAttribute('height', '1000');
	await expect(statebenchCard.locator('figcaption')).toHaveCount(0);
});

test('each real article has its own accessible cover and the demonstration stays out of editorial listings', async ({
	page,
}) => {
	await page.goto('/blog/');
	const sources: (string | null)[] = [];
	for (const cover of suppliedCovers) {
		const card = page.locator(`.post-card:has(a[href="/blog/${cover.slug}/"])`);
		const image = card.locator('.article-card-cover img');
		await expect(image).toHaveAttribute('alt', cover.alt);
		await expect(image).toHaveAttribute('width', String(cover.width ?? 1280));
		await expect(image).toHaveAttribute('height', String(cover.height ?? 800));
		await expect(card.locator('.article-card-cover figcaption')).toHaveCount(0);
		sources.push(await image.getAttribute('src'));
	}
	expect(new Set(sources).size).toBe(6);
	for (const source of sources) {
		expect(source).not.toBeNull();
		expect(
			(await page.request.get(new URL(source!, page.url()).href)).status(),
		).toBe(200);
	}
	await expect(
		page.locator('.post-card a[href="/blog/demostracion-articulo-tecnico/"]'),
	).toHaveCount(0);

	expect(
		(await page.goto('/blog/demostracion-articulo-tecnico/'))?.status(),
	).toBe(200);
	await expect(page.locator('.draft-notice')).toBeVisible();
});

test('homepage covers stay free of generic illustration captions in both locales', async ({
	page,
}) => {
	for (const path of ['/', '/en/']) {
		await page.goto(path);
		await expect(page.locator('.latest-articles')).toBeVisible();
		const covers = page.locator(
			'.latest-articles .article-card-cover:has(img)',
		);
		for (const cover of await covers.all()) {
			await expect(cover.locator('figcaption')).toHaveCount(0);
			await expect(cover.locator('img')).toHaveAttribute('alt', /\S+/);
		}
	}
});
