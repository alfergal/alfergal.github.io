import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';
import { xmlValues } from './support/build';
import { ui } from '../src/i18n/ui';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const pages = [
	['/', '/en/'],
	['/blog/', '/en/blog/'],
	['/contacto/', '/en/contact/'],
] as const;

test('six static pages provide reciprocal language links, active navigation and localized SEO', async ({
	page,
	site,
}) => {
	for (const pair of pages) {
		for (const [index, path] of pair.entries()) {
			const lang = index ? 'en' : 'es';
			const t = ui[lang];
			expect((await page.goto(site.productionURL + path))!.status()).toBe(200);
			await expect(page.locator('html')).toHaveAttribute('lang', lang);
			await expect(page.locator('.primary-nav a')).toHaveText([
				t.home,
				t.blog,
				t.contact,
			]);
			await expect(
				page.locator('.primary-nav [aria-current=page]'),
			).toHaveAttribute('href', path);
			await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
				'href',
				'https://alfergal.github.io' + path,
			);
			await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
				'content',
				lang === 'es' ? 'es_ES' : 'en_GB',
			);
			await expect(page.locator('.language-nav a')).toHaveText(['ES', 'EN']);
			for (const [i, target] of pair.entries()) {
				await expect(
					page.locator('link[hreflang="' + (i ? 'en' : 'es') + '"]'),
				).toHaveAttribute('href', 'https://alfergal.github.io' + target);
				await expect(page.locator('.language-nav a').nth(i)).toHaveAttribute(
					'href',
					target,
				);
			}
			await page
				.locator('.language-nav a')
				.nth(1 - index)
				.click();
			await expect(page).toHaveURL(site.productionURL + pair[1 - index]);
		}
	}
});

test('profile, education and certification content is concise and localized', async ({
	page,
	site,
}) => {
	for (const [lang, prefix] of [
		['es', '/'],
		['en', '/en/'],
	] as const) {
		await page.goto(site.productionURL + prefix);
		await expect(page.locator('h1')).toHaveText('Alberto Fernández Gálvez');
		await expect(page.locator('.hero-role')).toHaveText(ui[lang].role);
		await expect(page.locator('.hero-description')).toHaveCount(3);
		await expect(page.locator('.hero-description').first()).toContainText(
			lang === 'es'
				? 'seis años de experiencia profesional en ingeniería'
				: 'over six years of professional experience in software engineering',
		);
		await expect(page.locator('.hero a')).toHaveCount(0);
		await expect(
			page.locator(
				'.experience-section, #experience-title, .experience-card, .experience-milestone',
			),
		).toHaveCount(0);
		await expect(page.locator('.education-card')).toHaveCount(2);
		await expect(page.locator('.hero-description').nth(1)).toContainText(
			lang === 'es'
				? 'tecnología, las finanzas, la investigación científica y la sostenibilidad'
				: 'technology, finance, scientific research and sustainability',
		);
		await expect(page.locator('.education-card h3')).toHaveText(
			lang === 'es'
				? [
						'Grado universitario en Ciencia de Datos Aplicada',
						'Técnico Superior en Desarrollo de Aplicaciones Web',
					]
				: [
						'Undergraduate Studies in Applied Data Science',
						'Higher Technician in Web Application Development',
					],
		);
		await expect(page.locator('.education-card p')).toHaveCount(2);
		await expect(page.locator('.education-card').first()).toContainText(
			lang === 'es'
				? 'preparación y visualización de datos, modelado predictivo, Machine Learning y evaluación de resultados'
				: 'data preparation and visualisation, predictive modelling, Machine Learning and the evaluation of results',
		);
		await expect(
			page.locator(
				'.education-period, .education-status, .education-grade, .education-institution',
			),
		).toHaveCount(0);
		await expect(page.locator('.certification-card')).toHaveCount(5);
		await expect(page.locator('.certification-card h4')).toHaveText([
			'Neo4j Graph Data Science Certification',
			'Deep Learning Specialization',
			'Machine Learning Specialization',
			'IBM Data Science Professional Certificate',
			'Python for Everybody Specialization',
		]);
		await expect(
			page.locator('.certification-card .certification-issuer'),
		).toHaveText([
			'Neo4j',
			'DeepLearning.AI',
			'DeepLearning.AI',
			'IBM',
			'University of Michigan',
		]);
		await expect(page.locator('.certification-card > *')).toHaveCount(10);
		await expect(
			page.locator(
				'.certification-date, .certification-duration, .certification-meta, .certification-earned',
			),
		).toHaveCount(0);
		await expect(page.locator('.professional-content > section')).toHaveCount(
			2,
		);
		await expect(page.locator('#what-title, #skills-title')).toHaveCount(0);
		for (const cover of await page
			.locator('.latest-articles .article-card-cover')
			.all()) {
			const image = cover.locator('img');
			if (await image.count()) {
				await expect(image).toHaveAttribute('alt', /.+/);
			} else {
				await expect(
					cover.locator('.article-cover-art--type'),
				).toBeVisible();
				await expect(cover).toHaveAttribute('aria-hidden', 'true');
			}
		}
		await expect(
			page.locator('iframe, input[type=email], form[action], .newsletter'),
		).toHaveCount(0);
	}
});

