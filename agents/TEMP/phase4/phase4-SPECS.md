# Phase 4 — Enterprise & AI-First: Technical Specifications

Status: **Draft**

Companion plan: `agents/TEMP/phase4/phase4-PLAN.md`

---

## TLDR

Phase 4 introduces AI-powered CLI commands, advanced security decorators, multi-tenancy support, performance benchmarking infrastructure, a WebSocket plugin, and a Fastify adapter stub. All features are additive; backward compatibility preserved. Target version: bananajs v0.4.0, bananajs-cli v0.2.0, plugin-websocket v0.1.0, adapter-fastify v0.0.1. Estimated: ~45 new/modified files across 3 new packages + existing packages, 6 parallel implementation streams.

---

## 1. Scope

### In Scope

| ID  | Feature                     | Location                                        |
| --- | --------------------------- | ----------------------------------------------- |
| 4.1 | AI-First CLI Commands       | `packages/bananajs-cli/`                        |
| 4.2 | Advanced Security Hardening | `packages/bananajs/`                            |
| 4.3 | Multi-Tenancy Support       | `packages/bananajs/`                            |
| 4.4 | Performance & Benchmarks    | `apps/benchmarks/` (new) + `packages/bananajs/` |
| 4.5 | WebSocket Plugin            | `packages/plugin-websocket/` (new)              |
| 4.6 | Fastify Adapter Stub        | `packages/adapter-fastify/` (new)               |
| 4.7 | TC39 Migration Doc Update   | `docs/TC39-DECORATORS.md`                       |

### Out of Scope

- Full Fastify integration (4.6 exploration only — interface + stub)
- TC39 decorator migration execution (doc update only)
- Redis cache plugin (CacheStore interface already exists)
- Per-tenant DB connection pooling implementation (documented patterns only in `docs/MULTI-TENANCY.md`)
- Test suite (not planned per Architecture doc)

---

## 2. Feature Specifications

### 4.1 AI-First CLI Commands

**New file:** `packages/bananajs-cli/src/lib/ai.ts`

**Commands added to `packages/bananajs-cli/src/index.ts`:**

```typescript
// bananajs ai generate --from-schema <file>
// bananajs ai generate --from-prompt "<text>"
// bananajs ai doc [file]
// bananajs ai review [file]
```

**Dependencies:**

- `ai` (Vercel AI SDK) — optional peer dep + devDependency
- `@ai-sdk/openai` — optional peer dep + devDependency (provider for Vercel AI)
- `zod` — already available or add as dep (for schema parsing)
- `openapi-typescript` — already in CLI as devDep (for schema-based generation)

**Interface Definitions:**

```typescript
// packages/bananajs-cli/src/lib/ai.ts

export interface AiGenerateOptions {
  fromSchema?: string // path to JSON Schema or OpenAPI spec file
  fromPrompt?: string // natural language description
  out?: string // output directory (default: ./src)
  dryRun?: boolean
}

export interface AiDocOptions {
  file?: string // specific controller file; if omitted scans src/
  dryRun?: boolean
}

export interface AiReviewOptions {
  file?: string // specific controller file
}

// Main exported functions
export async function aiGenerate(opts: AiGenerateOptions): Promise<void>
export async function aiDoc(opts: AiDocOptions): Promise<void>
export async function aiReview(opts: AiReviewOptions): Promise<void>
```

**`aiGenerate` — schema-based (no LLM required):**

1. Read JSON Schema or OpenAPI spec from `--from-schema` file
2. Parse spec: extract entity name, fields, types
3. Generate `<Entity>.controller.ts`, `<Entity>.dto.ts`, `<Entity>.service.ts` from templates
4. Templates are embedded in the CLI (no network)
5. If `--dry-run`, print files; otherwise write to `--out` directory

**`aiGenerate` — prompt-based (LLM required):**

1. Check `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` env var; error if missing
2. Use Vercel `ai` SDK with `generateText()` to call LLM
3. System prompt: "You are a BananaJS expert. Generate TypeScript code for BananaJS v0.4.0..."
4. User prompt: the provided description
5. Parse LLM response: extract code blocks for controller, DTO, service
6. Write files or print with `--dry-run`

**`aiDoc`:**

1. Read controller file(s) via AST scan (using `@typescript-eslint/typescript-estree` or regex fallback)
2. Call LLM with controller source + system prompt: "Add JSDoc to BananaJS controller methods..."
3. Output updated file with JSDoc additions (or dry-run print)

**`aiReview`:**

1. Read controller file
2. Call LLM: "Review this BananaJS controller for best practices, security issues, and improvements"
3. Print formatted recommendations to console (no file modification)

