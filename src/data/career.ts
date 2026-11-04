import type { Locale } from '../i18n';

type Localized = Record<Locale, string>;

interface EducationEntry {
	institution: string;
	degree: Localized;
	period: Localized;
	status: 'in-progress' | 'completed';
	grade: Localized;
	description: Localized;
}

interface CertificationEntry {
	name: string;
	issuer: string;
	issued: string;
	hours?: number;
}

export const education: EducationEntry[] = [
	{
		institution: 'Universitat Oberta de Catalunya (UOC)',
		degree: {
			es: 'Grado en Ciencia de Datos Aplicada',
			en: 'Bachelor’s degree in Applied Data Science',
		},
		period: {
			es: 'septiembre de 2024 a junio de 2027',
			en: 'September 2024 to June 2027',
		},
		status: 'in-progress',
		grade: { es: '8,86/10 de media', en: '8.86/10 average' },
		description: {
			es: 'Estudios en Ciencia de Datos, estadística, matemáticas aplicadas, Machine Learning y modelado de datos.',
			en: 'Studies in Data Science, statistics, applied mathematics, Machine Learning and data modelling.',
		},
	},
	{
		institution: 'IES Tetuán de las Victorias',
		degree: {
			es: 'Técnico Superior en Desarrollo de Aplicaciones Web',
			en: 'Higher Technician qualification in Web Application Development',
		},
		period: { es: '2018 a 2020', en: '2018 to 2020' },
		status: 'completed',
		grade: { es: '8,6/10 de media', en: '8.6/10 average' },
		description: {
			es: 'Ciclo formativo de grado superior en desarrollo de aplicaciones web.',
			en: 'Higher vocational education in web application development.',
		},
	},
];

export const certifications: CertificationEntry[] = [
	{
		name: 'Neo4j Graph Data Science Certification',
		issuer: 'Neo4j',
		issued: '2026-07',
	},
	{
		name: 'Deep Learning Specialization',
		issuer: 'DeepLearning.AI',
		issued: '2025-09',
		hours: 125,
	},
	{
		name: 'Machine Learning Specialization',
		issuer: 'DeepLearning.AI',
		issued: '2025-08',
		hours: 100,
	},
	{
		name: 'IBM Data Science Professional Certificate',
		issuer: 'IBM',
		issued: '2025-06',
		hours: 180,
	},
	{
		name: 'Python for Everybody Specialization',
		issuer: 'University of Michigan',
		issued: '2025-05',
		hours: 80,
	},
];

export function formatMonth(month: string, lang: Locale) {
	return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${month}-15T12:00:00Z`));
}
