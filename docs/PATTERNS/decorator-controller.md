# Pattern: Controller Decorator

## Description

Class-level decorator that attaches a base route prefix to a controller class using `reflect-metadata`. Used to group related route handlers under a common path prefix.

## When to Use

Apply to any class whose methods define REST endpoints for a particular resource.

## Template

```typescript
import { Controller } from '@banana-universe/bananajs'

@Controller('/resource-base-path')
export class ResourceController {
  // route handler methods here
}
```

## Extension Points

- Replace `/resource-base-path` with the resource path (e.g., `/users`, `/products`)
- The controller class is registered with `BananaApp` at startup

## Found In

- `apps/bananajs-demo/src/App/User/User.controller.ts` → `@Controller('/users')`
