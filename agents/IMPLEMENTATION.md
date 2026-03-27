# Implementation

Current implementation state. Very brief — references other docs. The only change log.

## Status: Active Development

## Modules

### packages/bananajs v0.2.0 [Phase 2 Complete]

**Framework core (pre-existing):**

- `BananaApp` — Express wrapper, single init point
- Route decorators: `@Controller`, `@Get/@Post/@Put/@Patch/@Delete`
- Validation decorators: `@Body/@Params/@Query` via class-transformer + class-validator
- Response hierarchy: `SuccessResponse<T>`, `ApiError` subclasses, `ApiResponse` base
- Error middleware: `ErrorMiddleware` (4-arg Express handler)

**Phase 2 additions:**

- **Auth decorators**: `@Auth()` (class/method), `@Roles(...roles)` (method), `@Public()` (method) + `AuthGuard`/`RolesGuard` interfaces — pluggable auth strategy, no JWT dep in framework
- **OpenAPI/Swagger**: `@ApiTags`, `@ApiOperation`, `@ApiBody`, `@ApiResponseDoc` decorators + auto-generated OpenAPI 3.0 spec at `/api-docs.json`; `@scalar/express-api-reference` (preferred) → `swagger-ui-express` (fallback) UI
- **Config module**: `BananaConfig(schema)` — typed, frozen env-var validation; standalone, no BananaApp coupling
- **BananaTestApp enhancements**: `.withAuth(token)`, `.withHeaders(headers)`, `.clearHeaders()` fluent API; `rateLimit: false` default
- **Rate limiting**: `@RateLimit({ windowMs, max })` class/method decorator backed by `express-rate-limit` (lazy-loaded optional peer)
- **File upload**: `@Upload('fieldName', options?)` method decorator backed by multer (memory storage, lazy-loaded optional peer); `FileUpload.middleware.ts` filled
- **Health check**: `BananaAppOptions.health: { enabled, path, checks }` → `GET /health` returning `{ status, checks, timestamp }`; HTTP 503 on down
- **Pagination utilities**: `PaginatedResponse<T>` extends `SuccessResponse` with `meta: { page, limit, total, totalPages }`; `PaginationDto`
- **Migration guide**: `docs/MIGRATION.md` — Express → BananaJS step-by-step with `BananaRouter` incremental adoption
- **Express 5 readiness**: `docs/EXPRESS5.md` — compatibility assessment

**Phase 1 additions:**

- `BananaAppOptions` — typed options object (security, logger, container, gracefulShutdown, requestId)
- `BananaApp.create()` — static async factory (sync constructor retained for backward compat)
- `BananaApp.getRouteTable()` — returns `RouteInfo[]` for debug/introspection
- `BananaRouter(controllers, container?)` — Express Router export for incremental adoption
- `@Headers(DtoClass)` — request header validation decorator (closes README gap)
- **Security baseline**: `helmet` + `cors` + `X-Request-ID` applied by default (opt-out via options)
- **Structured logging**: `Logger` interface + `PinoLogger` default; `ErrorMiddleware` uses injected logger
- **Request context**: `RequestContext` (AsyncLocalStorage) with `requestId` correlation; `requestContextMiddleware`
- **DI container**: opt-in `awilix` integration (`@Injectable()` decorator); backward-compatible
- **Graceful shutdown**: SIGTERM/SIGINT handlers with logger notification
- **Testing utilities**: `BananaTestApp.create()` (supertest wrapper) via `@banana-universe/bananajs/testing`
- **Bug fixes**: Validator double-response crash fixed, duplicate `reflect-metadata` import removed

### packages/bananajs-cli v0.1.0 [Phase 1 Complete]

**CLI overhaul (Phase 1):**

- Migrated from manual `process.argv` routing to **Commander.js**
- `bananajs new [appName]` — scaffold new app (prompts if name not provided)
- `bananajs generate <type> <name>` (alias: `g`) — generate controller/dto/middleware locally
  - `--dry-run` — print files without writing
- **Bug fixes**: `fs.rm` now awaited, deprecated `fs.rmdir` replaced, dead stub removed

### apps/bananajs-demo [COMPLETE - REFERENCE ONLY]