**Error handling:**

- If `ai` package not installed: print install instructions and exit
- If API key missing for prompt-based: print clear error
- Schema parse errors: descriptive messages

**Acceptance Criteria:**

- `bananajs ai generate --from-schema schema.json` generates controller+DTO+service files without LLM
- `bananajs ai generate --from-prompt "CRUD for posts"` calls LLM and outputs files (requires API key)
- `bananajs ai doc --dry-run` prints JSDoc additions without writing
- `bananajs ai review` prints review output
- All commands support `--help`
- Missing `ai` package: graceful error with install instructions

---

### 4.2 Advanced Security Hardening

#### 4.2a `@Sanitize` Decorator

**New file:** `packages/bananajs/src/lib/Security/Sanitize.decorator.ts`

```typescript
export interface SanitizeOptions {
  allowedTags?: string[] // default: [] (strip all HTML)
  allowedAttributes?: Record<string, string[]>
}

// Method decorator — processes req.body string fields before handler
export function Sanitize(options?: SanitizeOptions): MethodDecorator
```

**Implementation:**

- Replaces handler in `descriptor.value` with a wrapper
- On request: iterate `req.body` fields; for each `string` value, call `sanitize-html(value, options)`
- `sanitize-html` is an optional peer dep (lazy-loaded with `import()`)
- If `sanitize-html` not installed: log warning and pass through
- Applied BEFORE validation decorators (earliest wrapper) — note: decorators execute bottom-up, so `@Sanitize` must be placed ABOVE `@Body`

**MetadataKey:** `SANITIZE` — wraps descriptor.value AND stores options on method for introspection

**Dependencies:**

- `sanitize-html` — optional peerDependency + devDependency

**AC:**

- `@Sanitize()` strips HTML tags from all string fields in `req.body`
- `@Sanitize({ allowedTags: ['b', 'i'] })` preserves allowed tags
- Missing `sanitize-html`: warning logged, body passed through unmodified

#### 4.2b `@Can` ABAC Decorator

**New file:** `packages/bananajs/src/lib/Security/Can.decorator.ts`
**New file:** `packages/bananajs/src/lib/Security/AbacGuard.interface.ts`

```typescript
// AbacGuard.interface.ts
export interface AbacGuard {
  can(action: string, resource: string, req: Request): boolean | Promise<boolean>
}

// Can.decorator.ts
// Method decorator
export function Can(action: string, resource: string): MethodDecorator
// Stores { action, resource } under MetadataKeys.CAN on method
```

**MetadataKey:** `CAN = 'banana:can'`

**Integration in `App.ts`:**

- `BananaAppOptions.abac?: { guard: AbacGuard }` (new optional field)
- In `initializeControllers`: after auth middleware, check `MetadataKeys.CAN` on method; if present, create middleware calling `abacGuard.can(action, resource, req)`
- If `can()` returns false: throw `ForbiddenError` (403)

**AC:**

- `@Can('read', 'reports')` on a method + `BananaApp({ abac: { guard } })` → 403 if guard returns false
- Works alongside `@Auth()` (ABAC runs after auth)

#### 4.2c `@Throttle` Decorator

**New file:** `packages/bananajs/src/lib/Security/Throttle.decorator.ts`

```typescript
export interface ThrottleOptions {
  windowMs: number
  max: number
  keyBy?: 'userId' | 'ip' // default: 'ip'
  message?: string
}

export function Throttle(options: ThrottleOptions): MethodDecorator | ClassDecorator
```

**MetadataKey:** `THROTTLE = 'banana:throttle'`

**Implementation:**

- Uses `express-rate-limit` (already optional peer from Phase 2)
- Key generation: if `keyBy === 'userId'`, extract from `RequestContext.get().userId` or JWT `sub` claim; fallback to IP
- For user-based key: `keyGenerator: (req) => getUserId(req) ?? req.ip`
- Wired in `initializeControllers` like existing `@RateLimit` but uses throttle config

**AC:**

- `@Throttle({ windowMs: 60000, max: 5, keyBy: 'userId' })` rate-limits per user ID extracted from context
- Falls back to IP if no user ID available

#### 4.2d Secrets Rotation Hook in `BananaConfig`

**Modify:** `packages/bananajs/src/lib/Config/BananaConfig.ts`

```typescript
export interface ConfigSchema {
  [key: string]: {
    env: string
    default?: unknown
    type?: 'string' | 'number' | 'boolean'
    required?: boolean
    sensitive?: boolean
  }
}

export interface BananaConfigInstance<T> {
  get(): Readonly<T>
  reload(): void // re-reads process.env and re-validates
  onSecretRotated(handler: (key: string, newValue: unknown) => void): void
  offSecretRotated(handler: (key: string, newValue: unknown) => void): void
}
```

