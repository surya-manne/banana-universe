import type { DataSource } from 'typeorm'
import { inject, injectable } from 'tsyringe'
import { TypeOrmRepositoryAdapter } from '@banana-universe/plugin-typeorm'
import { Widget } from '../domain/Widget.entity.js'
import { WidgetOrmEntity } from './Widget.orm-entity.js'

@injectable()
export class WidgetTypeOrmRepository extends TypeOrmRepositoryAdapter<Widget, WidgetOrmEntity> {
  constructor(@inject('dataSource') dataSource: DataSource) {
    super(dataSource, WidgetOrmEntity)
  }

  toDomain(orm: WidgetOrmEntity): Widget {
    return new Widget({
      id: orm.id,
      label: orm.label,
      code: orm.code,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    })
  }

  toPersistence(domain: Widget): WidgetOrmEntity {
    const row = new WidgetOrmEntity()
    row.id = domain.id
    row.label = domain.label
    row.code = domain.code
    row.createdAt = domain.createdAt
    row.updatedAt = domain.updatedAt
    return row
  }
}
