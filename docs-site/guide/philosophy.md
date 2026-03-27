# Philosophy

BananaJS is built for teams who want **serious structure** without **enterprise bloat**. Four ideas drive the product:

## AI-first

Developer productivity is not optional. The **`bananajs`** CLI already ships **AI-assisted** flows—generate from **OpenAPI / JSON Schema** or **natural language**, add **JSDoc**, and **review** controllers for quality. The roadmap doubles down: a dedicated **`llm/`** abstraction, **`.bananarc.json`**, **`ai setup`**, and **full DDD module generation** from a description—so the framework meets you where modern teams work: specs, prompts, and automation—not just hand-written boilerplate.

## Developer experience (DX)

**Decorators** match how you already think about HTTP. **Validation** is declarative. **Responses and errors** are typed and consistent. **OpenAPI** is generated from the same decorators you ship. **Plugins** register with a clear lifecycle; **`BananaApp.create`** handles async setup. **Testing** gets a first-class **`BananaTestApp`** path. The goal is flow: less ceremony, fewer foot-guns, faster iteration—without hiding complexity when you need control.

## Extendable by design

The core stays lean; **everything heavy is optional**. **Official plugins** (TypeORM, Prisma, OpenTelemetry, Zod, WebSocket) implement the same **`BananaPlugin`** contract as your own code. **Auth, ABAC, tenancy, caching, metrics, uploads, rate limits**—pluggable interfaces, not locked-in implementations. You extend the framework; it does not trap you in a single database or cloud story.

## DDD-focused trajectory

Clean architecture is a **first-class product direction**, not an afterthought. **Phase 6** introduces **`@banana-universe/ddd`**—entities, value objects, aggregates, repository contracts, **`@DomainService` / `@ApplicationService`**, and **CLI-generated** domain / application / infrastructure layouts—while ORM adapters stay in infrastructure where they belong. Today you can already organize code in layers; the roadmap makes that **generated, consistent, and documented** across teams.

---

**v0.4.0** delivers the enterprise surface (security, multi-tenancy, plugins, observability, AI CLI). **Phases 6–8** complete the arc: **DDD package**, **LLM module generator**, and **recipe apps** that prove the stack end-to-end. See [Roadmap](/guide/roadmap).
