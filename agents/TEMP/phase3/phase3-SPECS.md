# Phase 3 — Advanced Architecture: Technical Specifications

Status: **Draft**

Companion plan: `agents/TEMP/phase3/phase3-PLAN.md`

---

## TLDR

Phase 3 introduces a plugin system, 4 plugin packages (TypeORM, Prisma, OpenTelemetry, Zod), in-core caching layer, Prometheus metrics, 3 new CLI commands, a `devTools` runtime endpoint, and a TC39 decorator migration plan document. All features are additive; backward compatibility preserved. Target version: bananajs v0.3.0, plugin packages v0.1.0. Estimated: ~35 new files, 5 modified files, 5 parallel implementation streams.

---

## 1. Overview & Scope

### In Scope

| ID   | Feature                   | Location                         |
| ---- | ------------------------- | -------------------------------- |
| 3.1  | Plugin Architecture       | `packages/bananajs` (core)       |
| 3.2a | TypeORM Plugin            | `packages/plugin-typeorm/` (new) |
| 3.2b | Prisma Plugin             | `packages/plugin-prisma/` (new)  |
| 3.3  | Caching Layer             | `packages/bananajs` (core)       |
| 3.4a | OpenTelemetry Plugin      | `packages/plugin-otel/` (new)    |
| 3.4b | Prometheus Metrics        | `packages/bananajs` (core)       |
| 3.5  | Advanced CLI Commands     | `packages/bananajs-cli/`         |
| 3.5b | DevTools Runtime Endpoint | `packages/bananajs` (core)       |
| 3.7  | TC39 Decorator Migration  | `docs/TC39-DECORATORS.md`        |
| 3.8  | Zod Validation Plugin     | `packages/plugin-zod/` (new)     |

### Out of Scope

- Redis cache store plugin (Phase 4 — only `CacheStore` interface defined here)
- AI CLI commands (Phase 4)
- WebSocket/SSE support (Phase 4)
- Multi-tenancy (Phase 4)
- Performance benchmarks (Phase 4)

---

## 2. Architecture & Component Design

### 2.1 Plugin System Architecture

```
BananaApp.create(controllers, options)
  │
  ├─ express setup (json, urlencoded, helmet, cors, requestContext, custom mw)
  ├─ for each plugin: await plugin.register(ctx, container)   ← NEW
  ├─ initializeControllers(controllers)
  │    └─ for each route: inject cache middleware              ← NEW
  ├─ for each plugin: await plugin.onReady?(ctx)              ← NEW
  ├─ devTools endpoint (if enabled)                           ← NEW
  ├─ metrics endpoint (if enabled)                            ← NEW
  ├─ health endpoint
  ├─ swagger endpoint
  ├─ error middleware
  └─ gracefulShutdown
       └─ for each plugin (reverse): await plugin.onShutdown?() ← NEW
```

**Key change:** `BananaApp.create()` becomes the primary entry point for plugin-enabled apps. The sync constructor remains but logs a warning if `plugins` are provided (async lifecycle cannot run in sync constructor).

### 2.2 Package Dependency Graph

```
@banana-universe/bananajs (core, v0.3.0)
  ├── @banana-universe/plugin-typeorm   (peer: bananajs >=0.3.0, typeorm >=0.3.0)
  ├── @banana-universe/plugin-prisma    (peer: bananajs >=0.3.0, @prisma/client >=5.0.0)
  ├── @banana-universe/plugin-otel      (peer: bananajs >=0.3.0, @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node)
  ├── @banana-universe/plugin-zod       (peer: bananajs >=0.3.0, zod >=3.0.0)
  └── @banana-universe/bananajs-cli     (dep: bananajs for route scanning)
```

---

## 3. API Contracts

### 3.1 Plugin Architecture Interfaces

**File:** `packages/bananajs/src/lib/Plugin/Plugin.interface.ts` (NEW)

