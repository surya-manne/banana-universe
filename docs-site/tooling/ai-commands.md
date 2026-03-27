# AI commands

AI is a **primary axis** for BananaJS—not a gimmick. Today: **generate** from schema or prompt, **doc**, **review**. Roadmap: **`.bananarc`**, **`ai setup`**, **`llm/`** providers, and **full DDD module** generation ([Philosophy](/guide/philosophy)).

Commands live under **`bananajs ai`** (`packages/bananajs-cli/src/lib/ai.ts` and related modules).

## `bananajs ai generate`

| Option                     | Description                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **`--from-schema <file>`** | JSON Schema or OpenAPI file — deterministic codegen (no LLM required for basic flows)                       |
| **`--from-prompt <text>`** | Natural language — uses Vercel **`ai`** SDK / OpenAI-compatible providers; requires API keys as implemented |
| **`--out <dir>`**          | Output directory (default: current working directory)                                                       |
| **`--dry-run`**            | Print generated files without writing                                                                       |

Implementation details and provider matrix can change between releases — inspect **`packages/bananajs-cli`** for the current stack.

## `bananajs ai doc`

Adds JSDoc to controller methods using the configured LLM.

- **`--file <path>`** — single file; otherwise scans project `src/`
- **`--dry-run`**

## `bananajs ai review`

Reviews a controller for BananaJS best practices.

- **`--file <path>`** — required target file

## Roadmap (Phase 7)

Per **`plans/EnterpriseRoadmapV3.md`**:

- **`bananajs ai setup`** — interactive provider selection
- **`.bananarc.json`** — project-level LLM and generator settings
- **`bananajs ai generate --module`** — full DDD module from a description
- Retry / timeout / Zod validation of LLM JSON — see architect review doc

See [Roadmap](/guide/roadmap).
