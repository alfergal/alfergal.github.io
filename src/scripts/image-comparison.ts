/** Native range input; one CSS update per input, no animation loop or requests. */
class ImageComparison extends HTMLElement {
	private abort?: AbortController;
	connectedCallback() {
		if (this.abort) return;
		const slider = this.querySelector<HTMLInputElement>('input[type=range]');
		const images = this.querySelector<HTMLElement>('[data-comparison-images]');
		const output = this.querySelector<HTMLOutputElement>('output');
		const fallback = this.querySelector<HTMLElement>(
			'[data-comparison-static]',
		);
		if (!slider || !images || !output || !fallback) return;
		this.abort = new AbortController();
		const update = () => {
			const value = Math.min(100, Math.max(0, Number(slider.value)));
			images.style.setProperty('--split', `${value}%`);
			output.value = `${value} %`;
			slider.setAttribute('aria-valuetext', `${value} %`);
		};
		slider.addEventListener('input', update, { signal: this.abort.signal });
		slider.disabled = false;
		fallback.hidden = true;
		update();
		this.dataset.ready = '';
	}
	disconnectedCallback() {
		this.abort?.abort();
		this.abort = undefined;
		const slider = this.querySelector<HTMLInputElement>('input');
		if (slider) slider.disabled = true;
		const fallback = this.querySelector<HTMLElement>(
			'[data-comparison-static]',
		);
		if (fallback) fallback.hidden = false;
		delete this.dataset.ready;
	}
}
if (!customElements.get('image-comparison'))
	customElements.define('image-comparison', ImageComparison);
