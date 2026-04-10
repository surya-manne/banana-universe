---
name: Security Baseline V1
overview: |
  First security baseline for banana-universe. Covers OWASP Top 10 gaps across
  the bananajs framework core (body limits, logging redaction, CORS hardening,
  sensitive config, distributed throttling), CI/CD supply-chain controls
  (npm audit, Dependabot, CodeQL), security documentation, and regression tests.
  17 tasks across 4 groups. Applies to v0.6+.
---

# Security Baseline Plan — V1

**Status:** Approved for implementation  
**Date:** 2026-04-08  
**Scope:** MEDIUM-LARGE (17 tasks, 4 groups, ~12 files created or modified)  
**Workflow:** `coding-flow`

---

## Context

BananaJS ships with helmet, cors, Zod validation, `@Sanitize`, `@RateLimit`/`@Throttle`, `AuthGuard`, ABAC,
and `BananaConfig` with `sensitive` field support. These are solid primitives, but several default
configurations leave exploitable gaps for consumers:

| Gap | Risk |
|---|---|
| `express.json()` has no body size limit | DoS via oversized payloads (A05) |
| `express.urlencoded({ extended: true })` | Prototype pollution vector (A03) |
| `PinoLogger` has no `redact` paths | Sensitive field leak in logs (A09) |
| `security.cors` emits no warning for wildcard origins | Misconfiguration silent failure (A05) |
| `BananaConfig` `sensitive` fields serialisable via `JSON.stringify` | Secret leak in error responses (A02) |
| `@Throttle` is in-memory only | Bypassed in multi-instance deployments (A07) |
| No CI npm audit / Dependabot / CodeQL | Supply chain / known CVEs undetected (A06) |
| No security hardening guide or recipes | Consumers misconfigure by default (A05) |

**OWASP coverage:** A02 (Cryptographic Failures), A03 (Injection), A05 (Misconfiguration),
A06 (Vulnerable Components), A07 (Auth Failures), A09 (Security Logging Failures).

---

## Group A — Framework Core Hardening

### Task 1 — Configurable request body size limit

- **Goal:** Prevent DoS via oversized request payloads.
- **Files:**
  - `packages/bananajs/src/lib/Core/App.ts`
    — add `bodyLimit?: string` to `BananaAppOptions`; default `'1mb'`;
      pass `{ limit: bodyLimit }` to both `express.json()` and `express.urlencoded()`.
- **Depends on:** none
- **Done when:** `BananaAppOptions.bodyLimit` accepted; `express.json({ limit })` set; typecheck passes.

---

### Task 2 — Fix `urlencoded` prototype pollution vector

- **Goal:** Remove deeply nested object parsing that enables prototype pollution.
- **Files:**
  - `packages/bananajs/src/lib/Core/App.ts`
    — change `express.urlencoded({ extended: true })` → `extended: false`.
- **Depends on:** none
- **Done when:** `urlencoded` uses `extended: false`; existing tests pass; typecheck passes.

---

### Task 3 — PinoLogger sensitive field redaction

- **Goal:** Prevent accidental logging of passwords, tokens, and secrets.
- **Files:**
  - `packages/bananajs/src/lib/Logger/PinoLogger.ts`
    — add default `redact: { paths: ['password','token','authorization','cookie','*.secret','*.apiKey'], censor: '[REDACTED]' }` to pino options;
      merge with caller-supplied `options.redact` (caller paths take precedence).
- **Depends on:** none
- **Done when:** Default sensitive paths are redacted in log output; custom `redact` override works; typecheck passes.

---

### Task 4 — Export `HelmetOptions` type alias

- **Goal:** Expose a typed surface for helmet CSP, HSTS, and other directive configuration
  so consumers do not need to cast or import from `helmet` directly.
- **Files:**
  - `packages/bananajs/src/lib/Core/App.ts`
    — add `export type HelmetOptions = Parameters<typeof helmet>[0]`.
  - `packages/bananajs/src/index.ts`
    — re-export `HelmetOptions`.
