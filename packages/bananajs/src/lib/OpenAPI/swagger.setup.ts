import type { Application, RequestHandler } from 'express'
import type { ZodType } from 'zod'
import type { RouteInfo, Constructor, BananaAppOptions } from '../Core/App'
import { MetadataKeys } from '../Router/MetaData.constants'
import { ValidationSource } from '../Validator/Validator.decorator.js'
import { extractJsonSchema } from './schema.extractor'
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

interface OpenApiOperation {
  tags?: string[]
  summary?: string
  description?: string
  deprecated?: boolean
  security?: unknown[]
  requestBody?: unknown
  responses: Record<string, { description: string; content?: unknown }>
  parameters?: unknown[]
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

    const op: OpenApiOperation = {
      tags: tags ?? [route.controller],
      summary: operation?.summary,
      description: operation?.description,
      deprecated: operation?.deprecated,
      responses: {},
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
        op.responses[String(r.status)] = { description: r.description }
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
