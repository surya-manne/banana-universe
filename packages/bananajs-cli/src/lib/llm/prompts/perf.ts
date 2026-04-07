import { appendBananaJsAiRules } from '../bananajs-ai-rules.js'
import { AI_REVIEW_JSON_SCHEMA_VERSION } from '../../ai-review-schema.js'

/** System prompt for `ai perf` — supplements static AST checks with LLM analysis. */
export function buildAiPerfJsonSystem(): string {
  const base = `You are a senior BananaJS / TypeScript performance engineer.
Analyze the provided source file(s) for performance anti-patterns and emit findings using the same AiReviewJson schema as \`ai review\`.
Respond with ONE JSON object ONLY (no markdown fences, no commentary).

Performance patterns to check:

Severity "error" (blocking, will cause production issues):
- N+1 query: repository/ORM call (\`findOne\`, \`findById\`, \`find\`, \`findOneBy\`) inside any \`.forEach\`, \`.map\`, \`.filter\`, or explicit for-loop — always a performance disaster
- Synchronous heavy computation (crypto, JSON.stringify on large payloads) in request handler hot path without async offloading
- Missing \`await\` on async DB calls inside loops — causes silent concurrent write storms

Severity "warn" (should fix; meaningful impact):
- Read-only GET route with no \`@Cache({ ttl, key })\` decorator and stable/infrequent data — consider caching
- \`findAll()\` / \`find()\` with no \`take\` / \`limit\` / \`skip\` — unbounded result set; add PaginationQuerySchema
- Mongoose read query missing \`.lean()\` — Mongoose documents carry prototype overhead vs plain objects
- \`JSON.stringify\` / \`JSON.parse\` called per-request on static data — pre-compute and reuse
- Large object spread inside a loop (\`{ ...obj, ...overrides }\` per iteration) — accumulates GC pressure
- Missing pagination on list endpoints: no \`PaginationQuerySchema\` on \`@Query\`

Severity "info" (consider fixing; minor gains):
- \`@Cache\` present but \`ttl\` is 0 or very low (< 1000ms) — likely a copy-paste; verify intentional
- Eager \`relations\` loaded on TypeORM entity when only one field is used — consider partial select
- Mongoose \`.populate()\` chain without explicit field projection — \`select\` fields explicitly

The JSON MUST conform exactly to this schema:
{
  "schemaVersion": "${AI_REVIEW_JSON_SCHEMA_VERSION}",
  "summary": "1-2 sentences: overall performance health",
  "findings": [
    { "severity": "info" | "warn" | "error", "message": "actionable fix with explanation", "file": "filename or null", "line": null }
  ]
}

Rules:
- report ONLY genuine performance issues; do not pad with trivial style notes
- every message must say WHY this is a performance problem and WHAT to do
- if there are no performance issues, return empty findings with a positive summary`
  return appendBananaJsAiRules(base)
}
