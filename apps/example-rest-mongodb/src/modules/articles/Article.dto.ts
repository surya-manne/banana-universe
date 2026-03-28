import { z } from 'zod'

export const CreateArticleSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
})
