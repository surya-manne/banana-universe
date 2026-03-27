# CLI reference

The **`bananajs`** CLI is a **first-class product surface**: scaffolding, codegen, static analysis, DB/OpenAPI tooling, and **AI** flows—built to scale with the **LLM and DDD roadmap** ([Philosophy](/guide/philosophy), [Roadmap](/guide/roadmap)).

Package: **`@banana-universe/bananajs-cli`** · Entry: **`bananajs`**. Source: **`packages/bananajs-cli/src/index.ts`** (Commander.js). Version **0.3.0** at time of writing.

## Global

```bash
bananajs --help
bananajs --version
```

## `bananajs new [appName]`

Scaffolds an app by **cloning** a GitHub template (MongoDB or SQL). Requires **`git`** on PATH.

- Prompts for app name if omitted
- Prompts **MongoDB** vs **SQL** template
- Removes `.git` after clone

## `bananajs generate <type> <name>` (alias: `g`)

**Types:** `controller` | `dto` | `middleware` | **`module`**

- **`controller` / `dto` / `middleware`** — writes **`cwd/<name>.controller.ts`** (or `.dto.ts` / `.middleware.ts`)
- **`module`** — layered **DDD** tree under **`--out`** (default **`./src`**): `domain/`, `application/`, `infrastructure/`, and **`<kebab>.controller.ts`**
  - **`--orm typeorm|prisma|none`** — infrastructure stub (default: **`typeorm`** in non-interactive mode; interactive prompt when TTY and `--orm` omitted)
  - **`--out <dir>`** — base directory for generated folders
- **`--dry-run`** — print content without writing

See [Layered architecture & DDD](/guide/layered-architecture).

## `bananajs routes`

Static **AST scan** of **`src/`** for `@Controller` and HTTP decorators — prints a colored route table.

## `bananajs migrate`

**Express → BananaJS** codemod: generates controller stubs from Express route patterns.

## `bananajs db`

- **`--status`** — runs **`typeorm migration:show`** or **`prisma migrate status`** via `npx` (whichever applies)

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

::: info Phase 7
**`bananajs ai setup`**, **`.bananarc.json`**, and **`ai generate --module`** (LLM-driven DDD module) are on the [roadmap](/guide/roadmap). Use **`bananajs generate module`** today for scaffolded modules without an LLM.
:::

## Related

- [AI commands](/tooling/ai-commands)
- [Benchmarks](/tooling/benchmarks)
