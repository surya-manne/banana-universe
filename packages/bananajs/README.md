# @banana-universe/bananajs

Opinionated Node.js framework built on Express with decorators, Zod validation, tsyringe DI, and plugin-based extensibility.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/bananajs zod
```

## Core API Surface

- Routing decorators: `Controller`, `Get`, `Post`, `Put`, `Patch`, `Delete`
- Validation decorators: `Body`, `Query`, `Params`, `Headers`
- App bootstrap: `BananaApp`, `createBananaApplication`
- DI helpers: `createModule`, `defineBananaAppOptions`, `defineBananaControllers`

## Minimal Working Setup

```ts
import { z } from 'zod';
import { BananaApp, Controller, Get, Post, Body } from '@banana-universe/bananajs';

const createUserSchema = z.object({ name: z.string().min(1) });

@Controller('users')
class UserController {
  @Get('health')
  health() {
    return { ok: true };
  }

  @Post('')
  create(@Body(createUserSchema) body: z.infer<typeof createUserSchema>) {
    return { id: 1, ...body };
  }
}

new BananaApp({ controllers: [UserController] }).getInstance();
```

## Plugin-Friendly Async Bootstrap

```ts
import { BananaApp, defineBananaControllers } from '@banana-universe/bananajs';

await BananaApp.create({
  controllers: defineBananaControllers(UserController),
  plugins: [],
});
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/
- Architecture reference: ../../docs/ARCHITECTURE.md

## License

MIT
