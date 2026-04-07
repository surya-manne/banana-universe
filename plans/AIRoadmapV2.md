---
name: BananaJS AI-next roadmap (V2)
overview: >
  Follow-on AI features beyond AIRoadmapV1.md: IDE/agent context-file generation,
  Zod-based mock/fixture scaffolding, context-aware debug assistant, OpenAPI enrichment,
  version-upgrade advisor, performance analysis, structured changelog generation,
  a first-party MCP server, a BananaAiPlugin for in-handler LLM access, and
  consumer-driven contract-test generation.  All features build on the shared LLM
  rules, bananarc project context, and structured-output patterns established in V1.
todos:
  - id: ai-context-gen
    content: "`bananajs ai context` — generate CLAUDE.md / .cursor/rules/bananajs.mdc / copilot-instructions.md / AGENTS.md for the project, embedding bananajs-ai-rules and discovered module layout"
    status: done
  - id: ai-mock
    content: "`bananajs ai mock` — generate TypeScript fixture factories and JSON samples from Zod schemas in a controller or module"
    status: done
  - id: ai-openapi-enrich
    content: "`bananajs ai openapi enrich` — add missing summaries, descriptions, examples, and tags to an existing OpenAPI spec export"
    status: done
  - id: ai-debug
    content: "`bananajs ai debug` — paste a stack trace; get BananaJS-specific root-cause explanation and suggested fix referencing the actual module tree; uses AiDebugJson schema (separate from AiReviewJson)"
    status: done
  - id: ai-perf
    content: "`bananajs ai perf` — static AST-first scan for missing `@Cache`, N+1 patterns, unguarded async loops, and missing pagination; reuses AiReviewJson output"
    status: done
  - id: ai-upgrade
    content: "`bananajs ai upgrade [target-version]` — detect deprecated patterns in codebase using manifest seeded from docs/MIGRATION.md; generate per-file migration hints or patch files"
    status: done
  - id: ai-changelog
    content: "`bananajs ai changelog` — produce structured developer changelog from git commits + OpenAPI before/after diff"
    status: done
  - id: ai-provider-core
    content: "Extract LlmProvider interface to packages/ai-provider-core — shared publishable contract required by both bananajs-cli and plugin-ai"
    status: done
  - id: mcp-server
    content: "MCP server exposing routes / review / generate / explain / mock / debug / perf as tools; upgrade exposed as dry-run only; promote from deferred backlog to active Horizon C"
    status: done
  - id: banana-ai-plugin
    content: "`BananaAiPlugin` (`packages/plugin-ai`) — optional framework plugin injecting configured LlmProvider on tsyringe root container; requires ai-provider-core extraction first"
    status: done
  - id: ai-contract
    content: "`bananajs ai contract` — generate consumer-driven contract tests (Pact-compatible) from OpenAPI spec; accepts --fixtures from `ai mock` JSON output to skip redundant LLM calls"
    status: done
isProject: true
---

# BananaJS AI-next roadmap (V2)

This plan continues where [AIRoadmapV1.md](AIRoadmapV1.md) ended: shared LLM rules, bananarc project context, structured `ai review`, wizard, wire, test scaffold, explain, and docs-site AI hub are **all landed**. Every feature below is additive — none replaces a V1 deliverable.

---

## Where V1 left off

| V1 deliverable | Status |
|---|---|
| Shared LLM rules (`bananajs-ai-rules.ts`) | ✅ Landed |
| `.bananarc.json` project context | ✅ Landed |
| `ai generate` (schema / prompt / `--module`) | ✅ Landed |
| `ai review` (JSON `schemaVersion`, SARIF, `--module`) | ✅ Landed |
| `ai wizard` | ✅ Landed |
| `ai wire` (dry-run, bootstrap hints) | ✅ Landed |
| `ai test` (BananaTestApp scaffold) | ✅ Landed |
| `ai explain` (module summary) | ✅ Landed |
| Dual-ORM example app | ✅ Landed |
| Docs-site dedicated AI section | ✅ Landed |
| IDE snippets / MCP server | ⏳ Deferred in V1 |

