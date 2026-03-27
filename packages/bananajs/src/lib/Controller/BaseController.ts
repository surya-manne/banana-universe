import type { Response } from 'express'
import { SuccessResponse } from '../Response/ApiResponse'
import { ApiError } from '../Response/ApiError'

/**
 * Base class for HTTP controllers: standardized success responses and error propagation.
 * Throw {@link ApiError} subclasses from handlers; {@link error} is a convenience re-throw.
 */
export abstract class BaseController {
  protected ok<T>(res: Response, message: string, data: T): Response {
    return new SuccessResponse(message, data).send(res)
  }

  protected error(err: ApiError): never {
    throw err
  }
}
