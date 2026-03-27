# Prisma (`@banana-universe/plugin-prisma`)

Registers a **`PrismaClient`** with the app context and provides **`@Transactional()`** using **`prisma.$transaction`**, with **`PrismaTransactionContext`** for accessing the transactional client inside the callback.

## Install

```bash
npm install @banana-universe/plugin-prisma @prisma/client
npm install -D prisma
```

## Usage

```typescript
import { PrismaClient } from '@prisma/client'
import { BananaApp } from '@banana-universe/bananajs'
import { PrismaPlugin } from '@banana-universe/plugin-prisma'

const prisma = new PrismaClient()

await BananaApp.create([UserController], {
  plugins: [PrismaPlugin(prisma)],
})
```

## API

- **`PrismaPlugin(client)`** — stores client, registers with **awilix** as `prismaClient` when available
- **`@Transactional()`** — runs method body inside `$transaction`; nested access via **`PrismaTransactionContext.getTx()`**
- **`onShutdown`** — **`$disconnect()`**

## MongoDB

Prisma MongoDB has connector limitations (transactions, relations). Example apps and caveats are tracked for Phase **8** in **`plans/EnterpriseRoadmapV3.md`**.

## Roadmap

Phase **6** — **`PrismaRepositoryAdapter`** + mappers — see [Layered architecture](/guide/layered-architecture).
