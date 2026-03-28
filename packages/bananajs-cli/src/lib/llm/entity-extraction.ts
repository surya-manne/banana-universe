import { z } from 'zod'

export interface EntityExtraction {
  entityName: string
  fields: Array<{ name: string; type: string; optional?: boolean }>
}

export function tryParseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fence ? fence[1].trim() : trimmed
  try {
    return JSON.parse(body)
  } catch {
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
        }),
      )
      .min(1),
  })
  return schema.parse(data)
}