**Implementation:**

- `BananaConfig()` returns a `BananaConfigInstance` (not a plain object as before — check existing impl)
- `reload()`: re-reads `process.env`, re-validates, emits `onSecretRotated` for changed sensitive fields
- Internal: store handlers in `Set`; `onSecretRotated` adds, `offSecretRotated` removes
- NOTE: check existing BananaConfig.ts signature before modifying — maintain backward compat

**AC:**

- `config.onSecretRotated((key, val) => refresh(key, val))` registers handler
- `config.reload()` re-reads env and calls handlers for changed sensitive fields

---

### 4.3 Multi-Tenancy Support

**New files:**

- `packages/bananajs/src/lib/Tenant/Tenant.decorator.ts`
- `packages/bananajs/src/lib/Tenant/TenantContext.ts`
- `docs/MULTI-TENANCY.md`

#### `@Tenant` Decorator

```typescript
// Tenant.decorator.ts
export interface TenantOptions {
  header?: string // default: 'x-tenant-id'
  jwtClaim?: string // default: 'tid'
}

// Class or method decorator
export function Tenant(options?: TenantOptions): ClassDecorator & MethodDecorator
```

**MetadataKey:** `TENANT = 'banana:tenant'`

**`TenantContext.ts`:**

```typescript
import { AsyncLocalStorage } from 'async_hooks'

interface TenantStore {
  tenantId?: string
}

const tenantStorage = new AsyncLocalStorage<TenantStore>()

export function getTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return tenantStorage.run({ tenantId }, fn)
}

// Express middleware factory
export function createTenantMiddleware(options: TenantOptions): RequestHandler
```

**Integration in `App.ts`:**

