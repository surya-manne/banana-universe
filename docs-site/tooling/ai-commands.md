# AI commands

This page is the **reference**: flags, aliases, and copy-paste examples for every **`bjs ai`** subcommand. For the narrative—why the CLI exists, and how **setup → generate → wire → review** fits your workflow—read the **[AI hub](/ai/)** first; come here when you need the full option matrix.

Commands run under **`bjs ai`** (or **`bananajs ai`**).

## Command aliases

Each subcommand has a **one-letter alias** (see **`bjs ai --help`**):

| Command    | Alias |
| ---------- | ----- |
| `setup`    | `s`   |
| `generate` | `g`   |
| `doc`      | `d`   |
| `review`   | `r`   |
| `wire`     | `w`   |
| `test`     | `t`   |
| `explain`  | `e`   |

Examples: **`bjs ai g --module "…"`**, **`bjs ai r widgets`**, **`bjs ai w --llm`**.

::: warning Note
**`bjs ai g`** is **AI** `generate`. The top-level **`bjs g`** is the non-AI **`bjs generate`** (controller, dto, module, …)—different command.
:::

## `bjs ai setup` (`bjs ai s`)

Interactive wizard: LLM provider, model, and **`.bananarc.json`** (including optional **`project`** context for wire/codegen).

```bash
bjs ai setup
bjs ai s
```

## `bjs ai generate` (`bjs ai g`)

| Option                                                        | Description                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **`--from-schema <file>`**                                    | JSON Schema or OpenAPI (flat); with **`--module`**, DDD extraction        |
| **`--from-prompt <text>`**                                    | Natural language flat scaffold (uses shared LLM rules + `.bananarc.json`) |
| **`--module [description]`**                                  | Layered DDD module; pair with **`--from-schema`** or a description        |
| **`--orm`**, **`--preset`**                                   | ORM choice (same semantics as **`ban new`**)                              |
| **`--out`**, **`--dry-run`**, **`--detailed`**, **`--debug`** | Output dir, preview, second LLM pass for bodies, raw LLM logging          |

After a successful DDD write (not **`--dry-run`**), the CLI **registers** the module in bootstrap and **patches TypeORM `entities[]`** when applicable—same behavior as **`bjs generate module`**.

With **no flags** in a TTY, **`bjs ai generate`** first asks whether you want a **DDD module** or **flat** scaffold, then runs the appropriate prompts (schema path vs description, ORM, optional **`--detailed`**, etc.). Non-interactive environments should use explicit flags.

```bash
# DDD: description + ORM
bjs ai generate --module "Invoices with line items" --orm typeorm
bjs ai g --module "Invoices with line items" --orm typeorm --preset sql

# Flat: schema file
bjs ai g --from-schema ./specs/api.json

# Dry-run preview
bjs ai g --module "Tags" --dry-run
```

Details: **[AI module generation](/tooling/ai-module-generation)**.

## `bjs ai review` (`bjs ai r`)

Structured review (JSON with **`schemaVersion`**, human-readable summary in text mode). **Non-interactive** — you must pass a target.

| Option                      | Description                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| **`--file <path>`**         | Single TypeScript file                                                                    |
| **`--module <path>`**       | Directory — all **`.ts`** files (non-declaration)                                         |
| **`[target]`** (positional) | Same as file or directory; bare name **`widgets`** → **`src/modules/widgets`** if present |
| **`--format text \| json`** | Default **text**                                                                          |
| **`--sarif`**               | SARIF 2.1.0 instead of text/json                                                          |
| **`--fix`**                 | Reserved; safe auto-fix not applied yet                                                   |

```bash
bjs ai review --file src/modules/orders/Order.controller.ts
bjs ai review --module src/modules/widgets
bjs ai review widgets
bjs ai r widgets --format json
```

Schema: **`ai-review.schema.json`** in **`@banana-universe/bananajs-cli`**.

## `bjs ai wire` (`bjs ai w`)

Bootstrap wiring hints (**dry-run**; does not modify files). Optional **`--llm`** for narrative. Reads **`project`** from **`.bananarc.json`** when present.

```bash
bjs ai wire
bjs ai w --llm
```

## `bjs ai test` (`bjs ai t`)

Scaffolds a minimal **`node:test` + supertest** file (BananaTestApp-style). **`--out`** overrides default path.

```bash
bjs ai test
bjs ai t --out src/__tests__/api-smoke.test.ts
```

## `bjs ai explain [file]` (`bjs ai e`)

Short LLM summary of a file (PR descriptions, onboarding).

```bash
bjs ai explain src/bootstrap.ts
bjs ai e src/bootstrap.ts
```

## `bjs ai doc` (`bjs ai d`)

**Deprecation path:** JSDoc-only rewrites are lower signal than **types + OpenAPI**. The command still runs but prints a yellow notice; prefer **`openapi export`** and hand-written API docs. Timeline and alternatives: **[AI hub](/ai/)**.

## Implementation note

Source lives in **`packages/bananajs-cli`** (`ai.ts`, `ai-module.ts`, `ai-review-run.ts`, `lib/llm/`, …). Shared rules: **`lib/llm/bananajs-ai-rules.ts`**.
