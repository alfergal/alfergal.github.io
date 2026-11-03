import { test, expect } from './support/site';
import AxeBuilder from '@axe-core/playwright';

test('static production comparators keep independent controls and clean up on reconnection', async ({
	page,
	site,
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto(site.productionURL + '/blog/qa-verification-comparison/');
	const components = page.locator('image-comparison');
	await expect(components).toHaveCount(2);
	for (const component of await components.all())
		await expect(component).toHaveAttribute('data-ready', '');
	const ids = await components
		.locator('input')
		.evaluateAll((inputs) => inputs.map((input) => input.id));
	expect(new Set(ids).size).toBe(2);
	const first = components.nth(0).locator('input');
	await first.focus();
	await page.keyboard.press('End');
	await expect(components.nth(0).locator('output')).toHaveText('100 %');
	await expect(components.nth(1).locator('output')).toHaveText('50 %');
	await components.nth(0).evaluate((el) => {
		const parent = el.parentNode!;
		for (let i = 0; i < 10; i++) {
			el.remove();
			parent.appendChild(el);
		}
	});
	for (const component of await components.all()) {
		await expect(component).toHaveAttribute('data-ready', '');
		const slider = component.locator('input');
		await slider.focus();
		await page.keyboard.press('Home');
		await page.keyboard.press('ArrowRight');
		await expect(slider).toHaveValue('1');
		await expect(component.locator('output')).toHaveText('1 %');
	}
	const audit = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(audit.violations).toEqual([]);
	expect(errors).toEqual([]);
});