- Full working demo using `UserController` with all CRUD endpoints
- Demonstrates `@Controller`, `@Get/@Post/@Put/@Delete`, `@Body/@Params/@Query`, `SuccessResponse`

## Key Implemented Features

- Decorator-based routing (Controller + HTTP method decorators)
- Request validation via `@Body`, `@Params`, `@Query`, `@Headers` + class-validator DTOs
- Standardized API responses (`SuccessResponse<T>`)
- Typed error classes (11 error types)
- Global error middleware (`createErrorMiddleware(logger?)`)
- Optional per-app and per-route middleware support
- Security headers (helmet), CORS, X-Request-ID (Phase 1)
- Structured pino logging with injectable Logger interface (Phase 1)
- AsyncLocalStorage request context with correlation ID (Phase 1)
- Opt-in awilix DI container for controller resolution (Phase 1)
- Graceful shutdown (SIGTERM/SIGINT) (Phase 1)
- BananaTestApp testing utilities via `/testing` subpath export (Phase 1)
- Commander-based CLI with scaffold + generate commands (Phase 1)
- Auth decorators `@Auth`/`@Roles`/`@Public` with pluggable `AuthGuard` interface (Phase 2)
- OpenAPI 3.0 auto-generation from decorators; `/api-docs.json` + UI endpoint (Phase 2)
- `BananaConfig(schema)` typed env validation module (Phase 2)
- `@RateLimit` decorator backed by express-rate-limit (Phase 2)
- `@Upload` decorator backed by multer memory storage (Phase 2)
- Health check endpoint `GET /health` with pluggable checks (Phase 2)
- `PaginatedResponse<T>` + `PaginationDto` pagination utilities (Phase 2)
- `BananaTestApp.withAuth()/.withHeaders()/.clearHeaders()` fluent API (Phase 2)

## Phase Status

| Phase                           | Status      | Version |
| ------------------------------- | ----------- | ------- |
| Phase 1 — Foundation            | ✅ Complete | v0.1.0  |
| Phase 2 — Core Enterprise       | ✅ Complete | v0.2.0  |
| Phase 3 — Advanced Architecture | ⏳ Pending  | —       |
| Phase 4 — Enterprise & AI-First | ⏳ Pending  | —       |

## Next Session Starting Point

**Start Phase 3** per `plans/EnterpriseRoadmapV2.md` (Phase 3 — Advanced Architecture, months 9–15).

Phase 3 tasks:

- 3.1 Plugin architecture (`BananaPlugin` interface with `AppContext` abstraction, lifecycle hooks)
- 3.2 ORM integration patterns (`@banana-universe/plugin-typeorm`, `@banana-universe/plugin-prisma`)
- 3.3 Caching layer (`@Cache`/`@CacheEvict`, in-memory + Redis backends)
- 3.4 Telemetry & observability (OpenTelemetry plugin, Prometheus `/metrics`, health check enhancements)
- 3.5 Advanced CLI (`bananajs routes`, `bananajs migrate --scan`, `bananajs openapi export`)
- 3.6 Pagination already done in Phase 2
- 3.7 TC39 decorator migration plan
- 3.8 Zod validation adapter plugin (`@banana-universe/plugin-zod`)

Key architectural decisions from Phase 2:

- `BananaAppOptions` extended with `auth?`, `swagger?`, `rateLimit?`, `health?` optional blocks
- Auth is interface-only in framework (`AuthGuard`) — JWT strategy is user-injected
- Rate-limit and upload middlewares are lazy-loaded (optional peer deps)
- `ApiResponse` decorator renamed to `ApiResponseDoc` to avoid conflict with base class
- Schema extractor reads `class-validator` metadata via `getMetadataStorage()` (no `emitDecoratorMetadata`)
- `BananaTestApp` now has fluent auth/header API and disables rate-limit by default

## Change Log

| Date       | Change                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-27 | Rosetta workspace initialized; Rosetta docs and shell files created                                                                                  |
| 2026-03-27 | Phase 1 complete: bug fixes, security baseline, logging, DI, context, CLI overhaul                                                                   |
| 2026-03-27 | Phase 2 complete: auth decorators, OpenAPI, config module, rate limit, upload, health check, pagination, BananaTestApp enhancements, migration guide |
