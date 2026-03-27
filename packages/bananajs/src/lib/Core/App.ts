import express, { NextFunction, Request, RequestHandler, Response } from 'express'
import { Application, Router } from 'express'
import { IRouter } from '../Router/Route.decorator'
import { MetadataKeys } from '../Router/MetaData.constants'
import { ErrorMiddleware } from '../../Middleware/Error.middleware'
/**
 * The BananaApp class is an Express.js application class that initializes an Express app and registers controllers with their respective routes.
 * @param {any[]} controllers - An array of controller classes to register with the app.
 *
 * returns {Application} A new instance of the express app initialized with the provided controllers
 */

export class BananaApp {
  private app: Application

  constructor(controllers: { new (): any }[], middlewares: RequestHandler[] = []) {
    this.app = express()

    this.app.use(express.json())

    this.app.use(express.urlencoded({ extended: true }))

    middlewares.forEach((mw) => this.app.use(mw))

    this.initializeControllers(controllers)

    this.app.use(ErrorMiddleware)
  }

  /**
   * Iterate through the provided controller classes, create an instance of each
   * and register their routes with the Express app.
   *
   * @param {any[]} controllers - An array of controllers to register with the app.
   *
   * For each controller, the following steps are taken:
   *   1. Create an instance of the controller class.
   *   2. Get the base path for the controller from the {@link MetadataKeys.BASE_PATH} decorator.
   *   3. Get an array of {@link IRouter} objects from the {@link MetadataKeys.ROUTERS} decorator.
   *   4. Create a new Express router.
   *   5. Iterate through the routers and register each one with the Express router.
   *   6. Register the Express router with the Express app using the base path.
   */
  private initializeControllers(controllers: { new (): any }[]) {
    controllers.forEach((controllerClass) => {
      const controllerInstance: { [handleName: string]: any } = new controllerClass()
      const basePath: string = Reflect.getMetadata(MetadataKeys.BASE_PATH, controllerClass)
      const routers: IRouter[] = Reflect.getMetadata(MetadataKeys.ROUTERS, controllerClass)
      const router = Router()
      routers.forEach(({ method, path, handlerName, middlewares = [] }) => {
        router[method](
          path,
          middlewares,
          async (req: Request, res: Response, next: NextFunction) => {
            try {
              return await controllerInstance[String(handlerName)](req, res, next)
            } catch (error) {
              next(error) // Pass any errors to the Express error handling middleware
            }
          },
        )
      })
      this.app.use(basePath, router)
    })
  }

  public getInstance() {
    return this.app
  }
}
