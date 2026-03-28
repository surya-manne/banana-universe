# Architecture

Technical architecture and design decisions for banana-universe. See CONTEXT.md for business context. See CODEMAP.md for file structure.

## Workspace Architecture

Nx monorepo with npm workspaces:

- `packages/*` — publishable libraries
- `apps/*` — runnable applications (demos, integrations)
- Shared TypeScript base config (`tsconfig.base.json`) with path aliases

## Core Framework Architecture (`packages/bananajs`)

### Entry Point

`BananaApp` class is the single initialization point. Consumers pass **one options object** with **`controllers`** (via **`defineBananaControllers`**) and optional global **`middlewares`** in options:

```typescript
import { BananaApp, defineBananaControllers } from '@banana-universe/bananajs'

new BananaApp({
  controllers: defineBananaControllers(UserController, ProductController),
  middlewares: [authMiddleware],
}).getInstance()
```

### Decorator-Based Route Registration

**Pattern:** Decorators write to `reflect-metadata` at class/method level; `BananaApp` reads metadata at startup to wire Express.

1. `@Controller(baseSegment)` — stores a **slash-free** base segment (e.g. `'users'`, `''` for root) in `BASE_PATH`.
2. `@Get/@Post/@Put/@Patch/@Delete(path, middlewares?)` — stores a **slash-free** route segment; `joinRouteSegments` composes full Express paths and the route table.
3. `BananaApp.initializeControllers()` reads both, creates an Express `Router`, registers each route handler.

**Key constants:** `MetadataKeys.BASE_PATH`, `MetadataKeys.ROUTERS` (in `MetaData.constants.ts`). Path joining lives in `lib/Router/route-path.ts`.

### Validation Middleware Injection

`@Body/@Params/@Query/@Headers(schema)` wraps the handler and runs **`schema.safeParse`** on the matching request slice (`zod`). On failure it throws `BadRequestError`; on success it assigns **`result.data`** back to `req[source]` and calls the original handler.

### Controllers

HTTP controllers should extend **`BaseController`** for `ok` / `error` helpers over `SuccessResponse` and `ApiError`.

### App bootstrap

Use **`BananaApp.create`** when plugins need async lifecycle. Optional one-shot **`createBananaApplication({ controllers: defineBananaControllers(...), ...options, port?, hostname?, onListening? })`** wraps `BananaApp.create` and calls **`listen`** when `port` is set.

### Response Architecture

Abstract `ApiResponse` base class with:

- `statusCode: StatusCode` (`"success"` | `"error"`)
- `status: ResponseStatus` (HTTP status enum)
- `message: string`
- `send(res, headers?)` — serializes and sends via `res.status().json()`

`SuccessResponse<T>` extends `ApiResponse` and adds `data: T`.

All error responses extend `ApiResponse` directly (no data payload).

### Error Architecture

`ApiError` abstract class extends `Error` and carries `type: ErrorType` enum.

`ApiError.handle(err, res)` — static switch dispatcher mapping `ErrorType` → `ApiResponse` subclass.

`ErrorMiddleware` — 4-arg Express handler (must keep `next` to be recognized by Express):

- `instanceof ApiError` → `ApiError.handle()`
- Otherwise → wrap in `InternalError` (mask message in production)

### Middleware Support

`BananaApp` constructor accepts `middlewares: RequestHandler[]` applied globally before controllers. Per-route middlewares can be passed as second argument to route decorators.

## Module Boundaries

| Module               | Public API                                                                                                                                                                                           | Internal Only                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/bananajs`  | `BananaApp`, `createBananaApplication`, `BaseController`, `@Controller`, `@Get/Post/...`, `@Body/Params/Query/Headers` (Zod), `SuccessResponse`, `ApiError` + subclasses, all error response classes | `initializeControllers`, `joinRouteSegments`, `MetadataKeys` |
| `apps/bananajs-demo` | N/A (application)                                                                                                                                                                                    | All                                                          |

## Build System

- **Nx** orchestrates builds, enforces module boundaries, and provides `@nx/js:verdaccio` for local registry.
- **SWC** (`@swc-node/register`, `@swc/core`) for fast TypeScript transpilation.
- **Webpack** for `bananajs-demo` app bundling.
- TypeScript `experimentalDecorators: true` required for decorators. `emitDecoratorMetadata` is **not** enabled workspace-wide — all decorators use explicit `Reflect.defineMetadata` calls instead of relying on emitted metadata.

## Testing Architecture

No tests present in current state. Not planned for this iteration — will be addressed in a future milestone.

## Publishing

- **Local only:** `npm run registry:local` starts Verdaccio (Nx `local-registry` target, port 4873, config `.verdaccio/config.yml`).
- **Publish all packages in order:** `npm run publish:local` → `scripts/publish-local-verdaccio.sh` (optional env `NPM_PUBLISH_REGISTRY` for a non-default URL).
