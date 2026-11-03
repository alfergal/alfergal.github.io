import rss from '@astrojs/rss';
import { getPosts } from './content';
import { postPath } from './article-routes';
import { profile } from '../data/profile';
import { ui, homePath, type Locale } from '../i18n';
export async function createFeed(lang: Locale) {
	return rss({
		title: profile.name + ' — ' + profile.role,
		description: ui[lang].seo,
		site: new URL(homePath(lang), profile.site),
		items: (await getPosts({ lang })).map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			categories: [post.data.category, ...post.data.tags],
			link: postPath(post),
		})),
		customData:
			'<language>' + (lang === 'es' ? 'es-es' : 'en-gb') + '</language>',
	});
}
