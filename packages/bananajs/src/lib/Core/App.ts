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
import { container as tsyringeRoot, type DependencyContainer } from 'tsyringe'
import { IRouter } from '../Router/Route.decorator'
import { MetadataKeys } from '../Router/MetaData.constants'
import { joinRouteSegments } from '../Router/route-path.js'
import { createErrorMiddleware } from '../../Middleware/Error.middleware'
import type { Logger } from '../Logger/Logger.interface'
import { PinoLogger } from '../Logger/PinoLogger'
import { requestContextMiddleware } from '../Context/RequestContext'
import type { AuthGuard } from '../Auth/AuthGuard.interface.js'
import type { HealthCheck } from '../Health/health.middleware.js'
import type { BananaPlugin, AppContext } from '../Plugin/Plugin.interface.js'
import type { BananaModuleDescriptor } from '../DI/BananaModule.js'
import { registerBananaProvider, registerBananaProviders } from '../DI/registerProviders.js'
import type { BananaProviderRegistration } from '../DI/registerProviders.js'
import { CacheManager } from '../Cache/CacheManager.js'
import type { CacheStore } from '../Cache/CacheManager.js'
import type { CacheOptions } from '../Cache/Cache.decorator.js'
import type { CacheEvictOptions } from '../Cache/CacheEvict.decorator.js'
import type { AbacGuard } from '../Security/AbacGuard.interface.js'
import type { TenantOptions } from '../Tenant/TenantContext.js'
import { createTenantMiddleware, getTenantId } from '../Tenant/TenantContext.js'

/**
 * Controller / injectable class constructor.
 * Rest args are intentionally unconstrained so DI-backed classes (typed constructors) assign without casts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- framework constructor slot (see JSDoc above)
export type Constructor<T = unknown> = new (...args: any[]) => T

/** Bootstrap: either legacy `controllers` or modular `modules` (not both). */
export type BananaAppCreateInput =
  | (BananaAppOptions & { controllers: Constructor[]; modules?: undefined })
  | (BananaAppOptions & { modules: BananaModuleDescriptor[]; controllers?: undefined })

