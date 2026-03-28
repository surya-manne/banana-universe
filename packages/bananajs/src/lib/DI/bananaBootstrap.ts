import { container as tsyringeRoot, type DependencyContainer } from 'tsyringe'
import type { BananaAppCreateInput, BananaAppOptions, Constructor } from '../Core/App.js'
import type { BananaModuleDescriptor } from './BananaModule.js'
import { type BananaProviderRegistration, registerBananaProviders } from './registerProviders.js'

export type { BananaProviderRegistration } from './registerProviders.js'

/** @deprecated Use {@link createBananaProviderContainer} — Awilix is no longer supported. */
export type BananaServiceRegistrations = never

/** @deprecated Use {@link createBananaProviderContainer} with tsyringe providers. */
export function createBananaContainer(
  _registrations: BananaServiceRegistrations,
): DependencyContainer {
  throw new Error(
    'createBananaContainer(Awilix-style registrations) was removed — use createBananaProviderContainer() or a tsyringe Container with registerBananaProviders() (see MIGRATION.md).',
  )
}

/**
 * Canonical controller list for {@link defineBananaAppOptions} / {@link BananaApp.create}.
 * Use as `controllers: defineBananaControllers(ArticleController, ...)` (zero args allowed for plugin-only apps).
 */
export function defineBananaControllers(...controllers: Constructor[]): Constructor[] {
  return controllers
}

export type DeclarativeBananaOptions = Omit<BananaAppOptions, 'container'> & {
  container?: DependencyContainer
  /**
   * Merged into a new {@link DependencyContainer}, or into `container` when both are set.
   * Replaces legacy Awilix `services` registrations.
   */
  providers?: BananaProviderRegistration[]
}

export function defineBananaAppOptions(
  options: DeclarativeBananaOptions & { controllers: Constructor[] },
): BananaAppCreateInput
export function defineBananaAppOptions(
  options: DeclarativeBananaOptions & { modules: BananaModuleDescriptor[] },
): BananaAppCreateInput
export function defineBananaAppOptions(options: DeclarativeBananaOptions): BananaAppOptions
export function defineBananaAppOptions(
  options: DeclarativeBananaOptions & {
    controllers?: Constructor[]
    modules?: BananaModuleDescriptor[]
  },
): BananaAppOptions | BananaAppCreateInput {
  const { providers, container: existing, controllers, modules, ...rest } = options

  let container: DependencyContainer | undefined = existing
  if (providers && providers.length > 0) {
    const c = existing ?? tsyringeRoot.createChildContainer()
    registerBananaProviders(c, providers)
    container = c
  }

  if (modules !== undefined) {
    return { ...rest, container, modules }
  }
  if (controllers !== undefined) {
    return {
      ...rest,
      container,
      controllers: defineBananaControllers(...controllers),
    }
  }
  return { ...rest, container }
}
