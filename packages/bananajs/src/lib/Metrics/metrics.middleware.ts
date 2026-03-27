import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { Logger } from '../Logger/Logger.interface.js'

export function createMetricsMiddleware(logger?: Logger): RequestHandler {
  let requestsCounter: { inc(labels: Record<string, string>): void } | undefined
  let durationHistogram:
    | { observe(labels: Record<string, string>, value: number): void }
    | undefined
  let errorsCounter: { inc(labels: Record<string, string>): void } | undefined
  let initialized = false

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!initialized) {
      initialized = true
      try {
        const client = await import('prom-client')

        requestsCounter = new client.Counter({
          name: 'http_requests_total',
          help: 'Total number of HTTP requests',
          labelNames: ['method', 'route', 'status'],
        })
        durationHistogram = new client.Histogram({
          name: 'http_request_duration_ms',
          help: 'HTTP request duration in milliseconds',
          labelNames: ['method', 'route', 'status'],
          buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
        })
        errorsCounter = new client.Counter({
          name: 'http_errors_total',
          help: 'Total number of HTTP errors (4xx/5xx)',
          labelNames: ['method', 'route', 'status'],
        })
      } catch {
        logger?.warn(
          'prom-client is not installed. Metrics collection disabled. Install prom-client to enable.',
        )
      }
    }

    if (!requestsCounter || !durationHistogram || !errorsCounter) {
      return next()
    }

    const start = Date.now()
    const method = req.method

    res.on('finish', () => {
      const route = req.route?.path ?? req.path ?? 'unknown'
      const status = String(res.statusCode)
      const duration = Date.now() - start

      requestsCounter?.inc({ method, route, status })
      durationHistogram?.observe({ method, route, status }, duration)

      if (res.statusCode >= 400) {
        errorsCounter?.inc({ method, route, status })
      }
    })

    return next()
  }
}

export function createMetricsEndpoint(path = '/metrics', logger?: Logger): RequestHandler {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const client = await import('prom-client')
      const metrics = await client.register.metrics()
      res.set('Content-Type', client.register.contentType)
      res.send(metrics)
    } catch {
      logger?.warn(`Metrics endpoint at ${path}: prom-client not available`)
      return next()
    }
  }
}
