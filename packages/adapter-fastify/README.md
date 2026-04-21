# @banana-universe/adapter-fastify

Experimental Fastify adapter package for BananaJS. Not production-ready.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/adapter-fastify
```

## Current API Surface

- `FastifyAdapter` implements `FrameworkAdapter`
- Methods currently throw `Not yet implemented`

## Exploration Snippet

```ts
import { FastifyAdapter } from '@banana-universe/adapter-fastify';

const adapter = new FastifyAdapter();

try {
  adapter.listen(3000);
} catch (error) {
  // expected for now: adapter is still a stub
}
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
