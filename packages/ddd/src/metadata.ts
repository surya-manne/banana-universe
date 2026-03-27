/** Awilix / DI + layer classification — explicit metadata (emitDecoratorMetadata is false workspace-wide). */
export const LAYER_TYPE_KEY = 'banana:layer_type'

export type LayerType = 'domain' | 'application'

export function getLayerType(target: object): LayerType | undefined {
  return Reflect.getMetadata(LAYER_TYPE_KEY, target) as LayerType | undefined
}
