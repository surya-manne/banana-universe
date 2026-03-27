# Phase 2 — Core Enterprise Features: Technical Specifications

Status: **Reviewed — Approved With Changes Applied**

## TLDR

Phase 2 adds 10 features to `@banana-universe/bananajs` v0.2.0: auth decorators (`@Auth`, `@Roles`, `@Public`) with pluggable `AuthGuard`; OpenAPI 3.0 auto-generation from decorator metadata served at `/api-docs`; typed config module (`BananaConfig`); rate-limit decorator backed by `express-rate-limit`; file upload decorator backed by `multer`; health check endpoint; `PaginatedResponse<T>` + `PaginationDto`; `BananaTestApp` enhancements; migration guide (Express → BananaJS); Express 5 compatibility doc. All new options are optional on `BananaAppOptions`. New external deps are peer-optional. `emitDecoratorMetadata` remains OFF — all type info is explicit.

---

## 1. Overview & Scope

**Goal:** Elevate BananaJS from a routing framework to an enterprise-ready API toolkit while preserving backward compatibility (`new BananaApp(Routes)` still works).

**In scope:** Items 2.1–2.8 + health check + pagination (moved from Phase 3).

**Out of scope:** Redis rate-limit store, WebSocket support, plugin system, CLI changes, database integrations.

**Affected package:** `packages/bananajs` only. `packages/bananajs-cli` and `apps/bananajs-demo` are unchanged (demo may be updated to showcase new features as a separate task).

---

## 2. Non-Functional Requirements

| NFR                        | Requirement                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Backward compat            | `BananaApp(controllers)` and `BananaApp(controllers, {})` remain valid                                                                   |
| Zero mandatory deps        | All new external packages (`express-rate-limit`, `multer`, `@scalar/express-api-reference`) are `peerDependencies` with `optional: true` |
| Tree-shake safe            | Features not configured produce no runtime overhead                                                                                      |
| Module compat              | `module: "nodenext"` — all internal imports use `.js` extensions                                                                         |
| Strict mode                | `strict: true`, `noImplicitReturns: true`, `noUnusedLocals: true`                                                                        |
| No `emitDecoratorMetadata` | All metadata is stored explicitly via `Reflect.defineMetadata`                                                                           |

---

## 3. Architecture & Component Design

### 3.1 MetadataKeys Extension

File: `src/lib/Router/MetaData.constants.ts`

```typescript
export enum MetadataKeys {
  BASE_PATH = 'base_path',
  ROUTERS = 'routers',
  // Phase 2
  AUTH = 'banana:auth',
  ROLES = 'banana:roles',
  PUBLIC = 'banana:public',
  RATE_LIMIT = 'banana:rate_limit',
  UPLOAD = 'banana:upload',
  API_TAGS = 'banana:api_tags',
  API_OPERATION = 'banana:api_operation',
  API_BODY = 'banana:api_body',
  API_RESPONSE = 'banana:api_response',
}
```

9 new keys (health is config-driven, not decorator-driven — no metadata key needed). Namespaced with `banana:` prefix to avoid collisions with third-party metadata.

### 3.2 BananaAppOptions Extension

File: `src/lib/Core/App.ts`

```typescript
export interface BananaAppOptions {
  // existing fields unchanged
  middlewares?: RequestHandler[]
  security?: { helmet?: boolean | Parameters<typeof helmet>[0]; cors?: CorsOptions | false }
  requestId?: boolean
  logger?: Logger | false
  container?: AwilixContainer
  gracefulShutdown?: boolean
  // Phase 2 additions
  auth?: { guard: AuthGuard }
  swagger?: {
    enabled: boolean
    path?: string // default: '/api-docs'
    title?: string // default: 'BananaJS API'
    version?: string // default: '1.0.0'
    description?: string
  }
  rateLimit?:
    | {
        windowMs?: number // default: 60_000
        max?: number // default: 100
        message?: string
      }
    | false // false disables rate limiting entirely (used by BananaTestApp)
  health?: {
    enabled: boolean
    path?: string // default: '/health'
    checks?: HealthCheck[]
  }
}
```

