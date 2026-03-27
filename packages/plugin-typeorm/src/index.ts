import 'reflect-metadata'
import { AsyncLocalStorage } from 'async_hooks'

// Metadata keys — mirror MetadataKeys enum in @banana-universe/bananajs core
const INJECT_REPOSITORY = 'banana:inject_repository'
const TRANSACTIONAL = 'banana:transactional'

// --- Local interfaces (duck-typing compatible with @banana-universe/bananajs) ---

interface AppContext {
  app: { use: (...args: unknown[]) => unknown }
  logger?: { info(msg: string): void; warn(msg: string): void; error(msg: string): void }
  container?: {
    register(nameAndRegistrationPair: Record<string, unknown>): void
    resolve<T>(name: string): T
    registrations: Record<string, unknown>
  }
}

interface BananaPlugin {
  name: string
  register(ctx: AppContext): void | Promise<void>
  onReady?(ctx: AppContext): void | Promise<void>
  onShutdown?(): void | Promise<void>
}

// --- TransactionContext (AsyncLocalStorage keyed by active TypeORM QueryRunner) ---

interface TransactionRunner {
  queryRunner: unknown
}

const transactionStorage = new AsyncLocalStorage<TransactionRunner>()

export const TransactionContext = {
  getRunner(): unknown {
    return transactionStorage.getStore()?.queryRunner
  },
}

// --- @InjectRepository parameter decorator ---

export interface InjectRepositoryMeta {
  entity: Function
  paramIndex: number
}

export function InjectRepository(entity: Function): ParameterDecorator {
  return (target, _propertyKey, parameterIndex): void => {
    const existing: InjectRepositoryMeta[] =
      (Reflect.getMetadata(INJECT_REPOSITORY, target) as InjectRepositoryMeta[] | undefined) ?? []
    Reflect.defineMetadata(
      INJECT_REPOSITORY,
      [...existing, { entity, paramIndex: parameterIndex }],
      target,
    )
  }
}

// --- Module-level DataSource reference (set during TypeOrmPlugin.register) ---

let typeormDataSource: unknown = undefined

// --- @Transactional method decorator ---

export function Transactional(): MethodDecorator {
  return (target, propertyKey, descriptor): void => {
    const originalMethod = descriptor.value as
      | ((...args: unknown[]) => Promise<unknown>)
      | undefined
    if (typeof originalMethod !== 'function') return

    Reflect.defineMetadata(
      TRANSACTIONAL,
      true,
      (target as { constructor: object }).constructor,
      propertyKey,
    )
    ;(descriptor as { value: unknown }).value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const ds = typeormDataSource
      if (!ds) {
        throw new Error('@Transactional requires TypeOrmPlugin to be registered')
      }

      type QueryRunner = {
        connect(): Promise<void>
        startTransaction(): Promise<void>
        commitTransaction(): Promise<void>
        rollbackTransaction(): Promise<void>
        release(): Promise<void>
      }

      const queryRunner = (ds as { createQueryRunner(): QueryRunner }).createQueryRunner()

      await queryRunner.connect()
      await queryRunner.startTransaction()

      try {
        const result = await transactionStorage.run({ queryRunner }, () =>
          originalMethod.apply(this, args),
        )
        await queryRunner.commitTransaction()
        return result
      } catch (err) {
        await queryRunner.rollbackTransaction()
        throw err
      } finally {
        await queryRunner.release()
      }
    }
  }
}

// --- TypeOrmPlugin factory ---

export interface TypeOrmPluginOptions {
  [key: string]: unknown
}

type TypeOrmDataSourceInstance = {
  initialize(): Promise<unknown>
  getRepository(entity: Function): unknown
  createQueryRunner(): unknown
  destroy(): Promise<void>
}

type TypeOrmDataSourceCtor = new (opts: unknown) => TypeOrmDataSourceInstance

// Abstract constructor type used for safe dynamic class extension
// Return type must be `object` (not `unknown`) for TypeScript to allow `extends`
type AbstractCtor = abstract new (...args: unknown[]) => object

export function TypeOrmPlugin(options: TypeOrmPluginOptions): BananaPlugin {
  return {
    name: 'TypeOrmPlugin',

    async register(ctx): Promise<void> {
      const typeorm = await import('typeorm').catch(() => {
        ctx.logger?.error('TypeOrmPlugin requires "typeorm" to be installed as a dependency.')
        throw new Error('TypeOrmPlugin: typeorm is not installed')
      })

      const DataSourceClass = typeorm.DataSource as unknown as TypeOrmDataSourceCtor
      const dataSource = new DataSourceClass(options)
      await dataSource.initialize()

      typeormDataSource = dataSource

      if (ctx.container) {
        try {
          const { asValue } = await import('awilix')
          ctx.container.register({ dataSource: asValue(dataSource) })

          const registrations = ctx.container.registrations
          for (const serviceName of Object.keys(registrations)) {
            try {
              const service = ctx.container.resolve<{ constructor: Function }>(serviceName)
              const ctor = service.constructor

              const repoMetas = Reflect.getMetadata(INJECT_REPOSITORY, ctor) as
                | InjectRepositoryMeta[]
                | undefined
              if (!repoMetas || repoMetas.length === 0) continue

              const repositoriesByIndex = new Map<number, unknown>()
              for (const meta of repoMetas) {
                repositoriesByIndex.set(meta.paramIndex, dataSource.getRepository(meta.entity))
              }

              const OriginalClass = ctor as new (...args: unknown[]) => unknown
              const PatchedClass = class extends (OriginalClass as unknown as AbstractCtor) {
                constructor(...args: unknown[]) {
                  for (const [idx, repo] of repositoriesByIndex.entries()) {
                    args[idx] = repo
                  }
                  super(...args)
                }
              }

              const { asClass } = await import('awilix')
              ctx.container.register({
                [serviceName]: asClass(
                  PatchedClass as unknown as new (...args: unknown[]) => unknown,
                ),
              })
            } catch {
              // Service may not be resolvable at this point — skip silently
            }
          }
        } catch {
          ctx.logger?.warn('TypeOrmPlugin: awilix not available — skipping DI registration')
        }
      }

      ctx.logger?.info('TypeOrmPlugin: DataSource initialized successfully')
    },

    async onShutdown(): Promise<void> {
      if (typeormDataSource) {
        await (typeormDataSource as TypeOrmDataSourceInstance).destroy()
        typeormDataSource = undefined
      }
    },
  }
}

export { TypeOrmRepositoryAdapter } from './TypeOrmRepositoryAdapter.js'
export { TypeOrmUnitOfWork } from './TypeOrmUnitOfWork.js'
