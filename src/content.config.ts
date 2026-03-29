import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        author: z.string().optional(),
        image: z.string().optional(),
        /**
         * Cloudinary public ID for the post's cover image.
         * Example: "spiritual-guide-hero"
         * When provided, optimised responsive URLs are generated via Cloudinary's API.
         * Falls back to `image` if omitted or if PUBLIC_CLOUDINARY_CLOUD_NAME is not set.
         */
        cloudinaryId: z.string().optional(),
        /**
         * Descriptive alt text for the cover image.
         * Used on the hero <img> and blog index thumbnails.
         * Falls back to the post title when absent.
         */
        imageAlt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        keyTakeaways: z.array(z.string()).optional(),
        faq: z.array(z.object({
            question: z.string(),
            answer: z.string(),
        })).optional(),
    }),
});

export const collections = {
    'blog': blogCollection,
};
