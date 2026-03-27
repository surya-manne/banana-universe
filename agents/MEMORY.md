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

### [ACTIVE] `require()` is invalid in ESM output — use `import()` or static `import`

- `module: "nodenext"` outputs ES modules; `require` is not defined at runtime
- For required peer deps: use static `import { fn } from 'package'` — always safe
- For optional peer deps: use `await import('package')` inside lazy wrapper middleware
- `require()` silently fails at runtime (caught by try/catch) but produces incorrect output — not just a type error

### [ACTIVE] TypeScript class decorator target is `Function` type but use `object` instead

- `ClassDecorator` stdlib uses `Function`, but `@typescript-eslint/no-unsafe-function-type` forbids `Function`
- Fix: type the target as `object` (constructors are objects); cast in `Reflect.defineMetadata` call as needed
- For dual class+method decorators: discriminate on `propertyKey !== undefined`, not on type

### [ACTIVE] TypeScript control flow narrows `let` mutations inside forEach callbacks

- `let status: Union = 'initial'` mutated inside `.forEach(cb)` — TS narrows to initial value after loop
- Fix: read from an object property (`response.status`) instead of the mutated variable, or use `for...of`
- Applies to any `HealthStatus`, `string`, or union-typed variable mutated inside a closure

### [ACTIVE] Optional peer deps used in dev need devDependencies install for tsc compilation

- `peerDependencies` with `optional: true` are not auto-installed; `import type` still needs the package on disk
- Add them to `devDependencies` (without semver pinning) so `tsconfig.lib.json` type-checks pass
- Example: `awilix`, `express-rate-limit` added as devDeps to allow tsc to resolve their types

### [ACTIVE] `@ApiResponse` decorator name conflicts with existing `ApiResponse` base class

- Both are legitimate exports but cannot coexist in a flat `export *` namespace
- Resolution: name the decorator `@ApiResponseDoc` and document the deviation
- Rule: before naming new decorators/classes, grep the existing public API for conflicts

## What Worked

### Parallel 4-stream subagent delegation for non-overlapping file sets

- Streams A (Validator/Route), BC (App+framework), D (testing), E (CLI) have zero file overlap
- All 4 ran in parallel, reviewer subagent found only minor issues (no critical)
- Pre-installing all npm deps before dispatching subagents prevents race conditions

### Phase 2 parallel 4-stream delegation pattern (Auth, OpenAPI, RateLimit+Upload+Health, Config+Pagination+TestApp)

- Foundation tasks (MetadataKeys, BananaAppOptions stubs) done first by orchestrator, then 4 streams in parallel
- Each stream had zero file overlap — no merge conflicts
- Lazy middleware wrappers in App.ts allowed sync constructor + async optional peer dep loading

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
