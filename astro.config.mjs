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
import remarkCallouts from './src/lib/remark-callouts.mjs';
import { readFile } from 'node:fs/promises';

let buildDirectory = new URL('./dist/', import.meta.url);

// https://astro.build/config
export default defineConfig({
	site: profile.site,
	output: 'static',
	devToolbar: { enabled: false },
	trailingSlash: 'always',
	vite: { cacheDir: './.astro/vite', plugins: [tailwindcss()] },
	markdown: {
		shikiConfig: {
			theme: syntaxTheme,
			transformers: [
				{
					name: 'code-metadata',
					pre(node) {
						node.properties['data-language'] = this.options.lang;
						const filename =
							this.options.meta?.__raw?.match(/title="([^"\n]+)"/)?.[1];
						if (filename) node.properties['data-filename'] = filename;
					},
				},
			],
		},
		processor: unified({
			remarkPlugins: [remarkMath, remarkCallouts],
			rehypePlugins: [
				[rehypeKatex, { throwOnError: true, errorColor: palette.pink }],
			],
		}),
	},
	integrations: [
		{
			name: 'isolated-command-cache',
			hooks: {
				'astro:config:done': ({ config }) => {
					buildDirectory = config.outDir;
				},
				'astro:config:setup': ({ command, updateConfig }) => {
					// sync/check and build must not invalidate a running dev optimizer.
					updateConfig({ vite: { cacheDir: `./.astro/vite/${command}` } });
				},
			},
		},
		mdx(),
		sitemap({
			async serialize(item) {
				const path = new URL(item.url).pathname;
				if (path.startsWith('/blog/')) {
					// Read the generated article's authoritative dates, never the build date.
					const html = await readFile(
						new URL(`${path.slice(1)}index.html`, buildDirectory),
						'utf8',
					);
					const blocks = html.matchAll(
						/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
					);
					for (const block of blocks) {
						const schema = JSON.parse(block[1]);
						if (schema['@type'] === 'BlogPosting')
							item.lastmod = schema.dateModified ?? schema.datePublished;
					}
				}
				return item;
			},
		}),
	],
});
