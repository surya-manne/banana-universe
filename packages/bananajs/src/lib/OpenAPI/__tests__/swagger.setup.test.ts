import 'reflect-metadata'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { extractZodParameters, buildOpenApiSpec } from '../swagger.setup.js'
import { ValidationSource } from '../../Validator/Validator.decorator.js'
import { MetadataKeys } from '../../Router/MetaData.constants.js'

// ---------------------------------------------------------------------------
// extractZodParameters
// ---------------------------------------------------------------------------

describe('extractZodParameters', () => {
  it('converts a Zod object schema into query parameters', () => {
    const schema = z.object({ page: z.number(), limit: z.number() })
    const params = extractZodParameters(schema, 'query')
    assert.equal(params.length, 2)
    assert.ok(params.some((p) => p.name === 'page' && p.in === 'query'))
    assert.ok(params.some((p) => p.name === 'limit' && p.in === 'query'))
  })

  it('marks required fields as required and optional fields as not required', () => {
    const schema = z.object({ id: z.string(), name: z.string().optional() })
    const params = extractZodParameters(schema, 'query')
    const id = params.find((p) => p.name === 'id')
    const name = params.find((p) => p.name === 'name')
    assert.equal(id?.required, true)
    assert.equal(name?.required, false)
  })

  it('forces required: true for path location regardless of Zod optionality', () => {
    const schema = z.object({ id: z.string().optional() })
    const params = extractZodParameters(schema, 'path')
    assert.equal(params[0].required, true)
  })

  it('returns an empty array for a non-object schema', () => {
    const params = extractZodParameters(z.string(), 'query')
    assert.deepEqual(params, [])
  })

  it('returns an empty array for a Zod array schema', () => {
    const params = extractZodParameters(z.array(z.string()), 'query')
    assert.deepEqual(params, [])
  })
})

// ---------------------------------------------------------------------------
// buildOpenApiSpec — parameter auto-inference
// ---------------------------------------------------------------------------

