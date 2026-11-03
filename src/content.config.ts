import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogCategories } from './data/blog';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),
				translationKey: z.string().trim().min(1).optional(),
				description: z.string(),
				pubDate: z.coerce.date(),
				updatedDate: z.coerce.date().optional(),
				featured: z.boolean().default(false),
				series: z
					.object({
						name: z.string().trim().min(1),
						order: z.number().int().positive(),
					})
					.optional(),
				heroImage: image().optional(),
				category: z.enum(blogCategories),
				tags: z.array(z.string()).default([]),
				lang: z.enum(['es', 'en']).default('es'),
				draft: z.boolean().default(true),
			})
			.refine((data) => !data.updatedDate || data.updatedDate >= data.pubDate, {
				message: 'updatedDate must not precede pubDate',
				path: ['updatedDate'],
			}),
});
export const collections = { blog };
