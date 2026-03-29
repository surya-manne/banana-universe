# AI commands

AI is a **primary axis** for BananaJS. Commands run under **`bjs ai`** (or **`bananajs ai`**). For positioning and the full surface area, start at the **[AI hub](/ai/)**.

## `bjs ai setup`

Interactive wizard: LLM provider, model, and **`.bananarc.json`** (including optional **`project`** context for wire/codegen).

## `bjs ai generate`

| Option                                                        | Description                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **`--from-schema <file>`**                                    | JSON Schema or OpenAPI (flat); with **`--module`**, DDD extraction        |
| **`--from-prompt <text>`**                                    | Natural language flat scaffold (uses shared LLM rules + `.bananarc.json`) |
| **`--module [description]`**                                  | Layered DDD module; pair with **`--from-schema`** or a description        |
| **`--orm`**, **`--preset`**                                   | ORM choice (same semantics as **`ban new`**)                              |
| **`--out`**, **`--dry-run`**, **`--detailed`**, **`--debug`** | Output dir, preview, second LLM pass for bodies, raw LLM logging          |

Details: **[AI module generation](/tooling/ai-module-generation)**.

## `bjs ai wizard`

TTY wizard over **`ai generate`** (schema vs text, ORM/preset, preview). Non-interactive environments should keep using flags.

## `bjs ai review`

Structured review (JSON with **`schemaVersion`**, human-readable summary in text mode).

| Option                      | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| **`--file`**                | Single TypeScript file                                   |
| **`--module`**              | Directory (e.g. `src/modules/foo`) — all **`.ts`** files |
| **`--format text \| json`** | Default **text**                                         |
| **`--sarif`**               | SARIF 2.1.0 instead of text/json                         |
| **`--fix`**                 | Reserved; safe auto-fix not applied yet                  |

Schema: **`ai-review.schema.json`** in **`@banana-universe/bananajs-cli`**.

## `bjs ai wire`

Bootstrap wiring hints (**dry-run**; does not modify files). Optional **`--llm`** for narrative. Reads **`project`** from **`.bananarc.json`** when present.

## `bjs ai test`

Scaffolds a minimal **`node:test` + supertest** file (BananaTestApp-style). **`--out`** overrides default path.

## `bjs ai explain [file]`

Short LLM summary of a file (PR descriptions, onboarding).

## `bjs ai doc`

**Deprecation path:** JSDoc-only rewrites are lower signal than **types + OpenAPI**. The command still runs but prints a yellow notice; prefer **`openapi export`** and hand-written API docs. Timeline and alternatives: **[AI hub](/ai/)**.

## Implementation note

Source lives in **`packages/bananajs-cli`** (`ai.ts`, `ai-module.ts`, `ai-review-run.ts`, `lib/llm/`, …). Shared rules: **`lib/llm/bananajs-ai-rules.ts`**.
