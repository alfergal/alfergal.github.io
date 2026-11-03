import { getCollection } from 'astro:content';
import type { Locale } from '../i18n';
import { editorialKey, postPath } from './article-routes';

// Drafts are opt-in for local page previews; feeds always use the default.
export const getPosts = async ({
	includeDrafts = false,
	lang,
}: { includeDrafts?: boolean; lang?: Locale } = {}) => {
	const posts = (
		await getCollection('blog', ({ data }) => includeDrafts || !data.draft)
	).sort(
		(a, b) =>
			b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
			a.id.localeCompare(b.id),
	);
	const positions = new Set<string>();
	const translations = new Set<string>();
	const routes = new Set<string>();
	const publicationDates = new Map<string, number>();
	for (const post of posts) {
		const { data } = post;
		const identity = JSON.stringify([data.lang, editorialKey(post)]);
		if (translations.has(identity))
			throw new Error('Duplicate article translation: ' + identity);
		translations.add(identity);
		const path = postPath(post);
		if (routes.has(path)) throw new Error('Duplicate article route: ' + path);
		routes.add(path);
		if (!data.draft) {
			const key = editorialKey(post);
			const date = data.pubDate.valueOf();
			if (publicationDates.has(key) && publicationDates.get(key) !== date)
				throw new Error('Published translations must share pubDate: ' + key);
			publicationDates.set(key, date);
		}
		if (data.draft || !data.series) continue;
		const key = JSON.stringify([
			data.lang,
			data.series.name,
			data.series.order,
		]);
		if (positions.has(key))
			throw new Error(`Duplicate published series position: ${key}`);
		positions.add(key);
	}
	return lang ? posts.filter((post) => post.data.lang === lang) : posts;
};

export function readingTime(body = '') {
	const text = body
		.replace(/```[\s\S]*?```/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/[#*_`\[\]]/g, ' ');
	return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}
