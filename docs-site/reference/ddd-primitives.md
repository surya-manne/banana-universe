# DDD primitives — `@banana-universe/ddd`

The **`@banana-universe/ddd`** package ships the building blocks for domain-driven layouts: an `Entity` base class, `ValueObject`, `AggregateRoot`, a `Repository` port, a `UnitOfWork` contract, and layer decorators. It is consumed by the **`bjs generate module --structure ddd`** scaffold and the **`bjs ai generate --module`** flow, but the exports are stable and you can use them in any BananaJS app.

```bash
npm install @banana-universe/ddd reflect-metadata
```

<div class="note note-deep">

**Adopt at your own pace.** The `ddd` package is not required by `bananajs` core — install it only when a feature has real business rules and benefits from layered separation. A flat controller + service module is a fine starting point.

</div>

## Exports at a glance

| Export | Kind | Purpose |
|---|---|---|
| `Entity<Props>` | class | Base class for entities with identity (`id`) and props |
| `ValueObject<Props>` | class | Base class for immutable, equality-by-value objects |
| `AggregateRoot<Props>` | class | Entity that owns invariants over a graph of child entities + emits `DomainEvent`s |
| `DomainEvent` | type | Plain shape for events emitted from aggregates |
| `Repository<T>` | interface | Standard port: `findById`, `findAll`, `save`, `delete`, `count` |
| `FindCriteria<T>` | type | Filter object accepted by `findAll` (no raw SQL in services) |
| `UnitOfWork` | interface | Optional transaction boundary contract |
| `@ApplicationService()` | decorator | Marks a class as an application-layer use case |
| `@DomainService()` | decorator | Marks a class as a domain-layer service |

