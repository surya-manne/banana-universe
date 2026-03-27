import 'reflect-metadata'
import express, {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express'
import helmet from 'helmet'
import cors from 'cors'
import type { CorsOptions } from 'cors'
import type { AwilixContainer } from 'awilix'
import { IRouter } from '../Router/Route.decorator'
import { MetadataKeys } from '../Router/MetaData.constants'
import { createErrorMiddleware } from '../../Middleware/Error.middleware'
import type { Logger } from '../Logger/Logger.interface'
import { PinoLogger } from '../Logger/PinoLogger'
import { requestContextMiddleware } from '../Context/RequestContext'
import type { AuthGuard } from '../Auth/AuthGuard.interface'
import type { HealthCheck } from '../Health/health.middleware'

export type Constructor<T = unknown> = new (...args: unknown[]) => T

export interface BananaAppOptions {
  middlewares?: RequestHandler[]
  security?: {
    helmet?: boolean | Parameters<typeof helmet>[0]
    cors?: CorsOptions | false
  }
  requestId?: boolean
  logger?: Logger | false
  container?: AwilixContainer
  gracefulShutdown?: boolean
  // Phase 2 additions
  auth?: {
    guard: AuthGuard
  }
  swagger?: {
    enabled: boolean
    path?: string
    title?: string
    version?: string
    description?: string
  }
  rateLimit?:
    | {
        windowMs?: number
        max?: number
        message?: string
      }
    | false
  health?: {
    enabled: boolean
    path?: string
    checks?: HealthCheck[]
  }
}

export interface RouteInfo {
  method: string
  path: string
  controller: string
  handler: string
}

export class BananaApp {
  private readonly app: Application
  private readonly logger: Logger | undefined
  private readonly routeTable: RouteInfo[] = []
  private readonly container: AwilixContainer | undefined
  private readonly controllers: Constructor[]
  private readonly options: BananaAppOptions

  constructor(controllers: Constructor[], options: BananaAppOptions = {}) {
    this.controllers = controllers
    this.options = options

    const {
      middlewares = [],
      security = {},
      requestId = true,
      logger: loggerOption,
      container,
      gracefulShutdown = true,
      auth,
      health,
    } = options

    this.container = container
    this.logger = loggerOption === false ? undefined : loggerOption ?? new PinoLogger()

    this.app = express()
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    if (security.helmet !== false) {
      const helmetOptions = typeof security.helmet === 'object' ? security.helmet : undefined
      this.app.use(helmet(helmetOptions))
    }

    if (security.cors !== false) {
      this.app.use(cors(security.cors as CorsOptions | undefined))
    }

    if (requestId !== false) {
      this.app.use(requestContextMiddleware)
    }

    middlewares.forEach((mw) => this.app.use(mw))
    this.initializeControllers(controllers, auth?.guard)

    // [Phase 2] Health check endpoint — registered before error middleware
    if (health?.enabled) {
      void this.setupHealthEndpoint(health)
    }

    // [Phase 2] Swagger/OpenAPI endpoint — registered before error middleware
    if (options.swagger?.enabled) {
      void this.setupSwagger()
    }

    this.app.use(createErrorMiddleware(this.logger))

    if (gracefulShutdown) {
      this.registerGracefulShutdown()
    }
  }

  private async setupHealthEndpoint(
    health: NonNullable<BananaAppOptions['health']>,
  ): Promise<void> {
    const { createHealthEndpoint } = await import('../Health/health.middleware.js')
    const path = health.path ?? '/health'
    this.app.get(path, createHealthEndpoint(health.checks ?? []))
  }

  private async setupSwagger(): Promise<void> {
    const swaggerOpts = this.options.swagger
    if (!swaggerOpts) return
    const { buildOpenApiSpec, setupSwagger } = await import('../OpenAPI/swagger.setup.js')
    const spec = buildOpenApiSpec(this.routeTable, this.controllers, swaggerOpts, this.options.auth)
    await setupSwagger(this.app, spec, swaggerOpts, this.logger)
  }

  static async create(
    controllers: Constructor[],
    options: BananaAppOptions = {},
  ): Promise<BananaApp> {
    return new BananaApp(controllers, options)
  }

  private resolveController(controllerClass: Constructor): Record<string, unknown> {
    if (this.container) {
      const name = controllerClass.name.charAt(0).toLowerCase() + controllerClass.name.slice(1)
      return this.container.resolve<Record<string, unknown>>(name)
    }
    return new controllerClass() as Record<string, unknown>
  }

  private initializeControllers(controllers: Constructor[], authGuard?: AuthGuard): void {
    const { auth, rateLimit: globalRateLimit } = this.options
    const logger = this.logger

    controllers.forEach((controllerClass) => {
      const controllerInstance = this.resolveController(controllerClass)
      const basePath: string = Reflect.getMetadata(
        MetadataKeys.BASE_PATH,
        controllerClass,
      ) as string
      const routers: IRouter[] =
        (Reflect.getMetadata(MetadataKeys.ROUTERS, controllerClass) as IRouter[]) ?? []
      const router = Router()

      const isAuthClass = Reflect.getMetadata(MetadataKeys.AUTH, controllerClass) as
        | boolean
        | undefined

      routers.forEach(({ method, path, handlerName, middlewares = [] }) => {
        this.routeTable.push({
          method: method.toUpperCase(),
          path: `${basePath}${path}`,
          controller: controllerClass.name,
          handler: String(handlerName),
        })

        const routeMiddlewares: RequestHandler[] = []

        // [Phase 2] Auth middleware — injected before other middlewares/handler
        const isAuthMethod = Reflect.getMetadata(
          MetadataKeys.AUTH,
          controllerClass,
          handlerName,
        ) as boolean | undefined
        const isPublic = Reflect.getMetadata(MetadataKeys.PUBLIC, controllerClass, handlerName) as
          | boolean
          | undefined
        if ((isAuthClass || isAuthMethod) && !isPublic) {
          if (authGuard) {
            routeMiddlewares.push(createAuthMiddlewareLazy(authGuard, controllerClass, handlerName))
          } else if (auth) {
            logger?.warn(
              `@Auth applied to ${controllerClass.name}.${String(
                handlerName,
              )} but no auth.guard provided in BananaAppOptions`,
            )
          }
        }

        // [Phase 2] Rate limit middleware — lazy wrapper, loads express-rate-limit on first request
        const routeRateLimit = Reflect.getMetadata(
          MetadataKeys.RATE_LIMIT,
          controllerClass,
          handlerName,
        ) as { windowMs?: number; max?: number; message?: string } | undefined
        const classRateLimit = Reflect.getMetadata(MetadataKeys.RATE_LIMIT, controllerClass) as
          | { windowMs?: number; max?: number; message?: string }
          | undefined
        const rateLimitConfig = routeRateLimit ?? classRateLimit
        if (rateLimitConfig && globalRateLimit !== false) {
          const merged = {
            windowMs: 60_000,
            max: 100,
            ...(typeof globalRateLimit === 'object' ? globalRateLimit : {}),
            ...rateLimitConfig,
          }
          routeMiddlewares.push(createLazyRateLimitMiddleware(merged, logger))
        }

        // [Phase 2] Upload middleware — lazy wrapper, loads multer on first request
        const uploadConfig = Reflect.getMetadata(
          MetadataKeys.UPLOAD,
          controllerClass,
          handlerName,
        ) as { fieldName: string; maxSize?: number; allowedMimeTypes?: string[] } | undefined
        if (uploadConfig) {
          routeMiddlewares.push(
            createLazyUploadMiddleware(uploadConfig, controllerClass.name, String(handlerName)),
          )
        }

        router[method](
          path,
          [...routeMiddlewares, ...(middlewares as RequestHandler[])],
          async (req: Request, res: Response, next: NextFunction) => {
            try {
              const handler = controllerInstance[String(handlerName)] as (
                req: Request,
                res: Response,
                next: NextFunction,
              ) => Promise<unknown>
              return await handler.call(controllerInstance, req, res, next)
            } catch (error) {
              return next(error)
            }
          },
        )
      })

      this.app.use(basePath, router)
    })
  }

  public getInstance(): Application {
    return this.app
  }

  public getRouteTable(): RouteInfo[] {
    return [...this.routeTable]
  }

  private registerGracefulShutdown(): void {
    const handleShutdown = (signal: string): void => {
      this.logger?.info(`Received ${signal}. Shutting down gracefully.`)
      process.exit(0)
    }
    process.on('SIGTERM', () => handleShutdown('SIGTERM'))
    process.on('SIGINT', () => handleShutdown('SIGINT'))
  }
}

// ─── Module-level lazy middleware helpers ────────────────────────────────────

function createAuthMiddlewareLazy(
  guard: AuthGuard,
  controllerClass: Constructor,
  handlerName: string | symbol,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { createAuthMiddleware } = await import('../Auth/auth.middleware.js')
      const mw = createAuthMiddleware(guard, controllerClass, handlerName)
      return mw(req, res, next)
    } catch (err) {
      return next(err)
    }
  }
}

