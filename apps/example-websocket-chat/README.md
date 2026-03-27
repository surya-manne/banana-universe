# example-websocket-chat

Demonstrates **`@banana-universe/plugin-websocket`**: JSON messages `{ event, data }`, `@OnMessage`, and **`@WsBody(zodSchema)`** runtime validation.

## Run

```bash
npm install
npm run build
npm run start
```

Connect a WebSocket client to `ws://localhost:3000/ws` and send JSON such as:

```json
{"event":"join","data":{"roomId":"lobby"}}
{"event":"message","data":{"text":"hello"}}
```

## Tests

HTTP **`GET /health`** is covered with supertest (no live DB). WebSocket behavior is documented above.
