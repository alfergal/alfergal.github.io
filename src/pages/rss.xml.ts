import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { getPosts } from '../lib/content';
import { profile } from '../data/profile';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export const GET: APIRoute = async () =>
	rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: profile.site,
		items: (await getPosts()).map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			categories: [post.data.category, ...post.data.tags],
			link: `/blog/${post.id}/`,
		})),
		customData: '<language>es-es</language>',
	});
