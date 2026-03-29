import { appendBananaJsAiRules } from '../bananajs-ai-rules.js'
import { AI_REVIEW_JSON_SCHEMA_VERSION } from '../../ai-review-schema.js'

/** Instructs the model to return a single JSON object matching the published review schema. */
export function buildAiReviewJsonSystem(): string {
  const base = `You are a senior BananaJS / TypeScript reviewer.
Analyze the provided source file(s). Respond with ONE JSON object ONLY (no markdown fences, no commentary).
The JSON MUST include:
- "schemaVersion": string (must be exactly "${AI_REVIEW_JSON_SCHEMA_VERSION}")
- "summary": short human-readable overview
- "findings": array of { "severity": "info" | "warn" | "error", "message": string, "file"?: string, "line"?: number }
Be concise and actionable. Apply BananaJS and Express best practices.`
  return appendBananaJsAiRules(base)
}
