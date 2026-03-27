# Recipes

Runnable applications in this repository—each one is a **full vertical slice** you can run, read, and borrow from: HTTP surface, services, persistence, and optional realtime or multi-tenancy.

| Recipe                                                                                                           | Stack             | What it demonstrates                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| [example-rest-postgresql](https://github.com/surya-manne/banana-universe/tree/main/apps/example-rest-postgresql) | SQL (PostgreSQL)  | Layered modules, auth, pagination, optional observability, API docs                |
| [example-rest-mongodb](https://github.com/surya-manne/banana-universe/tree/main/apps/example-rest-mongodb)       | MongoDB           | Document-backed API with schema-validated requests (see app README for deployment) |
| [example-fastify](https://github.com/surya-manne/banana-universe/tree/main/apps/example-fastify)                 | Fastify + Express | Running the same app style on a hybrid HTTP stack                                  |
| [example-websocket-chat](https://github.com/surya-manne/banana-universe/tree/main/apps/example-websocket-chat)   | WebSockets        | Realtime messaging alongside ordinary HTTP routes                                  |
| [example-multitenant](https://github.com/surya-manne/banana-universe/tree/main/apps/example-multitenant)         | SQL + tenancy     | Per-tenant data and policy-style access checks                                     |

Each recipe includes a `README.md`, `.env.example` where relevant, and `docker-compose.yml` when a database service is required.