### 3.3 Constructor Wiring Order (App.ts)

```
express.json()
express.urlencoded()
helmet (if enabled)
cors (if enabled)
requestContextMiddleware (if enabled)
user middlewares[]
authMiddleware (if auth.guard provided)    ← NEW
rateLimitGlobal (if rateLimit provided)    ← NEW
initializeControllers(controllers)
healthEndpoint (if health.enabled)         ← NEW
swaggerEndpoint (if swagger.enabled)       ← NEW
errorMiddleware
```

Auth and rate-limit are applied as per-route middleware injected during `initializeControllers`, not as global middleware. The global `rateLimit` config sets defaults; per-route `@RateLimit` overrides.

---

## 4. Feature Specifications

### 4.1 Authentication & Authorization

#### Files

| Action | Path                                   |
| ------ | -------------------------------------- |
| Create | `src/lib/Auth/Auth.decorator.ts`       |
| Create | `src/lib/Auth/AuthGuard.interface.ts`  |
| Create | `src/lib/Auth/auth.middleware.ts`      |
| Modify | `src/lib/Router/MetaData.constants.ts` |
| Modify | `src/lib/Core/App.ts`                  |
| Modify | `src/index.ts`                         |

#### Interfaces

```typescript
// AuthGuard.interface.ts
import type { Request } from 'express'

export interface AuthGuard {
  canActivate(req: Request): boolean | Promise<boolean>
}

export interface RolesGuard {
  extractRoles(req: Request): string[] | Promise<string[]>
}
```

#### Decorators

```typescript
// Auth.decorator.ts

// @Auth() — class or method. Marks as requiring authentication.
// Sets MetadataKeys.AUTH = true on class or on (constructor, methodName).
// Implementation must discriminate call site using propertyKey presence:
//   if (propertyKey !== undefined) → method decorator path (use target.constructor)
//   else → class decorator path (use target directly)
export function Auth(): ClassDecorator & MethodDecorator

// @Roles(...roles) — method only. Requires listed roles.
// Sets MetadataKeys.ROLES = roles on (constructor, methodName).
export function Roles(...roles: string[]): MethodDecorator

// @Public() — method only. Opts out of class-level @Auth().
// Sets MetadataKeys.PUBLIC = true on (constructor, methodName).
export function Public(): MethodDecorator
```

#### Middleware

```typescript
// auth.middleware.ts
// createAuthMiddleware(guard: AuthGuard): RequestHandler
//
// For each route in initializeControllers:
//   1. Read AUTH metadata (class-level, then method-level)
//   2. If PUBLIC on method → skip
//   3. If AUTH → call guard.canActivate(req)
//      - false → throw UnauthorisedError
//   4. Read ROLES metadata on method
//      - If roles exist: duck-type check 'extractRoles' in guard
//        (RolesGuard is an interface — no runtime representation,
//         NEVER use instanceof which will always be false)
//        call (guard as RolesGuard).extractRoles(req), compare sets
//        missing → throw ForbiddenError
//   5. Store user payload via RequestContext.set('user', req['user'])
//
// guard.canActivate is responsible for attaching decoded user
// to req (e.g., req['user'] = decoded) before returning true.
```

#### Metadata Read Pattern (in initializeControllers)

```
const isAuthClass = Reflect.getMetadata(MetadataKeys.AUTH, controllerClass)
const isAuthMethod = Reflect.getMetadata(MetadataKeys.AUTH, controllerClass, handlerName)
const isPublic = Reflect.getMetadata(MetadataKeys.PUBLIC, controllerClass, handlerName)
const roles = Reflect.getMetadata(MetadataKeys.ROLES, controllerClass, handlerName)
```

If `(isAuthClass || isAuthMethod) && !isPublic && options.auth?.guard`, inject auth middleware before the route handler.

#### Error Behavior

- No guard provided + `@Auth` present → log warning, skip auth (framework does not crash)
- `canActivate` returns false → `UnauthorisedError` (401)
- Roles mismatch → `ForbiddenError` (403)
- `canActivate` throws → error propagates to ErrorMiddleware

