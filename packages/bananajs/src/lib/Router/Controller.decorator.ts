import { MetadataKeys } from './MetaData.constants'
import { normalizeRouteToken } from './route-path.js'

/**
 * A Class Decorator that marks a class as a controller.
 *
 * `basePath` is a route segment without leading or trailing slashes (e.g. `'articles'`, `''` for root).
 * The framework joins segments when mounting routes.
 * @param {string} [basePath=''] The base path segment of the controller.
 * @returns {ClassDecorator} A class decorator that marks a class as a controller.
 */
export const Controller = (basePath = ''): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(MetadataKeys.BASE_PATH, normalizeRouteToken(basePath), target)
  }
}
