# Implementation

Current implementation state. Very brief — references other docs. The only change log.

## Status: Active Development

## Modules

### packages/bananajs v0.5.0 [Breaking — Zod, BaseController, routes, bootstrap]

- **Validation**: `@Body` / `@Query` / `@Params` / `@Headers` accept **Zod** schemas only; removed `class-validator` / `class-transformer` from core
- **OpenAPI**: `ApiBody({ schema: ZodType })`; JSON Schema via `zod-to-json-schema`; inferred body from `@Body` when `@ApiBody` omitted
- **Pagination**: `PaginationQuerySchema` + `z.infer` replaces `PaginationDto`
- **Routing**: `@Controller('segment')` and `@Get('segment')` — **no leading slash**; `joinRouteSegments` in `route-path.ts`
- **Controllers**: `BaseController` with `ok` / `error`
- **Bootstrap**: `createBananaApplication(controllers, { port?, onListening?, ...BananaAppOptions })`; **`defineBananaAppOptions`**, **`createBananaContainer`** for declarative Awilix registration (`services` + options)
- **plugin-zod**: deprecated re-export shim; **`plugin-websocket`**: `@WsBody(zodSchema?)`

### packages/bananajs v0.4.0 [Phase 4 Complete]

**Phase 4 additions:**

- **Advanced Security**: `@Sanitize(options?)` decorator (lazy `sanitize-html`, strips HTML from string body fields); `@Can('action', 'resource')` ABAC decorator + `AbacGuard` interface + `BananaAppOptions.abac.guard`; `@Throttle({ windowMs, max, keyBy })` per-user/IP rate limiting via JWT `sub` claim
- **Secrets rotation**: `BananaConfig()` now returns `BananaConfigInstance<T>` with `.reload()`, `.onSecretRotated(handler)`, `.offSecretRotated(handler)` — backward-compat (direct property access preserved)
- **Multi-Tenancy**: `@Tenant(options?)` class/method decorator; `TenantContext` (AsyncLocalStorage); `getTenantId()`, `runWithTenant()`; `createTenantMiddleware()` (extracts from `x-tenant-id` header or JWT `tid` claim); cache keys auto-namespaced per tenant; `docs/MULTI-TENANCY.md` guide
- **Performance**: `BananaAppOptions.lazyControllers?: boolean` — defers controller instantiation to first request; route metadata precomputed at startup (route tree caching, not per-request `Reflect.getMetadata`)
- **Framework adapter interface**: `FrameworkAdapter` + `RouteDefinition` interfaces for future framework independence

**New packages (Phase 4):**

- `@banana-universe/plugin-websocket` v0.1.0 — `WebSocketPlugin({ path, controllers })`, `@WsController`, `@OnConnect`, `@OnDisconnect`, `@OnMessage(event)`, `@WsBody(DtoClass?)` decorators; `attachToServer(httpServer)` API; backed by `ws` optional peer
- `@banana-universe/adapter-fastify` v0.0.1 — `FastifyAdapter` exploration stub implementing `FrameworkAdapter`; full implementation deferred to v2.x

**New app:**

- `apps/benchmarks` — autocannon benchmark suite (health, basic-route, auth-route, cached-route scenarios); `report.ts` with 10% p99 regression gate; `baseline.json`; `.github/workflows/benchmarks.yml` CI workflow

**CLI (bananajs-cli v0.2.0):**

- `bananajs ai generate --from-schema <file>` — parses JSON Schema or OpenAPI spec, generates controller+DTO+service (no LLM required)
- `bananajs ai generate --from-prompt "<text>"` — LLM-driven scaffolding via Vercel `ai` SDK + `@ai-sdk/openai` (optional peers)
- `bananajs ai doc [--file] [--dry-run]` — adds JSDoc to controller methods via LLM
- `bananajs ai review --file` — LLM review of controller for best practices

**Docs:**

- `docs/MULTI-TENANCY.md` — per-tenant DB patterns (TypeORM/Mongoose), schema isolation, row-level security
- `docs/TC39-DECORATORS.md` — execution timeline v2.0.0 + known blockers (parameter decorators)

### packages/bananajs v0.3.0 [Phase 3 Complete]

**Phase 3 additions:**

- **Plugin architecture**: `BananaPlugin` interface with `AppContext` abstraction; async lifecycle: `register()` → `initializeControllers` → `onReady()` → `_finalizeSetup()` → `onShutdown()` (reverse); `BananaApp.create()` handles async plugin flow; sync constructor warns if plugins provided
- **In-core caching**: `@Cache({ ttl, key })` / `@CacheEvict({ pattern })` method decorators + `CacheManager` singleton with `MemoryCacheStore` (TTL, glob eviction) + `CacheStore` interface for custom backends (Redis etc.)
- **Prometheus metrics**: `createMetricsMiddleware()` (mounts before routes) + `/metrics` endpoint; `http_requests_total`, `http_request_duration_ms`, `http_errors_total` counters/histograms; `prom-client` optional peer
- **DevTools endpoint**: `GET /_banana/routes` — returns route table JSON; returns 404 in production; enabled via `devTools: true` option
- **TC39 decorator migration plan**: `docs/TC39-DECORATORS.md` — full audit, migration path, parameter decorator blocker, v2.0.0 timeline

