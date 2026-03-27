# example-fastify (Fastify + Express bridge)

This recipe runs **BananaJS** (which uses **Express** internally) behind **Fastify** via [`@fastify/express`](https://github.com/fastify/fastify-express).

- **Fastify** is the Node HTTP server and plugin host.
- **Express** is the app returned by `BananaApp.getInstance()`, mounted with `fastify.use(...)`.
- Controllers and decorators behave like any other BananaJS app.

Prefer the **Express-only** examples (`example-rest-postgresql`, `example-rest-mongodb`) when you do not need Fastify. Use this when you want Fastify’s ecosystem (plugins, hooks) while keeping BananaJS routes.

## Prerequisites

- Node 20+

## Run

```bash
npm run build
npm run start
```

Then `GET /api/health` returns JSON with `bridge: fastify-express`.

## Note

Native Fastify routing for BananaJS (without Express) is **not** implemented yet; see `packages/adapter-fastify` for the long-term `FrameworkAdapter` direction.
