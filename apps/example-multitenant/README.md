# example-multitenant

Demonstrates **`@Tenant()`** with the `x-tenant-id` header, per-tenant data in TypeORM, **`@Can('delete','note')`** with a demo **`AbacGuard`**, and bearer auth.

## Prerequisites

- Node 20+
- PostgreSQL (or use in-memory **sql.js** in tests — see `npm run test`)

## Run

```bash
docker compose up -d
cp .env.example .env
npm run build
npm run start
```

## Tests

Integration tests use **sql.js** (no PostgreSQL) and assert tenant isolation plus ABAC (delete requires `x-role: admin`).