#### Security Considerations

- JWT handling is user-injected; framework never touches tokens directly
- `AuthGuard` is an interface — no framework dependency on `jsonwebtoken`
- User must add `jsonwebtoken` to their own dependencies
- Auth decorator metadata is evaluated per-request (not cached)
- `@Public()` only works on methods, not classes (prevents accidental full controller exposure)

---

### 4.2 OpenAPI / Swagger Auto-Generation

#### Files

| Action | Path                                   |
| ------ | -------------------------------------- |
| Create | `src/lib/OpenAPI/ApiDoc.decorators.ts` |
| Create | `src/lib/OpenAPI/swagger.setup.ts`     |
| Create | `src/lib/OpenAPI/schema.extractor.ts`  |
| Modify | `src/lib/Router/MetaData.constants.ts` |
| Modify | `src/lib/Core/App.ts`                  |
| Modify | `src/index.ts`                         |

#### Decorators

```typescript
// ApiDoc.decorators.ts

interface ApiOperationOptions {
  summary?: string
  description?: string
  deprecated?: boolean
}

interface ApiBodyOptions {
  type: new (...args: unknown[]) => unknown
  description?: string
  required?: boolean // default: true
}

interface ApiResponseOptions {
  status: number
  description: string
  type?: new (...args: unknown[]) => unknown
}

// @ApiTags(...tags) — class decorator
// Sets MetadataKeys.API_TAGS = tags on class
export function ApiTags(...tags: string[]): ClassDecorator

// @ApiOperation(options) — method decorator
// Sets MetadataKeys.API_OPERATION = options on (constructor, methodName)
export function ApiOperation(options: ApiOperationOptions): MethodDecorator

// @ApiBody(options) — method decorator
// Sets MetadataKeys.API_BODY = options on (constructor, methodName)
export function ApiBody(options: ApiBodyOptions): MethodDecorator

// @ApiResponse(options) — method decorator (stackable)
// Appends to MetadataKeys.API_RESPONSE array on (constructor, methodName)
export function ApiResponse(options: ApiResponseOptions): MethodDecorator
```

#### Schema Extractor

```typescript
// schema.extractor.ts
// extractJsonSchema(DtoClass): JSONSchema7
//
// Since emitDecoratorMetadata is OFF, this reads class-validator
// decorator metadata from the DTO class prototype.
//
// Import strategy (IMPORTANT — nodenext ESM):
//   import { getMetadataStorage } from 'class-validator'
//   (Top-level named export. The internal CJS subpath
//    'class-validator/cjs/metadata/MetadataStorage' must NOT be used
//    as it is not in the package exports map and will throw
//    ERR_PACKAGE_PATH_NOT_EXPORTED under nodenext.)
//   If getMetadataStorage() throws/is unavailable → return {}
//   as empty schema and log a warning (graceful degradation).
//
// Strategy:
//   1. Call getMetadataStorage().getTargetValidationMetadatas(DtoClass, '', false, false)
//   2. Map validation decorators → JSON Schema properties:
//      @IsString → { type: 'string' }
//      @IsNumber/IsInt → { type: 'number'/'integer' }
//      @IsBoolean → { type: 'boolean' }
//      @IsEmail → { type: 'string', format: 'email' }
//      @IsOptional → removes from required[]
//      @Min(n) → { minimum: n }
//      @Max(n) → { maximum: n }
//      @MinLength(n) → { minLength: n }
//      @MaxLength(n) → { maxLength: n }
//      @IsEnum(E) → { enum: Object.values(E) }
//      @IsArray → { type: 'array' }
//   4. Return { type: 'object', properties: {...}, required: [...] }
//
// Fallback: properties not recognized → { type: 'string' }
```

#### Swagger Setup

