// Article-only enhancement. Headings, code and navigation remain usable without JS.
function mountArticle() {
	const content = document.querySelector<HTMLElement>('[data-reading-content]');
	if (!content) return () => {};
	const labels = JSON.parse(content.dataset.readerLabels!) as {
		code: string;
		copy: string;
		copyCode: string;
		copied: string;
		copiedStatus: string;
		copyError: string;
	};
	const abort = new AbortController();
	const { signal } = abort;
	const timers = new Set<ReturnType<typeof setTimeout>>();
	content.querySelectorAll<HTMLPreElement>('pre.astro-code').forEach((pre) => {
		const wrapper = document.createElement('div');
		wrapper.className = 'code-block';
		const bar = document.createElement('div');
		bar.className = 'code-toolbar';
		const label = document.createElement('span');
		label.textContent = [pre.dataset.language, pre.dataset.filename]
			.filter(Boolean)
			.join(' · ');
		bar.append(label);
		pre.before(wrapper);
		wrapper.append(bar, pre);
		pre.tabIndex = 0;
		pre.setAttribute('aria-label', label.textContent || labels.code);
		if (navigator.clipboard?.writeText) {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = labels.copy;
			button.setAttribute(
				'aria-label',
				`${labels.copyCode} ${label.textContent}`.trim(),
			);
			const status = document.createElement('span');
			status.className = 'sr-only';
			status.setAttribute('role', 'status');
			bar.append(button, status);
			button.addEventListener(
				'click',
				async () => {
					try {
						await navigator.clipboard.writeText(
							pre.querySelector('code')?.textContent ?? '',
						);
						if (signal.aborted) return;
						button.textContent = labels.copied;
						status.textContent = labels.copiedStatus;
					} catch {
						if (signal.aborted) return;
						status.textContent = labels.copyError;
					}
					const timer = setTimeout(() => {
						button.textContent = labels.copy;
						status.textContent = '';
						timers.delete(timer);
					}, 2400);
					timers.add(timer);
				},
				{ signal },
			);
		}
	});
	const links = [
		...document.querySelectorAll<HTMLAnchorElement>('.article-toc a'),
	];
	const headings = links.map((link) =>
		document.getElementById(decodeURIComponent(link.hash.slice(1)))!,
	);
	const progress = document.querySelector<HTMLElement>(
		'.reading-progress span',
	);
	let frame = 0;
	const update = () => {
		frame = 0;
		const rect = content.getBoundingClientRect();
		const length = Math.max(1, content.offsetHeight - innerHeight);
		const value = Math.max(0, Math.min(1, -rect.top / length));
		progress?.style.setProperty('width', `${value * 100}%`);
		let current = -1;
		headings.forEach((heading, i) => {
			if (heading.getBoundingClientRect().top <= 120) current = i;
		});
		links.forEach((link, i) =>
			i === current
				? link.setAttribute('aria-current', 'location')
				: link.removeAttribute('aria-current'),
		);
	};
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};
	window.addEventListener('scroll', schedule, { passive: true, signal });
	window.addEventListener('resize', schedule, { passive: true, signal });
	const resize = new ResizeObserver(schedule);
	resize.observe(content);
	update();
	return () => {
		abort.abort();
		resize.disconnect();
		cancelAnimationFrame(frame);
		timers.forEach(clearTimeout);
	};
}
const dispose = mountArticle();
window.addEventListener('pagehide', (event) => {
	if (!event.persisted) dispose();
});
