# Architecture

Technical architecture and design decisions for banana-universe. See CONTEXT.md for business context. See CODEMAP.md for file structure.

## Workspace Architecture

Nx monorepo with npm workspaces:

- `packages/*` — publishable libraries
- `apps/*` — runnable applications (demos, integrations)
- Shared TypeScript base config (`tsconfig.base.json`) with path aliases

## Core Framework Architecture (`packages/bananajs`)

### Entry Point

`BananaApp` class is the single initialization point. Consumers pass an array of controller classes and optional global middlewares:

```typescript
new BananaApp([UserController, ProductController], [authMiddleware]).getInstance()
```

### Decorator-Based Route Registration

**Pattern:** Decorators write to `reflect-metadata` at class/method level; `BananaApp` reads metadata at startup to wire Express.

1. `@Controller(basePath)` — stores `BASE_PATH` on the class.
2. `@Get/@Post/@Put/@Patch/@Delete(path, middlewares?)` — appends `IRouter` entry to `ROUTERS` metadata array on the class.
3. `BananaApp.initializeControllers()` reads both, creates an Express `Router`, registers each route handler.

**Key constants:** `MetadataKeys.BASE_PATH`, `MetadataKeys.ROUTERS` (in `MetaData.constants.ts`)

### Validation Middleware Injection

`@Body/@Params/@Query(DtoClass)` replaces the handler method in `descriptor.value` with a wrapper that:

1. Hydrates DTO via `plainToInstance` (class-transformer)
2. Validates via `validate` (class-validator) with `whitelist: true`, `forbidNonWhitelisted: true`
3. On failure: responds immediately with `{ status: 400, message: <error list> }`
4. On success: calls original handler via `method.apply(this, arguments)`

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

| Module               | Public API                                                                                                                                | Internal Only                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/bananajs`  | `BananaApp`, `@Controller`, `@Get/Post/...`, `@Body/Params/Query`, `SuccessResponse`, `ApiError` + subclasses, all error response classes | `initializeControllers`, `validationFactory`, `methodDecoratorFactory`, `MetadataKeys` |
| `apps/bananajs-demo` | N/A (application)                                                                                                                         | All                                                                                    |

## Build System

- **Nx** orchestrates builds, enforces module boundaries, and provides `@nx/js:verdaccio` for local registry.
- **SWC** (`@swc-node/register`, `@swc/core`) for fast TypeScript transpilation.
- **Webpack** for `bananajs-demo` app bundling.
- TypeScript `experimentalDecorators: true` and `emitDecoratorMetadata: true` required for decorators.

## Testing Architecture

No tests present in current state. Not planned for this iteration — will be addressed in a future milestone.

## Publishing

- `npm run publish:bananajs` → builds then `npm publish --access public`
- Local test via Verdaccio on port 4873: `nx run source:local-registry`
