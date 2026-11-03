import sweep from '../data/roc_auc_temperature.json';

export const temperatureSweep = sweep;
const baseline = sweep.find((row) => row.temperature === 1);
if (!baseline) throw new Error('Temperature data must include T=1');
export const temperatureBaseline = baseline;

// Only this analytic transform is drawn in the browser; metrics are never estimated there.
export function temperatureCurve(temperature: number) {
	return Array.from({ length: 101 }, (_, i) => {
		const p = 0.005 + i * 0.0099;
		const y = 1 / (1 + Math.exp(-Math.log(p / (1 - p)) / temperature));
		return `${i === 0 ? 'M' : 'L'}${(40 + p * 320).toFixed(2)} ${(200 - y * 160).toFixed(2)}`;
	}).join(' ');
}

export const formatTemperature = (n: number, lang: 'es' | 'en' = 'es') =>
	n.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
