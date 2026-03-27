import 'reflect-metadata'
import { MetadataKeys } from './MetaData.constants'
import 'reflect-metadata'

export enum HTTPMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}

export interface IRouter {
  method: HTTPMethod
  path: string
  handlerName: string | symbol
  middlewares?: any[]
}

export const methodDecoratorFactory = (method: HTTPMethod) => {
  return (path: string, middlewares?: any[]): MethodDecorator => {
    return (target, propertyKey, descriptor: PropertyDescriptor) => {
      const controllerClass = target.constructor
      const routers: IRouter[] = Reflect.hasMetadata(MetadataKeys.ROUTERS, controllerClass)
        ? Reflect.getMetadata(MetadataKeys.ROUTERS, controllerClass)
        : []
      routers.push({
        method,
        path,
        middlewares,
        handlerName: propertyKey,
      })
      Reflect.defineMetadata(MetadataKeys.ROUTERS, routers, controllerClass)
    }
  }
}

/**
 * Method decorator for HTTP GET requests.
 * @param {string} path - The endpoint path.
 * @param {any[]} [middlewares] - Optional middleware functions.
 * @returns {MethodDecorator} A method decorator.
 */
export const Get = methodDecoratorFactory(HTTPMethod.GET)

/**
 * Method decorator for HTTP POST requests.
 * @param {string} path - The endpoint path.
 * @param {any[]} [middlewares] - Optional middleware functions.
 * @returns {MethodDecorator} A method decorator.
 */
export const Post = methodDecoratorFactory(HTTPMethod.POST)

/**
 * Method decorator for HTTP PUT requests.
 * @param {string} path - The endpoint path.
 * @param {any[]} [middlewares] - Optional middleware functions.
 * @returns {MethodDecorator} A method decorator.
 */
export const Put = methodDecoratorFactory(HTTPMethod.PUT)

/**
 * Method decorator for HTTP PATCH requests.
 * @param {string} path - The endpoint path.
 * @param {any[]} [middlewares] - Optional middleware functions.
 * @returns {MethodDecorator} A method decorator.
 */
export const Patch = methodDecoratorFactory(HTTPMethod.PATCH)

/**
 * Method decorator for HTTP DELETE requests.
 * @param {string} path - The endpoint path.
 * @param {any[]} [middlewares] - Optional middleware functions.
 * @returns {MethodDecorator} A method decorator.
 */
export const Delete = methodDecoratorFactory(HTTPMethod.DELETE)
