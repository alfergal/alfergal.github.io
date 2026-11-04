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

		seo: 'Data Scientist especializado en Machine Learning y estadística aplicada, con más de seis años de experiencia profesional en ingeniería de software.',

		intro:
			'¡Hola! Soy Alberto Fernández, Data Scientist con más de seis años de experiencia profesional en ingeniería de software. Durante los últimos años he orientado mi especialización hacia el Machine Learning y la estadística aplicada, combinando mi formación universitaria con mi trayectoria profesional y el desarrollo de proyectos personales.',

		introInterests:
			'Me interesan especialmente los fundamentos matemáticos, el diseño experimental y la evaluación de modelos. También me atrae aplicar la Ciencia de Datos a problemas reales en ámbitos como la banca, la salud y la investigación científica.',

		introBlog:
			'Este blog nace de mi curiosidad por comprender, investigar y experimentar con nuevas ideas, y de mi interés por compartir lo que voy aprendiendo. Es una forma de explorar las posibilidades de la Ciencia de Datos y descubrir hasta dónde pueden llevarnos las matemáticas, los datos y la inteligencia artificial.',

		experience: 'Experiencia profesional',
		education: 'Formación académica',
		certifications: 'Certificaciones',
		inProgress: 'En curso',
		earned: 'Obtenida',
		completed: 'Finalizado',
		duration: 'Duración',
		location: 'Ubicación',
		remote: 'Remoto',
		milestone: 'Ponencia',
		issued: 'Expedición',
		averageGrade: 'Nota media',
		studyHours: 'horas',
		illustrativeCover:
			'Ilustración editorial, no representa resultados científicos',

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

		seo: 'Data Scientist specializing in Machine Learning and applied statistics, with over six years of professional experience in software engineering.',

		intro:
			'Hi! I’m Alberto Fernández, a Data Scientist with over six years of professional experience in software engineering. Over the past few years, I have increasingly focused on Machine Learning and applied statistics, combining my university studies with my professional background and personal projects.',

		introInterests:
			'I am especially interested in mathematical foundations, experimental design and model evaluation. I am also drawn to applying Data Science to real-world problems in fields such as banking, healthcare and scientific research.',

		introBlog:
			'This blog grew out of my curiosity to understand, investigate and experiment with new ideas, and my interest in sharing what I learn along the way. It is a way to explore the possibilities of Data Science and see how far mathematics, data and artificial intelligence can take us.',

		experience: 'Professional Experience',
		education: 'Education',
		certifications: 'Certifications',
		inProgress: 'In progress',
		earned: 'Earned',
		completed: 'Completed',
		duration: 'Duration',
		location: 'Location',
		remote: 'Remote',
		milestone: 'Talk',
		issued: 'Issued',
		averageGrade: 'Average grade',
		studyHours: 'hours',
		illustrativeCover:
			'Editorial illustration, not representing scientific results',

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
	},
} as const;
