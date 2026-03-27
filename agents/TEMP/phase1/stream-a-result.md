# Stream A Result — Phase1-BananaJS Tasks A1–A4

**Status:** COMPLETE — all 4 tasks executed, 0 linter errors.

---

## Files Changed

1. `packages/bananajs/src/lib/Validator/Validator.decorator.ts`
2. `packages/bananajs/src/lib/Router/Route.decorator.ts`

---

## Task Outcomes

### A1 — Fix double-response crash (CRITICAL) ✅
- Added `import { BadRequestError } from '../../Response/ApiError'`
- Replaced `throw response.send({ status: 400, message })` with `throw new BadRequestError(message)` — eliminates the double-response bug (400 + unhandled-throw 500)
- Changed `error.constraints || {}` to `error.constraints ?? {}` (nullish coalescing)

### A2 — Remove duplicate import ✅
- Removed duplicate `import 'reflect-metadata'` (line 3) from `Route.decorator.ts`
- Simultaneously repositioned `import { RequestHandler } from 'express'` as the new second import line to keep imports ordered (reflect-metadata → express → local)

### A3 — Add @Headers decorator ✅
- Added `export const Headers` using `ValidationSource.HEADER` at the bottom of `Validator.decorator.ts`, matching the signature pattern of Query/Body/Params

### A4 — TypeScript `any` removal ✅
**Validator.decorator.ts:**
- `model: { new (...args: any[]): T }` → `model: new (...args: unknown[]) => T`
- `target: any` → `target: object`
- `dto: any` parameters in `Query`, `Body`, `Params`, `Headers` → `dto: new (...args: unknown[]) => unknown`

**Route.decorator.ts:**
- Imported `RequestHandler` from `'express'`
- `middlewares?: any[]` in `IRouter` interface → `middlewares?: RequestHandler[]`
- `middlewares?: any[]` in `methodDecoratorFactory` parameter → `middlewares?: RequestHandler[]`

---

## Anomalies / Observations

- JSDoc `@param {any} dto` tags in `Query` (line 50) still reference `any` in the comment text — left as-is since task scope was public API types only, not comment content. No functional impact.
- No pre-existing linter errors were present; post-change lint check returned 0 errors.
- No package installs or package.json modifications were made.

---

## Validation

- `ReadLints` on both files: **0 errors, 0 warnings**
- Both files verified by full read after edits
