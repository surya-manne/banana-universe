---
name: Enterprise DX Architecture
overview: src/modules/<feature>/ with domain+persistence; feature entry is <feature>/index.ts (createModule); canonical InjectionToken next to ports; optional auto-discovery (sorted); tsyringe token+useClass; plugin-before-module ordering; BananaApp modules[] + full existing options; internal module registration; API versioning (URI-first, docs+CLI+OpenAPI); DDD reframed; bjs; migration+testing+docs after approval.
---

# Enterprise DX architecture plan

**Status:** Core implementation landed (BananaJS 0.6+) — remaining items: expanded docs-site, optional discovery/manifest, deeper CLI `--api-version` scaffolding.

**Scope:** Large (framework, plugins, CLI, docs-site, examples). Follow Rosetta `workflows/coding-flow.md` for execution.

---

## 1. Product positioning: repository + modules (not DDD-first)

**Keep:** [packages/ddd](../packages/ddd) remains published. ORM plugins continue using it for `Repository` / `UnitOfWork` types.

**Reframe:** Docs, README, CODEMAP, CLI copy — emphasize **modular layered apps**, **repository pattern**, **domain vs persistence**. De-emphasize “DDD” in marketing; `@banana-universe/ddd` is optional **contracts** for ports/adapters.

**Docs-site / README / CLI:** Update layered-architecture, philosophy, index, CLI guides, AI module docs, integrations — same file list as in repo today.

**Framework:** `bananajs` does not depend on `ddd`; no package removal.

---

## 2. Folder layout: `src/modules` + two layers

- Features: **`src/modules/<feature>/`** (kebab-case).
- **Exactly two** subfolders per feature: **`domain/`** and **`persistence/`**. No separate `application/` or `infrastructure/` **by default** (see **Non-CRUD logic** below).
- Use cases live in **`domain/*.service.ts`** (or similar). Optional **`*.dto.ts`** next to controller or under `domain/`.
- Shared: **`src/lib/`**. Entry: **`bootstrap.ts`**, **`main.ts`**.

### Tree (canonical)

```
src/
  modules/
    <feature>/
      index.ts                  # default export or named export: createModule({ ... }) for this feature
      <feature>.controller.ts
      *.dto.ts                  # optional
      domain/
        <name>.entity.ts
        <name>.repository.ts    # port (interface) + InjectionToken for DI (see below)
        <name>.service.ts
      persistence/
        <name>.entity.ts        # TypeORM only
        <name>.model.ts         # Mongoose only
        <name>.repository.ts    # adapter
  lib/
  bootstrap.ts
  main.ts
```

**No separate `<feature>.module.ts`:** Module composition (`createModule`) lives in **`<feature>/index.ts`** (entry for that feature folder). Import example: `'./modules/catalog/index.js'`.

**ORM naming:** TypeORM **`.entity.ts`**; Mongoose **`.model.ts`**; adapter **`*.repository.ts`**. Typically one ORM stack per feature.

### Domain vs persistence

