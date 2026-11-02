import { getCollection } from 'astro:content';

// Drafts are opt-in for local page previews; feeds always use the default.
export const getPosts = async ({ includeDrafts = false } = {}) => {
	const posts = (
		await getCollection('blog', ({ data }) => includeDrafts || !data.draft)
	).sort(
		(a, b) =>
			b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
			a.id.localeCompare(b.id),
	);
	const positions = new Set<string>();
	for (const { data } of posts) {
		if (data.draft || !data.series) continue;
		const key = JSON.stringify([data.series.name, data.series.order]);
		if (positions.has(key))
			throw new Error(`Duplicate published series position: ${key}`);
		positions.add(key);
	}
	return posts;
};

export function readingTime(body = '') {
	const text = body
		.replace(/```[\s\S]*?```/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/[#*_`\[\]]/g, ' ');
	return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}
