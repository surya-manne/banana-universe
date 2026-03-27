import 'reflect-metadata'
import { AsyncLocalStorage } from 'async_hooks'

// Metadata key — mirrors MetadataKeys.TRANSACTIONAL in @banana-universe/bananajs core
const TRANSACTIONAL = 'banana:transactional'

// --- Local interfaces (duck-typing compatible with @banana-universe/bananajs) ---

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

// --- PrismaTransactionContext (AsyncLocalStorage keyed by active Prisma tx client) ---

const prismaTransactionStorage = new AsyncLocalStorage<{ tx: unknown }>()

export const PrismaTransactionContext = {
  getTx(): unknown {
    return prismaTransactionStorage.getStore()?.tx
  },
}

// --- Module-level PrismaClient reference (set during PrismaPlugin.register) ---

let prismaClientRef: unknown = undefined

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
      const client = prismaClientRef
      if (!client) {
        throw new Error('@Transactional requires PrismaPlugin to be registered')
      }

      type PrismaClientWithTransaction = {
        $transaction(fn: (tx: unknown) => Promise<unknown>): Promise<unknown>
      }

      return (client as PrismaClientWithTransaction).$transaction((tx: unknown) =>
        prismaTransactionStorage.run({ tx }, () => originalMethod.apply(this, args)),
      )
    }
  }
}

// --- PrismaPlugin factory ---

type PrismaClientWithDisconnect = {
  $disconnect(): Promise<void>
}

export function PrismaPlugin(prismaClient: unknown): BananaPlugin {
  return {
    name: 'PrismaPlugin',

    async register(ctx): Promise<void> {
      prismaClientRef = prismaClient

      if (ctx.container) {
        try {
          const { asValue } = await import('awilix')
          ctx.container.register({ prismaClient: asValue(prismaClient) })
        } catch {
          ctx.logger?.warn('PrismaPlugin: awilix not available — skipping DI registration')
        }
      }

      ctx.logger?.info('PrismaPlugin: PrismaClient registered successfully')
    },

    async onShutdown(): Promise<void> {
      if (prismaClientRef) {
        try {
          await (prismaClientRef as PrismaClientWithDisconnect).$disconnect()
        } finally {
          prismaClientRef = undefined
        }
      }
    },
  }
}