| Area             | Role                                                   |
| ---------------- | ------------------------------------------------------ |
| **domain/**      | Entities, repository ports, use-case services          |
| **persistence/** | ORM entity/model, adapters implementing ports, mappers |

**Flow:** Controller → domain service → repository port → persistence adapter → DB.

### Bounded context and module size

- **Default:** one **bounded context** per `src/modules/<feature>/` folder — one `createModule`, one controller, one cohesive API slice.
- **Bounded context ≠ URL prefix:** The module id and folder name do not have to match a single route prefix; what matters is **one cohesive slice of behavior**. Multiple path prefixes can still live in one controller if they belong to the same context (or **split modules** if not).
- **When to split:** large or mixed surfaces (e.g. admin vs public, versioning, unrelated route groups) — add **another module** (another folder + `index.ts`), not a second controller in the same module. Keeps DI graphs small and routes predictable.
- **Complex orchestration:** cross-module workflows stay orchestrated at the app or via explicit interfaces between modules; avoid stuffing unrelated use cases into one `domain/*.service.ts`.

### Non-CRUD logic: events, sagas, outbox, HTTP clients, application services

Forcing **only** `domain/*.service.ts` + `persistence/*` fits typical CRUD-style slices. For **orchestration across modules**, **domain events**, **sagas**, **outbox**, **HTTP clients to other services**, or **application services** that are not persistence-backed, use this hierarchy (pick one approach per case; document the chosen pattern in the Module authoring doc):

| Situation                                               | Where it lives                                                    | Notes                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use case stays inside one feature                       | **`domain/*.service.ts`**                                         | Inject **ports** (interfaces + tokens); implement side effects behind ports (e.g. `EmailSenderPort`, `PaymentGatewayPort`) with adapters in **`persistence/`** (DB) or **`src/lib/`** (pure HTTP/SDK clients registered as providers). |
| Heavy orchestration or workflows that clutter `domain/` | **Split into another `src/modules/<feature>/`**                   | Prefer **another module** + explicit contracts over a new top-level folder.                                                                                                                                                            |
| Optional escape hatch (if implementation allows)        | **`domain/application/`** or **`application/`** under the feature | **Thin** folder for non-persistence application services only — **not** the default scaffold; CLI may omit unless `--with-application` or similar. Keeps the default tree at two layers for simple apps.                               |

**Domain events / outbox:** Event types and handlers can live under **`domain/`** (e.g. `*.events.ts`, handlers next to services); **outbox persistence** remains **`persistence/`**. **Sagas** that span modules belong in **`src/lib/`** or a dedicated module that depends on ports, not in a third global layer without a documented rule.

---

## 3. DI: tsyringe, hierarchical injectors, small module files

**Replace Awilix** with **[tsyringe](https://github.com/microsoft/tsyringe)** (`DependencyContainer`, `@injectable()`, `@inject()`, `parent.createChildContainer()`). Plugins (`plugin-typeorm`, `plugin-mongoose`, …) migrate accordingly.

**Mental model:** Same as [GraphQL Modules DI](https://the-guild.dev/graphql/modules/docs/di/introduction) — application injector + per-module child that resolves from parent for shared tokens (e.g. `DataSource`).

### Breaking change: `AppContext.container`, plugins, and migration cut

- **Scope:** [AppContext.container](../packages/bananajs/src/lib/Plugin/Plugin.interface.ts) and all plugin DI usage move to **tsyringe** `DependencyContainer`. **Semver-major** release. Peers on `AppContext` follow the same migration.
- **Dual container libraries:** **No** supported production window where Awilix and tsyringe both back the same app — **hard cut** on upgrade. CI/docs must not imply a hybrid runtime.
- **Compatibility shims:** Only if explicitly needed for a **short** deprecation window (e.g. type-only aliases); default **assumption is no shim** — migrate plugins in lockstep with core.
- **Minimum migration for custom plugin authors:** Document a **checklist**: replace Awilix registration with tsyringe `container.register` / provider shape; update container type in `AppContext`; re-run integration tests. List **breaking symbol renames** in MIGRATION.

Optional **codemods or CLI-assisted renames** for large consumers remain a **DX stretch goal**, not a blocker for the core release.

### Child container semantics (v1)

Align with the **GraphQL Modules** mental model, but spell out behavior so authors and plugin authors do not guess.

| Topic                    | Decision                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Per-module container** | **One child `DependencyContainer` per module** for the **app lifetime** (startup), not a new child per HTTP request.                                                                                                                                                                                              |
| **Request scope**        | **Out of v1** — no per-request child container; document as follow-up.                                                                                                                                                                                                                                            |
| **Default lifetime**     | **Singleton** for classes registered as providers (controllers, services, adapters) unless the framework documents a different default for a specific registration type.                                                                                                                                          |
| **Plugins vs modules**   | Plugins register **only** on the **root** container (shared tokens: `DataSource`, logger, etc.). Each module registers **only** on its **child** container. **Do not** require the same provider to be registered in both places; **resolve** module tokens with **parent fallback** to root for shared services. |
| **Double-register**      | Document **anti-pattern:** registering the same concrete adapter on root and child without intent; authors should bind **port → adapter** on the **module** child only.                                                                                                                                           |

### What DI is for inside a module (repository ↔ service)

**Purpose:** The module’s DI graph connects **domain** to **persistence** without coupling business logic to a specific database or ORM.

- **`domain/<name>.repository.ts`** defines the **port** (interface): e.g. `CatalogItemRepository` with `save`, `findById`, …
- **`domain/<name>.service.ts`** (**business logic**) depends only on that **interface** — injected via tsyringe (`@injectable()`, `@inject(CatalogItemRepositoryToken)` or equivalent). **No** TypeORM/Mongoose imports in domain services.
- **`persistence/<name>.repository.ts`** is the **adapter** implementing the port (TypeORM/Mongoose today; something else tomorrow).
- **`createModule`** (in **`<feature>/index.ts`**) registers the binding **port → concrete adapter** on the module (child) container. **Swapping databases** = replace the adapter (and ORM-specific files under `persistence/`) + update **`providers`** in that **`index.ts`** — **domain services and port interfaces stay unchanged**.

This is the only “wiring” DI must make obvious: **service → interface**, **module DI → implementation behind that interface**.

### Where the **token** is created and how it maps to the module

tsyringe needs a **concrete token** (not a bare TS `interface` at runtime). **Convention:**

1. **Define the port** in **`domain/<name>.repository.ts`**: export the **interface** (types) and export **`CatalogItemRepositoryToken`** (or `CATALOG_ITEM_REPOSITORY`) as an **`InjectionToken<CatalogItemRepository>`** (or equivalent `Symbol` + typing helper) **in the same file** as the port — **single place** for “what this port is.”
2. **Service** injects with `@inject(CatalogItemRepositoryToken)` and types the parameter as **`CatalogItemRepository`**.
3. **`<feature>/index.ts`** (the module) lists **`{ token: CatalogItemRepositoryToken, useClass: CatalogItemTypeOrmRepository }`** — this is the **mapping** “for this module, resolve this token with this adapter.”
4. **Persistence** adapter implements the **interface**; it does **not** own the token.

**Summary:** Token is **created next to the repository port** (domain). **Module file** (`index.ts`) **binds** that token to the concrete class for DI. Multiple modules could theoretically reuse the same token name only if they are separate containers—by default **one token per bounded context** keeps clarity.

### Canonical author-facing token (single mental model)

tsyringe requires a **runtime** token. The plan standardizes on **one** pattern everywhere in docs, examples, and CLI output — **no mixing** “interface as token” vs `InjectionToken` in different snippets.

**Canonical pattern (v1 docs and generators):**

1. In **`domain/<name>.repository.ts`**: export **`CatalogItemRepository`** (TypeScript **interface** only for typing) and **`CatalogItemRepositoryToken`** as **`InjectionToken<CatalogItemRepository>`** (or a **well-typed `Symbol`** constant — implementation chooses one helper and sticks to it project-wide).
2. **`providers`** and **`@inject()`** always reference **`CatalogItemRepositoryToken`**, never the bare interface name as `token:`.
3. **Optional alternative:** an **abstract class** used as both type and token — allowed only if documented in **one** “Advanced” subsection; **default** scaffolds and all primary examples use **`InjectionToken` + interface**.

All code blocks in this plan and generated code must follow (1)–(2) so authors never see two conflicting mental models.

### `createModule` (GraphQL Modules–style shape, REST)

Not SDL. Declarative module with **`id`**, a single **`controller`** (see below), and **`providers`**.

**One controller per module:** A feature slice exposes **one** HTTP controller class (routes for that slice). Use **`controller: CatalogController`** (singular), not an array.

**Escape hatch (explicit):** If the route surface is large (admin + public, **API versioning**, unrelated groups), **do not** grow one controller into a god class — **split into multiple modules** (multiple `createModule` descriptors), each with its own controller and bounded context. **URL layout** (one prefix vs many) is a separate concern from **module** boundaries; multiple modules can still share path conventions via controller `@Controller` segments. For **versioned** public APIs, prefer patterns in **§4 API versioning**.

**No `dirname` in the public API** — omit unless a later feature needs a module root path.

**Providers — primary pattern (port → adapter):** The framework **must** accept tsyringe-style **`{ token, useClass }`** where **`token`** is a **concrete runtime token** (`InjectionToken`, symbol, or abstract class used as token), not a bare interface:

```typescript
providers: [
  { token: CatalogItemRepositoryToken, useClass: CatalogItemTypeOrmRepository },
  CatalogService,
]
```

The **TypeScript type** of the port remains an **interface** (`CatalogItemRepository`); **`CatalogItemRepositoryToken`** carries the runtime identity for DI.

**Anti-pattern:** Large manual `container.register` blocks in app code — **avoid**.

**Target module entry (`src/modules/catalog/index.ts`):**

```typescript
import { createModule } from '@banana-universe/bananajs'
import { CatalogItemRepositoryToken } from './domain/catalog-item.repository.js'
import { CatalogController } from './catalog.controller.js'
import { CatalogService } from './domain/catalog.service.js'
import { CatalogItemTypeOrmRepository } from './persistence/catalog-item.repository.js'

export const catalogModule = createModule({
  id: 'catalog',
  controller: CatalogController,
  providers: [
    { token: CatalogItemRepositoryToken, useClass: CatalogItemTypeOrmRepository },
    CatalogService,
  ],
})
```

**Illustrative domain wiring (conceptual — exact tokens/API in implementation):**

```typescript
// domain/catalog.service.ts — business logic: stable when DB changes
@injectable()
export class CatalogService {
  constructor(@inject(CatalogItemRepositoryToken) private readonly repo: CatalogItemRepository) {}
  // ...
}
```

Constructor injection and **port→adapter** binding are declared in **classes + `<feature>/index.ts` `providers`**, not in a long manual registration function.

### Automatic module registration (optional DX)

**Goal:** Reduce manual `modules: [a, b, c]` lists when the folder layout is already conventional.

**Possible approaches (pick one or offer as opt-in in implementation):**

- **Convention + glob / dynamic import:** e.g. `modules: await discoverModules({ baseUrl: import.meta.url, pattern: './modules/**/index.js' })` that loads each **`src/modules/<feature>/index.ts`** and collects exported module descriptors (requires a stable **export name** like `default` or `*Module`).
- **Build-time codegen:** CLI or Vite/Nx plugin generates **`src/modules/manifest.ts`** listing imports — no runtime `fs` in production.
- **Explicit barrel (still simple):** `src/modules/index.ts` re-exports `export { catalogModule } from './catalog/index.js'` and **`modules: allModules`** from one import — not fully automatic but one line in bootstrap.

