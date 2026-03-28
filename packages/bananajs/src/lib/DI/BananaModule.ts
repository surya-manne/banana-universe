import type { InjectionToken } from 'tsyringe'
import type { DependencyContainer } from 'tsyringe'
import type { Constructor } from '../Core/App.js'

/**
 * Provider entry for {@link createModule} — a class, or an explicit token binding.
 * The module **`controller`** is registered on the child container automatically — **do not** list it in **`providers`**.
 */
export type BananaModuleProvider =
  | Constructor
  | { token: InjectionToken<unknown> | string | symbol; useClass: Constructor }
  | {
      token: InjectionToken<unknown> | string | symbol
      useFactory: (c: DependencyContainer) => unknown
    }
  | { token: InjectionToken<unknown> | string | symbol; useValue: unknown }

/**
 * Feature module (GraphQL Modules–style): one id, one HTTP controller, providers on a child container.
 */
export interface BananaModuleDescriptor {
  id: string
  controller: Constructor
  providers?: BananaModuleProvider[]
}

/**
 * Declarative module factory — returns a descriptor for {@link BananaAppOptions} / {@link defineBananaAppOptions}.
 */
export function createModule(desc: BananaModuleDescriptor): BananaModuleDescriptor {
  return {
    ...desc,
    providers: desc.providers ?? [],
  }
}

export interface DiscoverModulesOptions {
  /** Reserved for build-time or runtime glob discovery; not implemented in core. */
  pattern?: string
  baseUrl?: string
}

/**
 * Optional convention-based module loading. **Not implemented** in core — use explicit `modules: [...]`
 * or generate a manifest at build time. When implemented, results must be sorted by `id` for stable route order.
 */
export async function discoverModules(
  _opts: DiscoverModulesOptions,
): Promise<BananaModuleDescriptor[]> {
  throw new Error(
    'discoverModules() is not implemented — pass an explicit modules array or a build-time manifest (see Enterprise roadmap / ARCHITECTURE).',
  )
}