```typescript
export interface AppContext {
  app: Application
  logger?: Logger
  container?: AwilixContainer
}

export interface BananaPlugin {
  name: string
  register(ctx: AppContext): void | Promise<void>
  onReady?(ctx: AppContext): void | Promise<void>
  onShutdown?(): void | Promise<void>
}
```

**File:** `packages/bananajs/src/lib/Core/App.ts` (MODIFY)

Additions to `BananaAppOptions`:

```typescript
plugins?: BananaPlugin[]
cache?: { store?: 'memory' | CacheStore }
devTools?: boolean
metrics?: { enabled: boolean; path?: string }
```

Additions to `BananaApp`:

```typescript
static async create(controllers: Constructor[], options?: BananaAppOptions): Promise<BananaApp>
// Updated: now awaits plugin.register() for each plugin, then initializeControllers,
// then plugin.onReady(), then devTools/metrics/health/swagger, then error middleware.
```

### 3.2a TypeORM Plugin

**Package:** `packages/plugin-typeorm/` → `@banana-universe/plugin-typeorm@0.1.0`

**File:** `packages/plugin-typeorm/src/index.ts`

```typescript
export function TypeOrmPlugin(options: DataSourceOptions): BananaPlugin
export function InjectRepository(entity: Function): ParameterDecorator
export function Transactional(): MethodDecorator
```

- `TypeOrmPlugin(options)` → returns `BananaPlugin` with `register(ctx)` that creates `DataSource`, calls `initialize()`, registers it in awilix container as `'dataSource'`; then scans all awilix-registered services for `INJECT_REPOSITORY` metadata and re-registers each service with a wrapped awilix factory that resolves the required `Repository<Entity>` from the `DataSource` and passes it as a constructor argument at the recorded `paramIndex`
- `InjectRepository(Entity)` → stores `[{ entity, paramIndex }, ...]` array via `Reflect.defineMetadata(MetadataKeys.INJECT_REPOSITORY, ...)` on the **class** prototype; plugin reads this during `register()` to wire factory
- `Transactional()` → wraps `descriptor.value`: creates QueryRunner, starts transaction, stores active runner in `AsyncLocalStorage` (`TransactionContext`) so that downstream repository calls can access it; calls original method, commits on success, rolls back and re-throws on error, always releases QueryRunner

**peerDependencies:**

```json
{
  "@banana-universe/bananajs": ">=0.3.0",
  "typeorm": ">=0.3.0"
}
```

**devDependencies:** `@banana-universe/bananajs`, `typeorm`, `express`, `reflect-metadata`, `awilix`

### 3.2b Prisma Plugin

**Package:** `packages/plugin-prisma/` → `@banana-universe/plugin-prisma@0.1.0`

**File:** `packages/plugin-prisma/src/index.ts`

```typescript
export function PrismaPlugin(prismaClient: unknown): BananaPlugin
export function Transactional(): MethodDecorator
```

- `PrismaPlugin(client)` → returns `BananaPlugin` with `register` that registers `client` in awilix as `'prismaClient'`, `onShutdown` calls `client.$disconnect()`
- No `@InjectRepository` needed — use awilix `@Injectable` + constructor injection to get `PrismaClient`
- `Transactional()` → wraps `descriptor.value`: resolves `prismaClient` from awilix, calls `client.$transaction(async (tx) => { ... })` with the original method

**peerDependencies:**

```json
{
  "@banana-universe/bananajs": ">=0.3.0",
  "@prisma/client": ">=5.0.0"
}
```

**devDependencies:** `@banana-universe/bananajs`, `@prisma/client`, `express`, `reflect-metadata`, `awilix`

### 3.3 Caching Layer

**File:** `packages/bananajs/src/lib/Cache/Cache.decorator.ts` (NEW)

```typescript
export interface CacheOptions {
  ttl?: number // seconds, default 60
  key?: string | ((req: Request) => string)
}

export function Cache(options?: CacheOptions): MethodDecorator
```

