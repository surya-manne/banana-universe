---
name: EnterpriseRoadmapV3 Update
overview: Update `plans/EnterpriseRoadmapV3.md` to incorporate all 12 architect recommendations plus 5 cross-cutting concerns identified in the review — covering Phases 5–8 content gaps, architectural design decisions, and missing sections.
todos:
  - id: p5-versioning
    content: 'Phase 5: Add VitePress versioning strategy sub-section (version dropdown from git tags, deferred until after Phase 6)'
    status: pending
  - id: p5-typedoc
    content: 'Phase 5: Add TypeDoc API reference auto-generation to content structure (docs-site/api/, typedoc step in docs.yml)'
    status: pending
  - id: p5-ci-clarify
    content: 'Phase 5: Amend ci.yml bullet to clarify relationship with existing benchmarks.yml (unified PR gate)'
    status: pending
  - id: p5-publish-ordering
    content: 'Phase 5: Add publish.yml package ordering (bananajs → ddd → plugin-* → CLI) and Nx affected strategy'
    status: pending
  - id: p5-arch-fix
    content: 'Phase 5: Add task to fix stale ARCHITECTURE.md (emitDecoratorMetadata: true is incorrect)'
    status: pending
  - id: p6-decorator-semantics
    content: 'Phase 6: Define @DomainService / @ApplicationService runtime semantics (Reflect.defineMetadata, LAYER_TYPE key, awilix DI registration)'
    status: pending
  - id: p6-base-classes
    content: 'Phase 6: Replace minimal type signatures with concrete methods for Entity (equals, timestamps), AggregateRoot (domain events, version), ValueObject (structural equality, immutability)'
    status: pending
  - id: p6-repository-filter
    content: 'Phase 6: Replace Partial<T> filter with FindCriteria<T> supporting eq/in/like/gt/lt operators'
    status: pending
  - id: p6-emitdecorator-note
    content: 'Phase 6: Add explicit note that all new ddd decorators use Reflect.defineMetadata (emitDecoratorMetadata=false)'
    status: pending
  - id: p6-entity-mapping
    content: 'Phase 6: Specify toDomain/toPersistence mapper strategy for TypeOrmRepositoryAdapter and PrismaRepositoryAdapter'
    status: pending
  - id: p6-orm-flag
    content: 'Phase 6: Add --orm typeorm|prisma|none flag to bananajs generate module + interactive prompt fallback'
    status: pending
  - id: p6-unitofwork
    content: 'Phase 6: Add UnitOfWork interface and adapters sub-section (v0.1.0: interface + adapters; @Transactional wrapper deferred to v0.2.0)'
    status: pending
  - id: p7-error-handling
    content: 'Phase 7: Add error handling and retry specification section (retry=2, timeout=30s, per-failure-mode error messages, setup validation)'
    status: pending
  - id: p7-anthropic-sdk
    content: 'Phase 7: Add @ai-sdk/anthropic to VercelAiProvider optional peer deps alongside @ai-sdk/openai'
    status: pending
  - id: p7-migration-path
    content: 'Phase 7: Add ai.ts → llm/ migration path spec (extract naming utils, type-mapping, system prompt, templates; preserve --from-prompt throughout)'
    status: pending
  - id: p7-bananarc-reposition
    content: 'Phase 7: Reposition .bananarc.json as general BananaJS project config (llm + generate namespaces; expand schema)'
    status: pending
  - id: p7-zod-validation
    content: 'Phase 7: Add Zod validation of LLM JSON output in step 1 (EntityExtractionSchema; retry once on failure; --debug raw output)'
    status: pending
  - id: p8-tests
    content: 'Phase 8: Add integration tests to each recipe app (BananaTestApp, SQLite for CI, apps/example-*/src/__tests__/app.test.ts)'
    status: pending
  - id: p8-mongodb-constraints
    content: 'Phase 8: Document Prisma MongoDB connector constraints in example-rest-mongodb entry (no multi-doc transactions, relation differences)'
    status: pending
  - id: p8-wsbody-prereq
    content: 'Phase 8: Add @WsBody runtime validation as prerequisite for example-websocket-chat; implement in packages/plugin-websocket before Phase 8'
    status: pending
  - id: p8-ci-integration
    content: 'Phase 8: Add all example apps to ci.yml tsc --noEmit sweep; SQLite for SQL tests in CI; MongoDB skipped by default'
    status: pending
  - id: cc-sequencing
    content: 'Cross-cutting: Add Sequencing & Dependency Notes section (Phase 5 before 6.5 docs, Phase 6 API freeze before Phase 7 templates, @WsBody before chat example)'
    status: pending
  - id: cc-testing
    content: 'Cross-cutting: Add Testing Strategy section (ddd unit tests, llm/ mocked HTTP tests, CLI command tests, recipe integration tests)'
    status: pending
  - id: cc-backcompat
    content: 'Cross-cutting: Add Backward Compatibility section (--from-prompt unchanged, ddd additive, --orm defaults to typeorm)'
    status: pending
  - id: cc-summary-update
    content: 'Cross-cutting: Update New Packages Summary table and Key Files to Create list with all new entries from changes above'
    status: pending
