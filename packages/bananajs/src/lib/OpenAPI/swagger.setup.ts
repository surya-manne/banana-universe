import type { Application, RequestHandler } from 'express'
import type { ZodType } from 'zod'
import type { RouteInfo, Constructor, BananaAppOptions } from '../Core/App'
import { MetadataKeys } from '../Router/MetaData.constants'
import { ValidationSource } from '../Validator/Validator.decorator.js'
import { extractJsonSchema, type JsonSchema } from './schema.extractor'
import type { ApiOperationOptions, ApiBodyOptions, ApiResponseOptions } from './ApiDoc.decorators'

export interface OpenApiDocument {
  openapi: string
  info: { title: string; version: string; description?: string }
  paths: Record<string, Record<string, OpenApiOperation>>
  components?: {
    securitySchemes?: Record<string, unknown>
    schemas?: Record<string, unknown>
  }
}

interface OpenApiParameter {
  name: string
  in: 'query' | 'path' | 'header'
  required: boolean
  description?: string
  schema: JsonSchema
}

interface OpenApiOperation {
  tags?: string[]
  summary?: string
  description?: string
  deprecated?: boolean
  security?: unknown[]
  requestBody?: unknown
  responses: Record<string, { description: string; content?: unknown }>
  parameters?: OpenApiParameter[]
}

/** Converts `getUser` → `Get User`, `listUserOrders` → `List User Orders`. */
function camelToTitleCase(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/** Strips the `Controller` suffix for use as an OpenAPI tag. */
function controllerTag(className: string): string {
  return className.replace(/Controller$/i, '') || className
}

/**
 * Converts a Zod object schema to OpenAPI parameter entries for query, path, or header.
 * Non-object or unrecognised schemas produce an empty array.
 */
export function extractZodParameters(
  schema: ZodType,
  location: 'query' | 'path' | 'header',
): OpenApiParameter[] {
  const jsonSchema = extractJsonSchema(schema) as JsonSchema & {
    properties?: Record<string, JsonSchema>
    required?: string[]
  }

  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    const requiredFields = new Set(jsonSchema.required ?? [])
    return Object.entries(jsonSchema.properties).map(([name, fieldSchema]) => ({
      name,
      in: location,
      required: location === 'path' || requiredFields.has(name),
      schema: fieldSchema,
    }))
  }

  return []
}