export interface BananaAppOptions {
  middlewares?: RequestHandler[]
  security?: {
    helmet?: boolean | Parameters<typeof helmet>[0]
    cors?: CorsOptions | false
  }
  requestId?: boolean
  logger?: Logger | false
  /** Root tsyringe container; optional — created when using `modules` without an explicit container. */
  container?: DependencyContainer
  /**
   * Prepended to every controller base path (e.g. `v1` → `/v1/...`). Use URI versioning per enterprise DX docs.
   */
  apiPrefix?: string
  /**
   * Applied to the root container after plugin/module setup — for tests (e.g. swap a repository port for a fake).
   */
  testOverrides?: BananaProviderRegistration[]
  gracefulShutdown?: boolean
  // Phase 2 additions
  auth?: {
    guard: AuthGuard
  }
  swagger?: {
    /** Defaults to `true` — omit or set to `false` to disable. */
    enabled?: boolean
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
  // Phase 4 additions
  abac?: {
    guard: AbacGuard
  }
  tenant?: TenantOptions
  lazyControllers?: boolean
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
  /** Root DI container (plugins); undefined if no DI. */
  private readonly container: DependencyContainer | undefined
  /** When using `modules`, per-controller child containers (tsyringe). */
  private readonly moduleContainers: Map<Constructor, DependencyContainer> | undefined
  private readonly controllers: Constructor[]
  private readonly options: BananaAppOptions
  private readonly plugins: BananaPlugin[]
  private cacheManager: CacheManager | undefined

  constructor(input: BananaAppCreateInput) {
    const {
      middlewares = [],
      security = {},
      requestId = true,
      logger: loggerOption,
      container,
    } = input

    if (input.modules !== undefined) {
      const sorted = [...input.modules].sort((a, b) => a.id.localeCompare(b.id))
      this.controllers = sorted.map((m) => m.controller)
      const root = container ?? tsyringeRoot.createChildContainer()
      this.container = root
      this.moduleContainers = new Map()
      for (const mod of sorted) {
        const child = root.createChildContainer()
        for (const p of mod.providers ?? []) {
          registerBananaProvider(child, p)
        }
        registerBananaProvider(child, mod.controller)
        this.moduleContainers.set(mod.controller, child)
      }
    } else {
      this.controllers = input.controllers
      this.container = container
      this.moduleContainers = undefined
    }

    const {
      modules: _m,
      controllers: _ctl,
      ...restOpts
    } = input as BananaAppCreateInput & {
      controllers?: Constructor[]
      modules?: BananaModuleDescriptor[]
    }
    this.options = restOpts as BananaAppOptions

    if (input.testOverrides?.length && this.container) {
      registerBananaProviders(this.container, input.testOverrides)
    }
    this.logger = loggerOption === false ? undefined : loggerOption ?? new PinoLogger()
    this.plugins = this.options.plugins ?? []

    if (this.options.cache) {
      this.cacheManager = CacheManager.getInstance(
        this.options.cache.store === 'memory' || this.options.cache.store === undefined
          ? undefined
          : (this.options.cache.store as CacheStore),
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
    if (this.options.metrics?.enabled) {
      void this.setupMetricsMiddleware()
    }

    if (this.plugins.length === 0) {
      // No plugins — initialize synchronously as before
      this.initializeControllers(this.controllers, this.options.auth?.guard)
      this._finalizeSetup()
    } else {
      // Plugins present — BananaApp.create() will call initializePlugins()
      // which handles: plugin.register() → initializeControllers → onReady → _finalizeSetup()
      this.logger?.warn(
        'Plugins require BananaApp.create() for async lifecycle. Plugin hooks (onReady, onShutdown) will not fire when using the sync constructor.',
      )
    }
  }

  static async create(input: BananaAppCreateInput): Promise<BananaApp> {
    const instance = new BananaApp(input)
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
    if (swagger != null && swagger.enabled !== false) {
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
      controllerClasses: this.controllers,
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
    const scope = this.moduleContainers?.get(controllerClass) ?? this.container
    if (scope) {
      if (scope.isRegistered(controllerClass)) {
        return scope.resolve(controllerClass) as Record<string, unknown>
      }
      const name = controllerClass.name.charAt(0).toLowerCase() + controllerClass.name.slice(1)
      if (scope.isRegistered(name)) {
        return scope.resolve(name) as Record<string, unknown>
      }
      throw new Error(
        `BananaApp: cannot resolve "${controllerClass.name}" — register it on the tsyringe container (createModule providers, providers in defineBananaAppOptions, or container.register).`,
      )
    }
    return new controllerClass() as Record<string, unknown>
  }

  private initializeControllers(controllers: Constructor[], authGuard?: AuthGuard): void {
    const {
      auth,
      rateLimit: globalRateLimit,
      abac,
      tenant: globalTenant,
      lazyControllers,
    } = this.options
    const logger = this.logger
    // Lazy controller instance cache (only used when lazyControllers: true)
    const lazyInstanceMap = new Map<string, Record<string, unknown>>()

    controllers.forEach((controllerClass) => {
      // Eager instance (default) or lazy resolver
      const eagerInstance = lazyControllers ? null : this.resolveController(controllerClass)

      const baseToken: string = Reflect.getMetadata(
        MetadataKeys.BASE_PATH,
        controllerClass,
      ) as string
      const apiPx = this.options.apiPrefix
      const mountPath = apiPx ? joinRouteSegments(apiPx, baseToken) : joinRouteSegments(baseToken)
      const routers: IRouter[] =
        (Reflect.getMetadata(MetadataKeys.ROUTERS, controllerClass) as IRouter[]) ?? []
      const router = Router()

      // [Phase 4] Route tree caching — read all class-level metadata once per controller
      const isAuthClass = Reflect.getMetadata(MetadataKeys.AUTH, controllerClass) as
        | boolean
        | undefined
      const classTenant = Reflect.getMetadata(MetadataKeys.TENANT, controllerClass) as
        | TenantOptions
        | undefined
      const classRateLimit = Reflect.getMetadata(MetadataKeys.RATE_LIMIT, controllerClass) as
        | { windowMs?: number; max?: number; message?: string }
        | undefined
      const classThrottle = Reflect.getMetadata(MetadataKeys.THROTTLE, controllerClass) as
        | import('../Security/Throttle.decorator.js').ThrottleOptions
        | undefined

      routers.forEach(({ method, path: pathToken, handlerName, middlewares = [] }) => {
        const expressPath = joinRouteSegments(pathToken)
        const fullPath = apiPx
          ? joinRouteSegments(apiPx, baseToken, pathToken)
          : joinRouteSegments(baseToken, pathToken)
        this.routeTable.push({
          method: method.toUpperCase(),
          path: fullPath,
          controller: controllerClass.name,
          handler: String(handlerName),
        })

        // [Phase 4] Route tree caching — read all method-level metadata once per route
        const isAuthMethod = Reflect.getMetadata(
          MetadataKeys.AUTH,
          controllerClass,
          handlerName,
        ) as boolean | undefined
        const isPublic = Reflect.getMetadata(MetadataKeys.PUBLIC, controllerClass, handlerName) as
          | boolean
          | undefined
        const routeRateLimit = Reflect.getMetadata(
          MetadataKeys.RATE_LIMIT,
          controllerClass,
          handlerName,
        ) as { windowMs?: number; max?: number; message?: string } | undefined
        const routeThrottle = Reflect.getMetadata(
          MetadataKeys.THROTTLE,
          controllerClass,
          handlerName,
        ) as import('../Security/Throttle.decorator.js').ThrottleOptions | undefined
        const uploadConfig = Reflect.getMetadata(
          MetadataKeys.UPLOAD,
          controllerClass,
          handlerName,
        ) as { fieldName: string; maxSize?: number; allowedMimeTypes?: string[] } | undefined
        const cacheConfig = Reflect.getMetadata(
          MetadataKeys.CACHE,
          controllerClass,
          handlerName,
        ) as CacheOptions | undefined
        const cacheEvictConfig = Reflect.getMetadata(
          MetadataKeys.CACHE_EVICT,
          controllerClass,
          handlerName,
        ) as CacheEvictOptions | undefined
        const canConfig = Reflect.getMetadata(MetadataKeys.CAN, controllerClass, handlerName) as
          | { action: string; resource: string }
          | undefined
        const routeTenant = Reflect.getMetadata(
          MetadataKeys.TENANT,
          controllerClass,
          handlerName,
        ) as TenantOptions | undefined

        const routeMiddlewares: RequestHandler[] = []

        // [Phase 4] Tenant middleware — injected first so tenantId is available to all downstream middleware
        const tenantConfig = routeTenant ?? classTenant ?? (globalTenant ? globalTenant : undefined)
        if (tenantConfig !== undefined) {
          routeMiddlewares.push(createTenantMiddleware(tenantConfig))
        }

        // [Phase 2] Auth middleware — injected before other middlewares/handler
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

        // [Phase 4] ABAC middleware — runs after auth (user is authenticated)
        if (canConfig !== undefined) {
          if (abac?.guard) {
            routeMiddlewares.push(createAbacMiddleware(canConfig, abac.guard, logger))
          } else {
            logger?.warn(
              `@Can applied to ${controllerClass.name}.${String(
                handlerName,
              )} but no abac.guard provided in BananaAppOptions`,
            )
          }
        }

        // [Phase 4] Throttle middleware — per-user or per-IP rate limiting
        const throttleConfig = routeThrottle ?? classThrottle
        if (throttleConfig) {
          routeMiddlewares.push(createLazyThrottleMiddleware(throttleConfig, logger))
        }

        // [Phase 2] Rate limit middleware — lazy wrapper, loads express-rate-limit on first request
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
        if (uploadConfig) {
          routeMiddlewares.push(
            createLazyUploadMiddleware(uploadConfig, controllerClass.name, String(handlerName)),
          )
        }

        // [Phase 3] Cache middleware — check cache before handler, store response after
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
        if (cacheEvictConfig !== undefined && this.cacheManager) {
          routeMiddlewares.push(
            createCacheEvictMiddleware(cacheEvictConfig, this.cacheManager, logger),
          )
        }

        router[method](
          expressPath,
          [...routeMiddlewares, ...(middlewares as RequestHandler[])],
          async (req: Request, res: Response, next: NextFunction) => {
            try {
              // [Phase 4] Lazy controller loading — instantiate on first request to this controller
              let instance: Record<string, unknown>
              if (lazyControllers) {
                const cached = lazyInstanceMap.get(controllerClass.name)
                if (cached) {
                  instance = cached
                } else {
                  instance = this.resolveController(controllerClass)
                  lazyInstanceMap.set(controllerClass.name, instance)
                }
              } else {
                instance = eagerInstance as Record<string, unknown>
              }
              const handler = instance[String(handlerName)] as (
                req: Request,
                res: Response,
                next: NextFunction,
              ) => Promise<unknown>
              return await handler.call(instance, req, res, next)
            } catch (error) {
              return next(error)
            }
          },
        )
      })

      this.app.use(mountPath, router)
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

/** Options for {@link createBananaApplication} — extends {@link BananaAppOptions} with optional listen helpers. */
export interface CreateBananaApplicationOptions extends BananaAppOptions {
  /** When set, calls `Application.listen` after the app is created. */
  port?: number
  hostname?: string
  onListening?: (info: { port: number; hostname?: string }) => void
}

export type CreateBananaApplicationInput =
  | (CreateBananaApplicationOptions & { controllers: Constructor[]; modules?: undefined })
  | (CreateBananaApplicationOptions & {
      modules: BananaModuleDescriptor[]
      controllers?: undefined
    })

/**
 * Async factory: `BananaApp.create` plus optional `listen` in one call for declarative bootstrap.
 */
export async function createBananaApplication(
  options: CreateBananaApplicationInput,
): Promise<BananaApp> {
  const { port, hostname, onListening, ...rest } = options
  const banana = await BananaApp.create(rest)
  if (port !== undefined) {
    const inst = banana.getInstance()
    if (hostname !== undefined) {
      inst.listen(port, hostname, () => {
        onListening?.({ port, hostname })
      })
    } else {
      inst.listen(port, () => {
        onListening?.({ port })
      })
    }
  }
  return banana
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
  const tid = getTenantId()
  const tenantPrefix = tid ? `tenant:${tid}:` : ''
  if (typeof keyOption === 'string') return `${tenantPrefix}${keyOption}`
  if (typeof keyOption === 'function') return `${tenantPrefix}${keyOption(req)}`
  const sortedQuery = Object.fromEntries(
    Object.entries(req.query as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
  )
  return `${tenantPrefix}${controllerName}:${handlerName}:${JSON.stringify(
    req.params,
  )}:${JSON.stringify(sortedQuery)}`
}

function createAbacMiddleware(
  canConfig: { action: string; resource: string },
  guard: AbacGuard,
  logger?: Logger,
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const allowed = await guard.can(canConfig.action, canConfig.resource, req)
      if (!allowed) {
        const { ForbiddenError } = await import('../Response/ApiError.js')
        return next(new ForbiddenError('Access denied'))
      }
      return next()
    } catch (err) {
      logger?.warn(`ABAC check error: ${String(err)}`)
      return next(err)
    }
  }
}

function createLazyThrottleMiddleware(
  config: import('../Security/Throttle.decorator.js').ThrottleOptions,
  logger?: Logger,
): RequestHandler {
  let cachedMiddleware: RequestHandler | undefined
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!cachedMiddleware) {
      try {
        const { default: rateLimit } = await import('express-rate-limit')
        const keyGenerator = (r: Request): string => {
          if (config.keyBy === 'userId') {
            // Extract userId from RequestContext or JWT sub claim
            const authHeader = r.headers['authorization']
            if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
              const token = authHeader.slice(7)
              const parts = token.split('.')
              if (parts.length === 3) {
                try {
                  const payload = parts[1]
                  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
                  const decoded = JSON.parse(
                    Buffer.from(padded, 'base64url').toString('utf-8'),
                  ) as Record<string, unknown>
                  if (typeof decoded['sub'] === 'string') return decoded['sub']
                } catch {
                  // fallback to ip
                }
              }
            }
          }
          return r.ip ?? 'unknown'
        }
        cachedMiddleware = rateLimit({
          windowMs: config.windowMs,
          max: config.max,
          message: config.message ?? 'Too Many Requests',
          keyGenerator,
        }) as unknown as RequestHandler
      } catch {
        logger?.warn('express-rate-limit is not installed. @Throttle decorator has no effect.')
        cachedMiddleware = (_r: Request, _s: Response, n: NextFunction): void => n()
      }
    }
    return cachedMiddleware(req, res, next)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function BananaRouter(
  controllers: Constructor[],
  container?: DependencyContainer,
): ReturnType<typeof Router> {
  const router = Router()

  controllers.forEach((controllerClass) => {
    const controllerInstance: Record<string, unknown> = container
      ? container.isRegistered(controllerClass)
        ? (container.resolve(controllerClass) as Record<string, unknown>)
        : (container.resolve(
            controllerClass.name.charAt(0).toLowerCase() + controllerClass.name.slice(1),
          ) as Record<string, unknown>)
      : (new controllerClass() as Record<string, unknown>)

    const baseToken: string = Reflect.getMetadata(MetadataKeys.BASE_PATH, controllerClass) as string
    const mountPath = joinRouteSegments(baseToken)
    const routers: IRouter[] =
      (Reflect.getMetadata(MetadataKeys.ROUTERS, controllerClass) as IRouter[]) ?? []
    const subrouter = Router()

    routers.forEach(({ method, path: pathToken, handlerName, middlewares = [] }) => {
      const expressPath = joinRouteSegments(pathToken)
      subrouter[method](
        expressPath,
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

    router.use(mountPath, subrouter)
  })

  return router
}
