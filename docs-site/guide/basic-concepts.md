# Basic Concepts

These are the **foundations**—routing, validation, responses, errors—that everything else builds on. The surface is already **broad** (see [Advanced concepts](/guide/advanced-concepts)); this page grounds you in the core. Public API: `packages/bananajs/src/index.ts`.

## Controllers and routes

- **`@Controller(segment)`** — class decorator; **slash-free** base segment (e.g. `'users'`, `''` for root). The framework joins segments when mounting routes.
- **`@Get` / `@Post` / `@Put` / `@Patch` / `@Delete`** — method decorators; signature `(path = '', ...middlewares?)`. Path segments are also **slash-free** (e.g. `'list'`, `':id'`, `''` for the controller root).

Controllers should extend **`BaseController`** for **`this.ok`** / **`this.error`** helpers.

Controllers are passed to **`BananaApp`** as **constructors** (not instances). The framework reads metadata at startup and wires Express.

## Validation: body, query, params, headers

These decorators wrap the handler and run **`schema.safeParse`** on the matching request slice:

1. On failure — throw **`BadRequestError`**
2. On success — assign **`result.data`** to `req` and call your method

| Decorator          | Validates                          |
| ------------------ | ---------------------------------- |
| `@Body(schema)`    | `req.body`                         |
| `@Query(schema)`   | `req.query`                        |
| `@Params(schema)`  | `req.params`                       |
| `@Headers(schema)` | `req.headers` (as consumed by Zod) |

Use **Zod** (`z.object`, `z.coerce.number()`, etc.). OpenAPI can infer request bodies from `@Body` schemas when **`@ApiBody`** is omitted.

## Success responses

**`SuccessResponse<T>`** carries a message and **`data: T`**. **`BaseController.ok(res, message, data)`** delegates to **`SuccessResponse`**.

Shape is consistent across endpoints (`statusCode`, `status`, `message`, `data`).

## Errors

Throw subclasses of **`ApiError`** (e.g. **`NotFoundError`**, **`BadRequestError`**, **`UnauthorisedError`** — UK spelling in the framework). Use **`ErrorMiddleware`** (or **`createErrorMiddleware(logger?)`**) as the Express error handler so **`ApiError.handle`** maps types to typed HTTP responses.

Unknown errors are treated as internal failures; in **production**, internal error messages are not leaked.

## App bootstrap

- **`BananaApp.create(controllers, options)`** — use when **plugins** need async `register` / `onReady` (e.g. TypeORM).
- **`createBananaApplication(controllers, { ...options, port?, onListening? })`** — optional **`listen`** in one call.
