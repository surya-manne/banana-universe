import { z } from 'zod'

export const WidgetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type WidgetListQuery = z.infer<typeof WidgetListQuerySchema>
