import type { Request } from 'express'

export interface AuthGuard {
  canActivate(req: Request): boolean | Promise<boolean>
}

export interface RolesGuard {
  extractRoles(req: Request): string[] | Promise<string[]>
}