Stores `CacheOptions` via `Reflect.defineMetadata(MetadataKeys.CACHE, options, target.constructor, propertyKey)`.

**File:** `packages/bananajs/src/lib/Cache/CacheEvict.decorator.ts` (NEW)

```typescript
export interface CacheEvictOptions {
  pattern: string // glob-like pattern for key matching
}

export function CacheEvict(options: CacheEvictOptions): MethodDecorator
```

Stores via `Reflect.defineMetadata(MetadataKeys.CACHE_EVICT, options, target.constructor, propertyKey)`.

**File:** `packages/bananajs/src/lib/Cache/CacheManager.ts` (NEW)

```typescript
export interface CacheStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  keys(pattern: string): Promise<string[]>
}

export class CacheManager {
  static getInstance(store?: CacheStore): CacheManager
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  evict(pattern: string): Promise<void>
}
```

Default in-memory store: `Map<string, { value: unknown, expiresAt: number }>`. TTL eviction on `get()` (lazy) + periodic sweep every 60s via `setInterval`.

**Cache key auto-derivation** (when no `key` option provided): `${controllerName}:${methodName}:${JSON.stringify(req.params)}:${JSON.stringify(req.query)}`

**Cache middleware injection** in `initializeControllers()`:

- Read `CACHE` metadata → if present → inject middleware before handler that checks cache → if hit, respond with cached value → if miss, monkey-patch `res.json` to capture response and store in cache
- Read `CACHE_EVICT` metadata → if present → inject middleware after handler (via `res.on('finish', ...)`) that calls `cacheManager.evict(pattern)`

### 3.4a OpenTelemetry Plugin

**Package:** `packages/plugin-otel/` → `@banana-universe/plugin-otel@0.1.0`

**File:** `packages/plugin-otel/src/index.ts`

```typescript
export interface OtelPluginOptions {
  serviceName: string
  exporterUrl?: string
}

export function OpenTelemetryPlugin(options: OtelPluginOptions): BananaPlugin
```

- `register(ctx)` → lazily imports `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node`, initializes `NodeSDK`, calls `sdk.start()`, then immediately mounts Express middleware on `ctx.app` that attaches `RequestContext.getRequestId()` as span attribute `request.id` — **must run in `register()` before `initializeControllers` so middleware is positioned before route handlers**
- `onReady(ctx)` → no-op (can be omitted); SDK is already running
- `onShutdown()` → calls `sdk.shutdown()`

**peerDependencies:**

```json
{
  "@banana-universe/bananajs": ">=0.3.0",
  "@opentelemetry/sdk-node": ">=0.50.0",
  "@opentelemetry/auto-instrumentations-node": ">=0.40.0"
}
```

**devDependencies:** `@banana-universe/bananajs`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `express`, `reflect-metadata`

### 3.4b Prometheus Metrics

**File:** `packages/bananajs/src/lib/Metrics/metrics.middleware.ts` (NEW)

```typescript
export function createMetricsMiddleware(): RequestHandler
export function createMetricsEndpoint(path?: string): RequestHandler
```

- `createMetricsMiddleware()` → lazily imports `prom-client`, creates `Counter('http_requests_total')`, `Histogram('http_request_duration_ms')`, `Counter('http_errors_total')`, wraps each request to record metrics
- `createMetricsEndpoint(path)` → serves `GET /metrics` (or custom path) with Prometheus text format via `register.metrics()`

**Integration:** `BananaAppOptions.metrics?: { enabled: boolean; path?: string }` — when enabled, `BananaApp` mounts metrics middleware (before routes) and metrics endpoint (after routes, before error middleware).

`prom-client` is optional peer dependency.

### 3.5 Advanced CLI Commands

**File:** `packages/bananajs-cli/src/lib/routes.ts` (NEW)

```typescript
export async function listRoutes(): Promise<void>
```

