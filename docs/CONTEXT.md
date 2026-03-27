# Context

Business and overall context for the banana-universe project. Target state only — no technical details.

## Purpose

BananaJS is an opinionated Node.js framework built for developers who want the productivity of decorator-based routing (inspired by NestJS) without NestJS's complexity and overhead. It sits on top of Express, keeping things familiar, while adding structure through decorators, automatic request validation, and standardized API responses.

## Problem It Solves

- Plain Express apps grow inconsistent: each developer defines routes, validates inputs, and formats responses differently.
- BananaJS enforces a single pattern: controllers + decorators + DTOs + typed responses, reducing boilerplate and preventing drift.

## Target Users

- Node.js/TypeScript developers building REST APIs who want NestJS-style DX without the full NestJS dependency tree.

## Key Capabilities

- **Routing with decorators** — define endpoints as class methods with `@Controller`, `@Get`, `@Post`, etc.
- **Automatic request validation** — attach `@Body`, `@Params`, `@Query`, or `@Headers` with a Zod schema; invalid requests are rejected automatically.
- **Standardized responses** — all success responses use `SuccessResponse`; all errors use typed `ApiError` subclasses.
- **Centralized error handling** — a single `ErrorMiddleware` handles all unhandled errors consistently.
- **Extensible middlewares** — custom Express middlewares can be injected at app or route level.

## Workspace Structure (Business View)

- `packages/bananajs` — the core publishable framework library (`@banana-universe/bananajs`).
- `packages/bananajs-cli` — a CLI companion tool (early development) planned for project scaffolding, code generation from specs/schemas, and deployment/publish tooling.
- `apps/bananajs-demo` — a reference implementation showing how to use the framework.

## Distribution

- Published to npm as `@banana-universe/bananajs`.
- Local registry (Verdaccio) available for pre-publish testing.
- GitHub: [https://github.com/surya-manne/banana-universe](https://github.com/surya-manne/banana-universe).
