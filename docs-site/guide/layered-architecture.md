# Layered architecture & DDD

::: info `@banana-universe/ddd`
The **`ddd`** package provides **Entity**, **ValueObject**, **AggregateRoot**, **Repository** / **FindCriteria**, **UnitOfWork**, and **@DomainService** / **@ApplicationService** (layer metadata + `Injectable`). Use **`bananajs generate module <name>`** for a full layered scaffold, or **`bananajs ai generate --module`** for LLM-assisted generation.
:::

## Manual layout

You can structure code as **domain / application / infrastructure** without the package—BananaJS does not force a flat layout. **Plugins** (`TypeOrmPlugin`, `MongoosePlugin`, …) attach **infrastructure** at the edges while **controllers** stay thin.

## Generated module shape

`bananajs generate module <name> [--orm typeorm|mongoose|none] [--out ./src]` produces a **bounded context**:

```
src/<name>/
  domain/
    <Name>Entity.ts           # domain entity
    <Name>Mapper.ts           # persistence port (DDD Repository<T> alias + DI token)
    <Name>DomainService.ts    # @DomainService
  application/
    <Name>AppService.ts       # @ApplicationService
    <Name>Dto.ts              # Zod schemas + types (list/query params live here too)
  infrastructure/
    typeorm/<Name>TypeOrmRepository.ts   # or mongoose/ / in-memory
  <Name>Controller.ts
```

## Principles

- **Domain** — business rules and model; **no Express**, **no ORM entities** in this layer
- **Application** — orchestration, use cases, DTOs at the boundary
- **Infrastructure** — TypeORM / Mongoose / messaging / external APIs; **mappers** `toDomain` / `toPersistence` keep persistence honest

## Repository model

**`FindCriteria<T>`** (eq / in / like / gt / lt, sorting, paging) keeps queries **explicit and testable**—not a vague `Partial<T>`.

## CLI

**`bananajs generate module <name> --orm typeorm|mongoose|none`** scaffolds the infrastructure stub; **`typeorm`** is the default when stdin is not a TTY.

## Transactions

**`UnitOfWork`** plus ORM-specific implementations align application services that touch multiple aggregates; **`@Transactional`** in plugins exists at the persistence layer for TypeORM and Mongoose.

## Learn more

- [Philosophy](/guide/philosophy) — DDD and product direction
- [AI module generation](/tooling/ai-module-generation) — LLM-driven `ai generate --module`
- [TypeORM integration](/integrations/typeorm) — plugins and repository adapters
