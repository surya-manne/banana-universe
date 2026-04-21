# @banana-universe/ddd

DDD primitives for Entity, ValueObject, AggregateRoot, domain events, and repository abstractions.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/ddd
```

## Core API Surface

- `ValueObject<T>`
- `Entity<T>`
- `AggregateRoot<T>`
- `DomainEvent`
- `Repository`, `UnitOfWork`

## Minimal Working Setup

```ts
import { ValueObject, Entity, AggregateRoot } from '@banana-universe/ddd';

class Email extends ValueObject<{ value: string }> {
  get value() {
    return this.props.value;
  }
}

type UserProps = { id: string; email: Email; createdAt?: Date; updatedAt?: Date };

class User extends Entity<UserProps> {}

class UserAggregate extends AggregateRoot<UserProps> {
  register() {
    this.incrementVersion();
  }
}
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
