import 'reflect-metadata'
import { AsyncLocalStorage } from 'async_hooks'
import type { Connection } from 'mongoose'

// Metadata key — mirrors MetadataKeys.TRANSACTIONAL in @banana-universe/bananajs core
const TRANSACTIONAL = 'banana:transactional'

interface AppContext {
  app: { use: (...args: unknown[]) => unknown }
  logger?: { info(msg: string): void; warn(msg: string): void; error(msg: string): void }
  container?: {
    register(nameAndRegistrationPair: Record<string, unknown>): void
    resolve<T>(name: string): T
  }
}

interface BananaPlugin {
  name: string
  register(ctx: AppContext): void | Promise<void>
  onReady?(ctx: AppContext): void | Promise<void>
  onShutdown?(): void | Promise<void>
}

const mongooseSessionStorage = new AsyncLocalStorage<{
  session: import('mongoose').ClientSession
}>()

/** Access the active MongoDB session inside `@Transactional` (e.g. pass `{ session }` to model ops). */
export const MongooseTransactionContext = {
  getSession(): import('mongoose').ClientSession | undefined {
    return mongooseSessionStorage.getStore()?.session
  },
}

let connectionRef: Connection | undefined = undefined

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
      const conn = connectionRef
      if (!conn) {
        throw new Error('@Transactional requires MongoosePlugin to be registered')
      }

      const session = await conn.startSession()
      try {
        return await session.withTransaction(async () =>
          mongooseSessionStorage.run({ session }, () => originalMethod.apply(this, args)),
        )
      } finally {
        await session.endSession()
      }
    }
  }
}

export function MongoosePlugin(connection: Connection): BananaPlugin {
  return {
    name: 'MongoosePlugin',

    async register(ctx): Promise<void> {
      connectionRef = connection

      if (ctx.container) {
        try {
          const { asValue } = await import('awilix')
          ctx.container.register({
            mongooseConnection: asValue(connection),
          })
        } catch {
          ctx.logger?.warn('MongoosePlugin: awilix not available — skipping DI registration')
        }
      }

      ctx.logger?.info('MongoosePlugin: Connection registered successfully')
    },

    async onShutdown(): Promise<void> {
      if (connectionRef) {
        try {
          await connectionRef.close()
        } finally {
          connectionRef = undefined
        }
      }
    },
  }
}

export { MongooseRepositoryAdapter } from './MongooseRepositoryAdapter.js'
export {
  MongooseScopedUnitOfWork,
  MongooseTransactionRollback,
  runWithMongooseUnitOfWork,
} from './MongooseUnitOfWork.js'
