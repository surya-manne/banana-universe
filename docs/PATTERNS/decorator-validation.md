# Pattern: Request Validation Decorator

## Description

Method-level decorators (`@Body`, `@Params`, `@Query`, `@Headers`) wrap the handler and run **`schema.safeParse`** on the corresponding `req` slice. On failure they throw `BadRequestError`; on success they assign parsed **`data`** back onto `req`.

## When to Use

Apply to any controller method that should reject invalid body, path params, query, or headers before business logic runs.

## Template

```typescript
import { z } from 'zod'
import { Body, Params, Query, Controller, Post, Get } from '@banana-universe/bananajs'

const CreateItemSchema = z.object({ name: z.string().min(1) })
const ItemIdParams = z.object({ id: z.string().min(1) })
const ListQuery = z.object({ page: z.coerce.number().optional() })

@Controller('items')
export class ItemController extends BaseController {
  @Post('')
  @Body(CreateItemSchema)
  async create(req: Request, res: Response) {
    const body = req.body as z.infer<typeof CreateItemSchema>
  }

  @Get(':id')
  @Params(ItemIdParams)
  async getById(req: Request, res: Response) {}

  @Get('')
  @Query(ListQuery)
  async list(req: Request, res: Response) {}
}
```

## Extension Points

- OpenAPI: `@ApiBody({ schema })` or rely on inferred Zod metadata from `@Body` when generating specs.

## Found In

- `packages/bananajs/src/lib/Validator/Validator.decorator.ts`
