# Advanced Concepts

BananaJS **v0.4.x** already ships a **wide** enterprise surface—auth, OpenAPI, plugins, cache, metrics, multi-tenancy, ABAC, security decorators—not a “basic” framework with a few extras. This page maps the major **implemented** options; for signatures, use [TypeDoc](/api/).

## `BananaAppOptions`

`BananaApp` is constructed as:

```typescript
new BananaApp(controllers, options)
// or
await BananaApp.create(controllers, options)
```

The second argument is the **`BananaAppOptions`** object (`packages/bananajs/src/lib/Core/App.ts`). Highlights:

| Area              | Options (illustrative)                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| **HTTP**          | `middlewares` — extra Express handlers before routes                                |
| **Security**      | `security.helmet`, `security.cors` — defaults on; can disable or pass config        |
| **Request ID**    | `requestId` — default `true`                                                        |
| **Logging**       | `logger` — `Logger` instance or `false`                                             |
| **DI**            | `container` — **awilix** container for `@Injectable` resolution                     |
| **Shutdown**      | `gracefulShutdown` — SIGINT/SIGTERM hooks                                           |
| **Auth**          | `auth.guard` — **`AuthGuard`** for `@Auth` / `@Roles` / `@Public`                   |
| **Swagger**       | `swagger.enabled`, `path`, `title`, `version`, ... — OpenAPI JSON + UI              |
| **Rate limit**    | `rateLimit` — global rate limiting (optional peer)                                  |
| **Health**        | `health.enabled`, `path`, `checks` — **`GET /health`**                              |
| **Plugins**       | `plugins` — **`BananaPlugin[]`**; use **`BananaApp.create`** for async registration |
| **Cache**         | `cache.store` — memory (default) or custom **`CacheStore`**                         |
| **DevTools**      | `devTools` — `GET /_banana/routes` in non-production                                |
| **Metrics**       | `metrics.enabled`, `path` — Prometheus (optional peer)                              |
| **ABAC**          | `abac.guard` — **`AbacGuard`** for `@Can`                                           |
| **Multi-tenancy** | `tenant` — tenant resolution and **`TenantContext`**                                |
| **Performance**   | `lazyControllers` — defer controller instantiation to first use                     |

Exact field types and defaults are in the **[BananaAppOptions interface](/reference/bananaapp-options)** and TypeDoc.

## Authentication decorators

- **`@Auth()`** — class or method; requires a configured **`auth.guard`**
- **`@Roles('a', 'b')`** — method-level role checks
- **`@Public()`** — opt out of auth on a route when the class is protected

Guards are **interfaces** — no JWT or session baked in.

## OpenAPI

Decorators such as **`@ApiTags`**, **`@ApiOperation`**, **`@ApiBody`**, **`@ApiResponseDoc`** feed the schema extractor. The spec is exposed (typically **`/api-docs.json`**) with a documentation UI when Swagger options are enabled.

## Caching

**`@Cache`** and **`@CacheEvict`** use the **`CacheManager`** singleton. Memory store is built-in; plug in Redis or another backend via **`CacheStore`**.

## File uploads

**`@Upload`** integrates **multer** (optional peer) for multipart uploads.

## Rate limiting

**`@RateLimit`** (express-rate-limit) and **`@Throttle`** (per-user / IP throttling) address different use cases.

## Security helpers

- **`@Sanitize`** — HTML strip on string fields (sanitize-html, optional peer)
- **`@Can('action', 'resource')`** — ABAC with **`abac.guard`**

## Multi-tenancy

**`@Tenant`**, **`TenantContext`**, **`getTenantId`**, **`runWithTenant`**, **`createTenantMiddleware`** — tenant id from header or JWT claim; cache keys can be namespaced. See repo **`docs/MULTI-TENANCY.md`** for deep patterns.

## Framework adapter

**`FrameworkAdapter`** and **`RouteDefinition`** support future non-Express HTTP stacks. **`@banana-universe/adapter-fastify`** is an experimental stub.

## Static helpers

- **`BananaRouter`** — mount generated routes into an existing Express app (incremental migration)
- **`BananaApp.getRouteTable()`** — introspection for tooling

## WebSocket

Real-time features use **`@banana-universe/plugin-websocket`** (see [WebSocket plugin](/plugins/websocket)). It is a **`BananaPlugin`** and requires **`attachToServer(httpServer)`** after `listen()`.

## Next

- [Plugins overview](/plugins/overview)
- [Enterprise roadmap](/guide/roadmap) — DDD package, LLM generator, example apps
