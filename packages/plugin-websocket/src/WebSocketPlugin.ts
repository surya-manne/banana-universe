import 'reflect-metadata'
import type { BananaPlugin, AppContext } from '@banana-universe/bananajs'
import type { Server as HttpServer } from 'http'
import type { Constructor } from './WsDecorators.js'
import { wireWsControllers, type WsServerLike } from './WsRouter.js'

interface WsServerInstance extends WsServerLike {
  handleUpgrade(req: unknown, socket: unknown, head: unknown, cb: (ws: unknown) => void): void
  emit(event: string, ws: unknown, req: unknown): void
  close(callback?: () => void): void
}

export interface WebSocketPluginOptions {
  path?: string
  controllers: Constructor[]
}

export class WebSocketPlugin implements BananaPlugin {
  readonly name = 'plugin-websocket'
  private wsServer: WsServerInstance | undefined
  private readonly options: WebSocketPluginOptions

  constructor(options: WebSocketPluginOptions) {
    this.options = options
  }

  async register(ctx: AppContext): Promise<void> {
    const wsModule = await import('ws').catch(() => null)
    if (!wsModule) {
      ctx.logger?.warn('plugin-websocket: "ws" package not installed. Install with: npm install ws')
      return
    }

    const { WebSocketServer } = wsModule as {
      WebSocketServer: new (opts: { noServer: boolean }) => WsServerInstance
    }
    this.wsServer = new WebSocketServer({ noServer: true })

    wireWsControllers(this.wsServer, this.options.controllers, ctx.container)
  }

  async onShutdown(): Promise<void> {
    if (this.wsServer) {
      await new Promise<void>((resolve) => {
        this.wsServer!.close(() => resolve())
      })
    }
  }

  /**
   * Attach this plugin to the Node.js HTTP server to handle WebSocket upgrades.
   * Call this after app.listen() returns the server instance.
   *
   * @example
   * const server = app.listen(3000)
   * wsPlugin.attachToServer(server)
   */
  attachToServer(httpServer: HttpServer): void {
    if (!this.wsServer) {
      throw new Error(
        'plugin-websocket: Call BananaApp.create() with this plugin before calling attachToServer()',
      )
    }
    const wsServer = this.wsServer
    const wsPath = this.options.path ?? '/ws'
    httpServer.on('upgrade', (req, socket, head) => {
      // Only handle upgrades matching the configured path
      const url = (req as { url?: string }).url ?? '/'
      if (url !== wsPath) {
        ;(socket as { destroy?: () => void }).destroy?.()
        return
      }
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit('connection', ws, req)
      })
    })
  }
}
