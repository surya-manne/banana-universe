import 'reflect-metadata'
import type { FilterQuery, Model } from 'mongoose'
import type { CriteriaOp, FindCriteria, Repository as DomainRepository } from '@banana-universe/ddd'

function mapOp<T>(op: CriteriaOp<T>): unknown {
  if (op !== null && typeof op === 'object' && !Array.isArray(op)) {
    if ('eq' in op) return op.eq
    if ('in' in op) return { $in: op.in }
    if ('like' in op) return { $regex: op.like, $options: 'i' }
    if ('gt' in op) return { $gt: op.gt }
    if ('lt' in op) return { $lt: op.lt }
  }
  return op
}

function criteriaToFilter<T extends object>(
  criteria: FindCriteria<T> | undefined,
): FilterQuery<Record<string, unknown>> | undefined {
  if (!criteria?.where) return undefined
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(criteria.where) as (keyof T)[]) {
    const cond = criteria.where[key]
    if (cond === undefined) continue
    out[key as string] = mapOp(cond as CriteriaOp<T[keyof T]>)
  }
  return out as FilterQuery<Record<string, unknown>>
}

/**
 * Bridge domain `Repository<T>` to a Mongoose `Model` — subclass and implement mappers.
 * `like` maps to case-insensitive regex.
 */
export abstract class MongooseRepositoryAdapter<
  TDomain extends { id: unknown },
  TDoc extends { id?: unknown },
> implements DomainRepository<TDomain>
{
  constructor(protected readonly model: Model<TDoc>) {}

  abstract toDomain(doc: TDoc): TDomain
  abstract toPersistence(domain: TDomain): Partial<TDoc>

  async findById(id: TDomain['id']): Promise<TDomain | null> {
    const doc = await this.model.findById(id as string).exec()
    return doc ? this.toDomain(doc as TDoc) : null
  }

  async findAll(criteria?: FindCriteria<TDomain>): Promise<TDomain[]> {
    const filter = criteriaToFilter(criteria)
    let q = this.model.find(filter ?? {})
    if (criteria?.orderBy) {
      const dir = criteria.orderBy.direction === 'desc' ? -1 : 1
      q = q.sort({ [criteria.orderBy.field as string]: dir } as Record<string, 1 | -1>)
    }
    if (criteria?.limit !== undefined) q = q.limit(criteria.limit)
    if (criteria?.offset !== undefined) q = q.skip(criteria.offset)
    const docs = await q.exec()
    return docs.map((d) => this.toDomain(d as TDoc))
  }

  async save(entity: TDomain): Promise<TDomain> {
    const data = this.toPersistence(entity)
    const id = entity.id as string
    const existing = await this.model.findById(id).exec()
    if (existing) {
      Object.assign(existing, data)
      const saved = await existing.save()
      return this.toDomain(saved as TDoc)
    }
    const created = await this.model.create(data as TDoc)
    return this.toDomain(created as TDoc)
  }

  async delete(id: TDomain['id']): Promise<void> {
    await this.model.findByIdAndDelete(id as string).exec()
  }
}
