# DI Module Pattern

Encapsulate one HTTP controller with its providers into a self-contained tsyringe child container using `createModule`.

## When to Use

- Every feature area with its own controller and scoped services
- Whenever you want isolated DI scope per feature (controller, service, repository)

## Pattern

```typescript
import { createModule } from '@banana-universe/bananajs';
import { UserController } from './User.controller';
import { UserService } from './User.service';

export const userModule = createModule({
  id: 'user',
  controller: UserController,
  providers: [UserService],
});
```

```typescript
// App bootstrap
import { BananaApp, defineBananaAppOptions } from '@banana-universe/bananajs';
import { userModule } from './modules/user.module';

const app = await BananaApp.create(
  defineBananaAppOptions({
    modules: [userModule],
  })
);
```

## Rules

- `controller` is auto-registered on the child container — do **not** list it in `providers`
- Each module gets its own tsyringe child container; plugins register on the **root** container only
- `id` must be unique across all modules

## Token Bindings

```typescript
// Class binding (default)
providers: [UserService]

// Interface token
providers: [{ token: 'IUserRepository', useClass: PostgresUserRepository }]

// Factory
providers: [{ token: 'db', useFactory: (c) => c.resolve(DataSource).getRepository(User) }]

// Value
providers: [{ token: 'config', useValue: { ttl: 60 } }]
```
