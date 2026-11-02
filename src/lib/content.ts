import { getCollection } from 'astro:content';

// Drafts are opt-in for local page previews; feeds always use the default.
export const getPosts = async ({ includeDrafts = false } = {}) =>
	(
		await getCollection('blog', ({ data }) => includeDrafts || !data.draft)
	).sort(
		(a, b) =>
			b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
			a.id.localeCompare(b.id),
	);

export function readingTime(body = '') {
	const text = body
		.replace(/```[\s\S]*?```/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/[#*_`\[\]]/g, ' ');
	return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}
