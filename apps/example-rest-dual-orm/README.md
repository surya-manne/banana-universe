# example-rest-dual-orm

Recipe app showing **TypeORM** and **Mongoose** in a **single** BananaJS process: **one ORM per feature module**, shared `bootstrap.ts` / `main.ts`, and plugin ordering that matches production guidance.

## Supported matrix

| Module    | Persistence | Plugin / driver                      |
| --------- | ----------- | ------------------------------------ |
| `tags`    | MongoDB     | `MongoosePlugin` + `mongoose`        |
| `widgets` | PostgreSQL  | `TypeOrmPlugin` + `type: 'postgres'` |

Tests use **sqljs** (in-memory) for TypeORM so CI does not require PostgreSQL; MongoDB is still required for the Mongoose side (or use the CI job that starts Mongo).

## When to use which ORM

- **New feature backed by relational data** → prefer **TypeORM** in its own `src/modules/<feature>/` tree.
- **New feature backed by documents** → prefer **Mongoose** in its own module.
- **Do not** mix both ORMs inside one feature folder; use two modules if you need both stacks in one app (as here).

## Run locally

1. Copy `.env.example` to `.env` and adjust URLs.
2. Start **MongoDB** and **PostgreSQL** (or use Docker).
3. From repo root: `npm install`
4. In this directory:

```bash
npm run dev
```

Health checks: `GET /tags/healthz` (mongoose), `GET /widgets/healthz` (typeorm).

## Tests

```bash
npm test
```

Requires a reachable **MongoDB** at `MONGODB_URI` (default `mongodb://127.0.0.1:27017/ci_dummy` in the npm script). TypeORM runs **sqljs** in `NODE_ENV=test`.

## Project context (AI / CLI)

This app includes a minimal `.bananarc.json` with `project` fields (`moduleLayoutVersion`, `bootstrap`, `main`, `apiPrefix`) so `bananajs ai wire` and codegen can align with layout. See the docs-site **AI** section (`/ai/` when the site is built).

## Dependency pins

ORM and drivers are pinned in `package.json` to reduce churn; bump intentionally after checking plugin compatibility.
