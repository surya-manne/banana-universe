# example-rest-mongodb

**[BananaJS](https://surya-manne.github.io/banana-universe/)** is a TypeScript framework on Express—decorator routing, Zod validation, and feature modules via `createModule` under `src/modules/<feature>/`. This repo’s runnable recipes live under [`apps/`](https://github.com/surya-manne/banana-universe/tree/main/apps).

**Mongoose** with core **`@Body(ZodSchema)`** for request bodies.

## Scripts

| Script                                    | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `npm run dev`                             | `tsx watch` — develop with hot reload |
| `npm run build`                           | Compile to `dist/`                    |
| `npm start`                               | Run compiled server                   |
| `npm run lint` / `npm run lint:fix`       | ESLint (type-aware)                   |
| `npm run format` / `npm run format:check` | Prettier                              |

The **BananaJS CLI** (`@banana-universe/bananajs-cli`) is included as a devDependency for `bananajs` commands.

## MongoDB notes (read before production)

- **Transactions**: multi-document transactions need a replica set, not a standalone `mongod`. The Mongoose plugin’s `@Transactional()` follows the same rules.
- **Relations**: modeling differs from SQL (embedded documents vs references); design schemas accordingly.
- **Migrations**: Mongoose has no Prisma-style migrate CLI — evolve schemas in code and handle indexes explicitly if needed.

This sample uses **single-document** `create` operations.

## Prerequisites

- Node 20+
- MongoDB 6+ (local or Atlas). Set `DATABASE_URL` (see `.env.example`).

## Run

```bash
cp .env.example .env
npm run dev
# or: npm run build && npm start
```

Environment variables are loaded with **`dotenv`** at startup (`import 'dotenv/config'` in `main.ts`).

## Tests

Default **`npm run test`** only hits **`GET /articles/healthz`** with a dummy `DATABASE_URL` so CI does **not** require MongoDB. Full CRUD tests against a real cluster are left as an optional local exercise.
