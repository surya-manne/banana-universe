# AI commands

AI is a **primary axis** for BananaJS—not a gimmick. Capabilities include **generate** from schema or prompt, **`ai generate --module`** for DDD layouts (with **`.bananarc.json`** and **`ai setup`**), **`doc`**, and **`review`** ([Philosophy](/guide/philosophy)).

Commands live under **`bjs ai`** (`packages/bananajs-cli/src/lib/ai.ts` and related modules).

## `bjs ai generate`

| Option                     | Description                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| **`--from-schema <file>`** | JSON Schema or OpenAPI file — deterministic codegen (no LLM required for basic flows)                 |
| **`--from-prompt <text>`** | Natural language — uses the LLM from **`.bananarc.json`** (Ollama offline by default; cloud optional) |
| **`--module`**             | With **`--from-prompt`** or **`--from-schema`**, generates the **layered DDD** tree (see below)       |
| **`--out <dir>`**          | Output directory (default: current working directory)                                                 |
| **`--dry-run`**            | Print generated files without writing                                                                 |

Implementation details and provider matrix can change between releases — inspect **`packages/bananajs-cli`** for the current stack.

## `bjs ai doc`

Adds JSDoc to controller methods using the configured LLM.

- **`--file <path>`** — single file; otherwise scans project `src/`
- **`--dry-run`**

## `bjs ai review`

Reviews a controller for BananaJS best practices.

- **`--file <path>`** — required target file

## `bjs ai setup`

Interactive wizard that writes **`.bananarc.json`** (LLM provider, defaults for **`ai generate --module`**). See **[AI module generation](/tooling/ai-module-generation)** for the full walkthrough.

## DDD module generation

**`bjs ai generate --module`** uses the **`llm/`** provider layer, Zod-validated extraction, and embedded templates for domain / application / infrastructure folders. Full walkthrough: **[AI module generation](/tooling/ai-module-generation)**.
