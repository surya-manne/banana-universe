import 'reflect-metadata'
import type { BananaPlugin } from '@banana-universe/bananajs'
import { BananaApp, defineBananaControllers } from '@banana-universe/bananajs'
import { WebSocketPlugin } from '@banana-universe/plugin-websocket'
import { HealthController } from './health.controller.js'
import { wsControllers } from './chat.ws-controller.js'

export async function createChatApp(): Promise<{
  banana: BananaApp
  wsPlugin: WebSocketPlugin
}> {
  const wsPlugin = new WebSocketPlugin({
    path: '/ws',
    controllers: wsControllers,
  })

  const banana = await BananaApp.create({
    controllers: defineBananaControllers(HealthController),
    plugins: [wsPlugin as BananaPlugin],
    logger: false,
    gracefulShutdown: false,
    rateLimit: false,
    requestId: false,
    security: { helmet: false, cors: false },
  })

  return { banana, wsPlugin }
}
