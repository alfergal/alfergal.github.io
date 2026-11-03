export const experimentUI = {
	es: {
		comparisonLabel: 'Porción visible:',
		comparisonHelp:
			'Mueve el control o utiliza las flechas del teclado para comparar ambas imágenes.',
		comparisonStatic:
			'Sin JavaScript se muestran las dos versiones por separado.',
		temperatureTitle:
			'Explora una misma clasificación con distintas probabilidades',
		temperature: 'Temperatura',
		temperatureLabel: 'Temperatura T:',
		temperatureHelp:
			'T menor que 1: probabilidades más extremas. T mayor que 1: probabilidades más cercanas a 0,5.',
		temperatureStatic: 'Vista estática: T=1. El control requiere JavaScript.',
		temperatureFigure:
			'Transformación de probabilidades según la temperatura, comparada con la identidad',
		original: 'Probabilidad original',
		transformed: 'Transformada',
		temperatureResults:
			'Resultados precalculados sobre las mismas 80.000 observaciones del experimento. Sin datos enviados a ningún servidor.',
	},
	en: {
		comparisonLabel: 'Visible portion:',
		comparisonHelp:
			'Move the control or use the arrow keys to compare the two images.',
		comparisonStatic: 'Without JavaScript, both versions are shown separately.',
		temperatureTitle: 'Explore one ranking with different probabilities',
		temperature: 'Temperature',
		temperatureLabel: 'Temperature T:',
		temperatureHelp:
			'T below 1: more extreme probabilities. T above 1: probabilities closer to 0.5.',
		temperatureStatic: 'Static view: T=1. The control requires JavaScript.',
		temperatureFigure:
			'Probability transformation by temperature compared with the identity',
		original: 'Original probability',
		transformed: 'Transformed',
		temperatureResults:
			'Precomputed results for the same 80,000 experimental observations. No data is sent to a server.',
	},
} as const;
