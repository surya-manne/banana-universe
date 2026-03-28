import type { Repository } from '@banana-universe/ddd'
import type { InjectionToken } from 'tsyringe'
import type { CatalogItem } from './catalog-item.entity.js'

export type CatalogItemRepository = Repository<CatalogItem>

/** Runtime DI token for the catalog repository port (tsyringe). */
export const CatalogItemRepositoryToken = Symbol(
  'CatalogItemRepository',
) as InjectionToken<CatalogItemRepository>
