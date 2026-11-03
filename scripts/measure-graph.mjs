// Local, instrumented Chromium comparison. No screenshots and no physical-device claims.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { cpus, platform } from 'node:os';

const [directory, label, output] = process.argv.slice(2);
if (!directory || !label || !output)
	throw new Error(
		'Usage: node scripts/measure-graph.mjs DIST_DIRECTORY LABEL OUTPUT.json',
	);
const root = resolve(directory);
const types = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.xml': 'application/xml',
	'.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
	try {
		const path = resolve(
			root,
			'.' +
				decodeURIComponent(new URL(request.url, 'http://localhost').pathname),
		);
		if (path !== root && !path.startsWith(root + '/'))
			throw new Error('outside root');
		const file = (await stat(path)).isDirectory()
			? resolve(path, 'index.html')
			: path;
		response.setHeader(
			'Content-Type',
			types[extname(file)] ?? 'application/octet-stream',
		);
		response.end(await readFile(file));
	} catch {
		response.writeHead(404);
		response.end('Not found');
	}
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
	headless: true,
	...(process.env.CHROME_PATH
		? { executablePath: process.env.CHROME_PATH }
		: {}),
});
const results = [];
const metric = async (cdp) =>
	Object.fromEntries(
		(await cdp.send('Performance.getMetrics')).metrics.map(
			({ name, value }) => [name, value],
		),
	);
