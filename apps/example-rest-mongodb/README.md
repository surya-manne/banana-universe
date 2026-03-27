# example-rest-mongodb

Prisma **MongoDB** connector with **`@banana-universe/plugin-zod`** (`@ZodBody`) for request bodies.

## Prisma MongoDB limitations (read before production)

Document these in any consumer-facing API:

- **Transactions**: multi-document transactions require a replica set, not a standalone `mongod`.
- **Relations**: modeling differs from SQL (embedded documents vs references); plan migrations accordingly.
- **Filtering**: complex nested filters may differ from SQL `findAll` patterns — keep queries aligned with what the connector supports.

This sample uses **single-document** `create` operations to stay within typical connector capabilities.

## Prerequisites

- Node 20+
- MongoDB 6+ (local or Atlas). Set `DATABASE_URL` (see `.env.example`).

## Run

```bash
cp .env.example .env
npm run build
npm run start
```

## Tests

Default **`npm run test`** only hits **`GET /articles/healthz`** with a dummy `DATABASE_URL` so CI does **not** require MongoDB. Full CRUD tests against a real cluster are left as an optional local exercise.