```typescript
// swagger.setup.ts

interface SwaggerSetupOptions {
  path: string // e.g., '/api-docs'
  title: string
  version: string
  description?: string
}

// buildOpenApiSpec(routeTable: RouteInfo[], controllers: Constructor[], options): OpenAPIV3.Document
//   Iterates routeTable, reads API_TAGS, API_OPERATION, API_BODY, API_RESPONSE
//   metadata per controller+method. Combines with route path/method.
//   Produces OpenAPI 3.0.x spec object.

// setupSwagger(app: Application, spec: OpenAPIV3.Document, options, logger?): Promise<void>
//   1. app.get(`${path}.json`, (req, res) => res.json(spec))
//   2. try { const scalar = await import('@scalar/express-api-reference') → mount at path }
//   3. catch { try { const swaggerUi = await import('swagger-ui-express') → mount at path } }
//   4. catch both → logger?.warn('No OpenAPI UI package found, serving JSON only')
//   Note: MUST use dynamic import() NOT require() — module: "nodenext" outputs ESM
```

#### Dependency Strategy

- `@scalar/express-api-reference` and `swagger-ui-express` are `peerDependencies` with `optional: true`
- Framework tries `@scalar` first (modern, lighter), falls back to `swagger-ui-express`
- If neither is installed → JSON spec served, no UI; warning logged

#### Auth ↔ OpenAPI Integration

When `@Auth()` is on a class/method and `options.auth` is configured, the spec adds `security: [{ BearerAuth: [] }]` to the operation. Global `components.securitySchemes.BearerAuth` is added to the spec when `options.auth` is present.

---

### 4.3 Config Module

#### Files

| Action | Path                             |
| ------ | -------------------------------- |
| Create | `src/lib/Config/BananaConfig.ts` |
| Modify | `src/index.ts`                   |

#### Interface

```typescript
// BananaConfig.ts

interface ConfigFieldDef {
  env: string
  type?: 'string' | 'number' | 'boolean' // default: 'string'
  default?: string | number | boolean
  required?: boolean // default: false
  sensitive?: boolean // default: false (masks in logs)
}

type ConfigSchema = Record<string, ConfigFieldDef>

type ConfigResult<S extends ConfigSchema> = {
  [K in keyof S]: S[K]['type'] extends 'number'
    ? number
    : S[K]['type'] extends 'boolean'
    ? boolean
    : string
}

// BananaConfig<S>(schema: S): ConfigResult<S>
//
// 1. For each field in schema:
//    a. Read process.env[field.env]
//    b. If missing and field.required and no default → throw Error with clear message
//    c. If missing and has default → use default
//    d. Coerce to field.type (parseInt for number, 'true'/'1' for boolean)
//    e. If coercion fails → throw Error
// 2. Return frozen typed config object
// 3. Log loaded keys (mask sensitive values)
```

#### Design Decisions

- Standalone function, not coupled to `BananaApp` — can be used independently
- Synchronous — called at startup before `BananaApp` constructor
- Returns `Readonly<ConfigResult<S>>` — immutable after creation
- No `.env` file loading — consumers use `dotenv` themselves if needed

---

### 4.4 BananaTestApp Enhancements

#### Files

| Action | Path                           |
| ------ | ------------------------------ |
| Modify | `src/testing/BananaTestApp.ts` |

#### New API Surface

```typescript
export class BananaTestApp {
  // existing
  static create(controllers, options?): BananaTestApp
  get agent(): SuperTestAgent
  async inject(config): Promise<SupertestResponse>

  // new
  withAuth(token: string): BananaTestApp // sets persistent Authorization: Bearer <token>
  withHeaders(headers: Record<string, string>): BananaTestApp // sets persistent headers
  clearHeaders(): BananaTestApp // resets persistent headers
}
```

#### Default Options Change

```typescript
static create(controllers, options = {}) {
  const mergedOptions = {
    logger: false,
    gracefulShutdown: false,
    requestId: false,
    rateLimit: false,   // NEW — disable rate-limit in tests
    ...options,
    security: { helmet: false, cors: false, ...options.security },
  }
  // ...
}
```

#### Behavior

- `withAuth(token)` stores token; `inject()` adds `Authorization: Bearer ${token}` header
- `withHeaders(h)` stores headers; `inject()` merges them with per-request headers
- Immutable pattern: `withAuth()` and `withHeaders()` return `this` (fluent API)
- `rateLimit: false` in create defaults disables any global rate-limit config

