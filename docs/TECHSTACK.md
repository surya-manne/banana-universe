# Tech Stack

Technology stack across all modules in the banana-universe monorepo.

## Workspace

| Category        | Technology       | Version |
| --------------- | ---------------- | ------- |
| Monorepo tool   | Nx               | 20.6.4  |
| Package manager | npm (workspaces) | —       |
| Language        | TypeScript       | ~5.7.2  |
| Runtime         | Node.js          | ≥20     |
| Decorator mode  | experimentalDecorators + emitDecoratorMetadata | tsconfig |

## packages/bananajs — Core Framework

| Category            | Technology                | Version |
| ------------------- | ------------------------- | ------- |
| Published as        | @banana-universe/bananajs | 0.6.0   |
| HTTP framework      | Express                   | ^4.21.2 |
| DI container        | tsyringe                  | ^4.8.0  |
| Validation          | zod                       | ^3.24.0 |
| OpenAPI schema      | zod-to-json-schema        | ^3.24.0 |
| Logger              | pino                      | ^9.6.0  |
| Metadata            | reflect-metadata          | ^0.2.2  |
| Build output        | CommonJS + ESM dual (SWC) | —       |

## packages/bananajs-cli — CLI

| Category     | Technology                    | Version |
| ------------ | ----------------------------- | ------- |
| Published as | @banana-universe/bananajs-cli | 0.3.0   |
| CLI engine   | commander                     | ^7.2.0  |
| Prompts      | inquirer                      | ^12.5.2 |
| LLM SDK      | Vercel AI SDK (`ai`)          | peer >=4.0 |
| OpenAPI gen  | openapi-typescript            | >=7.0.0 |
| Status       | Active — generate, AI, migrate, routes, openapi commands |

## packages/ddd — DDD Primitives

| Category     | Technology              | Version |
| ------------ | ----------------------- | ------- |
| Published as | @banana-universe/ddd    | 0.1.0   |
| Exports      | Entity, AggregateRoot, ValueObject, DomainEvent, Repository, UnitOfWork |

## packages/adapter-fastify — Fastify Adapter

| Category     | Technology                         | Version |
| ------------ | ---------------------------------- | ------- |
| Published as | @banana-universe/adapter-fastify   | 0.0.1   |
| Status       | Exploration stub — deferred to v2.x |

## packages/plugin-mongoose

| Category     | Technology                          | Version |
| ------------ | ----------------------------------- | ------- |
| Published as | @banana-universe/plugin-mongoose    | 0.1.0   |
| Peer dep     | mongoose                            | optional |

## packages/plugin-typeorm

| Category     | Technology                          | Version |
| ------------ | ----------------------------------- | ------- |
| Published as | @banana-universe/plugin-typeorm     | 0.1.0   |
| Peer dep     | typeorm                             | optional |

## packages/plugin-otel

| Category     | Technology                          | Version |
| ------------ | ----------------------------------- | ------- |
| Published as | @banana-universe/plugin-otel        | 0.1.0   |
| Peer deps    | @opentelemetry/sdk-node, @opentelemetry/api, @opentelemetry/auto-instrumentations-node | optional |

## packages/plugin-websocket

| Category     | Technology                          | Version |
| ------------ | ----------------------------------- | ------- |
| Published as | @banana-universe/plugin-websocket   | 0.1.0   |
| Peer dep     | ws                                  | optional |

## Shared Tooling

| Category       | Technology                   | Version          |
| -------------- | ---------------------------- | ---------------- |
| Linting        | ESLint 9 + typescript-eslint | ^9.8.0 / ^8.19.0 |
| Formatting     | Prettier                     | ^2.6.2           |
| Compiler       | SWC (@swc/core)              | ~1.5.7           |
| Local registry | Verdaccio                    | ^6.0.5           |