**V2 picks up the deferred items and adds eleven net-new capabilities (ten commands + one shared package).**

---

## Principles carried forward from V1

1. **CLI as the agent's contract** — structured, diffable, replayable output.
2. **Project context is first-class** — every command reads `.bananarc` when present.
3. **Shared rules for every LLM call** — `appendBananaJsAiRules()` injected into every new prompt.
4. **Action over commentary** — structured findings, patch output, or scaffolded files; never prose-only.
5. **Progressive disclosure** — flags first, interactive wizard as opt-in.

---

## Feature details

### `bananajs ai context` — IDE / agent context-file generator

**Goal:** Generate project-tailored AI context files so developers get BananaJS-aware completions and agents follow correct conventions without manual prompt engineering.

| Output file | Consumer | Notes |
|---|---|---|
| `CLAUDE.md` | Claude Code, Claude.ai projects | |
| `.cursor/rules/bananajs.mdc` | Cursor | Current format; also emit root `.cursorrules` for backwards compatibility |
| `.github/copilot-instructions.md` | GitHub Copilot | |
| `AGENTS.md` | OpenAI Codex CLI, generic | |

**Content sources (read automatically):**
- `bananajs-ai-rules` — shared framework contract
- `.bananarc.json` — ORM, layout version, bootstrap paths, `apiPrefix`
- Discovered module list (same scan as `bananajs routes`)
- `package.json` `dependencies` blob for plugin inventory

**Flags:** `--format <claude|cursor|copilot|agents|all>` (default: `all`), `--out <dir>`, `--dry-run`.

**Why now (not in V1):** V1 established and stabilized the shared rules. This command packages them into IDE-consumable formats — zero new LLM calls required for the skeleton; optional LLM pass for project-specific additions.

---

### `bananajs ai mock` — Fixture factory generator

**Goal:** Given a Zod schema file, a controller, or a `--module <path>`, emit **TypeScript fixture factories** and **JSON sample files** for use in unit tests, Storybook, docs, and manual testing.

**Output per schema:**
```typescript
// __fixtures__/user.fixtures.ts   (generated)
import { faker } from '@faker-js/faker'
export const buildUser = (overrides?: Partial<UserDto>): UserDto => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  ...overrides,
})
```

**LLM role:** Map Zod primitive types to `faker` or literal sensible defaults; infer domain meaning from field names (e.g. `email` → email, `createdAt` → date).

**Flags:** `--schema <file>`, `--module <path>`, `--out <dir>`, `--format ts|json`, `--dry-run`.

**Risk:** Faker is an optional peer (`peerDependenciesMeta.optional: true`); fallback to hardcoded type-based literals (string, number, boolean, Date) when not installed; emit install hint.

**Complementary with `ai contract`:** JSON output from `ai mock --format json` feeds directly into `bananajs ai contract --fixtures <dir>` as Pact interaction payloads — run mock first, then contract to avoid redundant LLM calls.

---

### `bananajs ai openapi enrich`

**Goal:** Take an existing `openapi.json` export (from `bananajs openapi export`) and fill in missing operation summaries, parameter descriptions, response examples, and `tags` — making the spec more useful for SDK generation and docs.

**What the LLM reads:**
- Existing spec (paths, schemas)
- Controller source files (for intent signals)
- `bananajs-ai-rules` for naming conventions

**Flags:** `--in <spec>`, `--out <spec>`, `--dry-run`, `--skip-examples`, `--skip-tags`.

**Safety:** `--out` is required unless `--dry-run`; never overwrites `--in` in place. Output spec carries `x-enriched-by: bananajs-cli@<version>` extension; `--dry-run` emits a diff of proposed changes only.

---

### `bananajs ai debug <error-input>`

