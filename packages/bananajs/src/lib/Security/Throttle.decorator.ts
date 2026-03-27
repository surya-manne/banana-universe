import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants.js'

export interface ThrottleOptions {
  windowMs: number
  max: number
  keyBy?: 'userId' | 'ip'
  message?: string
}

export function Throttle(options: ThrottleOptions): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol): void => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(
        MetadataKeys.THROTTLE,
        options,
        (target as { constructor: object }).constructor,
        propertyKey,
      )
    } else {
      Reflect.defineMetadata(MetadataKeys.THROTTLE, options, target)
    }
  }
}
