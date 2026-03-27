# Phase 3 Plan Review — Findings

**Status: NEEDS REVISION** — 3 HIGH issues must be resolved before implementation starts.

---

## Executive Summary

The specs and plan are largely well-constructed with strong continuity from Phase 1/2 patterns. Plugin lifecycle, parallel streams, memory rule coverage, and constraint compliance are all handled correctly. Three HIGH issues require spec updates before dispatching engineer subagents.

---

## HIGH Issues

### H1: `bananajs migrate --scan` Intent Mismatch

- **Roadmap says:** "codemod for Express route files" (transforms Express routes to BananaJS decorators)
- **Spec implements:** ORM migration status scanning (runs `npx typeorm migration:show` / `npx prisma migrate status`)
- **Decision needed from user:** Which interpretation is correct?
  - Option A: Express-route codemod per roadmap (transforms route files)
  - Option B: ORM migration status scanner per spec (check pending DB migrations)
  - Option C: Rename to `bananajs db --status` for ORM scanning, reserve `migrate` for future codemod

### H2: `@InjectRepository` Injection Mechanism Unspecified

The decorator stores `{ entity, paramIndex }` metadata, but nothing in the spec defines how this metadata is consumed to actually inject repositories at controller invocation time. The decorator is dead code without the consumption mechanism.

- **Fix:** `TypeOrmPlugin.register()` should scan awilix-registered services for `INJECT_REPOSITORY` metadata and re-register them with a wrapped factory that resolves repositories from the DataSource and passes them as constructor arguments.

### H3: OTel `onReady()` Middleware Timing Incorrect

The spec says `onReady(ctx)` mounts a middleware that attaches `request.id` to spans. But by the time `onReady()` runs, `initializeControllers` has already registered routes. In Express 4.x, `app.use(mw)` after routes are registered means the middleware runs **after** route handlers — never intercepting requests.

- **Fix:** Move the `request.id` attribute middleware mounting from `onReady()` to `register()`. Since `register()` runs before `initializeControllers`, it is correctly positioned before routes.

---

## MEDIUM Issues

### M1: Container Parameter Duplication

`register(ctx: AppContext, container?: AwilixContainer)` has container in both `ctx.container` and as a standalone parameter. This causes API confusion.

- **Fix:** Remove the standalone `container?` parameter. Plugins access container via `ctx.container`.

### M2: `@Transactional` Transaction Accessibility Gap

Neither TypeORM nor Prisma `@Transactional` spec defines how the active transaction handle is accessible inside the wrapped method body. Using `this.dataSource.getRepository(Entity)` inside a `@Transactional` method will bypass the transaction.

- **Recommendation:** Use `AsyncLocalStorage` to store the active QueryRunner/tx per-request, readable via a helper (`getTransaction()`), OR document that `@Transactional` only provides transaction boundary but the tx handle is not automatically injected.

### M3: Prometheus `register` Singleton in Tests

`prom-client`'s default `register` is a global singleton. Re-registering metrics in tests throws `MetricAlreadyInRegistry`. Not addressed.

- **Fix:** Metrics middleware should call `register.clear()` in tests or use a fresh `Registry` instance.

### M4: Silent `@Cache` No-Op When Cache Not Configured

If a developer uses `@Cache({ ttl: 60 })` but doesn't pass `BananaAppOptions.cache`, the metadata is stored but never read — no warning.

- **Fix:** Add to T7: log warning if `@Cache` metadata found but `options.cache` is undefined.

### M5: T18 Missing `noImplicitReturns` Call-out

The Prometheus metrics middleware has async error paths but T18 watch-fors don't mention the `noImplicitReturns` requirement. T3/T7/T12 correctly call this out.

### M6: Dependency Diagram Missing T22/T23

The top-level diagram shows `T3 → ... → T24` without T22/T23. Should show `→ T22 → T23 → T24`.

### M7: `execSync` in T15

T15 uses `child_process.execSync` (blocking). CLI should use async `exec` wrapped in a Promise for consistency.

---

## LOW Issues

- Cache key uses `JSON.stringify(req.query)` — order-sensitive; sort keys before stringify
- T0 `emitDeclarationOnly: false` value — verify matches existing `bananajs/tsconfig.lib.json` pattern
- forEach `let` mutation reminder missing from T7/T20

---

## Items Correct — Must NOT Change

- Plugin lifecycle order: `register → initializeControllers → onReady → shutdown (reverse)`
- AppContext fields: `{ app, logger?, container? }`
- All metadata key naming (`banana:cache`, `banana:cache_evict`, etc.)
- CacheManager singleton with injectable custom store
- Cache error handling: bypass on failure, never crash request
- DevTools returning 404 (not 403) in production
- Lazy import pattern with try/catch for all optional peer deps
- `@ZodBody/@ZodQuery/@ZodParams` direct method-wrapper approach
- 5-stream parallel execution model with sequential prerequisites
- All plugin packages starting at v0.1.0 with peer on `>=0.3.0`
- T22/T23 review/fix gate before integration T24
- TC39 as documentation-only in Phase 3
- OTel `sdk.start()` in `register()` (before routes)
- `prom-client` as optional peer with `peerDependenciesMeta.optional: true`
