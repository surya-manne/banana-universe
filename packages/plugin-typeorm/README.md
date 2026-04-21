# @banana-universe/plugin-typeorm

TypeORM integration plugin for BananaJS with DataSource registration and transactional helpers.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/plugin-typeorm typeorm reflect-metadata
```

## Core API Surface

- `TypeOrmPlugin(options)`
- `Transactional()`
- `TransactionContext`
- `InjectRepository(Entity)`

## Minimal Working Setup

```ts
import { BananaApp } from '@banana-universe/bananajs';
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm';

await BananaApp.create({
  controllers: [],
  plugins: [
    TypeOrmPlugin({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'banana',
      entities: [],
      synchronize: false,
    }),
  ],
});
```

## Transactional Method Example

```ts
import { Transactional } from '@banana-universe/plugin-typeorm';

class OrderService {
  @Transactional()
  async placeOrder() {
    // all DB work inside one transaction
  }
}
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