Static AST scan: reads `*.ts` source files in current directory, uses regex to extract `@Controller(path)` and `@Get/@Post/...` decorators, outputs table via chalk.

**File:** `packages/bananajs-cli/src/lib/migrate.ts` (NEW)

```typescript
export async function migrateCodemod(): Promise<void>
```

Express → BananaJS codemod: scans `*.ts`/`*.js` source files in `src/` for Express route patterns (`app.get(...)`, `app.post(...)`, `router.get(...)`, etc.). For each file with routes, generates a corresponding BananaJS `@Controller` + `@Get/@Post/...` class skeleton. Does NOT overwrite source files — writes new `*.controller.ts` files alongside. Prints a summary of what was generated.

**File:** `packages/bananajs-cli/src/lib/db.ts` (NEW)

```typescript
export async function dbStatus(): Promise<void>
```

ORM migration status checker: detects TypeORM (`data-source.ts`/`ormconfig.ts`/`ormconfig.json`) or Prisma (`prisma/schema.prisma`) in current directory. For TypeORM: runs `npx typeorm migration:show -d data-source.ts`. For Prisma: runs `npx prisma migrate status`. Uses async `child_process.exec` wrapped in a Promise. Neither detected → helpful message with ORM setup hint.

**File:** `packages/bananajs-cli/src/lib/openapi.ts` (NEW)

```typescript
export async function openapiExport(options: { out?: string; client?: string }): Promise<void>
```

Reads `openapi.json` from `dist/` or `.banana/openapi.json`. If `--client typescript`: lazily imports `openapi-typescript` to generate TypeScript types from the spec.

**File:** `packages/bananajs-cli/src/index.ts` (MODIFY)

New commands registered:

```
bananajs routes                              — list registered routes (static scan)
bananajs migrate                             — Express → BananaJS route codemod
bananajs db --status                         — check ORM migration status (TypeORM/Prisma)
bananajs openapi export [--out path] [--client typescript]  — export spec + optional client gen
```

### 3.5b DevTools Runtime Endpoint

**File:** `packages/bananajs/src/lib/DevTools/devtools.middleware.ts` (NEW)

```typescript
export function createDevToolsEndpoint(routeTable: RouteInfo[]): RequestHandler
```

Mounts `GET /_banana/routes` returning `routeTable` as JSON. Guard: `NODE_ENV !== 'production'` — in production, returns `404`.

Wired in `App.ts` when `options.devTools === true`.

### 3.7 TC39 Decorator Migration Plan

**File:** `docs/TC39-DECORATORS.md` (NEW)

Content sections:

1. Current decorator usage audit (`experimentalDecorators: true`, `reflect-metadata`)
2. Which decorators rely on `reflect-metadata` vs explicit metadata
3. TC39 Stage 3 decorator differences (class method vs legacy, no parameter decorators)
4. Migration path per decorator category
5. Timeline: complete before v2.0.0

### 3.8 Zod Validation Plugin

**Package:** `packages/plugin-zod/` → `@banana-universe/plugin-zod@0.1.0`

**File:** `packages/plugin-zod/src/index.ts`

```typescript
export function ZodPlugin(): BananaPlugin
export function ZodBody(schema: ZodSchema): MethodDecorator
export function ZodQuery(schema: ZodSchema): MethodDecorator
export function ZodParams(schema: ZodSchema): MethodDecorator
```

- `ZodPlugin()` → no-op `register` (plugin marker for future extensibility); validates zod is available
- `ZodBody(schema)` → replaces `descriptor.value` with wrapper that calls `schema.safeParse(req.body)` → on failure: throws `BadRequestError` with formatted Zod issues → on success: calls original handler. Same pattern as existing `@Body` validation decorator.
- `ZodQuery(schema)` → same pattern on `req.query`
- `ZodParams(schema)` → same pattern on `req.params`
- Coexists with class-validator decorators — routes can use either
- `zod` is a required peer dependency (not optional)

