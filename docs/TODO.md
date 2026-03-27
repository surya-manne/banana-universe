# TODO

Improvements, suggestions, and large TODOs for banana-universe.

## Bug Fixes

### [HIGH] Standardize Validation Error Response

- **File:** `packages/bananajs/src/lib/Validator/Validator.decorator.ts`
- **Issue:** Validation failures send `response.send({ status: 400, message })` directly, bypassing the `ApiResponse` envelope used by the rest of the framework.
- **Fix:** Replace with `throw new BadRequestError(message)` and let `ErrorMiddleware` handle it via `ApiError.handle`, or call `new BadRequestResponse(message).send(response)` directly.
- **Impact:** Consistency with the rest of the error system; consumers can rely on a single response shape.

## Enhancements

### [MEDIUM] Add `engines` Field to package.json

- Add `"engines": { "node": ">=20" }` to root and `packages/bananajs/package.json`.

### [MEDIUM] bananajs-cli Implementation

- Planned scope: project scaffolding (generate controller/DTO/app), code generation from specs/schemas, deployment/publish tooling.
- Currently a placeholder (`packages/bananajs-cli/src/lib/bananajs-cli.ts`).

### [LOW] Export FileUpload Middleware

- `packages/bananajs/src/Middleware/FileUpload.middleware.ts` exists but is not exported from `src/index.ts`.
- Decide: export it publicly or keep it internal/remove.

## Future Milestones

- Testing framework setup (Jest or Vitest) with unit tests for framework core
- bananajs-cli implementation (Phase 1: scaffolding)
- Documentation site / API reference
