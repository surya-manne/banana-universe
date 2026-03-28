import type { Request } from 'express'
import type { AbacGuard } from '@banana-universe/bananajs'

/** Demo ABAC: allow `delete` on `note` only when `x-role: admin` header is set. */
export class DemoAbacGuard implements AbacGuard {
  can(action: string, resource: string, req: Request): boolean {
    const role = req.headers['x-role']
    if (action === 'delete' && resource === 'note') {
      return role === 'admin'
    }
    return true
  }
}
