import {
	temperatureCurve,
	temperatureSweep,
	formatTemperature,
} from '../lib/temperature';

class TemperatureExplorer extends HTMLElement {
	private abort?: AbortController;
	connectedCallback() {
		if (this.abort) return;
		const slider = this.querySelector<HTMLInputElement>('[data-temp-slider]');
		if (!slider) return;
		this.abort = new AbortController();
		const update = (announce = true) => {
			const row = temperatureSweep.find(
				(item) => item.temperature === Number(slider.value),
			);
			if (!row) return;
			const value = formatTemperature(row.temperature);
			this.querySelector('[data-temp-value]')!.textContent = value;
			slider.setAttribute('aria-valuetext', value);
			this.querySelector('[data-temp-curve]')!.setAttribute(
				'd',
				temperatureCurve(row.temperature),
			);
			this.querySelector('[data-temp-auc]')!.textContent =
				row.roc_auc.toFixed(6);
			this.querySelector('[data-temp-brier]')!.textContent =
				row.brier.toFixed(6);
			this.querySelector('[data-temp-loss]')!.textContent =
				row.log_loss.toFixed(6);
			if (announce)
				this.querySelector('[data-temp-status]')!.textContent =
					`Temperatura ${value}. ROC-AUC ${row.roc_auc.toFixed(6)}. Brier Score ${row.brier.toFixed(6)}. Log-loss ${row.log_loss.toFixed(6)}.`;
		};
		this.querySelector<HTMLElement>('[data-temp-static]')!.hidden = true;
		slider.disabled = false;
		slider.addEventListener('input', () => update(), {
			signal: this.abort.signal,
		});
		update(false);
		this.dataset.ready = '';
	}
	disconnectedCallback() {
		this.abort?.abort();
		this.abort = undefined;
		const slider = this.querySelector<HTMLInputElement>('[data-temp-slider]');
		if (slider) slider.disabled = true;
		delete this.dataset.ready;
	}
}
if (!customElements.get('temperature-explorer'))
	customElements.define('temperature-explorer', TemperatureExplorer);
