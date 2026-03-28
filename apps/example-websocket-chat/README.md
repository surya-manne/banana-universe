# example-websocket-chat

**[BananaJS](https://surya-manne.github.io/banana-universe/)** is a TypeScript framework on Express—decorator routing, Zod validation, and feature modules via `createModule` under `src/modules/<feature>/`. HTTP routes and WebSocket handlers are organized by feature folder. This repo’s runnable recipes live under [`apps/`](https://github.com/surya-manne/banana-universe/tree/main/apps).

Demonstrates **`@banana-universe/plugin-websocket`**: JSON messages `{ event, data }`, `@OnMessage`, and **`@WsBody(zodSchema)`** runtime validation.

## Scripts

| Script                                    | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `npm run dev`                             | `tsx watch` — develop with hot reload |
| `npm run build`                           | Compile to `dist/`                    |
| `npm start`                               | Run compiled server                   |
| `npm run lint` / `npm run lint:fix`       | ESLint (type-aware)                   |
| `npm run format` / `npm run format:check` | Prettier                              |

The **BananaJS CLI** (`@banana-universe/bananajs-cli`) is included as a devDependency for `bananajs` commands.

## Run

```bash
npm install
npm run dev
# or: npm run build && npm start
```

Environment variables are loaded with **`dotenv`** at startup (`import 'dotenv/config'` in `main.ts`).

Connect a WebSocket client to `ws://localhost:3000/ws` and send JSON such as:

```json
{"event":"join","data":{"roomId":"lobby"}}
{"event":"message","data":{"text":"hello"}}
```

## Tests

HTTP **`GET /health`** is covered with supertest (no live DB). WebSocket behavior is documented above.
