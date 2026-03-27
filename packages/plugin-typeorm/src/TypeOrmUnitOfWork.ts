import type { DataSource } from 'typeorm'
import type { UnitOfWork } from '@banana-universe/ddd'

type QueryRunner = {
  connect(): Promise<void>
  startTransaction(): Promise<void>
  commitTransaction(): Promise<void>
  rollbackTransaction(): Promise<void>
  release(): Promise<void>
}

/** Imperative UnitOfWork using a TypeORM QueryRunner (v0.1 — pair with repositories using same runner in future revisions). */
export class TypeOrmUnitOfWork implements UnitOfWork {
  private runner: QueryRunner | undefined

  constructor(private readonly dataSource: DataSource) {}

  async begin(): Promise<void> {
    if (this.runner) {
      throw new Error('TypeOrmUnitOfWork: transaction already active')
    }
    const qr = this.dataSource.createQueryRunner() as QueryRunner
    await qr.connect()
    await qr.startTransaction()
    this.runner = qr
  }

  async commit(): Promise<void> {
    const qr = this.requireRunner()
    try {
      await qr.commitTransaction()
    } finally {
      await qr.release()
      this.runner = undefined
    }
  }

  async rollback(): Promise<void> {
    const qr = this.requireRunner()
    try {
      await qr.rollbackTransaction()
    } finally {
      await qr.release()
      this.runner = undefined
    }
  }

  private requireRunner(): QueryRunner {
    if (!this.runner) {
      throw new Error('TypeOrmUnitOfWork: begin() was not called')
    }
    return this.runner
  }
}
