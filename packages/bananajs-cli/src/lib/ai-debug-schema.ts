import { z } from 'zod'

/** Published schema version for structured `ai debug` output — separate counter from AiReviewJson. */
export const AI_DEBUG_JSON_SCHEMA_VERSION = '1.0.0'

export const aiDebugJsonSchema = z.object({
  schemaVersion: z.string(),
  error: z.string(),
  rootCause: z.string(),
  location: z
    .object({
      file: z.string().nullable(),
      hint: z.string().nullable(),
    })
    .optional(),
  fix: z.string(),
  severity: z.enum(['info', 'warn', 'error']),
})

export type AiDebugJson = z.infer<typeof aiDebugJsonSchema>

export function parseAiDebugJson(raw: unknown): AiDebugJson {
  return aiDebugJsonSchema.parse(raw)
}
