import 'reflect-metadata'
import type { NextFunction, Request, Response } from 'express'
import { MetadataKeys } from '../Router/MetaData.constants.js'

export interface SanitizeOptions {
  allowedTags?: string[]
  allowedAttributes?: Record<string, string[]>
}

export function Sanitize(options?: SanitizeOptions): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void {
    Reflect.defineMetadata(
      MetadataKeys.SANITIZE,
      options ?? {},
      (target as { constructor: object }).constructor,
      propertyKey,
    )

    const method = descriptor.value as (...args: unknown[]) => Promise<void>
    descriptor.value = async function (req: Request, res: Response, next: NextFunction): Promise<void> {
      if (typeof req.body === 'object' && req.body !== null) {
        const sanitizeModule = await import('sanitize-html').catch(() => null)
        if (sanitizeModule === null) {
          console.warn('[BananaJS] @Sanitize: sanitize-html is not installed, skipping sanitization.')
        } else {
          const sanitizeHtml = sanitizeModule.default
          const body = req.body as Record<string, unknown>
          for (const key of Object.keys(body)) {
            if (typeof body[key] === 'string') {
              body[key] = sanitizeHtml(body[key] as string, {
                allowedTags: options?.allowedTags,
                allowedAttributes: options?.allowedAttributes,
              })
            }
          }
        }
      }
      // eslint-disable-next-line prefer-rest-params
      return method.apply(this, Array.from(arguments))
    }
  }
}
