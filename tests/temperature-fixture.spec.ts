import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';

test('multiple explorers work independently in development and static production with unique accessible IDs and clean reconnection', async ({
	page,
	site,
}) => {
	expect(site.fixtureOnly).toBe(true);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	for (const base of [site.baseURL, site.productionURL]) {
		await page.goto(`${base}/blog/qa-verification-temperature/`);
		const explorers = page.locator('temperature-explorer');
		await expect(explorers).toHaveCount(2);
		const ids = await page
			.locator('[id]')
			.evaluateAll((items) => items.map((item) => item.id));
		expect(new Set(ids).size).toBe(ids.length);
		const slider = explorers
			.first()
			.getByRole('slider', { name: 'Temperatura T:' });
		await expect(slider).toBeEnabled();
		await slider.focus();
		await page.keyboard.press('End');
		await expect(explorers.first().locator('[data-temp-value]')).toHaveText(
			'3,00',
		);
		await expect(explorers.last().locator('[data-temp-value]')).toHaveText(
			'1,00',
		);
		await expect(explorers.last().getByRole('slider')).toHaveValue('1');
		const id = await slider.getAttribute('id');
		await explorers.first().evaluate((element) => {
			const parent = element.parentNode!;
			parent.removeChild(element);
			parent.appendChild(element);
		});
		const reconnected = page.locator(`#${id}`);
		await expect(reconnected).toBeEnabled();
		await reconnected.focus();
		await page.keyboard.press('Home');
		await expect(reconnected).toHaveAttribute('aria-valuetext', '0,50');
		const audit = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(audit.violations).toEqual([]);
	}
	expect(errors).toEqual([]);
});
