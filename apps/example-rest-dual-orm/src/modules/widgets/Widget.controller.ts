import type { Request, Response } from 'express'
import { inject } from 'tsyringe'
import { BaseController, Controller, Get, Public, Query } from '@banana-universe/bananajs'
import { WidgetAppService } from './application/Widget.service.js'
import { WidgetListQuerySchema, type WidgetListQuery } from './Widget.dto.js'

/** SQL-backed feature slice (TypeORM plugin registered in bootstrap). */
@Controller('widgets')
export class WidgetController extends BaseController {
  constructor(@inject(WidgetAppService) private readonly widgetAppService: WidgetAppService) {
    super()
  }

  @Get('healthz')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up', stack: 'typeorm' })
  }

  @Get('items')
  @Query(WidgetListQuerySchema)
  async list(req: Request, res: Response) {
    const q = req.query as unknown as WidgetListQuery
    const { items, total } = await this.widgetAppService.listPaged(q.page, q.limit)
    return this.ok(res, 'ok', {
      data: items.map((w) => ({ id: w.id, label: w.label, code: w.code })),
      meta: { total, page: q.page, limit: q.limit },
    })
  }
}