isProject: false
---

# EnterpriseRoadmapV3 — Architect Recommendation Updates

Update `[plans/EnterpriseRoadmapV3.md](plans/EnterpriseRoadmapV3.md)` in-place. All changes are additions or replacements within the existing file structure. No new files needed.

---

## Phase 5 Changes (4 items)

**5.1 — Add docs versioning strategy** (new sub-section after 5.1):

- VitePress version dropdown tied to git tags (e.g. `v0.4`, `v0.5`)
- Generate version entry per minor/major tag; pin sidebar to that tag's content
- Defer multi-version until after Phase 6 ships (when second publishable package exists)

**5.2 — Add TypeDoc API reference auto-generation** (amend existing 5.2 content structure):

- Add `docs-site/api/` to content tree
- `typedoc --out docs-site/api --entryPoints packages/bananajs/src/index.ts`
- Run as part of `docs.yml` build step before VitePress build
- Hand-written reference pages (`decorators.md`, `error-types.md`) become narrative wrappers that embed/link TypeDoc output — prevents drift

**5.3 — Clarify ci.yml scope** (amend 5.3 GitHub Actions bullet):

- `ci.yml` replaces/extends the existing `.github/workflows/benchmarks.yml`
- ci.yml scope: `tsc --noEmit`, build check, existing benchmark regression gate (moved from `benchmarks.yml` or called as a job)
- State relationship explicitly: `ci.yml` is the unified PR gate; `benchmarks.yml` is retired or called from it

**5.4 — Define publish.yml package ordering** (amend 5.3 publish.yml bullet):

- Explicit ordering: `bananajs` → `@banana-universe/ddd` → `plugin-` → `bananajs-cli`
- Use Nx `affected` for selective publish; only re-publish packages changed since last tag
- Add version coordination note: CLI and DDD package versions are independent of core

**5.5 — Stale ARCHITECTURE.md fix** (new task under Phase 5):

- `docs/ARCHITECTURE.md` line 82 states `emitDecoratorMetadata: true` — this is incorrect per current implementation
- Fix as part of Phase 5 documentation audit before docs site goes live

---

## Phase 6 Changes (7 items)

**6.1 — Define `@DomainService` / `@ApplicationService` runtime semantics** (amend 6.1 code block):

- Both decorators use `Reflect.defineMetadata` (no `emitDecoratorMetadata` — consistent with workspace pattern)
- Store `LAYER_TYPE` metadata key: `"domain"` | `"application"`
- Register decorated class in the awilix DI container (same pattern as `@Injectable()`)
- Future enforcement: CLI tooling can warn when a `@DomainService` imports from `infrastructure/`

**6.2 — Specify concrete behavior for base classes** (replace minimal type signatures in 6.1 code block):

```typescript
abstract class Entity<T extends { id: unknown }> {
  protected readonly props: T
  equals(other: Entity<T>): boolean // identity comparison by props.id
  createdAt: Date
  updatedAt: Date
}

abstract class ValueObject<T extends object> {
  protected readonly props: T
  equals(other: ValueObject<T>): boolean // structural (deep) equality
  // immutable: constructor freezes props
}

abstract class AggregateRoot<T extends { id: unknown }> extends Entity<T> {
  private _domainEvents: DomainEvent[]
  addDomainEvent(event: DomainEvent): void
  clearDomainEvents(): DomainEvent[]
  version: number // optimistic concurrency
}

interface DomainEvent {
  aggregateId: unknown
  occurredOn: Date
  eventName: string
}
```

**6.3 — Replace `Partial<T>` filter with criteria pattern** (replace `findAll` signature in Repository interface):

```typescript
interface FindCriteria<T> {
  where?: {
    [K in keyof T]?:
      | T[K]
      | { eq: T[K] }
      | { in: T[K][] }
      | { like: string }
      | { gt: T[K] }
      | { lt: T[K] }
  }
  orderBy?: { field: keyof T; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>
  findAll(criteria?: FindCriteria<T>): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: ID): Promise<void>
}
```

**6.4 — Add `emitDecoratorMetadata` constraint note** (new note under 6.1):

