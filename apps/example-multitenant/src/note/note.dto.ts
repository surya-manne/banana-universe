import { z } from 'zod'

export const CreateNoteSchema = z.object({
  title: z.string().min(1).max(200),
})

export type CreateNote = z.infer<typeof CreateNoteSchema>

export const NoteIdParamsSchema = z.object({
  id: z.string().min(1),
})

export type NoteIdParams = z.infer<typeof NoteIdParamsSchema>
