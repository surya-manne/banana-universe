# Writing a plugin

Implement **`BananaPlugin`** from **`@banana-universe/bananajs`**. Plugins extend the runtime — they wire middleware, open external connections, register DI tokens — without touching the core. Three examples below cover the patterns you'll meet in practice: a pure middleware plugin, a DI-registration plugin, and a full-lifecycle plugin with `onReady` and `onShutdown`.

## Example 1 — middleware-only

The simplest possible plugin: register an Express middleware. No async work, no DI, no teardown.

```typescript
import type { BananaPlugin, AppContext } from '@banana-universe/bananajs'

export function RequestTimingPlugin(): BananaPlugin {
  return {
    name: 'request-timing',
    register(ctx: AppContext) {
      ctx.app.use((req, res, next) => {
        const start = Date.now()
        res.on('finish', () => {
          ctx.logger?.info(
            `${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`,
          )
        })
        next()
      })
    },
  }
}
```

Use it with **`new BananaApp({ plugins: [RequestTimingPlugin()] })`** — synchronous registration, no need for `BananaApp.create`.

## Example 2 — DI registration (provider plugin)

When your plugin owns a shared resource (cache client, queue connection, mailer SDK), register it on the container so controllers and services can `@inject` it.

```typescript
import type { BananaPlugin, AppContext } from '@banana-universe/bananajs'
import { createClient, type RedisClientType } from 'redis'

export const REDIS_CLIENT = Symbol.for('app.redis')

export function RedisPlugin(url: string): BananaPlugin {
  let client: RedisClientType
  return {
    name: 'redis',
    async register(ctx: AppContext) {
      client = createClient({ url })
      await client.connect()
      ctx.container?.registerInstance(REDIS_CLIENT, client)
    },
    async onShutdown() {
      await client?.quit()
    },
  }
}
```

A consumer service:

```typescript
import { inject, injectable } from '@banana-universe/bananajs'
import type { RedisClientType } from 'redis'
import { REDIS_CLIENT } from './redis.plugin.js'

@injectable()
export class SessionStore {
  constructor(@inject(REDIS_CLIENT) private redis: RedisClientType) {}

  async get(key: string) {
    return this.redis.get(`session:${key}`)
  }
}
```

`async register` requires consumers to use **`await BananaApp.create(options)`**, not `new BananaApp(...)`.

## Example 3 — full lifecycle with `onReady` and `onShutdown`

Use `onReady` for work that needs to happen **after** controllers are mounted — for example, attaching a WebSocket server to the HTTP server, or seeding a cache from a route that's now registered. Use `onShutdown` to close connections cleanly so the process can exit.

```typescript
import type { BananaPlugin, AppContext } from '@banana-universe/bananajs'
import type { Server as HttpServer } from 'node:http'
import { Queue, Worker } from 'bullmq'

interface JobQueueOptions {
  connection: { host: string; port: number }
  queueName: string
}

export const JOB_QUEUE = Symbol.for('app.job-queue')

export function JobQueuePlugin(opts: JobQueueOptions): BananaPlugin {
  let queue: Queue
  let worker: Worker

  return {
    name: 'job-queue',

    async register(ctx: AppContext) {
      queue = new Queue(opts.queueName, { connection: opts.connection })
      ctx.container?.registerInstance(JOB_QUEUE, queue)
      ctx.logger?.info(`Queue '${opts.queueName}' registered`)
    },

    async onReady(_ctx: AppContext) {
      // Start the worker only after the app is fully wired —
      // jobs may resolve handlers that depend on controllers / services.
      worker = new Worker(opts.queueName, async (job) => {
        // process job…
      }, { connection: opts.connection })
    },

    async onShutdown() {
      // Reverse order: stop accepting jobs, then drain, then quit.
      await worker?.close()
      await queue?.close()
    },
  }
}
```

## Patterns and rules of thumb

- **Idempotent `register`** — guard against double registration. Plugins should be safe to compose without surprise.
- **Async needs `BananaApp.create`** — `new BananaApp(...)` is synchronous and will not await your `register`. Document the requirement on your plugin's README.
- **Token style** — use `Symbol.for('app.<resource>')` for DI tokens so they survive minification and don't collide across plugin packages.
- **Side effects** — keep `register` to opening connections and registering tokens. Long-running work belongs in `onReady` so the app finishes wiring first.
- **Tear down in reverse** — the framework runs `onShutdown` in reverse plugin order automatically. Don't try to teardown another plugin's resource from your own.
- **Peer dependencies optional** — declare integrations (`redis`, `bullmq`, `ws`, etc.) as `peerDependencies` with `peerDependenciesMeta.optional: true`. Consumers install only what they use; a missing optional peer surfaces as a startup warning, not a crash.

## Reference implementations in this repo

| Plugin | What to learn from it |
|---|---|
| [`packages/plugin-typeorm/src/index.ts`](https://github.com/surya-manne/banana-universe/tree/main/packages/plugin-typeorm/src/index.ts) | DataSource lifecycle, `@InjectRepository` decorator, container registration |
| [`packages/plugin-mongoose/src/index.ts`](https://github.com/surya-manne/banana-universe/tree/main/packages/plugin-mongoose/src/index.ts) | Session-aware `@Transactional()`, connection cleanup |
| [`packages/plugin-otel/src/index.ts`](https://github.com/surya-manne/banana-universe/tree/main/packages/plugin-otel/src/index.ts) | NodeSDK bootstrap, auto-instrumentation, graceful SDK shutdown |
| [`packages/plugin-websocket/src/index.ts`](https://github.com/surya-manne/banana-universe/tree/main/packages/plugin-websocket/src/index.ts) | `onReady` for attaching the WS server to the HTTP server |
| [`packages/plugin-ai/src/index.ts`](https://github.com/surya-manne/banana-universe/tree/main/packages/plugin-ai/src/index.ts) | Provider-pattern DI registration (`LlmProvider` token) |

## Related

- [Plugins overview](/plugins/overview)
- [WebSocket plugin](/plugins/websocket)
- [Dependency injection](/guide/dependency-injection)
- [TypeDoc: `BananaPlugin`](/api/interfaces/BananaPlugin)