---

### 4.5 Rate Limiting

#### Files

| Action | Path                                       |
| ------ | ------------------------------------------ |
| Create | `src/lib/RateLimit/RateLimit.decorator.ts` |
| Modify | `src/lib/Router/MetaData.constants.ts`     |
| Modify | `src/lib/Core/App.ts`                      |
| Modify | `src/index.ts`                             |

#### Interface

```typescript
// RateLimit.decorator.ts

interface RateLimitOptions {
  windowMs?: number // default: 60_000
  max?: number // default: 100
  message?: string // default: 'Too Many Requests'
}

// @RateLimit(options?) — class or method decorator
// Class: sets default for all methods in controller
// Method: overrides class-level settings
// Sets MetadataKeys.RATE_LIMIT = options on class or (constructor, methodName)
export function RateLimit(options?: RateLimitOptions): ClassDecorator & MethodDecorator
```

#### Integration with App.ts

During `initializeControllers`, for each route:

1. Read `RATE_LIMIT` metadata (method-level overrides class-level)
2. If options exist and `options.rateLimit !== false`:
   - `import('express-rate-limit')` dynamically
   - Create `rateLimit(mergedOptions)` middleware
   - Inject before route handler
3. If `express-rate-limit` not installed → log warning, skip

Global `BananaAppOptions.rateLimit` provides defaults. Per-route `@RateLimit()` overrides.
`BananaAppOptions.rateLimit` set to `false` → disables all rate limiting (for tests).

#### Dependency

`express-rate-limit` → `peerDependencies` with `optional: true`

---

### 4.6 Migration Guide

#### Files

| Action | Path                |
| ------ | ------------------- |
| Create | `docs/MIGRATION.md` |

#### Content Outline

1. **Introduction** — Why migrate, what BananaJS adds
2. **Incremental Adoption** — Mount `BananaRouter` in existing Express app
3. **Controller Migration** — Express route handler → `@Controller` + `@Get/@Post`
4. **Validation Migration** — `express-validator` → `@Body(DtoClass)` pattern
5. **Error Handling Migration** — Custom error handlers → `ApiError` subclasses
6. **Middleware Passthrough** — Using Express middleware in BananaJS
7. **Response Format Migration** — Raw `res.json()` → `SuccessResponse<T>`
8. **Testing Migration** — supertest direct → `BananaTestApp`

---

### 4.7 File Upload Formalization

#### Files

| Action | Path                                                        |
| ------ | ----------------------------------------------------------- |
| Create | `src/lib/Upload/Upload.decorator.ts`                        |
| Modify | `src/Middleware/FileUpload.middleware.ts` (fill empty stub) |
| Modify | `src/lib/Router/MetaData.constants.ts`                      |
| Modify | `src/lib/Core/App.ts`                                       |
| Modify | `src/index.ts`                                              |

#### Interface

```typescript
// Upload.decorator.ts

interface UploadOptions {
  maxSize?: number // bytes, default: 5 * 1024 * 1024 (5MB)
  allowedMimeTypes?: string[] // e.g., ['image/png', 'image/jpeg']
}

// @Upload(fieldName, options?) — method decorator
// Sets MetadataKeys.UPLOAD = { fieldName, ...options } on (constructor, methodName)
export function Upload(fieldName: string, options?: UploadOptions): MethodDecorator
```

```typescript
// FileUpload.middleware.ts

// createUploadMiddleware(fieldName: string, options?: UploadOptions): RequestHandler
//
// 1. import multer from 'multer' (dynamic)
// 2. const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: options.maxSize } })
// 3. Return wrapper: upload.single(fieldName) + MIME type validation
//    If MIME mismatch → throw BadRequestError
```

#### Integration with App.ts

During `initializeControllers`, for each route:

1. Read `UPLOAD` metadata on method
2. If present: `createUploadMiddleware(fieldName, options)` → inject before handler
3. If `multer` not installed and `@Upload` decorator is detected on any route → throw startup error with clear message. If no `@Upload` is used, multer absence is silent (consistent with optional peer pattern).

#### Dependency

