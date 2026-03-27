# Mongoose (`@banana-universe/plugin-mongoose`)

Registers a **Mongoose `Connection`** with the app context, exposes **`mongooseConnection`** on Awilix when available, and provides **`@Transactional()`** using MongoDB **sessions** with **`session.withTransaction`** (requires a replica set or sharded cluster for multi-document transactions).

## Install

```bash
npm install @banana-universe/plugin-mongoose mongoose
```

## Usage

```typescript
import mongoose from 'mongoose'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'

const connection = await mongoose.createConnection(process.env.DATABASE_URL!).asPromise()

const app = await BananaApp.create([ArticleController], {
  plugins: [MongoosePlugin(connection)],
  // ...
})
```

- **`MongoosePlugin(connection)`** — stores the connection, registers **`mongooseConnection`** on Awilix when present, **`onShutdown`** calls **`connection.close()`**
- **`@Transactional()`** — runs the method inside **`startSession` → `withTransaction`**; use **`MongooseTransactionContext.getSession()`** to pass `{ session }` to model operations inside the transaction
- Standalone `mongod` does **not** support transactions; use a replica set for **`@Transactional`**

Phase **6** — **`MongooseRepositoryAdapter`** + mappers — see [Layered architecture](/guide/layered-architecture).
