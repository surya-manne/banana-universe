# Validation

BananaJS validates request input with **Zod schemas applied as decorators**. Invalid input never reaches your handler — the framework returns a typed 400 response automatically. This page covers the four input decorators, how coercion works for query and params, what a validation-error response looks like, and how to extend the default behaviour.

<div class="note note-beginner">

**New here?** Validation is the single biggest source of repetitive code in Express apps. BananaJS removes it by making validation a decorator on the handler method. Read the [Quickstart](/guide/quickstart) for the simplest example, then come back to this page when you need detail on coercion or custom errors.

</div>

## The four input decorators

| Decorator | What it validates | Source on the request | Typical schema |
|---|---|---|---|
| `@Body(schema)` | JSON body | `req.body` | `z.object({ ... })` |
| `@Query(schema)` | Query string | `req.query` | `z.object({ ... })` with coercion |
| `@Params(schema)` | Path parameters | `req.params` | `z.object({ ... })` with coercion |
| `@Headers(schema)` | HTTP headers (lowercased) | `req.headers` | `z.object({ ... })` |

Each decorator runs **before** your handler. If validation fails, BananaJS throws `BadRequestError` and the response middleware shapes a `400` JSON envelope. Your handler is never invoked.

```typescript
import { Controller, Get, Post, Body, Query, Params, BaseController } from '@banana-universe/bananajs'
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name:  z.string().min(1).max(120),
  age:   z.number().int().min(13).optional(),
})

const ListUsersQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

const UserIdParamsSchema = z.object({ id: z.string().uuid() })

@Controller('users')
export class UserController extends BaseController {
  @Post('')
  @Body(CreateUserSchema)
  async create(req: Request, res: Response) {
    const dto = req.body as z.infer<typeof CreateUserSchema>
    const user = await this.service.create(dto)
    return this.ok(res, 'User created', user)
  }

  @Get('')
  @Query(ListUsersQuerySchema)
  async list(req: Request, res: Response) {
    const { page, limit, search } = req.query as z.infer<typeof ListUsersQuerySchema>
    const result = await this.service.list({ page, limit, search })
    return this.ok(res, 'Users', result)
  }

  @Get(':id')
  @Params(UserIdParamsSchema)
  async byId(req: Request, res: Response) {
    const { id } = req.params as z.infer<typeof UserIdParamsSchema>
    const user = await this.service.findById(id)
    if (!user) throw new NotFoundError(`User ${id} not found`)
    return this.ok(res, 'User', user)
  }
}
```

## Coercion — why `z.coerce` matters for query and params

`req.query` and `req.params` arrive as **strings** even when they represent numbers, booleans, or dates. Use Zod's coercion helpers so the validated value lands in your handler as the right TypeScript type.

```typescript
// ✅ Works — string '42' coerced to number 42
z.object({ page: z.coerce.number().int().min(1) })

// ❌ Fails — Zod sees string '42', schema expects number
z.object({ page: z.number().int().min(1) })
```

Common coercions:

| You want | Schema fragment |
|---|---|
| `number` from `?page=42` | `z.coerce.number().int().min(1)` |
| `boolean` from `?active=true` | `z.coerce.boolean()` |
| `Date` from `?since=2026-01-01` | `z.coerce.date()` |
| Default when missing | `z.coerce.number().default(1)` |
| Optional | `z.string().optional()` |

`req.body` arrives as parsed JSON (via `express.json()`) so coercion is usually unnecessary — incoming numbers are already numbers.

## What a validation-error response looks like

When a schema fails, BananaJS calls the framework's error middleware which produces a consistent shape:

```json
{
  "statusCode": "error",
  "status": 400,
  "message": "Validation failed: email — Invalid email; name — String must contain at least 1 character(s)",
  "data": null
}
```

The `message` field is human-readable. The exact format is built from the Zod issue list and is suitable for surfacing in a UI. Frontend code parses the response envelope the same way it parses any other BananaJS response — no special-casing per endpoint.

<div class="note note-warn">

**Production safety.** In `production` mode, BananaJS masks internal errors but **does not mask validation errors** — they remain explicit so clients can fix bad input. Set the `errorMessages` option on `BananaAppOptions` to customise wording globally.

</div>

## Validating headers

```typescript
const ApiHeadersSchema = z.object({
  'x-api-key':    z.string().min(20),
  'x-request-id': z.string().uuid().optional(),
})

@Controller('private')
export class PrivateController extends BaseController {
  @Get('')
  @Headers(ApiHeadersSchema)
  async read(req: Request, res: Response) {
    const { 'x-api-key': apiKey } = req.headers as z.infer<typeof ApiHeadersSchema>
    // ...
  }
}
```

Header names arrive **lowercased** in `req.headers` — your schema keys must match the lowercase form.

## Composing schemas

Schemas are plain Zod values — use `.merge`, `.extend`, `.pick`, `.omit` to share definitions across controllers.

```typescript
const UserBase = z.object({
  email: z.string().email(),
  name:  z.string().min(1).max(120),
})

const CreateUserSchema = UserBase.extend({ password: z.string().min(12) })
const UpdateUserSchema = UserBase.partial()
```

For DDD layouts, place schemas under `<module>/dto/` and import them into both the controller (for validation) and the use case (for typed inputs). The `bjs generate module --structure ddd` scaffold does this for you.

## Custom error messages

Zod accepts a message on every refinement:

```typescript
const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')
```

These appear verbatim in the `message` field of the 400 response.

## Extending the validation pipeline

For project-wide rules — for example, stripping unknown keys, or applying a sanitization step — add an Express middleware before your routes mount, or implement a small custom decorator that wraps `@Body`. The framework's default is **strict mode** (`z.object({...})` rejects unknown keys); use `.strip()` or `.passthrough()` per schema if you need different behaviour.

## Related

- [Core concepts](/guide/basic-concepts) — controllers, responses, errors
- [Zod integration](/integrations/zod) — installation and Zod version notes
- [Consistent responses](/guide/consistent-responses) — the response envelope and error classes
- [Decorators reference](/reference/decorators) — full decorator catalog