`multer` → `peerDependencies` with `optional: true`
`@types/multer` → `devDependencies`

---

### 4.8 Express 5 Readiness

#### Files

| Action | Path               |
| ------ | ------------------ |
| Create | `docs/EXPRESS5.md` |

#### Content

- Document breaking changes in Express 5 affecting BananaJS:
  - `path-to-regexp` v8 changes (optional params, regex removal)
  - Removed `app.del()` (BananaJS uses `router.delete` — not affected)
  - `req.host` returns full host (not affected — BananaJS doesn't use it)
  - Promise-based error handling (BananaJS already wraps handlers in try/catch)
  - `res.redirect()` behavior change
- No source code changes expected; document any shims if testing reveals issues
- Compatibility test checklist

---

### 4.9 Health Check

#### Files

| Action | Path                                  |
| ------ | ------------------------------------- |
| Create | `src/lib/Health/health.middleware.ts` |
| Modify | `src/lib/Core/App.ts`                 |
| Modify | `src/index.ts`                        |

#### Interface

```typescript
// health.middleware.ts

type HealthStatus = 'ok' | 'degraded' | 'down'

interface HealthCheckResult {
  status: HealthStatus
  detail?: unknown
}

interface HealthCheck {
  name: string
  check(): Promise<HealthCheckResult>
}

interface HealthResponse {
  status: HealthStatus
  checks: Record<string, HealthCheckResult>
  timestamp: string
}

// createHealthEndpoint(checks: HealthCheck[]): RequestHandler
//
// 1. Run all checks in parallel via Promise.allSettled
// 2. Rejected promises → { status: 'down', detail: error.message }
// 3. Aggregate: if any 'down' → overall 'down'; if any 'degraded' → 'degraded'; else 'ok'
// 4. HTTP status: 'ok' → 200, 'degraded' → 200, 'down' → 503
// 5. Return HealthResponse JSON
```

#### Integration with App.ts

After `initializeControllers`, before error middleware:

```
if (options.health?.enabled) {
  const path = options.health.path ?? '/health'
  this.app.get(path, createHealthEndpoint(options.health.checks ?? []))
}
```

---

### 4.10 Pagination Utilities

#### Files

| Action | Path                               |
| ------ | ---------------------------------- |
| Create | `src/lib/Pagination/Pagination.ts` |
| Modify | `src/index.ts`                     |

#### Interface

```typescript
// Pagination.ts

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

class PaginatedResponse<T> extends SuccessResponse<T[]> {
  constructor(message: string, data: T[], public readonly meta: PaginationMeta) {
    super(message, data)
  }
}

class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number // default: 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number // default: 20
}
```

`PaginatedResponse.send()` overrides to include `meta` in JSON output.

---

## 5. Error Handling Strategy

No changes to `createErrorMiddleware` or `ApiError` hierarchy. Existing error classes cover all Phase 2 needs:

| Scenario               | Error Class                 | HTTP |
| ---------------------- | --------------------------- | ---- |
| Auth guard fails       | `UnauthorisedError`         | 401  |
| Role mismatch          | `ForbiddenError`            | 403  |
| Rate limit exceeded    | `TooManyRequestsError`      | 429  |
| Invalid upload MIME    | `BadRequestError`           | 400  |
| Config validation fail | `Error` (startup, not HTTP) | N/A  |

---

## 6. Testing Strategy

| Feature         | Test Type          | Key Cases                                                                                                    |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Auth decorators | Unit               | `@Auth` on class, method, `@Public` opt-out, `@Roles` check, guard failure → 401, role fail → 403            |
| OpenAPI         | Unit + Integration | Spec generation from decorated controllers, DTO → JSON Schema extraction, `/api-docs.json` serves valid spec |
| Config          | Unit               | Required missing → throws, type coercion, defaults, sensitive masking                                        |
| Rate limit      | Integration        | Requests within limit pass, exceed → 429, disabled in test mode                                              |
| Upload          | Integration        | Valid file passes, size exceeded → 400, MIME mismatch → 400                                                  |
| Health          | Integration        | All OK → 200 + `ok`, one down → 503 + `down`, degraded → 200 + `degraded`                                    |
| Pagination      | Unit               | `PaginatedResponse` JSON shape, `PaginationDto` validation                                                   |
| BananaTestApp   | Unit               | `withAuth()` attaches header, `withHeaders()` persists, `rateLimit: false` default                           |

---

## 7. Dependencies

### New peerDependencies (all optional)

| Package                         | Purpose                | peerDependenciesMeta |
| ------------------------------- | ---------------------- | -------------------- |
| `express-rate-limit`            | Rate limiting          | `{ optional: true }` |
| `multer`                        | File uploads           | `{ optional: true }` |
| `@scalar/express-api-reference` | OpenAPI UI (preferred) | `{ optional: true }` |
| `swagger-ui-express`            | OpenAPI UI (fallback)  | `{ optional: true }` |

### New devDependencies

| Package                     | Purpose          |
| --------------------------- | ---------------- |
| `@types/multer`             | Multer types     |
| `@types/swagger-ui-express` | Swagger UI types |

### NOT added to framework deps

- `jsonwebtoken` — user brings their own; `AuthGuard` is framework-agnostic
- `dotenv` — user's choice for env loading

---

## 8. Assumptions

1. `class-validator` `getMetadataStorage()` API is stable for reading validation metadata in schema extractor
2. `@scalar/express-api-reference` supports Express 4 middleware pattern
3. `express-rate-limit` v7+ API with in-memory store default
4. `multer` v1.4+ `memoryStorage()` API
5. Users handle JWT token creation/refresh; framework only verifies via `AuthGuard`

---

## 9. Tech Summary — Files Affected

### New Files (13)

| #   | Path                                       | Feature                 |
| --- | ------------------------------------------ | ----------------------- |
| 1   | `src/lib/Auth/Auth.decorator.ts`           | Auth decorators         |
| 2   | `src/lib/Auth/AuthGuard.interface.ts`      | Guard interfaces        |
| 3   | `src/lib/Auth/auth.middleware.ts`          | Auth middleware factory |
| 4   | `src/lib/OpenAPI/ApiDoc.decorators.ts`     | API doc decorators      |
| 5   | `src/lib/OpenAPI/swagger.setup.ts`         | Swagger/Scalar setup    |
| 6   | `src/lib/OpenAPI/schema.extractor.ts`      | DTO → JSON Schema       |
| 7   | `src/lib/Config/BananaConfig.ts`           | Config module           |
| 8   | `src/lib/RateLimit/RateLimit.decorator.ts` | Rate limit decorator    |
| 9   | `src/lib/Upload/Upload.decorator.ts`       | Upload decorator        |
| 10  | `src/lib/Health/health.middleware.ts`      | Health endpoint         |
| 11  | `src/lib/Pagination/Pagination.ts`         | Pagination utilities    |
| 12  | `docs/MIGRATION.md`                        | Migration guide         |
| 13  | `docs/EXPRESS5.md`                         | Express 5 compat doc    |

### Modified Files (6)

| #   | Path                                      | Changes                                                        |
| --- | ----------------------------------------- | -------------------------------------------------------------- |
| 1   | `src/lib/Router/MetaData.constants.ts`    | Add 9 new MetadataKeys                                         |
| 2   | `src/lib/Core/App.ts`                     | Extend `BananaAppOptions`, wire auth/rate-limit/health/swagger |
| 3   | `src/Middleware/FileUpload.middleware.ts` | Fill empty stub with multer factory                            |
| 4   | `src/index.ts`                            | Export all new public APIs                                     |
| 5   | `src/testing/BananaTestApp.ts`            | Add `withAuth`, `withHeaders`, `rateLimit: false` default      |
| 6   | `packages/bananajs/package.json`          | Add peerDependencies + devDependencies                         |

### Documentation Files (2)

| #   | Path                | Content                            |
| --- | ------------------- | ---------------------------------- |
| 1   | `docs/MIGRATION.md` | Express → BananaJS migration guide |
| 2   | `docs/EXPRESS5.md`  | Express 5 compatibility notes      |