try {
	for (const profile of [
		{ name: 'desktop', width: 1440, height: 1000, rate: 1 },
		{ name: 'mobile-emulated-4x', width: 375, height: 812, rate: 4 },
	]) {
		if (
			process.env.GRAPH_BENCH_PROFILE &&
			process.env.GRAPH_BENCH_PROFILE !== profile.name
		)
			continue;
		for (let run = 1; run <= 3; run++) {
			const mobile = profile.rate > 1;
			const context = await browser.newContext({
				viewport: { width: profile.width, height: profile.height },
				isMobile: mobile,
				hasTouch: mobile,
				deviceScaleFactor: 1,
			});
			const page = await context.newPage();
			const cdp = await context.newCDPSession(page);
			await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.rate });
			await cdp.send('Performance.enable');
			await page.goto(url, { waitUntil: 'networkidle' });
			await page.waitForSelector('.graph-network[data-ready]');
			await page.locator('.graph-network').evaluate((svg) => {
				const rect = svg.getBoundingClientRect();
				if (rect.top < 0 || rect.bottom > innerHeight)
					svg.scrollIntoView({ block: 'center', behavior: 'instant' });
			});
			await page.waitForTimeout(2000);
			await page.evaluate(() => {
				let count = 0,
					childChanges = 0,
					frames = [],
					last = 0,
					raf = 0,
					longTasks = 0;
				const observer = new MutationObserver((records) => {
					count += records.filter(
						(record) => record.type === 'attributes',
					).length;
					childChanges += records.filter(
						(record) => record.type === 'childList',
					).length;
				});
				observer.observe(document.querySelector('.graph-network'), {
					subtree: true,
					attributes: true,
					childList: true,
				});
				const tasks = new PerformanceObserver((list) => {
					longTasks += list.getEntries().length;
				});
				tasks.observe({ type: 'longtask' });
				const frame = (time) => {
					if (last) frames.push(time - last);
					last = time;
					raf = requestAnimationFrame(frame);
				};
				window.graphProbe = {
					start() {
						count = childChanges = longTasks = 0;
						frames = [];
						last = 0;
						raf = requestAnimationFrame(frame);
					},
					stop() {
						cancelAnimationFrame(raf);
						const sorted = [...frames].sort((a, b) => a - b);
						return {
							attributeMutations: count,
							childChanges,
							rafHz: frames.length
								? (1000 * frames.length) / frames.reduce((a, b) => a + b, 0)
								: 0,
							frameP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
							longTasks,
						};
					},
					dispose() {
						observer.disconnect();
						tasks.disconnect();
						cancelAnimationFrame(raf);
					},
				};
			});
			const measure = async (phase, action) => {
				await cdp.send('HeapProfiler.collectGarbage');
				const before = await metric(cdp);
				await page.evaluate(() => window.graphProbe.start());
				const start = performance.now();
				await action();
				const elapsed = (performance.now() - start) / 1000;
				const probe = await page.evaluate(() => window.graphProbe.stop());
				const after = await metric(cdp);
				const record = {
					profile: profile.name,
					run,
					phase,
					elapsedSeconds: elapsed,
					...probe,
					mutationsPerSecond: probe.attributeMutations / elapsed,
					mainThreadPercent:
						((after.TaskDuration - before.TaskDuration) / elapsed) * 100,
					scriptMsPerSecond:
						((after.ScriptDuration - before.ScriptDuration) / elapsed) * 1000,
					heapUsedMiB: after.JSHeapUsedSize / 1048576,
				};
				results.push(record);
				console.log(JSON.stringify(record));
			};
			await measure('ambient', () => page.waitForTimeout(6000));
			const box = await page
				.locator('[data-node="0"] .graph-dot')
				.boundingBox();
			const x = box.x + box.width / 2,
				y = box.y + box.height / 2;
			const point = async (type, px = x, py = y) =>
				mobile
					? cdp.send('Input.dispatchTouchEvent', {
							type,
							touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py, id: 1 }],
						})
					: type === 'touchStart'
						? page.mouse.down()
						: type === 'touchEnd'
							? page.mouse.up()
							: page.mouse.move(px, py);
			if (!mobile) await page.mouse.move(x, y);
			await point('touchStart');
			await measure('drag', async () => {
				for (let i = 0; i < 60; i++) {
					await point(
						'touchMove',
						x + Math.sin(i / 10) * 40,
						y + Math.sin(i / 15) * 25,
					);
					await page.waitForTimeout(40);
				}
			});
			await point('touchEnd');
			await measure('recovery', () => page.waitForTimeout(3000));
			await page.evaluate(() => {
				document.body.style.minHeight = '4000px';
				document.documentElement.style.scrollBehavior = 'auto';
			});
			await measure('scroll', async () => {
				// Scripted scroll under emulation, not a physical device's compositor/gesture measurement.
				await page.evaluate(
					() =>
						new Promise((resolve) => {
							const start = performance.now();
							const origin = scrollY;
							function move(time) {
								const t = Math.min(1, (time - start) / 2000);
								scrollTo(0, origin + t * 2000);
								if (t < 1) requestAnimationFrame(move);
								else resolve();
							}
							requestAnimationFrame(move);
						}),
				);
			});
			await page.evaluate(() => window.graphProbe.dispose());
			await cdp.send('HeapProfiler.collectGarbage');
			const retainedBefore = (await metric(cdp)).JSHeapUsedSize;
			await page.evaluate(() => {
				const graph = document.querySelector('elastic-graph');
				const parent = graph.parentNode;
				for (let i = 0; i < 20; i++) {
					graph.remove();
					parent.append(graph);
				}
			});
			await page.waitForTimeout(250);
			await cdp.send('HeapProfiler.collectGarbage');
			results.push({
				profile: profile.name,
				run,
				phase: 'reconnect',
				heapDeltaKiB:
					((await metric(cdp)).JSHeapUsedSize - retainedBefore) / 1024,
			});
			await context.close();
		}
	}
	await mkdir(dirname(resolve(output)), { recursive: true });
	await writeFile(
		output,
		JSON.stringify(
			{
				label,
				browser: browser.version(),
				node: process.version,
				platform: platform(),
				cpu: cpus()[0]?.model,
				notes:
					'Three instrumented runs per profile on local production HTML. Mobile viewport/touch plus CDP 4x CPU throttling, NOT physical hardware. rAF Hz is callback delivery, not GPU/rendered FPS. Main-thread percentage is CDP TaskDuration/wall time; script time excludes rendering. MutationObserver and rAF sampling add overhead to both versions. GC is forced before each phase and retained-heap checks. No screenshots.',
				results,
			},
			null,
			2,
		) + '\n',
	);
} finally {
	await browser.close();
	await new Promise((resolve) => server.close(resolve));
}
