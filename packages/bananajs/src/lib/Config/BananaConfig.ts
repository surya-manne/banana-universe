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

export interface BananaConfigInstance<T> {
  get(): Readonly<T>
  reload(): void
  onSecretRotated(handler: (key: string, newValue: unknown) => void): void
  offSecretRotated(handler: (key: string, newValue: unknown) => void): void
}

function buildConfig<S extends ConfigSchema>(schema: S): ConfigResult<S> {
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

export function BananaConfig<S extends ConfigSchema>(
  schema: S,
): ConfigResult<S> & BananaConfigInstance<ConfigResult<S>> {
  const handlers = new Set<(key: string, newValue: unknown) => void>()
  let currentConfig = buildConfig(schema)

  const instance: BananaConfigInstance<ConfigResult<S>> = {
    get(): Readonly<ConfigResult<S>> {
      return currentConfig
    },
    reload(): void {
      const newConfig = buildConfig(schema)
      for (const [key, field] of Object.entries(schema)) {
        if (field.sensitive) {
          const typedKey = key as keyof ConfigResult<S>
          if (currentConfig[typedKey] !== newConfig[typedKey]) {
            for (const handler of handlers) {
              handler(key, newConfig[typedKey])
            }
          }
        }
      }
      currentConfig = newConfig
    },
    onSecretRotated(handler: (key: string, newValue: unknown) => void): void {
      handlers.add(handler)
    },
    offSecretRotated(handler: (key: string, newValue: unknown) => void): void {
      handlers.delete(handler)
    },
  }

  // Add property getters for each schema key to preserve backward-compat direct access (config.KEY)
  for (const key of Object.keys(schema)) {
    Object.defineProperty(instance, key, {
      get(): unknown {
        return currentConfig[key as keyof ConfigResult<S>]
      },
      enumerable: true,
      configurable: true,
    })
  }

  return instance as unknown as ConfigResult<S> & BananaConfigInstance<ConfigResult<S>>
}
