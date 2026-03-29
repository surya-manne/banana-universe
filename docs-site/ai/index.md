---
outline: [2, 3]
---

# AI with BananaJS

Most teams try AI once: a blob of code in a chat window, hard to review and impossible to script. BananaJS turns that story around. The **`bjs ai`** commands are a **contract**: the CLI talks to your LLM, but what lands on disk stays **ordinary TypeScript**—diffable in PRs, repeatable in CI, and aligned with the same DDD layout you get from **`bjs new`** and **`bjs generate module`**.

This page is the **story and the map**. Every flag, edge case, and subcommand reference lives under **Tooling**—use the left sidebar here to jump straight there, or follow the links below.

## The arc: from blank repo to reviewable output

You are not “vibe coding” a monolith. You are **configuring a tool**, **generating a slice**, **checking wiring**, then **reviewing** before merge.

```mermaid
flowchart LR
  S["ai setup"] --> G["ai generate"]
  G --> W["ai wire"]
  W --> R["ai review"]
  style S fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style G fill:#132a45,stroke:#fdb913,color:#f8fafc
  style W fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style R fill:#0a1628,stroke:#fdb913,color:#f8fafc
```

1. **Configure** — One wizard writes **`.bananarc.json`**: provider, model, defaults, and optional **`project`** hints (bootstrap path, API prefix). _Details: [AI commands → setup](/tooling/ai-commands#bjs-ai-setup-bjs-ai-s), [CLI reference](/tooling/cli#bjs-ai)._
2. **Generate** — Flat scaffold from a schema, or a full **`src/modules/<feature>/`** tree from text or OpenAPI. _Details: [AI module generation](/tooling/ai-module-generation), [AI commands → generate](/tooling/ai-commands#bjs-ai-generate-bjs-ai-g)._
3. **Wire** — After hand edits or merges, **`ai wire`** compares **`src/modules/*/index.ts`** to your bootstrap file and prints **dry-run** import hints (optional **`--llm`** prose). _Details: [AI commands → wire](/tooling/ai-commands#bjs-ai-wire-bjs-ai-w)._
4. **Review** — Structured JSON (or SARIF) for CI, or human-readable findings. _Details: [AI commands → review](/tooling/ai-commands#bjs-ai-review-bjs-ai-r)._

## Where the deep docs live (Tooling)

| You want…                                           | Open in Tooling                                           |
| --------------------------------------------------- | --------------------------------------------------------- |
| Every flag, alias, and copy-paste example           | [**AI commands**](/tooling/ai-commands)                   |
| DDD layout, extraction, and **`--module`** behavior | [**AI module generation**](/tooling/ai-module-generation) |
| **`bjs ai`** in context of the whole CLI            | [**CLI reference — `bjs ai`**](/tooling/cli#bjs-ai)       |

The sidebar under **AI** lists the same destinations so one click always lands in **Tooling** for reference material.

## Binaries

- **`bjs`** — short name (used in these docs)
- **`bananajs`** — full name

## Command aliases (`bjs ai …`)

Each subcommand has a **one-letter alias** (see **`bjs ai --help`**):

| Subcommand     | Alias   | Example           |
| -------------- | ------- | ----------------- |
| **`setup`**    | **`s`** | `bjs ai s`        |
| **`generate`** | **`g`** | `bjs ai g`        |
| **`doc`**      | **`d`** | `bjs ai d`        |
| **`review`**   | **`r`** | `bjs ai r`        |
| **`wire`**     | **`w`** | `bjs ai w`        |
| **`test`**     | **`t`** | `bjs ai t`        |
| **`explain`**  | **`e`** | `bjs ai e <file>` |

::: tip Two different `g` commands
**`bjs ai g`** runs **AI** codegen. **`bjs g`** (top-level) runs **`bjs generate`** (controller, dto, **non-AI** module scaffold). Same letter, different verbs.
:::

## Guided examples

These are **moments in a real workflow**—onboarding, a new slice, a gate before merge—not an exhaustive flag list. For every option (including **CI-safe** invocations), use [**AI commands**](/tooling/ai-commands).

::: info How to read this section
Each scenario has a **short story** (who you are, what you need), a **command** you can paste, and **what you get** so nothing feels like a black box. Where it helps, tabs show the **full subcommand** next to its **one-letter alias**—same tool, fewer keystrokes.
:::

<div class="ai-guided-examples">

### 1 · First run: introduce the CLI to your LLM

**Scene:** You opened the repo for the first time. Nothing knows whether you use Ollama on your laptop or an API key in the cloud.

**Run** (from the app root):

::: code-group

```bash [bjs ai setup]
cd my-app
bjs ai setup
```

```bash [bjs ai s]
cd my-app
bjs ai s
```

:::

**You get:** a **`.bananarc.json`** with provider, model, retries/timeouts, and optional **`project`** hints (`bootstrap`, `apiPrefix`, …) that **`ai generate`** and **`ai wire`** reuse later.

---

### 2 · From a backlog line to a DDD module tree

**Scene:** Product gave you a sentence—“catalog with SKU and stock”—and you want **`src/modules/...`** with domain, application, and infrastructure, not three ad-hoc files in the repo root.

**Run:**

::: code-group

```bash [Long form]
bjs ai generate --module "Product catalog with SKU, price, and stock" --orm typeorm
```

```bash [Alias]
bjs ai g --module "Product catalog with SKU, price, and stock" --orm typeorm
```

:::

**You get:** generated files under **`src/modules/<kebab>/`**, plus—when not **`--dry-run`**—bootstrap registration and a best-effort TypeORM **`entities[]`** patch, same contract as **`bjs generate module`**. Deeper pipeline notes: [**AI module generation**](/tooling/ai-module-generation).

---

### 3 · OpenAPI in hand; ship a flat scaffold

**Scene:** Design exported **`petstore.yaml`**. You want a matching controller + DTO + service bundle without hand-copying types.

**Run:**

```bash
bjs ai generate --from-schema ./openapi/petstore.yaml
```

**You get:** deterministic **flat** files next to your workflow (see [**generate**](/tooling/ai-commands#bjs-ai-generate-bjs-ai-g))—use **`--dry-run`** first if you only want a preview.

---

### 4 · Review before the PR lands (or in CI)

**Scene:** You are about to open a PR, or a job needs machine-readable output.

**Human-readable** (summary + severities):

::: code-group

```bash [Path]
bjs ai review src/modules/widgets
```

```bash [Bare module name]
bjs ai r widgets
```

:::

A **bare** name like `widgets` resolves to **`src/modules/widgets`** when that folder exists—you can skip the long path on repeat runs.

**JSON** (scripts, dashboards):

```bash
bjs ai review widgets --format json
bjs ai r widgets --format json
```

**You get:** structured findings with **`schemaVersion`**; optional [**`--sarif`**](/tooling/ai-commands#bjs-ai-review-bjs-ai-r) for tools that speak SARIF.

---

### 5 · After a merge: did bootstrap fall behind?

**Scene:** You rebased or pulled **`main`**. New **`export const …Module`** entries exist under **`src/modules/`**, but you are not sure **`bootstrap.ts`** lists them all.

**Run:**

::: code-group

```bash [Hints only]
bjs ai wire
```

```bash [+ LLM narrative]
bjs ai w --llm
```

:::

**You get:** **dry-run** text only—the CLI **never** edits files. It tells you what import and **`modules: [...]`** lines to consider. Optional **`--llm`** adds a short narrative; still no writes.

---

### 6 · One file, one paragraph for reviewers

**Scene:** The PR template asks “what changed in the controller?” and you want a tight summary without rereading the diff.

::: code-group

```bash [Long form]
bjs ai explain src/modules/orders/Order.controller.ts
```

```bash [Alias]
bjs ai e src/modules/orders/Order.controller.ts
```

:::

**You get:** a concise LLM summary of that file—handy for descriptions and onboarding notes.

---

### 7 · Smoke-test scaffold

**Scene:** You need a **`node:test` + supertest** starting point that matches BananaTestApp-style recipes.

::: code-group

```bash [Default path]
bjs ai test
```

```bash [Custom output]
bjs ai t --out src/__tests__/api-smoke.test.ts
```

:::

**You get:** a minimal test file you can extend; adjust **`--out`** to match your layout.

</div>

## Command index (at a glance)

| Command                 | Role                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **`ai setup`**          | Create **`.bananarc.json`** and provider defaults                                      |
| **`ai generate`**       | Flat or DDD codegen; optional **`--detailed`** second pass                             |
| **`ai review`**         | Structured findings; **`--format json`**, **`--sarif`**, module or file scope          |
| **`ai wire`**           | Dry-run bootstrap hints; optional **`--llm`**                                          |
| **`ai test`**           | **`node:test` + supertest** scaffold                                                   |
| **`ai explain [file]`** | Short LLM summary of one file                                                          |
| **`ai doc`**            | Legacy JSDoc path — prefer **OpenAPI** + docs ([CLI](/tooling/cli#bjs-openapi-export)) |

## Shared LLM rules

Every call prepends the same **versioned** rules (layout, ORM boundaries, HTTP, security, review severity). Source: `packages/bananajs-cli/src/lib/llm/bananajs-ai-rules.ts`; contract tests under `packages/bananajs-cli/src/__tests__/`.

## Project context (`.bananarc.json`)

Optional **`project`** block documents bootstrap and layout for codegen and **`ai wire`**: **`moduleLayoutVersion`**, **`apiPrefix`**, **`bootstrap`**, **`main`**. Types live in `packages/bananajs-cli/src/lib/llm/bananarc.ts`; **`generate`** holds **`defaultOrm`**, **`preset`**, **`outDir`**.

## Structured review schema

JSON output carries **`schemaVersion`**. Published schema: **`ai-review.schema.json`** in **`@banana-universe/bananajs-cli`**.

## Recipes and samples

- [Recipes](/recipes/) — single-ORM apps.
- [example-rest-dual-orm](https://github.com/surya-manne/banana-universe/tree/main/apps/example-rest-dual-orm) — TypeORM + Mongoose in one codebase.

## Read next

- [Philosophy — AI-first](/guide/philosophy)
- [AI commands (full reference)](/tooling/ai-commands)
- [AI module generation (DDD)](/tooling/ai-module-generation)
- [CLI reference](/tooling/cli)
- Roadmap: `plans/AIRoadmapV1.md` in the repo
