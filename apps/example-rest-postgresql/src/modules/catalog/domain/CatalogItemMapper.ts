import type { Repository } from '@banana-universe/ddd'
import type { InjectionToken } from 'tsyringe'
import type { CatalogItem } from './CatalogItemEntity.js'

export type CatalogItemMapper = Repository<CatalogItem>

/** Runtime DI token for the catalog persistence port (tsyringe). */
export const CatalogItemMapperToken = Symbol(
  'CatalogItemMapper',
) as InjectionToken<CatalogItemMapper>
