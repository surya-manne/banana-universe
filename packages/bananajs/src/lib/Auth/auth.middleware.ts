import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { UnauthorisedError, ForbiddenError } from '../Response/ApiError'
import { RequestContext } from '../Context/RequestContext'
import { MetadataKeys } from '../Router/MetaData.constants'
import type { AuthGuard, RolesGuard } from './AuthGuard.interface'
import type { Constructor } from '../Core/App'

export function createAuthMiddleware(
  guard: AuthGuard,
  controllerClass: Constructor,
  handlerName: string | symbol,
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const canActivate = await guard.canActivate(req)
      if (!canActivate) {
        return next(new UnauthorisedError())
      }

      const roles = Reflect.getMetadata(MetadataKeys.ROLES, controllerClass, handlerName) as
        | string[]
        | undefined
      if (roles && roles.length > 0) {
        if (!('extractRoles' in guard)) {
          return next(new ForbiddenError())
        }
        const userRoles = await (guard as unknown as RolesGuard).extractRoles(req)
        const hasRole = roles.some((r) => userRoles.includes(r))
        if (!hasRole) {
          return next(new ForbiddenError())
        }
      }

      const user = (req as unknown as Record<string, unknown>)['user']
      if (user !== undefined) {
        RequestContext.set('user', user)
      }

      return next()
    } catch (err) {
      return next(err)
    }
  }
}
