# Pattern: Barrel Export

## Description

An `index.ts` file that re-exports all public API members from internal sub-modules. Consumers import from the package root rather than deep paths, insulating them from internal restructuring.

## When to Use

Create a barrel export at every public API boundary: package root, module root, or feature folder.

## Template

```typescript
// index.ts
export { default as MainClass } from './lib/Core/MainClass'
export * from './lib/Core/MainClass'
export * from './lib/SubModule/SubModuleFeature'
export * from './lib/AnotherModule/AnotherFeature'
```

## Extension Points

- Use named `export { default as X }` for default exports that should be re-exposed as named
- Group re-exports by domain for readability

## Found In

- `packages/bananajs/src/index.ts` — re-exports `BananaApp`, all decorators, response classes, and error classes
