import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string
}

export class NoteIdParams {
  @IsString()
  id!: string
}
