import { AsyncLocalStorage } from 'async_hooks'
import type { Request, Response, NextFunction } from 'express'
import type { RequestHandler } from 'express'

interface TenantStore {
  tenantId: string
}

export interface TenantOptions {
  header?: string // default: 'x-tenant-id'
  jwtClaim?: string // default: 'tid'
}

const tenantStorage = new AsyncLocalStorage<TenantStore>()

export function getTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return tenantStorage.run({ tenantId }, fn)
}

export function createTenantMiddleware(options?: TenantOptions): RequestHandler {
  const headerName = options?.header ?? 'x-tenant-id'
  const jwtClaim = options?.jwtClaim ?? 'tid'

  return (req: Request, _res: Response, next: NextFunction): void => {
    // Try header first
    const headerValue = req.headers[headerName]
    if (typeof headerValue === 'string' && headerValue.length > 0) {
      tenantStorage.run({ tenantId: headerValue }, () => next())
      return
    }

    // Try JWT 'tid' claim (decode without verify)
    const authHeader = req.headers['authorization']
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const tenantId = extractJwtClaim(token, jwtClaim)
      if (tenantId) {
        tenantStorage.run({ tenantId }, () => next())
        return
      }
    }

    // No tenant found — proceed without tenant context
    next()
  }
}

function extractJwtClaim(token: string, claim: string): string | undefined {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return undefined
    // Add padding if needed for base64 decode
    const payload = parts[1]
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const decoded = JSON.parse(Buffer.from(padded, 'base64url').toString('utf-8')) as Record<
      string,
      unknown
    >
    const value = decoded[claim]
    return typeof value === 'string' ? value : undefined
  } catch {
    return undefined
  }
}
