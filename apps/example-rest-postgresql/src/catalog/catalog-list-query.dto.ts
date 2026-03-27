import { z } from 'zod'

/** Query validation for `page` / `limit` (coerced from strings). */
export const CatalogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type CatalogListQuery = z.infer<typeof CatalogListQuerySchema>
