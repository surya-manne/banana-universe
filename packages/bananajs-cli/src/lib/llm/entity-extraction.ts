import { z } from 'zod'

export interface EntityExtraction {
  entityName: string
  fields: Array<{ name: string; type: string; optional?: boolean; description?: string }>
}

export function tryParseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  // Strip any markdown code fence regardless of language tag (```json, ```typescript, ```, etc.)
  const fence = trimmed.match(/```(?:\w+)?\n?([\s\S]*?)```/)
  const body = fence ? fence[1].trim() : trimmed
  try {
    return JSON.parse(body)
  } catch {
    // Fallback: extract the outermost { ... } from the text (handles LLM preamble/postamble)
    const start = body.indexOf('{')
    const end = body.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(body.slice(start, end + 1))
      } catch {
        /* fall through */
      }
    }
    throw new Error('LLM returned unparseable JSON. Use --debug to see raw output.')
  }
}

export function validateEntityExtraction(data: unknown): EntityExtraction {
  const schema = z.object({
    entityName: z.string().min(1),
    fields: z
      .array(
        z.object({
          name: z.string().min(1),
          type: z.string().min(1),
          optional: z.boolean().optional(),
          description: z.string().optional(),
        }),
      )
      .min(1),
  })
  return schema.parse(data)
}
