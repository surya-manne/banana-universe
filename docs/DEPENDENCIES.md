# Dependencies

Direct dependencies for each module in the banana-universe monorepo.

## Root Workspace (package.json)

### Runtime Dependencies

| Package          | Version | Purpose                                |
| ---------------- | ------- | -------------------------------------- |
| axios            | ^1.6.0  | HTTP client (shared/demo use)          |
| express          | ^4.21.2 | HTTP server framework                  |
| reflect-metadata | ^0.2.2  | Decorator metadata reflection polyfill |
| zod              | ^3.24.0 | Schema validation (shared with apps)   |

### Dev Dependencies

| Package                                | Version         | Purpose                                         |
| -------------------------------------- | --------------- | ----------------------------------------------- |
| @nx/eslint, @nx/eslint-plugin          | 20.6.4          | Nx ESLint integration                           |
| @nx/express                            | 20.6.4          | Nx Express app generator                        |
| @nx/js, @nx/node, @nx/web, @nx/webpack | 20.6.4          | Nx build executors                              |
| @swc-node/register, @swc/core          | ~1.9.1 / ~1.5.7 | SWC fast TypeScript transpiler                  |
| @swc/helpers                           | ~0.5.11         | SWC runtime helpers                             |
| @types/express                         | ^4.17.21        | Express TypeScript types                        |
| @types/node                            | ~18.16.9        | Node.js TypeScript types                        |
| eslint                                 | ^9.8.0          | Linter                                          |
| eslint-config-prettier                 | ^9.0.0          | Disables ESLint rules conflicting with Prettier |
| jsonc-eslint-parser                    | ^2.1.0          | JSONC parser for ESLint                         |
| nx                                     | 20.6.4          | Monorepo build system                           |
| prettier                               | ^2.6.2          | Code formatter                                  |
| tslib                                  | ^2.3.0          | TypeScript runtime helpers                      |
| typescript                             | ~5.7.2          | TypeScript compiler                             |
| typescript-eslint                      | ^8.19.0         | TypeScript ESLint rules                         |
| verdaccio                              | ^6.0.5          | Local npm registry for testing publishing       |
| webpack-cli                            | ^5.1.4          | Webpack CLI                                     |

---

## packages/bananajs v0.6.0

### Runtime Dependencies

| Package            | Version  | Purpose                            |
| ------------------ | -------- | ---------------------------------- |
| cors               | ^2.8.5   | CORS middleware                    |
| helmet             | ^8.1.0   | Security headers                   |
| pino               | ^9.6.0   | Structured JSON logger             |
| reflect-metadata   | ^0.2.2   | Decorator metadata polyfill        |
| tsyringe           | ^4.8.0   | Dependency injection container     |
| tslib              | ^2.3.0   | TypeScript helpers                 |
| uuid               | ^8.3.2   | Unique ID generation               |
| zod                | ^3.24.0  | Request validation schemas         |
| zod-to-json-schema | ^3.24.0  | OpenAPI JSON Schema from Zod       |

### Peer Dependencies (optional unless noted)

| Package                      | Version  | Purpose                         |
| ---------------------------- | -------- | ------------------------------- |
| express                      | ^4.21.2  | HTTP server (required)          |
| express-rate-limit           | >=7.0.0  | Rate limiting (`@Throttle`)     |
| multer                       | >=1.4.0  | File uploads                    |
| prom-client                  | >=15.0.0 | Prometheus metrics              |
| sanitize-html                | >=2.0.0  | HTML sanitization (`@Sanitize`) |
| swagger-ui-express           | >=5.0.0  | Swagger UI endpoint             |
| @scalar/express-api-reference | >=0.8.0 | Scalar API reference UI         |

---

## packages/bananajs-cli v0.3.0

### Runtime Dependencies

| Package                   | Version   | Purpose                             |
| ------------------------- | --------- | ----------------------------------- |
| @banana-universe/bananajs | *         | Framework peer                      |
| chalk                     | 4.1.2     | Terminal color output               |
| commander                 | ^7.2.0    | CLI argument parsing                |
| inquirer                  | ^12.5.2   | Interactive prompts                 |
| openapi-typescript        | >=7.0.0   | OpenAPI → TypeScript type generation|
| tslib                     | ^2.3.0    | TypeScript helpers                  |
| zod                       | ^3.22.0   | Schema validation                   |

### Peer Dependencies (optional AI features)

| Package           | Version  | Purpose                  |
| ----------------- | -------- | ------------------------ |
| @ai-sdk/anthropic | >=1.0.0  | Anthropic LLM provider   |
| @ai-sdk/openai    | >=1.0.0  | OpenAI LLM provider      |
| ai                | >=4.0.0  | Vercel AI SDK core       |

---

## packages/ddd v0.1.0

### Peer Dependencies

| Package                   | Version | Purpose             |
| ------------------------- | ------- | ------------------- |
| @banana-universe/bananajs | *       | DI container access |
| reflect-metadata          | ^0.2.2  | Decorator support   |

---

## packages/plugin-mongoose v0.1.0

### Peer Dependencies

| Package                   | Version | Purpose             |
| ------------------------- | ------- | ------------------- |
| @banana-universe/bananajs | *       | Plugin interface    |
| @banana-universe/ddd      | *       | Repository adapters |
| mongoose                  | *       | MongoDB ODM         |

---

## packages/plugin-typeorm v0.1.0

### Peer Dependencies

| Package                   | Version | Purpose             |
| ------------------------- | ------- | ------------------- |
| @banana-universe/bananajs | *       | Plugin interface    |
| @banana-universe/ddd      | *       | Repository adapters |
| typeorm                   | *       | SQL ORM             |

---

## packages/plugin-otel v0.1.0

### Peer Dependencies

| Package                                   | Version | Purpose                |
| ----------------------------------------- | ------- | ---------------------- |
| @banana-universe/bananajs                 | *       | Plugin interface       |
| @opentelemetry/api                        | *       | OTel API               |
| @opentelemetry/auto-instrumentations-node | *       | Auto-instrumentation   |
| @opentelemetry/sdk-node                   | *       | OTel Node.js SDK       |

---

## packages/plugin-websocket v0.1.0

### Peer Dependencies

| Package                   | Version | Purpose           |
| ------------------------- | ------- | ----------------- |
| @banana-universe/bananajs | *       | Plugin interface  |
| ws                        | *       | WebSocket library |
| zod                       | *       | Message validation|

---

## packages/plugin-zod v0.1.0

### Peer Dependencies

| Package                   | Version | Purpose          |
| ------------------------- | ------- | ---------------- |
| @banana-universe/bananajs | *       | Plugin interface |
| zod                       | *       | Zod schema core  |

---

## packages/adapter-fastify v0.0.1

### Peer Dependencies

| Package                   | Version | Purpose         |
| ------------------------- | ------- | --------------- |
| @banana-universe/bananajs | *       | Framework types |
