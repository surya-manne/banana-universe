# Pattern: Request Validation Decorator

## Description

Method-level decorators (`@Body`, `@Params`, `@Query`) that wrap the handler method with validation logic. They use `class-transformer` to hydrate the DTO and `class-validator` to validate it, throwing a 400 response on failure.

## When to Use

Apply to any controller method that receives validated input from body, path params, or query string.

## Template

```typescript
import { Body, Params, Query } from '@banana-universe/bananajs'
import { CreateItemDto, GetItemByIdDto, ListItemsDto } from './Item.dto'

@Controller('/items')
export class ItemController {
  @Post('/')
  @Body(CreateItemDto)
  async create(req: Request, res: Response) {
    // req.body is validated and typed as CreateItemDto
  }

  @Get('/:id')
  @Params(GetItemByIdDto)
  async getById(req: Request, res: Response) {
    // req.params is validated
  }

  @Get('/')
  @Query(ListItemsDto)
  async list(req: Request, res: Response) {
    // req.query is validated
  }
}
```

## Extension Points

- Second argument `skipMissingProperties: boolean` defaults to `false`
- DTO class must use `class-validator` decorators (see `dto-class-validator` pattern)

## Found In

- `apps/bananajs-demo/src/App/User/User.controller.ts`
- `packages/bananajs/src/lib/Validator/Validator.decorator.ts`
