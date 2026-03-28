# Getting Started

BananaJS (**`@banana-universe/bananajs`**) is a **TypeScript framework on Express** positioned as
**AI-first**, **DX-forward**, **deeply extendable**, and **ready for layered and domain-driven
designs**—including optional DDD-style scaffolding from the CLI (see [Philosophy](/guide/philosophy)).

Pick **one** path:

## 1. New app — CLI

The CLI scaffolds a **new project folder** from **built-in presets** (**MongoDB** / Mongoose or **SQL** / TypeORM). Files are generated on disk—**no git clone** and no external template repository.

**Run it** (pick your package manager tab):

::: code-group

```bash [npm]
npx @banana-universe/bananajs-cli new my-app
```

```bash [pnpm]
pnpm dlx @banana-universe/bananajs-cli new my-app
```

```bash [yarn]
yarn dlx @banana-universe/bananajs-cli new my-app
```

:::

Or install the CLI once globally, then use **`bjs`**:

::: code-group

```bash [npm]
npm install -g @banana-universe/bananajs-cli
bjs new my-app
```

```bash [pnpm]
pnpm add -g @banana-universe/bananajs-cli
bjs new my-app
```

```bash [yarn]
yarn global add @banana-universe/bananajs-cli
bjs new my-app
```

:::

**Non-interactive / CI** — pass a preset explicitly (required in scripts so the choice is not ambiguous):

::: code-group

```bash [npm]
npx @banana-universe/bananajs-cli new my-app --preset sql
npx @banana-universe/bananajs-cli new my-app --preset mongodb
```

```bash [pnpm]
pnpm dlx @banana-universe/bananajs-cli new my-app --preset sql
pnpm dlx @banana-universe/bananajs-cli new my-app --preset mongodb
```

```bash [yarn]
yarn dlx @banana-universe/bananajs-cli new my-app --preset sql
yarn dlx @banana-universe/bananajs-cli new my-app --preset mongodb
```

:::

If stdin is not a TTY and **`--preset`** is omitted, the CLI defaults to **`sql`** and reminds you to pass **`--preset`** when you want MongoDB.

**What you’ll be asked** (interactive terminal only)

1. **App name** — If you run **`new`** without a name, the CLI prompts for it (default suggestion: **`my-bananajs-app`**).
2. **Preset** — **MongoDB** (Mongoose-oriented) or **SQL** (TypeORM-oriented), depending on how you want to store data.

**After it finishes**

1. **`cd`** into the new folder.
2. Install dependencies:

::: code-group

```bash [npm]
npm install
```

```bash [pnpm]
pnpm install
```

```bash [yarn]
yarn install
```

:::

3. Typical next steps: **`npm run build`** then **`npm start`** (the CLI prints a short hint). Copy **`.env.example`** if present, set database URLs, and use the project **README** for scripts and configuration.

Further tooling (**`generate`**, **`ai`**, **`routes`**, …): [CLI reference](/tooling/cli).

## 2. Existing app — add BananaJS

Install dependencies, turn on **decorators** in **`tsconfig.json`**, and import **`reflect-metadata`** once at the top of your entry file (before controllers).

::: code-group

```bash [npm]
npm install @banana-universe/bananajs reflect-metadata express zod
npm install -D typescript @types/node @types/express
```

```bash [pnpm]
pnpm add @banana-universe/bananajs reflect-metadata express zod
pnpm add -D typescript @types/node @types/express
```

```bash [yarn]
yarn add @banana-universe/bananajs reflect-metadata express zod
yarn add -D typescript @types/node @types/express
```

:::

```typescript
import 'reflect-metadata'
import { BananaApp, defineBananaControllers } from '@banana-universe/bananajs'
import { UserController } from './user.controller.js'

new BananaApp({
  controllers: defineBananaControllers(UserController),
})
  .getInstance()
  .listen(3000)
```

Incremental adoption and Express migration: [From Express](/migration/from-express). Concepts and options: [Basic concepts](/guide/basic-concepts), [Advanced concepts](/guide/advanced-concepts).

The **`bjs`** CLI can also help in an existing repo (**`migrate`**, **`generate`**, **`routes`**, **`openapi`**, **`ai`**—see [CLI reference](/tooling/cli)).

## Next

[Recipes](/recipes/) · [Plugins](/plugins/overview) · [AI commands](/tooling/ai-commands)