**Constraints:** ESM dynamic imports, bundler behavior, and testability must be documented. **Fallback:** always support **explicit `modules: [...]`** for full control.

**Risks:** Auto-discovery can load modules in nondeterministic order if not sorted — **sort by `id` or folder name** in the implementation. The **same stable order** applies to **route registration** and **controller mount order**.

**Middleware stacking (future-facing):** If a later release adds **per-module route middleware**, **module order** in `modules: [...]` (or sorted discovery order) may affect **stacking order** for routes. **v1** does not add per-module Express middleware (see Cross-cutting); document the ordering rule anyway so discovery and explicit lists stay deterministic and tests do not flake.

**Production note:** Prefer **explicit `modules: [...]`** or **build-time manifest** where dynamic `import()` is fragile (bundlers, serverless). Document **ESM + bundler** constraints next to any glob-based discovery.

### Plugin lifecycle vs module resolution

**Rule:** Plugins register **shared infrastructure** on the **root** container (e.g. TypeORM `DataSource`) **before** module **child** containers resolve providers that depend on those tokens.

**Implementation must choose at least one strategy (document which in framework + plugin guides):**

1. **Lazy factory resolution** — DB-bound classes (e.g. repository adapters) are not instantiated until **after** plugins have run and registered `DataSource` on the root (e.g. factory provider or deferred `resolve()` when handling first request — exact mechanism in implementation spec).
2. **Explicit bootstrap phase** — Framework guarantees: **`plugins` lifecycle completes** (including async `TypeOrmPlugin` / `DataSource` ready) **before** any module `providers` are resolved or controllers instantiated. Authors see this as “**after TypeOrmPlugin is ready**” in docs.
3. **Fail fast** — If a module’s provider is resolved in a context where `DataSource` (or required peer) is missing, throw a **clear error** naming the missing token and reminding to **order `plugins` before `modules`** — avoids silent order-dependent failures in CI.

