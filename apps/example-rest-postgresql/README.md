# example-rest-postgresql

**[BananaJS](https://surya-manne.github.io/banana-universe/)** is a TypeScript framework on Express—decorator routing, Zod validation, OpenAPI-friendly APIs, and feature modules via `createModule` under `src/modules/<feature>/`. This repo’s runnable recipes live under [`apps/`](https://github.com/surya-manne/banana-universe/tree/main/apps).

Recipe app: **TypeORM + PostgreSQL**, DDD-style layering (domain → application → infrastructure), bearer-token auth, paginated list routes, optional **OpenTelemetry**, and **Swagger** at `/api-docs`.

## Scripts

| Script                                    | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `npm run dev`                             | `tsx watch` — develop with hot reload |
| `npm run build`                           | Compile to `dist/`                    |
| `npm start`                               | Run compiled server                   |
| `npm run lint` / `npm run lint:fix`       | ESLint (type-aware)                   |
| `npm run format` / `npm run format:check` | Prettier                              |

The **BananaJS CLI** (`@banana-universe/bananajs-cli`) is included as a devDependency for `bananajs` commands (e.g. `npx bananajs routes`).

## Prerequisites

- Node 20+
- PostgreSQL (local or Docker)

## Run with Docker Postgres

```bash
docker compose up -d
cp .env.example .env
npm run dev
# or: npm run build && npm start
```

## Integration tests

Tests use **sql.js** (in-memory) via TypeORM so CI does not need PostgreSQL or native `sqlite3`:

```bash
npm run build
npm run test
```

## Environment

See `.env.example`. Copy to `.env` and set variables. The app loads them with **`dotenv`** at startup (`import 'dotenv/config'` in `main.ts`). `DATABASE_URL` points at PostgreSQL for local runs; tests ignore it and use SQLite.
