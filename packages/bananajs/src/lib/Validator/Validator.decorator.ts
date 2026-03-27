import { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { BadRequestError } from '../Response/ApiError'

export enum ValidationSource {
  BODY = 'body',
  HEADER = 'headers',
  QUERY = 'query',
  PARAM = 'params',
}

function validationFactory(schema: ZodType, source: ValidationSource) {
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(source, schema, target, propertyName)

    const method = descriptor.value
    descriptor.value = async function (request: Request, response: Response, next: NextFunction) {
      const zodSchema = Reflect.getMetadata(source, target, propertyName) as ZodType
      const raw = request[source]
      const result = zodSchema.safeParse(raw)

      if (!result.success) {
        const message = result.error.issues.map((i) => i.message).join(', ')
        throw new BadRequestError(message)
      }
      ;(request as unknown as Record<string, unknown>)[source] = result.data

      // eslint-disable-next-line prefer-rest-params
      return method?.apply(this, arguments)
    }
  }
}

/**
 * Validates the request query using a Zod schema.
 */
export const Query = (schema: ZodType) => validationFactory(schema, ValidationSource.QUERY)

/**
 * Validates the request body using a Zod schema.
 */
export const Body = (schema: ZodType) => validationFactory(schema, ValidationSource.BODY)

/**
 * Validates route params using a Zod schema.
 */
export const Params = (schema: ZodType) => validationFactory(schema, ValidationSource.PARAM)

/**
 * Validates headers using a Zod schema.
 */
export const Headers = (schema: ZodType) => validationFactory(schema, ValidationSource.HEADER)
