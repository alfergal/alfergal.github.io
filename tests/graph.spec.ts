import { type Page } from '@playwright/test';
import { test, expect, runAstro } from './support/site';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Captured from the original SVG before enhancement: all 92 nodes and 322 edges (color is intentionally excluded).
const originalFingerprint =
	'a6ce10f4adf6f3bd354595090b6241f9b03cdad8d4dbebf2092bb9d80a9c30df';
const geometry = (page: Page) =>
	page.locator('.graph-network').evaluate((svg) => ({
		nodes: [...svg.querySelectorAll('.graph-dot')].map((el) =>
			['cx', 'cy', 'r', 'opacity'].map((a) => el.getAttribute(a)),
		),
		edges: [...svg.querySelectorAll('.graph-edge')].map((el) =>
			['x1', 'y1', 'x2', 'y2', 'opacity'].map((a) => el.getAttribute(a)),
		),
	}));
const fingerprint = async (page: Page) =>
	createHash('sha256')
		.update(JSON.stringify(await geometry(page)))
		.digest('hex');
const graph = (page: Page) => page.locator('.graph-network');
const atRest = (page: Page) =>
	expect(graph(page)).toHaveAttribute('data-simulation', 'idle', {
		timeout: 10_000,
	});
async function center(page: Page, id: number) {
	const box = await page
		.locator(`[data-node="${id}"] .graph-dot`)
		.boundingBox();
	if (!box) throw new Error('Missing graph node');
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function start(page: Page) {
	await page.goto('/');
	await expect(graph(page)).toHaveAttribute('data-ready', '');
	await page.evaluate(() => document.fonts.ready);
}
async function idleMutations(page: Page) {
	return graph(page).evaluate(
		(svg) =>
			new Promise<number>((resolve) => {
				let changes = 0;
				const observer = new MutationObserver((records) => {
					changes += records.length;
				});
				observer.observe(svg, {
					subtree: true,
					attributes: true,
					childList: true,
				});
				setTimeout(() => {
					observer.disconnect();
					resolve(changes);
				}, 350);
			}),
	);
}

test('rest preserves original geometry, stays idle and produces a screenshot', async ({
	page,
	site,
}) => {
	await start(page);
	await expect(page.locator('.graph-dot')).toHaveCount(92);
	await expect(page.locator('.graph-edge')).toHaveCount(322);
	expect(await fingerprint(page)).toBe(originalFingerprint);
	await atRest(page);
	await graph(page).screenshot({ path: '.qa/graph-rest.png' });
	expect(await idleMutations(page)).toBe(0);
	const home = await readFile(join(site.output, 'index.html'), 'utf8');
	expect(home).toContain('<script');
	expect(await readFile(join(site.output, '404.html'), 'utf8')).not.toContain(
		'<script',
	);
});

test('hover is subtle and click pulses only immediate connections, then cleans itself up', async ({
	page,
}) => {
	await start(page);
	const point = await center(page, 0);
	await page.mouse.move(point.x, point.y);
	await expect(page.locator('[data-node="0"]')).toHaveAttribute(
		'data-active',
		'',
	);
	expect(
		await page.locator('.graph-edge[data-active]').count(),
	).toBeGreaterThan(0);
	await expect(graph(page)).toHaveCSS('cursor', 'grab');
	await atRest(page);
	await expect
		.poll(async () =>
			page
				.locator('[data-node="0"] .graph-dot')
				.evaluate((el) => parseFloat(getComputedStyle(el).r)),
		)
		.toBeGreaterThan(5);
	await page.mouse.click(point.x, point.y);
	await expect(page.locator('.graph-effects > g')).toHaveCount(1);
	const degree = await page
		.locator('.graph-edge[data-source="0"], .graph-edge[data-target="0"]')
		.count();
	await expect(page.locator('.graph-effects line')).toHaveCount(degree);
	await expect(page.locator('.graph-effects > g')).toHaveCount(0, {
		timeout: 2000,
	});
	await page.mouse.move(0, 0);
	expect(await fingerprint(page)).toBe(originalFingerprint);
});

test('drag deforms neighbors, keeps endpoints joined, bounds displacement and returns exactly to idle', async ({
	page,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await start(page);
	const before = (await geometry(page)).nodes;
	const point = await center(page, 0);
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 80, point.y + 45, { steps: 12 });
	await expect(graph(page)).toHaveAttribute('data-dragging', '');
	await expect(graph(page)).toHaveCSS('cursor', 'grabbing');
	await expect
		.poll(async () => {
			const current = (await geometry(page)).nodes;
			return current.filter(
				(n, i) =>
					i !== 0 &&
					Math.hypot(
						Number(n[0]) - Number(before[i][0]),
						Number(n[1]) - Number(before[i][1]),
					) > 0.5,
			).length;
		})
		.toBeGreaterThan(0);
	const detached = await page.locator('.graph-edge').evaluateAll((lines) =>
		lines.some((line) => {
			for (const [id, x, y] of [
				[line.getAttribute('data-source'), 'x1', 'y1'],
				[line.getAttribute('data-target'), 'x2', 'y2'],
			]) {
				const dot = document.querySelector(`[data-node="${id}"] .graph-dot`)!;
				if (
					+line.getAttribute(x!)! !== +dot.getAttribute('cx')! ||
					+line.getAttribute(y!)! !== +dot.getAttribute('cy')!
				)
					return true;
			}
			return false;
		}),
	);
	expect(detached).toBe(false);
	await page.mouse.move(point.x + 900, point.y - 600, { steps: 5 });
	const current = (await geometry(page)).nodes;
	current.forEach((n, i) => {
		expect(
			Math.hypot(
				Number(n[0]) - Number(before[i][0]),
				Number(n[1]) - Number(before[i][1]),
			),
		).toBeLessThanOrEqual(105.001);
		expect(Number(n[0])).toBeGreaterThan(10);
		expect(Number(n[0])).toBeLessThan(510);
		expect(Number(n[1])).toBeGreaterThan(10);
		expect(Number(n[1])).toBeLessThan(390);
	});
	await page.mouse.up();
	await expect(page.locator('.graph-effects > g')).toHaveCount(0);
	await atRest(page);
	expect(await fingerprint(page)).toBe(originalFingerprint);
	expect(await idleMutations(page)).toBe(0);
	expect(errors).toEqual([]);
});

test('consecutive drags and interrupted capture leave no persistent distortion', async ({
	page,
}) => {
	await start(page);
	for (const id of [0, 15, 59]) {
		const point = await center(page, id);
		await page.mouse.move(point.x, point.y);
		await page.mouse.down();
		await page.mouse.move(point.x - 40, point.y + 30, { steps: 8 });
		await page.mouse.up();
	}
	await atRest(page);
	expect(await fingerprint(page)).toBe(originalFingerprint);
	const point = await center(page, 0);
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 30, point.y + 30, { steps: 5 });
	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	await page.mouse.up();
	await atRest(page);
	await expect(graph(page)).not.toHaveAttribute('data-dragging');
	expect(await fingerprint(page)).toBe(originalFingerprint);
});