- All new decorators in `packages/ddd` must use explicit `Reflect.defineMetadata` — `emitDecoratorMetadata` is `false` workspace-wide
- TC39-compatible design: class decorators are low-risk for future migration

**6.5 — Specify entity mapping strategy for ORM adapters** (amend 6.2 and 6.3):

- Strategy: **separate mapper classes** (`toDomain()` / `toPersistence()`)
- Domain entities (`@banana-universe/ddd`) are plain TypeScript classes — no TypeORM/Prisma decorators
- ORM entities are infrastructure-layer classes with ORM decorators
- `TypeOrmRepositoryAdapter<TDomain, TOrm>` takes a mapper instance; example:

```typescript
  class ProductTypeOrmRepository extends TypeOrmRepositoryAdapter<Product, ProductOrmEntity> {
    toDomain(orm: ProductOrmEntity): Product { ... }
    toPersistence(domain: Product): ProductOrmEntity { ... }
  }


```

**6.6 — Add `--orm` flag to `bananajs generate module`** (amend 6.4 CLI section):

- Accept `--orm typeorm|prisma|none` (default: `typeorm` for back-compat)
- Interactive prompt if `--orm` not provided: "Which ORM adapter? (typeorm / prisma / none)"
- For `--orm prisma`: generate `infrastructure/prisma/<Name>.prisma-repository.ts`
- For `--orm none`: generate stub `infrastructure/<Name>.in-memory-repository.ts`

**6.7 — Add UnitOfWork pattern note** (new sub-section 6.6 after adapters):

- `@ApplicationService` methods that touch multiple repositories need atomic transactions
- Add `UnitOfWork` interface to `packages/ddd`:

```typescript
interface UnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
}
```

- `TypeOrmUnitOfWork` and `PrismaUnitOfWork` adapters in respective plugin packages
- `v0.1.0` scope: interface + adapters; `@Transactional()` decorator wrapping is deferred to v0.2.0

---

## Phase 7 Changes (5 items)

**7.1 — Add error handling and retry specification** (new sub-section 7.1.1 after provider listing):

- Retry count: 2 attempts with 1s backoff; configurable via `.bananarc.json` `llm.retries`
- Timeout: 30s default per LLM call; configurable via `.bananarc.json` `llm.timeoutMs`
- Error messages per failure mode:
  - Ollama not running: `"Ollama is not running. Start it with: ollama serve"`
  - Invalid JSON from LLM: `"LLM returned unparseable JSON. Use --debug to see raw output."`
  - Network timeout: `"LLM request timed out after {n}s. Increase llm.timeoutMs in .bananarc.json"`
- `bananajs ai setup` validates provider is reachable before writing `.bananarc.json`

**7.2 — Add `@ai-sdk/anthropic` to VercelAiProvider** (amend 7.1 VercelAiProvider line):

- `VercelAiProvider` lazy-imports `ai` + `@ai-sdk/openai` (for OpenAI) and `@ai-sdk/anthropic` (for Anthropic)
- Both are listed as optional peer deps with `peerDependenciesMeta.optional: true`
- Internal provider routing: `if (provider === 'anthropic') import('@ai-sdk/anthropic')`

**7.3 — Specify `ai.ts` → `llm/` migration path** (new sub-section 7.4.1 under the existing 7.4 section):

- Current `[packages/bananajs-cli/src/lib/ai.ts](packages/bananajs-cli/src/lib/ai.ts)` (421 lines) contains reusable utilities that must be preserved:
  - `toPascalCase`, `toCamelCase`, `toKebabCase` — move to `lib/utils/naming.ts`
  - `mapJsonTypeToTs` — move to `lib/utils/type-mapping.ts`
  - `GENERATE_SYSTEM_PROMPT` — refactor into `lib/llm/prompts/generate-module.ts`
  - Template string builders — move to `lib/templates/`
- Migration is done in-place; `--from-prompt` continues to work throughout; no breaking changes to existing `bananajs ai generate --from-prompt` behavior
- Phase 7 adds the new `llm/` abstraction alongside `ai.ts`; `ai.ts` is then refactored to use it

**7.4 — Reposition `.bananarc.json` as general project config** (amend 7.2 section header and description):

- `.bananarc.json` is the **general BananaJS project config** (not just LLM config)
- `llm` is one namespace; future namespaces: `generate.defaultOrm`, `telemetry.enabled`, etc.
- Updated schema:

```json
{
  "llm": {
    "provider": "ollama",
    "model": "llama3.2",
    "baseUrl": "http://localhost:11434",
    "retries": 2,
    "timeoutMs": 30000
  },
  "generate": {
    "defaultOrm": "typeorm",
    "outDir": "./src"
  }
}
```