export function buildOpenApiSpec(
  routeTable: RouteInfo[],
  controllers: Constructor[],
  swaggerOpts: NonNullable<BananaAppOptions['swagger']>,
  authOpts?: BananaAppOptions['auth'],
): OpenApiDocument {
  const spec: OpenApiDocument = {
    openapi: '3.0.3',
    info: {
      title: swaggerOpts.title ?? 'BananaJS API',
      version: swaggerOpts.version ?? '1.0.0',
      description: swaggerOpts.description,
    },
    paths: {},
    components: authOpts
      ? {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        }
      : undefined,
  }

  for (const route of routeTable) {
    const controllerClass = controllers.find((c) => c.name === route.controller)
    if (!controllerClass) continue

    const httpMethod = route.method.toLowerCase()
    const pathKey = route.path.replace(/:(\w+)/g, '{$1}')

    if (!spec.paths[pathKey]) spec.paths[pathKey] = {}

    const tags = Reflect.getMetadata(MetadataKeys.API_TAGS, controllerClass) as string[] | undefined
    const operation = Reflect.getMetadata(
      MetadataKeys.API_OPERATION,
      controllerClass,
      route.handler,
    ) as ApiOperationOptions | undefined
    let body = Reflect.getMetadata(MetadataKeys.API_BODY, controllerClass, route.handler) as
      | ApiBodyOptions
      | undefined
    if (!body) {
      const zodBody = Reflect.getMetadata(
        ValidationSource.BODY,
        controllerClass.prototype,
        route.handler,
      ) as ZodType | undefined
      if (zodBody) {
        body = { schema: zodBody }
      }
    }
    const responses = Reflect.getMetadata(
      MetadataKeys.API_RESPONSE,
      controllerClass,
      route.handler,
    ) as ApiResponseOptions[] | undefined
    const isAuthMethod = Reflect.getMetadata(MetadataKeys.AUTH, controllerClass, route.handler) as
      | boolean
      | undefined
    const isAuthClass = Reflect.getMetadata(MetadataKeys.AUTH, controllerClass) as
      | boolean
      | undefined
    const isPublic = Reflect.getMetadata(MetadataKeys.PUBLIC, controllerClass, route.handler) as
      | boolean
      | undefined

    // --- Auto-infer parameters from @Query, @Params, @Headers Zod schemas ---
    const parameters: OpenApiParameter[] = []

    const zodQuery = Reflect.getMetadata(
      ValidationSource.QUERY,
      controllerClass.prototype,
      route.handler,
    ) as ZodType | undefined
    if (zodQuery) {
      parameters.push(...extractZodParameters(zodQuery, 'query'))
    }

    const zodParams = Reflect.getMetadata(
      ValidationSource.PARAM,
      controllerClass.prototype,
      route.handler,
    ) as ZodType | undefined
    if (zodParams) {
      parameters.push(...extractZodParameters(zodParams, 'path'))
    } else {
      // Fallback: extract path param names from the URL pattern when no @Params schema is set
      const pathParamNames = [...pathKey.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
      for (const name of pathParamNames) {
        parameters.push({ name, in: 'path', required: true, schema: { type: 'string' } })
      }
    }

    const zodHeaders = Reflect.getMetadata(
      ValidationSource.HEADER,
      controllerClass.prototype,
      route.handler,
    ) as ZodType | undefined
    if (zodHeaders) {
      parameters.push(...extractZodParameters(zodHeaders, 'header'))
    }

    const op: OpenApiOperation = {
      tags: tags ?? [controllerTag(route.controller)],
      summary: operation?.summary ?? camelToTitleCase(route.handler),
      description: operation?.description,
      deprecated: operation?.deprecated,
      responses: {},
      ...(parameters.length > 0 ? { parameters } : {}),
    }

    if (authOpts && (isAuthMethod || isAuthClass) && !isPublic) {
      op.security = [{ BearerAuth: [] }]
    }

    if (body) {
      const schema = extractJsonSchema(body.schema)
      op.requestBody = {
        required: body.required !== false,
        description: body.description,
        content: {
          'application/json': { schema },
        },
      }
    }

    if (responses && responses.length > 0) {
      for (const r of responses) {
        const responseEntry: { description: string; content?: unknown } = {
          description: r.description,
        }
        if (r.schema) {
          responseEntry.content = {
            'application/json': { schema: extractJsonSchema(r.schema) },
          }
        }
        op.responses[String(r.status)] = responseEntry
      }
    } else {
      op.responses['200'] = { description: 'Success' }
    }

    spec.paths[pathKey][httpMethod] = op
  }

  return spec
}

export async function setupSwagger(
  app: Application,
  spec: OpenApiDocument,
  opts: NonNullable<BananaAppOptions['swagger']>,
  logger?: { warn?: (msg: string) => void },
): Promise<void> {
  const basePath = opts.path ?? '/api-docs'

  app.get(`${basePath}.json`, (_req, res) => {
    res.json(spec)
  })

  try {
    // @ts-expect-error — optional peer dep, may not be installed
    const scalar = await import('@scalar/express-api-reference')
    const apiReference =
      (scalar as { apiReference?: unknown; default?: { apiReference?: unknown } }).apiReference ??
      (scalar as { apiReference?: unknown; default?: { apiReference?: unknown } }).default
        ?.apiReference
    if (typeof apiReference === 'function') {
      app.use(
        basePath,
        (apiReference as (opts: unknown) => RequestHandler)({ spec: { content: spec } }),
      )
      return
    }
  } catch {
    // not installed, try fallback
  }

  try {
    const swaggerUi = await import('swagger-ui-express')
    app.use(
      basePath,
      swaggerUi.serve as RequestHandler[],
      swaggerUi.setup(spec as Parameters<typeof swaggerUi.setup>[0]),
    )
    return
  } catch {
    // not installed
  }

  logger?.warn?.(
    'No OpenAPI UI package found (@scalar/express-api-reference or swagger-ui-express). Serving JSON spec only at ' +
      basePath +
      '.json',
  )
}
