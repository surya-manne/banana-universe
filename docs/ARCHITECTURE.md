# Architecture

Technical architecture and design decisions for banana-universe. See CONTEXT.md for business context. See CODEMAP.md for file structure.

**Enterprise modular DX** (feature modules, `createModule`, tsyringe child containers, optional `discoverModules` stub, **`apiPrefix`**) is specified in [plans/EnterpriseRoadmapV6.md](../plans/EnterpriseRoadmapV6.md). The **supported** paths are **`controllers`** via **`defineBananaControllers`** (legacy-friendly) or **`modules`** via **`createModule`**; both use **tsyringe** on `AppContext.container`.

## Workspace Architecture

Nx monorepo with npm workspaces:

- `packages/*` — publishable libraries
- `apps/*` — runnable applications (demos, integrations)
- Shared TypeScript base config (`tsconfig.base.json`) with path aliases

## Core Framework Architecture (`packages/bananajs`)

### Entry Point

`BananaApp` class is the single initialization point. Consumers pass **one options object**.

**Current path (supported today):** pass **`controllers`** via **`defineBananaControllers`** and optional global **`middlewares`**:

```typescript
import { BananaApp, defineBananaControllers } from '@banana-universe/bananajs'

new BananaApp({
  controllers: defineBananaControllers(UserController, ProductController),
  middlewares: [authMiddleware],
}).getInstance()
```

**Planned path (see [EnterpriseRoadmapV6.md](../plans/EnterpriseRoadmapV6.md)):** pass **`modules`** built with **`createModule`** (per-feature `src/modules/<feature>/index.ts`), hierarchical **tsyringe** containers, and **`{ token, useClass }`** bindings from repository **ports** to **persistence** adapters. Legacy apps keep **`controllers`** without **`modules`** until migrated. Full layout, DI conventions, plugin ordering, and migration notes live in that plan.

### Modular applications (implemented in core)

Feature modules use **`createModule`**, per-module child containers, and **`providers`** with **`{ token, useClass }`**. See the roadmap and `defineBananaAppOptions({ modules: [...] })`.

| Topic        | Intended direction                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout       | `src/modules/<feature>/` with **`domain/`** and **`persistence/`**; feature entry **`index.ts`** exports **`createModule`**.                                               |
| HTTP         | **One controller per module**; split into another module if the API slice grows (e.g. admin vs public).                                                                    |
| DI           | **tsyringe** child container per module; **InjectionToken** colocated with repository **port** in `domain/`; **`providers`** bind token → adapter.                         |
| Bootstrap    | **`plugins`** register shared tokens (e.g. ORM `DataSource`) on the **root** container **before** module providers resolve — ordering is part of the contract.             |
| Testing      | **`BananaTestApp`**-style composition with **token overrides** for fakes (see plan).                                                                                       |
| API versions | **URI-first** (e.g. `/v1/...` via `@Controller` or optional app **`apiPrefix`**); split modules for parallel major versions; OpenAPI aligned with paths (see plan **§4**). |

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

| Module                       | Public API                                                                                                                                                                                                               | Internal Only                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/bananajs`          | `BananaApp`, `createBananaApplication`, `BaseController`, `@Controller`, `@Get/Post/...`, `@Body/Params/Query/Headers` (Zod), `SuccessResponse`, `ApiError` + subclasses, `createModule`, `BananaPlugin`, `AppContext`, `Cache`, `CacheEvict`, `Tenant`, `Can`, `Auth`, `Roles`, `BananaConfig` | `initializeControllers`, `joinRouteSegments`, `MetadataKeys` |
| `packages/ddd`               | `Entity`, `ValueObject`, `Aggregate`, `DomainEvent`, `Repository` base classes                                                                                                                                           | All implementation details                                   |
| `packages/bananajs-cli`      | `bananajs` CLI binary — `routes`, `migrate`, `db`, `openapi`, `ai generate`, `ai doc`, `ai review`                                                                                                                      | LLM provider adapters, AST scanner internals                 |
| `packages/plugin-typeorm`    | `TypeOrmPlugin()`, `@Transactional()`                                                                                                                                                                                    | All                                                          |
| `packages/plugin-mongoose`   | `MongoosePlugin()`, `@Transactional()`                                                                                                                                                                                   | All                                                          |
| `packages/plugin-otel`       | `OpenTelemetryPlugin()`                                                                                                                                                                                                  | All                                                          |
| `packages/plugin-websocket`  | `WebSocketPlugin()`, `@WsController`, `@OnConnect`, `@OnDisconnect`, `@OnMessage`, `@WsBody`                                                                                                                             | All                                                          |
| `packages/adapter-fastify`   | `FastifyAdapter` (stub — not production-ready)                                                                                                                                                                           | All                                                          |
| `apps/example-*`             | N/A (applications)                                                                                                                                                                                                       | All                                                          |

## Build System

- **Nx** orchestrates builds, enforces module boundaries, and provides `@nx/js:verdaccio` for local registry.
- **SWC** (`@swc-node/register`, `@swc/core`) for fast TypeScript transpilation.
- **Webpack** for `bananajs-demo` app bundling.
TypeScript `experimentalDecorators: true` required for decorators. `emitDecoratorMetadata: false` (confirmed) — all decorators use explicit `Reflect.defineMetadata` calls instead of relying on emitted metadata.

## Testing Architecture

No automated tests (spec/test files) currently exist in the workspace. Testing is tracked as a future milestone in `docs/TODO.md`.

**Planned approach** (from [EnterpriseRoadmapV6.md](../plans/EnterpriseRoadmapV6.md)): integration tests that compose **`modules`** and override DI tokens (e.g. in-memory repositories) via **`BananaTestApp`** / `testOverrides` option.

**`BananaTestApp`** is available now as a testing subpath export (`@banana-universe/bananajs/testing`) with `.withAuth(token)`, `.withHeaders(headers)`, `.clearHeaders()` fluent API and `rateLimit: false` default.

## BananaJS CLI and `.bananarc.json`

The **`bananajs-cli`** package reads **`.bananarc.json`** for LLM provider settings, **`generate`** defaults (`defaultOrm`, `preset`, `outDir`, `structure`), and optional **`project`** context (`apiPrefix`, `bootstrap`, `main`) used by **`ai generate`**, **`ai wire`**, and shared LLM rules. Types and merge behavior: `packages/bananajs-cli/src/lib/llm/bananarc.ts`.

## Publishing

See [../PUBLISHING.md](../PUBLISHING.md) for full manual publish steps.

- **Local only:** `npm run registry:local` starts Verdaccio (Nx `local-registry` target, port 4873, config `.verdaccio/config.yml`).
- **Publish all packages in order (local test):** `npm run publish:local` → `scripts/publish-local-verdaccio.sh` (optional env `NPM_PUBLISH_REGISTRY` for a non-default URL).
- **Public versioning:** `npm run release:version` (Nx Release automatic conventional commits bump, independent).
- **Public publish:** `npm run release:publish` (Only pushes modified packages).
