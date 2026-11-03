import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { monogram } from '../src/lib/monogram';
import { favicon } from '../src/lib/favicon';
import { socialImage } from '../src/lib/social-image';
import { palette } from '../src/data/theme';
import { profile } from '../src/data/profile';

test('header, SVG favicon, PNG favicon and social image share the AF paths without a font dependency', async ({
	page,
	request,
}) => {
	await page.goto('/');
	const paths = await page
		.locator('.wordmark svg path')
		.evaluateAll((items) => items.map((item) => item.getAttribute('d')));
	expect(paths).toEqual([...monogram.paths]);
	await expect(page.locator('.wordmark svg')).toHaveAttribute(
		'viewBox',
		'0 0 64 64',
	);
	await expect(page.locator('.wordmark svg')).toHaveAttribute(
		'aria-hidden',
		'true',
	);
	await expect(page.locator('.wordmark svg')).toHaveAttribute(
		'focusable',
		'false',
	);
	const response = await request.get('/favicon.svg');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('image/svg+xml');
	const svg = await response.text();
	expect(svg).toBe(favicon);
	expect(Buffer.byteLength(svg)).toBeLessThan(1000);
	expect(svg).not.toMatch(
		/<text|<filter|<script|<foreignObject|<image|<animate|gradient|font-family/i,
	);
	const result = await page.evaluate((source) => {
		const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
		return {
			invalid: !!doc.querySelector('parsererror'),
			paths: [...doc.querySelectorAll('path')].map((path) =>
				path.getAttribute('d'),
			),
			stroke: doc.querySelector('g')?.getAttribute('stroke-width'),
		};
	}, svg);
	expect(result).toEqual({
		invalid: false,
		paths: [...monogram.paths],
		stroke: '4',
	});
	const png = await request.get('/favicon.png');
	expect(png.status()).toBe(200);
	expect(png.headers()['content-type']).toContain('image/png');
	const actual = await sharp(await png.body())
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const expected = await sharp(Buffer.from(svg))
		.resize(32, 32)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	expect(actual.info).toMatchObject({ width: 32, height: 32, channels: 4 });
	expect(actual.data.equals(expected.data)).toBe(true);
	const social = await page.evaluate((source) => {
		const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
		return {
			invalid: !!doc.querySelector('parsererror'),
			paths: [...doc.querySelector('g')!.querySelectorAll('path')].map((path) =>
				path.getAttribute('d'),
			),
			scale: doc.querySelector('g')?.getAttribute('transform'),
			text: doc.documentElement.textContent,
		};
	}, socialImage);
	expect(social.invalid).toBe(false);
	expect(social.paths).toEqual([...monogram.paths]);
	expect(social.scale).toBe('translate(1026 96) scale(1.5)');
	expect(social.text).toContain(profile.givenName);
	expect(social.text).toContain(profile.familyName);
	expect(social.text).toContain(profile.role);
	const og = await request.get('/og-image.png');
	expect(og.status()).toBe(200);
	expect(await sharp(await og.body()).metadata()).toMatchObject({
		format: 'png',
		width: 1200,
		height: 630,
	});
	// The actual social image must contain the white mark in its reserved clear area.
	const crop = await sharp(await og.body())
		.extract({ left: 1026, top: 96, width: 96, height: 96 })
		.removeAlpha()
		.raw()
		.toBuffer();
	const whitePixels = Array.from(
		{ length: 96 * 96 },
		(_, i) =>
			crop[i * 3] > 230 && crop[i * 3 + 1] > 230 && crop[i * 3 + 2] > 230,
	).filter(Boolean).length;
	expect(whitePixels).toBeGreaterThan(900);
	expect(whitePixels).toBeLessThan(2000);
});

test('16, 32 and 64 pixel rasterizations retain F stems, the shared bar and the open A counter', async () => {
	const background = [1, 3, 5].map((i) =>
		parseInt(palette.background.slice(i, i + 2), 16),
	);
	for (const size of [16, 32, 64]) {
		const { data, info } = await sharp(Buffer.from(favicon))
			.resize(size, size)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect(info).toMatchObject({ width: size, height: size, channels: 3 });
		const pixel = (x: number, y: number) => {
			const index =
				(Math.floor((y * size) / 64) * size + Math.floor((x * size) / 64)) * 3;
			return [...data.subarray(index, index + 3)];
		};
		// Orthogonal segments stay opaque even at 16px; counters remain dark.
		for (const [x, y] of [
			[38, 42],
			[50, 14],
			[32, 34],
		]) {
			const rgb = pixel(x, y);
			expect(
				Math.min(...rgb),
				size + 'px segment at ' + x + ',' + y,
			).toBeGreaterThan(230);
		}
		for (const [x, y] of [
			[18, 26],
			[18, 46],
		]) {
			const rgb = pixel(x, y);
			rgb.forEach((value, channel) =>
				expect(
					Math.abs(value - background[channel]),
					size + 'px counter',
				).toBeLessThan(size === 16 ? 32 : 4),
			);
		}
	}
});

test('the AF home link remains accessible, responsive and localized without changing navigation', async ({
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
			name: 'AF — Alberto Fernández Gálvez, ' + name,
			exact: true,
		});
		await expect(logo).toHaveAttribute('href', home);
		await expect(logo.locator('text, img')).toHaveCount(0);
		await expect(logo.locator('svg')).toBeVisible();
		for (const width of [320, 375, 768, 1440]) {
			await page.setViewportSize({ width, height: 1000 });
			await expect(logo).toHaveCSS('width', '44px');
			await expect(logo).toHaveCSS('height', '44px');
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
				name: 'AF — Alberto Fernández Gálvez, home',
				exact: true,
			})
			.click();
		await expect(staticPage).toHaveURL(site.baseURL + '/en/');
		await expect(staticPage.locator('.wordmark svg path')).toHaveCount(3);
	} finally {
		await context.close();
	}
});
