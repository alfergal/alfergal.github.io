// Public professional information supplied by Alberto. Keep contact details private.
const identity = { givenName: 'Alberto', familyName: 'Fernández Gálvez' };

export const profile = {
	...identity,
	name: `${identity.givenName} ${identity.familyName}`,
	role: 'Data Scientist | Machine Learning | Python & SQL',
	site: 'https://alfergal.github.io',
	github: 'https://github.com/alfergal',
	linkedin: 'https://www.linkedin.com/in/alberto-fernandez-galvez',
	heroSummary:
		'Soy Data Scientist y cuento con más de seis años de experiencia en ingeniería de software. Trabajo con conjuntos de millones de registros para desarrollar y evaluar modelos predictivos con Python, SQL, Pandas y scikit-learn. Integro modelos de Machine Learning en producción mediante APIs REST y desarrollo soluciones de NLP, LLMs y RAG. Mi experiencia en arquitectura de software, integración continua y testing me permite abordar tanto la experimentación con datos como la implementación y el mantenimiento de los sistemas que utilizan esos modelos.',
	blogIntroduction:
		'Comparto conocimientos, experimentos y reflexiones sobre Data Science, Machine Learning, Inteligencia Artificial e ingeniería de software. Desde fundamentos matemáticos y algoritmos hasta implementaciones prácticas, evaluación de modelos y desarrollo de sistemas.',
	seoDescription:
		'Data Scientist con experiencia en modelos predictivos, datos a gran escala, NLP y RAG, y más de seis años en ingeniería de software.',
};

export const professionalLinks = [
	{ label: 'GitHub', href: profile.github },
	{ label: 'LinkedIn', href: profile.linkedin },
];
