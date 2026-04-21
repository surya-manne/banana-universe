import type { InjectionToken } from 'tsyringe'
import { inject, injectable } from 'tsyringe'
import type { Connection, Model } from 'mongoose'
import { Schema, type HydratedDocument } from 'mongoose'
import { MongooseRepositoryAdapter } from '@banana-universe/plugin-mongoose'
import type { Repository } from '@banana-universe/ddd'
import { Article, type ArticleProps } from './Article.js'

// --- persistence port ---
export interface ArticleRepository extends Repository<Article> {
  /** Persist a new article; ID and timestamps are assigned by the database. */
  create(data: Pick<ArticleProps, 'title' | 'body'>): Promise<Article>
}

export const ArticleRepositoryToken = Symbol(
  'ArticleRepository',
) as InjectionToken<ArticleRepository>

// --- Mongoose schema & model ---
// _id is the default Mongoose ObjectId; timestamps managed by the { timestamps: true } option.
export type ArticleDoc = HydratedDocument<{
  title: string
  body: string
  createdAt: Date
  updatedAt: Date
}>

export const articleSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { collection: 'articles', timestamps: true },
)

export function getArticleModel(connection: Connection): Model<ArticleDoc> {
  const existing = connection.models['Article'] as Model<ArticleDoc> | undefined
  return existing ?? connection.model<ArticleDoc>('Article', articleSchema)
}

// --- Mongoose repository adapter ---
@injectable()
export class ArticleMongooseRepository extends MongooseRepositoryAdapter<Article, ArticleDoc> {
  constructor(@inject('mongooseConnection') connection: Connection) {
    super(getArticleModel(connection))
  }

  async create(data: Pick<ArticleProps, 'title' | 'body'>): Promise<Article> {
    const doc = await this.model.create(data)
    return this.toDomain(doc as unknown as ArticleDoc)
  }

  toDomain(doc: ArticleDoc): Article {
    return new Article({
      id: String(doc._id),
      title: doc.title,
      body: doc.body,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })
  }

  /** Used for updates; ID and timestamps are managed by the database. */
  toPersistence(domain: Article): Partial<ArticleDoc> {
    return { title: domain.title, body: domain.body }
  }
}