**Goal:** Paste a runtime stack trace (via stdin or file) and receive BananaJS-specific root-cause analysis: which decorator, DI token, or middleware likely triggered the error, and a concrete fix.

**Context injected per call:**
- Module tree (from `bananajs routes` scan)
- `.bananarc.json`
- Named source file when the stack trace references a `src/` path
- `bananajs-ai-rules` — error vocabulary section

**Output schema — `AiDebugJson` (distinct from `AiReviewJson`):**
```typescript
// packages/bananajs-cli/src/lib/ai-debug-schema.ts
export const AI_DEBUG_JSON_SCHEMA_VERSION = '1.0.0'

export const aiDebugJsonSchema = z.object({
  schemaVersion: z.string(),
  error: z.string(),
  rootCause: z.string(),
  location: z.object({ file: z.string().nullable(), hint: z.string().nullable() }).optional(),
  fix: z.string(),
  severity: z.enum(['info', 'warn', 'error']),
})
export type AiDebugJson = z.infer<typeof aiDebugJsonSchema>
```

**Example output:**
```json
{
  "schemaVersion": "1.0.0",
  "error": "Cannot inject token 'IUserRepository'",
  "rootCause": "Provider not registered in createModule() providers[]",
  "location": { "file": "src/modules/user/index.ts", "hint": "providers array" },
  "fix": "Add { token: IUserRepository, useClass: TypeOrmUserRepository }",
  "severity": "error"
}
```

**Why a separate schema?** `AiDebugJson` is single-error / single-fix; `AiReviewJson` is a findings list. The shapes are not interchangeable and must not share a `schemaVersion` counter.

**Rationale:** DI token errors, decorator metadata issues, and plugin ordering problems are the most common BananaJS runtime errors — and the most opaque. A purpose-built command that understands the DI model saves significant debugging time.

---

### `bananajs ai perf`

**Goal:** Scan one or more controller/service files for performance antipatterns and emit structured findings.

| Pattern checked | Example finding |
|---|---|
| Repository call inside forEach/map | "N+1 risk in `getOrders`: `findById` called per item in loop" |
| Missing `@Cache` on read-only route | "`GET /products` has no `@Cache` decorator — consider cacheable if data is stable" |
| Async response serialization in hot path | "`JSON.stringify` in response helper — pre-serialize aggregates" |
| Unguarded bulk query without pagination | "`findAll()` with no `take`/`limit` — missing `PaginationQuerySchema`" |

**Output:** Same `AiReviewJson` schema as `ai review` (reuse `schemaVersion: 1.0.0`, findings array) — CI-gatable, existing tooling works immediately.

**Flags:** `--file`, `--module`, `--format json|text`, identical to `ai review` for consistency.

**Why not fold into `ai review`?** `ai perf` is **static AST-first** — most checks match patterns without an LLM call, making it usable in CI without a configured provider. `ai review` is LLM-first. Keeping them separate avoids forcing an LLM call for a pure static analysis pass.

---

### `bananajs ai upgrade [target-version]`

**Goal:** Analyze the current codebase against a target BananaJS version, identify deprecated usage, and generate per-file migration hints or patch files.

**Approach:**
1. Read `.bananarc.json` for current layout version.
2. Load a bundled migration manifest keyed by semver range (e.g. `0.5.x → 0.6.x`). **Seed the manifest from [`docs/MIGRATION.md`](../docs/MIGRATION.md)** — which already documents every breaking change between versions — do not duplicate; parse and reference it.
3. Static scan for deprecated patterns (e.g. `createBananaContainer`, `class-validator` imports, old `@ZodBody` from `plugin-zod` shim).
4. LLM pass for ambiguous transformations (where static replace is unsafe).

**Output:** `upgrade-report.json` (findings per file) + optional `.patch` files.
**Flags:** `--to <version>`, `--dry-run`, `--apply`, `--out <dir>`.

