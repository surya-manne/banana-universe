# BaseController Pattern

All HTTP controllers extend `BaseController` to get standardized `ok()` / `error()` response helpers.

## When to Use

- Every HTTP controller in the codebase

## Pattern

```typescript
import { Controller, Get, BaseController } from '@banana-universe/bananajs';
import { injectable } from '@banana-universe/bananajs';
import type { Request, Response, NextFunction } from 'express';

@Controller('users')
@injectable()
export class UserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get(':id')
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await this.userService.findById(req.params.id);
      this.ok(res, 'User retrieved', user);
    } catch (error) {
      return next(error);
    }
  }
}
```

## Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `ok` | `ok<T>(res, message, data): Response` | Sends `SuccessResponse` with 200 status |
| `error` | `error(err: ApiError): never` | Re-throws `ApiError` subclass for `ErrorMiddleware` |

## Rules

- `catch (error) { return next(error) }` — **must** `return` (`noImplicitReturns: true`)
- Use `this.ok()` instead of `new SuccessResponse(...).send(res)` directly
- Throw `ApiError` subclasses (e.g. `NotFoundError`) — `ErrorMiddleware` handles them