**New plugin packages (v0.1.0):**

- `@banana-universe/plugin-typeorm` — `TypeOrmPlugin()`, `@InjectRepository(Entity)`, `@Transactional()` with `AsyncLocalStorage` + awilix repository injection
- `@banana-universe/plugin-mongoose` — `MongoosePlugin(connection)`, `@Transactional()` with MongoDB sessions + `MongooseTransactionContext`
- `@banana-universe/plugin-otel` — `OpenTelemetryPlugin({ serviceName })`, NodeSDK with HTTP auto-instrumentation, span enrichment middleware (mounts in `register()` pre-route)
- `@banana-universe/plugin-zod` — `ZodPlugin()` + `@ZodBody/@ZodQuery/@ZodParams(schema)` decorators; coexists with class-validator

**New CLI commands:**

- `bananajs routes` — static AST scan of `src/` for `@Controller` + HTTP method decorators; colored table output
- `bananajs migrate` — Express → BananaJS route codemod; generates `*.controller.ts` files from Express route patterns
- `bananajs db --status` — TypeORM migration status via `npx typeorm migration:show`; if `mongoose` is in `package.json`, prints a short note (no migrate CLI)
- `bananajs openapi export [--out path] [--client typescript]` — exports OpenAPI spec; optionally generates TypeScript types via `openapi-typescript`

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

### Phase 8 — Example recipe apps [Complete]

- **`apps/example-rest-postgresql`** — DDD-style catalog module, TypeORM (PostgreSQL locally, **sql.js** in tests), awilix wiring (`asFunction` for DataSource injection), bearer auth, pagination, optional OTel, Swagger; `docker-compose.yml`, integration tests
- **`apps/example-rest-mongodb`** — Mongoose + MongoDB, `@Body(Zod)` + Zod, `docker-compose.yml`; README documents deployment notes; tests cover HTTP health with dummy `DATABASE_URL` (no live Mongo in CI)
- **`apps/example-fastify`** — Fastify + `@fastify/express` mounts BananaJS Express app; see app README
- **`apps/example-websocket-chat`** — `WebSocketPlugin`, `@WsBody` validation, in-memory rooms; HTTP `GET /health` test
- **`apps/example-multitenant`** — `@Tenant`, `@Can` + demo `AbacGuard`, TypeORM + PostgreSQL (sql.js in tests)
- **`plugin-websocket`**: **`@WsBody(DtoClass)`** now runs `plainToInstance` + `class-validator` (optional peers `class-transformer` / `class-validator`)
- **`docs-site/examples/index.md`** — index table + nav **Examples**; **`.github/workflows/ci.yml`** — typecheck steps for packages + example apps (including `example-fastify`)

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

### packages/ddd v0.1.0 [Phase 6 Complete]

**`@banana-universe/ddd`:**

- **Domain primitives**: `Entity`, `ValueObject`, `AggregateRoot` (domain events + version helpers), `DomainEvent`, `Repository<T>` with **`FindCriteria<T>`** (`eq` / `in` / `like` / `gt` / `lt`, order, limit/offset), **`UnitOfWork`** interface
- **Layer decorators**: `@DomainService()`, `@ApplicationService()` — compose **`@Injectable()`** from core + `Reflect.defineMetadata(LAYER_TYPE_KEY, 'domain'|'application')` (no `emitDecoratorMetadata`)
- **Tests**: `packages/ddd/src/__tests__/` (Node test runner)

**Plugins:**

- **`@banana-universe/plugin-typeorm`**: **`TypeOrmRepositoryAdapter`**, **`TypeOrmUnitOfWork`** (QueryRunner)
- **`@banana-universe/plugin-mongoose`**: **`MongooseRepositoryAdapter`**, **`MongooseScopedUnitOfWork`**, **`runWithMongooseUnitOfWork`**, **`MongooseTransactionRollback`**

**CLI (`bananajs-cli` v0.3.0):**

- **`bananajs generate module <name>`** — DDD folder scaffold under **`--out`** (default `./src`); **`--orm typeorm|mongoose|none`** (TTY prompt if omitted; default **`typeorm`** when non-interactive)

### packages/bananajs-cli Phase 7 — LLM module generator [Complete]

