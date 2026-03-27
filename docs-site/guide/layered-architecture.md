# Layered architecture & DDD

::: info `@banana-universe/ddd`
The **`ddd`** package provides **Entity**, **ValueObject**, **AggregateRoot**, **Repository** / **FindCriteria**, **UnitOfWork**, and **@DomainService** / **@ApplicationService** (layer metadata + `Injectable`). Use **`bananajs generate module <name>`** for a full layered scaffold.
:::

## Manual layout

You can structure code as **domain / application / infrastructure** without the package—BananaJS does not force a flat layout. **Plugins** (`TypeOrmPlugin`, `MongoosePlugin`, …) attach **infrastructure** at the edges while **controllers** stay thin.

## Generated module shape

`bananajs generate module <name> [--orm typeorm|mongoose|none] [--out ./src]` produces a **bounded context**:

```
src/<name>/
  domain/
    <Name>.entity.ts
    <Name>.repository.ts      # interface — persistence contract
    <Name>.service.ts         # @DomainService
  application/
    <Name>.app-service.ts     # @ApplicationService
    <Name>.dto.ts
  infrastructure/
    typeorm/<Name>.typeorm-repository.ts   # or mongoose/ / in-memory
  <Name>.controller.ts
```

## Principles

- **Domain** — business rules and model; **no Express**, **no ORM entities** in this layer
- **Application** — orchestration, use cases, DTOs at the boundary
- **Infrastructure** — TypeORM / Mongoose / messaging / external APIs; **mappers** `toDomain` / `toPersistence` keep persistence honest

## Repository model

The roadmap adopts a **`FindCriteria<T>`**-style API (eq / in / like / gt / lt, sorting, paging)—not a vague `Partial<T>`—so queries stay **explicit and testable**.

## CLI

**`bananajs generate module <name> --orm typeorm|mongoose|none`** scaffolds the infrastructure stub; **`typeorm`** is the default when stdin is not a TTY.

## Transactions

**`UnitOfWork`** plus ORM-specific implementations align application services that touch multiple aggregates; **`@Transactional`** in plugins already exists at the persistence layer for TypeORM and Mongoose.

## Learn more

- [Roadmap](/guide/roadmap) — Phases 6–8
- [Philosophy](/guide/philosophy) — DDD as a product direction
- **`plans/EnterpriseRoadmapV3.md`** — full technical specification
