import AxeBuilder from '@axe-core/playwright';
import { profile } from '../src/data/profile';
import { ui } from '../src/i18n/ui';
import { expect, test } from './support/site';

test('Spanish and English contact pages show direct contact links and remain accessible and responsive', async ({
	page,
	site,
}) => {
	for (const [lang, path] of [
		['es', '/contacto/'],
		['en', '/en/contact/'],
	] as const) {
		const t = ui[lang];
		const response = await page.goto(site.productionURL + path);
		expect(response?.status()).toBe(200);
		await expect(page.locator('html')).toHaveAttribute('lang', lang);
		await expect(page.locator('h1')).toHaveText(t.contact);
		await expect(page.locator('.contact-page > .page-intro')).toHaveText(
			t.contactIntro,
		);

		const options = page.locator('.contact-option');
		await expect(options).toHaveCount(3);
		await expect(options.locator('h2')).toHaveText([
			t.emailLabel,
			'LinkedIn',
			'GitHub',
		]);
		await expect(options.nth(0).locator('a')).toHaveAttribute(
			'href',
			`mailto:${profile.email}`,
		);
		await expect(options.nth(0).locator('a')).toHaveText(profile.email);
		await expect(options.nth(1).locator('a')).toHaveAttribute(
			'href',
			profile.linkedin,
		);
		await expect(options.nth(2).locator('a')).toHaveAttribute(
			'href',
			profile.github,
		);

		const footer = page.locator('.site-footer');
		await expect(
			footer.locator(`a[href="mailto:${profile.email}"]`),
		).toHaveText(profile.email);
		await expect(footer.locator(`a[href="${profile.linkedin}"]`)).toHaveCount(1);
		await expect(footer.locator(`a[href="${profile.github}"]`)).toHaveCount(1);
		await expect(footer.locator('a.footer-rss')).toBeVisible();

		await expect(page.locator('form, input, textarea, button')).toHaveCount(0);
		await expect(page.locator('body')).not.toContainText(
			/Formspree|formulario|send a message|form is not active/i,
		);

		for (const width of [320, 375, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth,
				),
			).toBe(true);
		}
		const accessibility = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		await page.setViewportSize({ width: 1440, height: 1000 });
	}
});
