# Plugins overview

A **`BananaPlugin`** (`packages/bananajs/src/lib/Plugin/Plugin.interface.ts`) implements:

```typescript
interface BananaPlugin {
  name: string
  register(ctx: AppContext): void | Promise<void>
  onReady?(ctx: AppContext): void | Promise<void>
  onShutdown?(): void | Promise<void>
}
```

**`AppContext`** exposes the Express **`Application`**, optional **`Logger`**, and optional **awilix** **`container`**.

## Lifecycle (simplified)

1. **`register`** — attach middleware, open DB connections, start background SDKs. Runs **before** controllers are fully wired; use **`BananaApp.create`** so async `register` completes.
2. **`onReady`** — after controllers are initialized (hook for post-route work if needed).
3. **`onShutdown`** — reverse teardown (close DB, OTel SDK, WebSocket server).

## Registration

Pass **`plugins: BananaPlugin[]`** inside **`BananaAppOptions`**. Order matters: first plugin’s `register` runs first.

## Official plugins (monorepo)

| Package                             | Factory / class                                      |
| ----------------------------------- | ---------------------------------------------------- |
| `@banana-universe/plugin-typeorm`   | `TypeOrmPlugin(options)`                             |
| `@banana-universe/plugin-prisma`    | `PrismaPlugin(prismaClient)`                         |
| `@banana-universe/plugin-otel`      | `OpenTelemetryPlugin({ serviceName, exporterUrl? })` |
| `@banana-universe/plugin-zod`       | `ZodPlugin()`                                        |
| `@banana-universe/plugin-websocket` | `new WebSocketPlugin({ path?, controllers })`        |

## Related

- [Writing a plugin](/plugins/writing-a-plugin)
- [WebSocket](/plugins/websocket)
