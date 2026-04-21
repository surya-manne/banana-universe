# TC39 Decorator Migration Plan

**Status:** Planned for Phase 4 — execution before v2.0.0  
**Current:** `experimentalDecorators: true` (TypeScript legacy decorators)  
**Target:** TC39 Stage 3 decorators (ECMAScript standard, no `experimentalDecorators` needed)

---

## Current Decorator Usage Audit

### Class Decorators

| Decorator           | Location  | `reflect-metadata` usage              | Migratability      |
| ------------------- | --------- | ------------------------------------- | ------------------ |
| `@Controller(path)` | Router    | `Reflect.defineMetadata` (write only) | ✅ Straightforward |
| `@Injectable()`     | DI        | `Reflect.defineMetadata` (write only) | ✅ Straightforward |
| `@Auth()`           | Auth      | `Reflect.defineMetadata` (write only) | ✅ Straightforward |
| `@ApiTags(tags)`    | OpenAPI   | `Reflect.defineMetadata` (write only) | ✅ Straightforward |
| `@RateLimit(opts)`  | RateLimit | `Reflect.defineMetadata` (write only) | ✅ Straightforward |

### Method Decorators

| Decorator                                        | Location    | `reflect-metadata` usage                         | Migratability      |
| ------------------------------------------------ | ----------- | ------------------------------------------------ | ------------------ |
| `@Get/@Post/@Put/@Patch/@Delete`                 | Router      | `Reflect.getMetadata` + `defineMetadata`         | ✅ Straightforward |
| `@Auth()` / `@Roles()` / `@Public()`             | Auth        | `Reflect.defineMetadata` (write)                 | ✅ Straightforward |
| `@ApiOperation` / `@ApiBody` / `@ApiResponseDoc` | OpenAPI     | `Reflect.defineMetadata`                         | ✅ Straightforward |
| `@RateLimit` / `@Upload`                         | Feature     | `Reflect.defineMetadata`                         | ✅ Straightforward |
| `@Cache` / `@CacheEvict`                         | Cache       | `Reflect.defineMetadata`                         | ✅ Straightforward |
| `@Transactional()`                               | ORM plugins | `Reflect.defineMetadata` + descriptor.value wrap | ✅ With changes    |

### Parameter Decorators

| Decorator                       | Location       | `reflect-metadata` usage                         | Migratability         |
| ------------------------------- | -------------- | ------------------------------------------------ | --------------------- |
| `@Body/@Params/@Query/@Headers` | Validator      | Descriptor wrapping (no reflect-metadata read)   | ⚠️ Requires redesign  |
| `@InjectRepository(Entity)`     | plugin-typeorm | Explicit `paramIndex` + `Reflect.defineMetadata` | ❌ No TC39 equivalent |

---

## TC39 Stage 3 Decorator Differences

### Key Changes from Legacy Decorators

1. **No parameter decorators** — TC39 Stage 3 does not include parameter decorators. `@Body(Dto)` cannot be ported as-is.
2. **Class method decorator signature changes** — `(target, key, descriptor)` → `(value, context)` where `context` is a `ClassMethodDecoratorContext`.
3. **No `design:type` / `design:paramtypes`** — `emitDecoratorMetadata` is a TypeScript-only feature and has no TC39 equivalent.
4. **Auto-accessor pattern** — TC39 introduces `accessor` keyword for class field accessors.
5. **`Reflect.metadata` API** — TC39 does not include `Reflect.defineMetadata`/`Reflect.getMetadata`. A polyfill or alternative metadata storage is required.

### What Works Without Changes

- Decorators that only call `Reflect.defineMetadata` — storage must migrate to a custom `WeakMap`-based registry
- Method descriptor wrapping (`descriptor.value` replacement) — still supported in TC39

### What Requires Redesign

- **Parameter decorators** (`@Body`, `@InjectRepository`) — no TC39 equivalent
  - Option A: Convert to method decorators that read the entire request object
  - Option B: Use a factory pattern: `@Body(Dto)(handlerName)` applied at class level
  - Option C: Maintain a separate class-level metadata registration

---

## Migration Path

### Phase 3 (Current): Audit and Plan

- ✅ Document all `experimentalDecorators` usage (this document)
- ✅ Identify which decorators rely on parameter decorator features
- 📋 Design explicit metadata registration fallback for parameter decorators

### Phase 4: Migration Execution (before v2.0.0)

1. Add TC39 decorator alternative implementations for all method/class decorators
2. Replace `Reflect.defineMetadata`/`Reflect.getMetadata` with a `WeakMap`-based metadata registry
3. Ship TC39 decorator variants under a new import path: `@banana-universe/bananajs/tc39`
4. Deprecate `experimentalDecorators` path with migration warnings
5. Publish migration guide for each decorator
6. Remove `experimentalDecorators: true` from `tsconfig.base.json` in v2.0.0

### Parameter Decorator Blocker

`@Body(Dto)`, `@Params(Dto)`, `@Query(Dto)`, and `@InjectRepository(Entity)` are parameter decorators with no TC39 equivalent. Planned resolution:

- Convert to a class-level metadata registry approach
- `@Body(Dto)` → `@ValidateBody({ create: CreateDto, update: UpdateDto })` class-level OR parse from first argument type via explicit registration

---

## Timeline

| Milestone                             | Target               |
| ------------------------------------- | -------------------- |
| Audit complete (this document)        | Phase 3 (v0.3.0)     |
| TC39 decorator alternative API design | Phase 4 start        |
| TC39 implementations shipped          | Phase 4 mid (v1.5.0) |
| `experimentalDecorators` deprecated   | Phase 4 end (v1.9.0) |
| Full TC39 migration, v2.0.0           | v2.0.0               |

---

## Execution Timeline

### Target: v2.0.0 (estimated Q3 2026)

### Execution Checklist (for reference)

- [ ] Remove `experimentalDecorators: true` from all `tsconfig` files
- [ ] Update `packages/bananajs` to use TC39 stage 3 decorator syntax
- [ ] Update `packages/plugin-typeorm`, `plugin-mongoose`, `plugin-otel`
- [ ] Update `packages/plugin-websocket` (note: `@WsBody` is a parameter decorator — TC39 stage 3 does NOT support parameter decorators; requires alternative design)
- [ ] Publish v2.0.0 with migration guide
- [ ] Deprecate `experimentalDecorators` path with 6-month notice

### Known Blockers

- **Parameter decorators**: TC39 stage 3 decorators (ECMAScript 2023+) do not include parameter decorators. `@WsBody`, `@InjectRepository`, and `@Body/@Params/@Query` use parameter-level patterns. These require alternative designs before TC39 migration can be completed.
- **`reflect-metadata` replacement**: TC39 decorators do not rely on `reflect-metadata`. A migration to native metadata or explicit registration is needed.

---

## References

- [TC39 Decorators Proposal](https://github.com/tc39/proposal-decorators)
- [TypeScript 5.0 Decorator Support](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)
- [ECMAScript Decorator Metadata](https://github.com/tc39/proposal-decorator-metadata)