test('interests and blog introductions use the requested bilingual editorial copy', async ({
	page,
	site,
}) => {
	for (const [lang, home, blog] of [
		['es', '/', '/blog/'],
		['en', '/en/', '/en/blog/'],
	] as const) {
		await page.goto(site.productionURL + home.trim());
		await expect(page.locator('.hero-description').nth(1)).toContainText(
			lang === 'es'
				? 'tecnología, las finanzas, la investigación científica y la sostenibilidad'
				: 'technology, finance, scientific research and sustainability',
		);
		await page.goto(site.productionURL + blog);
		await expect(page.locator('.blog-heading p')).toHaveText(
			ui[lang].blogIntro,
		);
	}
});

test('home shows the three newest posts per language and blog lists only that language', async ({
	page,
	site,
}) => {
	for (const [lang, prefix] of [
		['es', '/'],
		['en', '/en/'],
	] as const) {
		const entries = site.entries.filter(
			(entry) => entry.lang === lang && !entry.draft,
		);
		await page.goto(site.productionURL + prefix);
		await expect(page.locator('.latest-articles .post-card h3 a')).toHaveText(
			entries.slice(0, 3).map((entry) => entry.title),
		);
		await expect(page.locator('.latest-articles .text-link')).toHaveAttribute(
			'href',
			prefix + 'blog/',
		);
		await page.goto(site.productionURL + prefix + 'blog/');
		const links = await page
			.locator('.post-card h3 a')
			.evaluateAll((items) =>
				items.map((item) => (item as HTMLAnchorElement).pathname),
			);
		expect(new Set(links).size).toBe(links.length);
		expect(links.sort()).toEqual(entries.map((entry) => entry.path).sort());
		if (lang === 'en') {
			await expect(
				page.getByRole('combobox', { name: 'Category', exact: true }),
			).toBeVisible();
			await page
				.getByRole('combobox', { name: 'Category', exact: true })
				.selectOption('Machine Learning');
			await expect(page.getByRole('status')).toHaveText('1 publications');
			await expect(page.locator('.featured-posts')).toBeVisible();
		}
	}
});

test('real translation identities preserve dates, use distinct slugs and never expose draft counterparts', async ({
	page,
	site,
}) => {
	const es = '/blog/qa-verification-new/';
	const en = '/en/blog/qa-verification-english/';
	for (const path of [es, en]) {
		await page.goto(site.productionURL + path);
		await expect(page.locator('.language-nav a').nth(0)).toHaveAttribute(
			'href',
			es,
		);
		await expect(page.locator('.language-nav a').nth(1)).toHaveAttribute(
			'href',
			en,
		);
		await expect(page.locator('link[hreflang=en]')).toHaveAttribute(
			'href',
			'https://alfergal.github.io' + en,
		);
		const schema = await page
			.locator('script[type="application/ld+json"]')
			.evaluate((el) => JSON.parse(el.textContent!));
		expect(schema.datePublished).toBe('2021-01-01T00:00:00.000Z');
		expect(schema.dateModified).toBe('2021-02-01T00:00:00.000Z');
		expect(schema.inLanguage).toBe(path === es ? 'es' : 'en');
	}
	await expect(page.locator('.article-toc summary')).toHaveText(
		'In this article',
	);
	await expect(page.locator('.code-toolbar button')).toHaveText('Copy');
	await expect(
		page.getByRole('complementary', { name: 'Note', exact: true }),
	).toBeVisible();
	await expect(page.locator('.article-return')).toHaveText('Back to home');
	await expect(page.locator('.article-header')).not.toContainText(
		'min de lectura',
	);
	await page.goto(site.productionURL + '/blog/qa-verification-old/');
	const fallback = page.locator('.language-nav a').nth(1);
	await expect(fallback).toHaveAttribute('href', '/en/blog/');
	await expect(fallback).toHaveAttribute(
		'title',
		/translation is not available/,
	);
	await expect(page.locator('link[hreflang=en]')).toHaveCount(0);
	expect(
		(
			await page.request.get(
				site.productionURL + '/en/blog/qa-verification-english-draft/',
			)
		).status(),
	).toBe(404);
	await fallback.click();
	await expect(page).toHaveURL(site.productionURL + '/en/blog/');
});

