export interface ConfigFieldDef {
  env: string
  type?: 'string' | 'number' | 'boolean'
  default?: string | number | boolean
  required?: boolean
  sensitive?: boolean
}

export type ConfigSchema = Record<string, ConfigFieldDef>

type InferFieldType<F extends ConfigFieldDef> = F['type'] extends 'number'
  ? number
  : F['type'] extends 'boolean'
    ? boolean
    : string

export type ConfigResult<S extends ConfigSchema> = {
  readonly [K in keyof S]: InferFieldType<S[K]>
}

export function BananaConfig<S extends ConfigSchema>(schema: S): ConfigResult<S> {
  const result: Record<string, string | number | boolean> = {}
  const errors: string[] = []

  for (const [key, field] of Object.entries(schema)) {
    const rawValue = process.env[field.env]

    if (rawValue === undefined || rawValue === '') {
      if (field.required && field.default === undefined) {
        errors.push(`Missing required environment variable: ${field.env} (config key: ${key})`)
        continue
      }
      if (field.default !== undefined) {
        result[key] = field.default
        continue
      }
      result[key] = field.type === 'number' ? 0 : field.type === 'boolean' ? false : ''
      continue
    }

    const fieldType = field.type ?? 'string'
    if (fieldType === 'number') {
      const parsed = Number(rawValue)
      if (isNaN(parsed)) {
        errors.push(
          `Invalid number for environment variable ${field.env} (config key: ${key}): "${rawValue}"`,
        )
        continue
      }
      result[key] = parsed
    } else if (fieldType === 'boolean') {
      result[key] = rawValue === 'true' || rawValue === '1'
    } else {
      result[key] = rawValue
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
  }

  return Object.freeze(result) as ConfigResult<S>
}
