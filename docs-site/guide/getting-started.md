# Getting Started

BananaJS (**`@banana-universe/bananajs`**) is a **TypeScript framework on Express** positioned as
**AI-first**, **DX-forward**, **deeply extendable**, and **ready for layered and domain-driven
designs**—including optional DDD-style scaffolding from the CLI (see [Philosophy](/guide/philosophy)).

Pick **one** path:

## 1. New app — CLI

The CLI scaffolds a **new project folder** from an official starter.

**Run it**

```bash
npx @banana-universe/bananajs-cli new my-app
```

Or install the CLI once globally, then use **`bananajs`**:

```bash
npm install -g @banana-universe/bananajs-cli
bananajs new my-app
```

**What you’ll be asked**

1. **App name** — If you run **`new`** without a name, the CLI prompts for it (default suggestion: **`my-bananajs-app`**).
2. **Template** — Choose **MongoDB** (Mongoose-oriented starter) or **SQL** (SQL / TypeORM-oriented starter), depending on how you want to store data.

**After it finishes**

1. **`cd`** into the new folder.
2. **`npm install`** (or follow the package manager the README mentions).
3. Open the project **README**: copy **`.env.example`** if present, set database URLs, and use the documented **`npm`** scripts to run and test the app.

Further tooling (**`generate`**, **`ai`**, **`routes`**, …): [CLI reference](/tooling/cli).

## 2. Existing app — add BananaJS

Install dependencies, turn on **decorators** in **`tsconfig.json`**, and import **`reflect-metadata`** once at the top of your entry file (before controllers).

```bash
npm install @banana-universe/bananajs reflect-metadata express zod
npm install -D typescript @types/node @types/express
```

```typescript
import 'reflect-metadata'
import { BananaApp } from '@banana-universe/bananajs'
import { UserController } from './user.controller.js'

new BananaApp([UserController], {}).getInstance().listen(3000)
```

Incremental adoption and Express migration: [From Express](/migration/from-express). Concepts and options: [Basic concepts](/guide/basic-concepts), [Advanced concepts](/guide/advanced-concepts).

The **`bananajs`** CLI can also help in an existing repo (**`migrate`**, **`generate`**, **`routes`**, **`openapi`**, **`ai`**—see [CLI reference](/tooling/cli)).

## Next

[Recipes](/recipes/) · [Plugins](/plugins/overview) · [AI commands](/tooling/ai-commands)
