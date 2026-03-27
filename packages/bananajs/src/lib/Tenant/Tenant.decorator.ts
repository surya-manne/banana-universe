import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants.js'
import type { TenantOptions } from './TenantContext.js'

export function Tenant(options?: TenantOptions): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: string | symbol): void => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(MetadataKeys.TENANT, options ?? {}, target, propertyKey)
    } else {
      Reflect.defineMetadata(MetadataKeys.TENANT, options ?? {}, target)
    }
  }
}