- **Depends on:** none
- **Done when:** `HelmetOptions` is importable from `@banana-universe/bananajs`; typecheck passes.

---

### Task 5 — CORS wildcard warning and `createCorsOptions` helper

- **Goal:** Surface misconfigured wildcard CORS at startup; provide a strict allowlist helper.
- **Files:**
  - `packages/bananajs/src/lib/Core/App.ts`
    — add runtime `logger.warn(...)` when `security.cors` is set but has no `origin` property
      (wildcard default is active).
  - `packages/bananajs/src/lib/Security/cors.helper.ts` *(new)*
    — export `createCorsOptions(allowedOrigins: string[]): CorsOptions`
      returning `{ origin: allowedOrigins, credentials: true }`.
  - `packages/bananajs/src/index.ts`
    — export `createCorsOptions`.
- **Depends on:** none
- **Done when:** Warning logged for wildcard CORS on startup; `createCorsOptions` exported; typecheck passes.

---

### Task 6 — Distributed throttle store interface

- **Goal:** Allow `@Throttle` to consume an external (e.g. Redis) store for multi-instance deployments.
- **Files:**
  - `packages/bananajs/src/lib/Security/ThrottleStore.interface.ts` *(new)*
    — define `ThrottleStore` interface: `consume(key: string): Promise<void>`, `reset(key: string): Promise<void>`.
  - `packages/bananajs/src/lib/Security/Throttle.decorator.ts`
    — add optional `store?: ThrottleStore` to `ThrottleOptions`.
  - `packages/bananajs/package.json`
    — add `rate-limiter-flexible >=2.0.0` as optional peer dep.
  - `packages/bananajs/src/index.ts`
    — export `ThrottleStore`.
- **Depends on:** none
- **Done when:** `ThrottleOptions.store` accepted; default remains in-memory; typecheck passes.

---

### Task 7 — `BananaConfig` sensitive field serialisation guard

- **Goal:** Prevent `JSON.stringify(config.get())` leaking secrets (e.g. via error response serialisation).
- **Files:**
  - `packages/bananajs/src/lib/Config/BananaConfig.ts`
    — after `buildConfig`, iterate `sensitive: true` entries and replace their values
      with non-enumerable getters that return the real value for code use
      but emit `[REDACTED]` via a `toJSON()` override on the frozen config object.
- **Depends on:** none
- **Done when:** `JSON.stringify(config.get())` emits `[REDACTED]` for sensitive fields;
  `config.get().fieldName` still returns real value; unit test passes.

---

## Group B — CI/CD Supply Chain Controls

### Task 8 — `npm audit` GitHub Actions workflow

- **Goal:** Fail PRs and main-branch pushes on high/critical CVEs automatically.
- **Files:**
  - `.github/workflows/security-audit.yml` *(new)*
    — triggers on `push` (branches: `[main]`) and `pull_request`;
      steps: `actions/checkout@v4`, `actions/setup-node@v4` (node-version: 20, cache: npm),
      `npm ci`, `npm audit --audit-level=high`.
- **Depends on:** none
- **Done when:** Workflow YAML is valid; `npm audit` step fails build on high CVEs.

---

### Task 9 — Dependabot configuration

- **Goal:** Automate security-update PRs for npm packages across all workspaces weekly.
- **Files:**
  - `.github/dependabot.yml` *(new)*
    — `package-ecosystem: npm`, `directory: /`, `schedule: { interval: weekly }`,
      group `security-updates` with `applies-to: security-updates`;
      add additional entries for `packages/bananajs`, `packages/bananajs-cli`,
      `packages/plugin-*`, `apps/example-*`.
- **Depends on:** none
- **Done when:** `.github/dependabot.yml` is valid; covers root + all workspace subdirectories.

---

### Task 10 — CodeQL static analysis workflow