function createLazyRateLimitMiddleware(
  config: { windowMs: number; max: number; message?: string },
  logger?: Logger,
): RequestHandler {
  let cachedMiddleware: RequestHandler | undefined
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!cachedMiddleware) {
      try {
        const { default: rateLimit } = await import('express-rate-limit')
        cachedMiddleware = rateLimit({
          windowMs: config.windowMs,
          max: config.max,
          message: config.message ?? 'Too Many Requests',
        }) as unknown as RequestHandler
      } catch {
        logger?.warn('express-rate-limit is not installed. @RateLimit decorator has no effect.')
        cachedMiddleware = (_r: Request, _s: Response, n: NextFunction): void => n()
      }
    }
    return cachedMiddleware(req, res, next)
  }
}

function createLazyUploadMiddleware(
  config: { fieldName: string; maxSize?: number; allowedMimeTypes?: string[] },
  controllerName: string,
  handlerName: string,
): RequestHandler {
  let cachedMiddleware: RequestHandler | undefined
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!cachedMiddleware) {
      try {
        const { createUploadMiddleware } = await import('../../Middleware/FileUpload.middleware.js')
        cachedMiddleware = await createUploadMiddleware(config.fieldName, config)
      } catch {
        throw new Error(
          `multer is required for @Upload on ${controllerName}.${handlerName}. Install multer as a dependency.`,
        )
      }
    }
    return cachedMiddleware(req, res, next)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function BananaRouter(
  controllers: Constructor[],
  container?: AwilixContainer,
): ReturnType<typeof Router> {
  const router = Router()

  controllers.forEach((controllerClass) => {
    const controllerInstance: Record<string, unknown> = container
      ? container.resolve<Record<string, unknown>>(
          controllerClass.name.charAt(0).toLowerCase() + controllerClass.name.slice(1),
        )
      : (new controllerClass() as Record<string, unknown>)

    const basePath: string = Reflect.getMetadata(MetadataKeys.BASE_PATH, controllerClass) as string
    const routers: IRouter[] =
      (Reflect.getMetadata(MetadataKeys.ROUTERS, controllerClass) as IRouter[]) ?? []
    const subrouter = Router()

    routers.forEach(({ method, path, handlerName, middlewares = [] }) => {
      subrouter[method](
        path,
        middlewares as RequestHandler[],
        async (req: Request, res: Response, next: NextFunction) => {
          try {
            const handler = controllerInstance[String(handlerName)] as (
              req: Request,
              res: Response,
              next: NextFunction,
            ) => Promise<unknown>
            return await handler.call(controllerInstance, req, res, next)
          } catch (error) {
            return next(error)
          }
        },
      )
    })

    router.use(basePath, subrouter)
  })

  return router
}
