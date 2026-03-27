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

export async function validateEntityExtraction(data: unknown): Promise<EntityExtraction> {
  const zod = await import('zod').catch(() => {
    throw new Error('Install zod to use AI module generation: npm install zod')
  })
  const schema = zod.z.object({
    entityName: zod.z.string().min(1),
    fields: zod.z
      .array(
        zod.z.object({
          name: zod.z.string().min(1),
          type: zod.z.string().min(1),
          optional: zod.z.boolean().optional(),
        }),
      )
      .min(1),
  })
  return schema.parse(data) as EntityExtraction
}
