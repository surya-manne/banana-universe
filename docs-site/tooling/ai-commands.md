# AI commands

AI is a **primary axis** for BananaJS—not a gimmick. Today: **generate** from schema or prompt, **doc**, **review**. Roadmap: **`.bananarc`**, **`ai setup`**, **`llm/`** providers, and **full DDD module** generation ([Philosophy](/guide/philosophy)).

Commands live under **`bananajs ai`** (`packages/bananajs-cli/src/lib/ai.ts` and related modules).

## `bananajs ai generate`

| Option                     | Description                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| **`--from-schema <file>`** | JSON Schema or OpenAPI file — deterministic codegen (no LLM required for basic flows)                 |
| **`--from-prompt <text>`** | Natural language — uses the LLM from **`.bananarc.json`** (Ollama offline by default; cloud optional) |
| **`--out <dir>`**          | Output directory (default: current working directory)                                                 |
| **`--dry-run`**            | Print generated files without writing                                                                 |

Implementation details and provider matrix can change between releases — inspect **`packages/bananajs-cli`** for the current stack.

## `bananajs ai doc`

Adds JSDoc to controller methods using the configured LLM.

- **`--file <path>`** — single file; otherwise scans project `src/`
- **`--dry-run`**

## `bananajs ai review`

Reviews a controller for BananaJS best practices.

- **`--file <path>`** — required target file

## DDD module generation (Phase 7)

Shipped: **`bananajs ai setup`**, **`.bananarc.json`**, **`bananajs ai generate --module`**, offline **Ollama** default, Zod-validated extraction, and the **`llm/`** provider layer. Full walkthrough: **[AI module generation](/tooling/ai-module-generation)**.

See [Roadmap](/guide/roadmap).
