import type { DataSource } from 'typeorm'
import { inject, injectable } from 'tsyringe'
import { TypeOrmRepositoryAdapter } from '@banana-universe/plugin-typeorm'
import { CatalogItem } from '../domain/CatalogItem.entity.js'
import { CatalogItemOrmEntity } from './CatalogItem.orm-entity.js'

@injectable()
export class CatalogItemTypeOrmRepository extends TypeOrmRepositoryAdapter<
  CatalogItem,
  CatalogItemOrmEntity
> {
  constructor(@inject('dataSource') dataSource: DataSource) {
    super(dataSource, CatalogItemOrmEntity)
  }

  toDomain(orm: CatalogItemOrmEntity): CatalogItem {
    return new CatalogItem({
      id: orm.id,
      name: orm.name,
      sku: orm.sku,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    })
  }

  toPersistence(domain: CatalogItem): CatalogItemOrmEntity {
    const row = new CatalogItemOrmEntity()
    row.id = domain.id
    row.name = domain.name
    row.sku = domain.sku
    row.createdAt = domain.createdAt
    row.updatedAt = domain.updatedAt
    return row
  }
}
