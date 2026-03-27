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
import type { AuthGuard } from '../Auth/AuthGuard.interface.js'
import type { HealthCheck } from '../Health/health.middleware.js'
import type { BananaPlugin, AppContext } from '../Plugin/Plugin.interface.js'
import { CacheManager } from '../Cache/CacheManager.js'
import type { CacheStore } from '../Cache/CacheManager.js'
import type { CacheOptions } from '../Cache/Cache.decorator.js'
import type { CacheEvictOptions } from '../Cache/CacheEvict.decorator.js'

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
  // Phase 3 additions
  plugins?: BananaPlugin[]
  cache?: {
    store?: 'memory' | CacheStore
  }
  devTools?: boolean
  metrics?: {
    enabled: boolean
    path?: string
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
  private readonly plugins: BananaPlugin[]
  private cacheManager: CacheManager | undefined

  constructor(controllers: Constructor[], options: BananaAppOptions = {}) {
    this.controllers = controllers
    this.options = options

    const {
      middlewares = [],
      security = {},
      requestId = true,
      logger: loggerOption,
      container,
    } = options

    this.container = container
    this.logger = loggerOption === false ? undefined : loggerOption ?? new PinoLogger()
    this.plugins = options.plugins ?? []

    if (options.cache) {
      this.cacheManager = CacheManager.getInstance(
        options.cache.store === 'memory' || options.cache.store === undefined
          ? undefined
          : (options.cache.store as CacheStore),
      )
    }

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

    // [Phase 3] Metrics middleware must be mounted BEFORE routes to intercept all requests
    if (options.metrics?.enabled) {
      void this.setupMetricsMiddleware()
    }

    if (this.plugins.length === 0) {
      // No plugins — initialize synchronously as before
      this.initializeControllers(controllers, options.auth?.guard)
      this._finalizeSetup()
    } else {
      // Plugins present — BananaApp.create() will call initializePlugins()
      // which handles: plugin.register() → initializeControllers → onReady → _finalizeSetup()
      this.logger?.warn(
        'Plugins require BananaApp.create() for async lifecycle. Plugin hooks (onReady, onShutdown) will not fire when using the sync constructor.',
      )
    }
  }

  static async create(
    controllers: Constructor[],
    options: BananaAppOptions = {},
  ): Promise<BananaApp> {
    const instance = new BananaApp(controllers, options)
    if (instance.plugins.length > 0) {
      await instance.initializePlugins()
    }
    return instance
  }

  private _finalizeSetup(): void {
    const { gracefulShutdown = true, health, swagger, devTools, metrics } = this.options

    // [Phase 2] Health check endpoint — registered before error middleware
    if (health?.enabled) {
      void this.setupHealthEndpoint(health)
    }

    // [Phase 2] Swagger/OpenAPI endpoint — registered before error middleware
    if (swagger?.enabled) {
      void this.setupSwagger()
    }

    // [Phase 3] DevTools endpoint — mounts GET /_banana/routes (disabled in production)
    if (devTools === true) {
      void this.setupDevTools()
    }

    // [Phase 3] Metrics endpoint (middleware already mounted before routes in constructor/initializePlugins)
    if (metrics?.enabled) {
      void this.setupMetricsEndpoint(metrics)
    }

    this.app.use(createErrorMiddleware(this.logger))

    if (gracefulShutdown) {
      this.registerGracefulShutdown()
    }
  }

  private async initializePlugins(): Promise<void> {
    const ctx: AppContext = {
      app: this.app,
      logger: this.logger,
      container: this.container,
    }

    // [Phase 3] Metrics middleware must be mounted BEFORE routes and BEFORE plugin.register()
    if (this.options.metrics?.enabled) {
      await this.setupMetricsMiddleware()
    }

    // register phase — runs BEFORE initializeControllers so plugins can add pre-route middleware
    for (const plugin of this.plugins) {
      try {
        await plugin.register(ctx)
      } catch (err) {
        this.logger?.error(`Plugin "${plugin.name}" failed in register(): ${String(err)}`)
        throw new Error(`Plugin "${plugin.name}" failed to register: ${String(err)}`)
      }
    }

    // controllers initialized AFTER plugin register() so plugins can intercept requests
    this.initializeControllers(this.controllers, this.options.auth?.guard)

    // onReady phase — runs AFTER initializeControllers
    for (const plugin of this.plugins) {
      if (plugin.onReady) {
        try {
          await plugin.onReady(ctx)
        } catch (err) {
          this.logger?.error(`Plugin "${plugin.name}" failed in onReady(): ${String(err)}`)
          throw new Error(`Plugin "${plugin.name}" failed onReady: ${String(err)}`)
        }
      }
    }

    this._finalizeSetup()
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

  private async setupDevTools(): Promise<void> {
    const { createDevToolsEndpoint } = await import('../DevTools/devtools.middleware.js')
    this.app.get('/_banana/routes', createDevToolsEndpoint(this.routeTable))
  }

  private async setupMetricsMiddleware(): Promise<void> {
    const { createMetricsMiddleware } = await import('../Metrics/metrics.middleware.js')
    this.app.use(createMetricsMiddleware(this.logger))
  }

  private async setupMetricsEndpoint(
    metricsOptions: NonNullable<BananaAppOptions['metrics']>,
  ): Promise<void> {
    const { createMetricsEndpoint } = await import('../Metrics/metrics.middleware.js')
    const metricsPath = metricsOptions.path ?? '/metrics'
    this.app.get(metricsPath, createMetricsEndpoint(metricsPath, this.logger))
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

        // [Phase 3] Cache middleware — check cache before handler, store response after
        const cacheConfig = Reflect.getMetadata(
          MetadataKeys.CACHE,
          controllerClass,
          handlerName,
        ) as CacheOptions | undefined
        if (cacheConfig !== undefined && this.cacheManager) {
          routeMiddlewares.push(
            createCacheMiddleware(
              cacheConfig,
              this.cacheManager,
              controllerClass.name,
              String(handlerName),
              logger,
            ),
          )
        } else if (cacheConfig !== undefined && !this.cacheManager) {
          logger?.warn(
            `@Cache applied to ${controllerClass.name}.${String(
              handlerName,
            )} but no cache store configured. Pass \`cache: { store: 'memory' }\` to BananaApp.`,
          )
        }

        // [Phase 3] CacheEvict middleware — evict matching keys after successful response
        const cacheEvictConfig = Reflect.getMetadata(
          MetadataKeys.CACHE_EVICT,
          controllerClass,
          handlerName,
        ) as CacheEvictOptions | undefined
        if (cacheEvictConfig !== undefined && this.cacheManager) {
          routeMiddlewares.push(
            createCacheEvictMiddleware(cacheEvictConfig, this.cacheManager, logger),
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
    const handleShutdown = async (signal: string): Promise<void> => {
      this.logger?.info(`Received ${signal}. Shutting down gracefully.`)
      const reversed = [...this.plugins].reverse()
      for (const plugin of reversed) {
        if (plugin.onShutdown) {
          try {
            await plugin.onShutdown()
          } catch (err) {
            this.logger?.warn(`Plugin "${plugin.name}" onShutdown error: ${String(err)}`)
          }
        }
      }
      process.exit(0)
    }
    process.on('SIGTERM', () => {
      void handleShutdown('SIGTERM')
    })
    process.on('SIGINT', () => {
      void handleShutdown('SIGINT')
    })
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

function createCacheMiddleware(
  config: CacheOptions,
  cacheManager: CacheManager,
  controllerName: string,
  handlerName: string,
  logger?: Logger,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = deriveCacheKey(config.key, req, controllerName, handlerName)
    try {
      const cached = await cacheManager.get(key)
      if (cached !== undefined) {
        res.json(cached)
        return
      }
      // Monkey-patch res.json to capture response and store in cache
      const originalJson = res.json.bind(res)
      res.json = (body: unknown): Response => {
        cacheManager.set(key, body, config.ttl ?? 60).catch((err: unknown) => {
          logger?.warn(`Cache set error for key "${key}": ${String(err)}`)
        })
        return originalJson(body)
      }
    } catch (err) {
      logger?.warn(`Cache get error for key "${key}": ${String(err)}`)
    }
    return next()
  }
}

function createCacheEvictMiddleware(
  config: CacheEvictOptions,
  cacheManager: CacheManager,
  logger?: Logger,
): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        cacheManager.evict(config.pattern).catch((err: unknown) => {
          logger?.warn(`CacheEvict error for pattern "${config.pattern}": ${String(err)}`)
        })
      }
    })
    next()
  }
}

function deriveCacheKey(
  keyOption: CacheOptions['key'],
  req: Request,
  controllerName: string,
  handlerName: string,
): string {
  if (typeof keyOption === 'string') return keyOption
  if (typeof keyOption === 'function') return keyOption(req)
  const sortedQuery = Object.fromEntries(
    Object.entries(req.query as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
  )
  return `${controllerName}:${handlerName}:${JSON.stringify(req.params)}:${JSON.stringify(
    sortedQuery,
  )}`
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
