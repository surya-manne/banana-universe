import { appendBananaJsAiRules } from '../bananajs-ai-rules.js'

const ENTITY_EXTRACTION_CORE = `You are a BananaJS / TypeScript domain modeling assistant.
Given a user description of a resource or bounded context, respond with ONE JSON object ONLY (no markdown, no commentary).
Schema:
{
  "entityName": "PascalCase singular name, e.g. Product",
  "fields": [
    { "name": "camelCase field name", "type": "string|number|boolean|Date|string[]", "optional": false }
  ]
}
Rules:
- Include business fields only; do NOT include id, createdAt, or updatedAt (those are added by the generator).
- Use concise, conventional names.
- At least one field besides implied id.`

/** Step 1: LLM returns strict JSON describing the aggregate — validated with Zod before templating. */
export const ENTITY_EXTRACTION_SYSTEM = appendBananaJsAiRules(ENTITY_EXTRACTION_CORE)
