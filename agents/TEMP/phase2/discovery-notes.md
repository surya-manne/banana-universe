# Phase 2 Discovery Notes — BananaJS Enterprise Roadmap

## File Structure — `packages/bananajs/src/`

```
src/
├── index.ts                          # Main public API entry point
├── Middleware/
│   ├── Error.middleware.ts           # createErrorMiddleware factory + ErrorMiddleware export
│   └── FileUpload.middleware.ts      # EMPTY FILE — stub only
├── lib/
│   ├── Context/
│   │   └── RequestContext.ts         # AsyncLocalStorage-based request context
│   ├── Core/
│   │   └── App.ts                    # BananaApp class, BananaRouter fn, BananaAppOptions, RouteInfo
│   ├── DI/
│   │   └── Injectable.decorator.ts   # @Injectable decorator + isInjectable helper
│   ├── Logger/
│   │   ├── Logger.interface.ts       # Logger interface (info/warn/error/debug)
│   │   └── PinoLogger.ts             # PinoLogger implements Logger
│   ├── Response/
│   │   ├── ApiError.ts               # ApiError abstract + 11 concrete error classes + ErrorType enum
│   │   └── ApiResponse.ts            # ApiResponse abstract + SuccessResponse + 11 response classes
│   ├── Router/
│   │   ├── Controller.decorator.ts   # @Controller(basePath)
│   │   ├── MetaData.constants.ts     # MetadataKeys enum (BASE_PATH, ROUTERS)
│   │   └── Route.decorator.ts        # methodDecoratorFactory + Get/Post/Put/Patch/Delete + IRouter + HTTPMethod
│   └── Validator/
│       └── Validator.decorator.ts    # validationFactory + Body/Query/Params/Headers + ValidationSource
└── testing/
    ├── BananaTestApp.ts              # BananaTestApp class with static create() + inject() + agent
    └── index.ts                      # re-exports BananaTestApp
```

## Public API Exports (`src/index.ts`)

Exports: `BananaApp` (default + named), `BananaRouter`, `BananaAppOptions`, `RouteInfo`, `Constructor`, route decorators, controller decorator, validation decorators, response/error hierarchy, `Logger`, `PinoLogger`, `RequestContext`, `requestContextMiddleware`, `RequestContextData`, `Injectable`, `isInjectable`, `createErrorMiddleware`, `ErrorMiddleware`.

Subpath `@banana-universe/bananajs/testing`: exports `BananaTestApp`, `InjectConfig`.

## `BananaAppOptions` Interface — Current Fields

```typescript
interface BananaAppOptions {
  middlewares?: RequestHandler[]
  security?: {
    helmet?: boolean | Parameters<typeof helmet>[0]
    cors?: CorsOptions | false
  }
  requestId?: boolean
  logger?: Logger | false
  container?: AwilixContainer
  gracefulShutdown?: boolean
}
```

Phase 2 extension points: Add `auth?`, `swagger?`, `rateLimit?`, `health?` optional blocks.

## `MetadataKeys` Constants — Current Entries

```typescript
export enum MetadataKeys {
  BASE_PATH = 'base_path',
  ROUTERS = 'routers',
}
```

Phase 2 needs to add: `AUTH`, `ROLES`, `PUBLIC`, `API_TAGS`, `API_OPERATION`, `API_BODY`, `API_RESPONSE`, `API_SECURITY`, `RATE_LIMIT`, `UPLOAD_FIELD`.

## Decorator Pattern (Critical for Phase 2)

- Class decorators: `Reflect.defineMetadata(key, value, target)` on the class itself
- Method decorators: `Reflect.defineMetadata(key, value, target.constructor, propertyName)` keyed by method name
- `BananaApp.initializeControllers()` reads class metadata to wire middlewares

**Key constraint:** `emitDecoratorMetadata: true` is NOT in tsconfig. All metadata must be explicitly stored via `Reflect.defineMetadata()`. OpenAPI schema cannot rely on `design:type`. Every `@ApiBody`, `@ApiResponse` must receive explicit type shape or DTO class reference.

## RequestContext — Auth Integration Point

```typescript
interface RequestContextData {
  requestId: string
  userId?: string
  [key: string]: unknown // open for arbitrary keys
}
RequestContext.set('user', decodedPayload) // auth middleware writes this
RequestContext.get()?.user // controllers read this
```

