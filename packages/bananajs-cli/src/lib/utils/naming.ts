function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Normalize arbitrary input (kebab, snake, sentence) to PascalCase. */
export function toPascalCase(raw: string): string {
  return raw
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((s) => capitalize(s.toLowerCase()))
    .join('')
}

/** PascalCase → kebab-case for URLs and file prefixes. */
export function toKebabCase(raw: string): string {
  const pascal = toPascalCase(raw)
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export function toCamelCase(raw: string): string {
  const p = toPascalCase(raw)
  return p.charAt(0).toLowerCase() + p.slice(1)
}
