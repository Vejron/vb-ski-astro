import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    // Regular pages: content/index.md → /, content/umeloppet.md → /umeloppet …
    pages: defineCollection({
      type: 'page',
      source: { include: '*.md' },
      schema: z.object({
        // Tailwind colour class for the wave above the footer (should match the last section's background)
        footer: z.string().optional(),
      }),
    }),

    // News posts: content/blog/YYYY-MM-DD-name.md → /blog/YYYY-MM-DD-name
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        displaytitle: z.string(),
        date: z.string(),
        thumbnail: z.string().optional(),
      }),
    }),

    // Race settings, see content/umeloppet.yml
    race: defineCollection({
      type: 'data',
      source: 'umeloppet.yml',
      schema: z.object({
        year: z.number(),
        edition: z.number(),
        date: z.string(),
        startTime: z.string(),
        location: z.string(),
        registration: z.object({
          status: z.enum(['auto', 'open', 'closed', 'full', 'cancelled']),
          opens: z.string(),
          closes: z.string(),
          maxParticipants: z.number().optional(),
        }),
        payByDate: z.string(),
        payment: z.object({ swish: z.string(), plusgiro: z.string() }),
        receiverEmail: z.string(),
        distances: z.array(z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
          laps: z.number().optional(),
          seeding: z.string().optional(),
          classes: z.array(z.string()),
        })),
        documents: z.object({
          results: z.string().nullable().optional(),
          startlist: z.string().nullable().optional(),
          pm: z.string().nullable().optional(),
          inbjudan: z.string().nullable().optional(),
        }).optional(),
        sponsors: z.array(z.object({
          name: z.string(),
          logo: z.string(),
          url: z.string().optional(),
        })).optional(),
      }),
    }),
  },
})
