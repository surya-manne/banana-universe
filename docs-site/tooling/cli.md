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

## `bjs generate <type> <name>` (alias: `g`)

**Types:** `controller` | `dto` | `middleware` | **`module`**

- **`controller` / `dto` / `middleware`** — writes **`cwd/<name>.controller.ts`** (or `.dto.ts` / `.middleware.ts`)
- **`module`** — layered **DDD** tree under **`--out`** (default **`./src`**): `domain/`, `application/`, `infrastructure/`, and **`<Pascal>.controller.ts`** (dotted role names, e.g. **`Product.controller.ts`**, **`Product.entity.ts`**)
  - **`--orm typeorm|mongoose|none`** — infrastructure stub (default: **`typeorm`** in non-interactive mode; interactive prompt when TTY and `--orm` omitted). **`--orm`** wins if both **`--orm`** and **`--preset`** are passed.
  - **`--preset mongodb|sql`** — same vocabulary as **`bjs new --preset`**: **`mongodb`** → Mongoose stub, **`sql`** → TypeORM stub (handy in CI instead of remembering **`--orm mongoose`** / **`typeorm`**)
  - **`--out <dir>`** — base directory for generated folders
- **`--dry-run`** — print content without writing

See [Layered architecture & DDD](/guide/layered-architecture).

## `bjs routes`

Static **AST scan** of **`src/`** for `@Controller` and HTTP decorators — prints a colored route table.

## `bjs migrate`

**Express → BananaJS** codemod: generates controller stubs from Express route patterns.

## `bjs db`

- **`--status`** — runs **`typeorm migration:show`** when a TypeORM config is present; if **`mongoose`** is in `package.json`, prints a short note (no migrate CLI)

## `bjs openapi export`

- **`--out <path>`** — OpenAPI spec output
- **`--client typescript`** — optional client generation (`openapi-typescript`)

## `bjs ai`

Subcommands:

| Command           | Purpose                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| **`ai generate`** | **`--from-schema <file>`** (JSON Schema / OpenAPI) or **`--from-prompt <text>`** (LLM; needs provider env vars) |
| **`ai doc`**      | JSDoc on controllers; **`--file`**, **`--dry-run`**                                                             |
| **`ai review`**   | LLM review; **`--file`**                                                                                        |

Shared: **`--out <dir>`**, **`--dry-run`** where applicable.

::: info DDD modules
**`bjs ai setup`**, **`.bananarc.json`**, and **`ai generate --module`** drive LLM-assisted DDD module generation. For deterministic scaffolding **without** an LLM, use **`bjs generate module`**.

**`bjs ai generate --module`** accepts **`--orm`** and **`--preset mongodb|sql`** (same as **`generate module`**; **`--orm`** overrides **`--preset`**). In **`.bananarc.json`**, **`generate.preset`** sets the default ORM when **`generate.defaultOrm`** is omitted (**`mongodb`** → mongoose, **`sql`** → typeorm).
:::

## Related

- [AI commands](/tooling/ai-commands)
- [AI module generation](/tooling/ai-module-generation)
- [Benchmarks](/tooling/benchmarks)
