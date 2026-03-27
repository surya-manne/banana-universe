import * as path from 'path'
import { toPascalCase } from './utils/naming.js'
import { mapJsonTypeToTs } from './utils/type-mapping.js'

type SchemaProperties = Record<string, { type?: string }>

export interface ParsedSchema {
  entityName: string
  fields: Array<{ name: string; type: string }>
}

export function parseSchema(content: string, filePath: string): ParsedSchema {
  const parsed = JSON.parse(content) as Record<string, unknown>
  let entityName: string
  let properties: SchemaProperties = {}

  if (parsed['components'] && typeof parsed['components'] === 'object') {
    const components = parsed['components'] as {
      schemas?: Record<string, { properties?: SchemaProperties }>
    }
    const schemas = components.schemas ?? {}
    const firstKey = Object.keys(schemas)[0]
    entityName = firstKey
      ? toPascalCase(firstKey)
      : toPascalCase(path.basename(filePath, path.extname(filePath)))
    properties = firstKey ? schemas[firstKey].properties ?? {} : {}
  } else {
    const title = typeof parsed['title'] === 'string' ? parsed['title'] : undefined
    entityName = title
      ? toPascalCase(title)
      : toPascalCase(path.basename(filePath, path.extname(filePath)))
    properties = (parsed['properties'] as SchemaProperties | undefined) ?? {}
  }

  const fields = Object.entries(properties).map(([name, def]) => ({
    name,
    type: mapJsonTypeToTs(def.type),
  }))

  return { entityName, fields }
}