**Risk:** `--apply` is gated behind explicit confirmation; auto-apply is limited to known safe mechanical transforms only. Ambiguous or business-logic-adjacent changes emit `.patch` — never silent rewrite. `--apply` is **not exposed** in the MCP transport.

---

### `bananajs ai changelog`

**Goal:** Generate a developer-facing structured changelog from git commits + optional OpenAPI diff between two spec snapshots.

**Sources:**
- `git log --oneline <from>..<to>` (or `HEAD` since last tag)
- Optional `--before <spec>` + `--after <spec>` for OpenAPI diff

**Output sections:**
- **Breaking changes** (routes removed/renamed, schema incompatibilities)
- **New endpoints / features**
- **Deprecated items**
- **Bug fixes**
- **Internal / refactor** (collapsed)

**Flags:** `--from <ref>`, `--to <ref>`, `--before <spec>`, `--after <spec>`, `--format md|json`, `--out <file>`.

**LLM role:** Map commit messages + OpenAPI diff to semantic changelog entries; collapse chore+ci by default; `--include-all` opt-in.

---

### `packages/ai-provider-core` — shared LLM provider contract

**Goal:** Extract `LlmProvider` interface (currently CLI-internal in `packages/bananajs-cli/src/lib/llm/LlmProvider.ts`) into a separate publishable package that both `bananajs-cli` and `plugin-ai` depend on.

**Why a prerequisite:** `BananaAiPlugin` cannot be published while its core type lives inside the CLI package. Coupling the framework plugin to CLI internals would create an invalid dependency direction.

**Scope:** Interface extraction only — no implementation changes. Both CLI and plugin-ai import from `@banana-universe/ai-provider-core`.

---

### MCP server (promoted from V1 deferred backlog)

**Goal:** Expose BananaJS CLI AI capabilities as a Model Context Protocol tool server so IDE agents (Claude Code, Cursor, Copilot Workspace, etc.) can invoke them as first-class tools without shell scripts.

**Tools exposed:**

| Tool | Maps to | Notes |
|---|---|---|
| `bananajs_routes` | `bananajs routes` scan | |
| `bananajs_explain` | `bananajs ai explain <file>` | |
| `bananajs_review` | `bananajs ai review --format json` | |
| `bananajs_generate` | `bananajs ai generate --module` | |
| `bananajs_mock` | `bananajs ai mock --schema` | |
| `bananajs_debug` | `bananajs ai debug` | |
| `bananajs_perf` | `bananajs ai perf --format json` | |
| `bananajs_upgrade` | `bananajs ai upgrade --dry-run` | Dry-run only — `--apply` not exposed via MCP |

**Served as:** stdio MCP transport; launched via `bananajs mcp start` or `npx @banana-universe/bananajs-cli mcp`.
**Auth:** None (local process only); CLI config (`bananarc`) controls provider.

**Dependency ordering:** MCP is a thin transport layer over stable CLI commands — implement all CLI commands first.

---

### `BananaAiPlugin` — framework-level LLM provider plugin

**Goal:** Optional `@banana-universe/plugin-ai` (or bundled in `bananajs`) that initializes an LLM provider once at startup and exposes it on a tsyringe token — enabling AI-powered handlers without per-handler provider setup.

```typescript
// bootstrap.ts
await BananaApp.create({
  plugins: [BananaAiPlugin({ provider: 'ollama', model: 'llama3.2' })],
  modules: [catalogModule],
})

// catalog.controller.ts
@Controller('catalog')
export class CatalogController extends BaseController {
  constructor(@inject('AiProvider') private ai: LlmProvider) { super() }

  @Post('summarize')
  @Body(SummarizeSchema)
  async summarize(req: Request, res: Response) {
    // @Body is a method decorator — validated data is on req.body, not a parameter
    const body = req.body as SummarizeDto
    const summary = await this.ai.generate(`Summarize: ${body.text}`, { temperature: 0.3 })
    return this.ok(res, { summary })
  }
}
```

