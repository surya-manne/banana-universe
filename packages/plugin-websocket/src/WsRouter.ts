import type { AwilixContainer } from 'awilix'
import { plainToInstance } from 'class-transformer'
import { validate, type ValidationError } from 'class-validator'
import { WsMetadataKeys } from './WsMetadata.js'
import type { Constructor, WsBodyMeta } from './WsDecorators.js'

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
        void handleWsMessage(controllerClass, instance, handlers, socket, rawData)
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

async function handleWsMessage(
  controllerClass: Constructor,
  instance: unknown,
  handlers: ControllerHandlers,
  socket: WsLike,
  rawData: Buffer | string,
): Promise<void> {
  try {
    const msg = JSON.parse(typeof rawData === 'string' ? rawData : rawData.toString()) as {
      event: string
      data: unknown
    }
    const methodName = handlers.messageHandlers.get(msg.event)
    if (!methodName) return

    const method = (instance as Record<string | symbol, unknown>)[methodName]
    if (typeof method !== 'function') return

    const proto = controllerClass.prototype as object
    const wsBodyMetas = Reflect.getMetadata(WsMetadataKeys.WS_BODY, proto, methodName) as
      | WsBodyMeta[]
      | undefined

    let body: unknown = msg.data
    const bodyMeta = wsBodyMetas?.find((m) => m.paramIndex === 1)
    if (bodyMeta?.DtoClass) {
      const dto = plainToInstance(bodyMeta.DtoClass, msg.data as object)
      const errors = await validate(dto as object, {
        whitelist: true,
        forbidNonWhitelisted: true,
      })
      if (errors.length > 0) {
        const message = errors
          .map((e: ValidationError) => Object.values(e.constraints ?? {}))
          .join(', ')
        socket.send(JSON.stringify({ event: 'error', data: { message } }))
        return
      }
      body = dto
    }

    await Promise.resolve(
      (method as (socket: WsLike, data: unknown) => unknown).call(instance, socket, body),
    )
  } catch {
    socket.send(JSON.stringify({ event: 'error', data: 'Invalid message format' }))
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
    const msgEvent = Reflect.getMetadata(WsMetadataKeys.WS_MESSAGE, proto, key) as
      | string
      | undefined
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
