export type CriteriaOp<T> = T | { eq: T } | { in: T[] } | { like: string } | { gt: T } | { lt: T }

export interface FindCriteria<T> {
  where?: {
    [K in keyof T]?: CriteriaOp<T[K]>
  }
  orderBy?: { field: keyof T; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>
  findAll(criteria?: FindCriteria<T>): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: ID): Promise<void>
}
