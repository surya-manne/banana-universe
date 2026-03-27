# Agent Memory

Generalized reusable lessons from agent sessions.
Root causes converted into preventive rules, not incident-specific notes.
Entries are h3 headers with [ACTIVE|RETIRED] status.
Content: brief, grep-friendly, MECE across sections. Style: one-liner per entry, optional sub-bullets for context.

## Preventive Rules

### [ACTIVE] Import path depth from lib/Validator/ to lib/Response/ is `../` not `../..//`

- `src/lib/Validator/` → `src/lib/Response/ApiError` requires `../Response/ApiError` (one level up)
- Two levels up (`../../Response/`) would exit `lib/` into `src/` — wrong

### [ACTIVE] Opt-in deps belong in peerDependencies with peerDependenciesMeta.optional=true

- DI containers, adapters, plugins that users choose to install must be peerDeps
- Hard deps in dependencies[] force all users to pay the bundle cost even if unused
- `import type { ... }` ensures zero runtime cost; types still available at compile time

### [ACTIVE] `noImplicitReturns: true` — async catch blocks must explicitly return

- `catch (error) { next(error) }` fails strict TypeScript — must be `catch (error) { return next(error) }`
- Applies to every async route handler wrapper in Express

### [ACTIVE] BananaTestApp security merge must be deep, not shallow

- Spreading `...options` over `security: { helmet: false, cors: false }` replaces the entire security object
- Pattern: `security: { helmet: false, cors: false, ...options.security }` preserves test-safe defaults

## What Worked

### Parallel 4-stream subagent delegation for non-overlapping file sets

- Streams A (Validator/Route), BC (App+framework), D (testing), E (CLI) have zero file overlap
- All 4 ran in parallel, reviewer subagent found only minor issues (no critical)
- Pre-installing all npm deps before dispatching subagents prevents race conditions

## What Failed

### tsc binary resolution in npm workspaces sandbox

- `npx tsc` installs a stale wrapper, not the workspace TypeScript
- Use `./packages/bananajs-cli/node_modules/typescript/bin/tsc` or Nx for accurate type-checking
- ReadLints tool is more reliable for checking in-IDE language server errors

## Discoveries

### `pino-http` is not needed for basic logging — `pino` alone is sufficient

- `PinoLogger` wraps pino directly; request-level middleware logging would need pino-http
- Remove it if not wired; add it back in Phase 2 observability work

### `async_hooks` AsyncLocalStorage works well as Express middleware via `storage.run(data, () => next())`

- Context persists through the full async request lifecycle in Node.js ≥ 16
