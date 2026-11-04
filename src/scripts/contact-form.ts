const forms = document.querySelectorAll<HTMLFormElement>('[data-contact-form]');

for (const form of forms) {
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const submit = form.querySelector<HTMLButtonElement>(
			'button[type="submit"]',
		);
		const status = form.querySelector<HTMLElement>('[data-contact-status]');
		if (!submit || !status || submit.disabled) return;

		submit.disabled = true;
		status.setAttribute('role', 'status');
		status.removeAttribute('data-error');
		status.textContent = form.dataset.sending ?? '';

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: { Accept: 'application/json' },
			});
			if (!response.ok) throw new Error('Contact submission failed');
			form.reset();
			status.textContent = form.dataset.success ?? '';
		} catch {
			status.setAttribute('data-error', '');
			status.setAttribute('role', 'alert');
			status.textContent = form.dataset.failure ?? '';
		} finally {
			submit.disabled = false;
		}
	});
}
