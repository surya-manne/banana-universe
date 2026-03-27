export abstract class Entity<T extends { id: unknown; createdAt?: Date; updatedAt?: Date }> {
  protected readonly props: T

  constructor(props: T) {
    this.props = props
  }

  get id(): T['id'] {
    return this.props.id
  }

  get createdAt(): Date {
    return this.props.createdAt ?? new Date(0)
  }

  get updatedAt(): Date {
    return this.props.updatedAt ?? new Date(0)
  }

  equals(other: Entity<T>): boolean {
    return this.props.id === other.props.id
  }
}
