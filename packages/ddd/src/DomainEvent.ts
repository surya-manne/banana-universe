export interface DomainEvent {
  aggregateId: unknown
  occurredOn: Date
  eventName: string
}
