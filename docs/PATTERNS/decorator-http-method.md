# Pattern: HTTP Method Decorator

## Description

Method-level decorators (`@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`) that register a route handler on the enclosing controller. Each stores route metadata via `reflect-metadata` and is picked up by `BananaApp` at startup.

## When to Use

Apply to every controller method that should handle an HTTP request.

## Template

```typescript
import { Get, Post, Put, Delete } from '@banana-universe/bananajs'

@Controller('/items')
export class ItemController {
  @Post('/')
  async create(req: Request, res: Response) { ... }

  @Get('/:id')
  async getById(req: Request, res: Response) { ... }

  @Put('/:id')
  async update(req: Request, res: Response) { ... }

  @Delete('/:id')
  async remove(req: Request, res: Response) { ... }
}
```

## Extension Points

- Path parameter is the route segment appended to the controller base path
- Optional second argument accepts an array of Express middlewares

## Found In

- `apps/bananajs-demo/src/App/User/User.controller.ts` (all HTTP verbs used)
