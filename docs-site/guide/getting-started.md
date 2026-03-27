# Getting Started

BananaJS (**`@banana-universe/bananajs`**, **v0.4.0**) is a **TypeScript framework on Express** positioned as **AI-first**, **DX-forward**, **deeply extendable**, and **moving decisively toward first-class DDD** (see [Philosophy](/guide/philosophy) and [Roadmap](/guide/roadmap)).

It uses **decorators** for routing and **class-validator** for request validation. Metadata uses **`Reflect.defineMetadata`** — enable **`experimentalDecorators`**; **`emitDecoratorMetadata`** is not required (and is not used in this workspace).

## Install

```bash
npm install @banana-universe/bananajs reflect-metadata express class-validator class-transformer
npm install -D typescript @types/node @types/express
```

Peer dependencies power optional subsystems (`awilix`, `express-rate-limit`, `multer`, `prom-client`, OpenAPI UIs, etc.). See the [core `package.json`](https://github.com/sprakas/banana-universe/blob/main/packages/bananajs/package.json) for the authoritative peer list—install what you use.

## TypeScript

Use a modern target and **NodeNext** modules (matches the monorepo):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "experimentalDecorators": true,
    "strict": true,
    "esModuleInterop": true
  }
}
```

Import **`reflect-metadata` once** at the application entry point (before controllers load).

## Minimal app

```typescript
// src/main.ts
import 'reflect-metadata'
import { BananaApp } from '@banana-universe/bananajs'
import { UserController } from './user.controller.js'

const app = new BananaApp([UserController], {}).getInstance()

app.listen(3000, () => {
  console.log('Listening on :3000')
})
```

`BananaApp` is also the **default export** — `import BananaApp from '@banana-universe/bananajs'` is valid.

## Controllers and DTOs

**`apps/bananajs-demo`** is the reference CRUD sample: [`User.controller.ts`](https://github.com/sprakas/banana-universe/tree/main/apps/bananajs-demo) with `@Controller`, HTTP verbs, `@Body` / `@Params` / `@Query`, and **`SuccessResponse`**.

Validation runs **before** your handler; invalid requests return **400** with structured detail.

## Plugins and async setup

Official **database, observability, Zod, and WebSocket** integrations use **`BananaPlugin`**. For async `register()` work, use:

```typescript
import { BananaApp } from '@banana-universe/bananajs'

const app = await BananaApp.create([UserController], {
  plugins: [
    /* TypeORM, Prisma, OTel, WebSocket, … */
  ],
})
app.getInstance().listen(3000)
```

Sync **`new BananaApp(...)`** remains valid for slimmer apps.

## AI & CLI

The **`bananajs`** CLI ships **generate**, **routes**, **migrate**, **db**, **openapi export**, and **`ai`** (generate from schema/prompt, doc, review). That is the **today** story; the **roadmap** adds **`llm/`**, **`.bananarc`**, **`ai setup`**, and **full DDD module generation**. See [Tooling](/tooling/cli) and [Roadmap](/guide/roadmap).

## Tests

**`BananaTestApp`** from **`@banana-universe/bananajs/testing`** drives the HTTP surface in tests without manual port juggling.

## Next

- [Philosophy](/guide/philosophy) — AI-first, DX, extendability, DDD
- [Basic concepts](/guide/basic-concepts)
- [Advanced concepts](/guide/advanced-concepts)
- [Roadmap](/guide/roadmap)
