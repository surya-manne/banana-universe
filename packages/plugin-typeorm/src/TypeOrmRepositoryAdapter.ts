import 'reflect-metadata'
import type { ObjectLiteral } from 'typeorm'
import {
  Equal,
  FindOptionsWhere,
  In,
  LessThan,
  Like,
  MoreThan,
  type DataSource,
  type EntityTarget,
  type FindManyOptions,
  type FindOptionsOrder,
} from 'typeorm'
import type { CriteriaOp, FindCriteria, Repository as DomainRepository } from '@banana-universe/ddd'

function mapOp<T>(op: CriteriaOp<T>): unknown {
  if (op !== null && typeof op === 'object' && !Array.isArray(op)) {
    if ('eq' in op) return Equal(op.eq as object)
    if ('in' in op) return In(op.in as unknown[])
    if ('like' in op) return Like(op.like)
    if ('gt' in op) return MoreThan(op.gt as object)
    if ('lt' in op) return LessThan(op.lt as object)
  }
  return Equal(op as object)
}

function criteriaToWhere<T extends object>(
  criteria: FindCriteria<T> | undefined,
): FindOptionsWhere<T> | undefined {
  if (!criteria?.where) return undefined
  const out = {} as Record<string, unknown>
  for (const key of Object.keys(criteria.where) as (keyof T)[]) {
    const cond = criteria.where[key]
    if (cond === undefined) continue
    out[key as string] = mapOp(cond as CriteriaOp<T[keyof T]>)
  }
  return out as FindOptionsWhere<T>
}

/**
 * Bridge domain `Repository<T>` to TypeORM — subclass and implement mappers.
 * Domain entities stay free of ORM decorators; ORM entities live in infrastructure.
 */
export abstract class TypeOrmRepositoryAdapter<
  TDomain extends { id: unknown },
  TOrm extends ObjectLiteral,
> implements DomainRepository<TDomain>
{
  constructor(
    protected readonly dataSource: DataSource,
    protected readonly ormEntity: EntityTarget<TOrm>,
  ) {}

  abstract toDomain(orm: TOrm): TDomain
  abstract toPersistence(domain: TDomain): TOrm

  protected get repo() {
    return this.dataSource.getRepository<TOrm>(this.ormEntity)
  }

  async findById(id: TDomain['id']): Promise<TDomain | null> {
    const row = await this.repo.findOneBy({ id } as FindOptionsWhere<TOrm>)
    return row ? this.toDomain(row) : null
  }

  async findAll(criteria?: FindCriteria<TDomain>): Promise<TDomain[]> {
    const where = criteriaToWhere(criteria) as FindOptionsWhere<TOrm> | undefined
    const opts: FindManyOptions<TOrm> = { where }
    if (criteria?.orderBy) {
      opts.order = {
        [criteria.orderBy.field as string]: criteria.orderBy.direction,
      } as FindOptionsOrder<TOrm>
    }
    if (criteria?.limit !== undefined) opts.take = criteria.limit
    if (criteria?.offset !== undefined) opts.skip = criteria.offset
    const rows = await this.repo.find(opts)
    return rows.map((r) => this.toDomain(r))
  }

  async save(entity: TDomain): Promise<TDomain> {
    const row = this.toPersistence(entity)
    const saved = await this.repo.save(row as TOrm)
    return this.toDomain(saved)
  }

  async delete(id: TDomain['id']): Promise<void> {
    await this.repo.delete({ id } as FindOptionsWhere<TOrm>)
  }
}
