# Assumptions

Unknowns, assumptions, and open questions tracked here. Each entry has a confidence level and target file for resolution.

## Assumptions

### Testing Strategy [RESOLVED]

- **Assumption:** No test files or test framework configuration found in the workspace.
- **Resolution:** Confirmed — no tests planned at this time. Testing will be addressed in a future iteration.

### bananajs-cli Scope [RESOLVED]

- **Assumption:** `packages/bananajs-cli` is a planned CLI tool but currently a placeholder.
- **Resolution:** Significantly implemented at v0.3.0. Commands: `routes` (static AST scan), `migrate` (Express codemods), `db --status` (ORM migration status), `openapi export`, `ai generate` (schema/LLM), `ai doc`, `ai review`. Reads `.bananarc.json` for LLM provider config.

### emitDecoratorMetadata Config [RESOLVED]

- **Assumption:** All TypeScript configs enabling decorators include `emitDecoratorMetadata: true`.
- **Resolution:** Confirmed `emitDecoratorMetadata: false` in `tsconfig.base.json`. All decorators use explicit `Reflect.defineMetadata` — no reliance on emitted metadata. Documented in `docs/ARCHITECTURE.md`.

### Validation Error Response Format [RESOLVED - FIX PENDING]

- **Assumption:** Validation failure in `Validator.decorator.ts` uses `response.send({ status: 400, message })` rather than `ApiError.handle(new BadRequestError(...), response)`.
- **Resolution:** Confirmed as a bug — to be fixed. Validation errors should use `BadRequestError` / `ApiResponse` envelope for consistency. Tracked in `docs/TODO.md`.

### FileUpload Middleware Usage [OPEN]

- **Assumption:** `FileUpload.middleware.ts` exists but was not observed being used in the demo app or exported in `index.ts`.
- **Confidence:** Medium.
- **Resolve in:** `agents/IMPLEMENTATION.md` when file upload usage is clarified.

### Target Node.js Version [RESOLVED]

- **Assumption:** Target Node.js is ≥18 based on `@types/node ~18.16.9`.
- **Resolution:** Confirmed — minimum Node.js 20+. Root `package.json` should add `"engines": { "node": ">=20" }`.
