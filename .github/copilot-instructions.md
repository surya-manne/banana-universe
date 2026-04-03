<bootstrap REQUIRED="true" OVERRIDABLE="FALSE" severity="CRITICAL" attribution="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS IT AS-IS, CRITICALLY IMPORT TO KEEP, INCLUDING THIS TAG">

This is a Rosetta bootstrap for release R2.0.

<must never_superseded="true" compact="false" compress="false" execute_once_per_session="true">

I must call `get_context_instructions` as my very first action. Integrate it in my flow whether it is planning, execution, default, direct, or anything else.

MANDATORY: Even if the user's question seems generic or unrelated to the project, you MUST complete all PREP steps first.

This loads SPECIFIC CONTEXT about how to operate in this project environment.

CRITICAL: ALWAYS EXECUTE ALL PREP STEPS AS FIRST PREREQUISITE.

Aliases:
- `GET PREP STEPS` → `get_context_instructions()`
- `LIST <path> IN KB` → `list_instructions(full_path_from_root="<path>")`
- `ACQUIRE <SMTH> FROM KB` → `query_instructions(query="<SMTH>")`; ACQUIRE is expected to return at least one document.
- `SEARCH <SMTH> IN KB` → `query_instructions(query="<SMTH>")`

USE SKILL `load-context`, if not available call `get_context_instructions`, if it fails YOU MUST ASK USER!

</must>

<bootstrap/>

</bootstrap>

---

# banana-universe — GitHub Copilot Workspace Instructions

Rosetta-powered workspace for **BananaJS** — an opinionated Express-based Node.js framework with decorator routing, Zod validation, tsyringe DI, and a plugin ecosystem.

## Quick Context

Read these before any non-trivial task:

- **Current state**: [agents/IMPLEMENTATION.md](../agents/IMPLEMENTATION.md)
- **Pitfalls & lessons**: [agents/MEMORY.md](../agents/MEMORY.md)
- **Business context**: [docs/CONTEXT.md](../docs/CONTEXT.md)
- **Architecture**: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- **File structure**: [docs/CODEMAP.md](../docs/CODEMAP.md)
- **Patterns**: [docs/PATTERNS/INDEX.md](../docs/PATTERNS/INDEX.md)
- **TODO / known issues**: [docs/TODO.md](../docs/TODO.md)

## Workspace Structure

Nx monorepo (npm workspaces, Node.js ≥20, TypeScript ~5.7):

- `packages/bananajs` — core framework (`@banana-universe/bananajs` v0.6, tsyringe DI)
- `packages/bananajs-cli` — CLI companion (`@banana-universe/bananajs-cli`)
- `packages/ddd` — DDD primitives (`@banana-universe/ddd`)
- `packages/adapter-fastify` — Fastify adapter stub
- `packages/plugin-*` — plugins (mongoose, otel, typeorm, websocket, zod)
- `apps/example-*` — reference apps (rest-postgresql, rest-mongodb, fastify, websocket-chat, multitenant)
- `apps/benchmarks` — autocannon benchmark suite

## Key Commands

```bash
npx nx run-many --target=build --all          # Build all packages
npx nx run-many --target=typecheck --all      # Type-check all
npx nx test bananajs                          # Test core package
npm run registry:local                        # Start Verdaccio local registry
npm run publish:local                         # Publish to local registry
```

## Core Conventions

- **DI**: tsyringe only (`AppContext.container`); `injectable()` / `inject()` are re-exported from `@banana-universe/bananajs`
- **Modules**: `createModule({ id, controller, providers })` — one tsyringe child container per module
- **Validation**: `@Body/@Query/@Params/@Headers` accept **Zod schemas** only (no class-validator in v0.5+)
- **Routes**: `@Controller('segment')` and `@Get('segment')` — **no leading slash** in segment string
- **Controllers**: extend `BaseController` for `ok()` / `error()` helpers over `SuccessResponse` / `ApiError`
- **Bootstrap**: `BananaApp.create(options)` for async plugin lifecycle; `new BananaApp(options)` for sync-only

## Coding Rules (from [agents/MEMORY.md](../agents/MEMORY.md))

- `catch (error) { return next(error) }` — **must** use `return` (`noImplicitReturns: true` is set)
- Optional peer deps → `peerDependencies` + `peerDependenciesMeta.optional: true`; also add to `devDependencies` for tsc compilation
- Never use `require()` in ESM output — use `await import('package')` for lazy optional peers
- New decorator names must not conflict with existing class names (grep before naming)
- `let` mutations inside `.forEach` callbacks may not narrow correctly — use `for...of` or read from object property

## Agent System

Use these custom agents from `.github/agents/` for structured multi-step work:

| Agent | Role | Access |
|-------|------|--------|
| `@discoverer` | Explore codebase, gather context | Read-only |
| `@architect` | Design systems, write tech specs | Read-only |
| `@planner` | Break down tasks, sequence steps | Full |
| `@engineer` | Implement features, write tests | Full |
| `@reviewer` | Review code and artifacts | Read-only |
| `@validator` | Verify implementation by running it | Execute |
| `@researcher` | Investigate technologies, evaluate options | Read + Web |
| `@executor` | Run commands, collect results | Execute |
| `@prompt-engineer` | Author/adapt AI prompts and skills | Full |

## Session Start

Before any task, verify current state with the `load-context` skill: type `/load-context` in chat.