- In `initializeControllers`: check `MetadataKeys.TENANT` on class or method
- If found: prepend `createTenantMiddleware(options)` to route middlewares
- `createTenantMiddleware`: extracts `tenantId` from JWT `tid` claim (decode without verify — verify is auth's job) or from `x-tenant-id` header, wraps request in `tenantStorage.run()`

**Cache integration:**

- In `deriveCacheKey` in `App.ts`: if `getTenantId()` is defined, prefix key with `tenant:{tenantId}:`
- This is automatic — no decorator changes needed

**AC:**

- `@Tenant()` on controller class → all routes extract tenantId and make it available via `getTenantId()`
- `getTenantId()` returns undefined if not in tenant context
- Cache keys are automatically namespaced per tenant when `@Tenant` is active

---

### 4.4 Performance & Benchmarking Infrastructure

#### Benchmarks App

**New package:** `apps/benchmarks/`

**Files:**

- `apps/benchmarks/package.json`
- `apps/benchmarks/src/benchmark.ts` — main benchmark runner
- `apps/benchmarks/src/scenarios/health.ts`
- `apps/benchmarks/src/scenarios/basic-route.ts`
- `apps/benchmarks/src/scenarios/auth-route.ts`
- `apps/benchmarks/src/scenarios/cached-route.ts`
- `apps/benchmarks/src/report.ts` — parse results, compare to baseline, output report
- `apps/benchmarks/baseline.json` — baseline p99 values (committed)
- `.github/workflows/benchmarks.yml`

**Dependencies:**

- `autocannon` — load testing (devDependency)
- `@types/autocannon` — devDependency

**Benchmark runner (`benchmark.ts`):**

```typescript
interface BenchmarkResult {
  scenario: string
  p99: number // ms
  p95: number
  mean: number
  requests: number
}

async function runBenchmark(
  scenario: string,
  url: string,
  opts?: AutocannonOptions,
): Promise<BenchmarkResult>
async function main(): Promise<void> // runs all scenarios, writes results.json
```

**Report (`report.ts`):**

- Reads `results.json` and `baseline.json`
- Fails (exit code 1) if any p99 regressed by >10%
- Prints formatted table

**GitHub Actions workflow:**

```yaml
# .github/workflows/benchmarks.yml
# Trigger: PR to main, manual dispatch
# Steps: install, build, start server, run benchmarks, compare to baseline
# Fail if p99 regression > 10%
```

#### Lazy Controller Loading

**Modify:** `packages/bananajs/src/lib/Core/App.ts`

- New option: `BananaAppOptions.lazyControllers?: boolean` (default: false — backward compat)
- When `lazyControllers: true`: `initializeControllers` wraps each route handler in a lazy resolver
  - Track `Map<string, boolean>` keyed by basePath — `false` = not yet instantiated
  - On first request to a basePath, resolve controller instance and store it
  - All subsequent requests use cached instance
- Note: This only defers `resolveController()` (instantiation), not metadata reading (metadata read at startup always)

#### Route Tree Caching

**Modify:** `packages/bananajs/src/lib/Core/App.ts`

- New private field: `private readonly routeMetadata: Map<string, RouteMetadata>`
- At startup (`initializeControllers`): read all `Reflect.getMetadata` calls once and store in map
- Route handler uses map lookup instead of per-request `Reflect.getMetadata`
- This is a pure internal optimization — no public API change
- Only cache: auth, rateLimitConfig, cacheConfig, cacheEvictConfig, uploadConfig, tenantConfig

**AC:**

- `autocannon` benchmark runs against 4 scenarios
- Report compares to baseline.json
- `lazyControllers: true` defers controller instantiation
- Route metadata read only once at startup (not per-request)

---

### 4.5 WebSocket Plugin — `@banana-universe/plugin-websocket`

**New package:** `packages/plugin-websocket/`

**Files:**

- `packages/plugin-websocket/package.json`
- `packages/plugin-websocket/tsconfig.lib.json`
- `packages/plugin-websocket/src/index.ts` (public API)
- `packages/plugin-websocket/src/WebSocketPlugin.ts`
- `packages/plugin-websocket/src/WsDecorators.ts`
- `packages/plugin-websocket/src/WsRouter.ts`
- `packages/plugin-websocket/src/WsMetadata.ts`

**Dependencies:**

- `ws` — optional peerDependency + devDependency
- `@types/ws` — devDependency
- `@banana-universe/bananajs: ">=0.4.0"` — peerDependency

**`WsMetadata.ts`:**

```typescript
export const WsMetadataKeys = {
  WS_NAMESPACE: 'banana:ws:namespace',
  WS_CONNECT: 'banana:ws:connect',
  WS_DISCONNECT: 'banana:ws:disconnect',
  WS_MESSAGE: 'banana:ws:message',
  WS_BODY: 'banana:ws:body',
}
```

**`WsDecorators.ts`:**

```typescript
export function WsController(namespace?: string): ClassDecorator
// Stores namespace under WS_NAMESPACE

export function OnConnect(): MethodDecorator
// Stores true under WS_CONNECT on method

export function OnDisconnect(): MethodDecorator
// Stores true under WS_DISCONNECT on method

export function OnMessage(event: string): MethodDecorator
// Stores event string under WS_MESSAGE on method

// Parameter decorator (explicit paramIndex)
export function WsBody(DtoClass?: Constructor): ParameterDecorator
// Stores { paramIndex, DtoClass } under WS_BODY on method
```

**`WebSocketPlugin.ts`:**

```typescript
import type { BananaPlugin, AppContext } from '@banana-universe/bananajs'
import type { Server as WsServer } from 'ws'

export interface WebSocketPluginOptions {
  path?: string // default: '/ws'
  controllers: Constructor[]
}

export class WebSocketPlugin implements BananaPlugin {
  readonly name = 'plugin-websocket'
  private wsServer?: WsServer

  constructor(private readonly options: WebSocketPluginOptions) {}

  async register(ctx: AppContext): Promise<void>
  // Lazy-loads 'ws', creates WebSocketServer({ noServer: true })
  // Registers upgrade handler on ctx.app (stores it for later)
  // Scans options.controllers for @WsController, wires handlers

  async onShutdown(): Promise<void>
  // Closes WsServer

  // Call after app.listen() — users must call this to wire WebSocket upgrades
  attachToServer(httpServer: import('http').Server): void
  // Wires httpServer 'upgrade' event to wsServer.handleUpgrade()
}
```

**`WsRouter.ts`:**

```typescript
// Scans @WsController classes for @OnConnect, @OnDisconnect, @OnMessage handlers
// Wires ws 'connection' event, parses messages as { event, data } JSON
// Routes messages to matching @OnMessage handlers
// Instantiates controllers (using DI container from AppContext if available)
export function createWsRouter(controllers: Constructor[], container?: AwilixContainer): WsRouter
```

**Message protocol:**

```json
// Client → Server
{ "event": "chat", "data": { ... } }
// Server → Client (convention, not enforced by plugin)
{ "event": "response", "data": { ... } }
```

**AC:**

- `WebSocketPlugin({ controllers: [ChatController] })` wires WebSocket server
- `@WsController('/chat')` + `@OnMessage('message')` routes received messages
- `@OnConnect()` / `@OnDisconnect()` fire on connection events
- `BananaApp.create([], { plugins: [new WebSocketPlugin({ controllers: [ChatController] })] })` works
- Gracefully handles missing `ws` package (error with install instructions)

---

### 4.6 Fastify Adapter Stub — `@banana-universe/adapter-fastify`

**New package:** `packages/adapter-fastify/`

**New abstract interface in `packages/bananajs`:**

- `packages/bananajs/src/lib/Adapter/FrameworkAdapter.ts`

```typescript
// FrameworkAdapter.ts — abstract adapter interface for framework independence
export interface RouteDefinition {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  handlers: RequestHandler[]
}

export interface FrameworkAdapter {
  addRoute(route: RouteDefinition): void
  use(middleware: RequestHandler): void
  listen(port: number, callback?: () => void): void
  getInstance(): unknown
}
```

**Files:**

- `packages/adapter-fastify/package.json`
- `packages/adapter-fastify/tsconfig.lib.json`
- `packages/adapter-fastify/src/index.ts`
- `packages/adapter-fastify/src/FastifyAdapter.ts`
- `packages/adapter-fastify/README.md`

**`FastifyAdapter.ts` (stub):**

```typescript
import type { FrameworkAdapter, RouteDefinition } from '@banana-universe/bananajs'
import type { RequestHandler } from 'express'

export class FastifyAdapter implements FrameworkAdapter {
  addRoute(_route: RouteDefinition): void {
    throw new Error('FastifyAdapter: Not yet implemented. This is an exploration stub.')
  }
  use(_middleware: RequestHandler): void {
    throw new Error('FastifyAdapter: Not yet implemented.')
  }
  listen(_port: number, _callback?: () => void): void {
    throw new Error('FastifyAdapter: Not yet implemented.')
  }
  getInstance(): unknown {
    return undefined
  }
}
```

**AC:**

- Package exists and compiles
- `FrameworkAdapter` interface exported from `packages/bananajs`
- README documents exploration status and future roadmap

---

### 4.7 TC39 Decorator Migration — Doc Update Only

**Modify:** `docs/TC39-DECORATORS.md`

- Add execution timeline section: v2.0.0 milestone, expected Q3 2026
- Note current blocker: `@WsBody` parameter decorator (TC39 stage 3 has no parameter decorators)
- Add migration execution checklist (for future reference)

---

## 3. `BananaAppOptions` Additions (Phase 4)

```typescript
// Add to existing BananaAppOptions in App.ts:
// Phase 4 additions
abac?: {
  guard: AbacGuard
}
tenant?: {
  header?: string    // default: 'x-tenant-id'
  jwtClaim?: string  // default: 'tid'
}
lazyControllers?: boolean  // default: false
```

---

## 4. `MetadataKeys` Additions

```typescript
// Add to packages/bananajs/src/lib/Router/MetaData.constants.ts
CAN = 'banana:can'
THROTTLE = 'banana:throttle'
TENANT = 'banana:tenant'
SANITIZE = 'banana:sanitize'
```

---

## 5. `index.ts` Export Additions

```typescript
// packages/bananajs/src/index.ts — new exports
export * from './lib/Security/Sanitize.decorator'
export * from './lib/Security/Can.decorator'
export * from './lib/Security/AbacGuard.interface'
export * from './lib/Security/Throttle.decorator'
export * from './lib/Tenant/Tenant.decorator'
export * from './lib/Tenant/TenantContext'
export * from './lib/Adapter/FrameworkAdapter'
```

---

## 6. Version Bumps

| Package                             | Current | Phase 4      |
| ----------------------------------- | ------- | ------------ |
| `@banana-universe/bananajs`         | v0.3.0  | v0.4.0       |
| `@banana-universe/bananajs-cli`     | v0.1.0  | v0.2.0       |
| `@banana-universe/plugin-websocket` | —       | v0.1.0 (new) |
| `@banana-universe/adapter-fastify`  | —       | v0.0.1 (new) |

---

## 7. New Dependencies Summary

| Package                | Target           | Type                | Required?             |
| ---------------------- | ---------------- | ------------------- | --------------------- |
| `ai`                   | bananajs-cli     | optional peer + dev | No (AI commands only) |
| `@ai-sdk/openai`       | bananajs-cli     | optional peer + dev | No                    |
| `sanitize-html`        | bananajs         | optional peer + dev | No                    |
| `@types/sanitize-html` | bananajs         | dev                 | No                    |
| `ws`                   | plugin-websocket | optional peer + dev | No                    |
| `@types/ws`            | plugin-websocket | dev                 | No                    |
| `autocannon`           | apps/benchmarks  | dev                 | No                    |
| `@types/autocannon`    | apps/benchmarks  | dev                 | No                    |