Tests must cover **plugin-then-module** ordering so regressions are caught without relying on incidental startup order.

### App bootstrap: modules only — **no** `controllers` / **no** `registerAllModules` in user code

When using **`modules`**, the framework **internally**:

1. Ensures a root **`DependencyContainer`** (or uses the one passed for advanced cases).
2. Runs **plugins** (e.g. register `DataSource` on the root).
3. For each **`createModule`** descriptor: creates a **child** container, registers **`providers`** (including **`{ token, useClass }`**), resolves the module’s **`controller`**, and mounts routes.

Apps pass **only** `plugins` and `modules` — **not** `controllers: defineBananaControllers(...)`. Controllers come **only** from module definitions. This avoids duplication and keeps bootstrap intuitive.

**Lightweight bootstrap (target)** — **`modules`** plus **all existing `BananaAppOptions`** remain supported (nothing removed): **`logger`**, **`security`**, **`middlewares`**, **`swagger`**, **`auth`**, **`rateLimit`**, **`health`**, **`metrics`**, **`cache`**, **`gracefulShutdown`**, **`requestId`**, etc. Add **`modules`** alongside those options as needed.

```typescript
import { BananaApp, defineBananaAppOptions, PinoLogger } from '@banana-universe/bananajs'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { catalogModule } from './modules/catalog/index.js'
import { notesModule } from './modules/notes/index.js'

BananaApp.create(
  defineBananaAppOptions({
    plugins: [TypeOrmPlugin(/* ... */)],
    modules: [catalogModule, notesModule],
    logger: new PinoLogger(),
    security: { helmet: true, cors: { origin: true } },
    swagger: { enabled: true },
    // ... any other existing BananaAppOptions — unchanged by the modular work
  }),
)
```

