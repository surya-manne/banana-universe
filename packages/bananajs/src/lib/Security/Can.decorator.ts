import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants.js'

export interface CanOptions {
  action: string
  resource: string
}

export function Can(action: string, resource: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(
      MetadataKeys.CAN,
      { action, resource },
      (target as { constructor: object }).constructor,
      propertyKey,
    )
  }
}
