import type { Connection } from 'mongoose'
import { inject, injectable } from 'tsyringe'
import { MongooseRepositoryAdapter } from '@banana-universe/plugin-mongoose'
import { Article } from '../domain/Article.entity.js'
import { getArticleModel, type ArticleDoc } from './Article.mongoose-model.js'

@injectable()
export class ArticleMongooseRepository extends MongooseRepositoryAdapter<Article, ArticleDoc> {
  constructor(@inject('mongooseConnection') connection: Connection) {
    super(getArticleModel(connection))
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

  toPersistence(domain: Article): Partial<ArticleDoc> {
    return {
      _id: domain.id,
      title: domain.title,
      body: domain.body,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    }
  }
}
