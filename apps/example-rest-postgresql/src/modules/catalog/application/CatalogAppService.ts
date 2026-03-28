import { randomUUID } from 'node:crypto'
import { inject, injectable } from 'tsyringe'
import type { CatalogItemMapper } from '../domain/CatalogItemMapper.js'
import { CatalogItemMapperToken } from '../domain/CatalogItemMapper.js'
import { CatalogItem } from '../domain/CatalogItemEntity.js'

/** Application-layer orchestration (DDD); tsyringe constructor injection. */
@injectable()
export class CatalogAppService {
  constructor(
    @inject(CatalogItemMapperToken)
    public readonly catalogItemMapper: CatalogItemMapper,
  ) {}

  async create(name: string, sku: string): Promise<CatalogItem> {
    const now = new Date()
    const entity = new CatalogItem({
      id: randomUUID(),
      name,
      sku,
      createdAt: now,
      updatedAt: now,
    })
    return this.catalogItemMapper.save(entity)
  }

  async findById(id: string): Promise<CatalogItem | null> {
    return this.catalogItemMapper.findById(id)
  }

  async listPaged(page: number, limit: number): Promise<{ items: CatalogItem[]; total: number }> {
    const offset = (page - 1) * limit
    const items = await this.catalogItemMapper.findAll({
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit,
      offset,
    })
    const allForCount = await this.catalogItemMapper.findAll({})
    return { items, total: allForCount.length }
  }
}
