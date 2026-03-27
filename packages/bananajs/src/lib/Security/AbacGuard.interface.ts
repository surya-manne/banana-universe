import type { Request } from 'express'

export interface AbacGuard {
  can(action: string, resource: string, req: Request): boolean | Promise<boolean>
}
