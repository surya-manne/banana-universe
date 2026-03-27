---
name: EnterpriseRoadmapV3
overview: 'Create plans/EnterpriseRoadmapV3.md covering four new phases: a VitePress documentation site (published to GitHub Pages via Actions), a Domain/Persistence/Infrastructure layered architecture package, a packaged local+cloud LLM plugin, and a set of runnable example recipe apps.'
todos:
  - id: v3-roadmap-file
    content: Create plans/EnterpriseRoadmapV3.md with Phase 5-8 full specification (docs site, DDD package, LLM plugin, example apps)
    status: pending
  - id: v3-phase5-docs
    content: 'Phase 5: VitePress docs site scaffold, content structure, GitHub Actions (docs.yml, ci.yml, publish.yml)'
    status: pending
  - id: v3-phase6-ddd
    content: 'Phase 6: packages/ddd package with Entity/ValueObject/AggregateRoot/Repository primitives, CLI generate module update, TypeORM/Prisma adapters'
    status: pending
  - id: v3-phase7-llm
    content: 'Phase 7: LLM-powered module code generator in bananajs-cli — offline Ollama default, cloud optional, generates full DDD modules from description/schema'
    status: pending
  - id: v3-phase8-examples
    content: 'Phase 8: apps/example-rest-postgresql, example-rest-mongodb, example-websocket-chat, example-multitenant — all with DDD layered structure'
    status: pending
isProject: false
---

# EnterpriseRoadmapV3 Plan

## What is being created

A single new file: `plans/EnterpriseRoadmapV3.md` — the Phase 5–8 continuation of `plans/EnterpriseRoadmapV2.md`.

Current state (Phases 1–4 complete, v0.4.0):

- Framework core: decorators, auth, OpenAPI, plugins, caching, multi-tenancy, security
- CLI: scaffold, generate, AI commands
- Plugins: TypeORM, Prisma, OTel, Zod, WebSocket
- Existing demo: `apps/bananajs-demo` (single controller, flat structure)

---

## Phase 5 — Documentation & GitHub Publishing (Months 0–3)

**Goal:** Public-facing docs site deployed to GitHub Pages; framework is discoverable and learnable.

### 5.1 Documentation site

- Tool: **VitePress** (lightweight, Markdown-based, Vue-powered)
- Location: `docs-site/` at workspace root (separate from `docs/` Rosetta files)
- GitHub Pages: deploy via `gh-pages` branch + Actions workflow `.github/workflows/docs.yml`

### 5.2 Content structure

```
docs-site/
  index.md                    # landing page
  guide/
    getting-started.md        # install, first controller, run
    basic-concepts.md         # decorators, routing, validation, responses, errors
    advanced-concepts.md      # plugins, auth, caching, multi-tenancy, WebSocket
  reference/
    decorators.md             # full decorator API reference
    bananaapp-options.md      # BananaAppOptions interface
    error-types.md            # all ApiError subclasses
    config-module.md          # BananaConfig
  integrations/
    typeorm.md
    prisma.md
    opentelemetry.md
    zod.md
  plugins/
    overview.md               # BananaPlugin lifecycle
    websocket.md
    writing-a-plugin.md
  tooling/
    cli.md                    # all bananajs commands
    ai-commands.md            # bananajs ai *
    benchmarks.md
  migration/
    from-express.md           # references existing docs/MIGRATION.md
  .vitepress/config.ts        # nav, sidebar, theme
```

### 5.3 GitHub Actions

- `.github/workflows/docs.yml` — triggers on push to `main`, builds VitePress, deploys to `gh-pages`
- `.github/workflows/ci.yml` — triggers on PR: `tsc --noEmit` across all packages, build check
- `.github/workflows/publish.yml` — triggers on tag `v*`: builds + `npm publish` for all publishable packages

---

## Phase 6 — Domain/Persistence/Infrastructure Architecture (Months 2–5)

**Goal:** First-class layered architecture support: Domain → Application → Infrastructure. Clear separation between business logic and framework/database concerns.

### 6.1 New package: `@banana-universe/ddd` (`packages/ddd/`)

Base classes and interfaces:

```typescript
// Domain layer primitives
abstract class Entity<T extends { id: unknown }>
abstract class ValueObject<T>
abstract class AggregateRoot<T> extends Entity<T>

// Repository contract (domain layer — no ORM imports)
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>
  findAll(filter?: Partial<T>): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: ID): Promise<void>
}

// Layer markers (decorators)
@DomainService()    // marks a domain service — no HTTP, no ORM
@ApplicationService() // marks an application service — orchestrates domain + infra
```

### 6.2 TypeORM adapter

- `TypeOrmRepositoryAdapter<T>` in `packages/plugin-typeorm` that implements `Repository<T>`
- Users implement the `Repository<T>` interface in their domain; adapter bridges to TypeORM `DataSource`

### 6.3 Prisma adapter

- Same pattern in `packages/plugin-prisma`

### 6.4 CLI update: `bananajs generate module <name>`

Generates full DDD module structure:

```
src/
  <name>/
    domain/
      <Name>.entity.ts
      <Name>.repository.ts      # interface
      <Name>.service.ts         # @DomainService
    application/
      <Name>.app-service.ts     # @ApplicationService
      <Name>.dto.ts
    infrastructure/
      typeorm/<Name>.typeorm-repository.ts  # implements repository interface
    <Name>.controller.ts
```

### 6.5 Documentation

- New doc page `docs-site/guide/layered-architecture.md`

---

## Phase 7 — LLM-Powered Module Code Generator (Months 3–6)

**Goal:** A packaged, offline-first code generation engine integrated into `bananajs-cli`. Given a natural language description, a JSON Schema, or an OpenAPI spec, it generates a complete BananaJS DDD module (domain entity + DTO + service + repository interface + controller). Ollama runs locally with zero API keys required; cloud providers are an optional fallback.

This is purely a **developer tool** — it generates source code files and exits. It is not a runtime LLM integration in the built application.

### 7.1 LLM provider abstraction (`packages/bananajs-cli/src/lib/llm/`)

A new internal module (not a separate npm package) within `bananajs-cli`:

```
packages/bananajs-cli/src/lib/llm/
  LlmProvider.ts          # interface: generate(prompt, opts) → Promise<string>
  OllamaProvider.ts       # HTTP call to http://localhost:11434/api/generate (default)
  LlamaCppProvider.ts     # HTTP call to llama.cpp server API
  VercelAiProvider.ts     # wraps existing Vercel `ai` SDK (cloud: OpenAI, Anthropic)
  provider.factory.ts     # resolveProvider(config) → LlmProvider
```

```typescript
interface LlmProvider {
  generate(prompt: string, options?: LlmGenerateOptions): Promise<string>
}

interface LlmGenerateOptions {
  model?: string
  temperature?: number
  system?: string
}
```

- `OllamaProvider` — zero extra deps; calls Ollama HTTP API via Node `fetch`; fully offline
- `LlamaCppProvider` — zero extra deps; calls llama.cpp `/completion` endpoint via `fetch`
- `VercelAiProvider` — lazy-imports existing optional peers `ai` + `@ai-sdk/openai`

### 7.2 Configuration file: `.bananarc.json`

A project-level config file (created by `bananajs ai setup`) that stores the LLM provider preference:

```json
{
  "llm": {
    "provider": "ollama",
    "model": "llama3.2",
    "baseUrl": "http://localhost:11434"
  }
}
```

Supported provider values: `"ollama"` (default), `"llamacpp"`, `"openai"`, `"anthropic"`.

### 7.3 New CLI commands

#### `bananajs ai setup`

Interactive setup wizard:

1. Choose provider: Ollama (recommended, offline) / llamafile / OpenAI / Anthropic
2. For Ollama: print install instructions if not running; run `ollama pull <model>`
3. Write `.bananarc.json` to project root

#### `bananajs ai generate --module "<description>"`

Generates a **complete DDD module** from a natural language description:

```bash
bananajs ai generate --module "Product catalog with name, price, category, and stock management"
```

Output (generated files, using Phase 6 DDD structure):

