/** Map JSON Schema `type` to TypeScript types for codegen. */
export function mapJsonTypeToTs(jsonType: string | undefined): string {
  switch (jsonType) {
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'unknown[]'
    default:
      return 'string'
  }
}

/** Normalize free-form LLM / user type strings to TS types for DTOs and entities. */
export function normalizeExtractionType(typeHint: string): string {
  const t = typeHint.trim().toLowerCase()
  if (
    t === 'int' ||
    t === 'integer' ||
    t === 'float' ||
    t === 'double' ||
    t === 'number' ||
    t === 'decimal'
  ) {
    return 'number'
  }
  if (t === 'bool' || t === 'boolean') {
    return 'boolean'
  }
  if (t.includes('date') || t === 'datetime' || t === 'timestamp') {
    return 'Date'
  }
  if (t === 'uuid' || t === 'string' || t === 'text' || t === 'email' || t === 'url') {
    return 'string'
  }
  if (t.includes('[]') || t.startsWith('array') || t === 'list') {
    return 'string[]'
  }
  return 'string'
}
