import { MetadataKeys } from './MetaData.constants'

/**
 * A Class Decorator that marks a class as a controller.
 *
 * It takes `basePath` parameter which will be used to construct the route path.
 * @param {string} [basePath] The base path of the controller.
 * @returns {ClassDecorator} A class decorator that marks a class as a controller.
 */
export const Controller = (basePath: string): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(MetadataKeys.BASE_PATH, basePath, target)
  }
}
