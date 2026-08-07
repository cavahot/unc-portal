import { z } from 'zod'

export const statsSchema = z.object({
  totalEstudiantes: z.number().min(0),
  totalDocentes: z.number().min(0),
  totalEgresados: z.number().min(0),
  totalCarrerasAcreditadas: z.number().min(0),
  totalFacultades: z.number().min(0),
})

export const newsItemSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  content: z.any(),
  publishedAt: z.string().nullable().optional(),
  featuredImage: z
    .object({ id: z.number(), alt: z.string(), url: z.string().nullable().optional() })
    .nullable()
    .optional(),
  featuredImageUrl: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.object({ tag: z.string() })).nullable().optional(),
  featured: z.boolean().optional(),
  author: z.string().nullable().optional(),
})

export const newsArraySchema = z.array(newsItemSchema).max(3)
