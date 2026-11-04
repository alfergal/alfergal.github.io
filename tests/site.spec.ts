import { test, expect, listedEntries, type TestSite } from './support/site';
import { verifyBuild } from './support/build';
import { categoryLabel } from '../src/i18n';
import { blogCategories } from '../src/data/blog';
import AxeBuilder from '@axe-core/playwright';

const articleFor = (site: TestSite) =>
	site.entries.find((entry) => entry.id === 'demostracion-articulo-tecnico') ??
	site.entries[0];
const routesFor = (site: TestSite) => [
	'/',
	...(articleFor(site) ? [`/blog/${articleFor(site)!.id}/`] : []),
];

test('one personal homepage presents the profile, education and integrated articles', async ({
	page,
	request,
	site,
}) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('Alberto Fernández Gálvez');
	await expect(page.locator('.hero-role')).toHaveText(
		'Data Scientist | Machine Learning | Applied Statistics',
	);
	await expect(page.locator('.hero-description')).toHaveCount(3);
	await expect(page.locator('.wordmark')).toHaveAttribute(
		'aria-label',
		'αf — Alberto Fernández Gálvez, inicio',
	);
	await expect(page.locator('.wordmark svg')).toHaveCount(1);
	await expect(page.locator('.graph-network')).toBeVisible();
	await expect(
		page.locator(
			'.graph-network text, .hero button, .hero input, .hero select, .timeline',
		),
	).toHaveCount(0);
	await expect(page.locator('.hero a')).toHaveCount(0);
	await expect(page.locator('footer')).toContainText(
		'Alberto Fernández Gálvez',
	);
	await expect(page.locator('footer .footer-rss')).toHaveText('RSS (XML)');
	await expect(page.locator('footer .footer-rss')).toHaveAttribute(
		'href',
		'/rss.xml',
	);
	await expect(page.locator('footer .footer-rss')).toHaveAttribute(
		'title',
		/lector RSS/,
	);
	await expect(
		page.locator('.experience-section, #experience-title, .experience-card'),
	).toHaveCount(0);
	await expect(page.locator('#education-title')).toHaveText(
		'Formación académica',
	);
	await expect(page.locator('.education-card')).toHaveCount(2);
	await expect(page.locator('.certification-card')).toHaveCount(5);
	await expect(page.locator('.latest-articles')).toBeVisible();
	await expect(page.locator('#latest-title')).toHaveText('Últimos artículos');
	await expect(
		page.locator('.latest-articles .post-card .article-card-cover'),
	).toHaveCount(
		Math.min(
			3,
			site.entries.filter(
				(entry) =>
					entry.lang === 'es' && entry.id !== 'demostracion-articulo-tecnico',
			).length,
		),
	);
	await expect(
		page.locator(
			'.latest-articles a[href="/blog/demostracion-articulo-tecnico/"]',
		),
	).toHaveCount(0);
	await expect(
		page.locator('.latest-articles .article-card-cover img[alt=""]'),
	).toHaveCount(0);
	const coverSources = await page
		.locator('.latest-articles .article-card-cover img')
		.evaluateAll((images) =>
			images.map((image) => (image as HTMLImageElement).src),
		);
	for (const source of coverSources)
		expect((await request.get(source)).status()).toBe(200);
	for (const card of await page.locator('.latest-articles .post-card').all()) {
		const image = card.locator('.article-card-cover img');
		await expect(image).toHaveAttribute('loading', 'lazy');
		await expect(image).toHaveAttribute('width', '1280');
		await expect(image).toHaveAttribute('height', '800');
		await expect(card.locator('a')).toHaveCount(1);
		await expect(card.locator('.post-card-category')).toBeVisible();
		await expect(card.locator('.article-meta time')).toBeVisible();
		await expect(card.locator('.article-meta')).toContainText(/\d+ min/);
	}
	await page.goto('/blog/');
	const demoPreview = page.locator(
		'.post-card a[href="/blog/demostracion-articulo-tecnico/"]',
	);
	await expect(demoPreview).toHaveCount(0);
	if (
		site.entries.some((entry) => entry.id === 'demostracion-articulo-tecnico')
	) {
		expect(
			(await page.goto('/blog/demostracion-articulo-tecnico/'))?.status(),
		).toBe(200);
		await expect(page.locator('.draft-notice')).toBeVisible();
	}
	await page.goto('/');
	if (site.entries.filter((entry) => !entry.draft).length < 3)
		await expect(page.locator('.blog-filters, .featured-posts')).toHaveCount(0);
	for (const route of routesFor(site)) {
		expect((await page.goto(route))?.status()).toBe(200);
		await expect(page.locator('main h1')).toHaveCount(1);
		await expect(page.locator('meta[name=author]')).toHaveAttribute(
			'content',
			'Alberto Fernández Gálvez',
		);
		await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
			'href',
			`https://alfergal.github.io${route}`,
		);
		await expect(page.locator('meta[name=description]')).toHaveAttribute(
			'content',
			/.+/,
		);
		await expect(page.locator('.primary-nav a')).toHaveText([
			'Inicio',
			'Blog',
			'Contacto',
		]);
	}
});

test('dark theme is permanent and the site creates no storage or cookies', async ({
	page,
	context,
}) => {
	for (const colorScheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme });
		await page.goto('/');
		expect(
			await page
				.locator('body')
				.evaluate((el) => getComputedStyle(el).backgroundColor),
		).toBe('rgb(8, 15, 38)');
		await expect(page.locator('meta[name=color-scheme]')).toHaveAttribute(
			'content',
			'dark',
		);
		expect(
			await page.evaluate(() => ({
				local: localStorage.length,
				session: sessionStorage.length,
			})),
		).toEqual({ local: 0, session: 0 });
	}
	expect(await context.cookies()).toEqual([]);
});