- **`packages/bananajs-cli/src/lib/llm/`** — `LlmProvider`, **`OllamaProvider`** (default), **`LlamaCppProvider`**, **`VercelAiProvider`** (`ai` + `@ai-sdk/openai` / `@ai-sdk/anthropic`), **`resolveLlmProvider`**, fetch retry/timeout via **`.bananarc.json`**
- **`.bananarc.json`** — `llm` + `generate` namespaces (defaults: Ollama, `defaultOrm`, `outDir`)
- **`bananajs ai setup`** — interactive provider wizard; probes Ollama when applicable
- **`bananajs ai generate --module`** — Zod-validated JSON extraction → **`buildDddModuleFromExtraction`** (Phase 6 layout); **`--from-schema`** skips LLM extraction; **`--detailed`**, **`--debug`**, **`--orm`**, **`--out`**, **`--dry-run`**
- **`ai generate --from-prompt` / `ai doc` / `ai review`** — use **`resolveLlmProvider`** + `.bananarc.json` (offline Ollama supported)
- Extracted utilities: **`lib/utils/naming.ts`**, **`lib/utils/type-mapping.ts`**, **`lib/schema-parse.ts`**, **`lib/templates/legacy-scaffold.ts`**, prompts under **`lib/llm/prompts/`**

**Docs:**

- `docs-site/guide/layered-architecture.md`, `docs-site/tooling/cli.md` updated for Phase 6
- `docs-site/tooling/ai-module-generation.md` — Phase 7 walkthrough

### Phase 5 — Documentation & GitHub Publishing [In Progress]

**docs-site/ (VitePress):**

- `docs-site/package.json` — VitePress + TypeDoc + typedoc-plugin-markdown
- `docs-site/typedoc.json` — TypeDoc config targeting `packages/bananajs/src/index.ts`
- `docs-site/.vitepress/config.ts` — full nav/sidebar, GitHub Pages base `/banana-universe/`, local search, edit links
- `docs-site/.vitepress/theme/index.ts` — re-exports DefaultTheme
- `docs-site/index.md` — home page with hero + features
- Guide: `getting-started.md`, `basic-concepts.md`, `advanced-concepts.md`
- Reference: `decorators.md`, `bananaapp-options.md`, `error-types.md`, `config-module.md`
- Migration: `from-express.md`
- Integrations: `typeorm.md`, `mongoose.md`, `opentelemetry.md`, `zod.md`
- Plugins: `overview.md`, `websocket.md`, `writing-a-plugin.md`
- Tooling: `cli.md`, `ai-commands.md`, `benchmarks.md`
- API: `api/README.md` — TypeDoc placeholder (auto-generated on build)
- Versioning: deferred post-Phase 6 (noted in config.ts comments)
- Content aligned to **`packages/bananajs` exports**, plugin packages, CLI source, and **`plans/EnterpriseRoadmapV3.md`** (not root README-only); **`guide/philosophy.md`** states AI-first, DX, extendability, DDD positioning

**GitHub Actions:**

- `.github/workflows/docs.yml` — triggers on push to main (`docs-site/**` + `packages/bananajs/src/**`); runs TypeDoc then VitePress build; deploys to `gh-pages`
- `.github/workflows/ci.yml` — unified PR gate; `tsc --noEmit` across all 8 packages + build check + benchmark regression job (replaces/extends benchmarks.yml for PRs)
- `.github/workflows/publish.yml` — triggers on `v*` tags; explicit ordered publishing: bananajs → ddd → plugin-typeorm → plugin-mongoose → plugin-otel → plugin-zod → plugin-websocket → adapter-fastify → bananajs-cli

**Other:**

- `docs/ARCHITECTURE.md` — fixed stale `emitDecoratorMetadata: true` claim (decorator metadata uses explicit `Reflect.defineMetadata`)

## Phase Status

| Phase                                       | Status         | Version                |
| ------------------------------------------- | -------------- | ---------------------- |
| Phase 1 — Foundation                        | ✅ Complete    | v0.1.0                 |
| Phase 2 — Core Enterprise                   | ✅ Complete    | v0.2.0                 |
| Phase 3 — Advanced Architecture             | ✅ Complete    | v0.3.0                 |
| Phase 4 — Enterprise & AI-First             | ✅ Complete    | v0.4.0                 |
| Phase 5 — Documentation & GitHub Publishing | 🔄 In Progress | —                      |
| Phase 6 — DDD package & layered codegen     | ✅ Complete    | ddd v0.1.0, CLI v0.3.0 |
| Phase 7 — LLM DDD module generator          | ✅ Complete    | CLI v0.3.0             |
| Phase 8 — Example recipe apps               | ✅ Complete    | —                      |

## Next Session Starting Point

Phase 5 scaffold complete. Remaining for Phase 5 to go live: `npm ci` in `docs-site/`, enable GitHub Pages on repo (source: `gh-pages` branch), push to trigger `docs.yml`. **Phases 6–8 shipped:** `@banana-universe/ddd`, **`bananajs generate module`**, **`llm/`** + **`.bananarc.json`**, **`bananajs ai`**, and **four `apps/example-*` recipes** with CI coverage.