- **Goal:** Detect injection, prototype pollution, and OWASP-class vulnerabilities on every PR.
- **Files:**
  - `.github/workflows/codeql.yml` *(new)*
    — language: `javascript-typescript`; build-mode: `none`;
      triggers: `push` (main), `pull_request`, schedule weekly Monday 08:00 UTC;
      action version pinned with full commit SHA.
- **Depends on:** none
- **Done when:** Workflow YAML is valid; CodeQL action pinned by SHA; analysis covers `packages/`.

---

## Group C — Security Documentation

### Task 11 — Security hardening guide

- **Goal:** Authoritative guide covering all BananaJS security primitives mapped to OWASP Top 10.
- **Files:**
  - `docs-site/guide/security.md` *(new)*
    — sections: Security Headers (Helmet CSP/HSTS config), CORS (createCorsOptions, origin allowlist),
      Rate Limiting (@RateLimit / @Throttle distributed), Authentication (AuthGuard patterns),
      Authorisation (ABAC / @Can), Input Validation (Zod schemas), Sanitisation (@Sanitize),
      Secrets Management (BananaConfig sensitive fields), SQL/NoSQL Injection Prevention,
      Logging & Redaction (PinoLogger redact paths).
- **Depends on:** Tasks 4, 5 (guide references final APIs)
- **Done when:** All 10 sections present with code examples; cross-links to API reference.

---

### Task 12 — Auth recipes (JWT and cookie)

- **Goal:** Reference implementations of the two most common auth patterns with secure defaults.
- **Files:**
  - `docs-site/recipes/jwt-auth.md` *(new)*
    — complete JWT AuthGuard example; token extraction from `Authorization` header;
      signed-verification using `jsonwebtoken`; error handling via `UnauthorisedError`.
  - `docs-site/recipes/cookie-auth.md` *(new)*
    — cookie-based AuthGuard with `HttpOnly: true`, `Secure: true`, `SameSite: Strict`;
      session validation pattern.
- **Depends on:** Task 11
- **Done when:** Both files compile as TypeScript snippets; secure flag patterns explicit.

---

### Task 13 — OpenAPI security scheme documentation

- **Goal:** Show consumers how to declare Bearer JWT and API Key `securitySchemes` in swagger options and map them to routes.
- **Files:**
  - `docs-site/integrations/auth.md`
    — add section: OpenAPI security schemes example (Bearer, API Key) in `swagger` option;
      show per-route `@ApiSecurity` decorator usage.
  - `packages/bananajs/src/lib/OpenAPI/ApiDoc.decorators.ts`
    — audit: verify `@ApiSecurity(scheme)` decorator is exported; add if missing.
  - `packages/bananajs/src/index.ts`
    — ensure `ApiSecurity` is exported if new.
- **Depends on:** Task 11
- **Done when:** Security scheme example renders in docs; `@ApiSecurity` available from package.

---

## Group D — Security Regression Tests

### Task 14 — Security headers and CORS warning tests

- **Goal:** Verify default `BananaApp` emits correct security headers and logs CORS wildcard warning.
- **Files:**
  - `packages/bananajs/src/lib/Core/__tests__/security-headers.test.ts` *(new)*
    — uses `BananaTestApp`; asserts `X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`;
      verifies CORS warning is logged when no `origin` is set.
- **Depends on:** Tasks 4, 5
- **Done when:** All assertions pass; `npm test` in `packages/bananajs` green.

---

### Task 15 — Body size limit and `urlencoded` rejection tests

- **Goal:** Verify `413` on oversized body; verify deeply nested form data rejected.
- **Files:**
  - `packages/bananajs/src/lib/Core/__tests__/body-limit.test.ts` *(new)*
    — sends JSON body exceeding `bodyLimit`; expects `413 Payload Too Large`;
      sends `a[__proto__][polluted]=true`-style urlencoded body; asserts `Object.prototype` is not polluted.
