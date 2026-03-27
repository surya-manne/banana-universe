# Pattern: Success Response

## Description

Standardized way to send a successful HTTP 200 response using `SuccessResponse<T>`. Wraps the data payload with a consistent `{ statusCode, status, message, data }` envelope and sends it through Express `res`.

## When to Use

Use in every controller method that returns a successful result.

## Template

```typescript
import { SuccessResponse } from '@banana-universe/bananajs'

async handlerMethod(req: Request, res: Response) {
  const result = await someService()
  return new SuccessResponse('Operation successful', result).send(res)
}
```

## Response Shape

```json
{
  "statusCode": "success",
  "status": 200,
  "message": "Operation successful",
  "data": {
    /* your result */
  }
}
```

## Extension Points

- Optional second argument to `.send(res, headers)` for custom response headers
- Replace the message string with a descriptive action label

## Found In

- `apps/bananajs-demo/src/App/User/User.controller.ts` (all handler methods)
