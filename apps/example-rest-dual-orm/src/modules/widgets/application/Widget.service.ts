import { inject, injectable } from 'tsyringe'
import type { WidgetMapper } from '../domain/Widget.mapper.js'
import { WidgetMapperToken } from '../domain/Widget.mapper.js'
import { Widget } from '../domain/Widget.entity.js'

@injectable()
export class WidgetAppService {
  constructor(
    @inject(WidgetMapperToken)
    public readonly mapper: WidgetMapper,
  ) {}

  async listPaged(page: number, limit: number): Promise<{ items: Widget[]; total: number }> {
    const offset = (page - 1) * limit
    const items = await this.mapper.findAll({
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit,
      offset,
    })
    const allForCount = await this.mapper.findAll({})
    return { items, total: allForCount.length }
  }
}