test('obsolete pages return 404 unless an article slug has been deliberately reused', async ({
	request,
	site,
}) => {
	for (const route of [
		'/about/',
		'/cv/',
		'/research/',
		'/research/reproducibility/',
		'/projects/',
		'/talks/',
		'/contact/',
		'/privacy/',
		'/blog/first-post/',
		'/blog/using-mdx/',
	]) {
		if (site.entries.some((entry) => route === `/blog/${entry.id}/`)) continue;
		expect((await request.get(route)).status(), route).toBe(404);
	}
});

test('the integrated blog lists the collection in date order with readable metadata', async ({
	page,
	site,
}) => {
	await page.goto('/blog/');
	await expect(page.locator('.post-card h3 a')).toHaveText(
		listedEntries(site.entries.filter((entry) => entry.lang === 'es')).map(
			(entry) => entry.title,
		),
	);
	for (const entry of site.entries.filter(
		(entry) =>
			entry.lang === 'es' &&
			entry.id !== 'demostracion-articulo-tecnico',
	)) {
		const link = page.locator(`h3 a[href="/blog/${entry.id}/"]`);
		const card = page.locator('.post-card').filter({ has: link });
		await expect(card.locator('time')).toHaveAttribute(
			'datetime',
			/\d{4}-\d{2}-\d{2}/,
		);
		await expect(card.locator('.article-meta')).toContainText(
			/\d+ min de lectura/,
		);
		await expect(card.locator('.draft-label')).toHaveCount(entry.draft ? 1 : 0);
		expect(blogCategories).toContain(entry.category);
		await expect(card.locator('.post-card-category')).toContainText(
			categoryLabel(entry.category, entry.lang),
		);
	}
	if (!site.entries.length)
		await expect(page.locator('.blog-empty')).toBeVisible();
});

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
	test(`readable responsive homepage and article at ${width}px`, async ({
		page,
		site,
	}) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		for (const route of routesFor(site)) {
			await page.goto(route);
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
				`${width}px ${route}`,
			).toBe(true);
			expect(
				await page
					.locator('h1, h2, h3, h4')
					.evaluateAll((elements) =>
						elements
							.filter((el) => el.scrollWidth > el.clientWidth + 1)
							.map((el) => el.textContent),
					),
				`${width}px ${route}`,
			).toEqual([]);
		}
		await page.goto('/');
		const articleGrid = page.locator('.latest-articles .post-list');
		if (await articleGrid.count()) {
			const columns = await articleGrid.evaluate(
				(el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
			);
			expect(columns).toBe(width <= 600 ? 1 : width <= 900 ? 2 : 3);
		}
		const educationGrid = page.locator('.education-grid');
		if (await educationGrid.count()) {
			const columns = await educationGrid.evaluate(
				(el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
			);
			expect(columns).toBe(width <= 600 ? 1 : 2);
			const sectionTone = await page
				.locator('.education-section')
				.evaluate((el) => getComputedStyle(el).backgroundColor);
			const cardTone = await page
				.locator('.education-card')
				.first()
				.evaluate((el) => getComputedStyle(el).backgroundColor);
			expect(cardTone).not.toBe(sectionTone);
		}
		const certificationGrid = page.locator('.certification-grid');
		const certificationLayout = await certificationGrid
			.locator('.certification-card')
			.evaluateAll((cards) =>
				cards.map((card) => {
					const { x, y, width } = card.getBoundingClientRect();
					return { x, y, width };
				}),
			);
		const certificationRows = new Set(
			certificationLayout.map((card) => Math.round(card.y)),
		);
		expect(certificationRows.size).toBe(
			width <= 600 ? 5 : width <= 900 ? 3 : 2,
		);
		const gridBounds = await certificationGrid.boundingBox();
		const lastCard = certificationLayout.at(-1)!;
		const lastCardCenter =
			width > 900
				? ([certificationLayout[3], certificationLayout[4]].reduce(
						(sum, card) => sum + card.x + card.width / 2,
						0,
					) /
					2)
				: lastCard.x + lastCard.width / 2;
		expect(
			Math.abs(lastCardCenter - (gridBounds!.x + gridBounds!.width / 2)),
		).toBeLessThan(2);
	});
}

test('links work without JavaScript and keyboard users can skip to main content', async ({
	browser,
	baseURL,
	page,
	site,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 375, height: 812 },
	});
	const noJS = await context.newPage();
	await noJS.goto(`${baseURL}/blog/`);
	const entry =
		site.entries.find(
			(item) => item.id !== 'demostracion-articulo-tecnico',
		) ?? site.entries[0];
	if (entry) {
		await noJS.locator(`.post-card a[href="/blog/${entry.id}/"]`).click();
		await expect(noJS.locator('h1')).toHaveText(entry.title);
		await noJS.locator('.back-link').first().click();
	}
	await expect(noJS.locator('h1')).toHaveText('Alberto Fernández Gálvez');
	await context.close();
	await page.goto('/');
	await page.keyboard.press('Tab');
	await expect(
		page.getByRole('link', { name: 'Saltar al contenido' }),
	).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('main')).toBeFocused();
});

test('production matches published content, resolves links and excludes every draft', async ({
	page,
	request,
	site,
}) => {
	await verifyBuild(site, page, request);
});

for (const colorScheme of ['light', 'dark'] as const) {
	test(`WCAG accessibility with ${colorScheme} system preference`, async ({
		page,
		site,
	}) => {
		await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
		for (const route of routesFor(site)) {
			await page.goto(route);
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(results.violations, route).toEqual([]);
		}
	});
}
