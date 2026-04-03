# BananaPlugin Pattern

Implement the `BananaPlugin` interface to integrate third-party libraries into the BananaApp lifecycle.

## When to Use

- Adding a database ORM (TypeORM, Mongoose)
- Adding observability (OpenTelemetry)
- Adding cross-cutting infrastructure (WebSockets, feature flags)

## Pattern

```typescript
import type { BananaPlugin, AppContext } from '@banana-universe/bananajs';

export function MyPlugin(options: MyPluginOptions): BananaPlugin {
  return {
    name: 'my-plugin',

    async register(ctx: AppContext): Promise<void> {
      // Called during setup — register tokens on root container
      const connection = await createConnection(options);
      ctx.container?.registerInstance('myConnection', connection);
    },

    async onReady(ctx: AppContext): Promise<void> {
      // Called after all routes are registered
    },

    async onShutdown(): Promise<void> {
      // Called in reverse order during graceful shutdown
    },
  };
}
```

```typescript
// App bootstrap using async factory
const app = await BananaApp.create(
  defineBananaAppOptions({
    modules: [...],
    plugins: [MyPlugin({ /* options */ })],
  })
);
```

## Lifecycle Order

`register()` (all plugins) → routes initialized → `onReady()` (all plugins) → `onShutdown()` (reverse)

## Rules

- Use `BananaApp.create(options)` — the async factory — for plugins; `new BananaApp(options)` is sync-only
- Plugins register on the **root** container (`ctx.container`); module-scoped providers use child containers
- `register()` and `onReady()` are the correct places for async initialization — never constructor
