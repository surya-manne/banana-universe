import 'reflect-metadata'
import { MetadataKeys } from '../Router/MetaData.constants'

export interface UploadOptions {
  maxSize?: number
  allowedMimeTypes?: string[]
}

export interface UploadConfig extends UploadOptions {
  fieldName: string
}

export function Upload(fieldName: string, options?: UploadOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const config: UploadConfig = {
      fieldName,
      maxSize: options?.maxSize ?? 5 * 1024 * 1024,
      allowedMimeTypes: options?.allowedMimeTypes,
    }
    Reflect.defineMetadata(
      MetadataKeys.UPLOAD,
      config,
      (target as { constructor: object }).constructor,
      propertyKey,
    )
  }
}
