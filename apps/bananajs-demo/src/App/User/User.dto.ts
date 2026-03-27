import { IsEmail, IsString, Length } from 'class-validator'

export class CreateUserDto {
  @Length(3, 20)
  @IsString()
  name!: string

  @IsEmail()
  @Length(0, 50)
  email!: string

  @IsString()
  password!: string
}

export class GetUserByIdDto {
  @IsString()
  id!: string
}

export class GetUserListDto {
  @IsString()
  page!: string

  @IsString()
  limit!: string
}
