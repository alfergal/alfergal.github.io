import { test, expect } from './support/site';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';

const slug = '/blog/una-arista-cambia-red-resistencia-efectiva/';
const title = '¿Puede una sola arista cambiar toda una red?';
const subtitle =
	'Resistencia efectiva, teoría espectral y las matemáticas de las conexiones críticas.';
const resultsPath = join(
	process.cwd(),
	'experiments/resistencia-efectiva/resultados.json',
);
const format = (value: number) =>
	value.toLocaleString('es-ES', {
		minimumFractionDigits: 3,
		maximumFractionDigits: 3,
	});
const formatChange = (before: number, after: number) => {
	const percent = ((after - before) / before) * 100;
	const sign = percent < -0.00005 ? '−' : percent > 0.00005 ? '+' : '';
	return `${sign}${Math.abs(percent).toLocaleString('es-ES', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})} %`;
};

async function visibleCharacterCount(page: import('@playwright/test').Page) {
	return page.locator('.prose').evaluate((article) => {
		const header = document.querySelector('.article-header') as HTMLElement;
		const backLink = header.querySelector('.back-link') as HTMLElement | null;
		const previousBackDisplay = backLink?.getAttribute('style');
		if (backLink) backLink.style.display = 'none';
		const headerText = header.innerText;
		if (backLink) {
			if (previousBackDisplay === null) backLink.removeAttribute('style');
			else backLink.setAttribute('style', previousBackDisplay ?? '');
		}
		const svgs = Array.from(article.querySelectorAll('svg'));
		const previousStyles = svgs.map((svg) => svg.getAttribute('style'));
		svgs.forEach((svg) => (svg.style.display = 'none'));
		let body = (article as HTMLElement).innerText;
		svgs.forEach((svg, index) => {
			const style = previousStyles[index];
			if (style === null) svg.removeAttribute('style');
			else svg.setAttribute('style', style ?? '');
		});
		for (const node of article.querySelectorAll('.katex-mathml')) {
			const duplicate = (node as HTMLElement).innerText;
			if (duplicate) body = body.replace(duplicate, '');
		}
		const svgLabels = Array.from(article.querySelectorAll('svg text'))
			.map((node) => node.textContent?.trim() ?? '')
			.filter(Boolean);
		const tableOfContents =
			document.querySelector('.article-toc summary')?.textContent?.trim() ?? '';
		const optionLabels = Array.from(
			article.querySelectorAll('select option'),
		).map((option) => option.textContent?.trim() ?? '');
		return Array.from(
			[headerText, tableOfContents, body, ...svgLabels, ...optionLabels].join(
				'\n',
			),
		).length;
	});
}

