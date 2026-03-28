import 'reflect-metadata'
import { BananaApp, defineBananaAppOptions } from '@banana-universe/bananajs'
import { healthModule } from './modules/health/HealthModule.js'

export async function createFastifyBananaApp(): Promise<BananaApp> {
  return BananaApp.create(
    defineBananaAppOptions({
      modules: [healthModule],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}
