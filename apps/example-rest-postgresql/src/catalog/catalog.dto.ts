import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCatalogItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku!: string
}

export class CatalogItemIdParams {
  @IsString()
  id!: string
}