Key architectural decisions from Phase 3:

- Plugin lifecycle: `BananaPlugin.register(ctx)` runs before `initializeControllers` (critical for pre-route middleware placement)
- Metrics middleware is mounted pre-route in constructor/initializePlugins; metrics endpoint is registered in `_finalizeSetup`
- `emitDecoratorMetadata` is NOT set — `@InjectRepository` uses explicit `paramIndex` stored on class prototype
- Module-level `typeormDataSource` in plugin-typeorm — single DataSource per app (multiple not supported)
- `CacheManager` singleton — `reset()` available for testing

Key architectural decisions from Phase 2:

- `BananaAppOptions` extended with `auth?`, `swagger?`, `rateLimit?`, `health?` optional blocks
- Auth is interface-only in framework (`AuthGuard`) — JWT strategy is user-injected
- Rate-limit and upload middlewares are lazy-loaded (optional peer deps)
- `ApiResponse` decorator renamed to `ApiResponseDoc` to avoid conflict with base class
- Schema extractor uses **Zod** (`zod-to-json-schema`) for OpenAPI request bodies (no `emitDecoratorMetadata`)
- `BananaTestApp` now has fluent auth/header API and disables rate-limit by default

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-27 | **Mongoose replaces Prisma**: `@banana-universe/plugin-mongoose`, `example-rest-mongodb` migrated; **`defineBananaAppOptions`** / **`createBananaContainer`**; **`apps/example-fastify`** (Fastify + `@fastify/express`); CLI `--orm mongoose`; docs/CI/publish updated |
| 2026-03-27 | **bananajs v0.5.0**: Zod-only validation, `BaseController`, slash-free route segments + `joinRouteSegments`, `createBananaApplication`, OpenAPI from Zod, `PaginationQuerySchema`                                                                                       |
| 2026-03-27 | Rosetta workspace initialized; Rosetta docs and shell files created                                                                                                                                                                                                     |
| 2026-03-27 | Phase 1 complete: bug fixes, security baseline, logging, DI, context, CLI overhaul                                                                                                                                                                                      |
| 2026-03-27 | Phase 2 complete: auth decorators, OpenAPI, config module, rate limit, upload, health check, pagination, BananaTestApp enhancements, migration guide                                                                                                                    |
| 2026-03-27 | Phase 3 complete: plugin architecture, TypeORM/Mongoose/OTel/Zod plugins, cache layer, Prometheus metrics, DevTools endpoint, 4 new CLI commands, TC39 migration plan                                                                                                   |
| 2026-03-27 | Phase 4 complete: AI CLI (ai generate/doc/review), @Sanitize/@Can/@Throttle security, @Tenant multi-tenancy, lazy controllers, benchmarks app, plugin-websocket, adapter-fastify stub                                                                                   |
| 2026-03-27 | Phase 5 scaffold: VitePress docs-site (20 pages), GitHub Actions (docs.yml, ci.yml, publish.yml), ARCHITECTURE.md fix                                                                                                                                                   |
| 2026-03-27 | docs-site content rewritten from source + plans/ (not README-only); added guide/roadmap.md, guide/layered-architecture.md                                                                                                                                               |
| 2026-03-27 | docs-site positioning: AI-first, DX, extendable, DDD-focused; added guide/philosophy.md; home + roadmap + layered-architecture tone                                                                                                                                     |
| 2026-03-27 | docs-site home: hero SVG, Mermaid architecture diagram, custom CSS; vitepress-plugin-mermaid; api/index.md for /api/; removed repo layout from index                                                                                                                    |
| 2026-03-27 | docs-site Rosetta-style palette: force-dark, navy #0a1628 + gold #FDB913/#FFB81C + text #A0A9B8; Mermaid + hero SVG aligned                                                                                                                                             |
| 2026-03-27 | Phase 6 complete: `@banana-universe/ddd` (Entity/VO/AggregateRoot/Repository/FindCriteria/UoW, @DomainService/@ApplicationService), TypeORM/Mongoose adapters + UoW helpers, `bananajs generate module`, CI + publish ordering, docs                                    |
| 2026-03-27 | Phase 7 complete: `lib/llm/` (Ollama, llama.cpp, Vercel AI), `.bananarc.json`, `bananajs ai setup`, `ai generate --module` + Zod extraction + `generate-ai-module.ts`, refactored `ai.ts`; `docs-site/tooling/ai-module-generation.md`                                  |
| 2026-03-27 | Phase 8 complete: `apps/example-rest-postgresql`, `example-rest-mongodb`, `example-websocket-chat`, `example-multitenant`; `@WsBody` validation in `plugin-websocket`; `docs-site/examples/index.md`, CI example-app gates                                              |
