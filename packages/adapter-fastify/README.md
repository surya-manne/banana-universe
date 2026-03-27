# @banana-universe/adapter-fastify

**Status: Exploration stub — v0.0.1. All methods throw "Not yet implemented."**

## What it is

`@banana-universe/adapter-fastify` is an implementation of the `FrameworkAdapter` interface from `@banana-universe/bananajs` targeting [Fastify](https://fastify.dev/). It exists to prove that BananaJS can be made framework-agnostic by abstracting the HTTP layer behind a single interface.

## Why it exists

BananaJS currently sits on top of Express. The `FrameworkAdapter` interface (introduced in Phase 4) decouples the routing, middleware, and listening responsibilities from Express so that alternative adapters — like this one for Fastify — can be plugged in without changing application code.

This package is the first proof of concept for that idea.

## Current limitations

All methods on `FastifyAdapter` throw `Error('FastifyAdapter: Not yet implemented.')`. The class satisfies the `FrameworkAdapter` contract at the type level only. **Do not use this in production.**

```typescript
import { FastifyAdapter } from '@banana-universe/adapter-fastify'

const adapter = new FastifyAdapter()
adapter.listen(3000) // throws: FastifyAdapter: Not yet implemented.
```

## Future roadmap

Full Fastify support is targeted for **v2.x** of BananaJS (estimated Q4 2026):

1. Implement `addRoute` — register routes on a Fastify instance with Express-compatible middleware shim
2. Implement `use` — mount Express middleware via `@fastify/express` compatibility layer or native Fastify hooks
3. Implement `listen` — start the Fastify server
4. Implement `getInstance` — return the underlying Fastify instance
5. Publish integration tests validating parity with the Express adapter
6. Document migration guide from Express-default BananaJS to `adapter-fastify`

## What the API will look like (once implemented)

```typescript
import BananaApp from '@banana-universe/bananajs'
import { FastifyAdapter } from '@banana-universe/adapter-fastify'
import { UserController } from './controllers/UserController'

const app = await BananaApp.create([UserController], {
  adapter: new FastifyAdapter(),
})

app.getInstance() // returns the Fastify instance
```

## Peer dependencies

- `@banana-universe/bananajs` >= 0.4.0

## License

MIT
