# Patterns Index

Recurring coding and architectural patterns extracted from the banana-universe codebase.

| Pattern File                                               | Name                         | Description                                                                            |
| ---------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| [decorator-controller.md](decorator-controller.md)         | Controller Decorator         | `@Controller(segment)` class decorator — base segment without leading/trailing slashes |
| [decorator-http-method.md](decorator-http-method.md)       | HTTP Method Decorator        | `@Get/@Post/@Put/@Patch/@Delete(path, middlewares?)` method decorators via factory     |
| [decorator-validation.md](decorator-validation.md)         | Request Validation Decorator | `@Body/@Params/@Query/Headers(zodSchema)` middleware-wrapping method decorators        |
| [decorator-factory.md](decorator-factory.md)               | Decorator Factory            | Factory function returning a method decorator, avoiding duplication across HTTP verbs  |
| [dto-zod.md](dto-zod.md)                                   | Zod request schemas          | Zod schemas with `@Body` / `@Query` / `@Params` / `@Headers`                           |
| [success-response.md](success-response.md)                 | Success Response             | Standardized `new SuccessResponse(message, data).send(res)` pattern                    |
| [api-error-typed.md](api-error-typed.md)                   | Typed API Error              | Concrete error class extending `ApiError` with a specific `ErrorType` enum value       |
| [express-error-middleware.md](express-error-middleware.md) | Express Error Middleware     | 4-argument Express error handler that delegates to `ApiError.handle`                   |
| [barrel-export.md](barrel-export.md)                       | Barrel Export                | `index.ts` re-exporting all public API members from sub-modules                        |
| [base-controller.md](base-controller.md)                   | BaseController               | Extend `BaseController` for `ok()`/`error()` helpers; `return next(error)` in catch   |
| [di-module.md](di-module.md)                               | DI Module                    | `createModule({ id, controller, providers })` — isolated tsyringe child container      |
| [banana-plugin.md](banana-plugin.md)                       | BananaPlugin                 | `BananaPlugin` interface — `register()`/`onReady()`/`onShutdown()` lifecycle hooks     |
| [cache-decorator.md](cache-decorator.md)                   | Cache Decorator              | `@Cache({ ttl, key })` / `@CacheEvict({ pattern })` for TTL-based method caching       |
| [multi-tenancy.md](multi-tenancy.md)                       | Multi-Tenancy                | `@Tenant()` + `TenantContext` (AsyncLocalStorage) per-request tenant isolation         |
