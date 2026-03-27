# Pattern: Express Error Middleware

## Description

A 4-argument Express error middleware function (the signature `(err, req, res, next)` is required for Express to recognize it as an error handler). It checks whether the error is an `ApiError` instance and delegates to `ApiError.handle`, falling back to an `InternalError` for unknown errors.

## When to Use

Register exactly once at the end of the Express middleware chain in `BananaApp`.

## Template

```typescript
import { NextFunction, Request, Response } from 'express'
import { ApiError, InternalError } from '@banana-universe/bananajs'

export const ErrorMiddleware = (
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction, // must keep even if unused — Express requires 4 args
) => {
  if (error instanceof ApiError) {
    ApiError.handle(error, response)
    return
  }
  // Unknown error — wrap and respond
  if (process.env.NODE_ENV === 'development') {
    return response.status(500).send(error.message)
  }
  ApiError.handle(new InternalError(), response)
}
```

## Important Note

The `next` parameter must not be removed even if unused. Express uses the function arity (4 args) to identify error-handling middleware.

## Found In

- `packages/bananajs/src/Middleware/Error.middleware.ts`
