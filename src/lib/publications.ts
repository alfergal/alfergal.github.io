import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'blog'>;
export const publicationThreshold = 3;

export function publicationGroups<
	T extends { id: string; data: { draft: boolean; featured: boolean } },
>(posts: T[]) {
	const published = posts.filter((post) => !post.data.draft);
	const featured =
		published.length >= publicationThreshold
			? published.filter((post) => post.data.featured)
			: [];
	const ids = new Set(featured.map((post) => post.id));
	return { featured, recent: posts.filter((post) => !ids.has(post.id)) };
}

export function seriesPosts(post: Post, posts: Post[]) {
	if (!post.data.series) return [];
	return posts
		.filter(
			(entry) =>
				!entry.data.draft && entry.data.series?.name === post.data.series!.name,
		)
		.sort((a, b) => a.data.series!.order - b.data.series!.order);
}

export function relatedPosts(post: Post, posts: Post[]) {
	const score = (entry: Post) => [
		entry.data.tags.filter((tag) => post.data.tags.includes(tag)).length,
		Number(entry.data.category === post.data.category),
		Number(
			!!post.data.series && entry.data.series?.name === post.data.series.name,
		),
	];
	return posts
		.filter(
			(entry) =>
				entry.id !== post.id && !entry.data.draft && score(entry).some(Boolean),
		)
		.sort((a, b) => {
			const left = score(a),
				right = score(b);
			for (let i = 0; i < left.length; i++) {
				if (left[i] !== right[i]) return right[i] - left[i];
			}
			return (
				b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
				a.id.localeCompare(b.id)
			);
		})
		.slice(0, 3);
}