**Optional:** Power users may still pass **`container`** to attach to an existing root container; internal module-registration logic stays **private** inside the framework, **not** a required app import.

**Legacy / non-modular apps:** Continue to support **`controllers: defineBananaControllers(...)`** **without** **`modules`** for migration; document the two paths in MIGRATION.

**Framework work:** Implement `createModule` descriptor handling; **internal** module registration pipeline; **`defineBananaAppOptions({ modules })`** merges module controllers and DI scopes; optional **`resolveController`** for edge migration; [bananaBootstrap.ts](../packages/bananajs/src/lib/DI/bananaBootstrap.ts) refactored for tsyringe; document **`{ token, useClass }`** and single **`controller`** per module.

**Request-scoped services** (like GraphQL Modules “Operation” scope): out of scope for v1; possible follow-up.

### Multi-database / multiple connections (v1 assumption)

**ORM per feature:** “Typically one ORM stack per feature” remains valid; adapters in **`persistence/`** bind to the connection implied by the plugin.

**v1 single DataSource (explicit):** Assume **one** shared **`DataSource`** (or equivalent) registered by **`plugin-typeorm`** on the **root** container under a **documented token** (e.g. framework-exported symbol for “primary DB”). Repository adapters **inject that token**; authors do not invent connection identity per module in v1.

