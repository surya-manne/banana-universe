# Phase 3 Discovery Notes — BananaJS Enterprise Roadmap

> Generated from codebase at `/Users/smanne/Desktop/banana-universe`. Phase 1 and Phase 2 confirmed complete.

---

## 1. Package Structure

| Package        | npm Name                         | Version | Path                     |
| -------------- | -------------------------------- | ------- | ------------------------ |
| Core framework | `@banana-universe/bananajs`      | `0.2.0` | `packages/bananajs/`     |
| CLI tool       | `@banana-universe/bananajs-cli`  | `0.1.0` | `packages/bananajs-cli/` |
| Demo app       | `@banana-universe/bananajs-demo` | `0.0.1` | `apps/bananajs-demo/`    |

**No plugin packages exist yet.** Phase 3 requires bootstrapping the following from scratch:

- `packages/plugin-typeorm/` → `@banana-universe/plugin-typeorm`
- `packages/plugin-prisma/` → `@banana-universe/plugin-prisma`
- `packages/plugin-zod/` → `@banana-universe/plugin-zod`
- `packages/plugin-otel/` → `@banana-universe/plugin-otel`

Each new package needs: `package.json`, `tsconfig.lib.json` (extending `../../tsconfig.base.json`), and `src/index.ts`. No `project.json` needed — Nx infers targets via `nx.json` plugin `@nx/js/typescript`.

---

## 2. BananaApp Integration Points

**File:** `packages/bananajs/src/lib/Core/App.ts`

### Current `BananaAppOptions` (complete)

```typescript
interface BananaAppOptions {
  middlewares?: RequestHandler[]
  security?: { helmet?: boolean | ...; cors?: CorsOptions | false }
  requestId?: boolean
  logger?: Logger | false
  container?: AwilixContainer       // ← awilix DI container, optional
  gracefulShutdown?: boolean
  // Phase 2:
  auth?: { guard: AuthGuard }
  swagger?: { enabled: boolean; path?; title?; version?; description? }
  rateLimit?: { windowMs?; max?; message? } | false
  health?: { enabled: boolean; path?; checks?: HealthCheck[] }
}
```

### Integration hooks for Phase 3 plugins

1. **`plugins?: BananaPlugin[]`** — new `BananaAppOptions` field; processed in constructor before `initializeControllers`
2. **`AppContext`** — wraps `{ app: Application, logger: Logger | undefined, container: AwilixContainer | undefined }`; accessible during plugin lifecycle
3. **`onRegister(ctx, container)`** — called immediately when plugin is added (synchronous or async)
4. **`onReady(ctx)`** — called after `initializeControllers`, before error middleware
5. **`onShutdown()`** — called inside `registerGracefulShutdown()` (already hooks `SIGTERM`/`SIGINT`)
6. **`routeTable`** — `private readonly routeTable: RouteInfo[]` exists, exposed via `getRouteTable(): RouteInfo[]`; CLI `routes` command can call this
7. **Lazy dynamic import pattern** — established in Phase 2 (rate-limit, upload, health, swagger all use `await import(...)`) — Phase 3 ORM/cache/otel plugins should follow the same lazy import pattern

### Constructor wiring order (current)

```
express.json/urlencoded → helmet → cors → requestContext → custom middlewares
→ initializeControllers → health → swagger → errorMiddleware → gracefulShutdown
```

Plugin `onRegister` should run before `initializeControllers`. Plugin `onReady` should run after `initializeControllers` but before error middleware.

---

## 3. Existing Metadata Keys

**File:** `packages/bananajs/src/lib/Router/MetaData.constants.ts`

```typescript
export enum MetadataKeys {
  BASE_PATH = 'base_path',
  ROUTERS = 'routers',
  // Phase 2 — Auth
  AUTH = 'banana:auth',
  ROLES = 'banana:roles',
  PUBLIC = 'banana:public',
  // Phase 2 — Rate Limiting
  RATE_LIMIT = 'banana:rate_limit',
  // Phase 2 — File Upload
  UPLOAD = 'banana:upload',
  // Phase 2 — OpenAPI
  API_TAGS = 'banana:api_tags',
  API_OPERATION = 'banana:api_operation',
  API_BODY = 'banana:api_body',
  API_RESPONSE = 'banana:api_response',
}
```

