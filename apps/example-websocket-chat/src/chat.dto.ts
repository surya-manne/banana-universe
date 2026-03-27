import { IsString, MaxLength, MinLength } from 'class-validator'

export class SendChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string
}

export class JoinRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  roomId!: string
}
