import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants.js'

export interface CacheEvictOptions {
  pattern: string
}

export function CacheEvict(options: CacheEvictOptions): MethodDecorator {
  return (target, propertyKey): void => {
    Reflect.defineMetadata(
      MetadataKeys.CACHE_EVICT,
      options,
      (target as { constructor: object }).constructor,
      propertyKey,
    )
  }
}
