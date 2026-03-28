# TypeORM (`@banana-universe/plugin-typeorm`)

Official plugin: registers a **TypeORM `DataSource`**, supports **`@InjectRepository(Entity)`** (constructor parameter metadata with explicit indices — no `emitDecoratorMetadata`), and **`@Transactional()`** with **AsyncLocalStorage**-scoped query runners.

## Install

```bash
npm install @banana-universe/plugin-typeorm typeorm reflect-metadata
# driver, e.g.
npm install pg
```

## Usage

Build a **`BananaPlugin`** with **`TypeOrmPlugin(options)`** where `options` is the **TypeORM `DataSource` constructor options** (entities, migrations, etc.).

```typescript
import { BananaApp, defineBananaControllers } from '@banana-universe/bananajs'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'

await BananaApp.create({
  controllers: defineBananaControllers(UserController),
  plugins: [
    TypeOrmPlugin({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [UserEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
  ],
})
```

## Features

- **`TypeOrmPlugin`** — lazy-imports `typeorm`, constructs `DataSource`, **`initialize()`**, stores module-level reference for `@Transactional`
- **`@InjectRepository(Entity)`** — when **awilix** is present, patches constructors to inject `Repository<Entity>`
- **`@Transactional()`** — wraps method in `QueryRunner` transaction; requires plugin registered
- **`TransactionContext.getRunner()`** — access active runner inside transactional methods
- **`onShutdown`** — destroys DataSource

## Peer dependencies

- **`typeorm`** — required at runtime
- **`awilix`** — optional; repository injection skipped if absent

## Domain repositories

**`TypeOrmRepositoryAdapter`** and **`TypeOrmUnitOfWork`** bridge **`@banana-universe/ddd`** repository contracts to TypeORM—see [Layered architecture](/guide/layered-architecture) and `packages/plugin-typeorm`.
