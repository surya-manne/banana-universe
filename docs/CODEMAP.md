# Code Map

Workspace structure and module responsibilities for banana-universe monorepo.

## Workspace Structure

```
banana-universe/
├── packages/
│   ├── bananajs/                        # Core framework (@banana-universe/bananajs v0.6.0)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── lib/
│   │       │   ├── Core/
│   │       │   │   └── App.ts           # BananaApp class, async plugin lifecycle
│   │       │   ├── Router/
│   │       │   │   ├── Controller.decorator.ts
│   │       │   │   ├── Route.decorator.ts
│   │       │   │   ├── route-path.ts
│   │       │   │   └── MetaData.constants.ts
│   │       │   ├── Validator/
│   │       │   │   └── Validator.decorator.ts  # @Body/@Query/@Params/@Headers (Zod)
│   │       │   ├── Controller/
│   │       │   │   └── BaseController.ts       # ok()/error() helpers
│   │       │   ├── Response/
│   │       │   │   ├── ApiResponse.ts
│   │       │   │   └── ApiError.ts
│   │       │   ├── DI/
│   │       │   │   ├── BananaModule.ts          # createModule()
│   │       │   │   ├── Injectable.decorator.ts  # injectable()/inject() re-exports
│   │       │   │   ├── bananaBootstrap.ts
│   │       │   │   └── registerProviders.ts
│   │       │   ├── Auth/
│   │       │   │   ├── Auth.decorator.ts
│   │       │   │   ├── AuthGuard.interface.ts
│   │       │   │   └── auth.middleware.ts
│   │       │   ├── Security/
│   │       │   │   ├── Can.decorator.ts         # @Can ABAC decorator
│   │       │   │   ├── AbacGuard.interface.ts
│   │       │   │   ├── Sanitize.decorator.ts    # @Sanitize HTML strip
│   │       │   │   └── Throttle.decorator.ts    # @Throttle per-route rate limit
│   │       │   ├── Tenant/
│   │       │   │   ├── Tenant.decorator.ts
│   │       │   │   └── TenantContext.ts         # AsyncLocalStorage tenant context
│   │       │   ├── Cache/
│   │       │   │   ├── Cache.decorator.ts
│   │       │   │   ├── CacheEvict.decorator.ts
│   │       │   │   └── CacheManager.ts
│   │       │   ├── Config/
│   │       │   │   └── BananaConfig.ts          # Config with .reload()/.onSecretRotated()
│   │       │   ├── Logger/
│   │       │   │   ├── Logger.interface.ts
│   │       │   │   └── PinoLogger.ts
│   │       │   ├── Metrics/
│   │       │   │   └── metrics.middleware.ts    # Prometheus /metrics endpoint
│   │       │   ├── Health/
│   │       │   │   └── health.middleware.ts
│   │       │   ├── OpenAPI/
│   │       │   │   ├── ApiDoc.decorators.ts
│   │       │   │   ├── schema.extractor.ts
│   │       │   │   └── swagger.setup.ts
│   │       │   ├── Pagination/
│   │       │   │   └── Pagination.ts
│   │       │   ├── RateLimit/
│   │       │   │   └── RateLimit.decorator.ts
│   │       │   ├── Upload/
│   │       │   │   └── Upload.decorator.ts
│   │       │   ├── DevTools/
│   │       │   │   └── devtools.middleware.ts   # GET /_banana/routes (dev only)
│   │       │   ├── Plugin/
│   │       │   │   └── Plugin.interface.ts
│   │       │   ├── Context/
│   │       │   │   └── RequestContext.ts
│   │       │   └── Adapter/
│   │       │       └── FrameworkAdapter.ts
│   │       ├── Middleware/
│   │       │   ├── Error.middleware.ts
│   │       │   └── FileUpload.middleware.ts
│   │       └── testing/
│   │           ├── BananaTestApp.ts
│   │           └── index.ts
│   ├── bananajs-cli/                    # CLI (@banana-universe/bananajs-cli v0.3.0)
│   │   └── src/
│   │       ├── index.ts
│   │       └── lib/
│   │           ├── bananajs-cli.ts      # CLI entry (commander root)
│   │           ├── ai.ts               # `bananajs ai` command group
│   │           ├── generate.ts         # `bananajs generate`
│   │           ├── generate-module.ts
│   │           ├── generate-ai-module.ts
│   │           ├── migrate.ts          # `bananajs migrate` Express codemod
│   │           ├── routes.ts           # `bananajs routes` AST scanner
│   │           ├── openapi.ts          # `bananajs openapi export`
│   │           ├── db.ts               # `bananajs db --status`
│   │           ├── create-app.ts
│   │           ├── create-app-presets.ts
│   │           ├── bootstrap-patch.ts
│   │           ├── schema-parse.ts
│   │           ├── preset-orm.ts
│   │           ├── format-prettier.ts
│   │           ├── ai-module.ts
│   │           ├── ai-setup.ts
│   │           ├── ai-explain.ts
│   │           ├── ai-review-run.ts
│   │           ├── ai-review-sarif.ts
│   │           ├── ai-review-schema.ts
│   │           ├── ai-test-scaffold.ts
│   │           ├── ai-wire.ts
│   │           ├── llm/
│   │           │   ├── LlmProvider.ts
│   │           │   ├── VercelAiProvider.ts
│   │           │   ├── OllamaProvider.ts
│   │           │   ├── LlamaCppProvider.ts
│   │           │   ├── provider.factory.ts
│   │           │   ├── bananajs-ai-rules.ts
│   │           │   ├── bananarc.ts
│   │           │   ├── entity-extraction.ts
│   │           │   ├── fetch-with-retry.ts
│   │           │   └── prompts/
│   │           │       ├── extraction.ts
│   │           │       ├── generate-from-prompt.ts
│   │           │       └── review-json.ts
│   │           ├── templates/
│   │           │   └── legacy-scaffold.ts
│   │           └── utils/
│   │               ├── naming.ts
│   │               └── type-mapping.ts
│   ├── ddd/                             # DDD primitives (@banana-universe/ddd v0.1.0)
│   │   └── src/
│   │       ├── Entity.ts
│   │       ├── AggregateRoot.ts
│   │       ├── ValueObject.ts
│   │       ├── DomainEvent.ts
│   │       ├── Repository.ts
│   │       ├── UnitOfWork.ts
│   │       └── decorators/
│   │           └── ApplicationService.decorator.ts
│   ├── adapter-fastify/                 # Fastify adapter stub (v0.0.1, deferred to v2.x)
│   │   └── src/
│   │       ├── FastifyAdapter.ts
│   │       └── index.ts
│   ├── plugin-mongoose/                 # Mongoose plugin (v0.1.0)
│   │   └── src/
│   │       ├── MongooseRepositoryAdapter.ts
│   │       ├── MongooseUnitOfWork.ts
│   │       └── index.ts
│   ├── plugin-typeorm/                  # TypeORM plugin (v0.1.0)
│   │   └── src/
│   │       ├── TypeOrmRepositoryAdapter.ts
│   │       ├── TypeOrmUnitOfWork.ts
│   │       └── index.ts
│   ├── plugin-otel/                     # OpenTelemetry plugin (v0.1.0)
│   │   └── src/
│   │       └── index.ts
│   ├── plugin-websocket/                # WebSocket plugin (v0.1.0)
│   │   └── src/
│   │       ├── WebSocketPlugin.ts
│   │       ├── WsDecorators.ts
│   │       ├── WsMetadata.ts
│   │       ├── WsRouter.ts
│   │       └── index.ts
├── apps/
│   ├── example-rest-postgresql/         # REST + PostgreSQL example (TypeORM)
│   ├── example-rest-mongodb/            # REST + MongoDB example (Mongoose)
│   ├── example-rest-dual-orm/           # REST with both TypeORM + Mongoose
│   ├── example-multitenant/             # Multi-tenant example (x-tenant-id header)
│   ├── example-fastify/                 # Fastify bridge recipe (@fastify/express)
│   ├── example-websocket-chat/          # WebSocket chat (plugin-websocket)
│   └── benchmarks/                      # autocannon benchmark suite
│       └── src/
│           └── report.ts               # 10% p99 regression gate
├── agents/
│   ├── IMPLEMENTATION.md               # Current implementation state + change log
│   ├── MEMORY.md                       # Agent preventive rules + lessons learned
│   ├── init-workspace-flow-state.md    # Rosetta init flow state tracking
│   └── TEMP/                           # Temporary subagent coordination (not committed)
├── docs/                               # Rosetta documentation files
│   ├── CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── ASSUMPTIONS.md
│   ├── TECHSTACK.md
│   ├── DEPENDENCIES.md
│   ├── CODEMAP.md
│   ├── TODO.md
│   └── PATTERNS/
│       ├── INDEX.md
│       ├── CHANGES.md
│       └── [per-pattern .md files]
├── plans/                              # Approved roadmap plans (read-only)
├── .github/
│   ├── copilot-instructions.md         # Rosetta R2 bootstrap + workspace instructions
│   ├── mcp.json                        # Rosetta MCP server config (GitHub Copilot)
│   ├── agents/                         # Copilot custom agents (R2 ACQUIRE shells)
│   └── skills/                         # Copilot skills (R2 ACQUIRE shells)
├── .cursor/
│   ├── rules/agents.mdc                # Bootstrap rule (always applied)
│   ├── agents/                         # Cursor agent shells
│   └── skills/                         # Cursor skill shells
├── .vscode/
│   └── mcp.json                        # Rosetta MCP server config (VS Code)
├── nx.json
├── package.json
├── tsconfig.base.json
└── eslint.config.mjs
```

