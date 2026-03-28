import type { InjectionToken } from 'tsyringe'
import { Schema, type Connection, type HydratedDocument, type Model } from 'mongoose'

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

export const ArticleModelToken = Symbol('ArticleModel') as InjectionToken<Model<ArticleDoc>>

export function getArticleModel(connection: Connection) {
  const existing = connection.models['Article'] as Model<ArticleDoc> | undefined
  return existing ?? connection.model<ArticleDoc>('Article', articleSchema)
}
