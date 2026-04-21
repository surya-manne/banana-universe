# @banana-universe/plugin-mongoose

Mongoose integration plugin for BananaJS with session-based transaction support.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/plugin-mongoose mongoose reflect-metadata
```

## Core API Surface

- `MongoosePlugin(connection)`
- `Transactional()`
- `MongooseTransactionContext`

## Minimal Working Setup

```ts
import mongoose from 'mongoose';
import { BananaApp } from '@banana-universe/bananajs';
import { MongoosePlugin } from '@banana-universe/plugin-mongoose';

const connection = await mongoose.createConnection('mongodb://127.0.0.1:27017/banana').asPromise();

await BananaApp.create({
  controllers: [],
  plugins: [MongoosePlugin(connection)],
});
```

## Transactional Method Example

```ts
import { Transactional, MongooseTransactionContext } from '@banana-universe/plugin-mongoose';

class InventoryService {
  @Transactional()
  async reserve() {
    const session = MongooseTransactionContext.getSession();
    // pass { session } to model operations
  }
}
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
