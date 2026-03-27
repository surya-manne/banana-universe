import type { RequestHandler } from 'express'

export interface RouteDefinition {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  handlers: RequestHandler[]
}

/**
 * Abstract adapter interface for framework independence.
 * Implement this to swap Express for another HTTP framework (e.g., Fastify).
 * Currently in exploration phase — only Express is fully supported.
 */
export interface FrameworkAdapter {
  addRoute(route: RouteDefinition): void
  use(middleware: RequestHandler): void
  listen(port: number, callback?: () => void): void
  getInstance(): unknown
}
