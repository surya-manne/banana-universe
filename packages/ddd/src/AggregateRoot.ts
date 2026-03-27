import type { DomainEvent } from './DomainEvent.js'
import { Entity } from './Entity.js'

export abstract class AggregateRoot<
  T extends { id: unknown; createdAt?: Date; updatedAt?: Date },
> extends Entity<T> {
  private _domainEvents: DomainEvent[] = []
  private _version = 0

  get version(): number {
    return this._version
  }

  /** Called when rehydrating from persistence or after successful save. */
  protected syncVersion(v: number): void {
    this._version = v
  }

  protected incrementVersion(): void {
    this._version += 1
  }

  addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearDomainEvents(): DomainEvent[] {
    const copy = [...this._domainEvents]
    this._domainEvents = []
    return copy
  }

  peekDomainEvents(): readonly DomainEvent[] {
    return this._domainEvents
  }
}