## Existing Error Classes (Ready for Auth)

`UnauthorisedError` and `ForbiddenError` already exist in `ApiError.ts`. Auth guard failures throw these — no changes to `createErrorMiddleware` needed.

## `FileUpload.middleware.ts` — EMPTY

Phase 2.7 builds from scratch here.

## Dependencies Already Installed

`express`, `reflect-metadata`, `uuid`, `cors`, `helmet`, `pino`, `class-transformer`, `class-validator` (peer), `awilix` (peer optional).

## Dependencies Needing to Be Added

| Package                                                 | Purpose         | Type              |
| ------------------------------------------------------- | --------------- | ----------------- |
| `jsonwebtoken`                                          | JWT verify/sign | `dependencies`    |
| `@types/jsonwebtoken`                                   | Types           | `devDependencies` |
| `express-rate-limit`                                    | Rate limiting   | `dependencies`    |
| `multer`                                                | File upload     | `dependencies`    |
| `@types/multer`                                         | Types           | `devDependencies` |
| `swagger-ui-express` OR `@scalar/express-api-reference` | OpenAPI UI      | `dependencies`    |

**NOT needed:** `class-validator-jsonschema` — custom metadata extraction used instead.

## What Exists vs. What Needs to Be Built

### Exists and Ready to Extend

- `BananaAppOptions` — add `auth?`, `swagger?`, `rateLimit?`, `health?`
- `MetadataKeys` enum — add 10 new keys
- `RequestContext.set('user', ...)` — ready
- `UnauthorisedError` + `ForbiddenError` — already in ApiError.ts
- `createErrorMiddleware` — auth errors auto-dispatched
- `BananaRouter` — document in migration guide
- `BananaTestApp` — enhance for auth/rate-limit test helpers

### Net-New Files to Create

| Phase 2 Item                   | New Files                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 2.1 Auth decorators            | `lib/Auth/Auth.decorator.ts`, `lib/Auth/AuthGuard.interface.ts`                                       |
| 2.2 OpenAPI/Swagger            | `lib/OpenAPI/ApiDoc.decorators.ts`, `lib/OpenAPI/swagger.setup.ts`, `lib/OpenAPI/schema.extractor.ts` |
| 2.3 Config module              | `lib/Config/BananaConfig.ts`                                                                          |
| 2.4 BananaTestApp enhancements | `testing/BananaTestApp.ts` (extend existing)                                                          |
| 2.5 Rate limiting              | `lib/RateLimit/RateLimit.decorator.ts`                                                                |
| 2.6 Migration guide            | Markdown doc                                                                                          |
| 2.7 File upload                | `Middleware/FileUpload.middleware.ts` (fill stub), `lib/Upload/Upload.decorator.ts`                   |
| 2.8 Express 5 compat           | Doc only unless shims needed                                                                          |
| Health check                   | `lib/Health/health.middleware.ts`                                                                     |
| Pagination                     | `lib/Pagination/Pagination.ts`                                                                        |

## Risks and Complications

| Risk                                                 | Severity | Detail                                                                                    |
| ---------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `emitDecoratorMetadata` absent                       | HIGH     | OpenAPI schema generation requires explicit decorator metadata; no auto-emitted type info |
| DTO → JSON Schema without class-validator-jsonschema | MEDIUM   | Custom reflection logic needed for DTO → OpenAPI schemas                                  |
| JWT secret management in tests                       | MEDIUM   | BananaTestApp needs test token signing without prod secrets                               |
| multer memory vs disk storage                        | LOW      | Default to memory; disk deferred                                                          |
| Express 5 path syntax                                | MEDIUM   | Express 5 drops some path patterns; test compatibility                                    |
| swagger-ui-express vs @scalar                        | LOW      | Architect recommends evaluating Scalar                                                    |
| Rate limiting in tests                               | LOW      | BananaTestApp should disable rate-limit by default                                        |
| supertest peerDependency                             | LOW      | Move to peerDependencies optional for /testing subpath                                    |

## Module / tsconfig Notes

- `module: "nodenext"` + `moduleResolution: "nodenext"` — all imports use explicit `.js` extensions
- `strict: true`, `noImplicitReturns: true`, `noUnusedLocals: true`
- Build: Nx + SWC