## Key Module Responsibilities

### BananaApp (Core)

- `BananaApp.create(options)` — async factory for plugin lifecycle; `new BananaApp(options)` for sync-only
- Wires Express + tsyringe child containers per module (`createModule`)
- Routes: `@Controller('segment')` + `@Get/@Post/...('segment')` — no leading slashes
- `defineBananaAppOptions({ modules, providers, ... })` for typed config
- `BananaTestApp.create` + `testOverrides` for integration testing

### Module System (DI)

- `createModule({ id, controller, providers })` — one tsyringe child container per module
- `injectable()` / `inject()` re-exported from `@banana-universe/bananajs`
- Plugins register shared tokens on root container only

### Validation & Security

- `@Body/@Query/@Params/@Headers(zodSchema)` — Zod `safeParse`, no class-validator
- `@Can('action', 'resource')` — ABAC decorator + `AbacGuard` interface
- `@Sanitize()` — lazy `sanitize-html` strips HTML from string body fields
- `@Throttle({ windowMs, max, keyBy })` — per-user/IP rate limiting via JWT `sub`

### Multi-Tenancy

- `@Tenant()` decorator + `TenantContext` (AsyncLocalStorage)
- `createTenantMiddleware()` — extracts from `x-tenant-id` header or JWT `tid` claim
- Cache keys auto-namespaced per tenant
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
│   ├── IMPLEMENTATION.md               # Current implementation state + change log
│   ├── MEMORY.md                       # Agent preventive rules + lessons learned
│   ├── init-workspace-flow-state.md    # Rosetta init flow state tracking
│   └── TEMP/                           # Temporary subagent coordination (not committed)
├── docs/                               # Rosetta documentation files
├── .cursor/
│   ├── rules/agents.mdc                # Bootstrap rule (always applied)
│   ├── skills/                         # Cursor skill shells
│   └── agents/                         # Cursor agent shells
├── .github/
│   ├── copilot-instructions.md         # R2 bootstrap + workspace instructions
│   ├── agents/                         # Copilot custom agents
│   └── skills/                         # Copilot skills
├── .vscode/
│   └── mcp.json                        # Rosetta MCP config
├── nx.json
├── package.json
├── tsconfig.base.json
└── eslint.config.mjs
```
