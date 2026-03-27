# BananaAppOptions

`BananaApp` is created with:

```typescript
new BananaApp(controllers: Constructor[], options?: BananaAppOptions)
```

Use **`BananaApp.create(controllers, options)`** when you need **async plugin registration** (`plugins` array).

## Declarative bootstrap (optional)

- **`defineBananaAppOptions({ services, ... })`** — merges **`services`** (Awilix resolvers) into a container and returns **`BananaAppOptions`**
- **`createBananaContainer(registrations)`** — `createContainer()` + `register()` in one call

See **`packages/bananajs/src/lib/DI/bananaBootstrap.ts`**.

## `BananaAppOptions` fields (summary)

The interface is defined in **`packages/bananajs/src/lib/Core/App.ts`**. Below is a **conceptual** grouping; see TypeDoc for exact optional/required fields.

### Core

- **`middlewares`** — `RequestHandler[]` applied after framework defaults and before controller routes
- **`security`** — `{ helmet?: boolean \| HelmetOptions; cors?: CorsOptions \| false }` — helmet and CORS are applied by default unless disabled
- **`requestId`** — boolean, default `true`; enables `X-Request-ID` handling
- **`logger`** — `Logger` instance or `false` to disable built-in logging
- **`container`** — **awilix** `AwilixContainer` for `@Injectable` controllers/services
- **`gracefulShutdown`** — register signal handlers for clean process exit

### Auth & docs

- **`auth`** — `{ guard: AuthGuard }` for `@Auth` / `@Roles` / `@Public`
- **`swagger`** — OpenAPI JSON + UI (`enabled`, `path`, `title`, `version`, `description`, …)

### Operational

- **`rateLimit`** — global rate limit config or `false`
- **`health`** — `{ enabled, path?, checks? }` for **`GET /health`**
- **`metrics`** — Prometheus metrics endpoint (`prom-client` peer)
- **`devTools`** — expose **`GET /_banana/routes`** in non-production

### Plugins & cache

- **`plugins`** — `BananaPlugin[]`; register in order; async work in `register()` requires **`BananaApp.create`**
- **`cache`** — `{ store?: 'memory' \| CacheStore }` for `@Cache` / `@CacheEvict`

### Security, tenancy, and performance

- **`abac`** — `{ guard: AbacGuard }` for `@Can`
- **`tenant`** — tenant resolution options (see `TenantOptions` in TypeDoc)
- **`lazyControllers`** — defer controller instantiation until first request

## `RouteInfo`

`BananaApp.prototype.getRouteTable(): RouteInfo[]` returns `{ method, path, controller, handler }` for tooling.

## Related

- [Advanced concepts](/guide/advanced-concepts)
- [TypeDoc: `BananaApp`](/api/classes/BananaApp.md), [`BananaAppOptions`](/api/interfaces/BananaAppOptions.md)
