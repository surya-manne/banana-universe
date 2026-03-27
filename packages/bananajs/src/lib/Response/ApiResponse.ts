import { Response } from 'express'

export enum StatusCode {
  SUCCESS = 'success',
  FAILURE = 'error',
}

export enum ResponseStatus {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORISED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409, //Duplicate
  TOO_MANY_REQUESTS = 429, // Rate limit
  INTERNAL_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

export abstract class ApiResponse {
  /**
   * Constructs an instance of ApiResponse.
   *
   * @param statusCode - The status code indicating the success or failure of the operation.
   * @param status - The HTTP response status associated with this response.
   * @param message - A message providing additional information about the response.
   */

  constructor(
    protected statusCode: StatusCode,
    protected status: ResponseStatus,
    protected message: string,
  ) {}

  protected prepare<T extends ApiResponse>(
    res: Response,
    response: T,
    headers: { [key: string]: string },
  ): Response {
    for (const [key, value] of Object.entries(headers)) res.append(key, value)
    return res.status(this.status).json(ApiResponse.sanitize(response))
  }

  public send(res: Response, headers: { [key: string]: string } = {}): Response {
    return this.prepare<ApiResponse>(res, this, headers)
  }

  private static sanitize<T extends ApiResponse>(response: T): T {
    const clone: T = {} as T
    Object.assign(clone, response)
    for (const i in clone) if (typeof clone[i] === 'undefined') delete clone[i]
    return clone
  }
}

export class SuccessResponse<T> extends ApiResponse {
  /**
   * Constructs a new instance of SuccessResponse.
   *
   * @param message - A descriptive message accompanying the response.
   * @param data - The data payload associated with the success response.
   */

  constructor(message: string, private data: T) {
    super(StatusCode.SUCCESS, ResponseStatus.SUCCESS, message)
  }

  getData(): T {
    return this.data
  }

  override send(res: Response, headers: { [key: string]: string } = {}): Response {
    return super.prepare<SuccessResponse<T>>(res, this, headers)
  }
}

export class BadRequestResponse extends ApiResponse {
  /**
   * Constructs a new instance of BadRequestResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Bad Parameters'.
   */
  constructor(message = 'Bad Parameters') {
    super(StatusCode.FAILURE, ResponseStatus.BAD_REQUEST, message)
  }
}

export class UnauthorizedResponse extends ApiResponse {
  /**
   * Constructs a new instance of UnauthorizedResponse.
   * @param message - A descriptive message accompanying the response. Defaults to 'Unauthorized'.
   */

  constructor(message = 'Unauthorized') {
    super(StatusCode.FAILURE, ResponseStatus.UNAUTHORISED, message)
  }
}

export class PaymentRequiredErrorResponse extends ApiResponse {
  /**
   * Constructs a new instance of PaymentRequiredErrorResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Payment required!'.
   */
  constructor(message = 'Payment required!') {
    super(StatusCode.FAILURE, ResponseStatus.PAYMENT_REQUIRED, message)
  }
}

export class ForbiddenResponse extends ApiResponse {
  /**
   * Constructs a new instance of ForbiddenResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Forbidden'.
   */

  constructor(message = 'Forbidden') {
    super(StatusCode.FAILURE, ResponseStatus.FORBIDDEN, message)
  }
}

export class NotFoundResponse extends ApiResponse {
  /**
   * Constructs a new instance of NotFoundResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Not Found'.
   */
  constructor(message = 'Not Found') {
    super(StatusCode.FAILURE, ResponseStatus.NOT_FOUND, message)
  }
}

export class ConflictResponse extends ApiResponse {
  /**
   * Constructs a new instance of ConflictResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Conflict'.
   */
  constructor(message = 'Conflict') {
    super(StatusCode.FAILURE, ResponseStatus.CONFLICT, message)
  }
}

export class TooManyRequestsResponse extends ApiResponse {
  /**
   * Constructs a new instance of TooManyRequestsResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Too Many Requests'.
   */

  constructor(message = 'Too Many Requests') {
    super(StatusCode.FAILURE, ResponseStatus.TOO_MANY_REQUESTS, message)
  }
}

export class InternalErrorResponse extends ApiResponse {
  /**
   * Constructs a new instance of InternalErrorResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Internal Server Error'.
   */
  constructor(message = 'Internal Error') {
    super(StatusCode.FAILURE, ResponseStatus.INTERNAL_ERROR, message)
  }
}

export class BadGatewayResponse extends ApiResponse {
  /**
   * Constructs a new instance of BadGatewayResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Bad Gateway'.
   */
  constructor(message = 'Bad Gateway') {
    super(StatusCode.FAILURE, ResponseStatus.BAD_GATEWAY, message)
  }
}

export class ServiceUnavailableResponse extends ApiResponse {
  /**
   * Constructs a new instance of ServiceUnavailableResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Service Unavailable'.
   */
  constructor(message = 'Service Unavailable') {
    super(StatusCode.FAILURE, ResponseStatus.SERVICE_UNAVAILABLE, message)
  }
}

export class GatewayTimeoutResponse extends ApiResponse {
  /**
   * Constructs a new instance of GatewayTimeoutResponse.
   *
   * @param message - A descriptive message accompanying the response. Defaults to 'Gateway Timeout'.
   */
  constructor(message = 'Gateway Timeout') {
    super(StatusCode.FAILURE, ResponseStatus.GATEWAY_TIMEOUT, message)
  }
}
