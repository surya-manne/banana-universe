import { createContainer, type AwilixContainer, type Resolver } from 'awilix'
import type { BananaAppOptions } from '../Core/App.js'

/** Awilix registrations keyed by injection token (e.g. `articleController`). */
export type BananaServiceRegistrations = Record<string, Resolver<unknown>>

/** Create a container and register all services in one call. */
export function createBananaContainer(registrations: BananaServiceRegistrations): AwilixContainer {
  const container = createContainer()
  container.register(registrations)
  return container
}

export type DeclarativeBananaOptions = Omit<BananaAppOptions, 'container'> & {
  container?: AwilixContainer
  /** Merged into a new container, or into `container` when both are set. */
  services?: BananaServiceRegistrations
}

/**
 * Build {@link BananaAppOptions} with optional `services` merged into the Awilix container.
 * Keeps bootstrap files declarative: list `services` next to `plugins` and other options.
 */
export function defineBananaAppOptions(options: DeclarativeBananaOptions): BananaAppOptions {
  const { services, container: existing, ...rest } = options
  if (!services) {
    return { ...rest, container: existing }
  }
  const container = existing ?? createContainer()
  container.register(services)
  return { ...rest, container }
}
