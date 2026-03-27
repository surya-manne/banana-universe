# Pattern: Request validation with Zod

Define request shapes with **Zod** (`z.object`, `z.string`, etc.) and pass the schema to `@Body`, `@Query`, `@Params`, or `@Headers`. Invalid requests throw `BadRequestError` before your handler runs.

## Example

```typescript
import { z } from 'zod'
import type { Request, Response } from 'express'
import { BaseController, Body, Controller, Post } from '@banana-universe/bananajs'

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

@Controller('users')
export class UserController extends BaseController {
  @Post('')
  @Body(CreateUserSchema)
  async create(req: Request, res: Response) {
    const data = req.body as z.infer<typeof CreateUserSchema>
    return this.ok(res, 'created', data)
  }
}
```

## Pagination

Use **`PaginationQuerySchema`** from `@banana-universe/bananajs` with `@Query`, or compose your own `z.object` with `z.coerce.number()` for query strings.