**Phase 3 additions needed:**

- `CACHE = 'banana:cache'` — for `@Cache` decorator config
- `CACHE_EVICT = 'banana:cache_evict'` — for `@CacheEvict` decorator config
- `TRANSACTIONAL = 'banana:transactional'` — for `@Transactional` decorator
- `INJECT_REPOSITORY = 'banana:inject_repository'` — for `@InjectRepository` parameter decorator

**Note:** `emitDecoratorMetadata` is **NOT** in tsconfig — parameter decorators must store metadata explicitly; cannot rely on `design:type` or `design:paramtypes`.

---

## 4. Decorator Patterns Observed

All decorators follow consistent patterns:

### Class decorator

```typescript
export function Auth(): ClassDecorator & MethodDecorator {
  return (target, propertyKey?) => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(
        KEY,
        value,
        (target as { constructor: object }).constructor,
        propertyKey,
      )
    } else {
      Reflect.defineMetadata(KEY, value, target)
    }
  }
}
```

### Method decorator

```typescript
export function ApiOperation(options): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(KEY, options, target.constructor as object, propertyKey)
  }
}
```

### Stackable method decorator (array append)

```typescript
const existing = Reflect.getMetadata(KEY, target.constructor, propertyKey) ?? []
Reflect.defineMetadata(KEY, [...existing, value], target.constructor, propertyKey)
```

### Lazy optional peer imports (critical pattern)

```typescript
let cachedMiddleware: RequestHandler | undefined
return async (req, res, next) => {
  if (!cachedMiddleware) {
    try {
      const { something } = await import('optional-peer-dep')
      cachedMiddleware = createMiddleware(something)
    } catch {
      logger?.warn('peer dep not installed — feature disabled')
      cachedMiddleware = (_r, _s, n) => n()
    }
  }
  return cachedMiddleware(req, res, next)
}
```

### DI integration pattern

```typescript
const name = controllerClass.name.charAt(0).toLowerCase() + controllerClass.name.slice(1)
container.resolve<T>(name)
```

`@InjectRepository` for ORM plugins should follow a similar pattern — resolve from the awilix container by convention.

---

## 5. CLI Current Structure

**File:** `packages/bananajs-cli/src/index.ts`
**Lib files:** `src/lib/bananajs-cli.ts`, `src/lib/generate.ts`
**Dependencies:** `commander@^7.2.0`, `chalk@4.1.2`, `inquirer@^12.5.2`

### Existing commands

```
bananajs new [appName]           — scaffold via git clone from template repo
bananajs generate <type> <name>  — generate controller | dto | middleware
bananajs g <type> <name>         — alias for generate
  --dry-run                      — print without writing
```

### Phase 3 new commands needed

```
bananajs routes                               — list all registered routes (reads route table)
bananajs migrate --scan                       — scan for pending migrations (TypeORM/Prisma)
bananajs openapi export --client typescript   — export OpenAPI spec + generate TS client
```

**`/_banana/routes` endpoint** — runtime HTTP endpoint mounted by `BananaApp` (opt-in via `devTools?: boolean` in BananaAppOptions).

---

## 6. Public API Surface

**File:** `packages/bananajs/src/index.ts` (22 export lines)

Current exports include: BananaApp, BananaRouter, BananaAppOptions, RouteInfo, Constructor, all route/validation/response/error decorators, Logger, PinoLogger, RequestContext, Injectable, createErrorMiddleware, AuthGuard, @Auth/@Roles/@Public, BananaConfig, PaginatedResponse, PaginationDto, @RateLimit, @Upload, health utilities, OpenAPI decorators.

**Phase 3 additions to main index:**

- `BananaPlugin`, `AppContext` (plugin architecture)
- `@Cache`, `@CacheEvict`, `CacheOptions` (caching)
- New plugin packages export from their own `src/index.ts` only

---

## 7. Build & Nx Patterns for New Packages

### Nx configuration

- **nx.json plugin:** `@nx/js/typescript` with `build` target using `tsconfig.lib.json` — no `project.json` required
- **Build command:** `nx build <package-name>` — uses SWC for transpilation
- **No existing project.json** files — confirmed Nx auto-detection