**peerDependencies:**

```json
{
  "@banana-universe/bananajs": ">=0.3.0",
  "zod": ">=3.0.0"
}
```

**devDependencies:** `@banana-universe/bananajs`, `zod`, `express`, `reflect-metadata`

---

## 4. Data Models & Schemas

### 4.1 New Metadata Keys

**File:** `packages/bananajs/src/lib/Router/MetaData.constants.ts` (MODIFY)

```typescript
// Phase 3 — Caching
CACHE = 'banana:cache',
CACHE_EVICT = 'banana:cache_evict',
// Phase 3 — ORM (used by plugin packages)
TRANSACTIONAL = 'banana:transactional',
INJECT_REPOSITORY = 'banana:inject_repository',
```

### 4.2 Cache Entry Model

```typescript
interface CacheEntry {
  value: unknown
  expiresAt: number // Date.now() + ttl * 1000
}
```

### 4.3 Route Info (existing, unchanged)

```typescript
interface RouteInfo {
  method: string
  path: string
  controller: string
  handler: string
}
```

---

## 5. Error Handling Strategy

### Plugin Errors

- `plugin.register()` failure → log error via `this.logger.error()`, throw `Error('Plugin "${name}" failed to register: ${message}')` — fails fast, app does not start
- `plugin.onReady()` failure → same: log + throw, prevents app from accepting traffic
- `plugin.onShutdown()` failure → log warning, continue shutting down other plugins (do not throw)

### Cache Errors

- Cache store `get`/`set`/`del` failures → log warning, bypass cache (do not crash request)
- Cache middleware catches all errors and falls through to handler

### ORM Plugin Errors

- `DataSource.initialize()` failure → plugin throws in `register()` → app fails to start
- `@Transactional` rollback → original error is re-thrown to propagate to error middleware

### Zod Validation Errors

- `schema.safeParse()` failure → throw `BadRequestError` with formatted Zod issue messages
- Consistent with existing class-validator error shape

---

## 6. Testing Strategy

### Per-Feature Test Cases

| Feature              | Happy Path                                  | Edge Case                               | Error Case                                                      |
| -------------------- | ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| Plugin lifecycle     | Plugin registers and onReady fires in order | Plugin with no optional hooks           | Plugin register throws → app fails to start                     |
| `@Cache`             | GET returns cached response on 2nd call     | TTL expires → cache miss                | Cache store error → bypass cache, serve fresh                   |
| `@CacheEvict`        | PUT evicts matching keys                    | Pattern matches zero keys               | Evict error → log warning, response still sent                  |
| TypeORM Plugin       | DataSource initializes, resolves repository | Container undefined → graceful error    | Bad connection config → register fails                          |
| Prisma Plugin        | PrismaClient registered, $transaction works | Empty transaction body                  | Connection error → register fails                               |
| OTel Plugin          | Spans created for routes                    | No exporter URL → default OTLP          | SDK import fails → log warning, no spans                        |
| Prometheus           | `/metrics` returns counters                 | Metrics disabled → endpoint not mounted | `prom-client` missing → log warning                             |
| CLI `routes`         | Outputs route table from source files       | No controllers found → empty table      | Invalid source files → skip with warning                        |
| CLI `migrate --scan` | Shows TypeORM migration status              | Neither ORM detected → helpful message  | TypeORM CLI not available → error message                       |
| CLI `openapi export` | Writes openapi.json to path                 | No spec file found → error message      | `--client typescript` without openapi-typescript → install hint |
| DevTools endpoint    | `/_banana/routes` returns JSON              | `NODE_ENV=production` → 404             | devTools disabled → endpoint not mounted                        |
| `@ZodBody`           | Valid body passes through                   | Extra fields stripped by Zod            | Invalid body → 400 with Zod errors                              |

---

## 7. Security Considerations

