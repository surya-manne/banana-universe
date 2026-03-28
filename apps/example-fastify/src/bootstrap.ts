import 'reflect-metadata'
import {
  BananaApp,
  defineBananaAppOptions,
  defineBananaControllers,
} from '@banana-universe/bananajs'
import { HealthController } from './health.controller.js'

export async function createFastifyBananaApp(): Promise<BananaApp> {
  return BananaApp.create(
    defineBananaAppOptions({
      controllers: defineBananaControllers(HealthController),
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}