test('RSS and sitemap contain only published language-specific routes and real translation links', async ({
	page,
	request,
	site,
}) => {
	await page.goto(site.productionURL);
	for (const [lang, prefix] of [
		['es', '/'],
		['en', '/en/'],
	] as const) {
		const response = await request.get(site.productionURL + prefix + 'rss.xml');
		expect(response.status()).toBe(200);
		const xml = await response.text();
		expect(await xmlValues(page, xml, 'channel > link')).toEqual([
			'https://alfergal.github.io' + prefix,
		]);
		expect(await xmlValues(page, xml, 'item link')).toEqual(
			site.entries
				.filter((entry) => entry.lang === lang && !entry.draft)
				.map((entry) => 'https://alfergal.github.io' + entry.path),
		);
		expect(await xmlValues(page, xml, 'channel > language')).toEqual([
			lang === 'es' ? 'es-es' : 'en-gb',
		]);
		await page.goto(site.productionURL + prefix + 'blog/');
		await expect(
			page.locator('link[type="application/rss+xml"]'),
		).toHaveAttribute(
			'href',
			'https://alfergal.github.io' + prefix + 'rss.xml',
		);
		await expect(page.locator('footer .footer-rss')).toHaveAttribute(
			'href',
			prefix + 'rss.xml',
		);
	}
	const sitemap = await readFile(join(site.output, 'sitemap-0.xml'), 'utf8');
	const parsed = await page.evaluate((xml) => {
		const doc = new DOMParser().parseFromString(xml, 'application/xml');
		return [...doc.querySelectorAll('url')].map((item) => ({
			url: item.querySelector('loc')!.textContent,
			translations: [
				...item.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link'),
			].map((link) => link.getAttribute('href')),
		}));
	}, sitemap);
	const known = new Set(parsed.map((entry) => entry.url));
	for (const entry of parsed)
		for (const url of entry.translations) expect(known.has(url!)).toBe(true);
	expect(sitemap).not.toContain('english-draft');
	expect(sitemap).not.toContain('/en/blog/qa-verification-new/');
	expect(
		(
			await request.get(site.productionURL + '/en/blog/third-english/')
		).status(),
	).toBe(200);
});

test('navigation works without JavaScript and all six pages remain responsive and accessible', async ({
	page,
	site,
	browser,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const path of pages.flat()) {
		await page.goto(site.productionURL + path);
		for (const width of [320, 375, 768, 1440]) {
			await page.setViewportSize({ width, height: 1000 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
				path + ' at ' + width,
			).toBe(true);
			for (const link of await page.locator('.primary-nav a').all())
				await expect(link).toBeVisible();
		}
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(results.violations, path).toEqual([]);
	}
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 320, height: 812 },
	});
	try {
		const staticPage = await context.newPage();
		await staticPage.goto(site.productionURL + '/');
		await staticPage.locator('.language-nav a').nth(1).click();
		await staticPage.locator('.primary-nav a').nth(2).click();
		await expect(staticPage).toHaveURL(site.productionURL + '/en/contact/');
		await expect(staticPage.locator('h1')).toHaveText('Contact');
	} finally {
		await context.close();
	}
});

test('scientific component interface is English while experiment values remain unchanged', async ({
	page,
	site,
}) => {
	await page.goto(site.productionURL + '/en/blog/qa-verification-english/');
	const temperature = page.locator('temperature-explorer');
	const slider = temperature.getByRole('slider', { name: 'Temperature T:' });
	await expect(slider).toBeEnabled();
	await slider.focus();
	await page.keyboard.press('ArrowRight');
	await expect(temperature.locator('[data-temp-value]')).toHaveText('1.05');
	await expect(temperature.locator('[data-temp-status]')).toContainText(
		'Temperature 1.05.',
	);
	await expect(temperature.locator('[data-temp-auc]')).toHaveText('0.991700');
	await expect(temperature.locator('h3')).toHaveText(
		'Explore one ranking with different probabilities',
	);
	const comparison = page.locator('image-comparison');
	await expect(
		comparison.getByRole('slider', {
			name: 'Visible portion: Synthetic input',
		}),
	).toBeEnabled();
	await expect(comparison).not.toContainText('Porción visible');
	await expect(comparison).toContainText('use the arrow keys');
});
