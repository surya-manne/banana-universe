# CLI reference

The **`bananajs`** CLI is a **first-class product surface**: scaffolding, codegen, static analysis, DB/OpenAPI tooling, and **AI** flows—including **`.bananarc.json`**, **`ai setup`**, and **`ai generate --module`** for DDD layouts ([Philosophy](/guide/philosophy), [AI module generation](/tooling/ai-module-generation)).

Package: **`@banana-universe/bananajs-cli`** · Entry: **`bananajs`**. Source: **`packages/bananajs-cli/src/index.ts`** (Commander.js).

## Global

```bash
bananajs --help
bananajs --version
```

## `bananajs new [appName]`

Scaffolds an app from **built-in presets** (MongoDB/Mongoose or SQL/TypeORM). Writes files under **`./<appName>`**—**no git** and no remote template.

- Prompts for app name if omitted (default suggestion: **`my-bananajs-app`**)
- Interactive terminal: prompts for **MongoDB** vs **SQL** preset
- **`--preset <id>`** — **`mongodb`** \| **`sql`** — skip the preset prompt (use in CI/scripts)
- Non-interactive stdin (no TTY): defaults to **`sql`** if **`--preset`** is omitted; pass **`--preset`** explicitly to choose MongoDB or silence the default

## `bananajs generate <type> <name>` (alias: `g`)

**Types:** `controller` | `dto` | `middleware` | **`module`**

- **`controller` / `dto` / `middleware`** — writes **`cwd/<name>.controller.ts`** (or `.dto.ts` / `.middleware.ts`)
- **`module`** — layered **DDD** tree under **`--out`** (default **`./src`**): `domain/`, `application/`, `infrastructure/`, and **`<kebab>.controller.ts`**
  - **`--orm typeorm|mongoose|none`** — infrastructure stub (default: **`typeorm`** in non-interactive mode; interactive prompt when TTY and `--orm` omitted)
  - **`--out <dir>`** — base directory for generated folders
- **`--dry-run`** — print content without writing

See [Layered architecture & DDD](/guide/layered-architecture).

## `bananajs routes`

Static **AST scan** of **`src/`** for `@Controller` and HTTP decorators — prints a colored route table.

## `bananajs migrate`

**Express → BananaJS** codemod: generates controller stubs from Express route patterns.

## `bananajs db`

- **`--status`** — runs **`typeorm migration:show`** when a TypeORM config is present; if **`mongoose`** is in `package.json`, prints a short note (no migrate CLI)

## `bananajs openapi export`

- **`--out <path>`** — OpenAPI spec output
- **`--client typescript`** — optional client generation (`openapi-typescript`)

## `bananajs ai`

Subcommands:

| Command           | Purpose                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| **`ai generate`** | **`--from-schema <file>`** (JSON Schema / OpenAPI) or **`--from-prompt <text>`** (LLM; needs provider env vars) |
| **`ai doc`**      | JSDoc on controllers; **`--file`**, **`--dry-run`**                                                             |
| **`ai review`**   | LLM review; **`--file`**                                                                                        |

Shared: **`--out <dir>`**, **`--dry-run`** where applicable.

::: info DDD modules
**`bananajs ai setup`**, **`.bananarc.json`**, and **`ai generate --module`** drive LLM-assisted DDD module generation. For deterministic scaffolding **without** an LLM, use **`bananajs generate module`**.
:::

## Related

- [AI commands](/tooling/ai-commands)
- [AI module generation](/tooling/ai-module-generation)
- [Benchmarks](/tooling/benchmarks)
