import 'reflect-metadata'
import { Injectable } from '@banana-universe/bananajs'
import { LAYER_TYPE_KEY, type LayerType } from '../metadata.js'

const layer: LayerType = 'domain'

/** Marks a domain service — no HTTP, no ORM. Registers like @Injectable and sets layer metadata. */
export function DomainService(): ClassDecorator {
  return (target) => {
    Injectable()(target)
    Reflect.defineMetadata(LAYER_TYPE_KEY, layer, target)
  }
}
