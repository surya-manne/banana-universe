# example-rest-postgresql

Recipe app: **TypeORM + PostgreSQL**, DDD-style layering (domain → application → infrastructure), bearer-token auth, paginated list routes, optional **OpenTelemetry**, and **Swagger** at `/api-docs`.

## Prerequisites

- Node 20+
- PostgreSQL (local or Docker)

## Run with Docker Postgres

```bash
docker compose up -d
cp .env.example .env
npm run build
npm run start
```

## Integration tests

Tests use **sql.js** (in-memory) via TypeORM so CI does not need PostgreSQL or native `sqlite3`:

```bash
npm run build
npm run test
```

## Environment

See `.env.example`. `DATABASE_URL` points at PostgreSQL for local runs; tests ignore it and use SQLite.
