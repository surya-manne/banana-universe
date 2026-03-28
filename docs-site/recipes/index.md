# Recipes

Runnable applications in this repository—each one is a **full vertical slice** you can run, read, and borrow from: HTTP surface, services, persistence, and optional realtime or multi-tenancy.

All recipes align with **BananaJS v0.6**: **tsyringe** DI and **`createModule`** for HTTP features. Prefer **`defineBananaAppOptions({ modules: [...] })`** over ad-hoc **`controllers`** lists for new code. See [Getting started](/guide/getting-started) for **`bananajs new`** with **`--preset mongodb`** or **`--preset sql`** (built-in scaffolds, no git clone).

## Conventions

- **Layout**: `src/modules/<feature>/` per vertical slice (controller, DTOs, services, infrastructure). **Dotted role names** for feature files (e.g. `Catalog.controller.ts`, `CatalogItem.entity.ts`, `Article.service.ts`); keep **`main.ts`**, **`bootstrap.ts`**, and barrel **`index.ts`** in **lowercase**. **`createModule`**: list only non-controller providers — the **`controller`** field registers the HTTP class; do not duplicate it in **`providers`**. Domain persistence contracts use **`domain/<Entity>.mapper.ts`** (repository port) or **`domain/<Entity>.repository.ts`** (not a separate “list query” DTO file — combine query Zod schemas into the feature **`*.dto.ts`** module).
- **Shared code**: guards/utilities under `src/lib/` when needed (e.g. `BearerAuthGuard.ts`).
- **Env**: copy `.env.example` → `.env`; apps load **`dotenv`** at process entry (`import 'dotenv/config'` in `main.ts`).
- **Development**: `npm run dev` uses **`tsx watch`** for hot reload; `npm run build` / `npm start` for production-style runs.
- **Quality**: ESLint 9 flat config (type-aware TypeScript) + Prettier; `npm run lint`, `npm run format`.
- **CLI**: `@banana-universe/bananajs-cli` is a devDependency in each recipe (`bananajs`, `bjs`).

| Recipe                                                                                                           | Stack             | What it demonstrates                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| [example-rest-postgresql](https://github.com/surya-manne/banana-universe/tree/main/apps/example-rest-postgresql) | SQL (PostgreSQL)  | Layered `modules/catalog`, auth, pagination, optional observability, API docs |
| [example-rest-mongodb](https://github.com/surya-manne/banana-universe/tree/main/apps/example-rest-mongodb)       | MongoDB           | `modules/articles`, Mongoose + `@Body(Zod)` (see app README for deployment)   |
| [example-fastify](https://github.com/surya-manne/banana-universe/tree/main/apps/example-fastify)                 | Fastify + Express | `modules/health`, hybrid HTTP stack via `@fastify/express`                    |
| [example-websocket-chat](https://github.com/surya-manne/banana-universe/tree/main/apps/example-websocket-chat)   | WebSockets        | `modules/health` + `modules/chat`, WebSocket plugin alongside HTTP            |
| [example-multitenant](https://github.com/surya-manne/banana-universe/tree/main/apps/example-multitenant)         | SQL + tenancy     | `modules/note`, per-tenant data and `@Can` ABAC-style checks                  |

Each recipe includes a `README.md`, `.env.example` where relevant, and `docker-compose.yml` when a database service is required.
