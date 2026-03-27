import 'reflect-metadata'
import type { NextFunction, Request, Response } from 'express'

// Structural interface matching Zod's safeParse API — avoids a runtime dep on zod itself.
// Plugin consumers provide actual Zod schemas; this plugin only calls .safeParse().
interface ZodSchemaLike {
  safeParse(
    data: unknown,
  ):
    | { success: true; data: unknown }
    | { success: false; error: { issues: Array<{ message: string }> } }
}

interface BananaPlugin {
  name: string
  register(ctx: unknown): void | Promise<void>
  onReady?(ctx: unknown): void | Promise<void>
  onShutdown?(): void | Promise<void>
}

export function ZodPlugin(): BananaPlugin {
  return {
    name: 'ZodPlugin',
    async register(): Promise<void> {
      // Validate that zod is available — fail fast at startup, not at first request
      try {
        await import('zod')
      } catch {
        throw new Error('ZodPlugin requires "zod" to be installed. Run: npm install zod')
      }
    },
  }
}

function createZodValidator(
  schema: ZodSchemaLike,
  source: 'body' | 'query' | 'params',
): MethodDecorator {
  return (_target, _propertyKey, descriptor): void => {
    const originalMethod = descriptor.value as ((...args: unknown[]) => unknown) | undefined
    if (typeof originalMethod !== 'function') return
    ;(descriptor as { value: unknown }).value = async function (
      this: unknown,
      req: Request,
      _res: Response,
      next: NextFunction,
    ): Promise<unknown> {
      const data = req[source]
      const result = schema.safeParse(data)

      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(', ')
        try {
          const { BadRequestError } = await import('@banana-universe/bananajs')
          return next(new BadRequestError(messages))
        } catch {
          const err = new Error(messages) as Error & { status?: number }
          err.status = 400
          return next(err)
        }
      }

      ;(req as unknown as Record<string, unknown>)[source] = result.data
      return originalMethod.call(this, req, _res, next)
    }
  }
}

export function ZodBody(schema: ZodSchemaLike): MethodDecorator {
  return createZodValidator(schema, 'body')
}

export function ZodQuery(schema: ZodSchemaLike): MethodDecorator {
  return createZodValidator(schema, 'query')
}

export function ZodParams(schema: ZodSchemaLike): MethodDecorator {
  return createZodValidator(schema, 'params')
}