- **Plugin sandbox:** Plugins receive `AppContext` — full Express `Application` access. Document that plugin authors have full middleware power; security is plugin author's responsibility.
- **DevTools endpoint:** Protected by `NODE_ENV !== 'production'` guard. In production, returns 404 (not 403) to avoid information leakage.
- **Cache:** No sensitive data caching by default. Document that `@Cache` should not be applied to endpoints returning user-specific PII without a user-scoped cache key.
- **ORM transactions:** `@Transactional` does not bypass auth/validation middleware chain.
- **Zod validation:** `safeParse` mode — does not throw raw Zod errors to client; errors are formatted into `BadRequestError`.

---

## 8. Dependencies

### New peerDependencies for `packages/bananajs`

```json
{
  "prom-client": ">=15.0.0"
}
```

With `peerDependenciesMeta`:

```json
{
  "prom-client": { "optional": true }
}
```

Also add to devDependencies: `prom-client` (for tsc compilation).

### New devDependencies for `packages/bananajs-cli`

```json
{
  "openapi-typescript": ">=7.0.0"
}
```

### tsconfig.base.json Path Aliases (optional, for monorepo cross-refs)

```json
{
  "paths": {
    "@banana-universe/plugin-typeorm": ["packages/plugin-typeorm/src/index.ts"],
    "@banana-universe/plugin-prisma": ["packages/plugin-prisma/src/index.ts"],
    "@banana-universe/plugin-otel": ["packages/plugin-otel/src/index.ts"],
    "@banana-universe/plugin-zod": ["packages/plugin-zod/src/index.ts"]
  }
}
```

---

## 9. Assumptions

1. `BananaApp.create()` is already the recommended async factory; sync constructor is legacy path
2. `awilix` container is available when plugins need DI registration
3. Plugin authors will publish separate npm packages; we provide first-party plugins
4. `reflect-metadata` is already a hard dependency of core
5. `prom-client` and `openapi-typescript` are optional — features degrade gracefully when absent
6. TypeORM and Prisma are never direct dependencies of core or CLI — always peer deps of their respective plugin packages

---

## 10. Tech Summary: Files Affected

### New Files

| File Path                                                   | Feature                    |
| ----------------------------------------------------------- | -------------------------- |
| `packages/bananajs/src/lib/Plugin/Plugin.interface.ts`      | 3.1 Plugin interfaces      |
| `packages/bananajs/src/lib/Cache/Cache.decorator.ts`        | 3.3 Cache decorator        |
| `packages/bananajs/src/lib/Cache/CacheEvict.decorator.ts`   | 3.3 CacheEvict decorator   |
| `packages/bananajs/src/lib/Cache/CacheManager.ts`           | 3.3 CacheManager singleton |
| `packages/bananajs/src/lib/Metrics/metrics.middleware.ts`   | 3.4b Prometheus metrics    |
| `packages/bananajs/src/lib/DevTools/devtools.middleware.ts` | 3.5b DevTools endpoint     |
| `packages/plugin-typeorm/package.json`                      | 3.2a TypeORM plugin        |
| `packages/plugin-typeorm/tsconfig.lib.json`                 | 3.2a TypeORM plugin        |
| `packages/plugin-typeorm/src/index.ts`                      | 3.2a TypeORM plugin        |
| `packages/plugin-prisma/package.json`                       | 3.2b Prisma plugin         |
| `packages/plugin-prisma/tsconfig.lib.json`                  | 3.2b Prisma plugin         |
| `packages/plugin-prisma/src/index.ts`                       | 3.2b Prisma plugin         |
| `packages/plugin-otel/package.json`                         | 3.4a OTel plugin           |
| `packages/plugin-otel/tsconfig.lib.json`                    | 3.4a OTel plugin           |
| `packages/plugin-otel/src/index.ts`                         | 3.4a OTel plugin           |
| `packages/plugin-zod/package.json`                          | 3.8 Zod plugin             |
| `packages/plugin-zod/tsconfig.lib.json`                     | 3.8 Zod plugin             |
| `packages/plugin-zod/src/index.ts`                          | 3.8 Zod plugin             |
| `packages/bananajs-cli/src/lib/routes.ts`                   | 3.5 CLI routes command     |
| `packages/bananajs-cli/src/lib/migrate.ts`                  | 3.5 CLI migrate command    |
| `packages/bananajs-cli/src/lib/openapi.ts`                  | 3.5 CLI openapi command    |
| `docs/TC39-DECORATORS.md`                                   | 3.7 TC39 migration doc     |

