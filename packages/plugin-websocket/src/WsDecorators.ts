import 'reflect-metadata'
import type { ZodType } from 'zod'
import { WsMetadataKeys } from './WsMetadata.js'

export type Constructor<T = unknown> = new (...args: unknown[]) => T

/**
 * Marks a class as a WebSocket controller.
 * @param namespace - Reserved for future use; namespace-based routing is not yet implemented.
 *   All @WsController classes currently share the same WebSocket server instance.
 */
export function WsController(namespace?: string): ClassDecorator {
  return (target: object): void => {
    Reflect.defineMetadata(WsMetadataKeys.WS_NAMESPACE, namespace ?? '/', target)
  }
}

export function OnConnect(): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(WsMetadataKeys.WS_CONNECT, true, target, propertyKey)
  }
}

export function OnDisconnect(): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(WsMetadataKeys.WS_DISCONNECT, true, target, propertyKey)
  }
}

export function OnMessage(event: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(WsMetadataKeys.WS_MESSAGE, event, target, propertyKey)
  }
}

export interface WsBodyMeta {
  paramIndex: number
  schema?: ZodType
}

/**
 * Marks a parameter as the WebSocket message body.
 * @param schema - When provided, `data` is validated with Zod (same idea as HTTP `@Body`).
 */
export function WsBody(schema?: ZodType): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    if (propertyKey === undefined) return
    const existing =
      (Reflect.getMetadata(WsMetadataKeys.WS_BODY, target, propertyKey) as
        | WsBodyMeta[]
        | undefined) ?? []
    existing.push({ paramIndex: parameterIndex, schema })
    Reflect.defineMetadata(WsMetadataKeys.WS_BODY, existing, target, propertyKey)
  }
}
