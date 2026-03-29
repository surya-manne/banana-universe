# AI with BananaJS

Single entry point for **CLI-backed AI** features: shared rules, project context, generation, review, wiring hints, and recipes. The CLI (`bjs` / `bananajs`) is the **automation contract**—outputs stay diffable and scriptable.

## Quick start

1. **`bjs ai setup`** — writes `.bananarc.json` (LLM provider, defaults for module generation).
2. **`bjs ai generate`** — flat scaffold (`--from-schema` / `--from-prompt`) or **`--module`** for layered DDD trees ([AI module generation](/tooling/ai-module-generation)).
3. **`bjs ai wizard`** — interactive path over generate (TTY); use flags in CI.

## Command index

| Command                 | Purpose                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`ai setup`**          | Configure provider + `.bananarc.json`                                                                                                |
| **`ai generate`**       | Schema/prompt flat codegen or **`--module`** DDD layout; **`--detailed`** optional second LLM pass                                   |
| **`ai wizard`**         | Inquirer flow wrapping generate (schema vs description, ORM/preset, preview)                                                         |
| **`ai review`**         | Structured review: **`--format json`**, optional **`--sarif`**, **`--module`** for a directory; findings use **info / warn / error** |
| **`ai wire`**           | Bootstrap wiring suggestions (dry-run; validates optional **`project`** block in `.bananarc.json`); **`--llm`** for narrative        |
| **`ai test`**           | Scaffold **`node:test` + supertest** using BananaTestApp-style patterns                                                              |
| **`ai explain [file]`** | Short file summary for humans or PR notes                                                                                            |
| **`ai doc`**            | JSDoc injection on controllers — **deprecation path**; prefer **OpenAPI export** + API docs ([tooling](/tooling/cli#openapi))        |

## Shared LLM rules

All LLM calls prepend the same **versioned** rules (module layout, ORM boundaries, HTTP, security, wiring, review severity). Source: `packages/bananajs-cli/src/lib/llm/bananajs-ai-rules.ts`. Contract tests live under `packages/bananajs-cli/src/__tests__/`.

## Project context (`.bananarc.json`)

Optional **`project`** object documents layout and bootstrap paths for tooling:

- **`moduleLayoutVersion`** — layout contract for generated modules
- **`apiPrefix`** — URI prefix for docs and hints
- **`bootstrap`**, **`main`** — paths relative to project root

Types: `packages/bananajs-cli/src/lib/llm/bananarc.ts`. **`generate`** holds `defaultOrm`, `preset`, `outDir`.

## Structured review schema

JSON output includes **`schemaVersion`**. Published JSON Schema: `packages/bananajs-cli/ai-review.schema.json` (shipped in the npm package).

## Recipes

- Single-ORM: [Recipes](/recipes/) (PostgreSQL, MongoDB, …).
- **Dual ORM** (TypeORM + Mongoose in one app): [example-rest-dual-orm](https://github.com/surya-manne/banana-universe/tree/main/apps/example-rest-dual-orm).

## Deeper reading

- [AI commands](/tooling/ai-commands) — flags and options
- [AI module generation](/tooling/ai-module-generation) — DDD flow
- [Philosophy — AI-first](/guide/philosophy)
- [CLI reference](/tooling/cli)
- Workspace roadmap: `plans/AIRoadmapV1.md` (IDE snippets / MCP deferred)