### Modified Files

| File Path                                                | Changes                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/bananajs/src/lib/Router/MetaData.constants.ts` | Add 4 new enum entries                                                                     |
| `packages/bananajs/src/lib/Core/App.ts`                  | Plugin lifecycle, cache/metrics/devTools wiring, `BananaAppOptions` extensions             |
| `packages/bananajs/src/index.ts`                         | Export `BananaPlugin`, `AppContext`, `CacheStore`, `@Cache`, `@CacheEvict`, `CacheManager` |
| `packages/bananajs/package.json`                         | Add `prom-client` optional peer, bump version to `0.3.0`                                   |
| `packages/bananajs-cli/src/index.ts`                     | Register `routes`, `migrate`, `openapi export` commands                                    |
| `packages/bananajs-cli/package.json`                     | Add `openapi-typescript` devDep                                                            |
| `tsconfig.base.json`                                     | Add path aliases for plugin packages                                                       |

### Acceptance Criteria Summary

| Feature                 | Acceptance Criteria                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Plugin Architecture | `BananaApp.create([], { plugins: [testPlugin] })` → register called, onReady called. `onShutdown` fires on SIGTERM. Sync constructor warns when plugins provided.                                                 |
| 3.2a TypeORM Plugin     | `TypeOrmPlugin({...})` registers DataSource in awilix. `@InjectRepository(Entity)` resolves at controller instantiation. `@Transactional()` wraps in DB transaction with rollback on error.                       |
| 3.2b Prisma Plugin      | `PrismaPlugin(client)` registers in awilix. `@Transactional()` wraps in `$transaction`. `onShutdown` disconnects.                                                                                                 |
| 3.3 Caching             | `@Cache({ ttl: 60 })` caches response. 2nd identical request returns cached. After TTL → fresh response. `@CacheEvict({ pattern: 'users:*' })` clears matching keys. Cache store errors do not crash.             |
| 3.4a OTel Plugin        | `OpenTelemetryPlugin({ serviceName: 'test' })` initializes OTel SDK. Route spans include `request.id` attribute. `onShutdown` calls `sdk.shutdown()`.                                                             |
| 3.4b Metrics            | `{ metrics: { enabled: true } }` → `GET /metrics` returns Prometheus text with `http_requests_total`, `http_request_duration_ms`, `http_errors_total`. Missing `prom-client` → log warning, endpoint not mounted. |
| 3.5 CLI Routes          | `bananajs routes` outputs table with method, path, controller, handler from source files.                                                                                                                         |
| 3.5 CLI Migrate         | `bananajs migrate --scan` detects ORM type and shows migration status. Neither detected → helpful message.                                                                                                        |
| 3.5 CLI OpenAPI         | `bananajs openapi export --out api.json` writes spec. `--client typescript` generates types.                                                                                                                      |
| 3.5b DevTools           | `{ devTools: true }` → `GET /_banana/routes` returns JSON. `NODE_ENV=production` → 404. Disabled by default.                                                                                                      |
| 3.7 TC39 Docs           | Document exists with audit, migration path, and timeline sections.                                                                                                                                                |
| 3.8 Zod Plugin          | `@ZodBody(schema)` validates with `safeParse`. Invalid → 400 with Zod errors. Valid → handler runs. Coexists with `@Body`.                                                                                        |
