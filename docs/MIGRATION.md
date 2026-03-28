# Migrating to BananaJS

This guide walks through migrating an existing Express application to BananaJS incrementally — route by route, without a big-bang rewrite.

---

## Why Migrate?

Express is unopinionated by design. As apps grow, teams accumulate inconsistent patterns: scattered validation, ad-hoc error formats, hand-rolled response wrappers, and fragile tests that depend on a live server. BananaJS solves these problems with:

- **Typed controllers** via decorators — co-locate routes, validation, and handlers
- **Standardized responses** via `SuccessResponse` / `ApiError` subclasses
- **First-class testing** via `BananaTestApp` (no live server needed)
- **Built-in DI** via `@Injectable`
- **Request context** propagation via `RequestContext`

---

## Bootstrap API (breaking)

`BananaApp`, `BananaApp.create`, `createBananaApplication`, and `BananaTestApp.create` take **one object** that includes **`controllers`**. Use **`defineBananaControllers(...)`** for that field, and optionally **`defineBananaAppOptions({ ... })`** when merging Awilix **`services`**.

**Before:**

```typescript
new BananaApp([UserController], { logger: false })
await BananaApp.create([UserController], { plugins: [myPlugin] })
await createBananaApplication([UserController], { port: 3000 })
BananaTestApp.create([UserController])
```

**After:**

```typescript
import {
  BananaApp,
  createBananaApplication,
  defineBananaAppOptions,
  defineBananaControllers,
} from '@banana-universe/bananajs'
import { BananaTestApp } from '@banana-universe/bananajs/testing'

new BananaApp({
  controllers: defineBananaControllers(UserController),
  logger: false,
})

await BananaApp.create(
  defineBananaAppOptions({
    controllers: defineBananaControllers(UserController),
    plugins: [myPlugin],
  }),
)

await createBananaApplication({
  controllers: defineBananaControllers(UserController),
  port: 3000,
})

BananaTestApp.create({
  controllers: defineBananaControllers(UserController),
})
```

---

## Incremental Adoption

You do not have to migrate everything at once. `BananaRouter` lets you mount BananaJS-controlled routes into an existing Express app alongside legacy routes.

```typescript
import express from 'express'
import { BananaRouter } from 'bananajs'
import { UserController } from './controllers/UserController'

const legacyApp = express()

// Mount only the migrated routes under /api/v2
const bananaRouter = new BananaRouter([UserController])
legacyApp.use('/api/v2', bananaRouter.router)

// Legacy routes remain untouched
legacyApp.get('/api/v1/users', legacyHandler)

legacyApp.listen(3000)
```

---

## Step 1: Install BananaJS

```bash
npm install bananajs reflect-metadata zod
```

Add to the top of your entry point (once):

```typescript
import 'reflect-metadata'
```

Enable decorators in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Step 2: Controller Migration

**Before — plain Express router:**

```typescript
import { Router, Request, Response } from 'express'

const router = Router()

router.get('/users', async (req: Request, res: Response) => {
  const users = await userService.findAll()
  res.json({ status: 'success', data: users })
})

router.post('/users', async (req: Request, res: Response) => {
  const user = await userService.create(req.body)
  res.status(201).json({ status: 'success', data: user })
})
```

**After — BananaJS controller:**

```typescript
import { Controller, Get, Post, Body } from 'bananajs'
import { SuccessResponse } from 'bananajs'
import { CreateUserDto } from './dto/CreateUserDto'
import { UserService } from './UserService'

@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/')
  async getAll(req: Request, res: Response) {
    const users = await this.userService.findAll()
    return new SuccessResponse('Users fetched', users).send(res)
  }

  @Post('/')
  async create(req: Request, res: Response) {
    const user = await this.userService.create(req.body)
    return res.status(201).json(new SuccessResponse('User created', user))
  }
}
```

---

## Step 3: Validation Migration

**Before — express-validator:**

```typescript
import { body, validationResult } from 'express-validator'

router.post(
  '/users',
  [body('email').isEmail(), body('name').notEmpty()],
  (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    // handle request
  },
)
```

**After — BananaJS `@Body` with Zod:**

```typescript
// dto/create-user.schema.ts
import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
})

// UserController.ts
import { z } from 'zod'
import { Body, Post, SuccessResponse } from '@banana-universe/bananajs'
import type { Request, Response } from 'express'
import { CreateUserSchema } from './dto/create-user.schema.js'

@Post('')
@Body(CreateUserSchema)
async create(req: Request, res: Response) {
  const body = req.body as z.infer<typeof CreateUserSchema>
  const user = await this.userService.create(body)
  return new SuccessResponse('User created', user).send(res)
}
```

