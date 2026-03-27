import { z } from 'zod'

export const SendChatMessageSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const JoinRoomSchema = z.object({
  roomId: z.string().min(1).max(64),
})
