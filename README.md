# BananaJS

**BananaJS** is an **AI-first, domain-ready** Node.js framework on **Express**: structured routing, schema-backed validation, consistent API responses and errors, generated API docs, an optional **plugin** model, and a **`bananajs`** CLI for scaffolding, codegen, and AI-assisted workflows.

**Documentation:** [https://surya-manne.github.io/banana-universe/](https://surya-manne.github.io/banana-universe/) — [Getting started](https://surya-manne.github.io/banana-universe/guide/getting-started.html) · [Philosophy](https://surya-manne.github.io/banana-universe/guide/philosophy.html) · [Recipes](https://surya-manne.github.io/banana-universe/recipes/)

**Repository:** [github.com/surya-manne/banana-universe](https://github.com/surya-manne/banana-universe) · **npm:** [`@banana-universe/bananajs`](https://www.npmjs.com/package/@banana-universe/bananajs)

## Highlights

- **Productive API development** — One pattern for routes, validation, success and error payloads, and HTTP docs—less drift between teams and files.
- **Operations-ready** — Authentication, authorization, tenancy, caching, metrics, health, uploads, rate limits, and structured logging when you need them (see [Advanced concepts](https://surya-manne.github.io/banana-universe/guide/advanced-concepts.html)).
- **Composable stack** — Databases, observability, WebSocket, and more attach as plugins instead of bloating the core.
- **Domain-friendly** — Optional DDD-style layers and CLI scaffolding for bounded contexts ([Layered architecture](https://surya-manne.github.io/banana-universe/guide/layered-architecture.html)).
- **CLI & AI** — Project scaffolding, codegen, OpenAPI export, and AI flows for generation, documentation, and review—with optional project config for local or cloud models.

## Workspace layout

| Path                    | Role                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/bananajs`     | Core framework (`@banana-universe/bananajs`)                                                                                                  |
| `packages/bananajs-cli` | CLI (`bananajs`)                                                                                                                              |
| `packages/ddd`          | Domain-building primitives (`@banana-universe/ddd`)                                                                                           |
| `packages/plugin-*`     | Official plugins                                                                                                                              |
| `apps/bananajs-demo`    | Small CRUD reference                                                                                                                          |
| `apps/example-*`        | Runnable recipes (PostgreSQL, MongoDB, Fastify, WebSocket, multi-tenant) — [overview](https://surya-manne.github.io/banana-universe/recipes/) |
| `docs-site`             | Documentation site source                                                                                                                     |

## Quick install

```bash
npm install @banana-universe/bananajs reflect-metadata express zod
```

Peer dependencies cover optional features (OpenAPI UIs, rate limiting, uploads, metrics, and so on). See [Getting started](https://surya-manne.github.io/banana-universe/guide/getting-started.html) for TypeScript settings, a minimal app, plugins, and testing.

## License

MIT — see package metadata and the docs footer.
