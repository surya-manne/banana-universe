import 'reflect-metadata'
import type { BananaPlugin } from '@banana-universe/bananajs'
import { BananaApp, defineBananaAppOptions } from '@banana-universe/bananajs'
import { WebSocketPlugin } from '@banana-universe/plugin-websocket'
import { wsControllers } from './modules/chat/ChatWsController.js'
import { healthModule } from './modules/health/HealthModule.js'

export async function createChatApp(): Promise<{
  banana: BananaApp
  wsPlugin: WebSocketPlugin
}> {
  const wsPlugin = new WebSocketPlugin({
    path: '/ws',
    controllers: wsControllers,
  })

  const banana = await BananaApp.create(
    defineBananaAppOptions({
      modules: [healthModule],
      plugins: [wsPlugin as BananaPlugin],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )

  return { banana, wsPlugin }
}
