import type { Locale } from './ui';
export { ui, type Locale } from './ui';
export function localeFromPath(path: string): Locale {
	return /^\/en(?:\/|$)/.test(path) ? 'en' : 'es';
}
export const homePath = (lang: Locale) => (lang === 'en' ? '/en/' : '/');
export const blogPath = (lang: Locale) => homePath(lang) + 'blog/';
export const contactPath = (lang: Locale) =>
	lang === 'en' ? '/en/contact/' : '/contacto/';
export const feedPath = (lang: Locale) => homePath(lang) + 'rss.xml';
export function pageAlternates(path: string): Partial<Record<Locale, string>> {
	if (['/', '/en/'].includes(path)) return { es: '/', en: '/en/' };
	if (['/blog/', '/en/blog/'].includes(path))
		return { es: '/blog/', en: '/en/blog/' };
	if (['/contacto/', '/en/contact/'].includes(path))
		return { es: '/contacto/', en: '/en/contact/' };
	return {};
}
export function categoryLabel(category: string, lang: Locale) {
	return lang === 'es' && category === 'Artificial Intelligence'
		? 'Inteligencia artificial'
		: category;
}
