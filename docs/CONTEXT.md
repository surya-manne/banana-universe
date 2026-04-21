# Context

Business and overall context for the banana-universe project. Target state only — no technical details.

## Purpose

BananaJS is an opinionated Node.js framework built for developers who want the productivity of decorator-based routing (inspired by NestJS) without NestJS's complexity and overhead. It sits on top of Express, keeping things familiar, while adding structure through decorators, automatic request validation, standardized API responses, and a plugin ecosystem.

## Problem It Solves

- Plain Express apps grow inconsistent: each developer defines routes, validates inputs, and formats responses differently.
- BananaJS enforces a single pattern: controllers + decorators + Zod schemas + typed responses, reducing boilerplate and preventing drift.
- Without DI, services become hard to test and replace; BananaJS ships tsyringe-based injection at the module level so scope is predictable.

## Target Users

- Node.js/TypeScript developers building REST APIs who want NestJS-style DX without the full NestJS dependency tree.
- Teams adopting domain-driven design who want isolated feature modules with swappable persistence adapters.

## Key Capabilities

- **Routing with decorators** — define endpoints as class methods with `@Controller`, `@Get`, `@Post`, etc.
- **Automatic request validation** — attach `@Body`, `@Params`, `@Query`, or `@Headers` with a Zod schema; invalid requests are rejected automatically.
- **Standardized responses** — all success responses use `SuccessResponse`; all errors use typed `ApiError` subclasses.
- **Centralized error handling** — a single `ErrorMiddleware` handles all unhandled errors consistently.
- **Dependency injection** — tsyringe-based, one child container per feature module (`createModule`).
- **Plugin ecosystem** — `BananaPlugin` interface with async lifecycle (`register` → `onReady` → `onShutdown`); first-party plugins for TypeORM, Mongoose, OpenTelemetry, WebSocket, and Zod.
- **Caching** — `@Cache({ ttl, key })` / `@CacheEvict({ pattern })` method decorators; in-memory default, Redis-compatible via `CacheStore` interface.
- **Multi-tenancy** — `@Tenant()` + `TenantContext` (AsyncLocalStorage) for per-request tenant isolation; cache keys auto-namespaced.
- **Security** — `@Auth` / `@Roles` / `@Public` pluggable auth; `@Can('action', 'resource')` ABAC; `@Throttle` / `@RateLimit` rate limiting; `@Sanitize` HTML stripping.
- **Observability** — Prometheus metrics endpoint, OpenTelemetry plugin, health check endpoint, devtools route listing.
- **OpenAPI** — generated spec at `/api-docs.json` from decorator metadata; Scalar / Swagger UI.
- **CLI companion** — `bananajs-cli` for scaffolding, code generation from OpenAPI/JSON Schema, LLM-assisted generation, route scanning, Express migration codemods.
- **DDD primitives** — `@banana-universe/ddd` package with Entity, ValueObject, Aggregate, DomainEvent, Repository base classes.

## Workspace Structure (Business View)

- `packages/bananajs` — the core publishable framework library (`@banana-universe/bananajs` v0.6.0).
- `packages/bananajs-cli` — CLI companion (`@banana-universe/bananajs-cli` v0.3.0) for scaffolding, generation, and LLM-assisted tooling.
- `packages/ddd` — DDD primitive base classes (`@banana-universe/ddd`).
- `packages/adapter-fastify` — exploration stub for Fastify adapter (`@banana-universe/adapter-fastify`); not production-ready.
- `packages/plugin-typeorm` — TypeORM integration plugin.
- `packages/plugin-mongoose` — Mongoose integration plugin.
- `packages/plugin-otel` — OpenTelemetry integration plugin.
- `packages/plugin-websocket` — WebSocket (ws) integration plugin.
- `apps/example-rest-postgresql` — reference REST app using TypeORM + PostgreSQL.
- `apps/example-rest-mongodb` — reference REST app using Mongoose + MongoDB.
- `apps/example-multitenant` — reference multi-tenant REST app.
- `apps/example-websocket-chat` — reference WebSocket chat app.
- `apps/example-fastify` — Fastify adapter exploration app.
- `apps/benchmarks` — autocannon benchmark suite with regression gate.

## Distribution

- Packages are published and consumed via a **local Verdaccio** registry in this workspace (`npm run registry:local`, `npm run publish:local`); no automated push to public or private online npm registries.
- GitHub: [https://github.com/surya-manne/banana-universe](https://github.com/surya-manne/banana-universe).
