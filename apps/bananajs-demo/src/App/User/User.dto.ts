import { z } from 'zod'

export const CreateUserSchema = z.object({
  name: z.string().min(3).max(20),
  email: z.string().email().max(50),
  password: z.string().min(1),
})

export type CreateUser = z.infer<typeof CreateUserSchema>

export const GetUserByIdSchema = z.object({
  id: z.string().min(1),
})

export type GetUserByIdParams = z.infer<typeof GetUserByIdSchema>

export const GetUserListSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
})

export type GetUserListQuery = z.infer<typeof GetUserListSchema>
