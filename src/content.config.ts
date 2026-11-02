import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogCategories } from './data/blog';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			category: z.enum(blogCategories),
			tags: z.array(z.string()).default([]),
			lang: z.enum(['es', 'en']).default('es'),
			draft: z.boolean().default(true),
		}),
});
export const collections = { blog };
