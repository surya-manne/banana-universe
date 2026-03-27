# Code Map

This file maps the workspace structure and describes each module's purpose.

## Workspace Structure

```
banana-universe/
├── apps/
│   └── bananajs-demo/              # Demo Express app using @banana-universe/bananajs
│       └── src/
│           ├── main.ts             # Entry point; creates BananaApp and starts server
│           ├── routes.ts           # Registers all controllers
│           └── App/
│               └── User/
│                   ├── User.controller.ts   # User resource endpoints (CRUD)
│                   └── User.dto.ts          # DTOs for request validation
├── packages/
│   ├── ddd/                        # DDD primitives (@banana-universe/ddd): Entity, Repository, layer decorators
│   ├── bananajs/                   # Core framework library (@banana-universe/bananajs)
│   │   └── src/
│   │       ├── index.ts            # Public API barrel export
│   │       ├── lib/
│   │       │   ├── Core/
│   │       │   │   └── App.ts      # BananaApp class; wires Express + controllers
│   │       │   ├── Router/
│   │       │   │   ├── Route.decorator.ts       # HTTP method decorators (Get, Post, Put, Patch, Delete)
│   │       │   │   ├── Controller.decorator.ts  # @Controller decorator (sets base path)
│   │       │   │   └── MetaData.constants.ts    # Reflect.metadata keys
│   │       │   ├── Validator/
│   │       │   │   └── Validator.decorator.ts   # @Body, @Params, @Query decorators
│   │       │   └── Response/
│   │       │       ├── ApiResponse.ts           # SuccessResponse + HTTP error responses
│   │       │       └── ApiError.ts              # ApiError abstract + typed error classes
│   │       └── Middleware/
│   │           ├── Error.middleware.ts          # Express error handling middleware
│   │           └── FileUpload.middleware.ts     # File upload middleware
│   └── bananajs-cli/               # CLI package (@banana-universe/bananajs-cli)
│       └── src/
│           ├── index.ts
│           └── lib/
│               └── bananajs-cli.ts  # Placeholder CLI entry
├── agents/
│   ├── init-workspace-flow-state.md  # Rosetta init flow state tracking
│   └── TEMP/                         # Temporary files (not committed)
├── docs/                             # Rosetta documentation files
├── .cursor/                          # Cursor IDE AI configuration
│   ├── rules/agents.mdc              # Bootstrap rule (always applied)
│   ├── skills/                       # Rosetta skill shells
│   └── agents/                       # Rosetta agent shells
├── .verdaccio/config.yml             # Local npm registry config
├── nx.json                           # Nx workspace config
├── package.json                      # Root npm workspaces + shared deps
├── tsconfig.base.json                # Shared TypeScript base config
└── eslint.config.mjs                 # Root ESLint config
```

## Key Module Responsibilities

### BananaApp (Core)

- Initializes Express with JSON/URL-encoded body parsing
- Accepts controller classes and optional middlewares in constructor
- Reads `@Controller` and HTTP method decorator metadata via `reflect-metadata`
- Registers routes on Express Router per controller
- Attaches global error middleware at the end

### Decorator System

- `@Controller(path)` — sets base path on controller class via metadata
- `@Get/@Post/@Put/@Patch/@Delete(path, middlewares?)` — registers routes via metadata
- `@Body/@Params/@Query/Headers(zodSchema)` — validates request segments with Zod `safeParse`

### Response System

- `ApiResponse` — abstract base with `statusCode`, HTTP `status`, `message`
- `SuccessResponse<T>` — extends `ApiResponse` with `data: T`; sends via `.send(res)`
- Error responses — one class per HTTP error status code

### Error System

- `ApiError` (abstract) — extends `Error`, carries `ErrorType` enum
- Concrete error classes: `BadRequestError`, `NotFoundError`, `InternalError`, etc.
- `ApiError.handle(err, res)` — static dispatcher returning typed response
- `ErrorMiddleware` — Express 4-arg error middleware calling `ApiError.handle`
