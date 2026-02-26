import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    updatedDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    audience: z.string().optional(),
    readingTime: z.string().optional(),
    outcomes: z.array(z.string()).default([]),
  }),
});

const zhdocs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    updatedDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    audience: z.string().optional(),
    readingTime: z.string().optional(),
    outcomes: z.array(z.string()).default([]),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heroEyebrow: z.string(),
    heroTitle: z.string(),
    heroLead: z.string(),
    primaryCtaLabel: z.string().optional(),
    primaryCtaHref: z.string().optional(),
    secondaryCtaLabel: z.string().optional(),
    secondaryCtaHref: z.string().optional(),
    cards: z
      .array(
        z.object({
          tag: z.string().optional(),
          title: z.string(),
          text: z.string(),
          result: z.string().optional(),
        }),
      )
      .default([]),
    sections: z
      .array(
        z.object({
          heading: z.string(),
          text: z.string().optional(),
          bullets: z.array(z.string()).default([]),
        }),
      )
      .default([]),
  }),
});

export const collections = { docs, zhdocs, pages };
