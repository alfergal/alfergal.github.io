import { profile } from '../data/profile';
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const ui = {
	es: {
		home: 'Inicio',
		blog: 'Blog',
		contact: 'Contacto',
		navigation: 'Navegación principal',
		languages: 'Idioma',
		skip: 'Saltar al contenido',
		homeLink: 'inicio',
		role: profile.role,
		seo: 'Data Scientist especializado en Machine Learning y estadística aplicada, con más de seis años de experiencia en ingeniería de software.',
		intro:
			'Soy Data Scientist con más de seis años de experiencia en ingeniería de software. Me especializo en Machine Learning y estadística aplicada: combino análisis de datos, fundamentos matemáticos y experimentación para desarrollar y evaluar modelos predictivos.',
		introMore:
			'Trabajo con conjuntos de millones de registros. Mi experiencia en Python, SQL, arquitectura de software y MLOps conecta la preparación de datos y la investigación con soluciones fiables y su integración en producción.',
		what: 'Qué hago',
		experience: 'Experiencia profesional',
		skills: 'Competencias y tecnologías',
		experienceText:
			'Más de seis años en ingeniería de software sustentan mi orientación hacia Data Science y Machine Learning. Integro desarrollo de software, datos y modelos, con atención a la validación, el testing y el mantenimiento de los sistemas.',
		education: 'Formación y certificaciones',
		inProgress: 'En curso',
		earned: 'Obtenida',
		preparing: 'En preparación',
		completed: 'Finalizado',
		latest: 'Últimos artículos',
		allArticles: 'Ver todos los artículos →',
		blogIntro:
			'Comparto conocimientos, investigaciones y experimentos sobre Data Science, Machine Learning, estadística aplicada e inteligencia artificial. Desde sus fundamentos matemáticos hasta la evaluación de modelos y su aplicación práctica.',
		empty: 'Todavía no hay artículos publicados en español.',
		contactIntro:
			'Para oportunidades profesionales, colaboraciones técnicas y proyectos de Data Science o Machine Learning. También para conversar sobre investigación aplicada e intercambiar conocimientos.',
		contactHint:
			'Puedes contactar conmigo a través de LinkedIn o explorar mi trabajo en GitHub.',
		rssHint:
			'Copia este enlace en tu lector RSS para seguir los artículos del blog.',
		filter: 'Filtrar publicaciones',
		category: 'Categoría',
		tag: 'Etiqueta',
		all: 'Todas',
		featured: 'Destacados',
		publications: 'publicaciones',
		reading: 'min de lectura',
		draft: 'Borrador. Solo visible en desarrollo.',
		draftNotice:
			'Borrador. Vista previa disponible únicamente en desarrollo. Sin publicar.',
		back: 'Volver al inicio',
		updated: 'Actualizado:',
		tags: 'Etiquetas',
		toc: 'En este artículo',
		articleIndex: 'Índice del artículo',
		contents: 'Índice de contenidos',
		series: 'Serie de artículos',
		previous: 'Anterior:',
		next: 'Siguiente:',
		related: 'Artículos relacionados',
		code: 'Código',
		copy: 'Copiar',
		copyCode: 'Copiar código',
		copied: 'Copiado',
		copiedStatus: 'Código copiado',
		copyError:
			'No se pudo copiar. Selecciona el código para copiarlo manualmente.',
		notFound: 'Página no encontrada',
		notFoundDescription: 'La página solicitada no existe.',
		missingTranslation:
			'La traducción española todavía no está disponible. Ir al blog en español.',
		newsletter: 'Recibe los nuevos artículos',
		subscribe: 'Suscribirme',
		privacy: 'Información de privacidad',
		newsletterHint:
			'La suscripción se gestiona con un proveedor externo, con consentimiento y opción de cancelación.',
		callouts: {
			note: 'Nota',
			important: 'Información importante',
			warning: 'Advertencia',
			tip: 'Consejo',
			result: 'Resultado experimental',
			limitation: 'Limitación metodológica',
		},
		areas: [
			[
				'Data Science & Machine Learning',
				'Preparación y análisis de datos, construcción de modelos y evaluación de su capacidad para resolver un problema.',
			],
			[
				'Statistics & Predictive Modeling',
				'Diseño experimental, validación y análisis de resultados para distinguir evidencia de conclusiones apresuradas.',
			],
			[
				'Data Engineering & MLOps',
				'Procesamiento de grandes volúmenes de datos e integración de modelos en flujos reproducibles y mantenibles.',
			],
			[
				'Software Engineering & AI',
				'Arquitectura, APIs y testing para conectar experimentación y producción. Deep Learning, grafos y la IA generativa amplían este trabajo.',
			],
		],
		stack: [
			[
				'Data Science: herramientas',
				'Python, SQL, NumPy, Pandas, scikit-learn',
			],
			[
				'Machine Learning: competencias',
				'Modelos predictivos, validación, evaluación y diseño experimental',
			],
			[
				'Engineering & MLOps',
				'Arquitectura de software, APIs REST, testing, integración continua y despliegue',
			],
			[
				'Áreas complementarias',
				'Deep Learning, Graph Machine Learning, teoría y análisis de grafos, NLP, LLMs, RAG, sistemas conversacionales y agentes',
			],
		],
	},
	en: {
		home: 'Home',
		blog: 'Blog',
		contact: 'Contact',
		navigation: 'Main navigation',
		languages: 'Language',
		skip: 'Skip to content',
		homeLink: 'home',
		role: profile.role,
		seo: 'Data Scientist focused on Machine Learning and applied statistics, with over six years of software engineering experience.',
		intro:
			'I am a Data Scientist with over six years of software engineering experience. I focus on Machine Learning and applied statistics, combining data analysis, mathematical foundations and experimentation to develop and evaluate predictive models.',
		introMore:
			'I work with datasets containing millions of records. My experience with Python, SQL, software architecture and MLOps connects data preparation and research with reliable solutions and their integration into production.',
		what: 'What I Do',
		experience: 'Professional Experience',
		skills: 'Skills & Technologies',
		experienceText:
			'Over six years in software engineering underpin my focus on Data Science and Machine Learning. I bring together software development, data and models, with attention to validation, testing and maintaining the systems that use them.',
		education: 'Education & Certifications',
		inProgress: 'In progress',
		earned: 'Earned',
		preparing: 'In preparation',
		completed: 'Completed',
		latest: 'Latest Articles',
		allArticles: 'View All Articles →',
		blogIntro:
			'I share research, experiments and knowledge about Data Science, Machine Learning, applied statistics and artificial intelligence, from mathematical foundations to model evaluation and practical applications.',
		empty: 'No articles have been published in English yet.',
		contactIntro:
			'For professional opportunities, technical collaborations and Data Science or Machine Learning projects. I also welcome conversations about applied research and sharing knowledge.',
		contactHint: 'You can reach me on LinkedIn or explore my work on GitHub.',
		rssHint: 'Copy this link into your RSS reader to follow new blog articles.',
		filter: 'Filter publications',
		category: 'Category',
		tag: 'Tag',
		all: 'All',
		featured: 'Featured',
		publications: 'publications',
		reading: 'min read',
		draft: 'Draft. Development only.',
		draftNotice: 'Draft. Development preview only. Not published.',
		back: 'Back to home',
		updated: 'Updated:',
		tags: 'Tags',
		toc: 'In this article',
		articleIndex: 'Article outline',
		contents: 'Table of contents',
		series: 'Article series',
		previous: 'Previous:',
		next: 'Next:',
		related: 'Related Articles',
		code: 'Code',
		copy: 'Copy',
		copyCode: 'Copy code',
		copied: 'Copied',
		copiedStatus: 'Code copied',
		copyError: 'Could not copy. Select the code to copy it manually.',
		notFound: 'Page not found',
		notFoundDescription: 'The requested page does not exist.',
		missingTranslation:
			'The English translation is not available yet. Visit the English blog.',
		newsletter: 'Get new articles',
		subscribe: 'Subscribe',
		privacy: 'Privacy information',
		newsletterHint:
			'Subscriptions are managed by an external provider, with consent and an unsubscribe option.',
		callouts: {
			note: 'Note',
			important: 'Important',
			warning: 'Warning',
			tip: 'Tip',
			result: 'Experimental result',
			limitation: 'Methodological limitation',
		},
		areas: [
			[
				'Data Science & Machine Learning',
				'Preparing and analysing data, building models and evaluating how well they address a problem.',
			],
			[
				'Statistics & Predictive Modeling',
				'Experimental design, validation and analysis to distinguish evidence from premature conclusions.',
			],
			[
				'Data Engineering & MLOps',
				'Processing large datasets and integrating models into reproducible, maintainable workflows.',
			],
			[
				'Software Engineering & AI',
				'Architecture, APIs and testing to connect experimentation with production. Deep Learning, graphs and generative AI extend this work.',
			],
		],
		stack: [
			['Data Science: tools', 'Python, SQL, NumPy, Pandas, scikit-learn'],
			[
				'Machine Learning: skills',
				'Predictive modelling, validation, evaluation and experimental design',
			],
			[
				'Engineering & MLOps',
				'Software architecture, REST APIs, testing, continuous integration and deployment',
			],
			[
				'Complementary areas',
				'Deep Learning, Graph Machine Learning, graph theory and analysis, NLP, LLMs, RAG, conversational systems and agents',
			],
		],
	},
} as const;
