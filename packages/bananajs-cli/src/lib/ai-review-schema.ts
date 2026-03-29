import { z } from 'zod'

/** Published schema version for structured \`ai review --format json\` output. */
export const AI_REVIEW_JSON_SCHEMA_VERSION = '1.0.0'

export const findingSchema = z.object({
  severity: z.enum(['info', 'warn', 'error']),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().int().optional(),
})

export const aiReviewJsonSchema = z.object({
  schemaVersion: z.string(),
  summary: z.string(),
  findings: z.array(findingSchema),
})

export type AiReviewFinding = z.infer<typeof findingSchema>
export type AiReviewJson = z.infer<typeof aiReviewJsonSchema>

export function parseAiReviewJson(raw: unknown): AiReviewJson {
  return aiReviewJsonSchema.parse(raw)
}