**Plugin contract:**
- Registers `'AiProvider'` token on root container (type: `LlmProvider` from `@banana-universe/ai-provider-core`)
- Lifecycle: `register()` → provider connection check; `onShutdown()` → provider cleanup
- Reads from `.bananarc.json` by default; constructor options override

**Package:** `packages/plugin-ai` (new). Depends on `packages/ai-provider-core` — do not depend on `bananajs-cli` internals.

**Security — prompt injection:** Handlers that pass user-controlled request data directly to `this.ai.generate()` are exposed to prompt injection. The plugin does **not** automatically sanitize inputs. Teams must:
- Validate and truncate user input via `@Body` Zod schema before LLM calls.
- Never include raw `req.headers` or `req.params` in system prompts.
- Prefer structured prompt templates over open string interpolation.

Document in `packages/plugin-ai/README.md` and docs-site AI section.

---

### `bananajs ai contract` — Consumer-driven contract test generation

**Goal:** Generate Pact-compatible consumer contract tests from the exported OpenAPI spec, enabling teams to gate API changes via contract testing in CI.

**Input:** `openapi.json` (from `bananajs openapi export`). Optionally accepts fixture JSON from `bananajs ai mock --format json` via `--fixtures <dir>` — skips redundant LLM payload generation when mock output is already available.
**Output:** TypeScript test files using `@pact-foundation/pact` (optional peer) that define consumer expectations per endpoint.

**LLM role:** Generate realistic interaction payloads from Zod schemas embedded in the spec; name interactions meaningfully. LLM call is skipped when `--fixtures` is supplied.

**Flags:** `--spec <openapi.json>`, `--consumer <name>`, `--provider <name>`, `--fixtures <dir>`, `--out <dir>`, `--dry-run`.

---

## Gaps and risks

| Risk | Severity | Mitigation |
|---|---|---|
| `LlmProvider` CLI-internal; `plugin-ai` cannot depend on CLI | High | Extract `packages/ai-provider-core` before shipping plugin (step 8 in implementation order) |
| `ai upgrade --apply` auto-applies to business logic | High | Limit `--apply` to known safe mechanical transforms; emit `.patch` for everything else; explicit confirm required; never expose via MCP |
| Prompt injection in `BananaAiPlugin` handlers | High | Document in plugin README and docs-site; teams must sanitize user input before `ai.generate()` calls |
| `ai debug` schema conflicts with `ai review` versioning | Medium | Use separate `AiDebugJson` type and its own `schemaVersion` counter; do not share |
| MCP tool `bananajs_upgrade` triggers file mutations | Medium | MCP transport exposes `--dry-run` only; `--apply` is not an MCP tool |
| Cursor `.cursorrules` deprecation in `ai context` | Low | Generate `.cursor/rules/bananajs.mdc` as primary; also emit root `.cursorrules` for backwards compat |
| Faker optional peer in `ai mock` | Low | Fallback to hardcoded type-based literals; emit install hint |
| OpenAPI enrich round-trip safety | Medium | `--out` required unless `--dry-run`; never overwrite `--in` in place |
| `ai changelog` LLM noise | Low | Collapse chore+ci by default; `--include-all` opt-in |

---

## Implementation order

1. **`bananajs ai context`** — zero new LLM infrastructure; reuses rules + existing scan. Fastest win.
2. **`bananajs ai mock`** — pure generation; builds on existing `ai generate` scaffolding.
3. **`bananajs ai openapi enrich`** — builds on `bananajs openapi export`; `--out` safety gate.
4. **`bananajs ai debug`** — define `AiDebugJson` schema; route-scan + stack-trace parsing.
5. **`bananajs ai perf`** — static AST-first; reuses `AiReviewJson`; no LLM required for most checks.
6. **`bananajs ai upgrade`** — migration manifest seeded from `docs/MIGRATION.md`; static-only first, LLM pass later.
7. **`bananajs ai changelog`** — git integration + OpenAPI diff.
8. **`packages/ai-provider-core`** — extract `LlmProvider` to shared publishable package; prerequisite for plugin and MCP.
9. **MCP server** — thin transport over stable CLI commands from steps 1–7; `bananajs_upgrade` is dry-run only.
10. **`BananaAiPlugin`** — depends on step 8; can run in parallel with step 9.
11. **`bananajs ai contract`** — Pact optional peer; use `ai mock --format json` as `--fixtures` to minimize LLM calls.

