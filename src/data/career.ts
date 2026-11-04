import type { Locale } from '../i18n';

type Localized = Record<Locale, string>;

interface EducationEntry {
	title: Localized;
	description: Localized;
}

interface CertificationEntry {
	name: string;
	issuer: string;
}

export const education: EducationEntry[] = [
	{
		title: {
			es: 'Estudios de Grado en Ciencia de Datos Aplicada',
			en: 'Undergraduate Studies in Applied Data Science',
		},
		description: {
			es: 'Formación universitaria centrada en estadística, matemáticas aplicadas, programación y análisis de datos. Comprende preparación y visualización de datos, modelado predictivo, Machine Learning y evaluación de resultados para abordar problemas mediante métodos cuantitativos.',
			en: 'University-level studies focused on statistics, applied mathematics, programming and data analysis. The curriculum covers data preparation and visualisation, predictive modelling, Machine Learning and the evaluation of results to address problems using quantitative methods.',
		},
	},
	{
		title: {
			es: 'Técnico Superior en Desarrollo de Aplicaciones Web',
			en: 'Higher Technician in Web Application Development',
		},
		description: {
			es: 'Formación especializada en programación y desarrollo de aplicaciones web, tanto frontend como backend. Incluye bases de datos, diseño de interfaces, integración de APIs, arquitectura de aplicaciones, pruebas de software, seguridad y despliegue de soluciones web.',
			en: 'Specialised training in programming and web application development across both frontend and backend. It covers databases, interface design, API integration, application architecture, software testing, security and the deployment of web solutions.',
		},
	},
];

export const certifications: CertificationEntry[] = [
	{ name: 'Neo4j Graph Data Science Certification', issuer: 'Neo4j' },
	{ name: 'Deep Learning Specialization', issuer: 'DeepLearning.AI' },
	{ name: 'Machine Learning Specialization', issuer: 'DeepLearning.AI' },
	{ name: 'IBM Data Science Professional Certificate', issuer: 'IBM' },
	{
		name: 'Python for Everybody Specialization',
		issuer: 'University of Michigan',
	},
];
