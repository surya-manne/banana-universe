import { randomUUID } from 'node:crypto'
import { Injectable } from '@banana-universe/bananajs'
import type { CatalogItemRepository } from '../domain/catalog-item.repository.js'
import { CatalogItem } from '../domain/catalog-item.entity.js'

/** Application-layer orchestration (DDD); uses framework `@Injectable()` for awilix resolution. */
@Injectable()
export class CatalogAppService {
  constructor(public readonly catalogItemRepository: CatalogItemRepository) {}

  async create(name: string, sku: string): Promise<CatalogItem> {
    const now = new Date()
    const entity = new CatalogItem({
      id: randomUUID(),
      name,
      sku,
      createdAt: now,
      updatedAt: now,
    })
    return this.catalogItemRepository.save(entity)
  }

  async findById(id: string): Promise<CatalogItem | null> {
    return this.catalogItemRepository.findById(id)
  }

  async listPaged(page: number, limit: number): Promise<{ items: CatalogItem[]; total: number }> {
    const offset = (page - 1) * limit
    const items = await this.catalogItemRepository.findAll({
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit,
      offset,
    })
    const allForCount = await this.catalogItemRepository.findAll({})
    return { items, total: allForCount.length }
  }
}
