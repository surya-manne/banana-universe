import { container as tsyringeRoot, type DependencyContainer, type InjectionToken } from 'tsyringe'
import type { Constructor } from '../Core/App.js'
import type { BananaModuleProvider } from './BananaModule.js'

/** Top-level or module-level provider registration compatible with {@link defineBananaAppOptions}. */
export type BananaProviderRegistration =
  | Constructor
  | { token: InjectionToken<unknown> | string | symbol; useClass: Constructor }
  | {
      token: InjectionToken<unknown> | string | symbol
      useFactory: (c: DependencyContainer) => unknown
    }
  | { token: InjectionToken<unknown> | string | symbol; useValue: unknown }

export function registerBananaProvider(
  container: DependencyContainer,
  p: BananaProviderRegistration | BananaModuleProvider,
): void {
  if (typeof p === 'function') {
    const Ctor = p as Constructor
    container.register(Ctor, { useClass: Ctor })
    return
  }
  if ('useValue' in p) {
    container.registerInstance(p.token, p.useValue)
    return
  }
  if ('useFactory' in p) {
    container.register(p.token, { useFactory: p.useFactory })
    return
  }
  container.register(p.token, { useClass: p.useClass })
}

export function registerBananaProviders(
  container: DependencyContainer,
  providers: (BananaProviderRegistration | BananaModuleProvider)[],
): void {
  for (const p of providers) registerBananaProvider(container, p)
}

export function createBananaProviderContainer(
  providers: BananaProviderRegistration[],
): DependencyContainer {
  const c = tsyringeRoot.createChildContainer()
  registerBananaProviders(c, providers)
  return c
}
