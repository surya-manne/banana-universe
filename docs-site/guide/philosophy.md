# Philosophy

BananaJS is built for teams who want **serious structure** without **enterprise bloat**. Four ideas drive the product:

## AI-first

Developer productivity is not optional. The **`bananajs`** CLI ships **AI-assisted** flows: generate from **OpenAPI / JSON Schema** or **natural language**, add **JSDoc**, and **review** controllers. **`bananajs ai setup`** writes **`.bananarc.json`**; the **`llm/`** provider layer supports **Ollama** (default), **llama.cpp**, **OpenAI**, and **Anthropic**. **`bananajs ai generate --module`** produces **DDD-shaped** domain, application, and infrastructure folders from a description or schema—so the framework meets teams where they work: specs, prompts, and automation—not only hand-written boilerplate.

## Developer experience (DX)

**Decorators** match how you already think about HTTP. **Validation** is declarative. **Responses and errors** are typed and consistent. **OpenAPI** is generated from the same decorators you ship. **Plugins** register with a clear lifecycle; **`BananaApp.create`** handles async setup. **Testing** gets a first-class **`BananaTestApp`** path. The goal is flow: less ceremony, fewer foot-guns, faster iteration—without hiding complexity when you need control.

## Extendable by design

The core stays lean; **everything heavy is optional**. **Official plugins** (TypeORM, Mongoose, OpenTelemetry, Zod, WebSocket) implement the same **`BananaPlugin`** contract as your own code. **Auth, ABAC, tenancy, caching, metrics, uploads, rate limits**—pluggable interfaces, not locked-in implementations. You extend the framework; it does not trap you in a single database or cloud story.

## Domain-driven design

**`@banana-universe/ddd`** provides **Entity**, **ValueObject**, **AggregateRoot**, **Repository** with **`FindCriteria`**, **UnitOfWork**, and **`@DomainService` / `@ApplicationService`**. Official ORM plugins ship **repository adapters** and transactional helpers. **`bananajs generate module`** (or **`ai generate --module`**) scaffolds **domain / application / infrastructure** layouts while adapters stay in infrastructure—generated, consistent, and documented.

---

The stack covers security, multi-tenancy, plugins, observability, and AI-assisted CLI workflows, with **schema-driven** request validation. **[Recipes](/recipes/)** in the repository walk through PostgreSQL, MongoDB, Fastify, WebSocket, and multi-tenant setups end-to-end.
