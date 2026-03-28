import { z } from 'zod'

export const CreateCatalogItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(64),
})

export type CreateCatalogItem = z.infer<typeof CreateCatalogItemSchema>

export const CatalogItemIdParamsSchema = z.object({
  id: z.string().min(1),
})

export type CatalogItemIdParams = z.infer<typeof CatalogItemIdParamsSchema>

/** Query validation for `page` / `limit` (coerced from strings). */
export const CatalogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type CatalogListQuery = z.infer<typeof CatalogListQuerySchema>
