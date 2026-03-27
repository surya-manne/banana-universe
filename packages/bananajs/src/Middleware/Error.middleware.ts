import { NextFunction, Request, Response } from 'express'
import { ApiError, ErrorType, InternalError } from '../lib/Response/ApiError'
import type { Logger } from '../lib/Logger/Logger.interface'

type ErrorHandler = (error: Error, request: Request, response: Response, next: NextFunction) => void

export const createErrorMiddleware = (logger?: Logger): ErrorHandler => {
  return (error: Error, request: Request, response: Response, _next: NextFunction): void => {
    const logMsg = `${error.message} - ${request.originalUrl} - ${request.method} - ${request.ip ?? 'unknown'}`

    if (error instanceof ApiError) {
      ApiError.handle(error, response)
      if (error.type === ErrorType.INTERNAL_ERROR) {
        logger ? logger.error(`500 - ${logMsg}`) : console.error(`500 - ${logMsg}`)
      }
      return
    }

    logger ? logger.error(`500 - ${logMsg}`) : console.error(`500 - ${logMsg}`)

    if (process.env['NODE_ENV'] === 'development') {
      response.status(500).send(error.message)
      return
    }

    ApiError.handle(new InternalError(), response)
  }
}

export const ErrorMiddleware: ErrorHandler = createErrorMiddleware()