test('keyboard can select, pulse, displace and restore every node with a single tab stop', async ({
	page,
}) => {
	await start(page);
	await graph(page).focus();
	await page.keyboard.press('End');
	await expect(graph(page)).toHaveAttribute('aria-label', /Nodo 92 de 92/);
	await page.keyboard.press('ArrowRight');
	await expect(graph(page)).toHaveAttribute('aria-label', /Nodo 1 de 92/);
	await page.keyboard.press('Enter');
	await expect(page.locator('.graph-effects > g')).toHaveCount(1);
	await expect(page.locator('.graph-effects > g')).toHaveCount(0, {
		timeout: 2000,
	});
	await page.keyboard.down('Shift');
	await page.keyboard.down('ArrowRight');
	expect(Number((await geometry(page)).nodes[0][0])).toBeGreaterThan(204);
	await page.keyboard.up('ArrowRight');
	await page.keyboard.up('Shift');
	await atRest(page);
	expect(await fingerprint(page)).toBe(originalFingerprint);
	await page.keyboard.press('Escape');
	await atRest(page);
});

test('reduced motion avoids physics and expanding pulses, including a live preference change', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await start(page);
	const before = (await geometry(page)).nodes;
	const point = await center(page, 0);
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 40, point.y + 30, { steps: 5 });
	await atRest(page);
	expect((await geometry(page)).nodes.slice(1)).toEqual(before.slice(1));
	await page.mouse.up();
	expect(await fingerprint(page)).toBe(originalFingerprint);
	await page.mouse.click(point.x, point.y);
	await expect(page.locator('.graph-effects > g')).toHaveCount(0);
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 40, point.y + 30, { steps: 5 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.mouse.up();
	await atRest(page);
	expect(await fingerprint(page)).toBe(originalFingerprint);
});

