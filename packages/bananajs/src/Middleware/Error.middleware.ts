import { NextFunction, Request, Response } from 'express'
import { ApiError, ErrorType, InternalError } from '../lib/Response/ApiError'

export const ErrorMiddleware = (
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction, // Do not remove unused next, ErrorMiddleware not picking up by app when we remove this(may be it is acting as method overloading)
) => {
  if (error instanceof ApiError) {
    ApiError.handle(error, response)
    if (error.type === ErrorType.INTERNAL_ERROR)
      console.error(
        `500 - ${error.message} - ${request.originalUrl} - ${request.method} - ${request.ip}`,
      )
    return
  } else {
    console.error(
      `500 - ${error.message} - ${request.originalUrl} - ${request.method} - ${request.ip}`,
    )
    if (process.env.NODE_ENV === 'development') {
      return response.status(500).send(error.message)
    }

    ApiError.handle(new InternalError(), response)
    return
  }
}
