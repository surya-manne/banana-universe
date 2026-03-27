import type { RequestHandler } from 'express'

export type HealthStatus = 'ok' | 'degraded' | 'down'

export interface HealthCheckResult {
  status: HealthStatus
  detail?: unknown
}

export interface HealthCheck {
  name: string
  check(): Promise<HealthCheckResult>
}

export interface HealthResponse {
  status: HealthStatus
  checks: Record<string, HealthCheckResult>
  timestamp: string
}

export function createHealthEndpoint(checks: HealthCheck[]): RequestHandler {
  return async (_req, res): Promise<void> => {
    const results = await Promise.allSettled(checks.map((c) => c.check()))

    const checkResults: Record<string, HealthCheckResult> = {}
    let overallStatus: HealthStatus = 'ok'

    checks.forEach((check, idx) => {
      const result = results[idx]
      if (result && result.status === 'fulfilled') {
        checkResults[check.name] = result.value
        if (result.value.status === 'down') {
          overallStatus = 'down'
        } else if (result.value.status === 'degraded' && overallStatus !== 'down') {
          overallStatus = 'degraded'
        }
      } else {
        const reason = result && result.status === 'rejected' ? result.reason : undefined
        checkResults[check.name] = {
          status: 'down',
          detail: reason instanceof Error ? reason.message : String(reason ?? 'unknown error'),
        }
        overallStatus = 'down'
      }
    })

    const response: HealthResponse = {
      status: overallStatus,
      checks: checkResults,
      timestamp: new Date().toISOString(),
    }

    const httpStatus = response.status === 'down' ? 503 : 200
    res.status(httpStatus).json(response)
  }
}
