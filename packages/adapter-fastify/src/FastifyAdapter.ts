import type { FrameworkAdapter, RouteDefinition } from '@banana-universe/bananajs'
import type { RequestHandler } from 'express'

/**
 * Exploration stub for running BananaJS on Fastify.
 * This is NOT yet functional. See README.md for roadmap.
 */
export class FastifyAdapter implements FrameworkAdapter {
  addRoute(_route: RouteDefinition): void {
    throw new Error('FastifyAdapter: Not yet implemented. This is an exploration stub.')
  }

  use(_middleware: RequestHandler): void {
    throw new Error('FastifyAdapter: Not yet implemented.')
  }

  listen(_port: number, _callback?: () => void): void {
    throw new Error('FastifyAdapter: Not yet implemented.')
  }

  getInstance(): unknown {
    return undefined
  }
}