Source: [`packages/ddd/src/index.ts`](https://github.com/surya-manne/banana-universe/tree/main/packages/ddd/src/index.ts).

## `Entity<Props>`

An entity is a thing with identity. Two entities with the same props but different `id` are not equal. Compare entities by `id`, never by reference or by props.

```typescript
import { Entity } from '@banana-universe/ddd'

interface ArticleProps {
  title:     string
  body:      string
  authorId:  string
  createdAt: Date
}

export class Article extends Entity<ArticleProps> {
  static create(props: ArticleProps, id?: string) {
    return new Article(props, id)
  }

  get title()    { return this.props.title }
  get body()     { return this.props.body }
  get authorId() { return this.props.authorId }

  rename(newTitle: string) {
    if (!newTitle.trim()) throw new Error('Title cannot be empty')
    this.props.title = newTitle
  }
}
```

`Entity` stores the props internally and exposes `id` and an `equals(other)` method. Identity is set in the constructor — pass an explicit `id` to rehydrate from persistence, omit it to mint a new one.

## `ValueObject<Props>`

A value object has no identity. Two value objects with equal props are interchangeable. Always immutable.

```typescript
import { ValueObject } from '@banana-universe/ddd'

interface MoneyProps {
  amount:   number
  currency: 'USD' | 'EUR' | 'INR'
}

export class Money extends ValueObject<MoneyProps> {
  static of(amount: number, currency: MoneyProps['currency']) {
    if (amount < 0) throw new Error('Amount must be non-negative')
    return new Money({ amount, currency })
  }

  add(other: Money) {
    if (other.props.currency !== this.props.currency) {
      throw new Error('Cannot add different currencies')
    }
    return Money.of(this.props.amount + other.props.amount, this.props.currency)
  }
}
```

## `AggregateRoot<Props>`

An aggregate root owns invariants across a cluster of entities and emits `DomainEvent`s when state changes. The `save` boundary of a repository should always be an aggregate root, never a child entity.

```typescript
import { AggregateRoot, DomainEvent } from '@banana-universe/ddd'

export class Order extends AggregateRoot<OrderProps> {
  static place(props: OrderProps) {
    const order = new Order(props)
    order.addEvent({ name: 'order.placed', payload: { orderId: order.id } })
    return order
  }

  cancel(reason: string) {
    if (this.props.status === 'cancelled') return
    this.props.status = 'cancelled'
    this.addEvent({ name: 'order.cancelled', payload: { orderId: this.id, reason } })
  }
}
```

`addEvent`, `pullEvents`, and `clearEvents` are provided by the base class — your application layer pulls events after a successful `save` and dispatches them.

## `Repository<T>`

The port your application code depends on. Concrete adapters live in `infrastructure/` and implement this interface — TypeORM, Mongoose, in-memory for tests.

```typescript
export interface Repository<T> {
  findById(id: string): Promise<T | null>
  findAll(criteria?: FindCriteria<T>): Promise<T[]>
  save(entity: T): Promise<void>
  delete(id: string): Promise<void>
  count(criteria?: FindCriteria<T>): Promise<number>
}
```

```typescript
// domain/article.repository.ts — the PORT
import type { Repository } from '@banana-universe/ddd'
import type { Article } from './article.entity.js'

export type ArticleRepository = Repository<Article>
export const ARTICLE_REPOSITORY = Symbol.for('article.repository')
```

```typescript
// infrastructure/typeorm-article.repository.ts — the ADAPTER
import { injectable } from '@banana-universe/bananajs'
import type { ArticleRepository } from '../domain/article.repository.js'

@injectable()
export class TypeOrmArticleRepository implements ArticleRepository {
  async findById(id: string) { /* ... */ }
  async findAll(criteria)    { /* ... */ }
  async save(article)        { /* ... */ }
  async delete(id)           { /* ... */ }
  async count(criteria)      { /* ... */ }
}
```

Swap PostgreSQL for MongoDB by binding `ARTICLE_REPOSITORY` to a Mongoose adapter in the module's `index.ts` — the application layer doesn't change.

## `FindCriteria<T>`

A structural filter type. Services express intent (`{ authorId: 'abc', status: 'published' }`) without leaking ORM syntax. Adapters translate the criteria into their backing query language.

## `UnitOfWork`

Optional transactional boundary. Wrap a multi-write use case in `uow.run(async () => { ... })` and the adapter (e.g., the TypeORM plugin's `@Transactional()`) opens a transaction, commits on success, rolls back on throw. Use when a single business operation touches multiple aggregates that must persist atomically.

## Layer decorators

`@ApplicationService()` and `@DomainService()` are tagging decorators — they don't change runtime behaviour, they label intent for code review, AI tooling, and the `bjs ai review` checks. Use them on classes in `application/` and `domain/services/` respectively.

```typescript
import { ApplicationService } from '@banana-universe/ddd'

@ApplicationService()
@injectable()
export class PlaceOrderUseCase {
  constructor(/* ... */) {}
  async execute(input: PlaceOrderInput) { /* orchestrates domain */ }
}
```

## Generated layout

When you run `bjs generate module orders --structure ddd --orm typeorm`, the CLI scaffolds:

```
src/modules/orders/
├── domain/
│   ├── order.entity.ts                Entity / AggregateRoot
│   ├── value-objects/money.ts         ValueObject
│   └── order.repository.ts            Repository port + token
├── application/
│   ├── place-order.use-case.ts        @ApplicationService
│   └── cancel-order.use-case.ts
├── infrastructure/
│   ├── typeorm-order.repository.ts    Adapter implementing the port
│   └── order.orm-entity.ts            ORM schema
├── interface/
│   ├── orders.controller.ts           @Controller + @Body / @Params decorators
│   └── dto/                           Zod schemas
└── orders.module.ts                   createModule — binds port → adapter
```

All the primitives above ship in the package and are imported as needed. The structure exists so the **application layer can be tested without infrastructure**.

## Related

- [Layered architecture & DDD](/guide/layered-architecture) — the conceptual walkthrough
- [Domain & persistence](/guide/domain-and-persistence) — port / adapter pattern in depth
- [Dependency injection](/guide/dependency-injection) — how port → adapter binding works
- [CLI: `bjs generate module`](/tooling/cli#bjs-generate-type-name-alias-g) — the scaffold command