test('effective resistance draft renders the complete article and stays within its rendered character limit', async ({
	page,
	request,
	site,
}) => {
	const response = await page.goto(`${site.baseURL}${slug}`);
	expect(response?.status()).toBe(200);
	await expect(page.locator('.draft-notice')).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
		'content',
		/noindex/,
	);
	await expect(page.locator('.article-header h1')).toHaveText(title);
	await expect(page.locator('.article-header .description')).toHaveText(
		subtitle,
	);
	await expect(page.locator('.article-category')).toContainText('Data Science');
	await expect(page.locator('.article-header .tags li')).toHaveText([
		'Network Science',
		'Graph Theory',
		'Spectral Graph Theory',
		'Linear Algebra',
		'Python',
	]);
	await expect(page.locator('.prose h2')).toHaveCount(6);
	await expect(page.locator('.prose figure')).toHaveCount(3);
	await expect(page.locator('.prose .experiment-plot svg')).toHaveCount(2);
	await expect(page.locator('.prose table tbody tr')).toHaveCount(4);
	await expect(page.locator('.prose .katex-display')).toHaveCount(5);
	await expect(page.locator('.katex-error, .katex-mathml merror')).toHaveCount(
		0,
	);
	await expect(page.locator('.prose a[href^="https://"]')).toHaveCount(5);
	await expect(page.locator('effective-resistance-explorer')).toBeVisible();

	const maximumCounts = [await visibleCharacterCount(page)];
	const graph = page.locator('effective-resistance-explorer');
	const selectU = graph.locator('[data-node-u]');
	const selectV = graph.locator('[data-node-v]');
	const addButton = graph.locator('[data-add]');
	const resetButton = graph.locator('[data-reset]');

	await selectU.selectOption('A');
	await selectV.selectOption('B');
	await expect(addButton).toBeDisabled();
	await expect(graph.locator('[data-status]')).toContainText(
		'ya existe',
	);
	maximumCounts.push(await visibleCharacterCount(page));
	await selectU.focus();
	await page.keyboard.press('ArrowDown');
	await selectV.selectOption('H');
	await selectV.focus();
	await page.keyboard.press('ArrowUp');
	await expect(selectU).toHaveValue('B');
	await expect(selectV).toHaveValue('G');
	await addButton.focus();
	await page.keyboard.press('Enter');
	await expect(graph.locator('[data-status]')).toContainText(
		'Añadida B–G',
	);
	maximumCounts.push(await visibleCharacterCount(page));
	await resetButton.click();

	const experiment = JSON.parse(await readFile(resultsPath, 'utf8')) as {
		interactive: {
			kirchhoff: number;
			lambda2: number;
			resistances: number[][];
			candidates: {
				u: string;
				v: string;
				kirchhoff: number;
				lambda2: number;
				resistances: number[][];
			}[];
		};
	};
	const nodes = 'ABCDEFGH';
	for (const candidate of experiment.interactive.candidates) {
		await selectU.selectOption(candidate.u);
		await selectV.selectOption(candidate.v);
		await expect(addButton).toBeEnabled();
		await addButton.focus();
		await page.keyboard.press('Enter');
		const u = nodes.indexOf(candidate.u);
		const v = nodes.indexOf(candidate.v);
		await expect(graph.locator('[data-added-edge]')).toHaveAttribute(
			'display',
			'inline',
		);
		await expect(graph.locator('[data-resistance]')).toHaveText(
			`${format(experiment.interactive.resistances[u][v])} → ${format(candidate.resistances[u][v])}`,
		);
		await expect(graph.locator('[data-kirchhoff]')).toHaveText(
			`${format(experiment.interactive.kirchhoff)} → ${format(candidate.kirchhoff)}`,
		);
		await expect(graph.locator('[data-lambda]')).toHaveText(
			`${format(experiment.interactive.lambda2)} → ${format(candidate.lambda2)}`,
		);
		await expect(graph.locator('[data-resistance-change]')).toHaveText(
			formatChange(
				experiment.interactive.resistances[u][v],
				candidate.resistances[u][v],
			),
		);
		await expect(graph.locator('[data-kirchhoff-change]')).toHaveText(
			formatChange(experiment.interactive.kirchhoff, candidate.kirchhoff),
		);
		await expect(graph.locator('[data-lambda-change]')).toHaveText(
			formatChange(experiment.interactive.lambda2, candidate.lambda2),
		);
		maximumCounts.push(await visibleCharacterCount(page));
		await resetButton.click();
		await expect(graph.locator('[data-added-edge]')).toHaveAttribute(
			'display',
			'none',
		);
	}

	const largest = Math.max(...maximumCounts);
	console.log(`[network-article-chars] ${largest}`);
	expect(
		largest,
		`Rendered content has ${largest} visible Unicode code points`,
	).toBeGreaterThanOrEqual(4000);
	expect(
		largest,
		`Rendered content has ${largest} visible Unicode code points`,
	).toBeLessThanOrEqual(6000);

	for (const width of [320, 375, 768, 1440]) {
		await page.setViewportSize({ width, height: 960 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
			`Page overflows at ${width}px`,
		).toBe(true);
		if (width <= 375) {
			expect(
				await graph.evaluate(
					(element) => element.scrollWidth <= element.clientWidth,
				),
			).toBe(true);
		}
	}
	await page.setViewportSize({ width: 1440, height: 960 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	expect(
		await graph
			.locator('.network')
			.evaluate((node) => getComputedStyle(node).animationName),
	).toBe('none');
	const accessibility = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(accessibility.violations).toEqual([]);

	const production = await request.get(`${site.productionURL}${slug}`);
	expect(production.status()).toBe(404);
	const siteFiles = await import('node:fs/promises').then((fs) =>
		fs.readdir(site.output, { recursive: true }),
	);
	for (const file of siteFiles.filter((entry) =>
		/\.(?:html|xml)$/.test(entry),
	)) {
		const html = await import('node:fs/promises').then((fs) =>
			fs.readFile(join(site.output, file), 'utf8'),
		);
		expect(html).not.toContain(title);
		expect(html).not.toContain('una-arista-cambia-red-resistencia-efectiva');
	}
});

test('network article keeps a useful static graph when JavaScript is disabled', async ({
	browser,
	site,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 390, height: 844 },
	});
	try {
		const page = await context.newPage();
		const response = await page.goto(`${site.baseURL}${slug}`);
		expect(response?.status()).toBe(200);
		const graph = page.locator('effective-resistance-explorer');
		await expect(graph.locator('svg[role="img"] line[data-edge]')).toHaveCount(
			9,
		);
		await expect(graph.locator('[data-added-edge]')).toHaveAttribute(
			'display',
			'none',
		);
		await expect(graph.locator('[data-node-u]')).toBeDisabled();
		await expect(graph.locator('[data-kirchhoff]')).toContainText('46,000');
		await expect(graph.locator('[data-lambda]')).toContainText('0,291');
	} finally {
		await context.close();
	}
});
