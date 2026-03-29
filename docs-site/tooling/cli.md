# CLI reference

The **`bjs`** CLI (package **`@banana-universe/bananajs-cli`**) is a **first-class product surface**: scaffolding, codegen, static analysis, DB/OpenAPI tooling, and **AI** flows—including **`.bananarc.json`**, **`ai setup`**, and **`ai generate --module`** for DDD layouts ([Philosophy](/guide/philosophy), [AI module generation](/tooling/ai-module-generation)).

Package: **`@banana-universe/bananajs-cli`** · Binaries: **`bjs`** (shortcut), **`bananajs`**. Source: **`packages/bananajs-cli/src/index.ts`** (Commander.js).

## Global

```bash
bjs --help
bjs --version
```

## `bjs new [appName]`

Scaffolds an app from **built-in presets** (MongoDB/Mongoose or SQL/TypeORM). Writes files under **`./<appName>`**—**no git** and no remote template.

- Prompts for app name if omitted (default suggestion: **`my-bananajs-app`**)
- Interactive terminal: prompts for **MongoDB** vs **SQL** preset
- **`--preset <id>`** — **`mongodb`** \| **`sql`** — skip the preset prompt (use in CI/scripts)
- Non-interactive stdin (no TTY): defaults to **`sql`** if **`--preset`** is omitted; pass **`--preset`** explicitly to choose MongoDB or silence the default

**Scaffold defaults** (both presets):

- **Swagger** — **`swagger.enabled: true`** in bootstrap; **`swagger-ui-express`** in **`dependencies`** so **`/api-docs`** works; OpenAPI JSON at **`/api-docs.json`**.
- **Lint / format** — ESLint 9 flat config + Prettier (**tab width 4**), **`.editorconfig`**, **`npm run lint`** / **`npm run format`**.
- **DB** — Connection/options live in **`src/db/`** (**`mongo.ts`** or **`typeorm-options.ts`**) with explicit error handling or validation; **`main.ts`** wraps startup in **`try/catch`**.
- **Types** — **`@types/node`**, **`@types/express`**, **`@types/swagger-ui-express`** as dev dependencies.
- **Timestamps** — Mongoose **`timestamps: true`** on sample schemas; TypeORM **`@CreateDateColumn`** / **`@UpdateDateColumn`** on sample entities where shown.

Details: [Getting started](/guide/getting-started) (section **What the generated app includes**).

## `bjs generate [type] [name]` (alias: `g`)

**Types:** `controller` | `dto` | `middleware` | **`module`**

- Omit **`type`** and **`name`** in a **TTY** to be prompted (resource kind, then name).
- **`controller` / `dto` / `middleware`** — writes **`cwd/<name>.controller.ts`** (or `.dto.ts` / `.middleware.ts`).
- **`module`** — DDD feature layout aligned with **`bjs new`**: **`src/modules/<kebab>/`** with **`createModule`** in **`index.ts`**, **`domain/`** (entity + repository token), **`application/`**, **`infrastructure/`**, **`<Pascal>.dto.ts`** and **`<Pascal>.controller.ts`** at the module root, tsyringe **`@injectable` / `@inject`**.
  - After a successful write (not **`--dry-run`**), the CLI **registers** the module in **`bootstrap.ts`** (path from **`.bananarc.json`** **`project.bootstrap`**, or **`src/bootstrap.ts`**, or auto-detected). For **TypeORM**, it also **appends** the **`OrmEntity`** to the first **`entities: [...]`** it finds under **`src/`** (best effort).
  - **`--orm typeorm|mongoose|none`** — infrastructure (default: **`typeorm`** when non-interactive and **`--orm`** omitted). **`--orm`** wins over **`--preset`**.
  - **`--preset mongodb|sql`** — same as **`bjs new --preset`** for default ORM mapping.
  - **`--out <dir>`** — base directory (default **`./src`**); module files live under **`modules/<feature>/`** inside that base.
  - **`--skip-bootstrap`** — do not patch **`bootstrap.ts`** or TypeORM **`entities[]`**.
- **`--dry-run`** — print content without writing.

See [Layered architecture & DDD](/guide/layered-architecture).

## `bjs routes`

Static scan for `@Controller` and HTTP decorators — prints a colored route table. **`--root <dir>`** sets the tree to scan (default **`src`**). In a **TTY** without **`--root`**, you are prompted for the directory.

## `bjs migrate`

**Express → BananaJS** codemod. In a **TTY**, confirms before running.

## `bjs db`

- **`--status`** — runs **`typeorm migration:show`** when a TypeORM config is present; if **`mongoose`** is in `package.json`, prints a short note (no migrate CLI).
- With **no flags** in a **TTY**, choose an action from a short menu.

## `bjs openapi export`

- **`--out <path>`** — OpenAPI spec output (default **`./openapi.json`** when unspecified).
- **`--client typescript`** — optional client generation (`openapi-typescript`).
- In a **TTY**, you may be prompted for output path and whether to generate TypeScript types.

## `bjs ai`

Subcommands have **one-letter aliases** (e.g. **`bjs ai g`** = **`bjs ai generate`**). Full table: **[AI hub](/ai/)**.

| Command           | Alias   | Purpose                                                                                                                                                                                                                                                 |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`ai setup`**    | **`s`** | Configure provider + **`.bananarc.json`**                                                                                                                                                                                                               |
| **`ai generate`** | **`g`** | Flat scaffold (**`--from-schema`** / **`--from-prompt`**) or DDD **`--module`**; **TTY** walks through DDD vs flat, then schema vs text. After write, registers bootstrap / TypeORM **`entities[]`** when applicable—same as **`bjs generate module`**. |
| **`ai doc`**      | **`d`** | JSDoc on controllers; **`--file`**, **`--dry-run`**                                                                                                                                                                                                     |
| **`ai review`**   | **`r`** | Structured LLM review; **`--file`**, **`--module`**, or positional path; **`--format json`**, **`--sarif`**                                                                                                                                             |
| **`ai wire`**     | **`w`** | Bootstrap wiring hints (dry-run); optional **`--llm`**                                                                                                                                                                                                  |
| **`ai test`**     | **`t`** | Scaffold **`node:test` + supertest**                                                                                                                                                                                                                    |
| **`ai explain`**  | **`e`** | Short file summary                                                                                                                                                                                                                                      |

Shared: **`--out <dir>`**, **`--dry-run`** where applicable.

::: info DDD modules
**`bjs ai setup`**, **`.bananarc.json`**, and **`ai generate --module`** drive LLM-assisted DDD module generation (same folder layout and **`createModule`** wiring as **`bjs generate module`**). **`bjs ai generate`** with no flags in a TTY asks **DDD vs flat**, then schema vs description (or prompt). A bare **`--module`** flag prompts for inputs.

**`bjs ai generate --module`** accepts **`--orm`** and **`--preset mongodb|sql`**. In **`.bananarc.json`**, **`generate.preset`** sets the default ORM when **`generate.defaultOrm`** is omitted (**`mongodb`** → mongoose, **`sql`** → typeorm).

For **`bjs generate module`** only, **`--skip-bootstrap`** skips patching **`bootstrap.ts`** and TypeORM **`entities[]`**—see [Generate](#bjs-generate-type-name-alias-g) above.
:::

## Related

- [AI commands](/tooling/ai-commands)
- [AI module generation](/tooling/ai-module-generation)
- [Benchmarks](/tooling/benchmarks)
