import { NextFunction, Request, Response } from 'express'
import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'

export enum ValidationSource {
  BODY = 'body',
  HEADER = 'headers',
  QUERY = 'query',
  PARAM = 'params',
}

function validationFactory<T>(
  model: { new (...args: any[]): T },
  skipMissingProperties = false,
  source: ValidationSource,
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(source, model, target, propertyName)

    const method = descriptor.value
    descriptor.value = async function (request: Request, response: Response, next: NextFunction) {
      const model = Reflect.getOwnMetadata(source, target, propertyName)

      const dto = plainToInstance(model, request[source])
      const errors = await validate(dto, {
        skipMissingProperties,
        stopAtFirstError: true,
        whitelist: true, // will throws error when unknown fields passed
        forbidNonWhitelisted: true,
      })

      if (errors.length > 0) {
        const message = errors
          .map((error: ValidationError) => Object.values(error.constraints || {}))
          .join(', ')
        throw response.send({ status: 400, message })
      }

      // eslint-disable-next-line prefer-rest-params
      return method?.apply(this, arguments)
    }
  }
}

/**
 * Decorator for validating query parameters of a request.
 * Utilizes a specified DTO class and validation rules.
 *
 * @param {any} dto - The data transfer object class to validate against.
 * @param {boolean} [skipMissingProperties=false] - Whether to skip validation for missing properties.
 * @returns A method decorator that performs validation on the query parameters.
 */
export const Query = (dto: any, skipMissingProperties = false) =>
  validationFactory(dto, skipMissingProperties, ValidationSource.QUERY)
/**
 * Decorator for validating the body of a request.
 * Utilizes a specified DTO class and validation rules.
 *
 * @param {any} dto - The data transfer object class to validate against.
 * @param {boolean} [skipMissingProperties=false] - Whether to skip validation for missing properties.
 * @returns A method decorator that performs validation on the body of the request.
 */
export const Body = (dto: any, skipMissingProperties = false) =>
  validationFactory(dto, skipMissingProperties, ValidationSource.BODY)

/**
 * Decorator for validating the parameters of a request.
 * Utilizes a specified DTO class and validation rules.
 *
 * @param {any} dto - The data transfer object class to validate against.
 * @param {boolean} [skipMissingProperties=false] - Whether to skip validation for missing properties.
 * @returns A method decorator that performs validation on the parameters of the request.
 */
export const Params = (dto: any, skipMissingProperties = false) =>
  validationFactory(dto, skipMissingProperties, ValidationSource.PARAM)
