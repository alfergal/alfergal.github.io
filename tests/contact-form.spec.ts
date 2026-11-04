import { expect, test } from './support/site';
import AxeBuilder from '@axe-core/playwright';

const testEndpoint = 'https://formspree.io/f/testform123';
const corsHeaders = { 'access-control-allow-origin': '*' };

test('configured form is translated, accessible, validated and reports a real provider response', async ({
	page,
	site,
}) => {
	for (const [path, labels, lang] of [
		['/contacto/', ['Nombre', 'Correo electrónico', 'Asunto', 'Mensaje'], 'es'],
		['/en/contact/', ['Name', 'Email address', 'Subject', 'Message'], 'en'],
	] as const) {
		await page.goto(site.productionURL + path);
		await expect(page.locator('html')).toHaveAttribute('lang', lang);
		const form = page.locator('[data-contact-form]');
		await expect(form).toHaveAttribute('action', testEndpoint);
		await expect(form.locator('label')).toHaveText([
			...labels,
			lang === 'es' ? 'Deja este campo vacío' : 'Leave this field blank',
		]);
		await expect(form.locator('input[required]')).toHaveCount(3);
		await expect(form.locator('textarea[required]')).toHaveCount(1);
		await expect(form.locator('input[type=email]')).toHaveAttribute(
			'autocomplete',
			'email',
		);
		await expect(page.locator('.contact-privacy-notice')).toContainText(
			'Isolated test notice',
		);
		await expect(
			page.locator('.contact-profiles .professional-links a'),
		).toHaveText(['LinkedIn', 'GitHub']);
		for (const width of [320, 375, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
			).toBe(true);
			await expect(form).toBeVisible();
		}
		const accessibility = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		await page.setViewportSize({ width: 1440, height: 1000 });

		const name = form.locator('[name=name]');
		const email = form.locator('[name=email]');
		const subject = form.locator('[name=subject]');
		const message = form.locator('[name=message]');
		const submit = form.locator('button[type=submit]');
		await submit.click();
		await expect(name).toBeFocused();
		await name.fill('Test Visitor');
		await email.fill('not-an-email');
		await subject.fill('Test subject');
		await message.fill('A local automated test message.');
		await submit.click();
		await expect(email).toBeFocused();
		await email.fill('visitor@example.test');

		let requests = 0;
		let requestBody = '';
		await page.route(testEndpoint, async (route) => {
			requests += 1;
			requestBody = route.request().postData() ?? '';
			await new Promise((resolve) => setTimeout(resolve, 250));
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				headers: corsHeaders,
				body: '{}',
			});
		});
		await submit.click();
		await expect(submit).toBeDisabled();
		await expect(form.locator('[data-contact-status]')).toContainText(
			lang === 'es' ? 'Enviando mensaje' : 'Sending message',
		);
		await expect(form.locator('[data-contact-status]')).toContainText(
			lang === 'es' ? 'Mensaje enviado' : 'Message sent',
			{ timeout: 5000 },
		);
		expect(requests).toBe(1);
		expect(requestBody).toContain('name');
		expect(requestBody).toContain('email');
		expect(requestBody).toContain('subject');
		expect(requestBody).toContain('message');
		expect(requestBody).toContain('_gotcha');
		await expect(name).toHaveValue('');
	}
});

test('provider failures are announced and the form can be retried', async ({
	page,
	site,
}) => {
	await page.goto(site.productionURL + '/contacto/');
	const form = page.locator('[data-contact-form]');
	await form.locator('[name=name]').fill('Test Visitor');
	await form.locator('[name=email]').fill('visitor@example.test');
	await form.locator('[name=subject]').fill('Test subject');
	await form.locator('[name=message]').fill('A local automated test message.');
	let requests = 0;
	await page.route(testEndpoint, async (route) => {
		requests += 1;
		await route.fulfill({
			status: requests === 1 ? 422 : 200,
			contentType: 'application/json',
			headers: corsHeaders,
			body: '{}',
		});
	});
	const submit = form.locator('button[type=submit]');
	await submit.click();
	const status = form.locator('[data-contact-status]');
	await expect(status).toHaveAttribute('role', 'alert');
	await expect(status).toHaveText(
		'No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.',
	);
	await submit.click();
	await expect(status).toContainText('Mensaje enviado');
	expect(requests).toBe(2);
});
