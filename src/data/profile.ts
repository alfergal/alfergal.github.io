// Only public professional facts supplied by Alberto.
const identity = { givenName: 'Alberto', familyName: 'Fernández Gálvez' };
export const profile = {
	...identity,
	name: identity.givenName + ' ' + identity.familyName,
	role: 'Data Scientist | Machine Learning | Applied Statistics',
	site: 'https://alfergal.github.io',
	github: 'https://github.com/alfergal',
	linkedin: 'https://www.linkedin.com/in/alberto-fernandez-galvez',
	email: undefined as string | undefined,
	huggingFace: undefined as string | undefined,
	kaggle: undefined as string | undefined,
	orcid: undefined as string | undefined,
};
export function getProfessionalLinks() {
	return [
		...(profile.email
			? [{ label: 'Email', href: 'mailto:' + profile.email }]
			: []),
		{ label: 'LinkedIn', href: profile.linkedin },
		{ label: 'GitHub', href: profile.github },
		...(profile.huggingFace
			? [{ label: 'Hugging Face', href: profile.huggingFace }]
			: []),
		...(profile.kaggle ? [{ label: 'Kaggle', href: profile.kaggle }] : []),
		...(profile.orcid ? [{ label: 'ORCID', href: profile.orcid }] : []),
	];
}
