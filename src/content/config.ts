import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        author: z.string().optional(),
        image: z.string().optional(), // Cover image URL
    }),
});

export const collections = {
    'blog': blogCollection,
};
