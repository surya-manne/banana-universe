import 'reflect-metadata'
import { Injectable } from '@banana-universe/bananajs'
import { LAYER_TYPE_KEY, type LayerType } from '../metadata.js'

const layer: LayerType = 'application'

/** Marks an application service — orchestrates domain + infrastructure. */
export function ApplicationService(): ClassDecorator {
  return (target) => {
    Injectable()(target)
    Reflect.defineMetadata(LAYER_TYPE_KEY, layer, target)
  }
}