describe('buildOpenApiSpec — query parameters', () => {
  it('auto-infers query params from @Query Zod schema', () => {
    class QueryController {}
    const schema = z.object({ page: z.number(), limit: z.number() })
    Reflect.defineMetadata(ValidationSource.QUERY, schema, QueryController.prototype, 'list')

    const spec = buildOpenApiSpec(
      [{ method: 'GET', path: '/items', controller: 'QueryController', handler: 'list' }],
      [QueryController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = spec.paths['/items']?.['get'] as any
    assert.ok(op, 'operation should exist')
    assert.ok(Array.isArray(op.parameters), 'parameters should be an array')
    assert.ok(op.parameters.some((p: { name: string }) => p.name === 'page'))
    assert.ok(op.parameters.some((p: { name: string }) => p.name === 'limit'))
  })
})

describe('buildOpenApiSpec — path parameters', () => {
  it('auto-infers path params from @Params Zod schema', () => {
    class ParamsController {}
    const schema = z.object({ id: z.string(), slug: z.string() })
    Reflect.defineMetadata(ValidationSource.PARAM, schema, ParamsController.prototype, 'getItem')

    const spec = buildOpenApiSpec(
      [
        {
          method: 'GET',
          path: '/items/:id/:slug',
          controller: 'ParamsController',
          handler: 'getItem',
        },
      ],
      [ParamsController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = spec.paths['/items/{id}/{slug}']?.['get'] as any
    assert.ok(op)
    assert.ok(op.parameters.some((p: { name: string; in: string }) => p.name === 'id' && p.in === 'path'))
    assert.ok(op.parameters.some((p: { name: string; in: string }) => p.name === 'slug' && p.in === 'path'))
  })

  it('falls back to URL pattern for path params when no @Params schema is set', () => {
    class FallbackController {}

    const spec = buildOpenApiSpec(
      [
        {
          method: 'GET',
          path: '/users/:id',
          controller: 'FallbackController',
          handler: 'getUser',
        },
      ],
      [FallbackController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = spec.paths['/users/{id}']?.['get'] as any
    assert.ok(op)
    const idParam = op.parameters?.find((p: { name: string }) => p.name === 'id')
    assert.ok(idParam, 'id path param should be present')
    assert.equal(idParam.in, 'path')
    assert.equal(idParam.required, true)
    assert.equal(idParam.schema?.type, 'string')
  })

  it('emits no parameters for routes without path params and no Zod schemas', () => {
    class SimpleController {}

    const spec = buildOpenApiSpec(
      [{ method: 'GET', path: '/ping', controller: 'SimpleController', handler: 'ping' }],
      [SimpleController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = spec.paths['/ping']?.['get'] as any
    assert.ok(op)
    assert.ok(!op.parameters || op.parameters.length === 0)
  })
})

// ---------------------------------------------------------------------------
// buildOpenApiSpec — summary and tag fallbacks
// ---------------------------------------------------------------------------

describe('buildOpenApiSpec — auto summary and tags', () => {
  it('generates a humanized summary from the handler method name', () => {
    class SummaryController {}

    const spec = buildOpenApiSpec(
      [
        {
          method: 'GET',
          path: '/orders',
          controller: 'SummaryController',
          handler: 'getAllOrders',
        },
      ],
      [SummaryController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.equal((spec.paths['/orders']?.['get'] as any)?.summary, 'Get All Orders')
  })

  it('strips the Controller suffix from class name for the default tag', () => {
    class ProductController {}

    const spec = buildOpenApiSpec(
      [{ method: 'GET', path: '/products', controller: 'ProductController', handler: 'list' }],
      [ProductController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.deepEqual((spec.paths['/products']?.['get'] as any)?.tags, ['Product'])
  })

  it('uses @ApiOperation summary when explicitly set', () => {
    class ExplicitController {}
    Reflect.defineMetadata(
      MetadataKeys.API_OPERATION,
      { summary: 'Custom Summary' },
      ExplicitController,
      'doStuff',
    )

    const spec = buildOpenApiSpec(
      [
        {
          method: 'POST',
          path: '/stuff',
          controller: 'ExplicitController',
          handler: 'doStuff',
        },
      ],
      [ExplicitController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.equal((spec.paths['/stuff']?.['post'] as any)?.summary, 'Custom Summary')
  })

  it('uses @ApiTags when explicitly set', () => {
    class TaggedController {}
    Reflect.defineMetadata(MetadataKeys.API_TAGS, ['Orders', 'Admin'], TaggedController)

    const spec = buildOpenApiSpec(
      [{ method: 'GET', path: '/tagged', controller: 'TaggedController', handler: 'get' }],
      [TaggedController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.deepEqual((spec.paths['/tagged']?.['get'] as any)?.tags, ['Orders', 'Admin'])
  })
})

// ---------------------------------------------------------------------------
// buildOpenApiSpec — response schema
// ---------------------------------------------------------------------------

describe('buildOpenApiSpec — response schema', () => {
  it('attaches response body schema when @ApiResponseDoc includes a schema', () => {
    class ResponseController {}
    const responseSchema = z.object({ id: z.string(), total: z.number() })
    Reflect.defineMetadata(
      MetadataKeys.API_RESPONSE,
      [{ status: 200, description: 'OK', schema: responseSchema }],
      ResponseController,
      'getOrder',
    )

    const spec = buildOpenApiSpec(
      [
        {
          method: 'GET',
          path: '/orders/:id',
          controller: 'ResponseController',
          handler: 'getOrder',
        },
      ],
      [ResponseController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (spec.paths['/orders/{id}']?.['get'] as any)?.responses?.['200']
    assert.ok(response, 'response 200 should exist')
    assert.ok(response.content, 'response should have content')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodySchema = (response.content as any)?.['application/json']?.schema
    assert.ok(bodySchema, 'content schema should exist')
    assert.equal(bodySchema.type, 'object')
  })

  it('omits content when no response schema is provided', () => {
    class NoSchemaController {}
    Reflect.defineMetadata(
      MetadataKeys.API_RESPONSE,
      [{ status: 204, description: 'No Content' }],
      NoSchemaController,
      'delete',
    )

    const spec = buildOpenApiSpec(
      [{ method: 'DELETE', path: '/items/:id', controller: 'NoSchemaController', handler: 'delete' }],
      [NoSchemaController as unknown as new (...args: unknown[]) => unknown],
      { title: 'Test' },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (spec.paths['/items/{id}']?.['delete'] as any)?.responses?.['204']
    assert.ok(response)
    assert.equal(response.content, undefined)
  })
})
