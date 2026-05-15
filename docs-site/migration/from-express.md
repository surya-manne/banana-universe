# Migrating from Express

BananaJS runs on **Express** — middleware, `Request`/`Response`, and ecosystem packages still work. You can migrate **one route at a time**: mount BananaJS routes under a prefix and leave the rest of your Express app untouched, or run the codemod and convert handlers in bulk.

## Incremental mount with `BananaRouter`

Mount generated BananaJS routes under a prefix while legacy Express routes stay in place:

```typescript
import express from 'express'
import { BananaRouter } from '@banana-universe/bananajs'
import { UserController } from './user.controller.js'

const app = express()
app.use(express.json())

const bananaRoutes = BananaRouter([UserController])
app.use('/api/v2', bananaRoutes)

app.get('/legacy', (_req, res) => res.send('ok'))

app.listen(3000)
```

`BananaRouter` is a **function** that returns an Express **`Router`** — use it directly with `app.use`.

## A migrated endpoint — before & after

**Before** (Express, four concerns tangled):

```typescript
router.post('/users', async (req, res) => {
  if (!req.body?.email || !req.body?.name) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  try {
    const user = await db.users.create(req.body)
    res.json({ success: true, data: user })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
```

**After** (BananaJS, handler is only business logic):

```typescript
@Controller('users')
export class UserController extends BaseController {
  @Post('')
  @Body(CreateUserSchema)
  async create(req: Request, res: Response) {
    const user = await this.service.create(req.body)
    return this.ok(res, 'User created', user)
  }
}
```

Validation, error shape, and response envelope are all handled by the framework. The codemod (`bjs migrate`) emits this `*.controller.ts` shape from your existing Express routes.

## What changes conceptually

| Express habit                       | BananaJS pattern                                  |
| ----------------------------------- | ------------------------------------------------- |
| Manual `router.get/post`            | `@Controller` + `@Get`/`@Post` on class methods   |
| Manual body/query validation        | `@Body(schema)` / `@Query(schema)` with validation |
| Ad-hoc `res.status().json()`        | `BaseController.ok` or `SuccessResponse` + `send` |
| Central `if (err)` in every handler | Throw `ApiError` subclasses + `ErrorMiddleware`   |

## Codemod

The CLI includes **`bananajs migrate`** — Express route codemod that emits `*.controller.ts` starters (see [CLI](/tooling/cli)).

## Tests

Use **`BananaTestApp`** from **`@banana-universe/bananajs/testing`** to hit your app over HTTP without binding a real port in every test.

## Related

- [Getting started](/guide/getting-started)
- [Advanced concepts](/guide/advanced-concepts)
