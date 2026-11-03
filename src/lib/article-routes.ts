import type { CollectionEntry } from 'astro:content';
import { blogPath, type Locale } from '../i18n';
type Post = CollectionEntry<'blog'>;
export const editorialKey = (post: Post) => post.data.translationKey ?? post.id;
export function postSlug(post: Post) {
	return post.id.replace(new RegExp('^' + post.data.lang + '/'), '');
}
export const postPath = (post: Post) =>
	blogPath(post.data.lang) + postSlug(post) + '/';
export function articleAlternates(
	post: Post,
	posts: Post[],
	includeDrafts = false,
) {
	const alternatives: Partial<Record<Locale, string>> = {};
	for (const entry of posts) {
		if (
			editorialKey(entry) === editorialKey(post) &&
			(includeDrafts || !entry.data.draft)
		)
			alternatives[entry.data.lang] = postPath(entry);
	}
	return alternatives;
}
