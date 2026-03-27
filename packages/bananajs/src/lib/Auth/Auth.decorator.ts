import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants'

export function Auth(): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: string | symbol): void => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(
        MetadataKeys.AUTH,
        true,
        (target as { constructor: object }).constructor,
        propertyKey,
      )
    } else {
      Reflect.defineMetadata(MetadataKeys.AUTH, true, target)
    }
  }
}

export function Roles(...roles: string[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(
      MetadataKeys.ROLES,
      roles,
      (target as { constructor: object }).constructor,
      propertyKey,
    )
  }
}

export function Public(): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(
      MetadataKeys.PUBLIC,
      true,
      (target as { constructor: object }).constructor,
      propertyKey,
    )
  }
}
