import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants.js'

export interface ThrottleOptions {
  windowMs: number
  max: number
  keyBy?: 'userId' | 'ip'
  message?: string
  /**
   * Optional external store for distributed deployments (e.g. Redis).
   * Must implement the `ThrottleStore` interface from `@banana-universe/bananajs`.
   * Defaults to in-memory counting when omitted.
   */
  store?: import('./ThrottleStore.interface.js').ThrottleStore
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
