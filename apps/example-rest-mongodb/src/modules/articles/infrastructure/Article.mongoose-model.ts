import type { Connection } from 'mongoose'
import { Schema, type HydratedDocument, type Model } from 'mongoose'

/** Mongoose document shape for the `articles` collection. */
export type ArticleDoc = HydratedDocument<{
  _id: string
  title: string
  body: string
  createdAt: Date
  updatedAt: Date
}>

export const articleSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: 'articles' },
)

/** Registers or reuses the Article model on the given connection. */
export function getArticleModel(connection: Connection): Model<ArticleDoc> {
  const existing = connection.models['Article'] as Model<ArticleDoc> | undefined
  return existing ?? connection.model<ArticleDoc>('Article', articleSchema)
}
