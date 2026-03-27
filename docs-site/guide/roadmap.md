# Roadmap (Phases 5–8)

BananaJS is **not** scoped as a minimal CRUD helper. **Phases 1–4 (shipped through v0.4.0)** already deliver enterprise-grade HTTP, security, plugins, observability, multi-tenancy, and **AI-assisted CLI** workflows. **Phases 5–8** complete the vision: **public docs at scale**, **first-class DDD**, **LLM-native module generation**, and **reference apps** that prove the stack.

Detailed specs live in **`plans/EnterpriseRoadmapV3.md`** and the architect review. Links: [EnterpriseRoadmapV3.md](https://github.com/sprakas/banana-universe/blob/main/plans/EnterpriseRoadmapV3.md) · [EnterpriseRoadmapV3ArchitectReviewed.md](https://github.com/sprakas/banana-universe/blob/main/plans/EnterpriseRoadmapV3ArchitectReviewed.md).

---

## Phase 5 — Documentation & GitHub publishing

**Goal:** Documentation and automation that match the ambition of the framework—VitePress + TypeDoc, CI, and publish pipelines—not a pamphlet.

- **VitePress** site (`docs-site/`), **TypeDoc** API reference
- **GitHub Actions:** docs deploy, unified PR checks, ordered npm publishes on tags
- **Versioned docs** (post–Phase 6 when multiple publishable packages need coordinated versioning)

---

## Phase 6 — Domain / application / infrastructure (DDD core)

**Goal:** **`@banana-universe/ddd`** as the structural backbone—entities, value objects, aggregates, repository **contracts**, **`FindCriteria`**, **`@DomainService` / `@ApplicationService`**, infrastructure adapters beside pure domain code.

- TypeORM / Mongoose adapters remain in **plugin** packages; **domain stays ORM-free**
- **`bananajs generate module`** scaffolds layered folders with **`--orm`** choice
- **Unit of Work** interface + adapters (evolving in step with the package)

See [Layered architecture](/guide/layered-architecture).

---

## Phase 7 — LLM-powered module generator

**Goal:** **`llm/`** inside **`bananajs-cli`**, **`.bananarc.json`**, **`bananajs ai setup`**, and **`ai generate --module`**—natural language and schema to **full DDD modules**, with retries, timeouts, and validated intermediate JSON—**without** breaking existing **`ai generate --from-prompt`** users.

---

## Phase 8 — Example recipe apps

**Goal:** **Production-shaped** examples—PostgreSQL, MongoDB, WebSocket chat, multi-tenant—with Docker Compose, tests, and CI—so teams copy patterns, not toy snippets.

---

## Sequencing (high level)

- Docs **site** (Phase 5) supports deep Phase **6** narrative
- Phase **6** **API contracts** stabilize before Phase **7** template churn
- **`@WsBody`** quality bar before the WebSocket **Phase 8** recipe

For positioning, read [Philosophy](/guide/philosophy).
