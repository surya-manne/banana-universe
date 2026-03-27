import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ZodType } from 'zod'

export interface JsonSchema {
  type?: string
  format?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  enum?: unknown[]
  items?: JsonSchema
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
}

/**
 * Converts a Zod schema to OpenAPI-compatible JSON Schema for documentation.
 */
export function extractJsonSchema(schema: ZodType): JsonSchema {
  try {
    const json = zodToJsonSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
    }) as Record<string, unknown>
    if (json.$schema) {
      delete json.$schema
    }
    return json as JsonSchema
  } catch {
    return { type: 'object' }
  }
}
