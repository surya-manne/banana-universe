# AI module generation (Phase 7)

This guide covers **`bananajs ai setup`**, **`.bananarc.json`**, and **`bananajs ai generate --module`** — offline-first LLM providers (Ollama default) plus optional cloud models, and a two-step pipeline: **LLM → JSON (validated with Zod) → DDD templates**.

## Prerequisites

- **BananaJS CLI** (`@banana-universe/bananajs-cli`) installed in your project or globally.
- For **local** generation: [Ollama](https://ollama.com) running (`ollama serve`) and a model pulled (e.g. `ollama pull llama3.2`).
- Optional: **`zod`** for JSON validation of the extraction step (recommended; listed as an optional peer of the CLI).

## 1. Configure the CLI: `bananajs ai setup`

Run from your app root:

```bash
npx bananajs ai setup
```

The wizard lets you pick:

| Provider      | Notes                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| **Ollama**    | Default; no API keys; uses `llm.baseUrl` (default `http://localhost:11434`) |
| **llama.cpp** | HTTP server mode (e.g. `/completion` on port 8080)                          |
| **OpenAI**    | Requires `OPENAI_API_KEY`                                                   |
| **Anthropic** | Requires `ANTHROPIC_API_KEY`                                                |

The command writes **`.bananarc.json`** at the project root, for example:

```json
{
  "llm": {
    "provider": "ollama",
    "model": "llama3.2",
    "baseUrl": "http://localhost:11434",
    "retries": 2,
    "timeoutMs": 30000
  },
  "generate": {
    "defaultOrm": "typeorm",
    "outDir": "./src"
  }
}
```

`.bananarc.json` is the **general BananaJS project config**: the `llm` block holds provider settings; `generate` holds defaults for `bananajs ai generate --module` (ORM and output directory).

## 2. Generate a full DDD module

### From natural language

```bash
npx bananajs ai generate --module "Product catalog with name, price, category, and stock quantity"
```

The CLI:

1. Calls the configured LLM with a **strict JSON extraction** prompt (entity name + fields).
2. Parses and validates the response with **Zod** (`EntityExtractionSchema`); on failure it **retries once** (then exits with a clear error; use **`--debug`** to print raw LLM output).
3. Fills **embedded templates** for the Phase 6 DDD layout: `domain/`, `application/`, `infrastructure/`, and controller.

### From JSON Schema or OpenAPI

Use **`--module`** together with **`--from-schema`** so the schema drives the entity shape (no LLM extraction step):

```bash
npx bananajs ai generate --module --from-schema ./openapi/product.yaml
```

You can pass a bare **`--module`** flag when only the schema is needed (the description is optional if the schema is present).

### ORM and output

| Option           | Purpose                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| **`--orm`**      | `typeorm` \| `mongoose` \| `none` (overrides `generate.defaultOrm`)                 |
| **`--out`**      | Base directory for generated files (default: `generate.outDir` in `.bananarc.json`) |
| **`--dry-run`**  | Print files without writing                                                         |
| **`--detailed`** | Optional second LLM pass to expand domain/application service bodies                |
| **`--debug`**    | Log raw extraction output and validation retries                                    |

## 3. Flat scaffold (unchanged)

Without **`--module`**, behavior stays as before:

- **`--from-schema`** — deterministic flat controller + DTO + service (no DDD folders).
- **`--from-prompt`** — same three **flat** files via the configured LLM (not only OpenAI).

## 4. Error messages and tuning

- **Ollama unreachable** — ensure Ollama is running (`ollama serve`).
- **Unparseable JSON** — use **`--debug`**; increase **`llm.retries`** or **`llm.timeoutMs`** in `.bananarc.json` if the model is slow.
- **Timeouts** — see `llm.timeoutMs` (default 30s).

## See also

- [CLI reference](/tooling/cli)
- [AI commands overview](/tooling/ai-commands)
- [Layered architecture (DDD)](/guide/layered-architecture)
