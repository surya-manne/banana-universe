import { Response } from 'express'
import {
  BadRequestResponse,
  UnauthorizedResponse,
  PaymentRequiredErrorResponse,
  ForbiddenResponse,
  NotFoundResponse,
  ConflictResponse,
  TooManyRequestsResponse,
  InternalErrorResponse,
  BadGatewayResponse,
  ServiceUnavailableResponse,
  GatewayTimeoutResponse,
} from './ApiResponse'

export enum ErrorType {
  BAD_REQUEST = 'BadRequestError',
  UNAUTHORISED = 'UnauthorisedError',
  PAYMENT_REQUIRED = 'PaymentRequiredError',
  FORBIDDEN = 'ForbiddenError',
  NOT_FOUND = 'NotFoundError',
  CONFLICT = 'ConflictError',
  TOO_MANY_REQUESTS = 'TooManyRequestsError',
  INTERNAL_ERROR = 'InternalError',
  BAD_GATEWAY = 'BadGatewayError',
  SERVICE_UNAVAILABLE = 'ServiceUnavailableError',
  GATEWAY_TIMEOUT = 'GatewayTimeoutError',
}

export abstract class ApiError extends Error {
  constructor(public type: ErrorType, public override message = 'error') {
    super(type)
  }

  public static handle(err: ApiError, res: Response): Response {
    switch (err.type) {
      case ErrorType.BAD_REQUEST:
        return new BadRequestResponse(err.message).send(res)
      case ErrorType.UNAUTHORISED:
        return new UnauthorizedResponse(err.message).send(res)
      case ErrorType.PAYMENT_REQUIRED:
        return new PaymentRequiredErrorResponse(err.message).send(res)
      case ErrorType.FORBIDDEN:
        return new ForbiddenResponse(err.message).send(res)
      case ErrorType.NOT_FOUND:
        return new NotFoundResponse(err.message).send(res)
      case ErrorType.CONFLICT:
        return new ConflictResponse(err.message).send(res)
      case ErrorType.TOO_MANY_REQUESTS:
        return new TooManyRequestsResponse(err.message).send(res)
      case ErrorType.INTERNAL_ERROR:
        return new InternalErrorResponse(err.message).send(res)
      case ErrorType.BAD_GATEWAY:
        return new BadGatewayResponse(err.message).send(res)
      case ErrorType.SERVICE_UNAVAILABLE:
        return new ServiceUnavailableResponse(err.message).send(res)
      case ErrorType.GATEWAY_TIMEOUT:
        return new GatewayTimeoutResponse(err.message).send(res)
      default: {
        let message = err.message
        // Do not send failure message in production as it may send sensitive data
        if (process.env.NODE_ENV === 'production') message = 'Something wrong happened.'
        return new InternalErrorResponse(message).send(res)
      }
    }
  }
}

export class BadRequestError extends ApiError {
  /**
   * Creates a new instance of BadRequestError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Bad Request'.
   */
  constructor(message = 'Bad Request') {
    super(ErrorType.BAD_REQUEST, message)
  }
}

export class UnauthorisedError extends ApiError {
  /**
   * Creates a new instance of UnauthorisedError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Unauthorised'.
   */
  constructor(message = 'Unauthorised') {
    super(ErrorType.UNAUTHORISED, message)
  }
}

export class PaymentRequiredError extends ApiError {
  /**
   * Creates a new instance of PaymentRequiredError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Payment Required'.
   */
  constructor(message = 'Payment Required') {
    super(ErrorType.PAYMENT_REQUIRED, message)
  }
}

export class ForbiddenError extends ApiError {
  /**
   * Creates a new instance of ForbiddenError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Forbidden'.
   */
  constructor(message = 'Forbidden') {
    super(ErrorType.FORBIDDEN, message)
  }
}

export class NotFoundError extends ApiError {
  /**
   * Creates a new instance of NotFoundError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Not Found'.
   */
  constructor(message = 'Not Found') {
    super(ErrorType.NOT_FOUND, message)
  }
}

export class ConflictError extends ApiError {
  /**
   * Creates a new instance of ConflictError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Conflict'.
   */
  constructor(message = 'Conflict') {
    super(ErrorType.CONFLICT, message)
  }
}

export class TooManyRequestsError extends ApiError {
  /**
   * Creates a new instance of TooManyRequestsError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Too Many Requests'.
   */
  constructor(message = 'Too Many Requests') {
    super(ErrorType.TOO_MANY_REQUESTS, message)
  }
}

export class InternalError extends ApiError {
  /**
   * Creates a new instance of InternalError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Internal Server Error'.
   */
  constructor(message = 'Internal Server Error') {
    super(ErrorType.INTERNAL_ERROR, message)
  }
}

export class BadGatewayError extends ApiError {
  /**
   * Creates a new instance of BadGatewayError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Bad Gateway'.
   */
  constructor(message = 'Bad Gateway') {
    super(ErrorType.BAD_GATEWAY, message)
  }
}

export class ServiceUnavailableError extends ApiError {
  /**
   * Creates a new instance of ServiceUnavailableError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Service Unavailable'.
   */
  constructor(message = 'Service Unavailable') {
    super(ErrorType.SERVICE_UNAVAILABLE, message)
  }
}

export class GatewayTimeoutError extends ApiError {
  /**
   * Creates a new instance of GatewayTimeoutError.
   *
   * @param message - A descriptive message accompanying the error. Defaults to 'Gateway Timeout'.
   */
  constructor(message = 'Gateway Timeout') {
    super(ErrorType.GATEWAY_TIMEOUT, message)
  }
}