Validation errors are caught automatically and returned as a structured `400` response — no manual `validationResult()` call needed.

---

## Step 4: Error Handling Migration

**Before — custom next(err) patterns:**

```typescript
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id)
    if (!user) {
      return next({ status: 404, message: 'User not found' })
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
})

// somewhere in app setup:
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message })
})
```

**After — `ApiError` subclasses:**

```typescript
import { NotFoundError } from 'bananajs'

@Get('/:id')
async getById(req: Request, res: Response) {
  const user = await this.userService.findById(req.params.id)
  if (!user) {
    throw new NotFoundError('User not found')
  }
  return new SuccessResponse('User fetched', user).send(res)
}
```

BananaJS's `ErrorMiddleware` catches all `ApiError` subclasses and serializes them to the correct HTTP status automatically. No per-route try/catch needed.

---

## Step 5: Response Standardization

**Before — ad-hoc response shapes:**

```typescript
res.json({ success: true, data: users, count: users.length })
res.json({ error: true, message: 'Not found' })
res.status(201).json({ id: newUser.id, created: true })
```

**After — BananaJS response classes:**

```typescript
import { SuccessResponse, NotFoundResponse } from 'bananajs'

// Success
return new SuccessResponse('Users fetched', users).send(res)

// Error (via throw — preferred)
throw new NotFoundError('User not found')

// Or direct response for non-throwing paths
return new NotFoundResponse('User not found').send(res)
```

All responses follow the same envelope:

```json
{
  "statusCode": "success",
  "status": 200,
  "message": "Users fetched",
  "data": [...]
}
```

---

## Step 6: Middleware Passthrough

Existing Express middlewares work as-is — pass them through `BananaApp` or `BananaRouter` options, or apply them directly to the underlying Express instance before mounting.

```typescript
import helmet from 'helmet'
import cors from 'cors'
import { BananaApp, defineBananaControllers } from 'bananajs'
import { UserController } from './controllers/UserController'

// Option A: BananaApp security options (built-in)
const app = new BananaApp({
  controllers: defineBananaControllers(UserController),
  security: { helmet: true, cors: true },
})

// Option B: register custom middleware on the raw Express instance
app.getInstance().use(myCustomMiddleware())
app.getInstance().use('/webhooks', rawBodyParser)
```

For `BananaRouter` mount, apply middleware to the parent Express app before the router:

```typescript
legacyApp.use('/api/v2', myAuthMiddleware, bananaRouter.router)
```

---

## Step 7: Testing Migration

**Before — supertest against a live Express app:**

```typescript
import request from 'supertest'
import app from '../src/app'

test('GET /users returns list', async () => {
  const res = await request(app).get('/users').expect(200)
  expect(res.body.data).toBeInstanceOf(Array)
})
```

**After — `BananaTestApp`:**

```typescript
import { BananaTestApp } from 'bananajs/testing'
import { defineBananaControllers } from 'bananajs'
import { UserController } from '../src/controllers/UserController'

const testApp = BananaTestApp.create({
  controllers: defineBananaControllers(UserController),
})

test('GET /users returns list', async () => {
  const res = await testApp.inject({ method: 'GET', url: '/users' })
  expect(res.status).toBe(200)
  expect(res.body.data).toBeInstanceOf(Array)
})

test('authenticated endpoint', async () => {
  const res = await testApp.withAuth('my-jwt-token').inject({ method: 'GET', url: '/users/me' })
  expect(res.status).toBe(200)
})
```

`BananaTestApp` disables rate limiting, helmet, CORS, graceful shutdown, and logging by default — making tests fast and deterministic.

---

## Going Full BananaJS

Once all routes are migrated, replace the `BananaRouter` mount with a standalone `BananaApp`:

**Before (hybrid):**

```typescript
const legacyApp = express()
const bananaRouter = new BananaRouter([UserController, OrderController])
legacyApp.use('/api', bananaRouter.router)
legacyApp.listen(3000)
```

**After (full BananaJS):**

```typescript
import BananaApp, { defineBananaControllers } from 'bananajs'
import { UserController } from './controllers/UserController'
import { OrderController } from './controllers/OrderController'

const app = new BananaApp({
  controllers: defineBananaControllers(UserController, OrderController),
  security: { helmet: true, cors: true },
  gracefulShutdown: true,
  requestId: true,
})

app.getInstance().listen(3000)
```

At this point you can remove the `express` dependency from your project.
