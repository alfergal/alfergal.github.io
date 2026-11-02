export const blogCategories = [
	'Data Science',
	'Machine Learning',
	'Artificial Intelligence',
	'Data Engineering & MLOps',
	'Software Engineering',
] as const;
export type BlogCategory = (typeof blogCategories)[number];
