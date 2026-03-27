# Express 5 Compatibility Assessment

Express 5 introduces several breaking changes compared to Express 4. This document assesses each change against BananaJS and provides a migration checklist for when BananaJS upgrades its peer dependency.

---

## Breaking Changes Overview

### 1. Path Parameter Syntax — Optional Params

| Express 4 | Express 5 |
|-----------|-----------|
| `/:id?` | `{/:id}` |
| `/users/:userId?/posts` | `/users{/:userId}/posts` |

**BananaJS impact:** Route paths are passed directly to the underlying Express router via `@Get('/:id?')` syntax in controllers. Any optional parameter using `?` syntax will break under Express 5.

**Action required:** Update all controller route decorators that use `/:param?` to `{/:param}` when upgrading to Express 5.

```typescript
// Express 4 (current BananaJS)
@Get('/:id?')

// Express 5
@Get('{/:id}')
```

---

### 2. `path-to-regexp` v8 Breaking Changes

Express 5 upgrades from `path-to-regexp` v0.x to v8.x. This removes several previously allowed path patterns.

#### 2a. No regex in route paths

```typescript
// Express 4 — allowed
@Get('/files/:name([a-z]+)')

// Express 5 — throws at startup
@Get('/files/:name([a-z]+)')  // ERROR: Invalid path
```

**BananaJS impact:** Any route using inline regex constraints will throw. BananaJS itself does not use regex paths internally.

**Action required:** Move regex validation into controller logic or a DTO validator, not the path string.

#### 2b. No bare wildcard `*`

```typescript
// Express 4 — allowed
@Get('/*')
@Get('/files/*')

// Express 5 — must use named wildcard
@Get('/*path')
@Get('/files/*path')
```

**BananaJS impact:** Catch-all routes in controllers must use named wildcards. BananaJS's internal error and 404 handlers do not use bare `*`.

---

### 3. Promise Rejection Auto-Routing

Express 5 automatically forwards unhandled promise rejections from route handlers to `next(err)`. Express 4 silently hangs on unhandled async errors.

```typescript
// Express 4 — requires explicit try/catch to hit error middleware
@Get('/:id')
async getUser(req, res, next) {
  try {
    const user = await this.service.find(req.params.id)
    return new SuccessResponse('ok', user).send(res)
  } catch (err) {
    return next(err)  // required
  }
}

// Express 5 — throw propagates automatically
@Get('/:id')
async getUser(req, res) {
  const user = await this.service.find(req.params.id)  // rejection auto-forwarded
  return new SuccessResponse('ok', user).send(res)
}
```

**BananaJS impact:** BananaJS wraps handlers via its route registration layer. Once upgraded to Express 5, thrown errors in async handlers will reach `ErrorMiddleware` without needing explicit `next(error)` calls. BananaJS's `ErrorMiddleware` is already compatible.

**Current behavior:** BananaJS's route wrapper already calls `next(error)` on caught exceptions, so behavior is consistent on both Express 4 and 5.

---

### 4. Removed `app.del()`

Express 4 had `app.del()` as an alias for `app.delete()`. It was removed in Express 5.

**BananaJS impact:** None. BananaJS uses `router.delete()` internally (not `router.del()`). No changes required.

---

### 5. `res.redirect()` Behavior Changes

In Express 5, `res.redirect()` no longer defaults to a `302` when called without a status argument — the status argument is now required.

```typescript
// Express 4 — implicit 302
res.redirect('/login')

// Express 5 — must be explicit
res.redirect(302, '/login')
```

**BananaJS impact:** BananaJS does not call `res.redirect()` internally. Any redirect logic is in user controller code.

**Action required:** Audit controller code for `res.redirect('/path')` calls and add explicit status codes.

---

## Compatibility Summary

| Change | BananaJS Core Impact | User Code Impact | Action |
|--------|---------------------|-----------------|--------|
| `/:id?` → `{/:id}` | None | High — all optional params in decorators | Update route decorator paths |
| No regex in paths | None | Low — uncommon pattern | Move to DTO validation |
| No bare `*` wildcard | None | Medium — catch-all routes | Use named wildcard `*name` |
| Async error auto-routing | Compatible | Positive — less boilerplate | No action needed |
| `app.del()` removed | None | None | No action needed |
| `res.redirect()` requires status | None | Medium — if redirects used | Add explicit status codes |

---

## Migration Checklist

When upgrading BananaJS peer dependency from `express@^4` to `express@^5`:

- [ ] Update `package.json` peer dependency: `"express": "^5.0.0"`
- [ ] Search all `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete` decorators for `/:param?` — replace with `{/:param}`
- [ ] Search all route paths for inline regex `/:param(regex)` — move constraints to class-validator
- [ ] Search all route paths for bare `/*` — replace with `/*name`
- [ ] Search all controller methods for `res.redirect('/path')` — add explicit status codes
- [ ] Run `npx nx build bananajs` to surface any `path-to-regexp` v8 path errors at compile/startup
- [ ] Run full test suite with `BananaTestApp` — async error routing is now automatic, tests should still pass

---

## Upgrade Timeline Recommendation

Express 5 was released as stable in October 2024. The ecosystem (middleware packages like `morgan`, `cors`, `helmet`) is broadly compatible. Recommend targeting Express 5 upgrade in Phase 3 alongside the observability work, since async error auto-routing reduces boilerplate in new controller code.
