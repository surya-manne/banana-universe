import type { Request, Response, RequestHandler } from 'express'
import type { RouteInfo } from '../Core/App.js'

export function createDevToolsEndpoint(routeTable: RouteInfo[]): RequestHandler {
  return (_req: Request, res: Response): void => {
    if (process.env['NODE_ENV'] === 'production') {
      res.status(404).json({ message: 'Not Found' })
      return
    }
    res.json({
      routes: routeTable,
      count: routeTable.length,
      timestamp: new Date().toISOString(),
    })
  }
}
