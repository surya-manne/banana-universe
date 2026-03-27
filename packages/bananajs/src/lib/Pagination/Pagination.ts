import { IsInt, IsOptional, Max, Min } from 'class-validator'
import type { Response } from 'express'
import { SuccessResponse } from '../Response/ApiResponse'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export class PaginatedResponse<T> extends SuccessResponse<T[]> {
  constructor(
    message: string,
    data: T[],
    public readonly meta: PaginationMeta,
  ) {
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

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20
}
