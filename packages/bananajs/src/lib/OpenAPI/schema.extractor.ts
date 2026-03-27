import { getMetadataStorage } from 'class-validator'

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

interface ValidationMeta {
  propertyName: string
  type: string
  constraints?: Record<string, unknown>
}

export function extractJsonSchema(DtoClass: new (...args: unknown[]) => unknown): JsonSchema {
  try {
    const storage = getMetadataStorage()
    const metadatas = (
      storage as unknown as {
        getTargetValidationMetadatas(
          target: unknown,
          targetSchema: string,
          includeInherited: boolean,
          includeAllMetadata: boolean,
        ): ValidationMeta[]
      }
    ).getTargetValidationMetadatas(DtoClass, '', false, false)

    const properties: Record<string, JsonSchema> = {}
    const optionalProps = new Set<string>()

    for (const meta of metadatas) {
      const prop = meta.propertyName
      if (!properties[prop]) properties[prop] = {}
      const schema = properties[prop]

      if (meta.type === 'isOptional') {
        optionalProps.add(prop)
        continue
      }

      switch (meta.type) {
        case 'isString':
          schema.type = 'string'
          break
        case 'isNumber':
          schema.type = 'number'
          break
        case 'isInt':
          schema.type = 'integer'
          break
        case 'isBoolean':
          schema.type = 'boolean'
          break
        case 'isEmail':
          schema.type = 'string'
          schema.format = 'email'
          break
        case 'isArray':
          schema.type = 'array'
          break
        case 'isEnum': {
          const values = meta.constraints?.[0]
          if (values && typeof values === 'object') {
            schema.enum = Object.values(values as Record<string, unknown>)
          }
          break
        }
        case 'min': {
          const minVal = meta.constraints?.[0]
          if (typeof minVal === 'number') schema.minimum = minVal
          break
        }
        case 'max': {
          const maxVal = meta.constraints?.[0]
          if (typeof maxVal === 'number') schema.maximum = maxVal
          break
        }
        case 'minLength': {
          const minLen = meta.constraints?.[0]
          if (typeof minLen === 'number') schema.minLength = minLen
          break
        }
        case 'maxLength': {
          const maxLen = meta.constraints?.[0]
          if (typeof maxLen === 'number') schema.maxLength = maxLen
          break
        }
        default:
          if (!schema.type) schema.type = 'string'
      }
    }

    const required: string[] = []
    for (const prop of Object.keys(properties)) {
      if (!optionalProps.has(prop)) {
        required.push(prop)
      }
    }

    return {
      type: 'object',
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      required: required.length > 0 ? required : undefined,
    }
  } catch {
    return { type: 'object' }
  }
}