test('without JavaScript the original SVG remains static and decorative', async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto(`${baseURL}/`);
		await expect(graph(page)).toHaveAttribute('aria-hidden', 'true');
		await expect(graph(page)).not.toHaveAttribute('tabindex');
		expect(await fingerprint(page)).toBe(originalFingerprint);
	} finally {
		await context.close();
	}
});

test('touch can drag nodes while empty SVG space still allows page scrolling', async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		hasTouch: true,
		isMobile: true,
		viewport: { width: 375, height: 812 },
	});
	try {
		const page = await context.newPage();
		await page.goto(`${baseURL}/`);
		await expect(graph(page)).toHaveAttribute('data-ready', '');
		await graph(page).scrollIntoViewIfNeeded();
		const session = await context.newCDPSession(page);
		const point = await center(page, 0);
		const touch = async (
			type: 'touchStart' | 'touchMove' | 'touchEnd',
			x = point.x,
			y = point.y,
		) =>
			session.send('Input.dispatchTouchEvent', {
				type,
				touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
			});
		await touch('touchStart');
		for (let i = 1; i <= 6; i++) {
			await touch('touchMove', point.x + i * 7, point.y + i * 3);
			await page.waitForTimeout(30);
		}
		await expect(graph(page)).toHaveAttribute('data-dragging', '');
		expect(Number((await geometry(page)).nodes[0][0])).toBeGreaterThan(204);
		await touch('touchEnd');
		await atRest(page);
		expect(await fingerprint(page)).toBe(originalFingerprint);
		const box = await graph(page).boundingBox();
		if (!box) throw new Error('Missing SVG');
		const beforeScroll = await page.evaluate(() => scrollY);
		await touch('touchStart', box.x + 5, box.y + box.height - 10);
		for (let i = 1; i <= 6; i++) {
			await touch('touchMove', box.x + 5, box.y + box.height - 10 - i * 22);
			await page.waitForTimeout(30);
		}
		await touch('touchEnd');
		await expect
			.poll(() => page.evaluate(() => scrollY))
			.toBeGreaterThan(beforeScroll + 40);
	} finally {
		await context.close();
	}
});

test('equilibrium stops when animation frames outnumber physical steps', async ({
	page,
}) => {
	// Emulate twice as many display callbacks per unit of simulation time.
	await page.addInitScript(() => {
		const request = window.requestAnimationFrame.bind(window);
		const origin = performance.now();
		window.requestAnimationFrame = (callback) =>
			request((time) => callback(origin + (time - origin) / 2));
	});
	await start(page);
	const point = await center(page, 0);
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 40, point.y + 30, { steps: 8 });
	await page.mouse.up();
	await atRest(page);
	expect(await fingerprint(page)).toBe(originalFingerprint);
	expect(await idleMutations(page)).toBe(0);
});

test('sync and build cannot invalidate graph dependencies in a running dev server', async ({
	page,
	request,
	site,
}) => {
	test.setTimeout(60_000);
	const dependencies = new Set<string>();
	const errors: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/deps/d3-force.js'))
			dependencies.add(request.url());
	});
	page.on('pageerror', (error) => errors.push(error.message));
	await start(page);
	expect(dependencies.size).toBeGreaterThan(0);
	const originalURLs = [...dependencies];
	for (const command of ['sync', 'build']) {
		await runAstro(site.root, command);
		for (const url of originalURLs)
			expect((await request.get(url)).status(), `${command}: ${url}`).toBe(200);
	}
	await page.reload({ waitUntil: 'networkidle' });
	await expect(graph(page)).toHaveAttribute('data-ready', '');
	const point = await center(page, 0);
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 50, point.y + 30, { steps: 8 });
	await expect(graph(page)).toHaveAttribute('data-dragging', '');
	await page.mouse.up();
	await atRest(page);
	expect(await fingerprint(page)).toBe(originalFingerprint);
	expect(errors).toEqual([]);
});
