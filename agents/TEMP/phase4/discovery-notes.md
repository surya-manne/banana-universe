# Phase 4 Discovery Notes

## Status: Complete

## Project Context

BananaJS is an opinionated Node.js framework built on Express with decorator-based routing. As of Phase 3 complete (v0.3.0):

- Plugin architecture with `BananaPlugin` interface + `AppContext` abstraction, async lifecycle
- In-core caching (`@Cache`/`@CacheEvict`) with `MemoryCacheStore` + `CacheStore` interface
- Prometheus metrics (`prom-client` optional peer), `/metrics` endpoint
- DevTools endpoint `GET /_banana/routes` (dev-only)
- Plugin packages: `plugin-typeorm`, `plugin-prisma`, `plugin-otel`, `plugin-zod` (all v0.1.0)
- CLI commands: `new`, `generate`, `routes`, `migrate`, `db`, `openapi export`
- TC39 migration **plan** (doc only) at `docs/TC39-DECORATORS.md`
- `emitDecoratorMetadata` is NOT set — explicit `paramIndex` used in `@InjectRepository`
- `awilix` DI container
- Nx monorepo, npm workspaces, SWC transpilation, `module: "nodenext"` (all imports need `.js` suffix)

## Phase 4 Scope (from EnterpriseRoadmapV2.md + ArchitectReviewed)

### 4.1 AI-First CLI Capabilities

- `bananajs ai generate --from-schema schema.json` — OpenAPI/JSON Schema → controller+DTO+service
- `bananajs ai generate --from-prompt "..."` — LLM-driven scaffolding via **Vercel `ai` SDK** (not direct OpenAI)
- `bananajs ai doc` — JSDoc + Swagger metadata from LLM
- `bananajs ai review` — LLM review of controller for best practices

### 4.2 Advanced Security Hardening

- `@Sanitize` decorator — `sanitize-html`/`dompurify` on string fields
- `@Can('action', 'resource')` ABAC decorator
- Secrets rotation hooks in `BananaConfig` (`onSecretRotated` event)
- OWASP defaults (CSP via helmet, ORM contract)
- `@Throttle` — per-user rate limiting via JWT user ID (extends `@RateLimit`)

### 4.3 Multi-Tenancy Support

- `@Tenant()` decorator — injects `tenantId` from JWT into request context
- `TenantContext` available via DI
- Per-tenant cache key namespacing (integrates with existing `CacheManager`)
- Per-tenant DB connection pooling patterns via ORM plugins

### 4.4 Performance & Benchmarking Infrastructure

- `apps/benchmarks` new package — autocannon/k6 suite
- GitHub Actions CI job for p99 regression gate
- Lazy controller loading — instantiate on first request to base path
- Route tree caching — precomputed route map at startup

### 4.5 WebSocket / SSE Support

- `@banana-universe/plugin-websocket` new package
- `@WsController`, `@OnConnect`, `@OnMessage('event')`, `@WsBody(Dto)` decorators
- Backed by `ws` library

### 4.6 Fastify Adapter (Exploration)

- `@banana-universe/adapter-fastify` new package
- `BananaApp` running on Fastify instead of Express
- Requires significant abstraction changes

### 4.7 TC39 Decorator Migration Execution

- Ship TC39 decorator support (stage 3 decorators)
- Deprecate `experimentalDecorators` path
- Breaking change to all packages — major version bump required

## Risk Assessment

| Item                | Risk   | Notes                                                                             |
| ------------------- | ------ | --------------------------------------------------------------------------------- |
| 4.1 AI CLI          | LOW    | Vercel `ai` SDK is well-maintained; network-optional (schema-based works offline) |
| 4.2 Security        | LOW    | Additive decorators, no breaking changes                                          |
| 4.3 Multi-tenancy   | MEDIUM | Requires AsyncLocalStorage extension                                              |
| 4.4 Benchmarks      | LOW    | New `apps/benchmarks` package, isolated                                           |
| 4.4 Lazy loading    | MEDIUM | Changes `initializeControllers` timing                                            |
| 4.5 WebSocket       | LOW    | New plugin package, isolated                                                      |
| 4.6 Fastify adapter | HIGH   | Major architectural abstraction; Express assumption is deep in core               |
| 4.7 TC39 migration  | HIGH   | Breaking change to all packages; stage 3 decorators still have ecosystem gaps     |

## Architectural Constraints

1. `module: "nodenext"` — all relative `.ts` imports need `.js` extension in source
2. `emitDecoratorMetadata` NOT set — cannot rely on TypeScript type reflection; use explicit metadata
3. Optional peer deps pattern: `peerDependencies` + `peerDependenciesMeta.optional: true` + devDependencies
4. Plugin pattern: `register(ctx: AppContext, container: AwilixContainer)` before `initializeControllers`
5. All packages use SWC + Nx build
6. `@ApiResponse` renamed `@ApiResponseDoc` (conflict with base class) — naming precedent

## Scope Management Recommendation

Full Phase 4 is 50+ files across 5+ new packages/apps. Recommend implementing in this order:

- **Must do (core value):** 4.1 AI CLI, 4.2 Security, 4.3 Multi-tenancy, 4.4 Benchmarks, 4.5 WebSocket
- **Defer/partial:** 4.6 Fastify adapter (high risk, requires major refactor) → implement as exploration stub only
- **Defer:** 4.7 TC39 migration execution (breaking changes, ecosystem risk) → update existing doc with execution timeline

## Existing Package Versions

- `packages/bananajs`: v0.3.0
- `packages/bananajs-cli`: v0.1.0 (needs AI commands → bump to v0.2.0)
- `packages/plugin-typeorm`: v0.1.0
- `packages/plugin-prisma`: v0.1.0
- `packages/plugin-otel`: v0.1.0
- `packages/plugin-zod`: v0.1.0

## New Packages / Apps

- `packages/plugin-websocket` (new, v0.1.0)
- `packages/adapter-fastify` (new, exploration stub)
- `apps/benchmarks` (new)
