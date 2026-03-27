import type { Application } from 'express'
import type { AwilixContainer } from 'awilix'
import type { Logger } from '../Logger/Logger.interface.js'

export interface AppContext {
  app: Application
  logger?: Logger
  container?: AwilixContainer
}

export interface BananaPlugin {
  name: string
  register(ctx: AppContext): void | Promise<void>
  onReady?(ctx: AppContext): void | Promise<void>
  onShutdown?(): void | Promise<void>
}
