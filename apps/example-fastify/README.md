# example-fastify (Fastify + Express bridge)

**[BananaJS](https://surya-manne.github.io/banana-universe/)** is a TypeScript framework on Express—decorator routing, Zod validation, and feature modules via `createModule` under `src/modules/<feature>/`. This repo’s runnable recipes live under [`apps/`](https://github.com/surya-manne/banana-universe/tree/main/apps).

This recipe runs **BananaJS** (which uses **Express** internally) behind **Fastify** via [`@fastify/express`](https://github.com/fastify/fastify-express).

- **Fastify** is the Node HTTP server and plugin host.
- **Express** is the app returned by `BananaApp.getInstance()`, mounted with `fastify.use(...)`.
- Controllers and decorators behave like any other BananaJS app.

Prefer the **Express-only** examples (`example-rest-postgresql`, `example-rest-mongodb`) when you do not need Fastify. Use this when you want Fastify’s ecosystem (plugins, hooks) while keeping BananaJS routes.

## Scripts

| Script                                    | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `npm run dev`                             | `tsx watch` — develop with hot reload |
| `npm run build`                           | Compile to `dist/`                    |
| `npm start`                               | Run compiled server                   |
| `npm run lint` / `npm run lint:fix`       | ESLint (type-aware)                   |
| `npm run format` / `npm run format:check` | Prettier                              |

The **BananaJS CLI** (`@banana-universe/bananajs-cli`) is included as a devDependency for `bananajs` commands.

## Prerequisites

- Node 20+

## Run

```bash
npm run dev
# or: npm run build && npm start
```

Optional `.env` is supported via **`dotenv`** (`import 'dotenv/config'` in `main.ts`).

Then `GET /api/health` returns JSON with `bridge: fastify-express`.

## Note

Native Fastify routing for BananaJS (without Express) is **not** implemented yet; see `packages/adapter-fastify` for the long-term `FrameworkAdapter` direction.
