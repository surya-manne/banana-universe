# Pattern: DTO with class-validator

## Description

Data Transfer Object class that uses `class-validator` property decorators to declare validation rules. Works in conjunction with `@Body`, `@Params`, or `@Query` decorators for automatic request validation.

## When to Use

Create a DTO class for every distinct request shape that requires validation.

## Template

```typescript
import { IsString, IsEmail, Length, IsInt, Min } from 'class-validator'

export class CreateResourceDto {
  @IsString()
  @Length(1, 100)
  name!: string

  @IsEmail()
  email!: string
}

export class GetResourceByIdDto {
  @IsString()
  id!: string
}

export class ListResourcesDto {
  @IsInt()
  @Min(1)
  page!: number

  @IsInt()
  @Min(1)
  limit!: number
}
```

## Extension Points

- Add more `class-validator` decorators as needed
- Use `@IsOptional()` for optional fields
- `whitelist: true` is enforced — unknown fields cause validation failure

## Found In

- `apps/bananajs-demo/src/App/User/User.dto.ts`