- **Depends on:** Tasks 1, 2
- **Done when:** Both assertions pass; typecheck passes.

---

### Task 16 — Sensitive config redaction test

- **Goal:** Verify `JSON.stringify(config.get())` does not expose `sensitive: true` values.
- **Files:**
  - `packages/bananajs/src/lib/Config/__tests__/BananaConfig.sensitive.test.ts` *(new)*
    — sets `process.env.API_KEY = 'super-secret'`; builds config with `sensitive: true`;
      asserts `JSON.stringify` output contains `[REDACTED]` not `super-secret`;
      asserts direct `.get().apiKey` returns `super-secret`.
- **Depends on:** Task 7
- **Done when:** Both assertions pass; `npm test` green.

---

## Task 17 — Final validation pass

- **Goal:** Confirm zero regressions across all packages.
- **Commands:**
  ```bash
  npx nx run-many --target=typecheck --all
  npx nx run-many --target=build --all
  npx nx test bananajs
  ```
- **Depends on:** All Tasks 1–16
- **Done when:** All three commands exit 0.

---

## Dependency Graph

```
Tasks 1,2,3,4,5,6,7   ──┐
Tasks 8,9,10           ──┤──► Task 17
Tasks 11 (after 4,5)   ──┤
Tasks 12,13 (after 11) ──┤
Tasks 14 (after 4,5)   ──┤
Tasks 15 (after 1,2)   ──┤
Task 16 (after 7)      ──┘
```

Tasks 1–10 are fully parallelisable in two independent streams (A and B).  
Group C starts after Tasks 4 and 5 complete.  
Group D starts after their respective Group A tasks complete.

---

## OWASP Coverage Matrix

| OWASP Category | Tasks |
|---|---|
| A02 Cryptographic Failures | 7 |
| A03 Injection / XSS | 2, 5, 13, 15 |
| A05 Security Misconfiguration | 1, 2, 4, 5, 11, 12, 14 |
| A06 Vulnerable Components | 8, 9, 10 |
| A07 Auth Failures | 3, 6, 11, 12 |
| A09 Security Logging & Monitoring | 3, 14 |

---

## New Files Summary

| File | Type |
|---|---|
| `packages/bananajs/src/lib/Security/cors.helper.ts` | New |
| `packages/bananajs/src/lib/Security/ThrottleStore.interface.ts` | New |
| `packages/bananajs/src/lib/Core/__tests__/security-headers.test.ts` | New |
| `packages/bananajs/src/lib/Core/__tests__/body-limit.test.ts` | New |
| `packages/bananajs/src/lib/Config/__tests__/BananaConfig.sensitive.test.ts` | New |
| `.github/workflows/security-audit.yml` | New |
| `.github/workflows/codeql.yml` | New |
| `.github/dependabot.yml` | New |
| `docs-site/guide/security.md` | New |
| `docs-site/recipes/jwt-auth.md` | New |
| `docs-site/recipes/cookie-auth.md` | New |

## Modified Files Summary

| File | Change |
|---|---|
| `packages/bananajs/src/lib/Core/App.ts` | bodyLimit, urlencoded fix, CORS warning, HelmetOptions export |
| `packages/bananajs/src/lib/Logger/PinoLogger.ts` | Default redact paths |
| `packages/bananajs/src/lib/Config/BananaConfig.ts` | Sensitive field toJSON guard |
| `packages/bananajs/src/lib/Security/Throttle.decorator.ts` | ThrottleStore option |
| `packages/bananajs/src/index.ts` | Export HelmetOptions, createCorsOptions, ThrottleStore, ApiSecurity |
| `packages/bananajs/package.json` | Add rate-limiter-flexible optional peer dep |
| `packages/bananajs/src/lib/OpenAPI/ApiDoc.decorators.ts` | Add @ApiSecurity if missing |
| `docs-site/integrations/auth.md` | Security scheme section |
