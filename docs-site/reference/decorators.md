# Decorators & public API

Hand-written overview; generated signatures live under [**/api/**](/api/) (TypeDoc from `packages/bananajs/src/index.ts`).

## Routing

| Export                                  | Role                                                               |
| --------------------------------------- | ------------------------------------------------------------------ |
| `Controller`                            | Class — base **segment** (no leading `/`; joined by the framework) |
| `Get`, `Post`, `Put`, `Patch`, `Delete` | Method — path segment + optional route middlewares                 |

## Request validation

| Export                               | Role                                    |
| ------------------------------------ | --------------------------------------- |
| `Body`, `Params`, `Query`, `Headers` | **Zod** schemas (`z.ZodType`) per slice |

## Responses (success)

| Export                                                          | Role                           |
| --------------------------------------------------------------- | ------------------------------ |
| `BaseController`                                                | `ok` / `error` helpers         |
| `SuccessResponse`, `PaginatedResponse`, `PaginationQuerySchema` | Typed JSON / list query schema |

## Errors

| Export                  | Role                                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiError` + subclasses | `BadRequestError`, `UnauthorisedError`, `PaymentRequiredError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `TooManyRequestsError`, `InternalError`, `BadGatewayError`, `ServiceUnavailableError`, `GatewayTimeoutError` |
| `ApiError.handle`       | Maps error type to HTTP response                                                                                                                                                                                                 |

## Middleware

| Export                                                                                               | Role                                |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `ErrorMiddleware`, `createErrorMiddleware`                                                           | Central error handler               |
| `requestContextMiddleware`                                                                           | AsyncLocalStorage context           |
| `createHealthEndpoint`, `createMetricsMiddleware`, `createMetricsEndpoint`, `createDevToolsEndpoint` | Operational endpoints (see options) |

## Auth & security

| Export                    | Role                     |
| ------------------------- | ------------------------ |
| `Auth`, `Roles`, `Public` | Auth decorators          |
| `RateLimit`, `Throttle`   | Rate limiting            |
| `Sanitize`, `Can`         | Input sanitization, ABAC |
| `Upload`                  | Multipart uploads        |

## Tenancy & cache

| Export                                                             | Role                 |
| ------------------------------------------------------------------ | -------------------- |
| `Tenant`, `getTenantId`, `runWithTenant`, `createTenantMiddleware` | Multi-tenancy        |
| `Cache`, `CacheEvict`, `CacheManager`                              | Method-level caching |

## OpenAPI

| Export                                                 | Role                       |
| ------------------------------------------------------ | -------------------------- |
| `ApiTags`, `ApiOperation`, `ApiBody`, `ApiResponseDoc` | Swagger / OpenAPI metadata |

## DI & app wiring

| Export                       | Role                                            |
| ---------------------------- | ----------------------------------------------- |
| `Injectable`, `isInjectable` | Awilix registration                             |
| `BananaApp`, `BananaRouter`  | Application entry, incremental Express adoption |
| `BananaConfig`               | Typed environment configuration (schema-based)  |

## Plugin & adapter types

| Export                                | Role                           |
| ------------------------------------- | ------------------------------ |
| `BananaPlugin`, `AppContext`          | Plugin contract                |
| `FrameworkAdapter`, `RouteDefinition` | Future multi-framework support |

## Testing

| Module                              | Role                                         |
| ----------------------------------- | -------------------------------------------- |
| `@banana-universe/bananajs/testing` | `BananaTestApp` and helpers (subpath export) |

## Implementation note

Decorators use **explicit `Reflect.defineMetadata`** — consistent with **`emitDecoratorMetadata: false`** in `tsconfig.base.json`.
