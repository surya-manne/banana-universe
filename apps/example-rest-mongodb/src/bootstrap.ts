import 'reflect-metadata'
import mongoose from 'mongoose'
import { asFunction } from 'awilix'
import {
  BananaApp,
  type BananaPlugin,
  defineBananaAppOptions,
  defineBananaControllers,
} from '@banana-universe/bananajs'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'
import { ArticleController } from './article.controller.js'
import { getArticleModel } from './article.model.js'
import type { ArticleDoc } from './article.model.js'
import type { Model } from 'mongoose'

export async function createMongoApp(): Promise<BananaApp> {
  const uri = process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/banana_example'
  const connection = await mongoose.createConnection(uri).asPromise()

  return BananaApp.create(
    defineBananaAppOptions({
      controllers: defineBananaControllers(ArticleController),
      services: {
        articleModel: asFunction(() => getArticleModel(connection)).singleton(),
        articleController: asFunction(
          (cradle: { articleModel: Model<ArticleDoc> }) =>
            new ArticleController(cradle.articleModel),
        ).singleton(),
      },
      plugins: [MongoosePlugin(connection) as BananaPlugin],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}
