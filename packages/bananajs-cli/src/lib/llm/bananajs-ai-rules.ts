/**
 * Canonical BananaJS AI rules — versioned with the CLI. Prepended or injected into every
 * LLM-backed operation (generate, review, wire, etc.) so behavior stays consistent.
 */
export const BANANAJS_AI_RULES_VERSION = '1.1.0'

/** Markdown-shaped rules block (also used in contract tests for required section headers). */
export const BANANAJS_AI_RULES_MARKDOWN = `## TypeScript conventions
- \`noImplicitReturns: true\` is active — every \`catch\` block handling Express errors MUST use \`return next(error)\`, not just \`next(error)\`; omitting \`return\` is a compile error.
- \`reflect-metadata\` MUST be the **first** import in every entry/bootstrap file; any other import placed before it causes silent decorator-metadata failures at runtime.

## Module layout
- Prefer \`src/modules/<feature>/\` with \`domain/\`, \`application/\` (or \`domain/\` services), and \`infrastructure/\` or \`persistence/\` as in Enterprise modular DX.
- Feature entry exports \`createModule\` from \`index.ts\`; one primary HTTP controller per module unless the API surface clearly splits (e.g. admin vs public).
- Colocate InjectionToken with repository ports in \`domain/\`; bind adapters in \`providers\` with \`{ token, useClass }\`.

## ORM boundaries
- One ORM per feature by default (TypeORM vs Mongoose). Do not mix ORM types inside a single feature folder.
- **TypeORM injection**: always inject via the string token — \`@inject('dataSource') private dataSource: DataSource\`; never inject \`DataSource\` as a constructor-level class dependency.
- **Mongoose injection**: use per-entity token constants — \`@inject(XyzModelToken) private model: Model<XyzDocument>\`; define tokens in the \`domain/\` layer.
- TypeORM: entities use \`*OrmEntity\` naming under \`infrastructure/\`; Mongoose: schemas/models with clear document interface types.
- Repositories implement domain ports; controllers depend on application services, not ORM directly.

## Zod validation conventions
- Required string fields: \`.min(1)\` — rejects empty string, not just null/undefined.
- Closed value sets (status, role, type, category): use \`z.enum(['value1', 'value2', ...])\` — not plain \`z.string()\`.
- Date fields: \`z.coerce.date()\` — accepts ISO-8601 string inputs from JSON request bodies.
- Optional fields: chain \`.optional()\` after the base type validator.
- Add \`.describe('...')\` to fields with non-obvious semantics or enum variants.

## HTTP and API
- Use BananaJS decorators (\`@Controller\`, \`@Get\`, etc.) with Zod-backed \`@Body\`/\`@Params\`/\`@Query\` where applicable.
- Success responses use \`SuccessResponse\` patterns via \`BaseController\` helpers (\`this.ok(data)\`, \`this.error(err)\`); errors use \`ApiError\` subclasses.
- Prefer URI-first versioning (e.g. \`/v1/...\`) or app \`apiPrefix\` when applicable.
- GET list endpoints accept \`@Query(PaginationQuerySchema) query\` and return \`{ items: T[]; total: number }\`.

## Security
- Validate all external input; never trust raw request bodies.
- **Do not echo, log, or return environment secrets or connection strings.** Use \`[REDACTED]\` in examples and logs when referring to sensitive values.
- Do not suggest hardcoding API keys, passwords, or tokens in source code.
- **Never log raw request bodies verbatim.** Any field whose key matches \`password\`, \`token\`, \`secret\`, \`apiKey\`, \`authorization\`, or similar credential patterns must be redacted before logging.

## Wiring and bootstrap
- **Plugins before module providers** — the \`plugins: []\` array MUST appear before \`modules: []\` in \`defineBananaAppOptions\` / \`BananaApp.create\` so plugin-registered tokens (DataSource, Mongoose connection) exist when modules resolve.
- \`BananaApp.create(options)\` is required when plugins are present (async lifecycle). \`new BananaApp(options)\` is synchronous-only — do not add async plugins to a sync bootstrap.
- Supported app shapes: \`controllers\` via \`defineBananaControllers\` (legacy-friendly) or \`modules\` via \`createModule\` (feature modules). See project \`.bananarc.json\` / docs when available.

## Review severity
- Use vocabulary: **info** (style/suggestion), **warn** (likely bug or foot-gun), **error** (security, broken contract, data loss risk).

## Supported bootstrap paths
- See framework \`docs/ARCHITECTURE.md\`: \`controllers\` vs \`modules\` and when each applies.
`

const RULES_BLOCK = `--- BANANAJS_AI_RULES (v${BANANAJS_AI_RULES_VERSION}) ---\n${BANANAJS_AI_RULES_MARKDOWN}\n--- END BANANAJS_AI_RULES ---`

/** Full system prompt segment to combine with operation-specific instructions. */
export function appendBananaJsAiRules(operationSpecificSystem: string): string {
  return `${operationSpecificSystem.trim()}\n\n${RULES_BLOCK}`
}