**Multiple databases (follow-up):** Apps needing **multiple** connections require **distinct tokens** per `DataSource` (e.g. `ORDERS_DATA_SOURCE`, `AUDIT_DATA_SOURCE`) and **explicit** `{ token, useClass }` wiring per adapter — document when the product adds multi-connection support; not required for the first modular release if the single-token rule is clear.

### Testing and `BananaTestApp`

Modular DI **increases** the need for **integration tests** (child containers, plugins + modules together). The roadmap requires a **documented testing story**, not only hand-waving:

**Goals:**

- Compose the same **`modules`** array (or a **minimal subset** of module descriptors) as production **without** copy-pasting **`providers`** from each `index.ts`.
- **Override** one or more **`{ token, useClass }`** bindings (e.g. swap `CatalogItemRepositoryToken` → in-memory fake) **centrally** in test setup.

**Expected direction for implementation (API names illustrative):**

- **`BananaTestApp.create({ ...defineBananaAppOptions, modules })`** (or parallel) mirroring production options.
- **`childContainer.register(CatalogItemRepositoryToken, { useClass: FakeRepo })`** or a **`testOverrides: [{ token, useClass }]`**-style option that merges **after** module registration — exact shape in tech spec; point is **one place** to replace ports for tests.
- Document **one** worked example: plugin stub + **one module** + token override.

See [packages/bananajs testing entry points](../packages/bananajs/src/testing/).

### Cross-cutting concerns (middleware, security)

**v1 scope (explicit checklist):**

| Mechanism                                                                                | In v1?                                                                 |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Global **`security`**, **`auth`**, **`middlewares`** on `BananaApp` options              | **Yes** — existing behavior                                            |
| Per-route middleware via **route decorators** (`@Get(..., [mw])`)                        | **Yes** — existing behavior                                            |
| **Per-module** Express middleware or module-level `middlewares: [...]` on `createModule` | **No** — **follow-up**; do not document as available until implemented |

Module boundaries in v1 are **DI + controller + routes**, not a second middleware system. This avoids implying features that change how modules compose.

---

## 4. API versioning

Enterprise consumers need a **clear, documented** way to ship **multiple API versions** (evolve DTOs and routes without breaking existing clients). This belongs in the same release as modular apps so examples and CLI do not ignore versioning.

### Goals

- Expose **v1**, **v2**, … (or date-based labels) with **predictable URLs** and docs.
- Keep **domain** logic shared where contracts are unchanged; avoid copy-paste drift.
- Work with **`@Controller`** / **`createModule`** without a second routing framework.

### Recommended default: URI versioning

**Primary pattern:** encode the major version in the **path prefix** — e.g. **`/v1/catalog/items`**, **`/v2/catalog/items`**.

| Mechanism                              | How                                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Per-controller**                     | `@Controller('v1/catalog')` or `@Controller('v2/catalog')` — works today; pair with **split modules** (see below) when v1/v2 DI or persistence differ.                                                                         |
| **App-wide prefix (framework option)** | Optional **`defineBananaAppOptions`** field such as **`apiPrefix`** / **`versionPrefix`** (exact name in tech spec) prepends a segment to all mounted module controllers — reduces repetition when every route is under `/v1`. |
| **Legacy unversioned**                 | Optional mount at **`/`** for backward compatibility during migration; document deprecation.                                                                                                                                   |

**Implementation must** document the **recommended** combination (per-controller vs global prefix) and show **one** full example in the reference app.

