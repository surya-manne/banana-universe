# Pattern: Typed API Error

## Description

Concrete error class that extends `ApiError` with a specific `ErrorType` and a default message. Used to throw semantically meaningful errors that the global error middleware maps to standard HTTP responses.

## When to Use

Throw a typed error when a domain constraint is violated (not found, conflict, unauthorized, etc.).

## Template

```typescript
import { ApiError, ErrorType } from '@banana-universe/bananajs'

// Throw in controller or service:
throw new NotFoundError('Item not found')
throw new BadRequestError('Invalid input')
throw new ConflictError('Item already exists')

// Handle in try/catch (if not using global middleware):
try {
  // ...
} catch (err) {
  if (err instanceof ApiError) {
    return ApiError.handle(err, res)
  }
  return ApiError.handle(new InternalError(), res)
}
```

## Available Error Classes

| Class                   | HTTP Status | Default Message       |
| ----------------------- | ----------- | --------------------- |
| BadRequestError         | 400         | Bad Request           |
| UnauthorisedError       | 401         | Unauthorised          |
| PaymentRequiredError    | 402         | Payment Required      |
| ForbiddenError          | 403         | Forbidden             |
| NotFoundError           | 404         | Not Found             |
| ConflictError           | 409         | Conflict              |
| TooManyRequestsError    | 429         | Too Many Requests     |
| InternalError           | 500         | Internal Server Error |
| BadGatewayError         | 502         | Bad Gateway           |
| ServiceUnavailableError | 503         | Service Unavailable   |
| GatewayTimeoutError     | 504         | Gateway Timeout       |

## Found In

- `packages/bananajs/src/lib/Response/ApiError.ts`
- `packages/bananajs/src/Middleware/Error.middleware.ts`
