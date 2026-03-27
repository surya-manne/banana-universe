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

  constructor(controllers: Constructor[], options: BananaAppOptions = {}) {
    const {
      middlewares = [],
      security = {},
      requestId = true,
      logger: loggerOption,
      container,
      gracefulShutdown = true,
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
    this.initializeControllers(controllers)
    this.app.use(createErrorMiddleware(this.logger))

    if (gracefulShutdown) {
      this.registerGracefulShutdown()
    }
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

  private initializeControllers(controllers: Constructor[]): void {
    controllers.forEach((controllerClass) => {
      const controllerInstance = this.resolveController(controllerClass)
      const basePath: string = Reflect.getMetadata(
        MetadataKeys.BASE_PATH,
        controllerClass,
      ) as string
      const routers: IRouter[] =
        (Reflect.getMetadata(MetadataKeys.ROUTERS, controllerClass) as IRouter[]) ?? []
      const router = Router()

      routers.forEach(({ method, path, handlerName, middlewares = [] }) => {
        this.routeTable.push({
          method: method.toUpperCase(),
          path: `${basePath}${path}`,
          controller: controllerClass.name,
          handler: String(handlerName),
        })

        router[method](
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
