import 'reflect-metadata'
import type { ZodType } from 'zod'
import { MetadataKeys } from '../Router/MetaData.constants'

export interface ApiOperationOptions {
  summary?: string
  description?: string
  deprecated?: boolean
}

export interface ApiBodyOptions {
  schema: ZodType
  description?: string
  required?: boolean
}

export interface ApiResponseOptions {
  status: number
  description: string
  /** Optional Zod schema for the response body — auto-included in the generated OpenAPI spec. */
  schema?: ZodType
  type?: new (...args: unknown[]) => unknown
}

export function ApiTags(...tags: string[]): ClassDecorator {
  return (target: object): void => {
    Reflect.defineMetadata(MetadataKeys.API_TAGS, tags, target)
  }
}

export function ApiOperation(options: ApiOperationOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(
      MetadataKeys.API_OPERATION,
      options,
      target.constructor as object,
      propertyKey,
    )
  }
}

export function ApiBody(options: ApiBodyOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(
      MetadataKeys.API_BODY,
      options,
      target.constructor as object,
      propertyKey,
    )
  }
}

// Named ApiResponseDoc to avoid conflict with the ApiResponse abstract base class
export function ApiResponseDoc(options: ApiResponseOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const existing =
      (Reflect.getMetadata(MetadataKeys.API_RESPONSE, target.constructor as object, propertyKey) as
        | ApiResponseOptions[]
        | undefined) ?? []
    Reflect.defineMetadata(
      MetadataKeys.API_RESPONSE,
      [...existing, options],
      target.constructor as object,
      propertyKey,
    )
  }
}
