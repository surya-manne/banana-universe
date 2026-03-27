# example-rest-mongodb

**Mongoose** with core **`@Body(ZodSchema)`** for request bodies.

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
npm run build
npm run start
```

## Tests

Default **`npm run test`** only hits **`GET /articles/healthz`** with a dummy `DATABASE_URL` so CI does **not** require MongoDB. Full CRUD tests against a real cluster are left as an optional local exercise.