```
src/product/
  domain/
    Product.entity.ts          # Entity class with fields inferred from description
    Product.repository.ts      # Repository<Product> interface
    ProductDomain.service.ts   # @DomainService — business logic stubs
  application/
    ProductApp.service.ts      # @ApplicationService — orchestration
    Product.dto.ts             # CreateProductDto, UpdateProductDto
  infrastructure/
    typeorm/Product.typeorm-repository.ts  # TypeOrmRepositoryAdapter<Product>
  Product.controller.ts        # @Controller with full CRUD + @ApiTags
```

- Works with `--from-schema <file>` as the description source (JSON Schema or OpenAPI)
- Reads `.bananarc.json` to select the LLM provider
- `--dry-run` prints generated files without writing
- `--out <dir>` sets the output base directory (default: `./src`)

#### `bananajs ai generate --module` prompt engineering

The LLM is called with a structured system prompt that enforces BananaJS conventions:

- Imports from `@banana-universe/bananajs`
- Class-validator decorators on DTOs
- `@Injectable()` on services
- Correct response pattern (`new SuccessResponse(...).send(res)`)
- ESM `.js` extension on internal imports

The generator uses a **multi-step** approach:

1. Call LLM once to extract entity fields + types from description → structured JSON
2. Use extracted JSON to fill embedded templates (same approach as Phase 4 schema-based generation, but richer + LLM-guided)
3. Optionally call LLM a second time to fill in service method bodies if `--detailed` flag set

This two-step approach keeps the LLM call focused and makes output deterministic for the scaffolding structure even when the LLM varies.

### 7.4 Upgrade existing `bananajs ai generate --from-prompt`

The Phase 4 `--from-prompt` command generates individual files. Phase 7 replaces its internals with the new `LlmProvider` abstraction and `.bananarc.json` config, so all `bananajs ai` commands benefit from offline LLM support automatically.

### 7.5 Documentation

- New doc page `docs-site/tooling/ai-module-generation.md` — walks through `bananajs ai setup` + `bananajs ai generate --module` with a full example

---

## Phase 8 — Example Recipe Apps (Months 4–7)

**Goal:** Runnable, documented example repositories showing real-world BananaJS usage patterns. Each app demonstrates a complete vertical slice: controller → service → repository → database.

### 8.1 Recipe apps (new directories under `apps/`)

| App                            | Stack                | Key Features                                        |
| ------------------------------ | -------------------- | --------------------------------------------------- |
| `apps/example-rest-postgresql` | TypeORM + PostgreSQL | DDD layers, auth, pagination, OTel, Swagger         |
| `apps/example-rest-mongodb`    | Prisma MongoDB       | DDD layers, document model, Zod validation          |
| `apps/example-websocket-chat`  | `plugin-websocket`   | Real-time chat, rooms, `@OnMessage` event routing   |
| `apps/example-multitenant`     | TypeORM + PostgreSQL | `@Tenant`, per-tenant schema isolation, `@Can` ABAC |

### 8.2 Each app includes

- `README.md` — what the recipe demonstrates, prerequisites, how to run
- `docker-compose.yml` — spins up the required database/service
- Full DDD-layered project structure (Phase 6 pattern)
- `.env.example` — required environment variables

### 8.3 Index

- `docs-site/examples/index.md` — table linking to all recipes with description

---

## New Packages Summary

| Package / Artifact              | Version | Description                                                                                    |
| ------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `@banana-universe/ddd`          | v0.1.0  | Domain primitives (Entity, ValueObject, AggregateRoot, Repository interface, layer decorators) |
| `@banana-universe/bananajs-cli` | v0.3.0  | LLM provider abstraction + `.bananarc.json` config + `ai setup` + `ai generate --module`       |
| VitePress docs site             | —       | `docs-site/` — not published to npm, deployed to GitHub Pages                                  |

## Key Files to Create

- `plans/EnterpriseRoadmapV3.md` (this plan)
- `docs-site/` directory structure + VitePress config
- `.github/workflows/docs.yml`, `ci.yml`, `publish.yml`
- `packages/ddd/` scaffold
- `packages/bananajs-cli/src/lib/llm/` — provider abstraction + Ollama/llamafile/cloud adapters
- `.bananarc.json` config schema
- `apps/example-*/` recipe apps (each with README + docker-compose)
