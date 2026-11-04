import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { monogram, monogramMarkup, faviconMarkup } from '../src/lib/monogram';
import { favicon } from '../src/lib/favicon';
import { socialImage } from '../src/lib/social-image';
import { profile } from '../src/data/profile';

test('header, favicon and social image share the same lower-case letter outlines without a graph', async ({
	page,
	request,
}) => {
	await page.goto('/');
	const header = page.locator('.wordmark svg');
	await expect(header).toHaveAttribute('viewBox', monogram.viewBox);
	const headerLetters = await header
		.locator('.af-logo-letters path')
		.evaluateAll((items) => items.map((item) => item.getAttribute('d')));
	expect(headerLetters).toEqual([...monogram.letterPaths]);
	await expect(header.locator('.af-logo-edges, .af-logo-nodes')).toHaveCount(0);
	await expect(header.locator('text, image, script, filter')).toHaveCount(0);
	await expect(header).toHaveAttribute('aria-hidden', 'true');
	await expect(header).toHaveAttribute('focusable', 'false');

	const svgResponse = await request.get('/favicon.svg');
	expect(svgResponse.status()).toBe(200);
	expect(svgResponse.headers()['content-type']).toContain('image/svg+xml');
	const svg = await svgResponse.text();
	expect(svg).toBe(favicon);
	expect(Buffer.byteLength(svg)).toBeLessThan(6000);
	expect(svg).not.toMatch(
		/<text|<filter|<script|<foreignObject|<image|<animate|font-family/i,
	);
	const parsed = await page.evaluate((source) => {
		const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
		return {
			invalid: !!doc.querySelector('parsererror'),
			viewBox: doc.documentElement.getAttribute('viewBox'),
			letters: [...doc.querySelectorAll('.af-logo-letters path')].map((path) =>
				path.getAttribute('d'),
			),
			graphs: doc.querySelectorAll('.af-logo-edges, .af-logo-nodes').length,
		};
	}, svg);
	expect(parsed).toEqual({
		invalid: false,
		viewBox: monogram.viewBoxFavicon,
		letters: [...monogram.letterPaths],
		graphs: 0,
	});
	expect(svg).toContain(faviconMarkup);

	const social = await page.evaluate((source) => {
		const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
		const letters = doc.querySelector('.af-logo-letters');
		return {
			invalid: !!doc.querySelector('parsererror'),
			letters: [...doc.querySelectorAll('.af-logo-letters path')].map((path) =>
				path.getAttribute('d'),
			),
			transform: letters?.parentElement?.getAttribute('transform'),
			text: doc.documentElement.textContent,
			decorativeRules: [...doc.querySelectorAll('path')].filter((path) =>
				/^M70 80h1060/.test(path.getAttribute('d') ?? ''),
			).length,
		};
	}, socialImage);
	expect(social).toMatchObject({
		invalid: false,
		letters: [...monogram.letterPaths],
		transform: 'translate(870 175) scale(2.8)',
		decorativeRules: 0,
	});
	expect(social.text).toContain(profile.givenName);
	expect(social.text).toContain(profile.familyName);
	expect(social.text).toContain(profile.role);
	expect(socialImage).toContain(monogramMarkup);

	const png = await request.get('/favicon.png');
	expect(png.status()).toBe(200);
	expect(png.headers()['content-type']).toContain('image/png');
	const actual = await sharp(await png.body())
		.ensureAlpha()
		.raw()
		.toBuffer();
	const expected = await sharp(Buffer.from(svg))
		.resize(32, 32)
		.ensureAlpha()
		.raw()
		.toBuffer();
	expect(actual.equals(expected)).toBe(true);

	const og = await request.get('/og-image.png');
	expect(og.status()).toBe(200);
	expect(await sharp(await og.body()).metadata()).toMatchObject({
		format: 'png',
		width: 1200,
		height: 630,
	});
	const crop = await sharp(await og.body())
		.extract({ left: 950, top: 200, width: 150, height: 160 })
		.removeAlpha()
		.raw()
		.toBuffer();
	let whitePixels = 0;
	for (let i = 0; i < crop.length; i += 3)
		if (crop[i] > 230 && crop[i + 1] > 230 && crop[i + 2] > 230) whitePixels++;
	expect(whitePixels).toBeGreaterThan(700);
});

test('the favicon keeps only the italic letter outlines at 16, 32 and 64 pixels', async () => {
	for (const size of [16, 32, 64]) {
		const { data, info } = await sharp(Buffer.from(favicon))
			.resize(size, size)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect(info).toMatchObject({ width: size, height: size, channels: 3 });
		let white = 0;
		let coloredGraphPixels = 0;
		for (let i = 0; i < data.length; i += 3) {
			const [r, g, b] = data.subarray(i, i + 3);
			if (r > 100 && g > 110 && b > 130 && b - r < 35) white++;
			if (Math.max(r, g, b) > 100 && (b - r > 35 || r - g > 35 || r - b > 35))
				coloredGraphPixels++;
		}
		expect(white, `${size}px lettering`).toBeGreaterThan(
			size === 16 ? 20 : size === 32 ? 100 : 400,
		);
		expect(coloredGraphPixels, `${size}px graph accents`).toBe(0);
	}
});

test('the lowercase af home link stays accessible, responsive and localized without changing navigation', async ({
	page,
	browser,
	site,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	for (const [path, home, name] of [
		['/blog/', '/', 'inicio'],
		['/en/contact/', '/en/', 'home'],
	]) {
		await page.goto(path);
		const logo = page.getByRole('link', {
			name: 'af — Alberto Fernández Gálvez, ' + name,
			exact: true,
		});
		await expect(logo).toHaveAttribute('href', home);
		await expect(logo.locator('text, img')).toHaveCount(0);
		await expect(logo.locator('svg')).toBeVisible();
		await expect(logo).toHaveCSS('color', 'rgb(248, 250, 255)');
		await logo.hover();
		await expect(logo).toHaveCSS('color', 'rgb(169, 214, 245)');
		for (const width of [320, 375, 768, 1440]) {
			await page.setViewportSize({ width, height: 1000 });
			await expect(logo).toHaveCSS('width', '44px');
			await expect(logo).toHaveCSS('height', '44px');
			await expect(logo.locator('svg')).toHaveAttribute('width', '44');
			await expect(page.locator('.primary-nav a')).toHaveCount(3);
			await expect(page.locator('.language-nav a')).toHaveCount(2);
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
			).toBe(true);
		}
		await logo.focus();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(site.baseURL + home);
	}
	const audit = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(audit.violations).toEqual([]);
	expect(errors).toEqual([]);
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 320, height: 812 },
	});
	try {
		const staticPage = await context.newPage();
		await staticPage.goto(site.baseURL + '/en/blog/');
		await staticPage
			.getByRole('link', {
				name: 'af — Alberto Fernández Gálvez, home',
				exact: true,
			})
			.click();
		await expect(staticPage).toHaveURL(site.baseURL + '/en/');
		await expect(
			staticPage.locator('.wordmark svg .af-logo-letters path'),
		).toHaveCount(2);
		await expect(
			staticPage.locator(
				'.wordmark svg .af-logo-edges, .wordmark svg .af-logo-nodes',
			),
		).toHaveCount(0);
	} finally {
		await context.close();
	}
});
