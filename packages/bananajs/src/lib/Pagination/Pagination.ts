import { z } from 'zod'
import type { Response } from 'express'
import { SuccessResponse } from '../Response/ApiResponse'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export class PaginatedResponse<T> extends SuccessResponse<T[]> {
  constructor(message: string, data: T[], public readonly meta: PaginationMeta) {
    super(message, data)
  }

  override send(res: Response, headers: { [key: string]: string } = {}): Response {
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value)
    return res.status(this.status).json({
      statusCode: this.statusCode,
      status: this.status,
      message: this.message,
      data: this.getData(),
      meta: this.meta,
    })
  }
}

/** Default Zod schema for `page` / `limit` query validation with `@Query`. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
