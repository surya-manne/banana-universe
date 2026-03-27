# Phase 3 Code Review

**Status: PASS WITH HIGH SEVERITY ISSUE (fixed below)**

## Issue Summary

| #   | Severity | File                               | Description                                                              |
| --- | -------- | ---------------------------------- | ------------------------------------------------------------------------ |
| 1   | **HIGH** | `App.ts` / `metrics.middleware.ts` | Metrics middleware mounted AFTER routes — never fires for route requests |
| 2   | MEDIUM   | `App.ts`                           | `void` async endpoint setups swallow errors silently                     |
| 3   | MEDIUM   | `plugin-typeorm/src/index.ts`      | Module-level `typeormDataSource` breaks multi-DataSource silently        |
| 4   | MEDIUM   | `plugin-zod/src/index.ts`          | `ZodPlugin()` doesn't validate that `zod` is installed                   |
| 5   | MEDIUM   | `CacheManager.ts`                  | Second `getInstance(store)` silently ignores new store                   |
| 6   | MEDIUM   | `plugin-otel/src/index.ts`         | `next` cast loses `next(err)` capability                                 |
| 7   | LOW      | `bananajs-cli/src/lib/openapi.ts`  | Passes parsed JSON to openapi-typescript (v7+ expects URL/string)        |
| 8   | LOW      | `bananajs-cli/src/lib/migrate.ts`  | Base path heuristic produces incorrect results for deep paths            |
| 9   | LOW      | `bananajs-cli/src/lib/routes.ts`   | Handler-detection regex fails on decorators with nested parens           |

## Resolution

- Issue #1: Fixed in App.ts — metrics middleware now mounted before routes
- Issue #4: Fixed in plugin-zod — ZodPlugin validates zod availability
- Issue #6: Fixed in plugin-otel — next cast updated
- Issue #7: Fixed in openapi.ts — passes file URL
- Issues #2,3,5,8,9: Documented as known limitations

## Items Correct — Do NOT Change

See full review in agents/TEMP/phase3/ for complete list.
All Phase 3 features implemented. Build passes (tsc exit 0 on all 6 packages).
