# Patterns Index

Recurring coding and architectural patterns extracted from the banana-universe codebase.

| Pattern File                                               | Name                         | Description                                                                              |
| ---------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| [decorator-controller.md](decorator-controller.md)         | Controller Decorator         | `@Controller(path)` class decorator that sets the base route prefix via reflect-metadata |
| [decorator-http-method.md](decorator-http-method.md)       | HTTP Method Decorator        | `@Get/@Post/@Put/@Patch/@Delete(path, middlewares?)` method decorators via factory       |
| [decorator-validation.md](decorator-validation.md)         | Request Validation Decorator | `@Body/@Params/@Query(DtoClass)` middleware-wrapping method decorators                   |
| [decorator-factory.md](decorator-factory.md)               | Decorator Factory            | Factory function returning a method decorator, avoiding duplication across HTTP verbs    |
| [dto-class-validator.md](dto-class-validator.md)           | DTO with class-validator     | Data Transfer Object class with `class-validator` property decorators                    |
| [success-response.md](success-response.md)                 | Success Response             | Standardized `new SuccessResponse(message, data).send(res)` pattern                      |
| [api-error-typed.md](api-error-typed.md)                   | Typed API Error              | Concrete error class extending `ApiError` with a specific `ErrorType` enum value         |
| [express-error-middleware.md](express-error-middleware.md) | Express Error Middleware     | 4-argument Express error handler that delegates to `ApiError.handle`                     |
| [barrel-export.md](barrel-export.md)                       | Barrel Export                | `index.ts` re-exporting all public API members from sub-modules                          |
