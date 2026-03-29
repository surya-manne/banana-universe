/**
 * Canonical BananaJS AI rules — versioned with the CLI. Prepended or injected into every
 * LLM-backed operation (generate, review, wire, etc.) so behavior stays consistent.
 */
export const BANANAJS_AI_RULES_VERSION = '1.0.0'

/** Markdown-shaped rules block (also used in contract tests for required section headers). */
export const BANANAJS_AI_RULES_MARKDOWN = `## Module layout
- Prefer \`src/modules/<feature>/\` with \`domain/\`, \`application/\` (or \`domain/\` services), and \`infrastructure/\` or \`persistence/\` as in Enterprise modular DX.
- Feature entry exports \`createModule\` from \`index.ts\`; one primary HTTP controller per module unless the API surface clearly splits (e.g. admin vs public).
- Colocate InjectionToken with repository ports in \`domain/\`; bind adapters in \`providers\` with \`{ token, useClass }\`.

## ORM boundaries
- One ORM per feature by default (TypeORM vs Mongoose). Do not mix ORM types inside a single feature folder.
- TypeORM: entities often use \`*OrmEntity\` or live under \`infrastructure/\`; Mongoose: schemas/models with clear document types.
- Repositories implement domain ports; controllers depend on application services, not ORM directly.

## HTTP and API
- Use BananaJS decorators (\`@Controller\`, \`@Get\`, etc.) with Zod-backed \`@Body\`/\`@Params\`/\`@Query\` where applicable.
- Success responses use \`SuccessResponse\` patterns via \`BaseController\` helpers; errors use \`ApiError\` subclasses.
- Prefer URI-first versioning (e.g. \`/v1/...\`) or app \`apiPrefix\` when applicable.

## Security
- Validate all external input; never trust raw request bodies.
- **Do not echo, log, or return environment secrets or connection strings.** Use \`[REDACTED]\` in examples and logs when referring to sensitive values.
- Do not suggest hardcoding API keys, passwords, or tokens in source code.

## Wiring and bootstrap
- **Plugins before module providers** so shared tokens (e.g. DataSource, Mongoose connection) exist when modules resolve.
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
