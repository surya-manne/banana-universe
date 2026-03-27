import type { Request } from 'express'
import type { AuthGuard } from '@banana-universe/bananajs'

export class BearerAuthGuard implements AuthGuard {
  canActivate(req: Request): boolean {
    const h = req.headers.authorization
    return typeof h === 'string' && h.startsWith('Bearer ') && h.length > 7
  }
}
