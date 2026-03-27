import type { UnitOfWork } from '@banana-universe/ddd'

/** Thrown from {@link PrismaScopedUnitOfWork.rollback} to abort `prisma.$transaction`. */
export class PrismaTransactionRollback extends Error {
  constructor() {
    super('PRISMA_TRANSACTION_ROLLBACK')
    this.name = 'PrismaTransactionRollback'
  }
}

/**
 * UnitOfWork scoped to an active Prisma interactive transaction client.
 * `begin` / `commit` are no-ops (Prisma owns the transaction boundary).
 * `rollback` throws {@link PrismaTransactionRollback} so the `$transaction` callback fails and Prisma rolls back.
 */
export class PrismaScopedUnitOfWork implements UnitOfWork {
  constructor(private readonly _tx: unknown) {
    void this._tx
  }

  async begin(): Promise<void> {
    return Promise.resolve()
  }

  async commit(): Promise<void> {
    return Promise.resolve()
  }

  async rollback(): Promise<void> {
    throw new PrismaTransactionRollback()
  }
}

type PrismaClientLike = {
  $transaction<R>(fn: (tx: unknown) => Promise<R>): Promise<R>
}

/** Runs work inside `prisma.$transaction`, exposing a {@link UnitOfWork} handle. */
export function runWithPrismaUnitOfWork<T>(
  prisma: PrismaClientLike,
  fn: (uow: UnitOfWork) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const uow = new PrismaScopedUnitOfWork(tx)
    return fn(uow)
  })
}
