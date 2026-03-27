import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants'

export interface RateLimitOptions {
  windowMs?: number
  max?: number
  message?: string
}

export function RateLimit(options?: RateLimitOptions): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: string | symbol): void => {
    const config: RateLimitOptions = {
      windowMs: options?.windowMs ?? 60_000,
      max: options?.max ?? 100,
      message: options?.message,
    }
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(
        MetadataKeys.RATE_LIMIT,
        config,
        (target as { constructor: object }).constructor,
        propertyKey,
      )
    } else {
      Reflect.defineMetadata(MetadataKeys.RATE_LIMIT, config, target as object)
    }
  }
}