### Split modules vs two controllers in one module

| Approach                                     | When to use                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Two modules** (`catalog-v1`, `catalog-v2`) | Different **providers**, persistence, or DTO shapes; clean **deprecation** by dropping a module from `modules: [...]`. |
| **One module, two controller classes**       | Thin **adapter** controllers delegating to shared services — only if DI graph is identical; avoid god controllers.     |

Shared **`domain/`** types and services can live in a **shared package** or **`src/lib/`** when both versions need the same core logic.

### Optional strategies (document; implement if demand is clear)

- **Header / `Accept` negotiation** — e.g. `API-Version` or vendor `Accept` — requires **middleware** + dispatch rules; treat as **follow-up** unless product requires it early.
- **Query parameter** (`?apiVersion=2`) — document tradeoffs (caching, logs); lower priority than URI for public REST.

### OpenAPI (Swagger)

- **Tags** or **multiple grouped sections** per version; avoid a single undifferentiated spec when v1 and v2 differ.
- Align **`swagger`** options in `BananaApp` with the chosen URI pattern so generated docs match actual routes.

### CLI and generators

- Scaffold **`@Controller`** base paths with an optional **`--api-version`** (default e.g. **`v1`**) so new modules are versioned **by default**.
- Document **rename/migrate** when bumping major version (may overlap with [MIGRATION.md](MIGRATION.md)).

### Testing

- Integration tests assert **`/v1/...`** and **`/v2/...`** independently; **`BananaTestApp`** examples cover at least one versioned base path.

### Risks (versioning-specific)

- **Duplication** between v1 and v2 handlers — mitigate with **shared domain services** and **version-specific DTO mappers** only at the edge.
- **Drift** between OpenAPI and real routes — mitigate with generated or manually maintained parity checks in docs pipeline (lightweight).

---

## 5. CLI: `bjs` alias

In [packages/bananajs-cli/package.json](../packages/bananajs-cli/package.json):

```json
"bin": {
  "bananajs": "./dist/index.js",
  "bjs": "./dist/index.js"
}
```

Document in docs-site and README.

**CLI generate:** Default output **`src/modules/<name>/`**, **`domain/`** + **`persistence/`**, scaffold **`index.ts`** (not a separate `*.module.ts`) with **`createModule`**, **`InjectionToken`** next to the repository port file, **`controller`** + **`providers`** with **`{ token, useClass }`**, ORM-appropriate **`.entity.ts`** vs **`.model.ts`**. Add a **short comment block** in generated `index.ts` explaining child-container binding for first-time authors. Include **§4**-aligned **versioned** `@Controller` base path when **`--api-version`** is set (see **API versioning**).

---

## 6. After approval

- Update docs-site, README, [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) (modular path summary; link to this plan until implementation ships), [docs/MIGRATION.md](MIGRATION.md) (Awilix → tsyringe, layout migration, **checklist**), example apps, [agents/IMPLEMENTATION.md](../agents/IMPLEMENTATION.md).
- Add a **Module authoring** docs page: token placement (single mental model), one controller per module, **non-CRUD** patterns (events, ports to `lib/`, optional `application/`), common resolution errors, **plugin lifecycle** strategies (lazy vs phase vs fail-fast), **child container** rules, and **API versioning** (URI default, split modules vs dual controllers, OpenAPI).
- Provide **one reference example** using explicit **`modules: [...]`** before optional discovery — teaches the mental model; include **versioned routes** per **§4**.
- Nx build / typecheck / tests for affected projects.

---

## 7. Risks

- Semver-major for container API change; **plugin authors** must migrate — document **minimum steps** and breaking API list.
- **Plugin ordering:** `DataSource` (and peers) available on the root container **before** module providers resolve — enforce via **lazy resolution** or **documented bootstrap phases**; avoid order-dependent flakes in tests.
- **Auto-discovery:** nondeterministic load order and **bundler** constraints — mitigate with sorting + manifest option.
- **Testing gap:** without `BananaTestApp` updates, teams may duplicate wiring — mitigate with documented override patterns.
- **API versioning:** parallel v1/v2 surfaces can **duplicate** handlers or **drift** from OpenAPI — mitigate with shared **domain** layer, version-specific DTOs at the edge, and docs parity (see **§4**).

