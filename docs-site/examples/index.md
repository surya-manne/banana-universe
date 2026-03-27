# Example recipe apps

Runnable applications under `apps/` that demonstrate vertical slices: controllers, services, persistence, and plugins.

| App                                                                                                          | Stack                | Highlights                                                                 |
| ------------------------------------------------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------- |
| [example-rest-postgresql](https://github.com/sprakas/banana-universe/tree/main/apps/example-rest-postgresql) | TypeORM + PostgreSQL | DDD-style layers, bearer auth, pagination, optional OpenTelemetry, Swagger |
| [example-rest-mongodb](https://github.com/sprakas/banana-universe/tree/main/apps/example-rest-mongodb)       | Mongoose + MongoDB   | Document model, `@Body(Zod)` validation (see README for deployment notes)  |
| [example-fastify](https://github.com/sprakas/banana-universe/tree/main/apps/example-fastify)                 | Fastify + Express    | `@fastify/express` mounts BananaJS; hybrid HTTP stack (see app README)     |
| [example-websocket-chat](https://github.com/sprakas/banana-universe/tree/main/apps/example-websocket-chat)   | `plugin-websocket`   | Rooms demo, `@WsBody` DTO validation, HTTP health checks                   |
| [example-multitenant](https://github.com/sprakas/banana-universe/tree/main/apps/example-multitenant)         | TypeORM + PostgreSQL | `@Tenant`, per-tenant rows, `@Can` + demo ABAC guard                       |

Each app includes a `README.md`, `.env.example` where relevant, and `docker-compose.yml` when a database service is required.
