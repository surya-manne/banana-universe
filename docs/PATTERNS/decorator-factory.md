# Pattern: Decorator Factory

## Description

A higher-order function that accepts a configuration value and returns a decorator function. Eliminates duplication when creating multiple decorators that differ only by a configuration parameter (e.g., HTTP method type, validation source).

## When to Use

Use when multiple decorators share the same logic and differ only by a single parameter.

## Template

```typescript
function decoratorFactory(config: ConfigType) {
  return (/* decorator target args */) => {
    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      // apply config-specific metadata or wrap descriptor.value
    }
  }
}

export const DecoratorA = decoratorFactory(ConfigType.A)
export const DecoratorB = decoratorFactory(ConfigType.B)
```

## Found In

- `packages/bananajs/src/lib/Router/Route.decorator.ts` → `methodDecoratorFactory(HTTPMethod.GET)` produces `Get`, `Post`, `Put`, etc.
- `packages/bananajs/src/lib/Validator/Validator.decorator.ts` → `validationFactory(dto, skip, source)` produces `Body`, `Params`, `Query`