---

## Roadmap by horizon

### Horizon A — Foundation wins (builds directly on V1 infra)

| Feature | Key output | Effort |
|---|---|---|
| `bananajs ai context` | CLAUDE.md + `.cursor/rules/bananajs.mdc` + copilot-instructions.md + AGENTS.md | Low |
| `bananajs ai mock` | TypeScript fixture factories + JSON samples | Low–Medium |
| `bananajs ai openapi enrich` | Enriched spec with descriptions + examples | Medium–High |

### Horizon B — Developer-experience depth

| Feature | Key output | Effort |
|---|---|---|
| `bananajs ai debug` | Structured `AiDebugJson` root-cause + fix | Medium |
| `bananajs ai perf` | Performance findings via `AiReviewJson`; static-first | Medium |
| `bananajs ai upgrade` | Migration hints + `.patch` files; seeded from `docs/MIGRATION.md` | Medium–High |
| `bananajs ai changelog` | Structured MD or JSON changelog | Medium |

### Horizon C — Ecosystem and runtime

| Feature | Key output | Effort |
|---|---|---|
| `packages/ai-provider-core` | Shared `LlmProvider` contract extracted from CLI | Low |
| MCP server | `bananajs mcp start`; 8 tools; upgrade dry-run only | High |
| `BananaAiPlugin` | tsyringe `AiProvider` token; plugin lifecycle; security guidance | Medium |
| `bananajs ai contract` | Pact consumer test files from OpenAPI; `--fixtures` from `ai mock` | Medium |

---

## Success metrics

| Feature | Signal |
|---|---|
| `ai context` | Context file references correct module names and ORM from actual project; `ai review` runs against generated rules without errors |
| `ai mock` | Generated fixtures pass `schema.safeParse()` for every Zod schema they were derived from |
| `ai openapi enrich` | Zero new breaking changes in output spec; enriched fields present for ≥80% of operations |
| `ai debug` | `AiDebugJson` output with `rootCause` non-empty; correct `location.file` for known DI token error patterns |
| `ai perf` | At least one finding per file containing a repository-in-loop pattern; zero false positives on clean files |
| `ai upgrade` | No false-positive `--apply` transforms; safe renames pass post-apply `typecheck`; manifest covers all breaking changes in `docs/MIGRATION.md` |
| `ai changelog` | Entries correctly classify breaking vs feature vs fix; OpenAPI diff section present when `--before`/`--after` supplied |
| MCP | All 8 tools callable from Claude Code and Cursor without shell-script wrapper; `bananajs_upgrade` returns dry-run output only |
| `BananaAiPlugin` | `@inject('AiProvider')` resolves in `BananaTestApp` with token override; plugin registers + shuts down cleanly; security guidance in README |
| `ai contract` | Generated Pact test compiles and runs against a live BananaApp health endpoint |

---

## What to de-emphasize

- **Batch JSDoc injection** (`ai doc`) — deprecated in V1; do not revive. Use `ai explain` for summaries.
- **Standalone AI linting** separate from `ai review` — correctness checks stay in `ai review`; performance checks go in `ai perf`; keep command surface coherent.
- **Hosted AI proxy** — BananaJS stays provider-agnostic (Ollama default, Vercel AI SDK for cloud); do not bundle an API key management service.
- **`--apply` in MCP context** — destructive write operations must not be exposed through MCP tools; MCP is read + generate only.