**7.5 — Add Zod validation of LLM JSON output** (amend multi-step approach description):

- After step 1 (LLM → JSON), validate output with a Zod schema before proceeding to template filling
- Schema: `EntityExtractionSchema` — validates `{ fields: Array<{ name, type, optional? }>, entityName }`
- On validation failure: log raw LLM output with `--debug`, retry once, then fail with clear message
- Zod is already an optional peer in the workspace — import is gated on same lazy-load pattern

---

## Phase 8 Changes (4 items)

**8.1 — Add integration tests to each recipe app** (amend 8.2 "Each app includes"):

- Each recipe app ships with at least one integration test file using `BananaTestApp`
- Location: `apps/example-*/src/__tests__/app.test.ts`
- Tests use in-memory SQLite (TypeORM) or Prisma test database to avoid requiring running databases in CI
- This serves dual purpose: validates the app works + demonstrates `BananaTestApp` usage for framework users

**8.2 — Document Prisma MongoDB constraints** (amend 8.1 table entry for `example-rest-mongodb`):

- Add note: Prisma MongoDB connector limitations to be documented in the app's README:
  - No multi-document transactions without a replica set
  - Relation handling differs from SQL (embedded documents vs joins)
  - `findAll(criteria)` filtering is limited to top-level fields only
- Demo uses single-document operations to stay within connector capabilities

**8.3 — Resolve `@WsBody` validation gap** (amend 8.1 table entry for `example-websocket-chat` + add task):

- `plugin-websocket` has no `@WsBody` runtime validation (deferred from Phase 4)
- Resolution: implement `@WsBody(DtoClass)` validation in `packages/plugin-websocket` as a **prerequisite** for Phase 8 websocket example
- Add to Phase 8 prerequisites: `@WsBody` runtime validation must be complete before `example-websocket-chat` is written
- Scope: follows existing `@Body` validation pattern — `plainToInstance` + `validate` (class-validator)

**8.4 — Add example apps to CI** (amend 8.2 and cross-reference with Phase 5 ci.yml):

- All `apps/example-` are included in `ci.yml` `tsc --noEmit` sweep
- Tests run in CI using SQLite for SQL examples (no database service required)
- MongoDB example tests are skipped in CI by default (require replica set); noted in README

---

## New Cross-Cutting Sections (5 items)

**Add: Sequencing & Dependency Notes section** (new section after Phase 8):

- Phase 5 (docs site live) must precede Phase 6 doc page 6.5
- Phase 6 API contracts must be frozen before Phase 7 template authoring begins
- `@WsBody` validation in `plugin-websocket` must complete before Phase 8 websocket example
- `example-multitenant` depends on `@Tenant` + `@Can` ABAC working together — needs integration test before Phase 8

**Add: Testing Strategy section** (new section):

- Every new package (`@banana-universe/ddd`) ships with unit tests in `packages/ddd/src/__tests__/`
- LLM provider abstraction (`llm/`) has unit tests with mocked HTTP responses
- CLI command changes (generate module, ai setup) have unit tests covering flag parsing and file generation
- Recipe apps have integration tests (as per 8.1 above)
- Testing framework: existing workspace pattern (to be confirmed during Phase 5)

**Add: Backward Compatibility section** (new section):

- `bananajs ai generate --from-prompt` continues to work unchanged through and after Phase 7 refactor
- All existing `ai.ts` utility functions are preserved during migration; no removal until Phase 7 is complete and tested
- `@banana-universe/ddd` is an additive opt-in package; existing apps without DDD imports are unaffected
- New `--orm` flag on `generate module` defaults to `typeorm` for backward compatibility

**Update: New Packages Summary table** (add `@WsBody` prerequisite row + expand CLI row):

- Add `plugin-websocket @WsBody` as a prerequisite deliverable (not a separate versioned package)
- Expand CLI row to note migration: `v0.3.0` includes `llm/` abstraction + `ai.ts` refactor

**Update: Key Files to Create list** (add missing entries from new content):

- `packages/ddd/src/__tests__/` — unit tests for DDD primitives
- `packages/bananajs-cli/src/lib/utils/naming.ts`, `type-mapping.ts` — extracted from `ai.ts`
- `packages/bananajs-cli/src/lib/llm/prompts/generate-module.ts` — system prompt
- `packages/bananajs-cli/src/lib/templates/` — template builders extracted from `ai.ts`
- `.bananarc.json` schema (expanded general config)
- `packages/plugin-websocket/src/WsBody.ts` — prerequisite for Phase 8
