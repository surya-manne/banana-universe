# Stream BC Result — Phase1-BananaJS (Tasks B1–B7, C1–C2)

## Status: COMPLETE

## Files Created

| File | Task |
|------|------|
| `packages/bananajs/src/lib/Logger/Logger.interface.ts` | B1 — Logger interface |
| `packages/bananajs/src/lib/Logger/PinoLogger.ts` | B2 — Pino-backed Logger impl |
| `packages/bananajs/src/lib/Context/RequestContext.ts` | B3 — AsyncLocalStorage request context + middleware |
| `packages/bananajs/src/lib/DI/Injectable.decorator.ts` | C1 — `@Injectable` decorator + `isInjectable` helper |

## Files Modified

| File | Task | Change |
|------|------|--------|
| `packages/bananajs/src/lib/Core/App.ts` | B4–B7, C2 | Full rewrite: `BananaAppOptions`, helmet/cors/requestId, DI container support, `getRouteTable()`, graceful shutdown, `BananaRouter` export |
| `packages/bananajs/src/Middleware/Error.middleware.ts` | B3 (error update) | Replaced `ErrorMiddleware` const with `createErrorMiddleware(logger?)` factory; `ErrorMiddleware` kept as default export for backwards compat |
| `packages/bananajs/src/index.ts` | — | Added exports for Logger, PinoLogger, RequestContext, Injectable, Error.middleware |
| `packages/bananajs/package.json` | — | Added `./testing` export entry; no version change |

## TypeScript Notes

- `_next` in error handler intentionally prefixed with `_` — Express requires 4-argument signature to recognize error handlers; unused parameter is suppressed per lint rules.
- `AwilixContainer` typed via named import from `awilix`; no `any` used.
- `Constructor<T>` generic defaults to `unknown` to avoid unsafe casts at call sites.
- `BananaRouter` return type annotated as `ReturnType<typeof Router>` for correctness.
- All `Reflect.getMetadata` calls cast explicitly rather than relying on implicit `any`.

## Anomalies / Insights

- `pino-http` is in `dependencies` but not used in this stream (no HTTP transport adapter exposed). Can be wired in a future stream if request-level structured logging is needed.
- `gracefulShutdown` registers `SIGTERM`/`SIGINT` listeners on `process`; running multiple `BananaApp` instances in the same process will accumulate listeners. Acceptable for typical single-app usage; worth noting for test environments.
- `./testing` export points to `src/testing/index.ts` which does not exist yet — handled by a separate stream. Package export registered correctly so downstream streams can reference it immediately.

## Linter

No errors or warnings on any modified/created file.
