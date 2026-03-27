import type { ClientSession } from 'mongoose'
import type { UnitOfWork } from '@banana-universe/ddd'

/** Thrown from {@link MongooseScopedUnitOfWork.rollback} to abort `session.withTransaction`. */
export class MongooseTransactionRollback extends Error {
  constructor() {
    super('MONGOOSE_TRANSACTION_ROLLBACK')
    this.name = 'MongooseTransactionRollback'
  }
}

/**
 * UnitOfWork scoped to an active Mongoose session inside `withTransaction`.
 * `begin` / `commit` are no-ops (MongoDB owns the transaction boundary).
 * `rollback` throws {@link MongooseTransactionRollback} so the callback fails and MongoDB rolls back.
 */
export class MongooseScopedUnitOfWork implements UnitOfWork {
  constructor(private readonly _session: ClientSession) {
    void this._session
  }

  async begin(): Promise<void> {
    return Promise.resolve()
  }

  async commit(): Promise<void> {
    return Promise.resolve()
  }

  async rollback(): Promise<void> {
    throw new MongooseTransactionRollback()
  }
}

type ConnectionLike = {
  startSession(): Promise<ClientSession>
}

/**
 * Runs work inside `session.withTransaction`, exposing a {@link UnitOfWork} handle.
 * Requires a replica set or sharded cluster for transactions; standalone MongoDB will fail at runtime.
 */
export function runWithMongooseUnitOfWork<T>(
  connection: ConnectionLike,
  fn: (uow: UnitOfWork) => Promise<T>,
): Promise<T> {
  return (async () => {
    const session = await connection.startSession()
    try {
      return await session.withTransaction(async () => {
        const uow = new MongooseScopedUnitOfWork(session)
        return fn(uow)
      })
    } finally {
      await session.endSession()
    }
  })()
}
