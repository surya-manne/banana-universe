# @banana-universe/plugin-otel

OpenTelemetry plugin for BananaJS tracing and service-level observability.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/plugin-otel @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

## Core API Surface

- `OpenTelemetryPlugin({ serviceName, exporterUrl? })`

## Minimal Working Setup

```ts
import { BananaApp } from '@banana-universe/bananajs';
import { OpenTelemetryPlugin } from '@banana-universe/plugin-otel';

await BananaApp.create({
  controllers: [],
  plugins: [
    OpenTelemetryPlugin({
      serviceName: 'banana-api',
      exporterUrl: 'http://127.0.0.1:4318/v1/traces',
    }),
  ],
});
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
