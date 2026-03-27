import type { AwilixContainer } from 'awilix'
import { WsMetadataKeys } from './WsMetadata.js'
import type { Constructor } from './WsDecorators.js'

interface WsLike {
  on(event: 'message', handler: (data: Buffer | string) => void): void
  on(event: 'close', handler: () => void): void
  send(data: string): void
}

export interface WsServerLike {
  on(event: 'connection', handler: (socket: WsLike) => void): void
}

interface ControllerHandlers {
  connectHandler?: string | symbol
  disconnectHandler?: string | symbol
  messageHandlers: Map<string, string | symbol>
}

export function wireWsControllers(
  wsServer: WsServerLike,
  controllers: Constructor[],
  container?: AwilixContainer,
): void {
  for (const controllerClass of controllers) {
    const handlers = scanController(controllerClass)
    if (!handlers) continue

    wsServer.on('connection', (socket: WsLike) => {
      const instance = resolveController(controllerClass, container)

      if (handlers.connectHandler) {
        const method = (instance as Record<string | symbol, unknown>)[handlers.connectHandler]
        if (typeof method === 'function') {
          ;(method as (socket: WsLike) => void).call(instance, socket)
        }
      }

      socket.on('message', (rawData: Buffer | string) => {
        try {
          const msg = JSON.parse(
            typeof rawData === 'string' ? rawData : rawData.toString(),
          ) as { event: string; data: unknown }
          const methodName = handlers.messageHandlers.get(msg.event)
          if (methodName) {
            const method = (instance as Record<string | symbol, unknown>)[methodName]
            if (typeof method === 'function') {
              ;(method as (socket: WsLike, data: unknown) => void).call(instance, socket, msg.data)
            }
          }
        } catch {
          socket.send(JSON.stringify({ event: 'error', data: 'Invalid message format' }))
        }
      })

      socket.on('close', () => {
        if (handlers.disconnectHandler) {
          const method = (instance as Record<string | symbol, unknown>)[handlers.disconnectHandler]
          if (typeof method === 'function') {
            ;(method as (socket: WsLike) => void).call(instance, socket)
          }
        }
      })
    })
  }
}

function scanController(controllerClass: Constructor): ControllerHandlers | null {
  const proto = controllerClass.prototype as Record<string | symbol, unknown>
  const result: ControllerHandlers = { messageHandlers: new Map() }

  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue
    if (Reflect.getMetadata(WsMetadataKeys.WS_CONNECT, proto, key) === true) {
      result.connectHandler = key
    }
    if (Reflect.getMetadata(WsMetadataKeys.WS_DISCONNECT, proto, key) === true) {
      result.disconnectHandler = key
    }
    const msgEvent = Reflect.getMetadata(WsMetadataKeys.WS_MESSAGE, proto, key) as string | undefined
    if (msgEvent !== undefined) {
      result.messageHandlers.set(msgEvent, key)
    }
  }

  return result
}

function resolveController(controllerClass: Constructor, container?: AwilixContainer): unknown {
  if (container) {
    const name = controllerClass.name.charAt(0).toLowerCase() + controllerClass.name.slice(1)
    return container.resolve<unknown>(name)
  }
  return new controllerClass()
}
