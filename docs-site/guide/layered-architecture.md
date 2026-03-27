# Layered architecture & DDD

::: info Phase 6 — `@banana-universe/ddd`
The **`ddd`** package and **`bananajs generate module`** layered output are specified in **`plans/EnterpriseRoadmapV3.md`** and tracked for delivery in **Phase 6**. This page describes **where the framework is going**—not a limitation of what you can build **today**.
:::

## Today

You can already structure code as **domain / application / infrastructure** manually—BananaJS does not force a flat layout. **Plugins** (`TypeOrmPlugin`, `PrismaPlugin`, …) are designed so **infrastructure** concerns attach at the edges while **controllers** stay thin.

## Target shape (Phase 6)

Generated modules will follow a **clear bounded context**:

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
    typeorm/<Name>.typeorm-repository.ts   # or prisma/ / in-memory
  <Name>.controller.ts
```

## Principles

- **Domain** — business rules and model; **no Express**, **no ORM entities** in this layer
- **Application** — orchestration, use cases, DTOs at the boundary
- **Infrastructure** — TypeORM / Prisma / messaging / external APIs; **mappers** `toDomain` / `toPersistence` keep persistence honest

## Repository model

The roadmap adopts a **`FindCriteria<T>`**-style API (eq / in / like / gt / lt, sorting, paging)—not a vague `Partial<T>`—so queries stay **explicit and testable**.

## CLI

**`bananajs generate module <name> --orm typeorm|prisma|none`** will scaffold the right infrastructure stub; **default `typeorm`** preserves backward compatibility for existing workflows.

## Transactions

**`UnitOfWork`** plus ORM-specific implementations align application services that touch multiple aggregates; **`@Transactional`** in plugins already exists at the persistence layer for TypeORM and Prisma.

## Learn more

- [Roadmap](/guide/roadmap) — Phases 6–8
- [Philosophy](/guide/philosophy) — DDD as a product direction
- **`plans/EnterpriseRoadmapV3.md`** — full technical specification
