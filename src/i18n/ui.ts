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
			'Me interesan especialmente los fundamentos matemáticos, el diseño experimental y la evaluación de modelos. También me atraen las posibilidades de aplicar la Ciencia de Datos a problemas reales en ámbitos como la tecnología, las finanzas, la investigación científica y la sostenibilidad.',

		introBlog:
			'Este blog nace de mi curiosidad por comprender, investigar y experimentar con nuevas ideas, y de mi interés por compartir lo que voy aprendiendo. Es una forma de explorar las posibilidades de la Ciencia de Datos y descubrir hasta dónde pueden llevarnos las matemáticas, los datos y la inteligencia artificial.',

		education: 'Formación académica',
		certifications: 'Certificaciones',
		illustrativeCover:
			'Ilustración editorial, no representa resultados científicos',

		latest: 'Últimos artículos',
		allArticles: 'Ver todos los artículos →',

		blogIntro:
			'En este espacio comparto artículos, investigaciones y experimentos que nacen de preguntas e ideas que he ido explorando con el tiempo. Mi intención es profundizar en los fundamentos de la Ciencia de Datos, contrastar lo que dice la investigación científica y compartir tanto los resultados como el proceso de aprendizaje.',

		empty: 'Todavía no hay artículos publicados en español.',

		contactIntro:
			'¿Quieres contactar conmigo? Si tienes alguna propuesta de colaboración, una oportunidad profesional o simplemente quieres compartir una idea relacionada con Data Science, Machine Learning o inteligencia artificial, puedes escribirme a través del formulario o encontrarme en mis perfiles profesionales.',

		contactFormTitle: 'Enviar un mensaje',
		contactName: 'Nombre',
		contactEmail: 'Correo electrónico',
		contactSubject: 'Asunto',
		contactMessage: 'Mensaje',
		contactSpamField: 'Deja este campo vacío',
		contactSubmit: 'Enviar mensaje',
		contactSending: 'Enviando mensaje…',
		contactSuccess: 'Mensaje enviado. Gracias por contactar.',
		contactFailure:
			'No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.',
		contactFormUnavailable:
			'El formulario no está activo. Se habilitará cuando se configure el endpoint de Formspree y se publique la información de privacidad aprobada. Mientras tanto, puedes encontrarme en mis perfiles profesionales.',
		contactProfiles: 'También puedes encontrarme en',

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
			'I am particularly interested in mathematical foundations, experimental design and model evaluation. I am also drawn to the potential of applying Data Science to real-world problems in technology, finance, scientific research and sustainability.',

		introBlog:
			'This blog grew out of my curiosity to understand, investigate and experiment with new ideas, and my interest in sharing what I learn along the way. It is a way to explore the possibilities of Data Science and see how far mathematics, data and artificial intelligence can take us.',

		education: 'Education',
		certifications: 'Certifications',
		illustrativeCover:
			'Editorial illustration, not representing scientific results',

		latest: 'Latest Articles',
		allArticles: 'View All Articles →',

		blogIntro:
			'This is where I share articles, research and experiments inspired by questions and ideas I have explored over time. My goal is to deepen my understanding of Data Science, examine the scientific evidence and share both the results and what I learn throughout the process.',

		empty: 'No articles have been published in English yet.',

		contactIntro:
			'Want to get in touch? Whether you have a collaboration proposal, a professional opportunity or simply an idea related to Data Science, Machine Learning or artificial intelligence, you can send me a message using the form or connect with me through my professional profiles.',

		contactFormTitle: 'Send a message',
		contactName: 'Name',
		contactEmail: 'Email address',
		contactSubject: 'Subject',
		contactMessage: 'Message',
		contactSpamField: 'Leave this field blank',
		contactSubmit: 'Send message',
		contactSending: 'Sending message…',
		contactSuccess: 'Message sent. Thank you for getting in touch.',
		contactFailure: 'The message could not be sent. Please try again later.',
		contactFormUnavailable:
			'The form is not active. It will be enabled once the Formspree endpoint is configured and approved privacy information is published. In the meantime, you can find me through my professional profiles.',
		contactProfiles: 'You can also find me on',

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