---

## 8. Architect recommendations (traceability)

Each concern below is **addressed in this plan** as indicated:

| Concern                                               | Where addressed                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Author-facing `{ token, useClass }` vs interfaces** | **§3** — _Canonical author-facing token (single mental model)_; all snippets use **`CatalogItemRepositoryToken`** only; interface is for typing. |
| **Exactly two layers**                                | **§2** — _Non-CRUD logic_ table; optional **`application/`** escape hatch; split modules preferred for heavy orchestration.                      |
| **One controller / bounded context vs URL**           | **§2** bounded context; **§3** _createModule_ — _Escape hatch_; bounded context **≠** URL prefix.                                                |
| **Plugin ordering vs module resolution**              | **§3** — _Plugin lifecycle vs module resolution_ (strategies 1–3 + tests).                                                                       |
| **Child container semantics**                         | **§3** — _Child container semantics (v1)_ table (singleton, one child per module per app lifetime, plugins on root only).                        |
| **ORM per feature / multi-DB**                        | **§3** — _Multi-database_; documented **primary DataSource token** in v1; multi-token follow-up.                                                 |
| **Breaking change surface**                           | **§3** — _Breaking change: AppContext.container…_; hard cut, shims optional, plugin author checklist.                                            |
| **Auto-discovery / route order**                      | **§3** — _Automatic module registration_; stable sort; **middleware stacking** note for future per-module middleware.                            |
| **Testing strategy**                                  | **§3** — _Testing and BananaTestApp_; override API direction + example requirement.                                                              |
| **Security / cross-cutting**                          | **§3** — _Cross-cutting concerns_ table; **v1** global + per-route only.                                                                         |
| **API versioning**                                    | **§4** — URI-first; split modules vs controllers; OpenAPI; CLI `--api-version`; testing.                                                         |

---

## Implementation todos

| ID                     | Task                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api-resolve-controller | Migrate BananaApp/plugins to tsyringe; `createModule` with `controller` + `{ token, useClass }`; `defineBananaAppOptions({ modules })` + internal registration; optional `discoverModules` / manifest; legacy `controllers` path; ARCHITECTURE + docs-site |
| refactor-examples-di   | Examples → `<feature>/index.ts`, tokens in domain repo file; bootstrap: `modules` + **existing** options (logger, security, swagger, …)                                                                                                                    |
| ddd-messaging          | Reframe DDD-first copy; keep `@banana-universe/ddd` imports in generated code where needed                                                                                                                                                                 |
| cli-bjs-bin            | Add `bjs` bin; document                                                                                                                                                                                                                                    |
| api-versioning         | Document §4 patterns; optional `apiPrefix` / `versionPrefix` in app options if spec’d; OpenAPI alignment; CLI `--api-version`; reference example with versioned routes                                                                                     |
| modular-layout-doc     | Document layout, `index.ts` entry, token placement, optional module auto-discovery; CLI scaffolds `index.ts`; align presets/templates; Module authoring page; plugin ordering; bundler notes for discovery                                                 |
| migration-checklist    | MIGRATION.md: Awilix→tsyringe, bootstrap diff, semver note; optional codemod / rename helpers                                                                                                                                                              |
| testing-modular        | BananaTestApp (or docs): modules + token overrides for fakes; integration test patterns                                                                                                                                                                    |
| validate               | Nx + tests + IMPLEMENTATION.md                                                                                                                                                                                                                             |

---

## Workflow

Use `workflows/coding-flow.md`: discovery → implementation → review → validation → user sign-off.
