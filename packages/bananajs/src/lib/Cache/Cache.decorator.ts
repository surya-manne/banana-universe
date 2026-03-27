import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants.js'
import type { Request } from 'express'

export interface CacheOptions {
  ttl?: number // seconds, default 60
  key?: string | ((req: Request) => string)
}

export function Cache(options: CacheOptions = {}): MethodDecorator {
  return (target, propertyKey): void => {
    Reflect.defineMetadata(
      MetadataKeys.CACHE,
      options,
      (target as { constructor: object }).constructor,
      propertyKey,
    )
  }
}
