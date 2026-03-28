# Layered architecture & DDD

BananaJS supports **feature modules** built with **`createModule`**: one HTTP controller per slice, **domain** and **application** layers, and **infrastructure** adapters. The **`bjs generate module`** command scaffolds files that match that shape; you still **wire** the module into **`defineBananaAppOptions({ modules: [...] })`** yourself (the generator does not write **`index.ts`**).

For **how domain logic relates to databases and ORMs** (ports, adapters, plugins), see [Domain & persistence](/guide/domain-and-persistence). For **tsyringe** containers, **`providers`**, and plugin **`AppContext`**, see [Dependency injection](/guide/dependency-injection).

::: info `@banana-universe/ddd`
The **`ddd`** package provides **Entity**, **ValueObject**, **AggregateRoot**, **Repository** / **FindCriteria**, **UnitOfWork**, and **@DomainService** / **@ApplicationService** (layer metadata + `Injectable`). Use **`bjs generate module <name>`** for a layered file scaffold, or **`bjs ai generate --module`** for LLM-assisted generation.
:::

## Manual layout

You can structure code as **domain / application / infrastructure** without the package—BananaJS does not force a flat layout. **Plugins** (`TypeOrmPlugin`, `MongoosePlugin`, …) attach **infrastructure** at the edges while **controllers** stay thin.

Feature folders use **lowercase** names. Preset apps and recipes use **`src/modules/<feature>/`** (e.g. **`src/modules/articles/`**). Inside a slice, files use **dotted role names** (PascalCase feature or entity prefix + `.` + role): **`Article.controller.ts`**, **`CatalogItem.entity.ts`**, **`Article.service.ts`**.

## CLI scaffold (`bjs generate module`)

**Command:** **`bjs generate module <name> [--orm typeorm|mongoose|none] [--out <dir>]`**

- **Default `--out`:** **`src`** relative to the **current working directory** (not a global project root—run the CLI from your app folder).
- **Default `--orm`:** **`typeorm`** when stdin is **not** a TTY; in an interactive terminal you choose **TypeORM**, **Mongoose**, or **none** (in-memory repository).

Output is written to **`<out>/<kebab-name>/`**, where **`<kebab-name>`** is derived from **`<name>`**. Example with defaults: **`src/my-widget/`** for **`bjs generate module my-widget`**.

**Shape** (matches **`packages/bananajs-cli`** `buildDddModuleFiles`):

```
<out>/<kebab-name>/
  domain/
    <Name>.entity.ts
    <Name>.mapper.ts              # port type (DDD Repository<T> alias) — name is "Mapper" in the template
    <Name>.domain-service.ts      # @DomainService()
  application/
    <Name>.service.ts             # exports <Name>AppService — @ApplicationService()
    <Name>.dto.ts                 # Zod schemas + types
  infrastructure/
    typeorm/<Name>.orm-entity.ts
    typeorm/<Name>.typeorm-repository.ts    # if --orm typeorm
    # OR mongoose/<Name>.mongoose-repository.ts  # if --orm mongoose
    # OR <Name>.in-memory-repository.ts     # if --orm none
  <Name>.controller.ts
```

The generator **does not** create **`index.ts`**, **`createModule`**, or **provider** bindings—you add those when integrating the slice (see [Recipes](/recipes/) and [Dependency injection](/guide/dependency-injection)).

## Repository examples in this repo

Example apps follow the same **layered** idea with small **naming/layout** differences from the raw CLI template:

| App                                | Module                 | Notes                                                                                                                                                                                                                                             |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`apps/example-rest-postgresql`** | **`modules/catalog`**  | Domain port **`CatalogItem.mapper.ts`**; DTO as **`Catalog.dto.ts`** at module root; TypeORM files under **`infrastructure/`** (no **`typeorm/`** subfolder); application class **`CatalogAppService`** in **`application/Catalog.service.ts`**.  |
| **`apps/example-rest-mongodb`**    | **`modules/articles`** | Domain port **`Article.repository.ts`** (same role as **`*.mapper.ts`** in the CLI); **`Article.dto.ts`** at module root; **`Article.mongoose-model.ts`** + **`Article.mongoose-repository.ts`**; exports **`createModule`** from **`index.ts`**. |

Use these as **copy-paste** references for **`createModule`**, **tsyringe** **`@inject`**, and plugin bootstrap.

## Principles

- **Domain** — business rules and model; **no Express**, **no ORM entities** in this layer
- **Application** — orchestration, use cases, DTOs at the boundary
- **Infrastructure** — TypeORM / Mongoose / messaging / external APIs; **mappers** `toDomain` / `toPersistence` keep persistence honest

## Repository model

**`FindCriteria<T>`** (eq / in / like / gt / lt, sorting, paging) keeps queries **explicit and testable**—not a vague `Partial<T>`.

## Transactions

**`UnitOfWork`** plus ORM-specific implementations align application services that touch multiple aggregates; **`@Transactional()`** in plugins exists at the persistence layer for TypeORM and Mongoose.

## Learn more

- [Dependency injection](/guide/dependency-injection) — root vs module containers, **`providers`**, **`createModule`**, testing
- [Domain & persistence](/guide/domain-and-persistence) — domain vs storage, ports and adapters, plugins
- [Philosophy](/guide/philosophy) — DDD and product direction
- [AI module generation](/tooling/ai-module-generation) — LLM-driven **`bjs ai generate --module`**
- [TypeORM integration](/integrations/typeorm) — plugins and repository adapters
- [Mongoose integration](/integrations/mongoose) — plugins and adapters
- [Recipes](/recipes/) — runnable apps with **`createModule`** and layered folders
