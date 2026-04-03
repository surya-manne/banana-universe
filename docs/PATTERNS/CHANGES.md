# Patterns Changes

## R2 Upgrade — 2026-04-03

**Action:** Added 5 new patterns reflecting v0.4–v0.6 additions.

**Patterns added:**

- base-controller.md
- di-module.md
- banana-plugin.md
- cache-decorator.md
- multi-tenancy.md

**Source modules analyzed:**

- `packages/bananajs/src/lib/Controller/`
- `packages/bananajs/src/lib/DI/`
- `packages/bananajs/src/lib/Plugin/`
- `packages/bananajs/src/lib/Cache/`
- `packages/bananajs/src/lib/Tenant/`
- `packages/bananajs/src/lib/Security/`

---

## Initial Extraction — 2026-03-27

**Action:** Created all pattern files from scratch (install mode).

**Patterns created:**

- decorator-controller.md
- decorator-http-method.md
- decorator-validation.md
- decorator-factory.md
- dto-zod.md (replaces dto-class-validator.md)
- success-response.md
- api-error-typed.md
- express-error-middleware.md
- barrel-export.md

**Source modules analyzed:**

- `packages/bananajs/src/lib/Router/`
- `packages/bananajs/src/lib/Validator/`
- `packages/bananajs/src/lib/Response/`
- `packages/bananajs/src/Middleware/`
- `apps/bananajs-demo/src/App/User/`
