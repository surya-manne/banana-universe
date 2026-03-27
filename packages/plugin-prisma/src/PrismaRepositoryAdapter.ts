import 'reflect-metadata'
import type { CriteriaOp, FindCriteria, Repository as DomainRepository } from '@banana-universe/ddd'

function mapOp<T>(op: CriteriaOp<T>): unknown {
  if (op !== null && typeof op === 'object' && !Array.isArray(op)) {
    if ('eq' in op) return op.eq
    if ('in' in op) return { in: op.in }
    if ('like' in op) return { contains: op.like }
    if ('gt' in op) return { gt: op.gt }
    if ('lt' in op) return { lt: op.lt }
  }
  return op
}

function criteriaToWhere<T extends object>(
  criteria: FindCriteria<T> | undefined,
): Record<string, unknown> | undefined {
  if (!criteria?.where) return undefined
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(criteria.where) as (keyof T)[]) {
    const cond = criteria.where[key]
    if (cond === undefined) continue
    out[key as string] = mapOp(cond as CriteriaOp<T[keyof T]>)
  }
  return out
}

/** Minimal Prisma model delegate — pass e.g. `prisma.product` from generated client. */
export interface PrismaModelDelegate<TOrm extends object, TId> {
  findUnique(args: { where: { id: TId } }): Promise<TOrm | null>
  findMany(args?: {
    where?: Record<string, unknown>
    orderBy?: Record<string, 'asc' | 'desc'>
    take?: number
    skip?: number
  }): Promise<TOrm[]>
  create(args: { data: TOrm }): Promise<TOrm>
  update(args: { where: { id: TId }; data: Partial<TOrm> }): Promise<TOrm>
  delete(args: { where: { id: TId } }): Promise<TOrm>
}

/**
 * Bridge domain `Repository<T>` to Prisma — subclass and implement mappers.
 * `like` maps to Prisma `contains` (database support varies).
 */
export abstract class PrismaRepositoryAdapter<TDomain extends { id: unknown }, TOrm extends object>
  implements DomainRepository<TDomain>
{
  constructor(protected readonly model: PrismaModelDelegate<TOrm, TDomain['id']>) {}

  abstract toDomain(row: TOrm): TDomain
  abstract toPersistence(domain: TDomain): TOrm

  async findById(id: TDomain['id']): Promise<TDomain | null> {
    const row = await this.model.findUnique({ where: { id } })
    return row ? this.toDomain(row) : null
  }

  async findAll(criteria?: FindCriteria<TDomain>): Promise<TDomain[]> {
    const where = criteriaToWhere(criteria)
    const rows = await this.model.findMany({
      where,
      orderBy: criteria?.orderBy
        ? { [criteria.orderBy.field as string]: criteria.orderBy.direction }
        : undefined,
      take: criteria?.limit,
      skip: criteria?.offset,
    })
    return rows.map((r) => this.toDomain(r))
  }

  async save(entity: TDomain): Promise<TDomain> {
    const data = this.toPersistence(entity)
    const existing = await this.model.findUnique({ where: { id: entity.id } })
    if (existing) {
      const updated = await this.model.update({
        where: { id: entity.id },
        data,
      })
      return this.toDomain(updated)
    }
    const created = await this.model.create({ data })
    return this.toDomain(created)
  }

  async delete(id: TDomain['id']): Promise<void> {
    await this.model.delete({ where: { id } })
  }
}
