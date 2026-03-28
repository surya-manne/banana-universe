# example-multitenant

**[BananaJS](https://surya-manne.github.io/banana-universe/)** is a TypeScript framework on Express—multi-tenancy, ABAC, and feature modules via `createModule` under `src/modules/<feature>/`. This repo’s runnable recipes live under [`apps/`](https://github.com/surya-manne/banana-universe/tree/main/apps).

Demonstrates **`@Tenant()`** with the `x-tenant-id` header, per-tenant data in TypeORM, **`@Can('delete','note')`** with a demo **`AbacGuard`**, and bearer auth.

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
- PostgreSQL (or use in-memory **sql.js** in tests — see `npm run test`)

## Run

```bash
docker compose up -d
cp .env.example .env
npm run dev
# or: npm run build && npm start
```

Environment variables are loaded with **`dotenv`** at startup (`import 'dotenv/config'` in `main.ts`).

## Tests

Integration tests use **sql.js** (no PostgreSQL) and assert tenant isolation plus ABAC (delete requires `x-role: admin`).
