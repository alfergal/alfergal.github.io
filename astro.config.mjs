// @ts-check

import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { palette, syntaxTheme } from './src/data/theme';
import { profile } from './src/data/profile';

// https://astro.build/config
export default defineConfig({
	site: profile.site,
	output: 'static',
	devToolbar: { enabled: false },
	trailingSlash: 'always',
	vite: { cacheDir: './.astro/vite', plugins: [tailwindcss()] },
	markdown: {
		shikiConfig: { theme: syntaxTheme },
		processor: unified({
			remarkPlugins: [remarkMath],
			rehypePlugins: [
				[rehypeKatex, { throwOnError: true, errorColor: palette.pink }],
			],
		}),
	},
	integrations: [
		{
			name: 'isolated-command-cache',
			hooks: {
				'astro:config:setup': ({ command, updateConfig }) => {
					// sync/check and build must not invalidate a running dev optimizer.
					updateConfig({ vite: { cacheDir: `./.astro/vite/${command}` } });
				},
			},
		},
		mdx(),
		sitemap(),
	],
});
