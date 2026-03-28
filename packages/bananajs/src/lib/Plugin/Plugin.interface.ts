import type { Application } from 'express'
import type { DependencyContainer } from 'tsyringe'
import type { Constructor } from '../Core/App.js'
import type { Logger } from '../Logger/Logger.interface.js'

export interface AppContext {
  app: Application
  logger?: Logger
  /** Root tsyringe container — plugins register shared infrastructure here; per-module providers use child containers. */
  container?: DependencyContainer
  /** Classes registered as HTTP controllers (from `controllers` or `modules`) for plugins that scan constructors. */
  controllerClasses?: Constructor[]
}

export interface BananaPlugin {
  name: string
  register(ctx: AppContext): void | Promise<void>
  onReady?(ctx: AppContext): void | Promise<void>
  onShutdown?(): void | Promise<void>
}
