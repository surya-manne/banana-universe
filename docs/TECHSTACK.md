# Tech Stack

This file describes the technology stack used across all modules in the banana-universe monorepo.

## Workspace

| Category        | Technology       | Version |
| --------------- | ---------------- | ------- |
| Monorepo tool   | Nx               | 20.6.4  |
| Package manager | npm (workspaces) | —       |
| Language        | TypeScript       | ~5.7.2  |
| Runtime         | Node.js          | ≥20     |

## packages/bananajs — Core Framework Library

| Category            | Technology                | Version |
| ------------------- | ------------------------- | ------- |
| Language            | TypeScript                | ~5.7.2  |
| HTTP framework      | Express                   | ^4.21.2 |
| Metadata/Decorators | reflect-metadata          | ^0.2.2  |
| Validation          | zod                       | ^3.24.0 |
| Bundler             | Nx JS (SWC)               | —       |
| Build output        | CommonJS + ESM dual       | —       |
| Published as        | @banana-universe/bananajs | 0.5.0   |

## packages/bananajs-cli — CLI Package

| Category     | Technology                      | Version |
| ------------ | ------------------------------- | ------- |
| Language     | TypeScript                      | ~5.7.2  |
| Published as | @banana-universe/bananajs-cli   | —       |
| Status       | Placeholder / early development | —       |

## apps/bananajs-demo — Demo Application

| Category   | Technology                          | Version |
| ---------- | ----------------------------------- | ------- |
| Language   | TypeScript                          | ~5.7.2  |
| Framework  | @banana-universe/bananajs (Express) | local   |
| Bundler    | Webpack (via @nx/webpack)           | —       |
| Validation | zod                                 | ^3.24.0 |

## Shared Tooling

| Category          | Technology                                     | Version           |
| ----------------- | ---------------------------------------------- | ----------------- |
| Linting           | ESLint 9 + typescript-eslint                   | ^9.8.0 / ^8.19.0  |
| Formatting        | Prettier                                       | ^2.6.2            |
| Compiler          | SWC (@swc/core)                                | ~1.5.7            |
| Local registry    | Verdaccio                                      | ^6.0.5            |
| Decorator support | experimentalDecorators + emitDecoratorMetadata | TypeScript config |
