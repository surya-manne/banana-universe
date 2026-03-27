# Basic Concepts

These are the **foundations**—routing, validation, responses, errors—that everything else builds on. The surface is already **broad** (see [Advanced concepts](/guide/advanced-concepts)); this page grounds you in the core. Public API: `packages/bananajs/src/index.ts`.

## Controllers and routes

- **`@Controller(basePath)`** — class decorator; sets the URL prefix for all routes on that class.
- **`@Get` / `@Post` / `@Put` / `@Patch` / `@Delete`** — method decorators; signature `(path, ...middlewares?)`. Routes are registered on an Express `Router` per controller.

Controllers are passed to **`BananaApp`** as **constructors** (not instances). The framework reads metadata at startup and wires Express.

## Validation: body, query, params, headers

These decorators **replace the handler** with a wrapper that:

1. Hydrates a DTO with **class-transformer** (`plainToInstance`)
2. Validates with **class-validator** (`validate` with whitelist / forbid non-whitelisted)
3. On failure — responds with **400** and validation detail; your method is not called
4. On success — calls your original method

| Decorator            | Validates                                 |
| -------------------- | ----------------------------------------- |
| `@Body(DtoClass)`    | `req.body`                                |
| `@Query(DtoClass)`   | `req.query`                               |
| `@Params(DtoClass)`  | `req.params`                              |
| `@Headers(DtoClass)` | `req.headers` (normalized for validation) |

Use **separate DTO classes** per concern (create vs update vs list filters).

## Success responses

**`SuccessResponse<T>`** carries a message, optional HTTP status, and **`data: T`**. Call **`.send(res)`** to write JSON.

Shape is consistent across endpoints (`statusCode`, `status`, `message`, `data`).

## Errors

Throw subclasses of **`ApiError`** (e.g. **`NotFoundError`**, **`BadRequestError`**, **`UnauthorisedError`** — UK spelling in the framework). Use **`ErrorMiddleware`** (or **`createErrorMiddleware(logger?)`**) as the Express error handler so **`ApiError.handle`** maps types to typed HTTP responses.

Unknown errors are treated as internal failures; in **production**, internal error messages are not leaked.

See [Error types](/reference/error-types) for the full list.

## Logging and request context

`BananaAppOptions` can supply a **`Logger`** (default **Pino**). **Request context** uses **AsyncLocalStorage** for correlation IDs when **`requestId`** is enabled.

## Middleware order (mental model)

1. Framework security (helmet, cors, request ID) — unless disabled in options
2. Global **`middlewares`** from options
3. Plugin **`register`** hooks (see [Plugins overview](/plugins/overview))
4. Route registration
5. Error middleware last

## Next

- [Advanced concepts](/guide/advanced-concepts) — full `BananaAppOptions`, plugins, Swagger, cache, metrics, tenancy
- [Decorators reference](/reference/decorators)
