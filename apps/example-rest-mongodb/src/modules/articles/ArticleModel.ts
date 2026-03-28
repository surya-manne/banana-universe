import type { InjectionToken } from 'tsyringe'
import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

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

/** Registers the model on the default Mongoose connection (see `mongoose.connect` in bootstrap). */
export function getArticleModel(): Model<ArticleDoc> {
  const existing = mongoose.models['Article'] as Model<ArticleDoc> | undefined
  return existing ?? mongoose.model<ArticleDoc>('Article', articleSchema)
}