### New package bootstrap (each plugin needs)

```
packages/plugin-<name>/
├── package.json           — name, version, main/types/exports, peerDependencies
├── tsconfig.lib.json      — extends ../../tsconfig.base.json
└── src/
    └── index.ts           — public API entry
```

### tsconfig.base.json constraints (critical)

- `module: "nodenext"` → all relative imports need `.js` suffix
- `experimentalDecorators: true` (set), `emitDecoratorMetadata` NOT set
- `strict: true`, `noImplicitReturns: true`, `noUnusedLocals: true`
- `target: "es2022"`

### peerDependency pattern

```json
{
  "peerDependencies": { "optional-peer": ">=version" },
  "peerDependenciesMeta": { "optional-peer": { "optional": true } }
}
```

---

## 8. Constraints & Risks

| Constraint/Risk                 | Severity | Detail                                                                                        |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `emitDecoratorMetadata` absent  | HIGH     | Parameter decorators like `@InjectRepository` must use explicit index-based metadata storage. |
| `module: nodenext`              | HIGH     | All relative imports need `.js` suffix. Plugin packages must follow this.                     |
| Awilix DI optional              | MEDIUM   | Plugins receive `container?: AwilixContainer` — must handle `undefined` gracefully.           |
| CLI `routes` command            | MEDIUM   | Cannot import live app without booting it; `/_banana/routes` HTTP endpoint is simpler.        |
| Redis optional cache backend    | MEDIUM   | `ioredis` must be optional peer; in-memory cache usable standalone.                           |
| `@Transactional` aspect pattern | HIGH     | Must wrap `descriptor.value` at decoration time; cannot use route-level middleware chain.     |
| TC39 decorator migration (3.7)  | LOW      | Docs only — no code changes.                                                                  |
| OpenTelemetry SDK size          | LOW      | Must be optional peer deps in `plugin-otel`.                                                  |

---

## 9. Key Questions for the Architect

1. Should `onRegister`/`onReady` be async? If so, `BananaApp.create()` must be used (sync constructor retained for backward compat).
2. Should `AppContext` expose raw `express.Application` or a restricted interface?
3. `@InjectRepository`: awilix-resolve pattern or separate module-level registry?
4. `@Transactional`: method-level wrapper vs per-request middleware?
5. Cache key strategy: static string, `(req) => string` function, or auto-derived?
6. `/_banana/routes`: opt-in `devTools` flag or auto-off in production?
7. `bananajs openapi export --client typescript`: which generator? (`openapi-typescript` recommended)
8. Plugin package versioning: start at `0.1.0`, peer on `>=0.2.0` for core bananajs.
9. Zod adapter: coexist with class-validator or replace? Coexist recommended (new validation path).
10. Path aliases in `tsconfig.base.json` for plugin packages? Only if cross-package internal imports needed.

---

## Appendix: Current File Tree (`packages/bananajs/src/`)

```
src/
├── index.ts
├── Middleware/
│   ├── Error.middleware.ts
│   └── FileUpload.middleware.ts
├── lib/
│   ├── Auth/           (@Auth, @Roles, @Public, AuthGuard, auth.middleware)
│   ├── Config/         (BananaConfig)
│   ├── Context/        (RequestContext, AsyncLocalStorage)
│   ├── Core/           (App.ts — BananaApp, BananaRouter, BananaAppOptions, RouteInfo)
│   ├── DI/             (@Injectable, isInjectable)
│   ├── Health/         (createHealthEndpoint, HealthCheck interfaces)
│   ├── Logger/         (Logger interface, PinoLogger)
│   ├── OpenAPI/        (@ApiTags, @ApiOperation, @ApiBody, ApiResponseDoc, schema extractor, swagger setup)
│   ├── Pagination/     (PaginatedResponse, PaginationDto)
│   ├── RateLimit/      (@RateLimit)
│   ├── Response/       (ApiError 11 classes, SuccessResponse, ApiResponse)
│   ├── Router/         (@Controller, @Get/@Post/etc, MetaData.constants)
│   ├── Upload/         (@Upload)
│   └── Validator/      (@Body, @Params, @Query, @Headers)
└── testing/
    ├── BananaTestApp.ts
    └── index.ts
```
