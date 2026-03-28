import { createContainer, type AwilixContainer, type Resolver } from 'awilix'
import type { BananaAppCreateInput, BananaAppOptions, Constructor } from '../Core/App.js'

/** Awilix registrations keyed by injection token (e.g. `articleController`). */
export type BananaServiceRegistrations = Record<string, Resolver<unknown>>

/** Create a container and register all services in one call. */
export function createBananaContainer(registrations: BananaServiceRegistrations): AwilixContainer {
  const container = createContainer()
  container.register(registrations)
  return container
}

/**
 * Canonical controller list for {@link defineBananaAppOptions} / {@link BananaApp.create}.
 * Use as `controllers: defineBananaControllers(ArticleController, ...)` (zero args allowed for plugin-only apps).
 */
export function defineBananaControllers(...controllers: Constructor[]): Constructor[] {
  return controllers
}

export type DeclarativeBananaOptions = Omit<BananaAppOptions, 'container'> & {
  container?: AwilixContainer
  /** Merged into a new container, or into `container` when both are set. */
  services?: BananaServiceRegistrations
}

/**
 * Build {@link BananaAppOptions} with optional `services` merged into the Awilix container.
 * When `controllers` is set, it is normalized via {@link defineBananaControllers}.
 */
export function defineBananaAppOptions(
  options: DeclarativeBananaOptions & { controllers: Constructor[] },
): BananaAppCreateInput
export function defineBananaAppOptions(options: DeclarativeBananaOptions): BananaAppOptions
export function defineBananaAppOptions(
  options: DeclarativeBananaOptions & { controllers?: Constructor[] },
): BananaAppOptions | BananaAppCreateInput {
  const { services, container: existing, controllers, ...rest } = options
  if (!services) {
    if (controllers !== undefined) {
      return {
        ...rest,
        container: existing,
        controllers: defineBananaControllers(...controllers),
      }
    }
    return { ...rest, container: existing }
  }
  const container = existing ?? createContainer()
  container.register(services)
  if (controllers !== undefined) {
    return {
      ...rest,
      container,
      controllers: defineBananaControllers(...controllers),
    }
  }
  return { ...rest, container }
}
