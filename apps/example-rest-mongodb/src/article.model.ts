import { Schema, type Connection, type HydratedDocument } from 'mongoose'

export type ArticleDoc = HydratedDocument<{
  title: string
  body: string
}>

const articleSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { collection: 'articles' },
)

export function getArticleModel(connection: Connection) {
  const existing = connection.models['Article'] as import('mongoose').Model<ArticleDoc> | undefined
  return existing ?? connection.model<ArticleDoc>('Article', articleSchema)
}
