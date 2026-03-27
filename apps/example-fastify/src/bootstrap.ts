import 'reflect-metadata'
import { BananaApp, type Constructor, defineBananaAppOptions } from '@banana-universe/bananajs'
import { HealthController } from './health.controller.js'

export async function createFastifyBananaApp(): Promise<BananaApp> {
  return BananaApp.create(
    [HealthController as unknown as Constructor],
    defineBananaAppOptions({
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}
