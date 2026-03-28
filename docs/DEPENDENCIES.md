# Dependencies

This file lists all dependencies for each module in the banana-universe monorepo.

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

## packages/bananajs

### Runtime Dependencies

| Package            | Version | Purpose                        |
| ------------------ | ------- | ------------------------------ |
| cors               | ^2.8.5  | CORS middleware                |
| helmet             | ^8.1.0  | Security headers               |
| reflect-metadata   | ^0.2.2  | Decorator metadata polyfill    |
| tslib              | ^2.3.0  | TypeScript helpers             |
| zod                | ^3.24.0 | Request validation schemas     |
| zod-to-json-schema | ^3.24.0 | OpenAPI JSON Schema from Zod   |
| tsyringe           | ^4.8.0  | Dependency injection container |

### Peer Dependencies (required by consumers)

| Package | Version | Purpose                         |
| ------- | ------- | ------------------------------- |
| express | ^4.21.2 | HTTP server (peer, not bundled) |

---

## packages/bananajs-cli

### Dependencies

- None beyond workspace shared devDependencies (TypeScript, Nx tooling)

---

## apps/bananajs-demo

### Key Dependencies (inherited from workspace)

| Package                   | Purpose                   |
| ------------------------- | ------------------------- |
| @banana-universe/bananajs | Local framework package   |
| express                   | HTTP server               |
| zod                       | Request validation        |
| reflect-metadata          | Decorator support         |
| webpack                   | Bundler (via @nx/webpack) |
