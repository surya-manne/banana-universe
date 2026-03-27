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
