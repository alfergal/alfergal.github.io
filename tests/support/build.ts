import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { profile } from '../../src/data/profile';
import { SITE_TITLE, SITE_DESCRIPTION } from '../../src/consts';
import type { TestSite } from './site';
import { listedEntries } from './site';

export async function xmlValues(page: Page, source: string, selector: string) {
	return page.evaluate(
		({ source, selector }) => {
			const doc = new DOMParser().parseFromString(source, 'application/xml');
			if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
			return [...doc.querySelectorAll(selector)].map(
				(element) => element.textContent ?? '',
			);
		},
		{ source, selector },
	);
}
const walk = async (directory: string): Promise<string[]> =>
	(
		await Promise.all(
			(await readdir(directory, { withFileTypes: true })).map((entry) =>
				entry.isDirectory()
					? walk(join(directory, entry.name))
					: [join(directory, entry.name)],
			),
		)
	).flat();

export async function verifyBuild(
	site: TestSite,
	page: Page,
	request: APIRequestContext,
) {
	const published = site.entries.filter((entry) => !entry.draft);
	const drafts = site.entries.filter((entry) => entry.draft);
	const files = await walk(site.output);
	const pages = files.filter((file) => file.endsWith('.html'));
	expect(
		pages.map((file) => relative(site.output, file).replace(/\\/g, '/')).sort(),
	).toEqual(
		[
			'404.html',
			'index.html',
			'blog/index.html',
			'contacto/index.html',
			'en/index.html',
			'en/blog/index.html',
			'en/contact/index.html',
			...published.map((entry) => entry.path.slice(1) + 'index.html'),
		].sort(),
	);
	for (const file of pages) {
		const html = await readFile(file, 'utf8');
		const refs = await page.evaluate((html) => {
			const doc = new DOMParser().parseFromString(html, 'text/html');
			return [...doc.querySelectorAll('[href], [src], [srcset]')].flatMap(
				(element) => [
					...['href', 'src'].flatMap((attr) =>
						element.hasAttribute(attr) ? [element.getAttribute(attr)!] : [],
					),
					...(element
						.getAttribute('srcset')
						?.split(',')
						.map((value) => value.trim().split(/\s+/)[0]) ?? []),
				],
			);
		}, html);
		const path = relative(site.output, file)
			.replace(/\\/g, '/')
			.replace(/index\.html$/, '');
		for (const ref of refs) {
			const url = new URL(ref, `${profile.site}/${path}`);
			if (url.origin !== new URL(profile.site).origin) continue;
			const target = resolve(
				site.output,
				`.${decodeURIComponent(url.pathname)}`,
				url.pathname.endsWith('/') ? 'index.html' : '',
			);
			expect(
				target.startsWith(`${resolve(site.output)}/`),
				`${file} → ${ref}`,
			).toBe(true);
			expect(
				await stat(target)
					.then((s) => s.isFile())
					.catch(() => false),
				`${file} → ${ref}`,
			).toBe(true);
			if (url.hash) {
				const targetHTML = await readFile(target, 'utf8');
				expect(
					await page.evaluate(
						({ html, id }) =>
							new DOMParser()
								.parseFromString(html, 'text/html')
								.getElementById(id) !== null,
						{ html: targetHTML, id: decodeURIComponent(url.hash.slice(1)) },
					),
					`${file} → ${ref}`,
				).toBe(true);
			}
		}
	}
	if (!site.fixtureOnly) {
		for (const file of files.filter((name) =>
			/\.(html|xml|json|js)$/.test(name),
		)) {
			const source = await readFile(file, 'utf8');
			for (const marker of [
				'PUBLICACION_SINTETICA_SOLO_TEST',
				'BORRADOR_EXPLICITO_SOLO_TEST',
				'BORRADOR_IMPLICITO_SOLO_TEST',
			])
				expect(source, file).not.toContain(marker);
		}
	}

	const home = await request.get(`${site.productionURL}/`);
	expect(home.status()).toBe(200);
	await page.goto(site.productionURL);
	await expect(page.locator('meta[name=robots][content*=noindex]')).toHaveCount(
		0,
	);
	await expect(page.locator('.post-card h3 a')).toHaveText(
		published
			.filter((entry) => entry.lang === 'es')
			.slice(0, 3)
			.map((entry) => entry.title),
	);
	await page.goto(site.productionURL + '/blog/');
	await expect(page.locator('.post-card h3 a')).toHaveText(
		listedEntries(published.filter((entry) => entry.lang === 'es')).map(
			(entry) => entry.title,
		),
	);
	const rssResponse = await request.get(`${site.productionURL}/rss.xml`);
	expect(rssResponse.status()).toBe(200);
	const rss = await rssResponse.text();
	expect(rssResponse.headers()['content-type']).toMatch(
		/(?:application|text)\/(?:rss\+)?xml/,
	);
	expect(
		await page.evaluate((source) => {
			const xml = new DOMParser().parseFromString(source, 'application/xml');
			return {
				root: xml.documentElement.localName,
				version: xml.documentElement.getAttribute('version'),
				invalid: !!xml.querySelector('parsererror'),
			};
		}, rss),
	).toEqual({ root: 'rss', version: '2.0', invalid: false });
	expect(await xmlValues(page, rss, 'channel > title')).toEqual([SITE_TITLE]);
	expect(await xmlValues(page, rss, 'channel > description')).toEqual([
		SITE_DESCRIPTION,
	]);
	expect(await xmlValues(page, rss, 'channel > link')).toEqual([
		`${profile.site}/`,
	]);
	expect(await xmlValues(page, rss, 'channel > language')).toEqual(['es-es']);
	expect(await xmlValues(page, rss, 'item link')).toEqual(
		published
			.filter((entry) => entry.lang === 'es')
			.map((entry) => profile.site + entry.path),
	);
	const sitemapIndex = await readFile(
		join(site.output, 'sitemap-index.xml'),
		'utf8',
	);
	const sitemapFiles = await xmlValues(page, sitemapIndex, 'sitemap loc');
	const locations: string[] = [];
	for (const url of sitemapFiles)
		locations.push(
			...(await xmlValues(
				page,
				await readFile(join(site.output, new URL(url).pathname), 'utf8'),
				'url loc',
			)),
		);
	expect(locations.sort()).toEqual(
		[
			`${profile.site}/`,
			...['/blog/', '/contacto/', '/en/', '/en/blog/', '/en/contact/'].map(
				(path) => profile.site + path,
			),
			...published.map((entry) => profile.site + entry.path),
		].sort(),
	);
	for (const entry of drafts) {
		expect(
			(await request.get(site.productionURL + entry.path)).status(),
			entry.id,
		).toBe(404);
		for (const file of files.filter((name) =>
			/\.(html|xml|json|js)$/.test(name),
		)) {
			expect(await readFile(file, 'utf8'), file).not.toContain(entry.path);
		}
	}
	expect(await readFile(join(site.output, 'robots.txt'), 'utf8')).toContain(
		`Sitemap: ${profile.site}/sitemap-index.xml`,
	);
	expect(
		await stat(join(site.output, '.nojekyll')).then((s) => s.isFile()),
	).toBe(true);
}
