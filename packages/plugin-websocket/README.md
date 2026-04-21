# @banana-universe/plugin-websocket

WebSocket plugin for BananaJS using ws with decorator-based handlers.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/plugin-websocket ws zod
```

## Core API Surface

- `new WebSocketPlugin({ path?, controllers })`
- `WsController`, `OnConnect`, `OnDisconnect`, `OnMessage`, `WsBody`

## Minimal Working Setup

```ts
import { z } from 'zod';
import { BananaApp } from '@banana-universe/bananajs';
import { WebSocketPlugin, WsController, OnMessage, WsBody } from '@banana-universe/plugin-websocket';

@WsController('/chat')
class ChatController {
  @OnMessage('message')
  onMessage(@WsBody(z.object({ text: z.string().min(1) })) payload: { text: string }) {
    return { ok: true, echo: payload.text };
  }
}

const wsPlugin = new WebSocketPlugin({ path: '/ws', controllers: [ChatController] });
const app = await BananaApp.create({ controllers: [], plugins: [wsPlugin] });
const server = app.getInstance().listen(3000);
wsPlugin.attachToServer(server);
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
